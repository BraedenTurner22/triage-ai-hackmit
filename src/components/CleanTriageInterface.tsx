import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle,
  AlertCircle,
  User,
  Calendar,
  Activity,
  Heart,
  Stethoscope,
  AlertTriangle
} from "lucide-react";
import { PainDetector } from "./PainDetector";

interface CleanTriageInterfaceProps {
  onPatientAdd: (patient: any) => void;
}

interface FormData {
  name: string;
  age: string;
  gender: string;
  symptoms: string;
  bleeding: string;
  breathing: string;
  chest_pain: string;
  mobility: string;
}

const BACKEND_URL = "http://localhost:8001/api/v1";

// Icons for each field
const FIELD_ICONS = {
  name: <User className="h-5 w-5" />,
  age: <Calendar className="h-5 w-5" />,
  gender: <User className="h-5 w-5" />,
  symptoms: <Stethoscope className="h-5 w-5" />,
  bleeding: <AlertTriangle className="h-5 w-5 text-red-500" />,
  breathing: <Activity className="h-5 w-5 text-orange-500" />,
  chest_pain: <Heart className="h-5 w-5 text-red-500" />,
  mobility: <Activity className="h-5 w-5" />
};

// Field labels
const FIELD_LABELS = {
  name: "Name",
  age: "Age",
  gender: "Gender",
  symptoms: "Symptoms",
  bleeding: "Bleeding",
  breathing: "Breathing Issues",
  chest_pain: "Chest Pain",
  mobility: "Mobility"
};

// All possible fields in order
const ALL_FIELDS = ['name', 'age', 'gender', 'symptoms', 'bleeding', 'breathing', 'chest_pain', 'mobility'];

