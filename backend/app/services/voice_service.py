import httpx
import asyncio
import logging
from typing import Optional, Dict, Any, AsyncGenerator, List
from io import BytesIO
import json
import base64

from app.core.config import settings

logger = logging.getLogger(__name__)

class ElevenLabsService:
    def __init__(self):
        self.api_key = settings.ELEVENLABS_API_KEY
        self.base_url = "https://api.elevenlabs.io/v1"
        self.default_voice_id = "21m00Tcm4TlvDq8ikWAM"  # Rachel voice
        self.model_id = "eleven_monolingual_v1"

    async def text_to_speech(
        self,
        text: str,
        voice_id: Optional[str] = None,
        voice_settings: Optional[Dict] = None
    ) -> bytes:
        """Convert text to speech using ElevenLabs API"""
        if not self.api_key or self.api_key == "your_elevenlabs_api_key_here":
            logger.warning("ElevenLabs API key not configured, using mock response")
            return b"mock_audio_data"

        voice_id = voice_id or self.default_voice_id
        voice_settings = voice_settings or {
            "stability": 0.75,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True
        }

        url = f"{self.base_url}/text-to-speech/{voice_id}"
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": self.api_key
        }

        data = {
            "text": text,
            "model_id": self.model_id,
            "voice_settings": voice_settings
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=data)
                response.raise_for_status()

                logger.info(f"Generated speech for text length: {len(text)}")
                return response.content

        except httpx.HTTPError as e:
            logger.error(f"ElevenLabs API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in TTS: {e}")
            raise

    async def get_available_voices(self) -> List[Dict[str, Any]]:
        """Get list of available voices"""
        if not self.api_key or self.api_key == "your_elevenlabs_api_key_here":
            return [
                {"voice_id": self.default_voice_id, "name": "Rachel", "category": "premade"},
                {"voice_id": "ErXwobaYiN019PkySvjV", "name": "Antoni", "category": "premade"},
                {"voice_id": "MF3mGyEYCl7XYWbV9V6O", "name": "Elli", "category": "premade"}
            ]

        url = f"{self.base_url}/voices"
        headers = {"xi-api-key": self.api_key}

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, headers=headers)
                response.raise_for_status()

                voices_data = response.json()
                return voices_data.get("voices", [])

        except Exception as e:
            logger.error(f"Error fetching voices: {e}")
            return []

class DeepgramService:
    def __init__(self):
        self.api_key = settings.DEEPGRAM_API_KEY
        self.base_url = "https://api.deepgram.com/v1"

    async def speech_to_text(
        self,
        audio_data: bytes,
        options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Convert speech to text using Deepgram API"""
        if not self.api_key or self.api_key == "your_deepgram_api_key_here":
            logger.warning("Deepgram API key not configured, using mock response")
            return {
                "results": {
                    "channels": [{
                        "alternatives": [{
                            "transcript": "This is a mock transcription response.",
                            "confidence": 0.95
                        }]
                    }]
                }
            }

        default_options = {
            "model": "nova-2",
            "language": "en-US",
            "punctuate": True,
            "diarize": False,
            "smart_format": True
        }

        if options:
            default_options.update(options)

        # Build query parameters
        params = "&".join([f"{k}={v}".lower() for k, v in default_options.items()])
        url = f"{self.base_url}/listen?{params}"

        headers = {
            "Authorization": f"Token {self.api_key}",
            "Content-Type": "audio/wav"  # Adjust based on your audio format
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, content=audio_data)
                response.raise_for_status()

                result = response.json()
                logger.info(f"Transcribed audio, confidence: {self._get_confidence(result)}")
                return result

        except httpx.HTTPError as e:
            logger.error(f"Deepgram API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in STT: {e}")
            raise

    async def live_transcription_websocket(self, websocket_url: Optional[str] = None):
        """Create live transcription WebSocket connection"""
        # This would be implemented for real-time streaming
        # For now, we'll focus on the HTTP API
        pass

    def _get_confidence(self, result: Dict[str, Any]) -> float:
        """Extract confidence score from Deepgram response"""
        try:
            channels = result.get("results", {}).get("channels", [])
            if channels and channels[0].get("alternatives"):
                return channels[0]["alternatives"][0].get("confidence", 0.0)
        except (KeyError, IndexError):
            pass
        return 0.0

    def extract_transcript(self, result: Dict[str, Any]) -> str:
        """Extract transcript text from Deepgram response"""
        try:
            channels = result.get("results", {}).get("channels", [])
            if channels and channels[0].get("alternatives"):
                return channels[0]["alternatives"][0].get("transcript", "")
        except (KeyError, IndexError):
            pass
        return ""

class VoiceService:
    """Combined voice service for TTS and STT operations"""

    def __init__(self):
        self.elevenlabs = ElevenLabsService()
        self.deepgram = DeepgramService()

    async def speak(
        self,
        text: str,
        voice_id: Optional[str] = None,
        voice_settings: Optional[Dict] = None
    ) -> bytes:
        """Generate speech from text"""
        return await self.elevenlabs.text_to_speech(text, voice_id, voice_settings)

    async def listen(
        self,
        audio_data: bytes,
        options: Optional[Dict] = None
    ) -> str:
        """Transcribe audio to text"""
        result = await self.deepgram.speech_to_text(audio_data, options)
        return self.deepgram.extract_transcript(result)

    async def listen_with_confidence(
        self,
        audio_data: bytes,
        options: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """Transcribe audio and return with confidence score"""
        result = await self.deepgram.speech_to_text(audio_data, options)
        return {
            "transcript": self.deepgram.extract_transcript(result),
            "confidence": self.deepgram._get_confidence(result),
            "full_result": result
        }

    async def get_voices(self) -> List[Dict[str, Any]]:
        """Get available TTS voices"""
        return await self.elevenlabs.get_available_voices()

    def is_configured(self) -> Dict[str, bool]:
        """Check if voice services are properly configured"""
        return {
            "tts_configured": (
                self.elevenlabs.api_key and
                self.elevenlabs.api_key != "your_elevenlabs_api_key_here"
            ),
            "stt_configured": (
                self.deepgram.api_key and
                self.deepgram.api_key != "your_deepgram_api_key_here"
            )
        }

# Global voice service instance
voice_service = VoiceService()