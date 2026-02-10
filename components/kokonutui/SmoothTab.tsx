import { AnimatePresence, motion } from "motion/react";
import * as React from "react";
import { cn } from "../../lib/utils";

interface TabItem {
  id: string;
  title: string;
  icon?: React.ReactNode;
}

interface SmoothTabProps {
  items: TabItem[];
  defaultTabId?: string;
  className?: string;
  activeColor?: string;
  onChange?: (tabId: string) => void;
}

export default function SmoothTab({
  items,
  defaultTabId,
  className,
  activeColor = "bg-teal-600",
  onChange,
}: SmoothTabProps) {
  const [selected, setSelected] = React.useState<string>(defaultTabId || items[0]?.id || "");
  const [dimensions, setDimensions] = React.useState({ width: 0, left: 0 });

  const buttonRefs = React.useRef<Map<string, HTMLButtonElement>>(new Map());
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    const updateDimensions = () => {
      const selectedButton = buttonRefs.current.get(selected);
      const container = containerRef.current;

      if (selectedButton && container) {
        const rect = selectedButton.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        setDimensions({
          width: rect.width,
          left: rect.left - containerRect.left,
        });
      }
    };

    requestAnimationFrame(() => {
      updateDimensions();
    });

    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, [selected]);

  const handleTabClick = (tabId: string) => {
    setSelected(tabId);
    onChange?.(tabId);
  };

  const handleKeyDown = (e: React.KeyboardEvent, tabId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTabClick(tabId);
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex items-center w-full rounded-full p-1",
        "bg-stone-100 dark:bg-stone-800/60",
        className
      )}
      role="tablist"
      aria-label="Modos do aplicativo"
    >
      {/* Sliding background */}
      <motion.div
        className={cn(
          "absolute h-[calc(100%-8px)] rounded-full",
          activeColor
        )}
        animate={{
          width: dimensions.width,
          x: dimensions.left,
        }}
        transition={{
          type: "spring",
          stiffness: 350,
          damping: 30,
        }}
        style={{ top: 4, left: 0 }}
      />

      {items.map((item) => {
        const isSelected = selected === item.id;
        return (
          <button
            key={item.id}
            aria-selected={isSelected}
            className={cn(
              "relative z-10 flex flex-1 items-center justify-center gap-1.5",
              "px-3 py-2 text-xs font-medium rounded-full cursor-pointer",
              "transition-colors duration-200",
              isSelected
                ? "text-white"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            )}
            onClick={() => handleTabClick(item.id)}
            onKeyDown={(e) => handleKeyDown(e, item.id)}
            ref={(el) => {
              if (el) buttonRefs.current.set(item.id, el);
              else buttonRefs.current.delete(item.id);
            }}
            role="tab"
            tabIndex={isSelected ? 0 : -1}
            type="button"
          >
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            <span>{item.title}</span>
          </button>
        );
      })}
    </div>
  );
}
