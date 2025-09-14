from fastapi import APIRouter
from app.api.api_v1.endpoints import patients, websocket, simple_triage, ai_summaries

api_router = APIRouter()

# Include routers
api_router.include_router(patients.router, prefix="/patients", tags=["patients"])
api_router.include_router(simple_triage.router, prefix="/triage", tags=["triage"])
api_router.include_router(websocket.router, prefix="", tags=["websocket"])
api_router.include_router(ai_summaries.router, prefix="/ai-summaries", tags=["ai-summaries"])

@api_router.get("/test")
async def test_endpoint():
    return {"message": "API v1 is working!"}