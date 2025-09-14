from typing import List, Optional
from datetime import datetime
import uuid
import logging

from app.models.patient import Patient, PatientCreate, PatientUpdate
from app.services.database import db

logger = logging.getLogger(__name__)

class PatientService:
    def __init__(self):
        self.table_name = "patients"

    async def create_patient(self, patient_data: PatientCreate) -> Patient:
        """Create a new patient"""
        try:
            client = db.get_client()

            # Generate unique ID and set arrival time
            patient_id = str(uuid.uuid4())
            arrival_time = datetime.now()

            # Prepare data for Supabase (convert to database schema)
            db_data = {
                "id": patient_id,
                "name": patient_data.name,
                "age": patient_data.age,
                "gender": patient_data.gender,
                "arrival": arrival_time.isoformat(),
                "triage_level": patient_data.triageLevel,
                "patient_summary": patient_data.chiefComplaint,
                "heart_rate": patient_data.vitals.heartRate,
                "respiratory_rate": patient_data.vitals.respiratoryRate,
                "pain_level": patient_data.vitals.painLevel,
            }

            # Insert into Supabase
            result = client.table(self.table_name).insert(db_data).execute()

            if not result.data:
                raise ValueError("Failed to create patient")

            # Convert back to Patient model
            created_patient = self._db_to_patient_model(result.data[0])
            logger.info(f"Created patient: {created_patient.id}")
            return created_patient

        except Exception as e:
            logger.error(f"Error creating patient: {e}")
            raise

    async def get_patient(self, patient_id: str) -> Optional[Patient]:
        """Get a patient by ID"""
        try:
            client = db.get_client()
            result = client.table(self.table_name).select("*").eq("id", patient_id).execute()

            if result.data:
                return self._db_to_patient_model(result.data[0])
            return None

        except Exception as e:
            logger.error(f"Error getting patient {patient_id}: {e}")
            raise

    async def get_all_patients(self) -> List[Patient]:
        """Get all patients ordered by triage level and arrival time"""
        try:
            client = db.get_client()
            result = client.table(self.table_name)\
                .select("*")\
                .order("triage_level", desc=False)\
                .order("arrival", desc=False)\
                .execute()

            patients = [self._db_to_patient_model(row) for row in result.data]
            logger.info(f"Retrieved {len(patients)} patients")
            return patients

        except Exception as e:
            logger.error(f"Error getting all patients: {e}")
            raise

    async def update_patient(self, patient_id: str, update_data: PatientUpdate) -> Optional[Patient]:
        """Update a patient"""
        try:
            client = db.get_client()

            # Prepare update data (only include non-None values)
            db_update = {}
            if update_data.name is not None:
                db_update["name"] = update_data.name
            if update_data.age is not None:
                db_update["age"] = update_data.age
            if update_data.gender is not None:
                db_update["gender"] = update_data.gender
            if update_data.chiefComplaint is not None:
                db_update["patient_summary"] = update_data.chiefComplaint
            if update_data.vitals is not None:
                db_update["heart_rate"] = update_data.vitals.heartRate
                db_update["respiratory_rate"] = update_data.vitals.respiratoryRate
                db_update["pain_level"] = update_data.vitals.painLevel
            if update_data.triageLevel is not None:
                db_update["triage_level"] = update_data.triageLevel
            if update_data.aiSummary is not None:
                db_update["ai_summary"] = update_data.aiSummary
            if update_data.assignedNurse is not None:
                db_update["assigned_nurse"] = update_data.assignedNurse
            if update_data.status is not None:
                db_update["status"] = update_data.status

            if not db_update:
                # No updates provided
                return await self.get_patient(patient_id)

            result = client.table(self.table_name)\
                .update(db_update)\
                .eq("id", patient_id)\
                .execute()

            if result.data:
                updated_patient = self._db_to_patient_model(result.data[0])
                logger.info(f"Updated patient: {patient_id}")
                return updated_patient
            return None

        except Exception as e:
            logger.error(f"Error updating patient {patient_id}: {e}")
            raise

    async def delete_patient(self, patient_id: str) -> bool:
        """Delete a patient"""
        try:
            client = db.get_client()
            result = client.table(self.table_name).delete().eq("id", patient_id).execute()

            success = len(result.data) > 0
            if success:
                logger.info(f"Deleted patient: {patient_id}")
            return success

        except Exception as e:
            logger.error(f"Error deleting patient {patient_id}: {e}")
            raise

    def _db_to_patient_model(self, db_row: dict) -> Patient:
        """Convert database row to Patient model"""
        # Handle potential None values and type conversions
        arrival_time = db_row.get("arrival")
        if isinstance(arrival_time, str):
            arrival_time = datetime.fromisoformat(arrival_time.replace('Z', '+00:00'))
        elif arrival_time is None:
            arrival_time = datetime.now()

        # Handle gender validation - normalize to valid values
        gender = db_row.get("gender", "Other")
        if gender not in ["Male", "Female", "Other"]:
            # Try to infer from common variations or default to Other
            gender_lower = gender.lower()
            if "male" in gender_lower and "female" not in gender_lower:
                gender = "Male"
            elif "female" in gender_lower:
                gender = "Female"
            else:
                gender = "Other"

        # Handle timestamps
        created_at = db_row.get("created_at")
        if isinstance(created_at, str):
            created_at = datetime.fromisoformat(created_at.replace('Z', '+00:00'))

        updated_at = db_row.get("updated_at")
        if isinstance(updated_at, str):
            updated_at = datetime.fromisoformat(updated_at.replace('Z', '+00:00'))

        return Patient(
            id=str(db_row["id"]),
            name=str(db_row.get("name", "")),
            age=int(db_row.get("age", 0)),
            gender=gender,
            arrivalTime=arrival_time,
            triageLevel=int(db_row.get("triage_level", 3)),
            chiefComplaint=str(db_row.get("patient_summary", "")),
            vitals={
                "heartRate": int(db_row.get("heart_rate") or 80),
                "respiratoryRate": int(db_row.get("respiratory_rate") or 16),
                "painLevel": int(db_row.get("pain_level") or 5)
            },
            videoUrl=db_row.get("video_url"),
            aiSummary=db_row.get("ai_summary"),
            assignedNurse=db_row.get("assigned_nurse"),
            status=db_row.get("status", "waiting"),
            createdAt=created_at,
            updatedAt=updated_at
        )

# Global patient service instance
patient_service = PatientService()