from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any
from pydantic import BaseModel
from app.services.ai_summary_service import ai_summary_service
from app.services.database import db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

class PatientSummaryRequest(BaseModel):
    patient_id: str
    name: str
    age: int
    chief_complaint: str
    heart_rate: int
    respiratory_rate: int
    pain_level: int
    triage_level: int
    medical_history: List[str] = []
    medications: List[str] = []
    allergies: List[str] = []

class QueueSummaryRequest(BaseModel):
    patients: List[Dict[str, Any]]
    total_patients: int
    queue_percentage: int
    avg_wait_time: int

class SummaryResponse(BaseModel):
    summary: str
    cached: bool
    timestamp: str

@router.post("/symptoms/{patient_id}", response_model=SummaryResponse)
async def get_symptoms_summary(
    patient_id: str,
    patient_data: PatientSummaryRequest,
    refresh: bool = Query(False, description="Force refresh cache")
):
    """Generate AI summary for patient symptoms"""
    try:
        logger.info(f"Generating symptoms summary for patient {patient_id}")

        # Convert patient data to dict
        data_dict = patient_data.dict()

        # Check if cached version exists before generating
        cached_summary = None
        if not refresh:
            cached_summary = ai_summary_service.cache.get({**data_dict, 'type': 'symptoms'})

        summary = await ai_summary_service.generate_symptoms_summary(data_dict, force_refresh=refresh)

        return SummaryResponse(
            summary=summary,
            cached=cached_summary is not None and not refresh,
            timestamp=str(int(time.time()))
        )
    except Exception as e:
        logger.error(f"Error in symptoms summary endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate symptoms summary: {str(e)}")

@router.post("/treatment/{patient_id}", response_model=SummaryResponse)
async def get_treatment_summary(
    patient_id: str,
    patient_data: PatientSummaryRequest,
    refresh: bool = Query(False, description="Force refresh cache")
):
    """Generate AI summary for patient treatment recommendations"""
    try:
        logger.info(f"Generating treatment summary for patient {patient_id}")

        # Convert patient data to dict
        data_dict = patient_data.dict()

        # Check if cached version exists before generating
        cached_summary = None
        if not refresh:
            cached_summary = ai_summary_service.cache.get({**data_dict, 'type': 'treatment'})

        summary = await ai_summary_service.generate_treatment_summary(data_dict, force_refresh=refresh)

        return SummaryResponse(
            summary=summary,
            cached=cached_summary is not None and not refresh,
            timestamp=str(int(time.time()))
        )
    except Exception as e:
        logger.error(f"Error in treatment summary endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate treatment summary: {str(e)}")

@router.post("/queue-management", response_model=SummaryResponse)
async def get_queue_management_summary(
    queue_data: QueueSummaryRequest,
    refresh: bool = Query(False, description="Force refresh cache")
):
    """Generate AI summary for patient queue management"""
    try:
        logger.info("Generating queue management summary")

        # Convert queue data to dict
        data_dict = queue_data.dict()

        # Check if cached version exists before generating
        cached_summary = None
        if not refresh:
            cached_summary = ai_summary_service.cache.get({**data_dict, 'type': 'queue_management'})

        summary = await ai_summary_service.generate_queue_management_summary(data_dict, force_refresh=refresh)

        return SummaryResponse(
            summary=summary,
            cached=cached_summary is not None and not refresh,
            timestamp=str(int(time.time()))
        )
    except Exception as e:
        logger.error(f"Error in queue management summary endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate queue management summary: {str(e)}")

@router.get("/cache/status")
async def get_cache_status():
    """Get cache status and statistics"""
    try:
        cache_size = len(ai_summary_service.cache.cache)
        cache_keys = list(ai_summary_service.cache.cache.keys())

        # Get cache stats
        current_time = time.time()
        expired_count = 0
        valid_count = 0

        for key, value in ai_summary_service.cache.cache.items():
            if current_time - value['timestamp'] >= ai_summary_service.cache.cache_duration:
                expired_count += 1
            else:
                valid_count += 1

        return {
            "total_cached_items": cache_size,
            "valid_items": valid_count,
            "expired_items": expired_count,
            "cache_duration_minutes": ai_summary_service.cache.cache_duration // 60,
            "service_initialized": ai_summary_service.client is not None
        }
    except Exception as e:
        logger.error(f"Error getting cache status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache status: {str(e)}")

@router.delete("/cache/clear")
async def clear_cache():
    """Clear all cached summaries"""
    try:
        cache_size_before = len(ai_summary_service.cache.cache)
        ai_summary_service.cache.cache.clear()

        return {
            "message": "Cache cleared successfully",
            "items_cleared": cache_size_before
        }
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to clear cache: {str(e)}")

# Add missing import
import time