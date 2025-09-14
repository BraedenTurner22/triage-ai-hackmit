import { useTypingAnimation } from '@/hooks/useTypingAnimation';

interface TypingTextProps {
  text: string;
  speed?: number;
  startDelay?: number;
  className?: string;
  showCursor?: boolean;
}

export function TypingText({
  text,
  speed = 30,
  startDelay = 0,
  className = '',
  showCursor = true
}: TypingTextProps) {
  const { displayedText, isTyping, isComplete } = useTypingAnimation({
    text,
    speed,
    startDelay,
  });

  if (!text) {
    return null;
  }

  return (
    <div className={className}>
      {displayedText.split('\n').map((paragraph, index) => (
        <p key={index} className="mb-3 last:mb-0">
          {paragraph}
          {index === displayedText.split('\n').length - 1 && isTyping && showCursor && (
            <span className="animate-pulse text-current">|</span>
          )}
        </p>
      ))}
    </div>
  );
}