import React from 'react';

interface FeaturePanelProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const FeaturePanel: React.FC<FeaturePanelProps> = ({ title, description, children }) => {
  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--color-bg-card)' }}>
      <div
        className="px-5 py-4 md:px-6 md:py-5"
        style={{ borderBottom: '1px solid var(--color-border-light)' }}
      >
        <h2
          className="text-lg md:text-xl font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          {title}
        </h2>
        <p
          className="mt-0.5 text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {description}
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default FeaturePanel;
