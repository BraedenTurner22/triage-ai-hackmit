import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AlertTriangle, Activity } from "lucide-react";

interface PainDetectorProps {
  isActive: boolean;
  onPainData?: (painLevel: number, confidence: number) => void;
}

interface PainResult {
  pain_level?: number;
  confidence?: number;
  pspi_score?: number;
  frame_quality?: number;
  // API might have different field names, so let's make this flexible
  [key: string]: any;
}

const PAIN_SERVER_URL = "http://localhost:8000";
const CAPTURE_INTERVAL = 500; // Capture every 0.5 seconds for faster updates
const PAIN_LEVELS = {
  0: { label: "No Pain", color: "bg-green-500", intensity: "text-green-700" },
  1: { label: "Very Mild", color: "bg-green-400", intensity: "text-green-700" },
  2: { label: "Mild", color: "bg-yellow-300", intensity: "text-yellow-700" },
  3: { label: "Mild-Moderate", color: "bg-yellow-400", intensity: "text-yellow-700" },
  4: { label: "Moderate", color: "bg-orange-400", intensity: "text-orange-700" },
  5: { label: "Moderate-High", color: "bg-orange-500", intensity: "text-orange-700" },
  6: { label: "High", color: "bg-red-400", intensity: "text-red-700" },
  7: { label: "Severe", color: "bg-red-500", intensity: "text-red-800" },
  8: { label: "Very Severe", color: "bg-red-600", intensity: "text-red-800" },
  9: { label: "Extreme", color: "bg-red-700", intensity: "text-red-900" },
  10: { label: "Maximum", color: "bg-red-900", intensity: "text-red-900" }
};

