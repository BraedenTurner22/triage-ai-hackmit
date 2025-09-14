import openai
import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class AISummaryCache:
    """Simple in-memory cache for AI summaries with 30-minute expiration"""

    def __init__(self):
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.cache_duration = 30 * 60  # 30 minutes in seconds

    def _generate_key(self, data: Dict[str, Any]) -> str:
        """Generate a unique cache key from the input data"""
        # Sort the data to ensure consistent hashing
        sorted_data = json.dumps(data, sort_keys=True)
        return hashlib.md5(sorted_data.encode()).hexdigest()

    def get(self, data: Dict[str, Any]) -> Optional[str]:
        """Get cached summary if it exists and is not expired"""
        key = self._generate_key(data)
        if key in self.cache:
            cached_item = self.cache[key]
            if time.time() - cached_item['timestamp'] < self.cache_duration:
                logger.info(f"Cache hit for key: {key[:8]}...")
                return cached_item['summary']
            else:
                # Remove expired item
                logger.info(f"Cache expired for key: {key[:8]}...")
                del self.cache[key]
        return None

    def set(self, data: Dict[str, Any], summary: str):
        """Cache the summary with timestamp"""
        key = self._generate_key(data)
        self.cache[key] = {
            'summary': summary,
            'timestamp': time.time()
        }
        logger.info(f"Cached summary for key: {key[:8]}...")

    def clear_expired(self):
        """Remove expired cache entries"""
        current_time = time.time()
        expired_keys = [
            key for key, value in self.cache.items()
            if current_time - value['timestamp'] >= self.cache_duration
        ]
        for key in expired_keys:
            del self.cache[key]
        if expired_keys:
            logger.info(f"Cleared {len(expired_keys)} expired cache entries")

