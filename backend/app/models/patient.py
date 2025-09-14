from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime
from enum import IntEnum

class TriageLevel(IntEnum):
    RESUSCITATION = 1
    EMERGENT = 2
    URGENT = 3
    LESS_URGENT = 4
    NON_URGENT = 5

class Vitals(BaseModel):
    heartRate: int = Field(description="Heart rate in beats per minute")
    respiratoryRate: int = Field(description="Respiratory rate in breaths per minute")
    painLevel: int = Field(ge=1, le=10, description="Pain level on 1-10 scale")

class PatientStatus(str):
    WAITING = "waiting"
    IN_TREATMENT = "in-treatment"
    DISCHARGED = "discharged"

class Patient(BaseModel):
    id: str
    name: str
    age: int = Field(ge=0, le=120)
    gender: Literal["Male", "Female", "Other"]
    arrivalTime: datetime
    triageLevel: TriageLevel
    chiefComplaint: str
    vitals: Vitals
    videoUrl: Optional[str] = None
    aiSummary: Optional[str] = None
    assignedNurse: Optional[str] = None
    status: Literal["waiting", "in-treatment", "discharged"] = "waiting"
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# Request/Response models
class PatientCreate(BaseModel):
    name: str
    age: int = Field(ge=0, le=120)
    gender: Literal["Male", "Female", "Other"]
    chiefComplaint: str
    vitals: Vitals
    triageLevel: Optional[TriageLevel] = TriageLevel.URGENT  # Default to urgent

class PatientUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[Literal["Male", "Female", "Other"]] = None
    chiefComplaint: Optional[str] = None
    vitals: Optional[Vitals] = None
    triageLevel: Optional[TriageLevel] = None
    aiSummary: Optional[str] = None
    assignedNurse: Optional[str] = None
    status: Optional[Literal["waiting", "in-treatment", "discharged"]] = None

class PatientResponse(Patient):
    """Response model - same as Patient but ensures proper serialization"""
    pass