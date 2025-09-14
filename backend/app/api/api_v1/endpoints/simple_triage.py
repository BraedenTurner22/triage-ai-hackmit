from fastapi import APIRouter, HTTPException, status, UploadFile, File
from fastapi.responses import StreamingResponse
from typing import Dict, Any
from io import BytesIO
import uuid
import logging

from app.services.simple_triage import simple_triage
from app.services.voice_service import voice_service

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/start")
async def start_triage():
    """Start a new triage session"""
    try:
        session_id = str(uuid.uuid4())
        response = await simple_triage.start_session(session_id)

        return {
            "success": True,
            "session_id": session_id,
            **response
        }

    except Exception as e:
        logger.error(f"Error starting triage session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start session: {str(e)}"
        )

@router.post("/sessions/{session_id}/voice")
async def handle_voice_input(
    session_id: str,
    audio_file: UploadFile = File(...)
):
    """Handle voice input for triage session"""
    try:
        # Transcribe audio
        audio_data = await audio_file.read()
        transcription_result = await voice_service.listen_with_confidence(audio_data)

        if transcription_result["confidence"] < 0.4:
            return {
                "success": False,
                "error": "Low confidence transcription",
                "confidence": transcription_result["confidence"],
                "transcript": transcription_result["transcript"],
                "message": "I didn't quite catch that. Could you please repeat what you said?"
            }

        # Process with triage orchestrator
        response = await simple_triage.process_voice_response(
            session_id,
            transcription_result["transcript"]
        )

        return {
            "success": True,
            "session_id": session_id,
            "transcript": transcription_result["transcript"],
            "confidence": transcription_result["confidence"],
            **response
        }

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error handling voice input: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process voice input: {str(e)}"
        )

@router.post("/sessions/{session_id}/speech")
async def generate_speech_response(
    session_id: str,
    request: Dict[str, Any]
):
    """Generate speech for text"""
    try:
        text = request.get("text")
        if not text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text is required"
            )

        audio_data = await simple_triage.generate_speech(text)

        return StreamingResponse(
            BytesIO(audio_data),
            media_type="audio/mpeg",
            headers={"Content-Disposition": "attachment; filename=response.mp3"}
        )

    except Exception as e:
        logger.error(f"Error generating speech: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate speech: {str(e)}"
        )

@router.get("/sessions/{session_id}/status")
async def get_session_status(session_id: str):
    """Get current status of triage session"""
    status_data = simple_triage.get_session_status(session_id)
    if not status_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return {
        "success": True,
        **status_data
    }

@router.delete("/sessions/{session_id}")
async def end_session(session_id: str):
    """End triage session"""
    try:
        if session_id in simple_triage.active_sessions:
            del simple_triage.active_sessions[session_id]
            return {
                "success": True,
                "session_id": session_id,
                "message": "Session ended successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

    except Exception as e:
        logger.error(f"Error ending session: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to end session: {str(e)}"
        )

@router.get("/sessions")
async def list_sessions():
    """List all active sessions"""
    sessions = []
    for session_id in simple_triage.active_sessions.keys():
        status = simple_triage.get_session_status(session_id)
        if status:
            sessions.append(status)

    return {
        "success": True,
        "active_sessions": len(sessions),
        "sessions": sessions
    }