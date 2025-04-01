import React from 'react';

type ConceptCardStatusProps = {
  status: 'pending' | 'generating' | 'success' | 'failed' | 'none';
};

/**
 * A component to display the status of concept card generation
 * using colored dots and a simple label
 */
const ConceptCardStatus: React.FC<ConceptCardStatusProps> = ({ status }) => {
  // Don't render anything if status is none
  if (status === 'none') return null;
  
  // Define status colors and labels
  const statusConfig = {
    pending: {
      color: 'bg-yellow-400',
      label: 'Analyzing for concept card',
      animate: true
    },
    generating: {
      color: 'bg-blue-500',
      label: 'Generating concept card',
      animate: true
    },
    success: {
      color: 'bg-green-500',
      label: 'Concept card created',
      animate: false
    },
    failed: {
      color: 'bg-red-500',
      label: 'Concept card failed',
      animate: false
    }
  };
  
  const config = statusConfig[status];
  
  return (
    <div className="mt-2 flex items-center px-2 py-1 bg-gray-50 rounded-xl shadow-inner">
      <div 
        className={`h-2.5 w-2.5 rounded-full mr-2 ${config.color} ${
          config.animate ? 'animate-pulse' : ''
        }`}
      />
      <span className="text-xs text-gray-600 font-medium">{config.label}</span>
    </div>
  );
};

export default ConceptCardStatus; 