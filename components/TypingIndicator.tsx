import React from 'react';

/**
 * A subtle, bouncing three-dot typing animation.
 * Used to indicate that the AI is generating a response in real-time.
 */
const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-center space-x-1 pt-1" aria-label="A inteligência artificial está digitando">
      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s', animationDuration: '1.2s' }}></span>
      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s', animationDuration: '1.2s' }}></span>
      <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s', animationDuration: '1.2s' }}></span>
    </div>
  );
};

export default TypingIndicator;