import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatBubble from './ChatBubble';
import { ChatMessage } from '../types';
import AITextLoading from './kokonutui/AITextLoading';
import AIVoice from './kokonutui/AIVoice';
import { useAutoResizeTextarea } from '../hooks/use-auto-resize-textarea';
import { cn } from '../lib/utils';
import { Send, Paperclip, Mic, Globe, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- SpeechRecognition TypeScript Declarations ---
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
}
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
}
interface SpeechRecognitionAlternative {
  readonly confidence: number;
  readonly transcript: string;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}
type SpeechRecognitionErrorCode =
  | "no-speech" | "aborted" | "audio-capture" | "network"
  | "not-allowed" | "service-not-allowed" | "bad-grammar" | "language-not-supported";

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  loading: boolean;
  errorMessage: string | null;
  placeholder?: string;
  onClearParentError?: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  loading,
  errorMessage,
  placeholder = "Digite sua mensagem...",
  onClearParentError,
}) => {
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 44,
    maxHeight: 160,
  });

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSendMessage(input);
      setInput('');
      adjustHeight(true);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const startVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setVoiceError("Desculpe, seu navegador nao suporta reconhecimento de voz.");
      return;
    }
    if (recognitionRef.current) recognitionRef.current.abort();

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError(null);
      if (onClearParentError) onClearParentError();
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setShowVoicePanel(false);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      setVoiceError(`Erro na gravacao de voz: ${event.error}.`);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onClearParentError]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      setIsListening(false);
    }
  }, []);

  const toggleVoice = useCallback(() => {
    if (isListening) {
      stopVoiceInput();
    } else {
      startVoiceInput();
    }
  }, [isListening, startVoiceInput, stopVoiceInput]);

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5 custom-scrollbar">
        {messages.length === 0 && !showVoicePanel && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-500/10 flex items-center justify-center mb-4">
              <Globe className="w-7 h-7 text-teal-600 dark:text-teal-400" />
            </div>
            <p className="text-lg font-semibold text-stone-800 dark:text-stone-200 font-display">
              Bem-vindo ao seu Assistente
            </p>
            <p className="text-sm text-stone-400 dark:text-stone-500 mt-1 max-w-sm">
              Como posso ajudar a planejar sua proxima aventura?
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {loading && messages.length > 0 && messages[messages.length - 1]?.sender === 'gemini' && messages[messages.length - 1]?.isStreaming && (
          null /* streaming is handled inside ChatBubble */
        )}

        {/* Voice panel */}
        <AnimatePresence>
          {showVoicePanel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-center py-4"
            >
              <AIVoice
                isListening={isListening}
                onToggle={toggleVoice}
              />
              {voiceError && (
                <p className="text-xs text-red-500 mt-2 text-center">{voiceError}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {(errorMessage && !showVoicePanel) && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mx-auto max-w-md"
            role="alert"
          >
            <div className="flex-1">
              <p className="font-medium text-sm text-red-600 dark:text-red-400">Algo deu errado</p>
              <p className="text-xs text-red-500/80 dark:text-red-400/60 mt-0.5">{errorMessage}</p>
            </div>
            <button
              onClick={onClearParentError}
              className="text-red-400 hover:text-red-600 transition-colors p-1"
              aria-label="Fechar erro"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Input area - KokonutUI style */}
      <div className="px-3 py-3 md:px-5 md:py-4 border-t border-stone-200 dark:border-stone-700/50 bg-white dark:bg-stone-900">
        <div
          className={cn(
            "relative flex flex-col rounded-2xl border transition-all duration-200",
            isFocused
              ? "border-teal-400 dark:border-teal-500 ring-2 ring-teal-500/20"
              : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50"
          )}
          onClick={() => textareaRef.current?.focus()}
        >
          <textarea
            ref={textareaRef}
            value={input}
            placeholder={placeholder}
            className={cn(
              "w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm",
              "text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500",
              "border-none outline-none focus:ring-0"
            )}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onChange={(e) => {
              setInput(e.target.value);
              adjustHeight();
            }}
            disabled={loading || isListening}
            aria-label="Caixa de texto para mensagem"
          />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 pb-2">
            <div className="flex items-center gap-1">
              {/* Voice toggle */}
              <button
                onClick={() => {
                  setShowVoicePanel(!showVoicePanel);
                  if (isListening) stopVoiceInput();
                }}
                type="button"
                className={cn(
                  "rounded-full p-1.5 transition-all flex items-center gap-1.5 text-xs",
                  showVoicePanel
                    ? "bg-teal-500/15 text-teal-600 dark:text-teal-400"
                    : "text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700/50"
                )}
                disabled={loading}
                aria-label="Entrada de voz"
              >
                <Mic className="w-4 h-4" />
                {showVoicePanel && <span className="font-medium pr-1">Voz</span>}
              </button>
            </div>

            {/* Send button */}
            <motion.button
              onClick={handleSend}
              disabled={loading || isListening || !input.trim()}
              type="button"
              whileTap={{ scale: 0.95 }}
              className={cn(
                "rounded-full p-2 transition-all duration-200",
                input.trim()
                  ? "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                  : "bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600"
              )}
              aria-label="Enviar mensagem"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <Send className="w-4 h-4" />
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
