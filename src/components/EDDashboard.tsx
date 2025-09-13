import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Patient, Vitals } from "@/types/patient";
import { Mic, MicOff, Volume2, Play, Square, CheckCircle } from "lucide-react";
import { GoogleGenAI, Modality } from "@google/genai";

// Declare Speech Recognition types for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: (event: any) => void;
  onend: () => void;
  onerror: (event: any) => void;
}

interface EDDashboardProps {
  onPatientAdd: (patient: Patient) => void;
}

interface TriageQuestion {
  id: number;
  question: string;
  type: "text" | "number" | "select";
  options?: string[];
}

const triageQuestions: TriageQuestion[] = [
  { id: 1, question: "What is your name?", type: "text" },
  { id: 2, question: "What is your age?", type: "number" },
  {
    id: 3,
    question: "What is your sex?",
    type: "select",
    options: ["Male", "Female", "Other"],
  },
  { id: 4, question: "Please describe your symptoms.", type: "text" },
];

export function EDDashboard({ onPatientAdd }: EDDashboardProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [key: number]: string }>({});
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isConnected, setIsConnected] = useState(false);

  const liveSessionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const genAIRef = useRef<GoogleGenAI | null>(null);

  // Initialize Google AI with environment variable on mount
  useEffect(() => {
    const envApiKey = import.meta.env.VITE_GOOGLE_VOICE_API_KEY;
    console.log(
      "API Key status:",
      envApiKey ? "Present" : "Missing",
      envApiKey?.substring(0, 10) + "..."
    );
    if (envApiKey && envApiKey !== "your_api_key_here") {
      initializeGeminiLive(envApiKey);
    } else {
      console.error(
        "No valid API key found. Please set VITE_GOOGLE_VOICE_API_KEY in your .env file"
      );
    }
  }, []);

  // Initialize audio context for processing
  useEffect(() => {
    if (typeof window !== "undefined") {
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
    }
  }, []);

  const initializeGeminiLive = async (apiKey: string) => {
    if (!apiKey.trim()) return;

    try {
      console.log("Initializing Gemini Live API...");
      genAIRef.current = new GoogleGenAI({ apiKey: apiKey.trim() });
      setIsConnected(true);
      console.log("Gemini Live API initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Gemini Live:", error);
      setIsConnected(false);
      toast({
        title: "Initialization Error",
        description:
          "Failed to initialize Gemini Live API. Check your API key.",
        variant: "destructive",
      });
    }
  };

  const startLiveSession = async () => {
    if (!genAIRef.current || liveSessionRef.current) return;

    try {
      console.log("Starting Live session...");
      setIsSpeaking(true);

      const config = {
        responseModalities: [Modality.AUDIO],
        systemInstruction: `You are a friendly medical triage assistant. Ask questions clearly and wait for responses. 
        When you receive an audio response, acknowledge it briefly and naturally before proceeding to the next question or completing the assessment.
        Be empathetic and professional in your tone.`,
      };

      const session = await genAIRef.current.live.connect({
        model: "gemini-2.5-flash-preview-native-audio-dialog",
        callbacks: {
          onopen: () => {
            console.log("Live session opened");
            setIsConnected(true);
          },
          onmessage: (message: any) => {
            handleLiveMessage(message);
          },
          onerror: (e: any) => {
            console.error("Live session error:", e);
            toast({
              title: "Connection Error",
              description: "Live session error occurred.",
              variant: "destructive",
            });
          },
          onclose: (e: any) => {
            console.log("Live session closed:", e.reason);
            setIsConnected(false);
            setIsSpeaking(false);
            setIsListening(false);
          },
        },
        config,
      });

      liveSessionRef.current = session;

      // Ask the first question
      askCurrentQuestion();
    } catch (error) {
      console.error("Error starting live session:", error);
      setIsSpeaking(false);
      toast({
        title: "Session Error",
        description: "Failed to start live session.",
        variant: "destructive",
      });
    }
  };

  const askCurrentQuestion = async () => {
    if (!liveSessionRef.current) return;

    const currentQuestion = triageQuestions[currentQuestionIndex];
    const questionText = `Question ${currentQuestion.id}: ${currentQuestion.question}`;

    try {
      setIsSpeaking(true);
      await liveSessionRef.current.sendRealtimeInput({
        text: `You are conducting a medical triage assessment. Please ask this question in a friendly, clear, professional voice: "${questionText}". Wait for the patient's response after asking.`,
      });
    } catch (error) {
      console.error("Error sending question:", error);
      toast({
        title: "Communication Error",
        description: "Failed to send question. Please try again.",
        variant: "destructive",
      });
      setIsSpeaking(false);
    }
  };

  const handleLiveMessage = (message: any) => {
    if (message.data) {
      // Handle audio response from AI
      playAudioResponse(message.data);
    }

    if (message.serverContent?.turnComplete) {
      // AI has finished speaking, now listen for user response
      setIsSpeaking(false);
      startAudioRecording();
    }

    // Handle text transcript of user responses
    if (message.serverContent?.message?.content) {
      const content = message.serverContent.message.content;
      if (content.length > 0 && content[0].text) {
        const transcriptText = content[0].text;

        // Check if this contains a user response (not AI instruction)
        if (!transcriptText.includes("Please ask this question")) {
          setTranscript(transcriptText);
          handleUserResponse(transcriptText);
        }
      }
    }
  };

  const handleUserResponse = (responseText: string) => {
    const currentQuestion = triageQuestions[currentQuestionIndex];

    // Store the response
    setResponses((prev) => ({
      ...prev,
      [currentQuestion.id]: responseText,
    }));

    // Move to next question or complete assessment
    if (currentQuestionIndex < triageQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1);
        askCurrentQuestion();
      }, 2000);
    } else {
      setTimeout(() => {
        completeAssessment(responseText);
      }, 2000);
    }
  };

  const playAudioResponse = async (audioData: string) => {
    try {
      const audioBuffer = Uint8Array.from(atob(audioData), (c) =>
        c.charCodeAt(0)
      );
      const audioBlob = new Blob([audioBuffer], { type: "audio/wav" });
      const audioUrl = URL.createObjectURL(audioBlob);

      const audio = new Audio(audioUrl);
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      setIsListening(true);

      mediaRecorderRef.current = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      const audioChunks: Blob[] = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        await processAudioResponse(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();

      // Auto-stop recording after 10 seconds or when user clicks stop
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          stopAudioRecording();
        }
      }, 10000);
    } catch (error) {
      console.error("Error starting audio recording:", error);
      setIsListening(false);
      toast({
        title: "Microphone Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const processAudioResponse = async (audioBlob: Blob) => {
    if (!liveSessionRef.current || !audioContextRef.current) return;

    try {
      // Convert to the required format (16-bit PCM, 16kHz, mono)
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await audioContextRef.current.decodeAudioData(
        arrayBuffer
      );

      // Get audio data from first channel (mono)
      const pcmData = audioBuffer.getChannelData(0);

      // Resample to 16kHz if necessary
      const originalSampleRate = audioBuffer.sampleRate;
      const targetSampleRate = 16000;
      let resampledData = pcmData;

      if (originalSampleRate !== targetSampleRate) {
        const resampleRatio = targetSampleRate / originalSampleRate;
        const newLength = Math.round(pcmData.length * resampleRatio);
        resampledData = new Float32Array(newLength);

        for (let i = 0; i < newLength; i++) {
          const srcIndex = i / resampleRatio;
          const index = Math.floor(srcIndex);
          const fraction = srcIndex - index;

          if (index + 1 < pcmData.length) {
            resampledData[i] =
              pcmData[index] * (1 - fraction) + pcmData[index + 1] * fraction;
          } else {
            resampledData[i] = pcmData[index];
          }
        }
      }

      // Convert to 16-bit PCM
      const int16Array = new Int16Array(resampledData.length);
      for (let i = 0; i < resampledData.length; i++) {
        const sample = Math.max(-1, Math.min(1, resampledData[i]));
        int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      }

      const base64Audio = btoa(
        String.fromCharCode(...new Uint8Array(int16Array.buffer))
      );

      // Send audio to Live API
      await liveSessionRef.current.sendRealtimeInput({
        audio: {
          data: base64Audio,
          mimeType: "audio/pcm;rate=16000",
        },
      });
    } catch (error) {
      console.error("Error processing audio response:", error);
      toast({
        title: "Audio Processing Error",
        description: "Failed to process your audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  const closeLiveSession = () => {
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    setIsConnected(false);
    setIsSpeaking(false);
    setIsListening(false);
  };

  const handleVoiceResponse = (response: string) => {
    const currentQuestion = triageQuestions[currentQuestionIndex];

    // Store the response
    setResponses((prev) => ({
      ...prev,
      [currentQuestion.id]: response,
    }));

    // Move to next question or complete assessment
    if (currentQuestionIndex < triageQuestions.length - 1) {
      setTimeout(() => {
        setCurrentQuestionIndex((prev) => prev + 1);
      }, 1000);
    } else {
      completeAssessment(response);
    }
  };

  const completeAssessment = (finalResponse: string) => {
    const finalResponses = {
      ...responses,
      [triageQuestions[currentQuestionIndex].id]: finalResponse,
    };

    // Close the live session
    closeLiveSession();

    // Create patient from responses
    const vitals: Vitals = {
      heartRate: 80,
      bloodPressure: { systolic: 120, diastolic: 80 },
      oxygenSaturation: 98,
      temperature: 37.0,
      respiratoryRate: 16,
    };

    const newPatient: Patient = {
      id: `PAT-${Date.now()}`,
      name: finalResponses[1] || "Unknown",
      age: parseInt(finalResponses[2]) || 0,
      gender: (finalResponses[3] as Patient["gender"]) || "Other",
      arrivalTime: new Date(),
      triageLevel: 3, // Will be updated by AI analysis
      chiefComplaint: finalResponses[4] || "No symptoms described",
      vitals,
      allergies: [],
      medications: [],
      medicalHistory: [],
      notes: `Gemini Live Voice Assessment - Symptoms: ${finalResponses[4]}`,
      status: "waiting",
      aiSummary:
        "Live voice-based triage assessment completed using Gemini Live API.",
    };

    onPatientAdd(newPatient);
    setAssessmentComplete(true);

    toast({
      title: "Assessment Complete",
      description: `Triage assessment completed for ${newPatient.name}.`,
    });
  };

  const startAssessment = async () => {
    setAssessmentStarted(true);
    setCurrentQuestionIndex(0);
    setResponses({});
    setAssessmentComplete(false);
    await startLiveSession();
  };

  const resetAssessment = () => {
    setAssessmentStarted(false);
    setCurrentQuestionIndex(0);
    setResponses({});
    setAssessmentComplete(false);
    setTranscript("");
    closeLiveSession();
    stopAudioRecording();
  };

  const currentQuestion = triageQuestions[currentQuestionIndex];

  if (!assessmentStarted) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-2xl">
              <Volume2 className="w-6 h-6" />
              Voice-Powered Triage Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg text-muted-foreground">
              Our AI will ask you 4 questions and listen to your responses.
              Please ensure your microphone is enabled.
            </p>
            <Button onClick={startAssessment} size="lg" className="w-full">
              <Play className="w-4 h-4 mr-2" />
              Start Voice Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (assessmentComplete) {
    return (
      <div className="max-w-2xl mx-auto text-center">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-2xl text-green-600">
              <CheckCircle className="w-6 h-6" />
              Assessment Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg">
              Thank you! Your triage assessment has been completed and you've
              been added to the queue.
            </p>
            <div className="bg-muted/50 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Your Responses:</h3>
              <div className="text-left space-y-2">
                {Object.entries(responses).map(([questionId, response]) => {
                  const question = triageQuestions.find(
                    (q) => q.id === parseInt(questionId)
                  );
                  return (
                    <div key={questionId} className="text-sm">
                      <span className="font-medium">{question?.question}</span>
                      <p className="text-muted-foreground ml-4">{response}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <Button onClick={resetAssessment} variant="outline">
              Start New Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2 text-2xl">
            <Volume2 className="w-6 h-6" />
            Voice Triage Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress */}
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-2">
              Question {currentQuestion.id} of {triageQuestions.length}
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    (currentQuestion.id / triageQuestions.length) * 100
                  }%`,
                }}
              />
            </div>
          </div>

          {/* Current Question */}
          <div className="text-center space-y-4">
            <div className="bg-primary/10 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-2">
                Question {currentQuestion.id}
              </h2>
              <p className="text-xl">{currentQuestion.question}</p>
            </div>

            {/* Voice Status */}
            <div className="flex items-center justify-center gap-4">
              {!isConnected && (
                <div className="flex items-center gap-2 text-yellow-600">
                  <Volume2 className="w-5 h-5" />
                  <span>Connecting...</span>
                </div>
              )}

              {isConnected && isSpeaking && (
                <div className="flex items-center gap-2 text-blue-600">
                  <Volume2 className="w-5 h-5 animate-pulse" />
                  <span>AI is speaking...</span>
                </div>
              )}

              {isConnected && isListening && (
                <div className="flex items-center gap-2 text-green-600">
                  <Mic className="w-5 h-5 animate-pulse" />
                  <span>Recording...</span>
                </div>
              )}

              {isConnected && !isSpeaking && !isListening && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MicOff className="w-5 h-5" />
                  <span>Ready...</span>
                </div>
              )}
            </div>

            {/* Current Response */}
            {transcript && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  <strong>Your response:</strong> {transcript}
                </p>
              </div>
            )}

            {/* Previous Responses */}
            {Object.keys(responses).length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-sm">
                  Previous responses:
                </h3>
                <div className="space-y-1">
                  {Object.entries(responses).map(([questionId, response]) => {
                    const question = triageQuestions.find(
                      (q) => q.id === parseInt(questionId)
                    );
                    return (
                      <div
                        key={questionId}
                        className="text-xs text-muted-foreground"
                      >
                        <span className="font-medium">
                          {question?.question}
                        </span>{" "}
                        {response}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={isListening ? stopAudioRecording : startAudioRecording}
              variant={isListening ? "destructive" : "default"}
              disabled={isSpeaking || !isConnected}
            >
              {isListening ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Recording
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Start Recording
                </>
              )}
            </Button>

            <Button onClick={resetAssessment} variant="outline">
              Reset Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
