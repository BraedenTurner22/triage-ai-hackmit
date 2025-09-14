import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Camera, Activity, Clock } from "lucide-react";
import { toast } from "sonner";

interface HeartRateMonitorProps {
  onComplete: (vitals: { heartRate: number; respiratoryRate: number }) => void;
  onCancel: () => void;
  duration?: number; // Duration in seconds, default 30
}

interface VitalSigns {
  heart_rate: number;
  respiratory_rate: number;
  timestamp: number;
  signal_quality: string;
  buffer_status: number;
  buffer_seconds: number;
}

const RPPG_API_URL = "http://localhost:8008";

export function HeartRateMonitor({ onComplete, onCancel, duration = 30 }: HeartRateMonitorProps) {
  const [isActive, setIsActive] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [currentVitals, setCurrentVitals] = useState<VitalSigns>({
    heart_rate: 0,
    respiratory_rate: 0,
    timestamp: 0,
    signal_quality: 'poor',
    buffer_status: 0,
    buffer_seconds: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: 'user'
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraPermission('granted');
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraPermission('denied');
      setError('Camera access denied. Please allow camera access for heart rate monitoring.');
    }
  }, []);

  const captureFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !streamRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to blob
    canvas.toBlob(async (blob) => {
      if (!blob) return;

      try {
        // Convert blob to base64
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];

          try {
            const response = await fetch(`${RPPG_API_URL}/process_frame`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ frame_data: base64 }),
            });

            if (response.ok) {
              const result = await response.json();
              if (result.success) {
                setCurrentVitals(result.vitals);
                setError(null);
              } else {
                setError(result.message);
              }
            } else {
              setError('Failed to process frame');
            }
          } catch (error) {
            console.error('Error sending frame to rPPG API:', error);
            setError('Connection to heart rate service failed');
          }
        };
        reader.readAsDataURL(blob);
      } catch (error) {
        console.error('Error processing frame:', error);
      }
    }, 'image/jpeg', 0.8);
  }, []);

  const startMonitoring = useCallback(async () => {
    try {
      // Reset rPPG buffers
      await fetch(`${RPPG_API_URL}/reset`, { method: 'POST' });

      setIsActive(true);
      setTimeRemaining(duration);
      setError(null);

      // Start capturing frames every 33ms (approximately 30 FPS)
      intervalRef.current = setInterval(captureFrame, 33);

      // Start countdown timer
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remaining = Math.max(0, duration - elapsed);
        setTimeRemaining(Math.ceil(remaining));

        if (remaining <= 0) {
          stopMonitoring();
        }
      }, 100);

    } catch (error) {
      console.error('Error starting heart rate monitoring:', error);
      setError('Failed to start monitoring');
    }
  }, [duration, captureFrame]);

  const stopMonitoring = useCallback(() => {
    setIsActive(false);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Complete with current vitals
    onComplete({
      heartRate: currentVitals.heart_rate,
      respiratoryRate: currentVitals.respiratory_rate
    });
  }, [currentVitals, onComplete]);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  }, []);

  useEffect(() => {
    initializeCamera();
    return cleanup;
  }, [initializeCamera, cleanup]);

  // Auto-start monitoring when camera is ready
  useEffect(() => {
    if (cameraPermission === 'granted' && !isActive && !error) {
      // Small delay to ensure video feed is ready
      const timer = setTimeout(() => {
        startMonitoring();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [cameraPermission, isActive, error, startMonitoring]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getSignalQualityColor = (quality: string) => {
    switch (quality) {
      case 'good': return 'text-green-600';
      case 'poor': return 'text-orange-600';
      case 'no_face': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getSignalQualityText = (quality: string) => {
    switch (quality) {
      case 'good': return 'Good Signal';
      case 'poor': return 'Poor Signal';
      case 'no_face': return 'No Face Detected';
      default: return 'Initializing...';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-2xl">
          <Heart className="h-6 w-6 text-red-500" />
          Heart Rate & Breathing Monitor
        </CardTitle>
        <p className="text-gray-600">
          Please stay calm and look at the camera while we measure your vital signs
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Camera Feed */}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {/* Overlay Information */}
          <div className="absolute top-4 left-4 bg-black/60 text-white p-2 rounded">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className={getSignalQualityColor(currentVitals.signal_quality)}>
                {getSignalQualityText(currentVitals.signal_quality)}
              </span>
            </div>
          </div>

          {/* Timer */}
          {isActive && (
            <div className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">
                  {formatTime(timeRemaining)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Vital Signs Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Heart className="h-5 w-5 text-red-500" />
                <span className="font-semibold">Heart Rate</span>
              </div>
              <div className="text-3xl font-bold text-red-600">
                {currentVitals.heart_rate > 0 ? Math.round(currentVitals.heart_rate) : '--'}
                <span className="text-lg ml-1">BPM</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="font-semibold">Breathing Rate</span>
              </div>
              <div className="text-3xl font-bold text-blue-600">
                {currentVitals.respiratory_rate > 0 ? Math.round(currentVitals.respiratory_rate) : '--'}
                <span className="text-lg ml-1">BPM</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Buffer Status */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${currentVitals.buffer_status}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 text-center">
          Signal buffer: {currentVitals.buffer_status}% ({currentVitals.buffer_seconds.toFixed(1)}s)
        </p>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Camera Permission Error */}
        {cameraPermission === 'denied' && (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg text-orange-700">
            Camera access is required for heart rate monitoring. Please refresh and allow camera access.
          </div>
        )}

        {/* Status and Controls */}
        <div className="text-center space-y-4">
          {isActive ? (
            <div className="space-y-4">
              <div className="text-lg font-medium text-blue-600">
                Monitoring in progress... Please remain still and look at the camera
              </div>
              <Button
                onClick={stopMonitoring}
                size="lg"
                className="bg-red-600 hover:bg-red-700"
              >
                Complete Early
              </Button>
            </div>
          ) : cameraPermission === 'granted' ? (
            <div className="text-lg font-medium text-green-600">
              Preparing to start monitoring automatically...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-lg font-medium text-orange-600">
                Waiting for camera access...
              </div>
              <Button
                onClick={onCancel}
                variant="outline"
                size="lg"
              >
                Cancel
              </Button>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="text-center text-sm text-gray-600">
          <p>• Look directly at the camera with good lighting</p>
          <p>• Keep your face visible and stay still</p>
          <p>• Breathe normally and remain calm</p>
        </div>
      </CardContent>
    </Card>
  );
}