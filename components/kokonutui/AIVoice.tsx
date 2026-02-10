import { Mic, Square } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";

interface AIVoiceProps {
  isListening: boolean;
  onToggle: () => void;
  className?: string;
}

export default function AIVoice({
  isListening,
  onToggle,
  className,
}: AIVoiceProps) {
  const [time, setTime] = useState(0);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (isListening) {
      intervalId = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      setTime(0);
    }

    return () => clearInterval(intervalId);
  }, [isListening]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center gap-4 py-4",
        className
      )}
    >
      <button
        onClick={onToggle}
        type="button"
        className={cn(
          "group cursor-pointer relative rounded-full p-4 transition-colors duration-300",
          isListening
            ? "bg-red-500/10 text-red-500"
            : "bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 hover:bg-teal-500/10 hover:text-teal-500"
        )}
        aria-label={isListening ? "Parar gravacao" : "Iniciar gravacao de voz"}
      >
        {isListening ? (
          <Square className="w-5 h-5 fill-current" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      <span className="font-mono text-sm tabular-nums text-stone-400 dark:text-stone-500">
        {formatTime(time)}
      </span>

      {/* Waveform visualization */}
      <div className="flex items-center gap-[2px] h-8">
        {[...Array(48)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-[2px] rounded-full transition-all duration-300",
              isListening ? "bg-teal-500 dark:bg-teal-400" : "bg-stone-200 dark:bg-stone-700"
            )}
            style={{
              height: isListening
                ? `${Math.random() * 100}%`
                : `${20 + Math.random() * 20}%`,
              animationDelay: `${i * 50}ms`,
              transition: isListening
                ? `height ${150 + Math.random() * 100}ms ease`
                : "height 300ms ease",
            }}
          />
        ))}
      </div>

      <span className="text-xs font-medium text-stone-400 dark:text-stone-500">
        {isListening ? "Ouvindo..." : "Clique para falar"}
      </span>
    </div>
  );
}
