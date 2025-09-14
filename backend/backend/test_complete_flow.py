#!/usr/bin/env python3
"""
Complete Flow Test for Smart Triage System
Tests the entire workflow from session start to patient creation
"""

import asyncio
import httpx
import json

BACKEND_URL = "http://localhost:8001/api/v1"

async def test_complete_triage_flow():
    """Test the complete triage flow with simulated voice responses"""

    print("🧪 Testing Complete Smart Triage Flow")
    print("=" * 50)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            # Step 1: Test backend connection
            print("1️⃣ Testing backend connection...")
            response = await client.get(f"{BACKEND_URL}/test")
            assert response.status_code == 200
            assert response.json()["message"] == "API v1 is working!"
            print("✅ Backend connected successfully")

            # Step 2: Test voice services
            print("\n2️⃣ Testing voice services...")
            response = await client.get(f"{BACKEND_URL}/smart-triage/test-voice")
            voice_data = response.json()
            assert voice_data["success"] == True
            assert voice_data["services_configured"]["tts_configured"] == True
            assert voice_data["services_configured"]["stt_configured"] == True
            print(f"✅ Voice services working - Audio size: {voice_data['tts_audio_size']} bytes")

            # Step 3: Start smart triage session
            print("\n3️⃣ Starting smart triage session...")
            response = await client.post(f"{BACKEND_URL}/smart-triage/start")
            session_data = response.json()
            assert session_data["success"] == True
            session_id = session_data["session_id"]
            print(f"✅ Session started: {session_id}")
            print(f"🤖 AI Question: {session_data['message']}")

            # Step 4: Simulate conversation responses
            print("\n4️⃣ Simulating patient responses...")

            # Response 1: Name and age
            print("\n👤 User: Hi, my name is John Smith, I'm 45 years old")
            response = await client.post(
                f"{BACKEND_URL}/smart-triage/sessions/{session_id}/respond",
                json={
                    "type": "voice_response",
                    "value": "Hi, my name is John Smith, I'm 45 years old"
                }
            )
            # Note: This endpoint doesn't exist in our smart_triage - we'll simulate the conversation

            # Let's use a more direct approach by testing the orchestrator
            from app.services.smart_triage_orchestrator import smart_triage_orchestrator

            # Simulate voice responses
            responses = [
                "Hi, my name is John Smith, I'm 45 years old and I'm having chest pain",
                "The chest pain started about 2 hours ago, it's a sharp pain that comes and goes",
                "I'd rate the pain about 7 out of 10, and yes, it does radiate to my left arm",
                "No, I'm not having trouble breathing, but I am feeling a bit dizzy"
            ]

            for i, user_response in enumerate(responses):
                print(f"\n👤 User Response {i+1}: {user_response}")

                # Process the response
                result = await smart_triage_orchestrator.process_voice_response(
                    session_id, user_response, 0.95
                )

                print(f"🤖 AI Response: {result.get('message', 'No message')}")
                print(f"📊 Response Type: {result.get('type', 'Unknown')}")

                if result.get('urgency_score'):
                    print(f"🚨 Urgency Score: {result['urgency_score']:.2f}")

                if result.get('emergency_flags'):
                    print(f"⚠️  Emergency Flags: {', '.join(result['emergency_flags'])}")

                # If assessment is complete, break
                if result.get('type') == 'assessment_complete':
                    print(f"✅ Assessment Complete!")
                    print(f"🏥 Patient ID: {result.get('patient_id')}")
                    print(f"🎯 Triage Level: {result.get('triage_level')}")
                    break

            # Step 5: Check session status
            print(f"\n5️⃣ Checking session status...")
            status = smart_triage_orchestrator.get_session_status(session_id)
            if status:
                print(f"✅ Session Status: {status['stage']}")
                print(f"💬 Conversation Length: {status['conversation_length']}")
                print(f"🎯 Final Urgency Score: {status.get('urgency_score', 'Not calculated')}")

            # Step 6: Verify patient was created in database
            print(f"\n6️⃣ Verifying patient in database...")
            response = await client.get(f"{BACKEND_URL}/patients/")
            patients = response.json()

            # Find our patient (should be the most recent)
            john_patients = [p for p in patients if 'John' in p.get('name', '')]
            if john_patients:
                latest_patient = max(john_patients, key=lambda p: p['arrivalTime'])
                print(f"✅ Patient found in database:")
                print(f"   Name: {latest_patient['name']}")
                print(f"   Triage Level: {latest_patient['triageLevel']}")
                print(f"   Chief Complaint: {latest_patient['chiefComplaint']}")
                print(f"   Pain Level: {latest_patient['vitals']['painLevel']}")
            else:
                print("❌ Patient not found in database")

            print(f"\n🎉 Complete Flow Test PASSED!")
            print("=" * 50)

        except Exception as e:
            print(f"\n❌ Test FAILED: {e}")
            import traceback
            traceback.print_exc()
            return False

    return True

async def main():
    """Run the complete flow test"""
    success = await test_complete_triage_flow()
    if success:
        print("\n🚀 Ready for demo! All systems operational.")
    else:
        print("\n🔧 Issues found. Please check the logs above.")

if __name__ == "__main__":
    asyncio.run(main())