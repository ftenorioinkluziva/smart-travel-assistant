import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chat } from '@google/genai';
import { sendSearchQuery, sendMapsQuery, createChatSession, sendMessageToChatStream, sendFastResponse } from './services/geminiService';
import { ChatMessage, GeolocationPosition, AppMode } from './types';
import { APP_TITLE, GEOLOCATION_ERROR_MESSAGES, CHAT_HISTORY_STORAGE_KEY } from './constants';
import Button from './components/Button';
import ChatInterface from './components/ChatInterface';
import FeaturePanel from './components/FeaturePanel';
import Icon from './components/Icon';

const NAV_ITEMS: { mode: AppMode; label: string; icon: string; description: string }[] = [
  { mode: 'chat', label: 'Chat', icon: 'voice_chat', description: 'Converse com IA' },
  { mode: 'search', label: 'Pesquisa', icon: 'google', description: 'Busca na web' },
  { mode: 'maps', label: 'Mapas', icon: 'google_pin', description: 'Locais e rotas' },
  { mode: 'fast-response', label: 'Rapido', icon: 'bolt', description: 'Respostas instantaneas' },
];

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('chat');
  const [geolocation, setGeolocation] = useState<GeolocationPosition | null>(null);
  const [geolocationError, setGeolocationError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatSessionRef = useRef<Chat | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [mapsQuery, setMapsQuery] = useState('');
  const [mapsResults, setMapsResults] = useState<ChatMessage[]>([]);
  const [mapsLoading, setMapsLoading] = useState(false);
  const [mapsError, setMapsError] = useState<string | null>(null);

  const [fastResponseQuery, setFastResponseQuery] = useState('');
  const [fastResponseResult, setFastResponseResult] = useState<string>('');
  const [fastResponseLoading, setFastResponseLoading] = useState(false);
  const [fastResponseError, setFastResponseError] = useState<string | null>(null);

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
      console.error("Failed to load chat history:", e);
      localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(chatMessages));
    } catch (e) {
      console.error("Failed to save chat history:", e);
    }
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
      } else {
        alert("Nenhum historico de chat encontrado.");
      }
    } catch (e) {
      alert("Erro ao carregar o historico de chat.");
    }
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

  const handleSendSearchQuery = useCallback(async () => {
    if (!searchQuery.trim()) return;
    const userMessageId = `user-search-${Date.now()}`;
    setSearchResults((prev) => [...prev, { id: userMessageId, sender: 'user', text: searchQuery }]);
    setSearchLoading(true);
    setSearchError(null);
    try {
      const response = await sendSearchQuery(searchQuery);
      setSearchResults((prev) => [...prev, { id: `gemini-search-${Date.now()}`, sender: 'gemini', text: response.text, groundingChunks: response.groundingChunks }]);
    } catch (e: any) {
      setSearchError(e.message || "Falha na pesquisa.");
      setSearchResults((prev) => [...prev, { id: `error-search-${Date.now()}`, sender: 'gemini', text: `Erro: ${e.message}` }]);
    } finally {
      setSearchLoading(false);
      setSearchQuery('');
    }
  }, [searchQuery]);

  const handleSendMapsQuery = useCallback(async () => {
    if (!mapsQuery.trim()) return;
    if (!geolocation && !geolocationError) { setMapsError("Obtendo sua localizacao..."); return; }
    if (geolocationError) { setMapsError(geolocationError); return; }
    const userMessageId = `user-maps-${Date.now()}`;
    setMapsResults((prev) => [...prev, { id: userMessageId, sender: 'user', text: mapsQuery }]);
    setMapsLoading(true);
    setMapsError(null);
    try {
      const response = await sendMapsQuery(mapsQuery, geolocation || undefined);
      setMapsResults((prev) => [...prev, { id: `gemini-maps-${Date.now()}`, sender: 'gemini', text: response.text, groundingChunks: response.groundingChunks }]);
    } catch (e: any) {
      setMapsError(e.message || "Falha na consulta de mapas.");
      setMapsResults((prev) => [...prev, { id: `error-maps-${Date.now()}`, sender: 'gemini', text: `Erro: ${e.message}` }]);
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
      setFastResponseError(e.message || "Falha na resposta rapida.");
    } finally {
      setFastResponseLoading(false);
      setFastResponseQuery('');
    }
  }, [fastResponseQuery]);

  const renderContent = () => {
    switch (appMode) {
      case 'chat':
        return (
          <FeaturePanel title="Chatbot IA" description="Converse com o assistente para planejar suas ferias.">
            <div className="flex items-center gap-2 px-5 py-2 md:px-6" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
              <button
                onClick={handleLoadChatHistory}
                disabled={chatLoading}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors focus-ring"
                style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-subtle)' }}
              >
                <Icon name="history" className="w-3.5 h-3.5" />
                Historico
              </button>
              <button
                onClick={handleClearChatHistory}
                disabled={chatLoading}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-colors focus-ring"
                style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-subtle)' }}
              >
                <Icon name="clear" className="w-3.5 h-3.5" />
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
          </FeaturePanel>
        );
      case 'search':
        return (
          <FeaturePanel title="Pesquisa Web" description="Informacoes atualizadas da web para sua viagem.">
            <ChatInterface
              messages={searchResults}
              onSendMessage={(msg) => { setSearchQuery(msg); handleSendSearchQuery(); }}
              loading={searchLoading}
              errorMessage={searchError}
              placeholder="Pesquise sobre eventos, noticias de viagem..."
              onClearParentError={() => setSearchError(null)}
            />
          </FeaturePanel>
        );
      case 'maps':
        return (
          <FeaturePanel title="Mapas e Locais" description="Encontre lugares e informacoes do seu destino.">
            <ChatInterface
              messages={mapsResults}
              onSendMessage={(msg) => { setMapsQuery(msg); handleSendMapsQuery(); }}
              loading={mapsLoading}
              errorMessage={mapsError || geolocationError}
              placeholder="Encontre restaurantes, hoteis ou pontos turisticos."
              onClearParentError={() => { setMapsError(null); setGeolocationError(null); }}
            />
          </FeaturePanel>
        );
      case 'fast-response':
        return (
          <FeaturePanel title="Respostas Rapidas" description="Sugestoes e informacoes com baixa latencia.">
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6 md:py-5 custom-scrollbar">
                {!fastResponseResult && !fastResponseLoading && !fastResponseError && (
                  <div className="flex flex-col items-center justify-center h-full text-center px-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                      style={{ backgroundColor: 'var(--color-bg-subtle)' }}
                    >
                      <Icon name="bolt" className="w-8 h-8" style={{ color: 'var(--color-accent)' } as any} />
                    </div>
                    <p
                      className="text-lg font-semibold mb-1"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
                    >
                      Respostas instantaneas
                    </p>
                    <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
                      Faca uma pergunta rapida sobre viagens e receba respostas em segundos.
                    </p>
                  </div>
                )}
                {fastResponseLoading && (
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <div
                        className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
                        style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }}
                      />
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Gerando resposta...</p>
                    </div>
                  </div>
                )}
                {fastResponseError && (
                  <div
                    className="flex flex-col items-center p-4 rounded-lg mx-auto max-w-md"
                    style={{ backgroundColor: 'var(--color-error-bg)', border: '1px solid var(--color-error-border)' }}
                  >
                    <p className="font-medium text-sm mb-1" style={{ color: 'var(--color-error)' }}>Algo deu errado</p>
                    <p className="text-xs mb-3 text-center" style={{ color: 'var(--color-text-secondary)' }}>{fastResponseError}</p>
                    <Button onClick={() => setFastResponseError(null)} variant="outline" size="sm">Limpar Erro</Button>
                  </div>
                )}
                {fastResponseResult && (
                  <div
                    className="p-4 md:p-5 rounded-lg text-sm leading-relaxed prose-travel"
                    style={{ backgroundColor: 'var(--color-bg-subtle)', border: '1px solid var(--color-border-light)' }}
                    dangerouslySetInnerHTML={{ __html: fastResponseResult }}
                  />
                )}
              </div>
              <div
                className="px-4 py-3 md:px-6 md:py-4"
                style={{ borderTop: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-bg-card)' }}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    className="flex-1 h-10 px-4 text-sm rounded-full border focus-ring"
                    style={{ backgroundColor: 'var(--color-bg-subtle)', borderColor: 'var(--color-border-light)', color: 'var(--color-text)' }}
                    placeholder="Faca uma pergunta rapida..."
                    value={fastResponseQuery}
                    onChange={(e) => setFastResponseQuery(e.target.value)}
                    onKeyPress={(e) => { if (e.key === 'Enter') handleSendFastResponse(); }}
                    disabled={fastResponseLoading}
                    aria-label="Pergunta rapida"
                  />
                  <button
                    onClick={handleSendFastResponse}
                    disabled={fastResponseLoading || !fastResponseQuery.trim()}
                    aria-label="Enviar pergunta"
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 focus-ring"
                    style={{
                      backgroundColor: fastResponseQuery.trim() ? 'var(--color-accent)' : 'var(--color-bg-muted)',
                      color: fastResponseQuery.trim() ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    <Icon name="send" className="w-5 h-5" />
                  </button>
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
    <div
      className="flex flex-col h-screen w-full max-w-2xl mx-auto overflow-hidden"
      style={{
        backgroundColor: 'var(--color-bg-card)',
        boxShadow: 'var(--shadow-xl)',
      }}
    >
      {/* Header */}
      <header
        className="flex items-center gap-3 px-5 py-4 md:px-6 flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-primary-dark)',
          color: 'var(--color-text-inverse)',
        }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <Icon name="travel" className="w-5 h-5" />
        </div>
        <div>
          <h1
            className="text-lg font-bold leading-tight"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {APP_TITLE}
          </h1>
          <p className="text-xs opacity-70">Seu assistente inteligente de viagens</p>
        </div>
      </header>

      {/* Navigation */}
      <nav
        className="flex flex-shrink-0"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderBottom: '1px solid var(--color-border-light)',
        }}
        role="tablist"
        aria-label="Modos do aplicativo"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = appMode === item.mode;
          return (
            <button
              key={item.mode}
              onClick={() => setAppMode(item.mode)}
              role="tab"
              aria-selected={isActive}
              className="flex-1 flex flex-col items-center gap-0.5 py-3 md:py-3.5 transition-all duration-200 relative focus-ring"
              style={{
                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                backgroundColor: 'transparent',
                borderRadius: 0,
              }}
            >
              <Icon name={item.icon} className="w-5 h-5" />
              <span className="text-xs font-medium">{item.label}</span>
              {/* Active indicator */}
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full transition-all duration-200"
                style={{
                  width: isActive ? '60%' : '0%',
                  backgroundColor: 'var(--color-primary)',
                }}
              />
            </button>
          );
        })}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
