import React from 'react';

const Loader: React.FC = () => {
  return (
    <div className="flex justify-center items-center py-4">
      <div
        className="animate-spin rounded-full h-8 w-8 border-2 border-t-transparent"
        style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-primary)' }}
        role="status"
      >
        <span className="sr-only">Carregando...</span>
      </div>
    </div>
  );
};

export default Loader;
