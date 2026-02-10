import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from '@google/genai';
import { sendSearchQuery, sendMapsQuery, createChatSession, sendMessageToChatStream, sendFastResponse } from './services/geminiService';
import { ChatMessage, GeolocationPosition, AppMode } from './types';
import { APP_TITLE, GEOLOCATION_ERROR_MESSAGES, CHAT_HISTORY_STORAGE_KEY } from './constants';
import ChatInterface from './components/ChatInterface';
import SmoothTab from './components/kokonutui/SmoothTab';
import ShimmerText from './components/kokonutui/ShimmerText';
import KLoader from './components/kokonutui/KLoader';
import AITextLoading from './components/kokonutui/AITextLoading';
import { cn } from './lib/utils';
import { useAutoResizeTextarea } from './hooks/use-auto-resize-textarea';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle, Search, MapPin, Zap, Globe,
  History, Trash2, Send, X
} from 'lucide-react';
import { marked } from 'marked';

marked.setOptions({ async: false });

const NAV_ITEMS = [
  { id: 'chat' as AppMode, title: 'Chat', icon: <MessageCircle className="w-4 h-4" /> },
  { id: 'search' as AppMode, title: 'Pesquisa', icon: <Search className="w-4 h-4" /> },
  { id: 'maps' as AppMode, title: 'Mapas', icon: <MapPin className="w-4 h-4" /> },
  { id: 'fast-response' as AppMode, title: 'Rapido', icon: <Zap className="w-4 h-4" /> },
];

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('chat');
  const [geolocation, setGeolocation] = useState<GeolocationPosition | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [mapsResults, setMapsResults] = useState<ChatMessage[]>([]);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const [fastResponseQuery, setFastResponseQuery] = useState('');
  const [fastResponseResult, setFastResponseResult] = useState<string>('');
  const [fastResponseLoading, setFastResponseLoading] = useState(false);
  const [fastResponseError, setFastResponseError] = useState<string | null>(null);
  const [fastFocused, setFastFocused] = useState(false);

  const { textareaRef: fastTextareaRef, adjustHeight: fastAdjustHeight } = useAutoResizeTextarea({
    minHeight: 44,
    maxHeight: 120,
  });

  useEffect(() => {
    chatSessionRef.current = createChatSession();
  }, []);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setChatMessages(JSON.parse(storedHistory));
      }
    } catch (e) {
      localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch (e) { /* ignore */ }
  }, [chatMessages]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          setGeolocationError(null);
        },
        (error) => {
          let msg: string;
          switch (error.code) {
            case error.PERMISSION_DENIED: msg = GEOLOCATION_ERROR_MESSAGES.PERMISSION_DENIED; break;
            case error.POSITION_UNAVAILABLE: msg = GEOLOCATION_ERROR_MESSAGES.POSITION_UNAVAILABLE; break;
            case error.TIMEOUT: msg = GEOLOCATION_ERROR_MESSAGES.TIMEOUT; break;
            default: msg = GEOLOCATION_ERROR_MESSAGES.UNKNOWN_ERROR; break;
          }
          setGeolocationError(msg);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setGeolocationError("Geolocation is not supported by your browser.");
    }
  }, []);

  const handleClearChatHistory = useCallback(() => {
    setChatMessages([]);
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
  }, []);

  const handleLoadChatHistory = useCallback(() => {
    try {
      const storedHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setChatMessages(JSON.parse(storedHistory));
      }
    } catch (e) { /* ignore */ }
  }, []);

  const handleSendChatMessage = useCallback(async (message: string) => {
    if (!chatSessionRef.current) return;
    const userMessageId = `user-${Date.now()}`;
    setChatMessages((prev) => [...prev, { id: userMessageId, sender: 'user', text: message }]);
    setChatLoading(true);
    setChatError(null);
    const geminiMessageId = `gemini-${Date.now()}`;
    setChatMessages((prev) => [...prev, { id: geminiMessageId, sender: 'gemini', text: '', isStreaming: true }]);

    try {
      await sendMessageToChatStream(
        chatSessionRef.current,
        message,
        (textChunk) => {
          setChatMessages((prev) =>
            prev.map((msg) => msg.id === geminiMessageId ? { ...msg, text: textChunk } : msg)
          );
        },
        (groundingChunks) => {
          setChatMessages((prev) =>
            prev.map((msg) => msg.id === geminiMessageId ? { ...msg, isStreaming: false, groundingChunks } : msg)
          );
        },
        (error) => {
          setChatError(error);
          setChatMessages((prev) =>
            prev.map((msg) => msg.id === geminiMessageId ? { ...msg, isStreaming: false, text: `Erro: ${error}` } : msg)
          );
        }
      );
    } catch (e: any) {
      setChatError(e.message || "Erro inesperado.");
      setChatMessages((prev) =>
        prev.map((msg) => msg.id === geminiMessageId ? { ...msg, isStreaming: false, text: `Erro: ${e.message}` } : msg)
      );
    } finally {
      setChatLoading(false);
    }
  }, []);

  const handleSendSearchQuery = useCallback(async (query: string) => {
    if (!query.trim()) return;
    setSearchResults((prev) => [...prev, { id: `user-search-${Date.now()}`, sender: 'user', text: query }]);
    setSearchLoading(true);
    setSearchError(null);
    try {
      const response = await sendSearchQuery(query);
      setSearchResults((prev) => [...prev, { id: `gemini-search-${Date.now()}`, sender: 'gemini', text: response.text, groundingChunks: response.groundingChunks }]);
    } catch (e: any) {
      setSearchError(e.message || "Falha na pesquisa.");
      setSearchResults((prev) => [...prev, { id: `error-search-${Date.now()}`, sender: 'gemini', text: `Erro: ${e.message}` }]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSendMapsQuery = useCallback(async (query: string) => {
    if (!query.trim()) return;
    if (!geolocation && !geolocationError) { setMapsError("Obtendo sua localizacao..."); return; }
    if (geolocationError) { setMapsError(geolocationError); return; }
    setMapsResults((prev) => [...prev, { id: `user-maps-${Date.now()}`, sender: 'user', text: query }]);
    setMapsLoading(true);
    setMapsError(null);
    try {
      const response = await sendMapsQuery(query, geolocation || undefined);
      setMapsResults((prev) => [...prev, { id: `gemini-maps-${Date.now()}`, sender: 'gemini', text: response.text, groundingChunks: response.groundingChunks }]);
    } catch (e: any) {
      setMapsError(e.message || "Falha na consulta de mapas.");
      setMapsResults((prev) => [...prev, { id: `error-maps-${Date.now()}`, sender: 'gemini', text: `Erro: ${e.message}` }]);
    } finally {
      setMapsLoading(false);
    }
  }, [geolocation, geolocationError]);

  const handleSendFastResponse = useCallback(async () => {
    if (!fastResponseQuery.trim()) return;
    setFastResponseResult('');
    setFastResponseLoading(true);
    setFastResponseError(null);
    try {
      const response = await sendFastResponse(fastResponseQuery);
      setFastResponseResult(response);
    } catch (e: any) {
      setFastResponseError(e.message || "Falha na resposta rapida.");
    } finally {
      setFastResponseLoading(false);
      setFastResponseQuery('');
      fastAdjustHeight(true);
    }
  }, [fastResponseQuery, fastAdjustHeight]);

  const renderContent = () => {
    switch (appMode) {
      case 'chat':
        return (
          <div className="flex flex-col h-full">
            {/* Chat toolbar */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-100 dark:border-stone-800">
              <button
                onClick={handleLoadChatHistory}
                disabled={chatLoading}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-700/60 transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                Historico
              </button>
              <button
                onClick={handleClearChatHistory}
                disabled={chatLoading}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/60 hover:bg-stone-100 dark:hover:bg-stone-700/60 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Limpar
              </button>
            </div>
            <ChatInterface
              messages={chatMessages}
              onSendMessage={handleSendChatMessage}
              loading={chatLoading}
              errorMessage={chatError}
              placeholder="Pergunte sobre destinos, atividades, etc."
              onClearParentError={() => setChatError(null)}
            />
          </div>
        );

      case 'search':
        return (
          <ChatInterface
            messages={searchResults}
            onSendMessage={(msg) => handleSendSearchQuery(msg)}
            loading={searchLoading}
            errorMessage={searchError}
            placeholder="Pesquise sobre eventos, noticias de viagem..."
            onClearParentError={() => setSearchError(null)}
          />
        );

      case 'maps':
        return (
          <ChatInterface
            messages={mapsResults}
            onSendMessage={(msg) => handleSendMapsQuery(msg)}
            loading={mapsLoading}
            errorMessage={mapsError || geolocationError}
            placeholder="Encontre restaurantes, hoteis ou pontos turisticos."
            onClearParentError={() => { setMapsError(null); setGeolocationError(null); }}
          />
        );

      case 'fast-response':
        return (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5 custom-scrollbar">
              {!fastResponseResult && !fastResponseLoading && !fastResponseError && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
                    <Zap className="w-7 h-7 text-amber-500" />
                  </div>
                  <p className="text-lg font-semibold text-stone-800 dark:text-stone-200 font-display">
                    Respostas instantaneas
                  </p>
                  <p className="text-sm text-stone-400 dark:text-stone-500 mt-1 max-w-sm">
                    Faca uma pergunta rapida sobre viagens e receba respostas em segundos.
                  </p>
                </div>
              )}

              {fastResponseLoading && (
                <div className="flex items-center justify-center h-full">
                  <KLoader
                    title="Gerando resposta..."
                    subtitle="Usando o modelo de baixa latencia"
                    size="md"
                  />
                </div>
              )}

              {fastResponseError && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 mx-auto max-w-md"
                  role="alert"
                >
                  <div className="flex-1">
                    <p className="font-medium text-sm text-red-600 dark:text-red-400">Algo deu errado</p>
                    <p className="text-xs text-red-500/80 dark:text-red-400/60 mt-0.5">{fastResponseError}</p>
                  </div>
                  <button
                    onClick={() => setFastResponseError(null)}
                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {fastResponseResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 md:p-5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-100 dark:border-stone-700/50 text-sm leading-relaxed prose-travel"
                  dangerouslySetInnerHTML={{ __html: marked.parse(fastResponseResult) as string }}
                />
              )}
            </div>

            {/* Fast response input - KokonutUI style */}
            <div className="px-3 py-3 md:px-5 md:py-4 border-t border-stone-200 dark:border-stone-700/50 bg-white dark:bg-stone-900">
              <div
                className={cn(
                  "relative flex flex-col rounded-2xl border transition-all duration-200",
                  fastFocused
                    ? "border-amber-400 dark:border-amber-500 ring-2 ring-amber-500/20"
                    : "border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/50"
                )}
                onClick={() => fastTextareaRef.current?.focus()}
              >
                <textarea
                  ref={fastTextareaRef}
                  value={fastResponseQuery}
                  placeholder="Faca uma pergunta rapida..."
                  className="w-full resize-none bg-transparent px-4 pt-3 pb-2 text-sm text-stone-800 dark:text-stone-200 placeholder:text-stone-400 dark:placeholder:text-stone-500 border-none outline-none focus:ring-0"
                  onFocus={() => setFastFocused(true)}
                  onBlur={() => setFastFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendFastResponse();
                    }
                  }}
                  onChange={(e) => {
                    setFastResponseQuery(e.target.value);
                    fastAdjustHeight();
                  }}
                  disabled={fastResponseLoading}
                  aria-label="Pergunta rapida"
                />
                <div className="flex items-center justify-end px-3 pb-2">
                  <motion.button
                    onClick={handleSendFastResponse}
                    disabled={fastResponseLoading || !fastResponseQuery.trim()}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                      "rounded-full p-2 transition-all duration-200",
                      fastResponseQuery.trim()
                        ? "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-300 dark:text-stone-600"
                    )}
                    aria-label="Enviar pergunta"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen w-full max-w-2xl mx-auto overflow-hidden bg-white dark:bg-stone-900 shadow-2xl">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-teal-700 to-teal-600 dark:from-teal-800 dark:to-teal-700">
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <ShimmerText
            text={APP_TITLE}
            className="text-lg !text-white [&>span]:!from-white [&>span]:!via-teal-200 [&>span]:!to-white"
          />
          <p className="text-xs text-teal-100/70 mt-0.5">
            Seu assistente inteligente de viagens
          </p>
        </div>
      </header>

      {/* Navigation - SmoothTab */}
      <div className="px-3 py-2 bg-white dark:bg-stone-900 border-b border-stone-100 dark:border-stone-800">
        <SmoothTab
          items={NAV_ITEMS}
          defaultTabId="chat"
          activeColor="bg-teal-600"
          onChange={(tabId) => setAppMode(tabId as AppMode)}
        />
      </div>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={appMode}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
