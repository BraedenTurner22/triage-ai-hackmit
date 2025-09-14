// ULTRA SIMPLE SPEECH RECOGNITION - WORKS VERSION

const startSimpleSpeechRecognition = () => {
  console.log("🚀 SIMPLE START");
  
  // Clear any existing recognition
  if (recognitionRef.current) {
    recognitionRef.current.stop();
    recognitionRef.current = null;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = false; // Single utterance
  recognition.interimResults = true;
  recognition.lang = "en-US";

  let result = "";

  recognition.onstart = () => {
    console.log("🎤 STARTED");
    setIsListening(true);
    setListeningPhase("listening");
  };

  recognition.onresult = (event) => {
    let text = "";
    for (let i = 0; i < event.results.length; i++) {
      text += event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        result = text;
        console.log("FINAL:", result);
      }
    }
    setTranscript(text);
    console.log("DISPLAY:", text);
  };

  recognition.onend = () => {
    console.log("ENDED with result:", result);
    setIsListening(false);
    
    if (result.trim()) {
      // Save directly - no complex processing
      const question = triageQuestions[currentQuestionIndex];
      console.log(`SAVING "${result}" to question ${question.id}`);
      
      setResponses(prev => ({
        ...prev,
        [question.id]: result.trim()
      }));
      
      // Move to next
      setTimeout(() => moveToNextQuestion(), 1000);
    } else {
      console.log("No speech - next question");
      setTimeout(() => moveToNextQuestion(), 1000);
    }
  };

  recognition.onerror = (event) => {
    console.error("ERROR:", event.error);
    setIsListening(false);
    setTimeout(() => moveToNextQuestion(), 1000);
  };

  recognitionRef.current = recognition;
  recognition.start();
  
  // Auto stop after 5 seconds
  setTimeout(() => {
    if (recognitionRef.current === recognition) {
      recognition.stop();
    }
  }, 5000);
};

// This is the absolute simplest approach that should work
// Replace the complex function with this