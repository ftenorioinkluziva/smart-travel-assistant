import React from 'react';
import { ChatMessage } from '../types';
import { marked } from 'marked'; // For rendering markdown
import TypingIndicator from './TypingIndicator'; // Import the new TypingIndicator

interface ChatBubbleProps {
  message: ChatMessage;
}

const ChatBubble: React.FC<ChatBubbleProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const bubbleClasses = isUser
    ? 'bg-indigo-500 text-white self-end rounded-br-none'
    : 'bg-gray-200 text-gray-800 self-start rounded-bl-none';

  const renderContent = () => {
    // Only render markdown for Gemini messages
    if (!isUser) {
      // If streaming and no text has arrived yet, show just the typing indicator
      if (message.isStreaming && !message.text) {
        return <TypingIndicator />;
      } 
      // If streaming and text is present, render the text and then the typing indicator
      else if (message.isStreaming && message.text) {
        return (
          <>
            <div dangerouslySetInnerHTML={{ __html: marked.parse(message.text) }} className="prose prose-sm max-w-none" />
            <TypingIndicator />
          </>
        );
      }
      // If not streaming (final message), just render the markdown
      else {
        return <div dangerouslySetInnerHTML={{ __html: marked.parse(message.text || '') }} className="prose prose-sm max-w-none" />;
      }
    }
    // User messages are plain text and don't stream
    return message.text;
  };

  return (
    <div className={`flex flex-col mb-4 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`relative px-4 py-2 rounded-lg shadow-md ${bubbleClasses} transition-all duration-300 ease-in-out`}
      >
        {renderContent()}
        {/* The TypingIndicator is now managed within renderContent, removing the old streaming span */}
      </div>
      {message.groundingChunks && message.groundingChunks.length > 0 && (
        <div className="mt-1 text-xs text-gray-600">
          <p className="font-semibold">Fontes:</p>
          <ul className="list-disc list-inside">
            {message.groundingChunks.map((chunk, index) => {
              const uri = chunk.web?.uri || chunk.maps?.uri;
              const title = chunk.web?.title || chunk.maps?.title || 'Link';
              if (uri) {
                return (
                  <li key={index}>
                    <a href={uri} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {title}
                    </a>
                  </li>
                );
              }
              return null;
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ChatBubble;