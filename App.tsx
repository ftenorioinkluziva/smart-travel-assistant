import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from '@google/genai';
import { sendSearchQuery, sendMapsQuery, createChatSession, sendMessageToChatStream, sendFastResponse } from './services/geminiService';
import { ChatMessage, GeolocationPosition, AppMode } from './types';
import { APP_TITLE, APP_DESCRIPTION, GEOLOCATION_ERROR_MESSAGES, CHAT_HISTORY_STORAGE_KEY } from './constants';
import Button from './components/Button';
import ChatInterface from './components/ChatInterface';
import FeaturePanel from './components/FeaturePanel';
import Icon from './components/Icon';

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('chat');
  const [geolocation, setGeolocation] = useState<GeolocationPosition | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  // Chatbot state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  // Search grounding state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Maps grounding state
  const [mapsQuery, setMapsQuery] = useState('');
  const [mapsResults, setMapsResults] = useState<ChatMessage[]>([]);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  // Fast response state
  const [fastResponseQuery, setFastResponseQuery] = useState('');
  const [fastResponseResult, setFastResponseResult] = useState<string>('');
  const [fastResponseLoading, setFastResponseLoading] = useState(false);
  const [fastResponseError, setFastResponseError] = useState<string | null>(null);


  // Initialize chat session on component mount
  useEffect(() => {
    chatSessionRef.current = createChatSession();
  }, []);

  // Load chat history from localStorage on initial mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
      if (storedHistory) {
        const parsedHistory: ChatMessage[] = JSON.parse(storedHistory);
        setChatMessages(parsedHistory);
      }
    } catch (e) {
      console.error("Failed to load chat history from localStorage:", e);
      // Optionally clear corrupted history
      localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    }
  }, []);

  // Save chat history to localStorage whenever chatMessages changes
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch (e) {
      console.error("Failed to save chat history to localStorage:", e);
    }
  }, [chatMessages]);

  // Request geolocation permission
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGeolocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setGeolocationError(null);
        },
        (error) => {
          let msg: string;
          switch (error.code) {
            case error.PERMISSION_DENIED:
              msg = GEOLOCATION_ERROR_MESSAGES.PERMISSION_DENIED;
              break;
            case error.POSITION_UNAVAILABLE:
              msg = GEOLOCATION_ERROR_MESSAGES.POSITION_UNAVAILABLE;
              break;
            case error.TIMEOUT:
              msg = GEOLOCATION_ERROR_MESSAGES.TIMEOUT;
              break;
            default:
              msg = GEOLOCATION_ERROR_MESSAGES.UNKNOWN_ERROR;
              break;
          }
          console.error("Geolocation error:", error);
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
        const parsedHistory: ChatMessage[] = JSON.parse(storedHistory);
        setChatMessages(parsedHistory);
      } else {
        alert("Nenhum histórico de chat encontrado.");
      }
    } catch (e) {
      console.error("Failed to load chat history manually:", e);
      alert("Erro ao carregar o histórico de chat. Pode estar corrompido.");
    }
  }, []);

  const handleSendChatMessage = useCallback(async (message: string) => {
    if (!chatSessionRef.current) return;

    const userMessageId = `user-${Date.now()}`;
    setChatMessages((prev) => [...prev, { id: userMessageId, sender: 'user', text: message }]);
    setChatLoading(true);
    setChatError(null);

    const geminiMessageId = `gemini-${Date.now()}`;
    setChatMessages((prev) => [
      ...prev,
      { id: geminiMessageId, sender: 'gemini', text: '', isStreaming: true },
    ]);

    try {
      await sendMessageToChatStream(
        chatSessionRef.current,
        message,
        (textChunk) => {
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === geminiMessageId ? { ...msg, text: textChunk } : msg
            )
          );
        },
        (groundingChunks) => {
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === geminiMessageId ? { ...msg, isStreaming: false, groundingChunks: groundingChunks } : msg
            )
          );
        },
        (error) => {
          setChatError(error);
          setChatMessages((prev) =>
            prev.map((msg) =>
              msg.id === geminiMessageId ? { ...msg, isStreaming: false, text: `Erro: ${error}` } : msg
            )
          );
        }
      );
    } catch (e: any) {
      setChatError(e.message || "An unexpected error occurred during chat.");
      setChatMessages((prev) =>
        prev.map((msg) =>
          msg.id === geminiMessageId ? { ...msg, isStreaming: false, text: `Erro: ${e.message || "Erro desconhecido"}` } : msg
        )
      );
    } finally {
      setChatLoading(false);
    }
  }, []);

  const handleSendSearchQuery = useCallback(async () => {
    if (!searchQuery.trim()) return;

    const userMessageId = `user-search-${Date.now()}`;
    setSearchResults((prev) => [...prev, { id: userMessageId, sender: 'user', text: searchQuery }]);
    setSearchLoading(true);
    setSearchError(null);

    try {
      const response = await sendSearchQuery(searchQuery);
      const geminiMessageId = `gemini-search-${Date.now()}`;
      setSearchResults((prev) => [
        ...prev,
        { id: geminiMessageId, sender: 'gemini', text: response.text, groundingChunks: response.groundingChunks },
      ]);
    } catch (e: any) {
      setSearchError(e.message || "Failed to fetch search results.");
      const errorMsgId = `error-search-${Date.now()}`;
      setSearchResults((prev) => [...prev, { id: errorMsgId, sender: 'gemini', text: `Erro: ${e.message || "Erro desconhecido"}` }]);
    } finally {
      setSearchLoading(false);
      setSearchQuery('');
    }
  }, [searchQuery]);

  const handleSendMapsQuery = useCallback(async () => {
    if (!mapsQuery.trim()) return;

    if (!geolocation && !geolocationError) {
      setMapsError("Obtendo sua localização, por favor, aguarde...");
      return;
    }

    if (geolocationError) {
      setMapsError(geolocationError);
      return;
    }

    const userMessageId = `user-maps-${Date.now()}`;
    setMapsResults((prev) => [...prev, { id: userMessageId, sender: 'user', text: mapsQuery }]);
    setMapsLoading(true);
    setMapsError(null);

    try {
      const response = await sendMapsQuery(mapsQuery, geolocation || undefined);
      const geminiMessageId = `gemini-maps-${Date.now()}`;
      setMapsResults((prev) => [
        ...prev,
        { id: geminiMessageId, sender: 'gemini', text: response.text, groundingChunks: response.groundingChunks },
      ]);
    } catch (e: any) {
      setMapsError(e.message || "Failed to fetch map information.");
      const errorMsgId = `error-maps-${Date.now()}`;
      setMapsResults((prev) => [...prev, { id: errorMsgId, sender: 'gemini', text: `Erro: ${e.message || "Erro desconhecido"}` }]);
    } finally {
      setMapsLoading(false);
      setMapsQuery('');
    }
  }, [mapsQuery, geolocation, geolocationError]);

  const handleSendFastResponse = useCallback(async () => {
    if (!fastResponseQuery.trim()) return;

    setFastResponseResult('');
    setFastResponseLoading(true);
    setFastResponseError(null);

    try {
      const response = await sendFastResponse(fastResponseQuery);
      setFastResponseResult(response);
    } catch (e: any) {
      setFastResponseError(e.message || "Failed to get fast response.");
    } finally {
      setFastResponseLoading(false);
      setFastResponseQuery('');
    }
  }, [fastResponseQuery]);

  const renderContent = () => {
    switch (appMode) {
      case 'chat':
        return (
          <FeaturePanel
            title="Chatbot AI"
            description="Converse com o Gemini para planejar suas férias."
          >
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button
                variant="outline"
                onClick={handleLoadChatHistory}
                disabled={chatLoading}
                size="sm"
              >
                Carregar Histórico
              </Button>
              <Button
                variant="secondary"
                onClick={handleClearChatHistory}
                disabled={chatLoading}
                size="sm"
              >
                Limpar Histórico
              </Button>
            </div>
            <ChatInterface
              messages={chatMessages}
              onSendMessage={handleSendChatMessage}
              loading={chatLoading}
              errorMessage={chatError}
              placeholder="Pergunte sobre destinos, atividades, etc."
              onClearParentError={() => setChatError(null)} // Pass callback to clear chatError
            />
          </FeaturePanel>
        );
      case 'search':
        return (
          <FeaturePanel
            title="Pesquisa Google"
            description="Obtenha informações atualizadas da web para sua viagem."
          >
            <ChatInterface
              messages={searchResults}
              onSendMessage={(msg) => { setSearchQuery(msg); handleSendSearchQuery(); }}
              loading={searchLoading}
              errorMessage={searchError}
              placeholder="Pesquise sobre eventos recentes, notícias de viagem..."
              onClearParentError={() => setSearchError(null)}
            />
          </FeaturePanel>
        );
      case 'maps':
        return (
          <FeaturePanel
            title="Mapas Google"
            description="Encontre lugares e informações geográficas para seu destino."
          >
            <ChatInterface
              messages={mapsResults}
              onSendMessage={(msg) => { setMapsQuery(msg); handleSendMapsQuery(); }}
              loading={mapsLoading}
              errorMessage={mapsError || geolocationError}
              placeholder="Encontre restaurantes, hotéis ou pontos turísticos próximos."
              onClearParentError={() => { setMapsError(null); setGeolocationError(null); }} // Clear both maps and geolocation errors
            />
            {geolocationError && (
              <div className="p-4 bg-red-100 text-red-700 border border-red-200 rounded-md m-4">
                {geolocationError}
              </div>
            )}
          </FeaturePanel>
        );
      case 'fast-response':
        return (
          <FeaturePanel
            title="Respostas Rápidas"
            description="Obtenha sugestões e informações rápidas com baixa latência."
          >
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                {fastResponseQuery && (
                  <div className="mb-4">
                    <p className="text-lg font-medium">Sua consulta:</p>
                    <p className="p-2 bg-gray-100 rounded-md text-gray-800">{fastResponseQuery}</p>
                  </div>
                )}
                <div className="mb-4">
                  <p className="text-lg font-medium">
                    Resposta Rápida:
                    {fastResponseLoading && (
                      <svg
                        className="animate-spin h-5 w-5 text-indigo-600 inline-block ml-2"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                    )}
                  </p>
                  {fastResponseError && (
                    <div className="flex flex-col items-start mt-2 p-3 bg-red-100 border border-red-200 text-red-700 rounded-md">
                      <p className="font-semibold mb-2">Ops! Algo deu errado:</p>
                      <p className="text-sm mb-3">{fastResponseError}</p>
                      <Button onClick={() => setFastResponseError(null)} variant="outline" size="sm" className="bg-red-50 text-red-700 border-red-300 hover:bg-red-100">
                        Limpar Erro
                      </Button>
                    </div>
                  )}
                  {fastResponseResult && <p className="p-2 bg-blue-50 rounded-md text-gray-800">{fastResponseResult}</p>}
                </div>
              </div>
              <div className="p-4 md:p-6 border-t border-gray-200 sticky bottom-0 bg-white">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Faça uma pergunta rápida..."
                    value={fastResponseQuery}
                    onChange={(e) => setFastResponseQuery(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSendFastResponse(); }}
                    disabled={fastResponseLoading}
                  />
                  <Button onClick={handleSendFastResponse} loading={fastResponseLoading} disabled={fastResponseLoading} size="md">
                    Obter Resposta
                  </Button>
                </div>
              </div>
            </div>
          </FeaturePanel>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen md:h-[90vh] lg:h-[80vh] w-full max-w-4xl bg-white rounded-lg shadow-xl overflow-hidden">
      <header className="p-4 md:p-6 bg-indigo-700 text-white flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Icon name="travel" className="w-8 h-8" />
          <h1 className="text-2xl md:text-3xl font-extrabold">{APP_TITLE}</h1>
        </div>
      </header>

      <nav className="flex bg-indigo-600 text-white border-b border-indigo-700 overflow-x-auto sticky top-0 z-10">
        <Button
          variant={appMode === 'chat' ? 'secondary' : 'ghost'}
          onClick={() => setAppMode('chat')}
          className="flex-1 min-w-[120px] rounded-none py-3 md:py-4 border-r border-indigo-500 text-white hover:bg-indigo-500 focus:ring-offset-indigo-600"
        >
          <div className="flex flex-col items-center">
            <Icon name="voice_chat" className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-xs md:text-sm mt-1">Chatbot AI</span>
          </div>
        </Button>
        <Button
          variant={appMode === 'search' ? 'secondary' : 'ghost'}
          onClick={() => setAppMode('search')}
          className="flex-1 min-w-[120px] rounded-none py-3 md:py-4 border-r border-indigo-500 text-white hover:bg-indigo-500 focus:ring-offset-indigo-600"
        >
          <div className="flex flex-col items-center">
            <Icon name="google" className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-xs md:text-sm mt-1">Pesquisa</span>
          </div>
        </Button>
        <Button
          variant={appMode === 'maps' ? 'secondary' : 'ghost'}
          onClick={() => setAppMode('maps')}
          className="flex-1 min-w-[120px] rounded-none py-3 md:py-4 border-r border-indigo-500 text-white hover:bg-indigo-500 focus:ring-offset-indigo-600"
        >
          <div className="flex flex-col items-center">
            <Icon name="google_pin" className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-xs md:text-sm mt-1">Mapas</span>
          </div>
        </Button>
        <Button
          variant={appMode === 'fast-response' ? 'secondary' : 'ghost'}
          onClick={() => setAppMode('fast-response')}
          className="flex-1 min-w-[120px] rounded-none py-3 md:py-4 text-white hover:bg-indigo-500 focus:ring-offset-indigo-600"
        >
          <div className="flex flex-col items-center">
            <Icon name="bolt" className="w-5 h-5 md:w-6 md:h-6" />
            <span className="text-xs md:text-sm mt-1">Rápido</span>
          </div>
        </Button>
      </nav>

      <main className="flex-1 overflow-hidden">{renderContent()}</main>
    </div>
  );
};

export default App;