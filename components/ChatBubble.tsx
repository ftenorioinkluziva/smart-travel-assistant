import React, { useMemo } from 'react';
import { ChatMessage } from '../types';
import { marked } from 'marked';
import AITextLoading from './kokonutui/AITextLoading';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { ExternalLink } from 'lucide-react';

marked.setOptions({ async: false });

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  const parsedHtml = useMemo(() => {
    if (!isUser && message.text) {
      return marked.parse(message.text) as string;
    }
    return '';
  }, [isUser, message.text]);

  const renderContent = () => {
    if (!isUser) {
      if (message.isStreaming && !message.text) {
        return (
          <AITextLoading
            texts={[
              "Pensando...",
              "Analisando sua pergunta...",
              "Buscando informacoes...",
              "Preparando resposta...",
            ]}
          />
        );
      } else if (message.isStreaming && message.text) {
        return (
          <>
            <div
              dangerouslySetInnerHTML={{ __html: parsedHtml }}
              className="prose-travel"
            />
            <AITextLoading
              texts={["Continuando...", "Escrevendo...", "Quase la..."]}
              className="mt-2"
            />
          </>
        );
      } else {
        return (
          <div
            dangerouslySetInnerHTML={{ __html: parsedHtml }}
            className="prose-travel"
          />
        );
      }
    }
    return <span className="leading-relaxed">{message.text}</span>;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn(
        "flex flex-col mb-3 max-w-[85%] md:max-w-[75%]",
        isUser ? "items-end ml-auto" : "items-start mr-auto"
      )}
    >
      {!isUser && (
        <span className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 mb-1 ml-1 uppercase tracking-wide">
          Assistente
        </span>
      )}
      <div
        className={cn(
          "px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-teal-600 text-white rounded-2xl rounded-br-md shadow-sm"
            : "bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 rounded-2xl rounded-bl-md"
        )}
      >
        {renderContent()}
      </div>

      {message.groundingChunks && message.groundingChunks.length > 0 && (
        <div className="mt-2 ml-1">
          <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">
            Fontes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {message.groundingChunks.map((chunk, index) => {
              const uri = chunk.web?.uri || chunk.maps?.uri;
              const title = chunk.web?.title || chunk.maps?.title || 'Link';
              if (uri) {
                return (
                  <a
                    key={index}
                    href={uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-stone-50 dark:bg-stone-800/80 text-teal-600 dark:text-teal-400 border border-stone-200 dark:border-stone-700 hover:border-teal-300 dark:hover:border-teal-600 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {title}
                  </a>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default ChatBubble;
