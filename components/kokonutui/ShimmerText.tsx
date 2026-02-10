import { motion } from "motion/react";
import { cn } from "../../lib/utils";

interface ShimmerTextProps {
  text: string;
  className?: string;
}

export default function ShimmerText({
  text = "Smart Travel Assistant",
  className,
}: ShimmerTextProps) {
  return (
    <motion.div
      className={cn("relative inline-block overflow-hidden", className)}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <span className="relative z-10 bg-clip-text text-transparent bg-gradient-to-r from-stone-800 via-teal-600 to-stone-800 dark:from-stone-200 dark:via-teal-400 dark:to-stone-200 bg-[length:200%_100%] animate-shimmer font-bold">
        {text}
      </span>
    </motion.div>
  );
}
