import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Patient, Vitals } from "@/types/patient";
import {
  Mic,
  MicOff,
  Volume2,
  Play,
  RotateCcw,
  CheckCircle,
  Camera,
  Video,
  VideoOff,
} from "lucide-react";
import OpenAI from "openai";
import { VoiceActivityIndicator } from "./VoiceActivityIndicator";

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
  { id: 4, question: "Do you take any medication?", type: "text" },
  { id: 5, question: "Do you have any allergies?", type: "text" },
  { id: 6, question: "Please describe your symptoms.", type: "text" },
];

export function EDDashboard({ onPatientAdd }: EDDashboardProps) {
  const location = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<{ [key: number]: string }>({});
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [questionAnimating, setQuestionAnimating] = useState(false);
  const [showVideoSection, setShowVideoSection] = useState(false);
  const [videoStage, setVideoStage] = useState<
    "preview" | "face" | "body" | "complete"
  >("preview");
  const [isRecording, setIsRecording] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [videoCountdown, setVideoCountdown] = useState(0);
  const [videoAnimating, setVideoAnimating] = useState(false);
  const [aidRequested, setAidRequested] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(
    null
  );
  const [silenceTimer, setSilenceTimer] = useState<NodeJS.Timeout | null>(null);
  const [lastSpeechTime, setLastSpeechTime] = useState<number>(0);
  const [hasSpokenYet, setHasSpokenYet] = useState(false);
  const [lastTranscript, setLastTranscript] = useState("");
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [listeningPhase, setListeningPhase] = useState<
    "waiting" | "listening" | "processing" | "idle"
  >("idle");
  const [phaseTimer, setPhaseTimer] = useState<NodeJS.Timeout | null>(null);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const openAIRef = useRef<OpenAI | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoCountdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const phaseTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speechProcessingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize OpenAI with environment variable on mount
  useEffect(() => {
    const envApiKey = import.meta.env.VITE_OPENAI_VOICE_API_KEY;
    console.log(
      "API Key status:",
      envApiKey ? "Present" : "Missing",
      envApiKey?.substring(0, 10) + "..."
    );
    if (envApiKey && envApiKey !== "your_api_key_here") {
      initializeOpenAI(envApiKey);
    } else {
      console.error(
        "No valid API key found. Please set VITE_OPENAI_VOICE_API_KEY in your .env file"
      );
    }
  }, []);

  // Monitor navigation changes and stop speech when leaving triage analysis page
  useEffect(() => {
    // Check if we're not on the triage analysis page and speech is active
    if (location.pathname !== "/triage-analysis" && isSpeaking) {
      console.log(
        "Navigation detected: FORCE stopping speech due to page change"
      );

      // Immediately stop any ongoing audio with multiple methods
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0; // Reset to beginning
        currentAudioRef.current.src = ""; // Clear source
        currentAudioRef.current = null;
      }

      // Stop browser speech synthesis aggressively
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
        speechSynthesis.pause();
        setTimeout(() => speechSynthesis.cancel(), 0); // Double cancel
      }

      // Force reset all audio-related state immediately
      setIsSpeaking(false);
      setCurrentAudio(null);

      // Clear any existing audio elements in the DOM
      const audioElements = document.querySelectorAll("audio");
      audioElements.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        audio.src = "";
      });
    }
  }, [location.pathname, isSpeaking]);

  const initializeOpenAI = async (apiKey: string) => {
    if (!apiKey.trim()) return;

    try {
      console.log("Initializing OpenAI API...");
      console.log("API Key length:", apiKey.length);
      console.log("API Key starts with:", apiKey.substring(0, 7));

      openAIRef.current = new OpenAI({
        apiKey: apiKey.trim(),
        dangerouslyAllowBrowser: true,
      });

      // Test the API connection with a simple request
      console.log("Testing OpenAI API connection...");
      const testResponse = await openAIRef.current.audio.speech.create({
        model: "tts-1",
        voice: "nova",
        input: "Test",
        speed: 1.0,
      });

      // If we get here, the API is working
      console.log("OpenAI API test successful");
      setIsReady(true);
      console.log("OpenAI API initialized successfully");
    } catch (error) {
      console.error("Failed to initialize OpenAI:", error);
      console.error("Error details:", error.message);

      setIsReady(false);
      toast({
        title: "Initialization Failed",
        description: `Failed to initialize AI: ${error.message}. Please check your API key.`,
        variant: "destructive",
      });
    }
  };

  // Clear all timers and reset state
  const clearAllTimers = () => {
    if (phaseTimerRef.current) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }
    if (speechProcessingTimerRef.current) {
      clearTimeout(speechProcessingTimerRef.current);
      speechProcessingTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    setPhaseTimer(null);
    setSpeechError(null);
  };

  // Start listening after AI finishes speaking
  const startCleanListeningFlow = () => {
    console.log("🎯 Starting listening flow after AI finished speaking");
    
    // Clear any existing state
    clearAllTimers();
    setListeningPhase("waiting");
    setTranscript("");
    setSpeechError(null);
    
    // Wait for AI speech to fully complete, then start recognition
    setTimeout(() => {
      if (!isSpeaking) {
        console.log("🔄 AI finished - starting speech recognition");
        startSpeechRecognition();
      } else {
        console.log("🚫 AI still speaking - cannot start recognition");
      }
    }, 1000);
  };

  // Move to next question
  const moveToNextQuestion = () => {
    // Prevent duplicate calls
    if (isProcessingResponse) {
      console.log("🚫 Already processing - ignoring duplicate moveToNextQuestion");
      return;
    }
    
    setIsProcessingResponse(true);
    console.log(`➡️ Moving to next question from index ${currentQuestionIndex}`);
    
    // Clean up current state
    clearAllTimers();
    stopSpeechRecognition();
    setListeningPhase("idle");
    setTranscript("");

    const nextIndex = currentQuestionIndex + 1;
    
    if (nextIndex < triageQuestions.length) {
      console.log(`✅ Moving to question ${nextIndex + 1}`);
      setCurrentQuestionIndex(nextIndex);
      setQuestionAnimating(true);

      setTimeout(() => {
        setQuestionAnimating(false);
        setIsProcessingResponse(false); // Reset processing flag
        const nextQuestion = triageQuestions[nextIndex];
        console.log(`🗣️ Speaking question: "${nextQuestion.question}"`);
        speakText(nextQuestion.question, true); // Start listening after speaking
      }, 300);
    } else {
      // All questions complete
      console.log("🎉 All questions complete - moving to video section");
      setShowVideoSection(true);
      setVideoStage("preview");
      setIsProcessingResponse(false);
      speakText(
        "Great! Now we'll record two short videos for your medical assessment. First, I'll show you a camera preview.",
        false
      );
    }
  };

  // Process captured speech and save response
  const processCapturedSpeech = (finalTranscript: string) => {
    console.log(`💾 Processing speech: "${finalTranscript}" for question ${currentQuestionIndex + 1}`);
    
    if (!finalTranscript.trim()) {
      console.log("❌ Empty speech, moving to next question");
      setTimeout(() => moveToNextQuestion(), 500);
      return;
    }

    // Get current question and save response
    const currentQuestion = triageQuestions[currentQuestionIndex];
    const responseText = finalTranscript.trim();
    
    console.log(`💾 Saving "${responseText}" to question ${currentQuestion.id}`);

    setResponses((prev) => {
      const updated = {
        ...prev,
        [currentQuestion.id]: responseText,
      };
      console.log(`✅ Updated responses:`, updated);
      return updated;
    });

    // Move to next question after a short delay to ensure response is saved
    setTimeout(() => {
      moveToNextQuestion();
    }, 500);
  };

  const speakText = async (
    text: string,
    startListeningAfter = false,
    startVideoCountdownAfter: "face" | "body" | null = null,
    showQuestionText = true
  ): Promise<void> => {
    try {
      if (!openAIRef.current) {
        console.error("OpenAI not initialized");
        return;
      }

      setIsSpeaking(true);
      if (showQuestionText) {
        setShowQuestion(true); // Show question when AI starts speaking it
      }
      console.log("AI started speaking:", text);

      // Call OpenAI TTS API
      const response = await openAIRef.current.audio.speech.create({
        model: "tts-1",
        voice: "nova", // You can change this to "alloy", "echo", "fable", "onyx", "nova", or "shimmer"
        input: text,
        speed: 0.9,
      });

      // Convert response to audio blob and play it
      const audioBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: "audio/mpeg" });
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      return new Promise((resolve) => {
        audio.onended = () => {
          setIsSpeaking(false);
          console.log("AI finished speaking");
          URL.revokeObjectURL(audioUrl); // Clean up
          currentAudioRef.current = null; // Clear reference
          setCurrentAudio(null);

          // Start clean listening flow if this was a question
          if (startListeningAfter) {
            console.log(
              "AI finished speaking question - starting clean listening flow"
            );
            setTimeout(() => {
              startCleanListeningFlow();
            }, 500); // Small delay to ensure clean transition
          }

          if (startVideoCountdownAfter) {
            startVideoCountdownTimer(startVideoCountdownAfter);
          }
          resolve();
        };

        audio.onerror = (event) => {
          console.error("Audio playback error:", event);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl); // Clean up
          currentAudioRef.current = null; // Clear reference
          setCurrentAudio(null);
          resolve();
        };

        // Set up the audio reference and state when it starts playing
        audio.onplay = () => {
          console.log("Audio started playing, setting up voice indicator");
          currentAudioRef.current = audio;
          setCurrentAudio(audio);
        };

        // Also set up on loadeddata in case play event doesn't fire
        audio.onloadeddata = () => {
          console.log("Audio data loaded, preparing for voice indicator setup");
          if (!currentAudioRef.current) {
            currentAudioRef.current = audio;
            setCurrentAudio(audio);
          }
        };

        audio.play().catch((error) => {
          console.error("Failed to play audio:", error);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl); // Clean up
          currentAudioRef.current = null; // Clear reference
          setCurrentAudio(null);
          resolve();
        });
      });
    } catch (error) {
      console.error("OpenAI TTS error:", error);
      setIsSpeaking(false);

      // Fallback to browser speech synthesis if OpenAI fails
      if ("speechSynthesis" in window) {
        console.log("Falling back to browser speech synthesis");
        speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        return new Promise((resolve) => {
          utterance.onend = () => {
            setIsSpeaking(false);

            // Start clean listening flow if this was a question
            if (startListeningAfter) {
              console.log(
                "Fallback speech finished - starting clean listening flow"
              );
              setTimeout(() => {
                startCleanListeningFlow();
              }, 500); // Small delay to ensure clean transition
            }

            if (startVideoCountdownAfter) {
              startVideoCountdownTimer(startVideoCountdownAfter);
            }
            resolve();
          };

          utterance.onerror = () => {
            setIsSpeaking(false);
            resolve();
          };

          speechSynthesis.speak(utterance);
        });
      }
    }
  };

  // Speech recognition with proper timing
  const startSpeechRecognition = async () => {
    console.log("🚀 Starting speech recognition with proper timing");

    // Clear any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (isSpeaking) {
      console.log("🚫 AI is speaking - cannot start");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log("❌ No speech recognition support");
      moveToNextQuestion();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true; // Keep listening for up to 5 seconds
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalTranscript = "";
    let hasSpokenYet = false;
    let silenceTimer = null;

    recognition.onstart = () => {
      console.log("🎤 Started listening - 5 second timeout active");
      setIsListening(true);
      setListeningPhase("listening");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          console.log(`✅ Final: "${transcript}"`);
        } else {
          interimTranscript += transcript;
        }
      }

      // Display current text
      setTranscript(finalTranscript + interimTranscript);
      
      // If we heard something, mark that speech was detected
      if ((finalTranscript + interimTranscript).trim()) {
        hasSpokenYet = true;
        
        // Clear existing silence timer
        if (silenceTimer) {
          clearTimeout(silenceTimer);
        }
        
        // Start new 2-second silence timer
        silenceTimer = setTimeout(() => {
          console.log("⏰ 2 seconds of silence detected - processing speech");
          recognition.stop();
        }, 2000);
      }
    };

    recognition.onend = () => {
      console.log(`🛑 Recognition ended. Final: "${finalTranscript}", HasSpoken: ${hasSpokenYet}`);
      setIsListening(false);
      setListeningPhase("idle");
      
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }

      if (hasSpokenYet && finalTranscript.trim()) {
        console.log(`🎯 Processing captured speech: "${finalTranscript}"`);
        processCapturedSpeech(finalTranscript.trim());
      } else {
        console.log("❌ No speech detected, moving to next question");
        moveToNextQuestion();
      }
    };

    recognition.onerror = (event) => {
      console.error(`❌ Speech recognition error: ${event.error}`);
      setIsListening(false);
      if (silenceTimer) {
        clearTimeout(silenceTimer);
      }
      moveToNextQuestion();
    };

    recognitionRef.current = recognition;
    recognition.start();

    // 5-second max timeout
    setTimeout(() => {
      if (recognitionRef.current === recognition) {
        console.log("⏰ 5-second timeout reached - stopping recognition");
        recognition.stop();
      }
    }, 5000);
  };

  // Removed complex silence detection - now handled in speech recognition onend

  const stopSpeechRecognition = () => {
    console.log("🛑 Stopping speech recognition and clearing state");
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.log("Recognition already stopped");
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setListeningPhase("idle");
    setTranscript(""); // Clear transcript display
    console.log("✅ Speech recognition fully reset");
  };

  const startCountdownTimer = () => {
    console.log(`Starting countdown for question ${currentQuestionIndex + 1}`);
    setCountdown(10); // 10 second countdown
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current!);
          console.log(
            `Countdown complete for question ${currentQuestionIndex + 1}`
          );
          handleCountdownComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearCountdownTimer = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(0);
  };

  const startVideoCountdownTimer = (stage: "face" | "body") => {
    console.log(`Starting video countdown for ${stage} recording`);
    setVideoCountdown(5); // 5 second countdown for video
    videoCountdownIntervalRef.current = setInterval(() => {
      setVideoCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(videoCountdownIntervalRef.current!);
          console.log(`Video countdown complete for ${stage} recording`);
          handleVideoCountdownComplete(stage);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearVideoCountdownTimer = () => {
    if (videoCountdownIntervalRef.current) {
      clearInterval(videoCountdownIntervalRef.current);
      videoCountdownIntervalRef.current = null;
    }
    setVideoCountdown(0);
  };

  const handleVideoCountdownComplete = (stage: "face" | "body") => {
    setIsRecording(true);
    if (stage === "face") {
      speakText(
        "Recording your face video now. Please remain still and look at the camera.",
        false
      );
      // Simulate 5 second recording
      setTimeout(() => {
        setIsRecording(false);
        setVideoAnimating(true);
        // Smooth transition to body stage
        setTimeout(() => {
          setVideoStage("body");
          setVideoAnimating(false);
          speakText(
            "Face recording complete. Now please step back so we can see your full body.",
            false,
            "body"
          );
        }, 300);
      }, 5000);
    } else if (stage === "body") {
      speakText(
        "Recording your full body video now. Please remain still.",
        false
      );
      // Simulate 5 second recording
      setTimeout(() => {
        setIsRecording(false);
        setVideoStage("complete");
        setAssessmentComplete(true);
        createPatientRecord(responses);
        speakText(
          "Video assessment complete. You have been added to the queue.",
          false
        );
      }, 5000);
    }
  };

  const handleCountdownComplete = () => {
    console.log(`⏰ Countdown complete - user didn't respond in time`);

    // Stop listening since user didn't respond
    stopSpeechRecognition();
    clearAllTimers();
    setListeningPhase("idle");

    // Use callback to get current state
    setCurrentQuestionIndex((prevIndex) => {
      const simulatedResponse = `No response given for question ${
        prevIndex + 1
      }`;

      console.log(
        `📝 Storing fallback response for question ${
          prevIndex + 1
        }: ${simulatedResponse}`
      );

      // Store the fallback response
      setResponses((prevResponses) => ({
        ...prevResponses,
        [triageQuestions[prevIndex].id]: simulatedResponse,
      }));

      // Move to next question or complete assessment
      if (prevIndex < triageQuestions.length - 1) {
        const nextIndex = prevIndex + 1;
        console.log(`➡️ Countdown: Moving to question index ${nextIndex}`);

        // Move to next question
        setTimeout(() => {
          setQuestionAnimating(false);
          const nextQuestion = triageQuestions[nextIndex];
          speakText(nextQuestion.question, true);
        }, 300);

        setQuestionAnimating(true);
        return nextIndex;
      } else {
        // All 6 questions complete - move to video section
        console.log(
          `✅ Countdown: All questions complete, moving to video section`
        );
        setShowVideoSection(true);
        setVideoStage("preview");
        speakText(
          "Great! Now we'll record two short videos for your medical assessment. First, I'll show you a camera preview.",
          false
        );
        return prevIndex;
      }
    });
  };

  const createPatientRecord = (allResponses: { [key: number]: string }) => {
    const name = allResponses[1] || "Unknown";
    const age = parseInt(allResponses[2]) || 0;
    const gender = (allResponses[3] as "Male" | "Female" | "Other") || "Other";
    const medications = allResponses[4] || "None";
    const allergies = allResponses[5] || "None";
    const symptoms = allResponses[6] || "No symptoms provided";

    const newPatient: Patient = {
      id: Date.now().toString(),
      name,
      age,
      gender,
      chiefComplaint: symptoms,
      arrivalTime: new Date(),
      triageLevel: 3, // Default to moderate
      vitals: {
        heartRate: 80,
        respiratoryRate: 16,
        painLevel: 5, // Default moderate pain level
      },
      allergies: allergies === "None" ? [] : [allergies],
      medications: medications === "None" ? [] : [medications],
      medicalHistory: [],
      status: "waiting",
    };

    onPatientAdd(newPatient);

    toast({
      title: "Patient Added",
      description: `${name} has been added to the queue`,
    });
  };

  const startAssessment = async () => {
    if (!isReady) {
      toast({
        title: "System Not Ready",
        description: "Please wait for the AI to initialize.",
        variant: "destructive",
      });
      return;
    }

    setAssessmentStarted(true);
    setCurrentQuestionIndex(0);
    setResponses({});
    setAssessmentComplete(false);
    setQuestionAnimating(false);
    setShowQuestion(false); // Start with question hidden

    // Start with greeting first, then ask first question
    const welcomeMessage = `Hello! I'm your AI triage nurse. I'll ask you a few questions to help assess your condition. Let's begin.`;
    await speakText(welcomeMessage, false, null, false); // Don't show question during greeting

    // After greeting, show question and ask first question
    setTimeout(() => {
      setShowQuestion(true);
      speakText(triageQuestions[0].question, true); // This will start the clean listening flow
    }, 500);
  };

  const resetAssessment = () => {
    setAssessmentStarted(false);
    setCurrentQuestionIndex(0);
    setResponses({});
    setAssessmentComplete(false);
    setTranscript("");
    setQuestionAnimating(false);
    setShowVideoSection(false);
    setVideoStage("preview");
    setIsRecording(false);
    setShowPreview(false);
    setVideoCountdown(0);
    setVideoAnimating(false);
    setAidRequested(false);
    setIsProcessingResponse(false);
    setShowQuestion(false);
    setListeningPhase("idle");
    setSpeechError(null);

    // Clear all timers
    clearAllTimers();
    clearCountdownTimer();
    clearVideoCountdownTimer();

    // Stop any ongoing speech
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ("speechSynthesis" in window && speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    setIsSpeaking(false);

    // Stop listening
    stopSpeechRecognition();
  };

  const handleAidRequest = () => {
    setAidRequested(true);
    console.log("Emergency aid requested");
    // Could also add additional logging or API calls here for tracking
  };

  const askCurrentQuestion = async () => {
    if (currentQuestionIndex < triageQuestions.length) {
      // Cancel any ongoing speech and timers first
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if ("speechSynthesis" in window && speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
      setIsSpeaking(false);

      // Clear all timers and stop recognition
      clearAllTimers();
      stopSpeechRecognition();
      setListeningPhase("idle");

      const question = triageQuestions[currentQuestionIndex];
      await speakText(question.question, true); // Start the clean listening flow after repeating
    }
  };

  const getCurrentQuestion = () => {
    if (currentQuestionIndex >= triageQuestions.length) return null;
    return triageQuestions[currentQuestionIndex];
  };

  const currentQuestion = getCurrentQuestion();

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {!assessmentStarted ? (
          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200">
            <CardHeader className="text-center pb-8">
              <CardTitle className="text-3xl font-bold text-gray-800">
                Voice Triage Assessment
              </CardTitle>
              <p className="text-xl text-gray-600 mt-4">
                A few questions will be asked to assess your condition.
              </p>
            </CardHeader>
            <CardContent className="text-center space-y-8">
              <Button
                onClick={startAssessment}
                disabled={!isReady}
                size="lg"
                className="text-xl py-6 px-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg transform hover:scale-105 transition-all duration-200"
              >
                <Volume2 className="h-7 w-7 mr-3" />
                Start Voice Assessment
              </Button>

              <div className="space-y-4">
                {!aidRequested ? (
                  <Button
                    onClick={handleAidRequest}
                    disabled={!isReady}
                    size="sm"
                    className="text-sm py-2 px-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow transform hover:scale-105 transition-all duration-200"
                  >
                    Can't speak? Click to receive aid
                  </Button>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-w-xs mx-auto">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-green-700 font-medium text-center">
                      Aid has been requested. You will receive help shortly.
                    </p>
                  </div>
                )}
              </div>

              {!isReady && (
                <div className="flex items-center justify-center gap-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  <p className="text-lg text-yellow-600">Initializing AI...</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {showVideoSection ? (
              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardContent className="py-16">
                  {videoStage === "preview" && (
                    <>
                      <div className="flex items-center justify-center gap-6 mb-8">
                        <div className="h-24 w-24 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <Video className="h-12 w-12 text-white" />
                        </div>
                        <div>
                          <h3 className="text-4xl font-bold text-red-700">
                            Video Assessment
                          </h3>
                        </div>
                      </div>

                      <p className="text-xl text-gray-600 mb-8 text-center">
                        We'll record two short videos: one of your face and one
                        of your full body for medical assessment
                      </p>

                      <div className="text-center">
                        {/* Video Preview Placeholder */}
                        <div className="bg-gray-900 rounded-lg mx-auto mb-6 w-80 h-60 flex items-center justify-center">
                          <div className="text-center text-gray-400">
                            <Camera className="h-16 w-16 mx-auto mb-4" />
                            <p className="text-lg">Camera Preview</p>
                            <p className="text-sm">
                              Camera access will be requested
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <Button
                            onClick={() => {
                              setShowPreview(true);
                              setVideoStage("face");
                              speakText(
                                "Now we'll record a video of your face. Please look directly at the camera.",
                                false,
                                "face"
                              );
                            }}
                            size="lg"
                            className="text-xl py-4 px-8 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                          >
                            <Video className="h-6 w-6 mr-3" />
                            Start Video Assessment
                          </Button>
                        </div>
                      </div>
                    </>
                  )}

                  {videoStage === "face" && (
                    <div
                      className={`transition-all duration-300 ${
                        videoAnimating
                          ? "opacity-0 transform translate-y-4"
                          : "opacity-100 transform translate-y-0"
                      }`}
                    >
                      <h3 className="text-4xl font-bold text-red-700 mb-4">
                        Face Video Recording
                      </h3>
                      <p className="text-xl text-gray-600 mb-8">
                        Please look directly at the camera. Recording will start
                        automatically.
                      </p>

                      {/* Face Video Recording Placeholder */}
                      <div className="bg-gray-900 rounded-lg mx-auto mb-6 w-80 h-60 flex items-center justify-center relative">
                        <div className="text-center text-gray-400">
                          <Video className="h-16 w-16 mx-auto mb-4" />
                          <p className="text-lg">Face Video Recording</p>
                          {isRecording && (
                            <div className="absolute top-4 right-4 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>

                      <VoiceActivityIndicator
                        audioElement={currentAudio}
                        isActive={isSpeaking}
                      />

                      {videoCountdown > 0 && !isSpeaking && !isRecording && (
                        <div className="space-y-6">
                          <div className="text-center">
                            <div className="text-6xl font-bold text-red-600 mb-4">
                              {videoCountdown}
                            </div>
                            <p className="text-2xl text-gray-600">
                              Get ready for face recording
                            </p>
                          </div>
                          <div className="flex justify-center">
                            <div className="relative">
                              <Video className="h-16 w-16 text-red-500 animate-pulse" />
                              <div className="absolute inset-0 h-16 w-16 border-4 border-red-500 rounded-full animate-ping"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isRecording && (
                        <div className="space-y-4">
                          <div className="text-2xl font-bold text-red-600">
                            Recording Face Video...
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <div
                              className="w-3 h-3 bg-red-500 rounded-full animate-pulse"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="w-3 h-3 bg-red-500 rounded-full animate-pulse"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {videoStage === "body" && (
                    <div
                      className={`transition-all duration-300 ${
                        videoAnimating
                          ? "opacity-0 transform translate-y-4"
                          : "opacity-100 transform translate-y-0"
                      }`}
                    >
                      <h3 className="text-4xl font-bold text-red-700 mb-4">
                        Full Body Video Recording
                      </h3>
                      <p className="text-xl text-gray-600 mb-8">
                        Please step back so your entire body is visible.
                        Recording will start automatically.
                      </p>

                      {/* Body Video Recording Placeholder */}
                      <div className="bg-gray-900 rounded-lg mx-auto mb-6 w-80 h-60 flex items-center justify-center relative">
                        <div className="text-center text-gray-400">
                          <Video className="h-16 w-16 mx-auto mb-4" />
                          <p className="text-lg">Body Video Recording</p>
                          {isRecording && (
                            <div className="absolute top-4 right-4 w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                          )}
                        </div>
                      </div>

                      <VoiceActivityIndicator
                        audioElement={currentAudio}
                        isActive={isSpeaking}
                      />

                      {videoCountdown > 0 && !isSpeaking && !isRecording && (
                        <div className="space-y-6">
                          <div className="text-center">
                            <div className="text-6xl font-bold text-red-600 mb-4">
                              {videoCountdown}
                            </div>
                            <p className="text-2xl text-gray-600">
                              Get ready for body recording
                            </p>
                          </div>
                          <div className="flex justify-center">
                            <div className="relative">
                              <Video className="h-16 w-16 text-red-500 animate-pulse" />
                              <div className="absolute inset-0 h-16 w-16 border-4 border-red-500 rounded-full animate-ping"></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {isRecording && (
                        <div className="space-y-4">
                          <div className="text-2xl font-bold text-red-600">
                            Recording Full Body Video...
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                            <div
                              className="w-3 h-3 bg-red-500 rounded-full animate-pulse"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                            <div
                              className="w-3 h-3 bg-red-500 rounded-full animate-pulse"
                              style={{ animationDelay: "0.4s" }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : assessmentComplete ? (
              <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
                <CardContent className="text-center py-16">
                  <CheckCircle className="h-24 w-24 text-green-500 mx-auto mb-6 animate-pulse" />
                  <h3 className="text-4xl font-bold text-green-700 mb-4">
                    Assessment Complete!
                  </h3>
                  <p className="text-xl text-gray-600 mb-8">
                    Patient information has been recorded and they've been added
                    to the queue
                  </p>
                  <Button
                    onClick={resetAssessment}
                    size="lg"
                    className="text-xl py-4 px-8 bg-gradient-to-r from-green-600 to-red-600 hover:from-green-700 hover:to-red-700"
                  >
                    Start New Assessment
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Progress Bar */}
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-semibold text-gray-700">
                      Question {currentQuestionIndex + 1} of{" "}
                      {triageQuestions.length}
                    </span>
                    <span className="text-lg font-medium text-red-600">
                      {Math.round(
                        ((currentQuestionIndex + 1) / triageQuestions.length) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${
                          ((currentQuestionIndex + 1) /
                            triageQuestions.length) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Main Question Display */}
                <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm overflow-hidden">
                  <CardContent className="p-12">
                    <div
                      className={`transition-all duration-300 ${
                        questionAnimating
                          ? "opacity-0 transform translate-y-4"
                          : "opacity-100 transform translate-y-0"
                      }`}
                    >
                      {assessmentStarted && (
                        <div className="text-center space-y-8">
                          {currentQuestion && showQuestion && (
                            <h2 className="text-4xl md:text-5xl font-bold text-gray-800 leading-tight">
                              {currentQuestion.question}
                            </h2>
                          )}

                          <VoiceActivityIndicator
                            audioElement={currentAudio}
                            isActive={isSpeaking}
                          />

                          {!isSpeaking && listeningPhase === "waiting" && (
                            <div className="text-center">
                              <p className="text-2xl text-gray-600 font-semibold">
                                Please wait
                              </p>
                            </div>
                          )}

                          {!isSpeaking && listeningPhase === "listening" && (
                            <VoiceActivityIndicator
                              audioElement={null}
                              isActive={true}
                              microphoneStream={null}
                              isListening={true}
                              customMessage="You may now speak"
                            />
                          )}

                          {!isSpeaking && listeningPhase === "processing" && (
                            <VoiceActivityIndicator
                              audioElement={null}
                              isActive={true}
                              microphoneStream={null}
                              isListening={true}
                              customMessage="Processing..."
                            />
                          )}

                          {!isSpeaking &&
                            listeningPhase === "idle" &&
                            currentQuestion &&
                            showQuestion && (
                              <div className="text-center">
                                <p className="text-2xl text-gray-600 font-semibold">
                                  Please wait
                                </p>
                              </div>
                            )}

                          {speechError && (
                            <div className="mx-auto max-w-2xl">
                              <p className="text-xl text-red-600 font-semibold text-center">
                                {speechError}
                              </p>
                            </div>
                          )}

                          {transcript && !speechError && (
                            <div className="mx-auto max-w-2xl">
                              <p className="text-xl text-gray-700 italic text-center">
                                "{transcript}"
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Controls */}
                <div className="flex justify-center space-x-6">
                  <Button
                    onClick={resetAssessment}
                    variant="outline"
                    size="lg"
                    className="text-lg py-3 px-6 border-2"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Reset Assessment
                  </Button>

                  <Button
                    onClick={askCurrentQuestion}
                    variant="outline"
                    size="lg"
                    disabled={isSpeaking}
                    className="text-lg py-3 px-6 border-2"
                  >
                    <Volume2 className="h-5 w-5 mr-2" />
                    Repeat Question
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Progress Overview */}
        {assessmentStarted && !assessmentComplete && !showVideoSection && (
          <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm mt-8">
            <CardHeader>
              <CardTitle className="text-2xl text-center text-gray-800">
                Assessment Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {triageQuestions.map((question, index) => {
                  const response = responses[question.id];
                  const isActive = index === currentQuestionIndex;
                  const isCompleted = !!response;

                  // Debug logging
                  console.log(
                    `🎯 Progress Display - Question ${question.id} ("${question.question}"): response="${response}", isCompleted=${isCompleted}`
                  );
                  console.log(`🗂️ All responses currently:`, responses);

                  return (
                    <div
                      key={question.id}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        isActive
                          ? "bg-red-50 border-red-300 shadow-md transform scale-105"
                          : isCompleted
                          ? "bg-green-50 border-green-300"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold ${
                            isCompleted
                              ? "bg-green-500 text-white"
                              : isActive
                              ? "bg-red-500 text-white"
                              : "bg-gray-300 text-gray-600"
                          }`}
                        >
                          {isCompleted ? "✓" : index + 1}
                        </div>
                        <p className="font-semibold text-gray-700">
                          {question.question}
                        </p>
                      </div>
                      {response ? (
                        <p className="text-green-700 ml-9 italic font-medium">
                          "{response}"
                        </p>
                      ) : (
                        <p className="text-gray-400 ml-9 italic">
                          No answer provided yet
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
