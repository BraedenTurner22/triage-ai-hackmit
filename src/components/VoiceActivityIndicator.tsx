import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface VoiceActivityIndicatorProps {
  audioElement?: HTMLAudioElement | null;
  isActive: boolean;
  microphoneStream?: MediaStream | null;
  isListening?: boolean;
  customMessage?: string;
}

export const VoiceActivityIndicator: React.FC<VoiceActivityIndicatorProps> = ({
  audioElement,
  isActive,
  microphoneStream,
  isListening,
  customMessage,
}) => {
  const [audioLevels, setAudioLevels] = useState<number[]>(
    new Array(8).fill(0)
  );
  const [isRealAudio, setIsRealAudio] = useState(false);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const simulationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const connectedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Clear any existing intervals/animations
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }

    if (!isActive) {
      // Reset levels when not active
      setAudioLevels(new Array(8).fill(0));
      setIsRealAudio(false);
      return;
    }

    console.log(
      "VoiceActivityIndicator: Starting animation with audioElement:",
      audioElement,
      "microphoneStream:",
      microphoneStream,
      "isActive:",
      isActive,
      "isListening:",
      isListening
    );

    // Prioritize microphone stream if user is listening
    if (isListening && microphoneStream) {
      setupMicrophoneAnalysis();
      return;
    }

    // If no audio element is available, just stay still
    if (!audioElement) {
      console.log("VoiceActivityIndicator: No audio element, staying still...");
      setAudioLevels(new Array(8).fill(0));
      setIsRealAudio(false);
      return;
    }

    const setupAudioAnalysis = async () => {
      try {
        console.log(
          "VoiceActivityIndicator: Setting up audio analysis for element:",
          audioElement
        );
        console.log("VoiceActivityIndicator: Audio element properties:", {
          currentTime: audioElement.currentTime,
          duration: audioElement.duration,
          paused: audioElement.paused,
          readyState: audioElement.readyState,
          src: audioElement.src?.substring(0, 50) + "...",
        });

        // Give the audio element a moment to fully initialize
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Create AudioContext if it doesn't exist
        if (!audioContextRef.current) {
          audioContextRef.current = new (window.AudioContext ||
            (window as any).webkitAudioContext)();
        }

        const audioContext = audioContextRef.current;
        console.log(
          "VoiceActivityIndicator: AudioContext state:",
          audioContext.state
        );

        // Resume AudioContext if it's suspended (required by modern browsers)
        if (audioContext.state === "suspended") {
          console.log(
            "VoiceActivityIndicator: Resuming suspended AudioContext..."
          );
          await audioContext.resume();
        }

        // Create analyzer node
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 256;
        analyzer.smoothingTimeConstant = 0.8;

        // Create data array for frequency data
        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Wait for audio to be ready if it's not playing yet
        if (audioElement.paused && audioElement.readyState < 2) {
          console.log(
            "VoiceActivityIndicator: Audio not ready yet, waiting for it to start..."
          );
          // Wait for audio to start playing or be ready
          await new Promise((resolve) => {
            const onPlay = () => {
              console.log("VoiceActivityIndicator: Audio play event fired");
              audioElement.removeEventListener("play", onPlay);
              audioElement.removeEventListener("canplay", onCanPlay);
              resolve(void 0);
            };

            const onCanPlay = () => {
              console.log("VoiceActivityIndicator: Audio canplay event fired");
              audioElement.removeEventListener("play", onPlay);
              audioElement.removeEventListener("canplay", onCanPlay);
              resolve(void 0);
            };

            audioElement.addEventListener("play", onPlay);
            audioElement.addEventListener("canplay", onCanPlay);

            // Fallback timeout in case events never fire
            setTimeout(() => {
              console.log(
                "VoiceActivityIndicator: Timeout waiting for audio events, proceeding anyway"
              );
              audioElement.removeEventListener("play", onPlay);
              audioElement.removeEventListener("canplay", onCanPlay);
              resolve(void 0);
            }, 3000);
          });
        }

        // Don't create a new source if we're already connected to this audio element
        if (connectedAudioRef.current === audioElement && sourceRef.current) {
          console.log(
            "VoiceActivityIndicator: Already connected to this audio element, reusing source"
          );
          sourceRef.current.connect(analyzer);
          analyzer.connect(audioContext.destination);
        } else {
          // Connect audio element to analyzer
          console.log(
            "VoiceActivityIndicator: Creating new media element source..."
          );

          // Disconnect previous source if it exists
          if (sourceRef.current) {
            try {
              sourceRef.current.disconnect();
            } catch (e) {
              console.log("Previous source already disconnected");
            }
          }

          try {
            const source = audioContext.createMediaElementSource(audioElement);
            source.connect(analyzer);
            analyzer.connect(audioContext.destination);

            sourceRef.current = source;
            connectedAudioRef.current = audioElement;

            console.log(
              "VoiceActivityIndicator: Successfully created and connected audio source"
            );
          } catch (sourceError) {
            console.error(
              "VoiceActivityIndicator: Error creating media source:",
              sourceError
            );
            throw sourceError;
          }
        }

        analyzerRef.current = analyzer;
        dataArrayRef.current = dataArray;
        setIsRealAudio(true);

        console.log(
          "VoiceActivityIndicator: Audio analysis setup complete - using real audio!"
        );

        // Start analysis loop
        const analyze = () => {
          if (!analyzer || !dataArray || !isActive) return;

          analyzer.getByteFrequencyData(dataArray);

          // Calculate audio levels for different frequency bands
          const bandSize = Math.floor(dataArray.length / 8);
          const levels = [];

          for (let i = 0; i < 8; i++) {
            const start = i * bandSize;
            const end = start + bandSize;
            let sum = 0;

            for (let j = start; j < end && j < dataArray.length; j++) {
              sum += dataArray[j];
            }

            // Normalize to 0-1 range and apply some smoothing
            const level = sum / bandSize / 255;
            levels.push(Math.min(level * 3, 1)); // Amplify more for better visual effect
          }

          setAudioLevels(levels);

          // Log audio levels occasionally for debugging
          if (Math.random() < 0.01) {
            // 1% chance to log
            console.log(
              "VoiceActivityIndicator: Real audio levels:",
              levels.map((l) => l.toFixed(2))
            );
          }

          if (isActive) {
            animationFrameRef.current = requestAnimationFrame(analyze);
          }
        };

        // Wait for the audio to actually start playing before starting analysis
        if (!audioElement.paused) {
          console.log(
            "VoiceActivityIndicator: Audio is already playing, starting analysis immediately"
          );
          analyze();
        } else {
          console.log(
            "VoiceActivityIndicator: Audio is paused, waiting for play event"
          );
          const startAnalysis = () => {
            console.log(
              "VoiceActivityIndicator: Audio play detected, starting analysis"
            );
            audioElement.removeEventListener("play", startAnalysis);
            analyze();
          };
          audioElement.addEventListener("play", startAnalysis);
        }
      } catch (error) {
        console.warn("Audio analysis setup failed:", error);
        setIsRealAudio(false);
        // Stay still instead of simulating
        setAudioLevels(new Array(8).fill(0));
      }
    };

    setupAudioAnalysis();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [audioElement, isActive, microphoneStream, isListening]);

  const setupMicrophoneAnalysis = async () => {
    try {
      console.log("VoiceActivityIndicator: Setting up microphone analysis");

      if (!microphoneStream) {
        console.log("VoiceActivityIndicator: No microphone stream available");
        setAudioLevels(new Array(8).fill(0));
        setIsRealAudio(false);
        return;
      }

      // Create AudioContext if it doesn't exist
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      const audioContext = audioContextRef.current;

      // Resume AudioContext if it's suspended
      if (audioContext.state === "suspended") {
        console.log(
          "VoiceActivityIndicator: Resuming AudioContext for microphone"
        );
        await audioContext.resume();
      }

      // Create analyzer node
      const analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      analyzer.smoothingTimeConstant = 0.8;

      // Create data array for frequency data
      const bufferLength = analyzer.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      // Connect microphone stream to analyzer
      const source = audioContext.createMediaStreamSource(microphoneStream);
      source.connect(analyzer);

      analyzerRef.current = analyzer;
      dataArrayRef.current = dataArray;
      setIsRealAudio(true);

      console.log(
        "VoiceActivityIndicator: Microphone analysis setup complete!"
      );

      // Start analysis loop for microphone
      const analyze = () => {
        if (!analyzer || !dataArray || !isActive || !isListening) return;

        analyzer.getByteFrequencyData(dataArray);

        // Calculate audio levels for different frequency bands
        const bandSize = Math.floor(dataArray.length / 8);
        const levels = [];

        for (let i = 0; i < 8; i++) {
          const start = i * bandSize;
          const end = start + bandSize;
          let sum = 0;

          for (let j = start; j < end && j < dataArray.length; j++) {
            sum += dataArray[j];
          }

          // Normalize to 0-1 range and apply some amplification for microphone
          const level = sum / bandSize / 255;
          levels.push(Math.min(level * 4, 1)); // Extra amplification for microphone input
        }

        setAudioLevels(levels);

        if (isActive && isListening) {
          animationFrameRef.current = requestAnimationFrame(analyze);
        }
      };

      analyze();
    } catch (error) {
      console.warn("Microphone analysis setup failed:", error);
      setIsRealAudio(false);
      setAudioLevels(new Array(8).fill(0));
    }
  };

  if (!isActive) return null;

  // Generate organic blob path for voice-responsive circles
  const generateBlobPath = (
    centerX: number,
    centerY: number,
    baseRadius: number,
    audioLevels: number[],
    sensitivity: number = 1
  ) => {
    if (!audioLevels.length || Math.max(...audioLevels) === 0) {
      // Perfect circle when no audio
      return `M ${centerX - baseRadius} ${centerY} 
              A ${baseRadius} ${baseRadius} 0 1 1 ${
        centerX + baseRadius
      } ${centerY} 
              A ${baseRadius} ${baseRadius} 0 1 1 ${
        centerX - baseRadius
      } ${centerY}`;
    }

    const points: Array<{ x: number; y: number }> = [];
    const numPoints = 12; // More points for smoother deformation

    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * 2 * Math.PI;
      const levelIndex = i % audioLevels.length;
      const audioLevel = audioLevels[levelIndex] || 0;

      // Subtle deformation that maintains circular shape with minimal flexing
      const normalizedLevel = (audioLevel - 0.5) * 2; // Range from -1 to 1
      const radiusVariation = normalizedLevel * baseRadius * 0.05 * sensitivity; // Much smaller variation
      const radius = baseRadius + radiusVariation;

      const x = centerX + Math.cos(angle) * Math.max(radius, baseRadius * 0.85); // Higher minimum radius
      const y = centerY + Math.sin(angle) * Math.max(radius, baseRadius * 0.85);
      points.push({ x, y });
    }

    // Create smooth cubic bezier curves
    let pathData = `M ${points[0].x} ${points[0].y}`;

    for (let i = 0; i < points.length; i++) {
      const current = points[i];
      const next = points[(i + 1) % points.length];
      const prev = points[i === 0 ? points.length - 1 : i - 1];
      const afterNext = points[(i + 2) % points.length];

      // Smooth control points
      const cp1x = current.x + (next.x - prev.x) * 0.25;
      const cp1y = current.y + (next.y - prev.y) * 0.25;
      const cp2x = next.x - (afterNext.x - current.x) * 0.25;
      const cp2y = next.y - (afterNext.y - current.y) * 0.25;

      pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }

    pathData += " Z";
    return pathData;
  };

  return (
    <div className="flex items-center justify-center gap-6">
      {/* Voice Activity Indicator */}
      <div className="relative flex items-center justify-center w-20 h-20">
        <svg width="80" height="80" className="absolute inset-0">
          {/* Static outer circle - no movement, just reference */}
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke="#fca5a5"
            strokeWidth="1.5"
            opacity="0.3"
          />

          {/* Moderately sensitive middle circle - same size as reference */}
          <motion.path
            fill="none"
            stroke="#f87171"
            strokeWidth="2"
            animate={{
              d: generateBlobPath(40, 40, 30, audioLevels.slice(0, 6), 0.4),
              opacity: 0.6,
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          />

          {/* Highly sensitive inner circle - smaller circumference */}
          <motion.path
            fill="none"
            stroke="#ef4444"
            strokeWidth="2"
            animate={{
              d: generateBlobPath(40, 40, 24, audioLevels.slice(2, 8), 0.7),
              opacity: 0.8,
            }}
            transition={{ duration: 0.1, ease: "easeOut" }}
          />
        </svg>

        {/* Central solid dot */}
        <motion.div
          className="relative w-4 h-4 bg-red-500 rounded-full z-10"
          animate={{
            scale: 1 + Math.max(...audioLevels) * 0.3,
            opacity: 0.9,
          }}
          transition={{ duration: 0.1, ease: "easeOut" }}
        />
      </div>

      {/* Speaking Text */}
      <div className="text-center">
        <p className="text-2xl text-red-600 font-semibold">
          {customMessage || "AI is speaking..."}
        </p>
      </div>
    </div>
  );
};
