// SIMPLIFIED SPEECH RECOGNITION FOR TESTING

const startSimpleRecognition = () => {
  console.log("🚀 Simple recognition start");
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = false;
  recognition.interimResults = true;
  
  let result = "";
  
  recognition.onresult = (event) => {
    let text = "";
    for (let i = 0; i < event.results.length; i++) {
      text += event.results[i][0].transcript;
    }
    result = text;
    console.log("RESULT:", result);
  };
  
  recognition.onend = () => {
    console.log("ENDED with result:", result);
    // Call processCapturedSpeech HERE
    if (result.trim()) {
      processCapturedSpeech(result.trim());
    }
  };
  
  recognition.start();
};

// This approach should work - the key is:
// 1. Use continuous = false 
// 2. Process result in onend
// 3. Direct call to processCapturedSpeech