class AISummaryService:
    """Service for generating AI summaries using OpenAI API with caching"""

    def __init__(self):
        self.client = None
        self.cache = AISummaryCache()
        self._initialize_openai()

    def _initialize_openai(self):
        """Initialize OpenAI client"""
        try:
            api_key = settings.OPENAI_API_KEY
            if not api_key:
                logger.warning("OpenAI API key not found in settings")
                return

            self.client = openai.OpenAI(api_key=api_key)
            logger.info("OpenAI client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize OpenAI client: {e}")

    async def generate_symptoms_summary(self, patient_data: Dict[str, Any], force_refresh: bool = False) -> str:
        """Generate AI summary for patient symptoms"""
        if not self.client:
            return "AI summary service unavailable. Please check configuration."

        # Check cache first unless force refresh is requested
        if not force_refresh:
            cached = self.cache.get({**patient_data, 'type': 'symptoms'})
            if cached:
                return cached

        try:
            # Clear expired cache entries
            self.cache.clear_expired()

            prompt = f"""
You are a medical AI assistant. Based on the patient data provided, generate a 4-5 sentence summary of the patient's symptoms and condition.

Patient Information:
- Name: {patient_data.get('name', 'Unknown')}
- Age: {patient_data.get('age', 'Unknown')}
- Chief Complaint: {patient_data.get('chief_complaint', 'Not specified')}
- Heart Rate: {patient_data.get('heart_rate', 'Unknown')} bpm
- Respiratory Rate: {patient_data.get('respiratory_rate', 'Unknown')} breaths/min
- Pain Level: {patient_data.get('pain_level', 'Unknown')}/10
- Triage Level: {patient_data.get('triage_level', 'Unknown')}

Provide a clinical assessment of their symptoms and current condition. Focus on what the vital signs and complaints suggest about their health status. Be professional but accessible to medical staff.
            """

            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.7
            )

            summary = response.choices[0].message.content.strip()

            # Cache the result
            self.cache.set({**patient_data, 'type': 'symptoms'}, summary)

            logger.info(f"Generated symptoms summary for patient: {patient_data.get('name', 'Unknown')}")
            return summary

        except Exception as e:
            logger.error(f"Error generating symptoms summary: {e}")
            return "Unable to generate AI summary at this time. Please try again later."

    async def generate_treatment_summary(self, patient_data: Dict[str, Any], force_refresh: bool = False) -> str:
        """Generate AI summary for patient treatment recommendations"""
        if not self.client:
            return "AI summary service unavailable. Please check configuration."

        # Check cache first unless force refresh is requested
        if not force_refresh:
            cached = self.cache.get({**patient_data, 'type': 'treatment'})
            if cached:
                return cached

        try:
            # Clear expired cache entries
            self.cache.clear_expired()

            prompt = f"""
You are a medical AI assistant. Based on the patient data provided, generate a 4-5 sentence summary of recommended treatment options and next steps.

Patient Information:
- Name: {patient_data.get('name', 'Unknown')}
- Age: {patient_data.get('age', 'Unknown')}
- Chief Complaint: {patient_data.get('chief_complaint', 'Not specified')}
- Heart Rate: {patient_data.get('heart_rate', 'Unknown')} bpm
- Respiratory Rate: {patient_data.get('respiratory_rate', 'Unknown')} breaths/min
- Pain Level: {patient_data.get('pain_level', 'Unknown')}/10
- Triage Level: {patient_data.get('triage_level', 'Unknown')}
- Medical History: {patient_data.get('medical_history', [])}
- Medications: {patient_data.get('medications', [])}
- Allergies: {patient_data.get('allergies', [])}

Provide treatment recommendations including potential medications, procedures, or interventions. Consider their symptoms, vital signs, and medical history. Be specific about immediate vs. ongoing care needs.
            """

            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=200,
                temperature=0.7
            )

            summary = response.choices[0].message.content.strip()

            # Cache the result
            self.cache.set({**patient_data, 'type': 'treatment'}, summary)

            logger.info(f"Generated treatment summary for patient: {patient_data.get('name', 'Unknown')}")
            return summary

        except Exception as e:
            logger.error(f"Error generating treatment summary: {e}")
            return "Unable to generate AI treatment recommendations at this time. Please try again later."

    async def generate_queue_management_summary(self, queue_data: Dict[str, Any], force_refresh: bool = False) -> str:
        """Generate AI summary for patient queue management"""
        if not self.client:
            return "AI summary service unavailable. Please check configuration."

        # Check cache first unless force refresh is requested
        if not force_refresh:
            cached = self.cache.get({**queue_data, 'type': 'queue_management'})
            if cached:
                return cached

        try:
            # Clear expired cache entries
            self.cache.clear_expired()

            # Format patient list for the prompt
            patients_info = []
            for patient in queue_data.get('patients', []):
                triage_labels = {1: 'Resuscitation', 2: 'Emergent', 3: 'Urgent', 4: 'Less Urgent', 5: 'Non-urgent'}
                triage_label = triage_labels.get(patient.get('triage_level', 5), 'Unknown')
                patients_info.append(f"- {patient.get('name', 'Unknown')} ({triage_label}, Pain: {patient.get('pain_level', 'Unknown')}/10)")

            patients_list = "\n".join(patients_info[:10])  # Limit to first 10 patients for prompt

            prompt = f"""
You are a healthcare operations AI assistant. Based on the current patient queue data, generate a 2-paragraph summary (8-10 sentences total) about how to effectively manage the patient queue and nursing team.

Current Queue Status:
- Total Patients: {queue_data.get('total_patients', 0)}
- Queue Capacity: {queue_data.get('queue_percentage', 0)}%
- Average Wait Time: {queue_data.get('avg_wait_time', 0)} minutes

Patients in Queue:
{patients_list}

First paragraph (4-5 sentences): Focus on immediate patient prioritization, mentioning specific high-priority patients by name and their triage levels. Discuss how to manage critical vs. non-urgent cases and wait times.

Second paragraph (4-5 sentences): Focus on nursing team management, resource allocation, staffing considerations, and workflow optimization to handle the current patient load effectively.

Be specific, actionable, and reference actual patient names and triage levels where relevant.
            """

            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.7
            )

            summary = response.choices[0].message.content.strip()

            # Cache the result
            self.cache.set({**queue_data, 'type': 'queue_management'}, summary)

            logger.info(f"Generated queue management summary for {queue_data.get('total_patients', 0)} patients")
            return summary

        except Exception as e:
            logger.error(f"Error generating queue management summary: {e}")
            return "Unable to generate queue management recommendations at this time. Please try again later."

# Global AI summary service instance
ai_summary_service = AISummaryService()