export function PainDetector({ isActive, onPainData }: PainDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onPainDataRef = useRef<((painLevel: number, confidence: number) => void) | undefined>(onPainData);

  const [painLevel, setPainLevel] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");

  // Update ref when onPainData changes
  useEffect(() => {
    onPainDataRef.current = onPainData;
  }, [onPainData]);

  // Debug state changes
  useEffect(() => {
    console.log('🎨 UI State Changed - Pain Level:', painLevel, 'Confidence:', confidence, 'Connected:', isConnected, 'Last Update:', lastUpdate);
  }, [painLevel, confidence, isConnected, lastUpdate]);

  // Initialize webcam
  const initializeCamera = useCallback(async () => {
    try {
      console.log('🎥 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user" // Front camera
        }
      });

      console.log('📹 Camera stream obtained');

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;

        return new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              console.log('🎬 Video metadata loaded, starting playback');
              videoRef.current?.play().then(() => {
                console.log('▶️ Video playback started');
                setError(null);
                resolve();
              }).catch((playErr) => {
                console.error('❌ Video playback error:', playErr);
                setError("Failed to start video playback");
                resolve();
              });
            };
          }
        });
      }

      setError(null);
    } catch (err) {
      console.error("❌ Camera initialization error:", err);
      setError("Camera access denied. Please enable camera permissions.");
      throw err;
    }
  }, []);

  // Capture frame and send to pain server
  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) {
      console.log('⏭️ Skipping analysis - missing refs');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      console.log('⏭️ Skipping analysis - video not ready');
      return;
    }

    try {
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to base64
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      const base64Data = imageData.split(',')[1];

      console.log('📸 Capturing frame for pain analysis...');

      const response = await fetch(`${PAIN_SERVER_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          format: 'base64'
        })
      });

      if (response.ok) {
        const result: any = await response.json();

        console.log('🔍 FULL API RESPONSE:', JSON.stringify(result, null, 2));
        console.log('🔍 Available fields:', Object.keys(result));

        // Try different possible field names from the API based on your logs
        let rawPainValue = null;
        let confidenceNum = 0;

        // Check all possible pain-related fields from your API logs
        const possiblePainFields = ['pspi_score', 'pain_level', 'pain_score', 'multimodal_pain_score', 'level'];
        const possibleConfidenceFields = ['confidence', 'overall_confidence'];

        console.log('🔍 Searching for pain value in fields:', possiblePainFields);
        for (const field of possiblePainFields) {
          if (result[field] !== undefined && result[field] !== null) {
            rawPainValue = result[field];
            console.log(`🎯 Found pain value in field '${field}':`, rawPainValue, `(type: ${typeof rawPainValue})`);
            break;
          }
        }

        console.log('🔍 Searching for confidence value in fields:', possibleConfidenceFields);
        for (const field of possibleConfidenceFields) {
          if (result[field] !== undefined && result[field] !== null) {
            confidenceNum = result[field];
            console.log(`🎯 Found confidence value in field '${field}':`, confidenceNum, `(type: ${typeof confidenceNum})`);
            break;
          }
        }

        console.log('🔍 Raw extracted values - Pain:', rawPainValue, 'Confidence:', confidenceNum);

        // Convert pain value to 0-10 scale
        let painLevelNum = 0;

        if (typeof rawPainValue === 'number') {
          // Based on your logs, values are like 0.83, 1.24 which seem to be 0-5 scale
          // Convert to 0-10 scale by multiplying by 2
          painLevelNum = Math.min(10, Math.round(rawPainValue * 2));
          console.log(`🔢 Numeric conversion: ${rawPainValue} * 2 = ${painLevelNum}`);
        } else if (typeof rawPainValue === 'string') {
          // Handle string cases like "Low", "Moderate" etc
          const painMapping: { [key: string]: number } = {
            'No Pain': 0, 'Low': 2, 'Minimal': 2, 'Mild': 4,
            'Moderate': 6, 'High': 8, 'Severe': 8, 'Critical': 10
          };
          painLevelNum = painMapping[rawPainValue] ?? 0;
          console.log(`🔤 String conversion: "${rawPainValue}" = ${painLevelNum}`);
        } else {
          console.log('❌ Could not extract pain value, using 0');
          painLevelNum = 0;
        }

        // Ensure confidence is a valid number
        if (typeof confidenceNum !== 'number' || isNaN(confidenceNum)) {
          confidenceNum = 0.5; // Default confidence
          console.log('⚠️ Using default confidence: 0.5');
        }

        console.log('✅ Final processed values - Pain Level:', painLevelNum, 'Confidence:', confidenceNum);

        // Update UI state
        console.log('🎨 Setting UI state - Pain:', painLevelNum, 'Confidence:', confidenceNum);
        setPainLevel(painLevelNum);
        setConfidence(confidenceNum);
        setLastUpdate(new Date().toLocaleTimeString());
        setIsConnected(true);

        // Notify parent component
        onPainDataRef.current?.(painLevelNum, confidenceNum);

      } else {
        console.error('❌ Pain analysis failed:', response.status, response.statusText);
        setIsConnected(false);
      }
    } catch (err) {
      console.error('❌ Pain analysis error:', err);
      setIsConnected(false);
    }
  }, []);

  // Start/stop pain detection
  useEffect(() => {
    let isMounted = true;

    if (isActive) {
      console.log('🎥 Starting pain detection...');
      initializeCamera().then(() => {
        if (isMounted && !intervalRef.current) {
          console.log('📹 Camera initialized, starting analysis interval');
          intervalRef.current = setInterval(() => {
            captureAndAnalyze();
          }, CAPTURE_INTERVAL);
        }
      }).catch((error) => {
        console.error('❌ Camera initialization failed:', error);
        if (isMounted) {
          setError('Failed to initialize camera');
        }
      });
    } else if (intervalRef.current) {
      console.log('⏹️ Stopping pain detection...');
      clearInterval(intervalRef.current);
      intervalRef.current = null;

      // Stop camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }

    return () => {
      isMounted = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  const currentPainInfo = PAIN_LEVELS[painLevel as keyof typeof PAIN_LEVELS] || PAIN_LEVELS[0];

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">Pain Assessment</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-xs text-gray-500">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg mb-4">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Video Preview */}
      <div className="mb-4">
        <video
          ref={videoRef}
          className="w-full max-w-sm mx-auto rounded-lg border-2 border-gray-200"
          autoPlay
          muted
          playsInline
          style={{ maxHeight: '200px' }}
        />
      </div>
      <canvas ref={canvasRef} className="hidden" />

      {/* Pain Level Display */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Pain Level:</span>
          <span className={`text-sm font-bold ${currentPainInfo.intensity}`}>
            {painLevel}/10 - {currentPainInfo.label}
          </span>
        </div>

        {/* Pain Level Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${currentPainInfo.color}`}
            style={{ width: `${(painLevel / 10) * 100}%` }}
          ></div>
        </div>

        {/* Confidence and Last Update */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>Confidence: {(confidence * 100).toFixed(1)}%</span>
          <span>Updated: {lastUpdate}</span>
        </div>

        {/* Pain Scale Reference */}
        <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
          <div className="font-medium mb-1">Pain Scale (0-10):</div>
          <div className="grid grid-cols-2 gap-1">
            <span>0-2: Minimal</span>
            <span>3-4: Mild</span>
            <span>5-6: Moderate</span>
            <span>7-10: Severe</span>
          </div>
        </div>
      </div>
    </div>
  );
}