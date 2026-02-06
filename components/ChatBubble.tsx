import React, { useMemo } from 'react';
import { ChatMessage } from '../types';
import { marked } from 'marked';
import TypingIndicator from './TypingIndicator';

// Configure marked for synchronous operation
marked.setOptions({ async: false });

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  const bubbleStyle: React.CSSProperties = isUser
    ? {
        backgroundColor: 'var(--color-user-bubble)',
        color: 'var(--color-text-inverse)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-sm) var(--radius-lg)',
      }
    : {
        backgroundColor: 'var(--color-ai-bubble)',
        color: 'var(--color-text)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) var(--radius-lg) var(--radius-sm)',
      };

  const parsedHtml = useMemo(() => {
    if (!isUser && message.text) {
      return marked.parse(message.text) as string;
    }
    return '';
  }, [isUser, message.text]);

  const renderContent = () => {
    if (!isUser) {
      if (message.isStreaming && !message.text) {
        return <TypingIndicator />;
      } else if (message.isStreaming && message.text) {
        return (
          <>
            <div
              dangerouslySetInnerHTML={{ __html: parsedHtml }}
              className="prose-travel"
            />
            <TypingIndicator />
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
    return <span style={{ lineHeight: '1.6' }}>{message.text}</span>;
  };

  return (
    <div
      className={`flex flex-col mb-3 max-w-[85%] md:max-w-[75%] ${
        isUser ? 'items-end ml-auto' : 'items-start mr-auto'
      }`}
    >
      {!isUser && (
        <span
          className="text-xs font-medium mb-1 ml-1"
          style={{ color: 'var(--color-primary)' }}
        >
          Assistente
        </span>
      )}
      <div
        className="px-4 py-3 text-sm leading-relaxed"
        style={{
          ...bubbleStyle,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {renderContent()}
      </div>
      {message.groundingChunks && message.groundingChunks.length > 0 && (
        <div className="mt-2 ml-1">
          <p
            className="text-xs font-semibold mb-1"
            style={{ color: 'var(--color-text-muted)' }}
          >
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
                    className="inline-flex items-center text-xs px-2 py-1 rounded-full transition-colors duration-150"
                    style={{
                      backgroundColor: 'var(--color-bg-subtle)',
                      color: 'var(--color-primary)',
                      border: '1px solid var(--color-border-light)',
                    }}
                  >
                    {title}
                  </a>
                );
              }
              return null;
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBubble;
