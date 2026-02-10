import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from "react";

interface AITextLoadingProps {
  texts?: string[];
  className?: string;
  interval?: number;
}

export default function AITextLoading({
  texts = [
    "Pensando...",
    "Processando...",
    "Analisando...",
    "Quase la...",
  ],
  className,
  interval = 1500,
}: AITextLoadingProps) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTextIndex((prevIndex) => (prevIndex + 1) % texts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [interval, texts.length]);

  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      <div className="relative flex items-center gap-1.5">
        <motion.div
          className="h-1.5 w-1.5 rounded-full bg-teal-500"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="h-1.5 w-1.5 rounded-full bg-teal-500"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        />
        <motion.div
          className="h-1.5 w-1.5 rounded-full bg-teal-500"
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />
      </div>
      <AnimatePresence mode="wait">
        <motion.span
          key={currentTextIndex}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-medium text-stone-500 dark:text-stone-400"
        >
          {texts[currentTextIndex]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
