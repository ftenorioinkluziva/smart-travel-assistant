import { motion } from "motion/react";
import { cn } from "../../lib/utils";

interface KLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  size?: "sm" | "md" | "lg";
}

export default function KLoader({
  title = "Preparando tudo...",
  subtitle = "Aguarde enquanto processamos sua solicitacao",
  size = "md",
  className,
  ...props
}: KLoaderProps) {
  const sizeConfig = {
    sm: {
      container: "w-20 h-20",
      titleClass: "text-sm font-medium",
      subtitleClass: "text-xs",
      spacing: "gap-2",
      maxWidth: "max-w-48",
    },
    md: {
      container: "w-32 h-32",
      titleClass: "text-base font-medium",
      subtitleClass: "text-sm",
      spacing: "gap-3",
      maxWidth: "max-w-56",
    },
    lg: {
      container: "w-40 h-40",
      titleClass: "text-lg font-semibold",
      subtitleClass: "text-base",
      spacing: "gap-4",
      maxWidth: "max-w-64",
    },
  };

  const config = sizeConfig[size];

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        config.spacing,
        className
      )}
      {...props}
    >
      <div className={cn("relative", config.container)}>
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-stone-200 dark:border-stone-700"
          animate={{ rotate: 360, opacity: [0.3, 0.6, 0.3] }}
          transition={{ rotate: { duration: 8, repeat: Infinity, ease: "linear" }, opacity: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
        />

        {/* Primary animated ring */}
        <motion.div
          className="absolute inset-[6px] rounded-full border-2 border-transparent border-t-teal-500 border-r-teal-500/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        />

        {/* Secondary ring - counter rotation */}
        <motion.div
          className="absolute inset-[14px] rounded-full border border-transparent border-b-amber-400/60 border-l-amber-400/20"
          animate={{ rotate: -360 }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        />

        {/* Center dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-2 h-2 rounded-full bg-teal-500" />
        </motion.div>
      </div>

      <div className={cn("text-center", config.maxWidth)}>
        <motion.p
          className={cn(config.titleClass, "text-stone-700 dark:text-stone-300")}
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {title}
        </motion.p>
        <motion.p
          className={cn(config.subtitleClass, "text-stone-400 dark:text-stone-500 mt-1")}
          animate={{ opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          {subtitle}
        </motion.p>
      </div>
    </div>
  );
}
