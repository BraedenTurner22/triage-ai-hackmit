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

interface SmartTriageInterfaceProps {
  onPatientAdd: (patient: any) => void;
}

interface FormData {
  name: string;
  age: string;
  gender: string;
  chiefComplaint: string;
  bleeding: string;
  breathing: string;
  chestPain: string;
  mobility: string;
}

interface CurrentQuestion {
  field: keyof FormData;
  question: string;
  icon: React.ReactNode;
}

const BACKEND_URL = "http://localhost:8001/api/v1";

const QUESTIONS: CurrentQuestion[] = [
  {
    field: 'name',
    question: "What is your name?",
    icon: <User className="h-5 w-5" />
  },
  {
    field: 'age',
    question: "What is your age?",
    icon: <Calendar className="h-5 w-5" />
  },
  {
    field: 'gender',
    question: "What is your gender? Please say male, female, or other.",
    icon: <User className="h-5 w-5" />
  },
  {
    field: 'chiefComplaint',
    question: "Please describe your symptoms and what brought you here today.",
    icon: <Stethoscope className="h-5 w-5" />
  },
  {
    field: 'bleeding',
    question: "Are you currently bleeding from any wounds? Please answer yes or no.",
    icon: <AlertTriangle className="h-5 w-5 text-red-500" />
  },
  {
    field: 'breathing',
    question: "Are you having trouble breathing? Please answer yes or no.",
    icon: <Activity className="h-5 w-5 text-orange-500" />
  },
  {
    field: 'chestPain',
    question: "Are you experiencing chest pain? Please answer yes or no.",
    icon: <Heart className="h-5 w-5 text-red-500" />
  },
  {
    field: 'mobility',
    question: "Are you able to walk without assistance? Please answer yes or no.",
    icon: <Activity className="h-5 w-5" />
  }
];

