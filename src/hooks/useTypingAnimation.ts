import { useState, useEffect } from 'react';

interface UseTypingAnimationOptions {
  text: string;
  speed?: number;
  startDelay?: number;
}

export function useTypingAnimation({
  text,
  speed = 30,
  startDelay = 0
}: UseTypingAnimationOptions) {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) {
      setDisplayedText('');
      setIsTyping(false);
      setIsComplete(false);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);

    const startTimer = setTimeout(() => {
      setIsTyping(true);
      let index = 0;

      const typeText = () => {
        if (index < text.length) {
          setDisplayedText(text.substring(0, index + 1));
          index++;
          setTimeout(typeText, speed);
        } else {
          setIsTyping(false);
          setIsComplete(true);
        }
      };

      typeText();
    }, startDelay);

    return () => {
      clearTimeout(startTimer);
    };
  }, [text, speed, startDelay]);

  return { displayedText, isTyping, isComplete };
}