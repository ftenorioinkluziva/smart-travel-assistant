import React from 'react';

interface FeaturePanelProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const FeaturePanel: React.FC<FeaturePanelProps> = ({ title, description, children }) => {
  return (
    <div className="flex flex-col h-full bg-white rounded-lg">
      <div className="p-4 md:p-6 border-b border-gray-200">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-800">{title}</h2>
        <p className="mt-1 text-gray-600">{description}</p>
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default FeaturePanel;