export function SmartTriageInterface({ onPatientAdd }: SmartTriageInterfaceProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    gender: '',
    chiefComplaint: '',
    bleeding: '',
    breathing: '',
    chestPain: '',
    mobility: ''
  });

  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(8);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    testBackendConnection();
  }, []);

  // Keep sessionIdRef in sync with sessionId state
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

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

  const normalizeAnswer = (answer: string, field: keyof FormData): string => {
    const lower = answer.toLowerCase().trim();

    if (field === 'gender') {
      if (lower.includes('male') && !lower.includes('female')) return 'Male';
      if (lower.includes('female')) return 'Female';
      if (lower.includes('other')) return 'Other';
    }

    if (['bleeding', 'breathing', 'chestPain', 'mobility'].includes(field)) {
      if (lower.includes('yes') || lower.includes('yeah') || lower.includes('yep')) return 'Yes';
      if (lower.includes('no') || lower.includes('nope') || lower.includes('not')) return 'No';
    }

    if (field === 'age') {
      // Extract just the integer part of the age
      const numbers = answer.match(/\d+/);
      if (numbers) {
        const age = parseInt(numbers[0]);
        if (!isNaN(age) && age >= 0 && age <= 150) {
          return age.toString();
        }
      }
    }

    if (field === 'name') {
      return answer.trim().split(' ').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    }

    return answer.trim();
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
        const newSessionId = data.session_id;
        setSessionId(newSessionId);
        setAssessmentStarted(true);
        setCurrentStep(0);

        // Get the first question from backend response
        const firstQuestion = data.question || "Hello! Let's begin your triage assessment.";
        setCurrentQuestion(firstQuestion);
        setCurrentStep(data.step || 1);
        setTotalSteps(data.total_steps || 8);

        // Speak the first question
        await speakText(firstQuestion, newSessionId);

        console.log("✅ Triage session started:", data.session_id);
      }
    } catch (error) {
      console.error("Error starting assessment:", error);
      toast.error("Failed to start assessment. Please try again.");
    }
  };

  const speakText = async (text: string, useSessionId?: string | null) => {
    try {
      setIsSpeaking(true);
      const currentSessionId = useSessionId || sessionIdRef.current;

      // If no session ID yet, just play without backend
      if (!currentSessionId) {
        setIsSpeaking(false);
        setTimeout(() => {
          if (!isListening && !assessmentComplete) {
            startListening();
          }
        }, 500);
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
          // Auto-start listening after speaking
          setTimeout(() => {
            if (!isListening && !assessmentComplete) {
              startListening();
            }
          }, 500);
        };

        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        await audio.play();
      }
    } catch (error) {
      console.error("Error generating speech:", error);
      setIsSpeaking(false);
      // Still start listening even if speech fails
      setTimeout(() => startListening(), 500);
    }
  };

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      setIsListening(true);
      setTranscript("");
      setValidationError(null);

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

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        mediaRecorder.start();
        // Auto-stop after 8 seconds
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
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsListening(false);
  };

  const processAudioResponse = async (audioBlob: Blob) => {
    const currentSessionId = sessionIdRef.current;
    if (!currentSessionId) {
      console.error('No session ID available');
      return;
    }

    try {
      console.log('Sending audio to backend for session:', currentSessionId);
      const formData = new FormData();
      formData.append('audio_file', audioBlob, 'recording.wav');

      const response = await fetch(`${BACKEND_URL}/triage/sessions/${currentSessionId}/voice`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      console.log('Backend response:', data);

      if (data.success) {
        console.log('Processing response:', data);
        const userAnswer = data.transcript;

        // Update form data based on current field if provided
        if (data.type === 'voice_question' && data.question) {
          // Update form data with the validated response FIRST
          const fieldMapping = {
            1: 'name', 2: 'age', 3: 'gender', 4: 'chiefComplaint',
            5: 'bleeding', 6: 'breathing', 7: 'chestPain', 8: 'mobility'
          };
          const completedStep = currentStep; // This is the step we just completed
          const fieldName = fieldMapping[completedStep];

          console.log('Mapping step', completedStep, 'to field', fieldName, 'with answer:', userAnswer);

          if (fieldName) {
            setFormData(prev => {
              const newData = {
                ...prev,
                [fieldName]: userAnswer
              };
              console.log('Updated form data:', newData);
              return newData;
            });
          }

          // THEN update UI for next question
          setCurrentQuestion(data.question);
          setCurrentStep(data.step || currentStep + 1);
          setTotalSteps(data.total_steps || totalSteps);

          setTranscript("");
          setValidationError(null);
          setRetryCount(0);

          // Speak the next question
          await speakText(data.question, currentSessionId);

        } else if (data.type === 'validation_error') {
          // Backend validation failed - show error and ask same question again
          setValidationError(data.error || "Please try again.");
          setRetryCount(retryCount + 1);

          // Update question with error guidance
          setCurrentQuestion(data.question);

          // Speak the error message and question
          await speakText(data.question, currentSessionId);

        } else if (data.type === 'assessment_complete' || data.stage === 'complete') {
          // Assessment complete
          await completeAssessment();
        }

      } else if (data.confidence < 0.4) {
        toast.warning("I didn't quite catch that. Please try speaking again.");
        await speakText("I didn't quite catch that. Could you please repeat?");
      }

    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error("Failed to process your response. Please try again.");
      setTimeout(() => startListening(), 1000);
    }
  };

  const completeAssessment = async () => {
    setAssessmentComplete(true);

    // Calculate urgency based on emergency questions
    const emergencyScore =
      (formData.bleeding === 'Yes' ? 0.8 : 0) +
      (formData.breathing === 'Yes' ? 0.7 : 0) +
      (formData.chestPain === 'Yes' ? 0.6 : 0) +
      (formData.mobility === 'No' ? 0.3 : 0);

    const urgencyLevel = emergencyScore > 1.0 ? 'CRITICAL' :
                        emergencyScore > 0.6 ? 'HIGH' :
                        emergencyScore > 0.3 ? 'MEDIUM' : 'LOW';

    await speakText(`Thank you ${formData.name}. Your assessment is complete. You have been assigned ${urgencyLevel} priority and added to the queue.`);

    // Notify parent component
    onPatientAdd({
      ...formData,
      urgency_score: emergencyScore,
      triage_level: urgencyLevel,
      session_id: sessionId
    });

    toast.success(`Assessment complete! Priority: ${urgencyLevel}`);
  };

  const resetAssessment = () => {
    setFormData({
      name: '',
      age: '',
      gender: '',
      chiefComplaint: '',
      bleeding: '',
      breathing: '',
      chestPain: '',
      mobility: ''
    });
    setCurrentQuestion("");
    setCurrentStep(0);
    setTotalSteps(8);
    setAssessmentStarted(false);
    setAssessmentComplete(false);
    setTranscript("");
    setSessionId(null);
    setRetryCount(0);
    setValidationError(null);
    stopListening();
  };

  const progress = ((currentStep) / totalSteps) * 100;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {!assessmentStarted ? (
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold text-gray-800">
                AI-Powered Triage Assessment
              </CardTitle>
              <p className="text-xl text-gray-600 mt-4">
                Voice-Enabled Emergency Intake System
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
                Start Triage Assessment
              </Button>
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
                  <div><strong>Name:</strong> {formData.name}</div>
                  <div><strong>Age:</strong> {formData.age}</div>
                  <div><strong>Gender:</strong> {formData.gender}</div>
                  <div className="col-span-2"><strong>Chief Complaint:</strong> {formData.chiefComplaint}</div>
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
                {QUESTIONS.map((q, idx) => {
                  const value = formData[q.field];
                  const isActive = idx === (currentStep - 1); // Backend step is 1-indexed
                  const isCompleted = idx < (currentStep - 1);

                  return (
                    <div
                      key={q.field}
                      className={`p-4 rounded-lg transition-all ${
                        isActive ? 'bg-blue-50 border-2 border-blue-400' :
                        isCompleted ? 'bg-green-50 border border-green-300' :
                        'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 ${isCompleted ? 'text-green-600' : ''}`}>
                          {q.icon}
                        </div>
                        <div className="flex-1">
                          <Label className="text-sm font-medium">
                            {q.field.charAt(0).toUpperCase() + q.field.slice(1).replace(/([A-Z])/g, ' $1')}
                          </Label>
                          <Input
                            value={value || (isActive && transcript ? transcript.replace(/[!?.,;:]+$/, '').trim() : '')}
                            readOnly
                            className={`mt-1 ${
                              isActive ? 'border-blue-400' :
                              isCompleted ? 'border-green-300 bg-green-50' :
                              ''
                            }`}
                            placeholder={isActive ? (transcript ? "Processing..." : "Listening...") : (value ? "" : "Pending...")}
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

                    {/* Validation Error */}
                    {validationError && (
                      <div className="mx-auto max-w-md">
                        <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
                          <AlertCircle className="h-5 w-5" />
                          <p className="text-sm">{validationError}</p>
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
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}