export function CleanTriageInterface({ onPatientAdd }: CleanTriageInterfaceProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    gender: '',
    symptoms: '',
    bleeding: '',
    breathing: '',
    chest_pain: '',
    mobility: ''
  });

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(8);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [completedFormData, setCompletedFormData] = useState<FormData | null>(null);

  // Pain detection state
  const [painData, setPainData] = useState<{
    levels: number[];
    confidences: number[];
    averagePain: number;
    maxPain: number;
  }>({
    levels: [],
    confidences: [],
    averagePain: 0,
    maxPain: 0
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const formDataRef = useRef<FormData>(formData);

  // Convert pain level from 0-5 scale to 1-10 scale for medical compatibility
  const convertPainScale = (painLevel: number): number => {
    // Pain is now already on 0-10 scale from PainDetector
    // Convert 0 to 1 for medical consistency (pain scales typically start at 1)
    if (painLevel === 0) return 1;
    return Math.min(10, painLevel);
  };

  // Keep sessionIdRef in sync with sessionId state
  useEffect(() => {
    sessionIdRef.current = sessionId;
    console.log('🔄 sessionIdRef updated to:', sessionId);
  }, [sessionId]);

  // Keep formDataRef in sync with formData state
  useEffect(() => {
    formDataRef.current = formData;
    console.log('🔄 formDataRef updated to:', formData);
  }, [formData]);

  useEffect(() => {
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/test`);
      const data = await response.json();
      if (data.message === "API v1 is working!") {
        setIsConnected(true);
        console.log("✅ Backend connection successful");
      }
    } catch (error) {
      console.error("❌ Backend connection failed:", error);
      toast.error("Backend connection failed. Please ensure the server is running.");
    }
  };

  const startAssessment = async () => {
    if (!isConnected) {
      toast.error("Backend not connected. Please check the server.");
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/triage/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (data.success) {
        console.log("🚀 Setting session ID:", data.session_id);

        // Set both state and ref immediately
        setSessionId(data.session_id);
        sessionIdRef.current = data.session_id;

        setAssessmentStarted(true);
        setCurrentQuestion(data.question);
        setCurrentStep(data.step);
        setTotalSteps(data.total_steps);

        console.log("✅ Triage session started:", data.session_id);
        console.log("✅ Session ID set in both state and ref");

        // Speak the welcome message using the new session ID
        await speakWelcomeMessage(data.session_id, data.question);
      }
    } catch (error) {
      console.error("Error starting assessment:", error);
      toast.error("Failed to start assessment. Please try again.");
    }
  };

  const speakWelcomeMessage = async (sessionIdToUse: string, text: string) => {
    try {
      setIsSpeaking(true);

      const response = await fetch(`${BACKEND_URL}/triage/sessions/${sessionIdToUse}/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          setTimeout(() => startListening(), 500);
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          setTimeout(() => startListening(), 500);
        };

        await audio.play();
      }
    } catch (error) {
      console.error("Error generating welcome speech:", error);
      setIsSpeaking(false);
      setTimeout(() => startListening(), 500);
    }
  };

  const speakText = async (text: string, shouldContinueListening: boolean = true) => {
    try {
      setIsSpeaking(true);

      const currentSessionId = sessionIdRef.current || sessionId;
      if (!currentSessionId) {
        console.error('❌ No session ID available for speech generation');
        setIsSpeaking(false);
        if (shouldContinueListening) {
          setTimeout(() => startListening(), 500);
        }
        return;
      }

      const response = await fetch(`${BACKEND_URL}/triage/sessions/${currentSessionId}/speech`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (response.ok) {
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          if (shouldContinueListening) {
            setTimeout(() => startListening(), 500);
          }
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          if (shouldContinueListening) {
            setTimeout(() => startListening(), 500);
          }
        };

        await audio.play();
      }
    } catch (error) {
      console.error("Error generating speech:", error);
      setIsSpeaking(false);
      if (shouldContinueListening) {
        setTimeout(() => startListening(), 500);
      }
    }
  };

  const startListening = async () => {
    try {
      // Check if we're in a completed state
      if (assessmentComplete) {
        console.log('Assessment already complete, not starting listening');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      setIsListening(true);
      setTranscript("");
      setErrorMessage(null);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        await processAudioResponse(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      // Web Speech API for live feedback
      if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          mediaRecorder.start();
        };

        recognition.onresult = (event: any) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              setTranscript(transcript);
            } else {
              interimTranscript += transcript;
            }
          }
          if (interimTranscript) {
            setTranscript(interimTranscript);
          }
        };

        recognition.onend = () => {
          setIsListening(false);
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        };

        recognition.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        };

        recognition.start();
      } else {
        mediaRecorder.start();
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            stopListening();
          }
        }, 8000);
      }

    } catch (error) {
      console.error("Error starting listening:", error);
      setIsListening(false);
      toast.error("Could not access microphone. Please check permissions.");
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  // Handle pain data updates
  const handlePainData = (painLevel: number, confidence: number) => {
    setPainData(prevData => {
      const newLevels = [...prevData.levels, painLevel];
      const newConfidences = [...prevData.confidences, confidence];

      // Keep only last 60 readings (about 60 seconds for better analysis)
      const maxReadings = 60;
      const trimmedLevels = newLevels.slice(-maxReadings);
      const trimmedConfidences = newConfidences.slice(-maxReadings);

      // Calculate statistics
      const averagePain = trimmedLevels.reduce((a, b) => a + b, 0) / trimmedLevels.length;
      const maxPain = Math.max(...trimmedLevels);

      const updatedData = {
        levels: trimmedLevels,
        confidences: trimmedConfidences,
        averagePain: parseFloat(averagePain.toFixed(2)),
        maxPain
      };

      return updatedData;
    });
  };

  const processAudioResponse = async (audioBlob: Blob) => {
    console.log('🔍 Processing audio response...');
    console.log('🔍 Current sessionId state:', sessionId);
    console.log('🔍 Current sessionIdRef:', sessionIdRef.current);
    console.log('🔍 assessmentStarted:', assessmentStarted);

    const currentSessionId = sessionIdRef.current || sessionId;
    if (!currentSessionId) {
      console.error('❌ No session ID available in state or ref');
      console.error('❌ This means the session was not properly initialized or was lost');
      toast.error('Session lost. Please restart the assessment.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');

      console.log('📤 Sending request to backend with session ID:', currentSessionId);

      const response = await fetch(`${BACKEND_URL}/triage/sessions/${currentSessionId}/voice`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Backend response:', data);

      if (data.success) {
        handleBackendResponse(data);
      } else if (data.confidence < 0.4) {
        setErrorMessage("I didn't quite catch that. Please try speaking again.");
        await speakText("I didn't quite catch that. Could you please repeat?");
      }

    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Failed to process your response. Please try again.");
      setTimeout(() => startListening(), 1000);
    }
  };

  const handleBackendResponse = async (data: any) => {
    console.log('=== Backend Response ===');
    console.log('Type:', data.type);
    console.log('User Answer:', data.user_answer);
    console.log('Previous Field:', data.previous_field);
    console.log('========================');

    setTranscript(data.transcript || "");

    if (data.type === "question") {
      // Valid answer received, moving to next question

      // Update form data if we have the previous answer
      if (data.user_answer && data.previous_field) {
        // Map backend field IDs to frontend field names
        const fieldMapping: { [key: string]: keyof FormData } = {
          'name': 'name',
          'age': 'age',
          'gender': 'gender',
          'symptoms': 'symptoms',
          'bleeding': 'bleeding',
          'breathing': 'breathing',
          'chest_pain': 'chest_pain',
          'mobility': 'mobility'
        };

        const frontendField = fieldMapping[data.previous_field];
        if (frontendField) {
          console.log(`✅ Updating form field ${frontendField} with: ${data.user_answer}`);
          setFormData(prev => {
            const newData = {
              ...prev,
              [frontendField]: data.user_answer
            };
            console.log('📝 New form data:', newData);
            return newData;
          });
        } else {
          console.warn(`❌ Could not map backend field '${data.previous_field}' to frontend field`);
        }
      } else {
        console.warn('❌ No user_answer or previous_field in response');
      }

      // Update question and progress
      setCurrentQuestion(data.question);
      setCurrentStep(data.step);
      setTotalSteps(data.total_steps);
      setErrorMessage(null);
      setTranscript(""); // Clear previous transcript

      // Speak the next question
      await speakText(data.question);

    } else if (data.type === "error") {
      // Validation error, same question with error message
      setErrorMessage(data.error);
      setCurrentQuestion(data.question);

      // Speak the error message
      await speakText(data.question);

    } else if (data.type === "complete") {
      // Assessment complete
      setAssessmentComplete(true);

      // Update final form data with last answer - use ref to get current data
      let finalFormData = { ...formDataRef.current };
      console.log('📋 Current form data from ref:', formDataRef.current);

      if (data.user_answer && data.previous_field) {
        const fieldMapping: { [key: string]: keyof FormData } = {
          'name': 'name',
          'age': 'age',
          'gender': 'gender',
          'symptoms': 'symptoms',
          'bleeding': 'bleeding',
          'breathing': 'breathing',
          'chest_pain': 'chest_pain',
          'mobility': 'mobility'
        };

        const frontendField = fieldMapping[data.previous_field];
        if (frontendField) {
          finalFormData = {
            ...finalFormData,
            [frontendField]: data.user_answer
          };
          setFormData(finalFormData);
        }
      }

      // Store completed form data for display
      setCompletedFormData(finalFormData);

      console.log('🎯 Final form data for display:', finalFormData);

      // Notify parent component with updated form data and pain assessment
      onPatientAdd({
        ...finalFormData,
        patient_id: data.patient_id,
        urgency_score: data.urgency_score,
        triage_level: data.triage_level,
        pain_assessment: {
          average_pain: painData.averagePain,
          max_pain: painData.maxPain,
          pain_readings: painData.levels.length,
          overall_confidence: painData.confidences.length > 0
            ? painData.confidences.reduce((a, b) => a + b, 0) / painData.confidences.length
            : 0,
          // Convert to 1-10 scale for medical vitals
          medical_pain_level: convertPainScale(painData.averagePain)
        }
      });

      await speakText(data.message, false); // Don't continue listening after completion
      toast.success("Assessment complete!");
    }
  };

  const resetAssessment = () => {
    setFormData({
      name: '',
      age: '',
      gender: '',
      symptoms: '',
      bleeding: '',
      breathing: '',
      chest_pain: '',
      mobility: ''
    });
    setSessionId(null);
    sessionIdRef.current = null;
    setCurrentQuestion("");
    setCurrentStep(0);
    setTotalSteps(8);
    setAssessmentStarted(false);
    setAssessmentComplete(false);
    setTranscript("");
    setErrorMessage(null);
    setCompletedFormData(null);
    setPainData({
      levels: [],
      confidences: [],
      averagePain: 0,
      maxPain: 0
    });
    stopListening();
  };

  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {!assessmentStarted ? (
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold text-gray-800">
                AI Triage System
              </CardTitle>
              <p className="text-xl text-gray-600 mt-4">
                Simplified Voice-Enabled Triage Assessment
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Backend Status: {isConnected ? "✅ Connected" : "❌ Disconnected"}
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-8">
              <Button
                onClick={startAssessment}
                disabled={!isConnected}
                size="lg"
                className="text-xl py-6 px-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
              >
                <Volume2 className="h-7 w-7 mr-3" />
                Start Triage
              </Button>
              <div className="text-sm text-gray-500">
                Backend handles all validation and question flow automatically.
              </div>
            </CardContent>
          </Card>
        ) : assessmentComplete ? (
          <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
            <CardContent className="text-center py-16">
              <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6 animate-pulse" />
              <h3 className="text-4xl font-bold text-green-700 mb-4">
                Assessment Complete!
              </h3>
              <div className="max-w-2xl mx-auto bg-gray-50 rounded-lg p-6 mb-8">
                <h4 className="text-xl font-semibold mb-4">Patient Information</h4>
                <div className="grid grid-cols-2 gap-4 text-left">
                  <div><strong>Name:</strong> {completedFormData?.name || 'Not provided'}</div>
                  <div><strong>Age:</strong> {completedFormData?.age || 'Not provided'}</div>
                  <div><strong>Gender:</strong> {completedFormData?.gender || 'Not provided'}</div>
                  <div className="col-span-2"><strong>Symptoms:</strong> {completedFormData?.symptoms || 'Not provided'}</div>
                  {completedFormData?.bleeding && (
                    <div className="col-span-2"><strong>Bleeding:</strong> {completedFormData.bleeding}</div>
                  )}
                  {completedFormData?.breathing && (
                    <div className="col-span-2"><strong>Breathing Issues:</strong> {completedFormData.breathing}</div>
                  )}
                  {completedFormData?.chest_pain && (
                    <div className="col-span-2"><strong>Chest Pain:</strong> {completedFormData.chest_pain}</div>
                  )}
                  {completedFormData?.mobility && (
                    <div className="col-span-2"><strong>Mobility:</strong> {completedFormData.mobility}</div>
                  )}
                </div>
              </div>
              <Button
                onClick={resetAssessment}
                size="lg"
                className="text-xl py-4 px-8"
              >
                Start New Assessment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Form Display */}
            <Card className="border-0 shadow-xl bg-white/95">
              <CardHeader>
                <CardTitle className="text-2xl flex items-center justify-between">
                  Patient Information
                  <div className="text-sm font-normal">
                    <Progress value={progress} className="w-32" />
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ALL_FIELDS.map((field, idx) => {
                  const value = formData[field as keyof FormData];
                  const isActive = idx === (currentStep - 1);
                  const isCompleted = idx < (currentStep - 1);

                  return (
                    <div
                      key={field}
                      className={`p-4 rounded-lg transition-all ${
                        isActive ? 'bg-blue-50 border-2 border-blue-400' :
                        isCompleted ? 'bg-green-50 border border-green-300' :
                        'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${isCompleted ? 'text-green-600' : ''}`}>
                          {FIELD_ICONS[field as keyof typeof FIELD_ICONS]}
                        </div>
                        <div className="flex-1">
                          <Label className="text-sm font-medium">
                            {FIELD_LABELS[field as keyof typeof FIELD_LABELS]}
                          </Label>
                          <Input
                            value={value || ''}
                            placeholder={isActive ? (transcript ? `"${transcript}"` : 'Answer this question...') : ''}
                            readOnly
                            className={`mt-1 ${
                              isActive ? 'border-blue-400' :
                              isCompleted ? 'border-green-300 bg-green-50' :
                              ''
                            }`}
                            placeholder={
                              isActive ?
                                (transcript ? "Processing..." : "Listening...") :
                                (value ? "" : "Pending...")
                            }
                          />
                        </div>
                        {isCompleted && (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-1" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Current Question & Controls */}
            <Card className="border-0 shadow-xl bg-white/95">
              <CardContent className="p-8">
                <div className="text-center space-y-6">
                  <div className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                      {currentQuestion || "Loading..."}
                    </h2>

                    {/* Voice Status */}
                    <div className="flex justify-center items-center space-x-4">
                      {isSpeaking && (
                        <div className="flex items-center text-blue-600">
                          <Volume2 className="h-6 w-6 mr-2 animate-pulse" />
                          <span>Speaking...</span>
                        </div>
                      )}

                      {isListening && (
                        <div className="flex items-center text-red-600">
                          <Mic className="h-6 w-6 mr-2 animate-pulse" />
                          <span>Listening...</span>
                        </div>
                      )}

                      {!isSpeaking && !isListening && (
                        <div className="flex items-center text-gray-500">
                          <MicOff className="h-6 w-6 mr-2" />
                          <span>Ready</span>
                        </div>
                      )}
                    </div>

                    {/* Live Transcript */}
                    {transcript && (
                      <div className="mx-auto max-w-md">
                        <p className="text-lg text-gray-700 italic bg-gray-100 p-4 rounded-lg">
                          "{transcript}"
                        </p>
                      </div>
                    )}

                    {/* Error Message */}
                    {errorMessage && (
                      <div className="mx-auto max-w-md">
                        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
                          <AlertCircle className="h-5 w-5" />
                          <p className="text-sm">{errorMessage}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Manual Controls */}
                  <div className="flex justify-center gap-4 pt-6">
                    <Button
                      onClick={isListening ? stopListening : startListening}
                      disabled={isSpeaking}
                      size="lg"
                      className={`${
                        isListening
                          ? 'bg-red-600 hover:bg-red-700'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="h-5 w-5 mr-2" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Mic className="h-5 w-5 mr-2" />
                          Speak
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={() => speakText(currentQuestion)}
                      disabled={isSpeaking || isListening}
                      variant="outline"
                      size="lg"
                    >
                      <Volume2 className="h-5 w-5 mr-2" />
                      Repeat Question
                    </Button>
                  </div>

                  <Button
                    onClick={resetAssessment}
                    variant="ghost"
                    className="text-gray-500"
                  >
                    Cancel Assessment
                  </Button>
                </div>

                {/* Pain Detection - Below the controls */}
                <div className="pt-6 border-t border-gray-200">
                  <PainDetector
                    isActive={assessmentStarted && !assessmentComplete}
                    onPainData={handlePainData}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}