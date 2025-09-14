import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Camera } from "lucide-react";
import { VoiceActivityIndicator } from "@/components/VoiceActivityIndicator";

// Simple question structure
interface Question {
  id: number;
  text: string;
}

const QUESTIONS: Question[] = [
  { id: 1, text: "What is your name?" },
  { id: 2, text: "What is your age?" },
  { id: 3, text: "What is your sex?" },
  { id: 4, text: "Do you take any medication?" },
  { id: 5, text: "Do you have any allergies?" },
  { id: 6, text: "Please describe your symptoms." },
];

// Simple states
type AppState = "welcome" | "asking" | "listening" | "processing" | "video" | "complete";

export function EDDashboard({ onPatientAdd }: { onPatientAdd?: (patient: any) => void }) {
  const location = useLocation();

  // Core state
  const [currentState, setCurrentState] = useState<AppState>("welcome");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [transcript, setTranscript] = useState("");
  
  // Audio/Speech state
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  
  // Refs
  const recognitionRef = useRef<any>(null);

  // Get current question
  const currentQuestion = QUESTIONS[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === QUESTIONS.length - 1;

  // Start assessment
  const startAssessment = () => {
    console.log("🚀 Starting assessment");
    setCurrentState("asking");
    setCurrentQuestionIndex(0);
    setResponses({});
    askCurrentQuestion();
  };

  // Ask current question
  const askCurrentQuestion = () => {
    if (!currentQuestion) return;
    
    console.log(`❓ Asking question ${currentQuestion.id}: "${currentQuestion.text}"`);
    setCurrentState("asking");
    setTranscript("");
    
    // Speak the question
    speakText(currentQuestion.text).then(() => {
      console.log("🎤 Ready to listen");
      setCurrentState("listening");
      startListening();
    });
  };

  // Text to speech
  const speakText = async (text: string): Promise<void> => {
    return new Promise((resolve) => {
      console.log(`🗣️ Speaking: "${text}"`);
      setIsSpeaking(true);
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      
      utterance.onend = () => {
        console.log("✅ Finished speaking");
        setIsSpeaking(false);
        setCurrentAudio(null);
        resolve();
      };
      
      utterance.onerror = () => {
        console.log("❌ Speech error");
        setIsSpeaking(false);
        setCurrentAudio(null);
        resolve();
      };
      
      speechSynthesis.speak(utterance);
    });
  };

  // Start listening for speech
  const startListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log("❌ Speech recognition not supported");
      handleNoSpeech();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    let finalAnswer = "";

    recognition.onstart = () => {
      console.log("🎤 Listening started");
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimText = "";
      for (let i = 0; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalAnswer = text;
          console.log(`✅ Final answer: "${finalAnswer}"`);
        } else {
          interimText = text;
        }
      }
      setTranscript(finalAnswer || interimText);
    };

    recognition.onend = () => {
      console.log(`🛑 Listening ended. Answer: "${finalAnswer}"`);
      setIsListening(false);
      
      if (finalAnswer.trim()) {
        saveResponse(finalAnswer.trim());
      } else {
        console.log("❌ No answer received");
        handleNoSpeech();
      }
    };

    recognition.onerror = (event) => {
      console.error(`❌ Speech recognition error: ${event.error}`);
      setIsListening(false);
      handleNoSpeech();
    };

    recognitionRef.current = recognition;
    recognition.start();

    // Auto-stop after 8 seconds
    setTimeout(() => {
      if (recognitionRef.current === recognition) {
        console.log("⏰ Auto-stopping listening");
        recognition.stop();
      }
    }, 8000);
  };

  // Save response and move to next question
  const saveResponse = (answer: string) => {
    console.log(`💾 Saving response for question ${currentQuestion.id}: "${answer}"`);
    
    setCurrentState("processing");
    
    // Save the response
    setResponses(prev => {
      const newResponses = {
        ...prev,
        [currentQuestion.id]: answer
      };
      console.log("📋 All responses:", newResponses);
      return newResponses;
    });

    // Move to next question or finish
    setTimeout(() => {
      if (isLastQuestion) {
        console.log("🎉 All questions completed!");
        setCurrentState("video");
      } else {
        console.log("➡️ Moving to next question");
        setCurrentQuestionIndex(prev => prev + 1);
        // Wait a bit then ask next question
        setTimeout(() => {
          askCurrentQuestion();
        }, 500);
      }
    }, 1500);
  };

  // Handle when no speech is detected
  const handleNoSpeech = () => {
    console.log("🤷 No speech detected, moving to next question");
    setTimeout(() => {
      if (isLastQuestion) {
        setCurrentState("video");
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
        setTimeout(() => {
          askCurrentQuestion();
        }, 500);
      }
    }, 1000);
  };

  // Get state message
  const getStateMessage = () => {
    switch (currentState) {
      case "asking":
        return "Please wait";
      case "listening":
        return "You may now speak";
      case "processing":
        return "Processing your response...";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-red-50 via-pink-50 to-red-100"></div>
      </div>

      {/* Header */}
      <header className="bg-white text-red-900 shadow-2xl">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-2">
            <img src="/nurse_head.png" alt="TriageAI" className="w-12 h-12" />
            <h1 className="text-3xl font-bold tracking-tight">TriageAI</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        
        {/* Welcome State */}
        {currentState === "welcome" && (
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
              <CardContent className="p-12">
                <div className="space-y-6">
                  <div className="w-24 h-24 bg-red-500 rounded-full mx-auto flex items-center justify-center">
                    <Video className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-4xl font-bold text-gray-800">AI Triage Assessment</h2>
                  <p className="text-xl text-gray-600">
                    I'll ask you a few questions about your health to help prioritize your care.
                  </p>
                  <Button
                    onClick={startAssessment}
                    size="lg"
                    className="text-xl py-4 px-8 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800"
                  >
                    Start Assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Question States */}
        {(currentState === "asking" || currentState === "listening" || currentState === "processing") && (
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Progress */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-semibold text-gray-700">
                  Question {currentQuestionIndex + 1} of {QUESTIONS.length}
                </span>
                <span className="text-lg font-medium text-red-600">
                  {Math.round(((currentQuestionIndex + 1) / QUESTIONS.length) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-red-500 to-red-600 h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Current Question */}
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
              <CardContent className="p-12">
                <div className="text-center space-y-8">
                  <h2 className="text-4xl md:text-5xl font-bold text-gray-800">
                    {currentQuestion?.text}
                  </h2>

                  {/* Voice Activity Indicator */}
                  {currentState === "asking" && (
                    <div className="text-center">
                      <p className="text-2xl text-gray-600 font-semibold">Please wait</p>
                    </div>
                  )}

                  {currentState === "listening" && (
                    <VoiceActivityIndicator
                      audioElement={null}
                      isActive={true}
                      microphoneStream={null}
                      isListening={true}
                      customMessage="You may now speak"
                    />
                  )}

                  {currentState === "processing" && (
                    <div className="text-center">
                      <p className="text-2xl text-gray-600 font-semibold">Processing your response...</p>
                    </div>
                  )}

                  {/* Transcript Display */}
                  {transcript && (
                    <div className="bg-gray-100 rounded-lg p-4 max-w-2xl mx-auto">
                      <p className="text-lg text-gray-800">"{transcript}"</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Assessment Progress */}
        {(currentState === "asking" || currentState === "listening" || currentState === "processing") && (
          <div className="max-w-4xl mx-auto mt-8">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <h3 className="text-2xl text-center text-gray-800 mb-6">Assessment Progress</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {QUESTIONS.map((question, index) => {
                    const response = responses[question.id];
                    const isActive = index === currentQuestionIndex;
                    const isCompleted = !!response;

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
                          <p className="font-semibold text-gray-700">{question.text}</p>
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
          </div>
        )}

        {/* Video Section */}
        {currentState === "video" && (
          <div className="max-w-4xl mx-auto">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
              <CardContent className="py-16">
                <div className="flex items-center justify-center gap-6 mb-8">
                  <div className="h-24 w-24 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Video className="h-12 w-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-bold text-red-700">Video Assessment</h3>
                  </div>
                </div>
                
                <p className="text-xl text-gray-600 mb-8 text-center">
                  We'll record two short videos: one of your face and one of your full body for medical assessment
                </p>

                <div className="text-center">
                  <div className="bg-gray-900 rounded-lg mx-auto mb-6 w-80 h-60 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <Camera className="h-16 w-16 mx-auto mb-4" />
                      <p className="text-lg">Camera Preview</p>
                      <p className="text-sm">Camera access will be requested</p>
                    </div>
                  </div>

                  <Button
                    size="lg"
                    className="text-xl py-4 px-8 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                  >
                    <Video className="h-6 w-6 mr-3" />
                    Start Video Assessment
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