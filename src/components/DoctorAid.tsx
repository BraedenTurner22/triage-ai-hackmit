import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import OpenAI from "openai";
import {
  Mic,
  MicOff,
  FileText,
  Lightbulb,
  FlaskConical,
  Pill,
  Brain,
  History,
  UserPlus,
  Loader2,
  Sparkles,
  KeyRound,
  Save
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

// --- Type Definitions ---
interface SuggestionItem {
  name: string;
  details?: string;
}

interface MedicalSuggestion {
  category: 'diagnoses' | 'tests' | 'medications' | 'referrals' | 'follow_up';
  items: SuggestionItem[];
  reasoning: string;
}

// --- Main Component ---
export function DoctorAid() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [suggestions, setSuggestions] = useState<Record<string, MedicalSuggestion>>({});
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [tempApiKey, setTempApiKey] = useState<string>('');
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const openaiRef = useRef<OpenAI | null>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  // --- Initialization and API Key Management ---
  useEffect(() => {
    const generateSuggestions = async (currentTranscript: string) => {
      if (!openaiRef.current) {
        toast.error("OpenAI client not initialized. Please check your API key.");
        return;
      }
      if (currentTranscript.trim().split(' ').length < 10) {
        return;
      }
  
      setIsGeneratingSuggestions(true);
  
      const systemPrompt = `You are a clinical decision support assistant. Based on the provided medical transcript, generate potential medical suggestions. The transcript may be incomplete. Provide your output ONLY in a valid JSON format with the following structure:
      {
        "diagnoses": { "category": "diagnoses", "items": [{ "name": "string", "details": "string" }], "reasoning": "string" },
        "tests": { "category": "tests", "items": [{ "name": "string", "details": "string" }], "reasoning": "string" },
        "medications": { "category": "medications", "items": [{ "name": "string", "details": "string" }], "reasoning": "string" }
      }
      Ensure the JSON is well-formed and complete. Do not include any text or explanations outside of the JSON object.`;
  
      try {
        console.log("--- Sending to OpenAI ---");
        console.log("Transcript:", currentTranscript);

        const response = await openaiRef.current.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Here is the transcript:\n\n${currentTranscript}` }
          ],
          response_format: { type: "json_object" },
        });
  
        const content = response.choices[0]?.message?.content;
        if (content) {
          console.log("--- Received from OpenAI ---");
          console.log("Raw Response:", content);
          const parsedSuggestions = JSON.parse(content);
          setSuggestions(parsedSuggestions);
        }
      } catch (error) {
        console.error("Error generating suggestions:", error);
        toast.error("Failed to generate AI suggestions.");
      } finally {
        setIsGeneratingSuggestions(false);
      }
    };

    const storedKey = localStorage.getItem('openai_api_key');
    if (storedKey) {
      setApiKey(storedKey);
      openaiRef.current = new OpenAI({ apiKey: storedKey, dangerouslyAllowBrowser: true });
    } else {
      toast.warning("OpenAI API key is not set. Please add it in settings.");
    }
    
    // Setup Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let final_transcript = '';
        let interim_transcript = '';
    
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
          } else {
            interim_transcript += event.results[i][0].transcript;
          }
        }
        
        setInterimTranscript(interim_transcript);
    
        if (final_transcript.trim()) {
            setTranscript(prevTranscript => {
                const newFullTranscript = prevTranscript + final_transcript + '. ';
                
                if (suggestionTimeoutRef.current) {
                    clearTimeout(suggestionTimeoutRef.current);
                }
                suggestionTimeoutRef.current = setTimeout(() => {
                    generateSuggestions(newFullTranscript);
                }, 2000); 
    
                return newFullTranscript;
            });
        }
      };

      recognition.onend = () => {
        if (isRecordingRef.current) { // Use ref to avoid stale state
            recognition.start();
        }
      };
      recognitionRef.current = recognition;
    } else {
      toast.error("Speech recognition is not supported in this browser.");
    }

  }, []);

  const handleSaveApiKey = () => {
    if (tempApiKey) {
      setApiKey(tempApiKey);
      localStorage.setItem('openai_api_key', tempApiKey);
      openaiRef.current = new OpenAI({ apiKey: tempApiKey, dangerouslyAllowBrowser: true });
      setIsKeyDialogOpen(false);
      toast.success("API Key saved successfully!");
    } else {
      toast.error("API Key cannot be empty.");
    }
  };


  // --- Speech Recognition Handling ---
  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      setTranscript(''); // Clear transcript on new session start
      setSuggestions({});
      recognitionRef.current.start();
    }
    setIsRecording(!isRecording);
  };

  // --- UI Components & Rendering ---
  const SuggestionIcon = ({ category }: { category: string }) => {
    switch (category) {
      case 'diagnoses': return <Brain className="h-4 w-4" />;
      case 'tests': return <FlaskConical className="h-4 w-4" />;
      case 'medications': return <Pill className="h-4 w-4" />;
      case 'referrals': return <UserPlus className="h-4 w-4" />;
      case 'follow_up': return <History className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-4">
      <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl flex items-center gap-2 text-blue-800">
              <Sparkles className="h-6 w-6" />
              DoctorAid: AI Medical Scribe
            </CardTitle>
          </div>
          <div className="flex items-center gap-4">
            <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                        <KeyRound className="h-4 w-4 mr-2" />
                        API Key
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Set OpenAI API Key</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-gray-600">
                      Your API key is stored securely in your browser's local storage and is never sent to our servers.
                    </p>
                    <Input 
                        type="password"
                        placeholder="sk-..."
                        defaultValue={apiKey}
                        onChange={(e) => setTempApiKey(e.target.value)}
                    />
                    <DialogFooter>
                        <Button onClick={handleSaveApiKey}><Save className="h-4 w-4 mr-2"/>Save Key</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Button onClick={toggleRecording} size="lg" disabled={!apiKey}>
              {isRecording ? (
                <>
                  <MicOff className="h-5 w-5 mr-2" />
                  Stop Session
                </>
              ) : (
                <>
                  <Mic className="h-5 w-5 mr-2" />
                  Start Session
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {!isRecording && transcript === '' ? (
        <div className="text-center py-20 bg-gray-50 rounded-lg">
          <Sparkles className="h-16 w-16 mx-auto text-gray-300" />
          <h3 className="text-xl font-medium text-gray-700 mt-4">Session Not Started</h3>
          <p className="text-gray-500">
            {apiKey ? 'Click "Start Session" to begin recording.' : 'Please set your OpenAI API key to begin.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Transcription Column */}
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Live Transcription</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[60vh] p-4 border rounded-lg bg-gray-50">
                  <p className="text-gray-800 whitespace-pre-wrap">{transcript}<span className="text-gray-500">{interimTranscript}</span></p>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Suggestions Column */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5" />
                    AI Suggestions
                    {isGeneratingSuggestions && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(suggestions).length === 0 ? (
                  <div className="text-center text-gray-500 py-4">
                    <p>Awaiting transcript for analysis...</p>
                  </div>
                ) : (
                  <Accordion type="multiple" defaultValue={['diagnoses']} className="w-full">
                    {['diagnoses', 'tests', 'medications', 'referrals', 'follow_up'].map(category => {
                      const suggestion = suggestions[category];
                      if (!suggestion || suggestion.items.length === 0) return null;
                      return (
                        <AccordionItem value={category} key={category}>
                          <AccordionTrigger className="capitalize text-sm font-semibold">
                            <div className="flex items-center gap-2">
                              <SuggestionIcon category={category} />
                              {category}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent>
                            <ul className="list-disc pl-5 space-y-2 text-sm">
                              {suggestion.items.map((item, index) => (
                                <li key={index}>
                                  <strong>{item.name}</strong>
                                  {item.details && `: ${item.details}`}
                                </li>
                              ))}
                            </ul>
                            <p className="text-xs text-gray-500 mt-3 pt-3 border-t">
                              <strong>Reasoning:</strong> {suggestion.reasoning}
                            </p>
                          </AccordionContent>
                        </AccordionItem>
                      )
                    })}
                  </Accordion>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
