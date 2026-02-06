import React, { useState, useRef, useEffect, useCallback } from 'react';
import Button from './Button';
import ChatBubble from './ChatBubble';
import { ChatMessage } from '../types';
import Icon from './Icon'; // Import the Icon component

// --- Start of SpeechRecognition TypeScript Declarations ---
// These interfaces extend the global Window object to include SpeechRecognition API types,
// which might not be fully present in default TypeScript DOM libraries or vary across browsers.

/**
 * Declares the SpeechRecognition interface.
 * This interface is used for controlling the speech recognition service.
 */
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

/**
 * Declares the SpeechRecognitionEvent interface.
 * Represents the event object for the 'result' event fired by SpeechRecognition.
 */
interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

/**
 * Declares the SpeechRecognitionResultList interface.
 * Represents a list of SpeechRecognitionResult objects.
 */
interface SpeechRecognitionResultList {
  [index: number]: SpeechRecognitionResult;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
}

/**
 * Declares the SpeechRecognitionResult interface.
 * Represents a single result from the speech recognition service.
 */
interface SpeechRecognitionResult {
  [index: number]: SpeechRecognitionAlternative;
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
}

/**
 * Declares the SpeechRecognitionAlternative interface.
 * Represents a single word or phrase that has been recognized.
 */
interface SpeechRecognitionAlternative {
  readonly confidence: number;
  readonly transcript: string;
}

/**
 * Declares the SpeechRecognitionErrorEvent interface.
 * Represents the event object for the 'error' event fired by SpeechRecognition.
 */
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: SpeechRecognitionErrorCode;
  readonly message: string;
}

/**
 * Defines the possible error codes for SpeechRecognitionErrorEvent.
 */
type SpeechRecognitionErrorCode =
  | "no-speech"
  | "aborted"
  | "audio-capture"
  | "network"
  | "not-allowed"
  | "service-not-allowed"
  | "bad-grammar"
  | "language-not-supported";

// Extends the global Window interface to include `SpeechRecognition` and `webkitSpeechRecognition`.
// This allows TypeScript to recognize these browser-specific constructors.
declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}
// --- End of SpeechRecognition TypeScript Declarations ---


interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  loading: boolean;
  errorMessage: string | null;
  placeholder?: string;
  onClearParentError?: () => void; // New prop for clearing errors from parent
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  loading,
  errorMessage,
  placeholder = "Digite sua mensagem...",
  onClearParentError, // Destructure new prop
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
    // Clear voice error if user starts typing
    if (voiceError) {
      setVoiceError(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const startVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      setVoiceError("Desculpe, seu navegador não suporta reconhecimento de voz.");
      return;
    }

    if (recognitionRef.current) {
      recognitionRef.current.abort(); // Stop any previous recognition
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false; // Only capture a single utterance
    recognition.interimResults = false; // Only return final results
    recognition.lang = 'pt-BR'; // Set language to Portuguese (Brazil)

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceError(null); // Clear any previous voice errors when starting
      if (onClearParentError) { // Also clear parent error if voice input is initiated
        onClearParentError();
      }
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setVoiceError(`Erro na gravação de voz: ${event.error}. Por favor, tente novamente.`);
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onClearParentError]); // Add onClearParentError to dependencies

  const handleRetryError = () => {
    if (voiceError) {
      setVoiceError(null); // Clear voice error immediately
      startVoiceInput(); // Retry voice input
    } else if (errorMessage && onClearParentError) {
      onClearParentError(); // Clear parent's error state
      // User can then resend the message via input field
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
            <p className="text-xl md:text-2xl font-bold mb-2">Bem-vindo(a) ao seu Assistente de Viagens!</p>
            <p className="text-sm md:text-base">Como posso ajudar a planejar sua próxima aventura?</p>
          </div>
        )}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {(errorMessage || voiceError) && (
          <div className="flex flex-col items-center justify-center mt-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md mx-auto max-w-md" role="alert">
            <p className="font-semibold mb-2">Ops! Algo deu errado:</p>
            <p className="text-sm mb-3">{errorMessage || voiceError}</p>
            <Button onClick={handleRetryError} variant="outline" size="sm" className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100">
              Tentar Novamente
            </Button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 md:p-6 border-t border-gray-200 sticky bottom-0 bg-white">
        <div className="flex space-x-2">
          <Button
            onClick={startVoiceInput}
            disabled={loading || isListening}
            variant="ghost"
            aria-label={isListening ? "Gravando voz..." : "Entrada de voz"}
            className="p-2 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-gray-400"
          >
            {isListening ? (
              <svg className="animate-pulse h-5 w-5 text-indigo-600" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3.53-2.64 6.4-6 6.7V21h-2v-4.3c-3.36-.3-6-3.17-6-6.7H5c0 3.98 3.53 7.24 8 7.72V21h2v-2.28c4.47-.48 8-3.74 8-7.72h-2z"/>
              </svg>
            ) : (
              <Icon name="voice_chat" className="w-5 h-5 text-gray-700" />
            )}
          </Button>
          <input
            type="text"
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={placeholder}
            value={input}
            onChange={handleInputChange} // Use the new handler
            onKeyPress={handleKeyPress}
            disabled={loading || isListening}
            aria-label="Caixa de texto para mensagem"
          />
          <Button onClick={handleSend} loading={loading} disabled={loading || isListening} size="md">
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;