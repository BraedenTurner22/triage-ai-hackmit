from typing import Dict, List, Optional, Any
from datetime import datetime
import logging
import re
import asyncio

from app.models.patient import Patient, PatientCreate, Vitals, TriageLevel
from app.services.patient_service import patient_service
from app.services.voice_service import voice_service

logger = logging.getLogger(__name__)

class TriageSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.current_question_index = 0
        self.responses: Dict[str, str] = {}
        self.created_at = datetime.now()
        self.last_activity = datetime.now()
        self.is_complete = False

        # Patient data extracted from responses
        self.name: Optional[str] = None
        self.age: Optional[int] = None
        self.gender: Optional[str] = None
        self.chief_complaint: Optional[str] = None
        self.emergency_responses: Dict[str, bool] = {}

class SimpleTriageOrchestrator:
    # All questions in order
    QUESTIONS = [
        {
            "id": "name",
            "text": "Hi, I'm your AI emergency room triage assistant. I'm here to help you today and assess your condition. Let's start - what is your name?",
            "type": "text",
            "validator": "validate_name"
        },
        {
            "id": "age",
            "text": "What is your age?",
            "type": "number",
            "validator": "validate_age"
        },
        {
            "id": "gender",
            "text": "What is your gender? Please say male, female, or other.",
            "type": "text",
            "validator": "validate_gender"
        },
        {
            "id": "symptoms",
            "text": "Please describe your main symptoms and what brought you here today.",
            "type": "text",
            "validator": "validate_symptoms"
        },
        {
            "id": "bleeding",
            "text": "Are you currently bleeding from any wounds? Please answer yes or no.",
            "type": "boolean",
            "validator": "validate_boolean"
        },
        {
            "id": "breathing",
            "text": "Are you having trouble breathing? Please answer yes or no.",
            "type": "boolean",
            "validator": "validate_boolean"
        },
        {
            "id": "chest_pain",
            "text": "Are you experiencing chest pain? Please answer yes or no.",
            "type": "boolean",
            "validator": "validate_boolean"
        },
        {
            "id": "mobility",
            "text": "Are you able to walk without assistance? Please answer yes or no.",
            "type": "boolean",
            "validator": "validate_boolean"
        }
    ]

    def __init__(self):
        self.active_sessions: Dict[str, TriageSession] = {}

    async def start_session(self, session_id: str) -> Dict[str, Any]:
        """Start a new triage session"""
        session = TriageSession(session_id)
        self.active_sessions[session_id] = session

        first_question = self.QUESTIONS[0]
        logger.info(f"Started triage session {session_id}")

        # Welcome message that will be spoken
        welcome_message = "Hi, I'm your AI emergency room triage assistant. I'm here to help you today and assess your condition. Let's start - what is your name?"

        return {
            "type": "question",
            "question": welcome_message,
            "question_id": first_question["id"],
            "step": 1,
            "total_steps": len(self.QUESTIONS),
            "session_id": session_id
        }

    async def process_voice_response(self, session_id: str, transcript: str) -> Dict[str, Any]:
        """Process voice response and return next step"""
        session = self.active_sessions.get(session_id)
        if not session:
            raise ValueError(f"Session not found: {session_id}")

        session.last_activity = datetime.now()

        # Get current question
        if session.current_question_index >= len(self.QUESTIONS):
            return await self._complete_assessment(session)

        current_question = self.QUESTIONS[session.current_question_index]

        # Validate the response
        validator_method = getattr(self, current_question["validator"])
        is_valid, cleaned_value, error_message = validator_method(transcript)

        if not is_valid:
            # Return same question with error
            logger.info(f"Session {session_id} - Invalid response for {current_question['id']}: {transcript}")
            return {
                "type": "error",
                "question": f"{error_message} {current_question['text']}",
                "question_id": current_question["id"],
                "step": session.current_question_index + 1,
                "total_steps": len(self.QUESTIONS),
                "error": error_message,
                "user_answer": transcript
            }

        # Valid response - store it
        session.responses[current_question["id"]] = cleaned_value
        self._update_patient_data(session, current_question["id"], cleaned_value)

        logger.info(f"Session {session_id} - Valid response for {current_question['id']}: {cleaned_value}")

        # Move to next question
        session.current_question_index += 1

        if session.current_question_index >= len(self.QUESTIONS):
            # Assessment complete - include the last answer
            return await self._complete_assessment(session, cleaned_value, current_question["id"])
        else:
            # Next question
            next_question = self.QUESTIONS[session.current_question_index]
            return {
                "type": "question",
                "question": next_question["text"],
                "question_id": next_question["id"],
                "step": session.current_question_index + 1,
                "total_steps": len(self.QUESTIONS),
                "user_answer": cleaned_value,
                "previous_field": current_question["id"]
            }

    def _update_patient_data(self, session: TriageSession, question_id: str, value: str):
        """Update session patient data based on question response"""
        if question_id == "name":
            session.name = value
        elif question_id == "age":
            session.age = int(value)
        elif question_id == "gender":
            session.gender = value
        elif question_id == "symptoms":
            session.chief_complaint = value
        elif question_id in ["bleeding", "breathing", "chest_pain", "mobility"]:
            session.emergency_responses[question_id] = (value.lower() == "yes")

    async def _complete_assessment(self, session: TriageSession, last_answer: str = None, last_field: str = None) -> Dict[str, Any]:
        """Complete the triage assessment and create patient record"""
        try:
            # Calculate urgency score
            urgency_score = self._calculate_urgency(session)

            # Create patient record with retry logic
            max_retries = 3
            patient = None
            for attempt in range(max_retries):
                try:
                    patient = await self._create_patient_record(session, urgency_score)
                    break
                except Exception as e:
                    if attempt == max_retries - 1:
                        logger.error(f"Failed to create patient after {max_retries} attempts: {e}")
                        raise
                    logger.warning(f"Patient creation attempt {attempt + 1} failed, retrying: {e}")
                    await asyncio.sleep(0.5)  # Brief delay before retry

            if not patient:
                raise RuntimeError("Patient creation failed")

            session.is_complete = True

            logger.info(f"Session {session.session_id} - Assessment complete, patient created: {patient.id}")

            # Create priority message
            priority_names = {
                1: "Critical (Level 1)",
                2: "Emergent (Level 2)",
                3: "Urgent (Level 3)",
                4: "Less Urgent (Level 4)",
                5: "Non-Urgent (Level 5)"
            }
            priority_name = priority_names.get(int(patient.triageLevel), f"Level {patient.triageLevel}")

            result = {
                "type": "complete",
                "message": f"Assessment complete! You have been assigned {priority_name} priority and added to the queue. A nurse will see you shortly.",
                "patient_id": patient.id,
                "urgency_score": urgency_score,
                "triage_level": int(patient.triageLevel),
                "step": len(self.QUESTIONS),
                "total_steps": len(self.QUESTIONS)
            }

            # Include the last answer if provided
            if last_answer and last_field:
                result["user_answer"] = last_answer
                result["previous_field"] = last_field

            return result

        except Exception as e:
            logger.error(f"Error completing assessment for session {session.session_id}: {e}")
            return {
                "type": "error",
                "message": "Sorry, there was an issue completing your assessment. Please try again or see the front desk.",
                "error": str(e),
                "step": len(self.QUESTIONS),
                "total_steps": len(self.QUESTIONS)
            }

    def _calculate_urgency(self, session: TriageSession) -> float:
        """Calculate urgency score based on responses"""
        score = 0.3  # Base score

        # Emergency responses add to urgency
        emergency_weights = {
            "bleeding": 0.4,    # Yes to bleeding = urgent
            "breathing": 0.4,   # Yes to breathing trouble = urgent
            "chest_pain": 0.3,  # Yes to chest pain = urgent
        }

        # Handle most emergency questions (Yes = urgent)
        for emergency_type, weight in emergency_weights.items():
            if session.emergency_responses.get(emergency_type, False):
                score += weight

        # Handle mobility separately (No = urgent, because can't walk)
        if not session.emergency_responses.get("mobility", True):  # Default True means can walk
            score += 0.3  # Can't walk is fairly urgent

        # Age factor
        if session.age:
            if session.age > 65:
                score += 0.1
            elif session.age < 5:
                score += 0.2

        return min(score, 1.0)

    async def _create_patient_record(self, session: TriageSession, urgency_score: float) -> Patient:
        """Create patient record in database"""

        # Convert urgency to triage level
        if urgency_score >= 0.8:
            triage_level = TriageLevel.RESUSCITATION
        elif urgency_score >= 0.6:
            triage_level = TriageLevel.EMERGENT
        elif urgency_score >= 0.4:
            triage_level = TriageLevel.URGENT
        elif urgency_score >= 0.2:
            triage_level = TriageLevel.LESS_URGENT
        else:
            triage_level = TriageLevel.NON_URGENT

        # Create patient (without notes field since it doesn't exist in database)
        patient_create = PatientCreate(
            name=session.name or "Unknown",
            age=session.age or 0,
            gender=session.gender or "Other",
            chiefComplaint=session.chief_complaint or "No symptoms provided",
            vitals=Vitals(
                heartRate=80,  # Default values
                respiratoryRate=16,
                painLevel=5
            ),
            triageLevel=triage_level
        )

        return await patient_service.create_patient(patient_create)

    # Validation methods
    def validate_name(self, response: str) -> tuple[bool, str, str]:
        """Validate name input"""
        cleaned = re.sub(r'[.,!?;:]', '', response.strip())
        if len(cleaned) < 2:
            return False, cleaned, "Please provide a name with at least 2 characters."
        if not re.match(r'^[a-zA-Z\s]+$', cleaned):
            return False, cleaned, "Please provide a name using only letters."
        # Capitalize properly
        cleaned = ' '.join(word.capitalize() for word in cleaned.split())
        return True, cleaned, ""

    def validate_age(self, response: str) -> tuple[bool, str, str]:
        """Validate age input"""
        numbers = re.findall(r'\d+', response)
        if not numbers:
            return False, response, "Please provide your age as a number."
        try:
            age = int(numbers[0])
            if not (0 <= age <= 150):
                return False, response, "Please provide an age between 0 and 150."
            return True, str(age), ""
        except ValueError:
            return False, response, "Please provide a valid age."

    def validate_gender(self, response: str) -> tuple[bool, str, str]:
        """Validate gender input"""
        lower = response.lower().strip()
        if 'female' in lower:
            return True, "Female", ""
        elif 'male' in lower and 'female' not in lower:
            return True, "Male", ""
        elif any(word in lower for word in ['other', 'non-binary', 'nonbinary']):
            return True, "Other", ""
        else:
            return False, response, "Please say 'male', 'female', or 'other'."

    def validate_symptoms(self, response: str) -> tuple[bool, str, str]:
        """Validate symptoms description"""
        cleaned = response.strip()
        if len(cleaned) < 10:
            return False, cleaned, "Please describe your symptoms in more detail."
        return True, cleaned, ""

    def validate_boolean(self, response: str) -> tuple[bool, str, str]:
        """Validate yes/no response"""
        cleaned = re.sub(r'[.,!?;:]', '', response.lower().strip())

        positive_words = ['yes', 'yeah', 'yep', 'yup', 'sure', 'definitely']
        negative_words = ['no', 'nope', 'nah', 'not']

        for word in positive_words:
            if word in cleaned:
                return True, "Yes", ""

        for word in negative_words:
            if word in cleaned:
                return True, "No", ""

        return False, response, "Please answer with 'yes' or 'no'."

    def get_session_status(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session status"""
        session = self.active_sessions.get(session_id)
        if not session:
            return None

        return {
            "session_id": session_id,
            "current_step": session.current_question_index + 1,
            "total_steps": len(self.QUESTIONS),
            "responses": session.responses,
            "is_complete": session.is_complete,
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat()
        }

    async def generate_speech(self, text: str) -> bytes:
        """Generate speech for response"""
        try:
            return await voice_service.speak(text)
        except Exception as e:
            logger.error(f"Error generating speech: {e}")
            return b""

# Global instance
simple_triage = SimpleTriageOrchestrator()