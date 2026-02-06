import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from './Button';
import ChatBubble from './ChatBubble';
import { ChatMessage } from '../types';
import Icon from './Icon';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSendMessage(input);
      setInput('');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (voiceError) setVoiceError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
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
      setInput(event.results[0][0].transcript);
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setVoiceError(`Erro na gravacao de voz: ${event.error}. Tente novamente.`);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onClearParentError]);

  const handleRetryError = () => {
    if (voiceError) {
      setVoiceError(null);
      startVoiceInput();
    } else if (errorMessage && onClearParentError) {
      onClearParentError();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ backgroundColor: 'var(--color-bg-subtle)' }}
            >
              <Icon name="travel" className="w-8 h-8" style={{ color: 'var(--color-primary)' } as any} />
            </div>
            <p
              className="text-lg md:text-xl font-semibold mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              Bem-vindo ao seu Assistente de Viagens
            </p>
            <p
              className="text-sm max-w-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Como posso ajudar a planejar sua proxima aventura?
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {(errorMessage || voiceError) && (
          <div
            className="flex flex-col items-center mt-4 p-4 rounded-lg mx-auto max-w-md"
            style={{
              backgroundColor: 'var(--color-error-bg)',
              border: '1px solid var(--color-error-border)',
            }}
            role="alert"
          >
            <p className="font-medium text-sm mb-1" style={{ color: 'var(--color-error)' }}>
              Algo deu errado
            </p>
            <p className="text-xs mb-3 text-center" style={{ color: 'var(--color-text-secondary)' }}>
              {errorMessage || voiceError}
            </p>
            <Button onClick={handleRetryError} variant="outline" size="sm">
              Tentar Novamente
            </Button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className="px-4 py-3 md:px-6 md:py-4"
        style={{
          borderTop: '1px solid var(--color-border-light)',
          backgroundColor: 'var(--color-bg-card)',
        }}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={startVoiceInput}
            disabled={loading || isListening}
            aria-label={isListening ? "Gravando voz..." : "Entrada de voz"}
            className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus-ring"
            style={{
              backgroundColor: isListening ? 'var(--color-primary)' : 'var(--color-bg-subtle)',
              color: isListening ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)',
            }}
          >
            {isListening && <span className="voice-pulse absolute inset-0 rounded-full" />}
            <Icon name="mic" className="w-5 h-5 relative z-10" />
          </button>
          <input
            type="text"
            className="flex-1 h-10 px-4 text-sm rounded-full border focus-ring"
            style={{
              backgroundColor: 'var(--color-bg-subtle)',
              borderColor: 'var(--color-border-light)',
              color: 'var(--color-text)',
            }}
            placeholder={placeholder}
            value={input}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            disabled={loading || isListening}
            aria-label="Caixa de texto para mensagem"
          />
          <button
            onClick={handleSend}
            disabled={loading || isListening || !input.trim()}
            aria-label="Enviar mensagem"
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus-ring"
            style={{
              backgroundColor: input.trim() ? 'var(--color-primary)' : 'var(--color-bg-muted)',
              color: input.trim() ? 'var(--color-text-inverse)' : 'var(--color-text-muted)',
            }}
          >
            {loading ? (
              <svg
                className="animate-spin h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <Icon name="send" className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
