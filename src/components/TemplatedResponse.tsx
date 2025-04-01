import React from 'react';
import ReactMarkdown from 'react-markdown';
import ConceptCardStatus from './ConceptCardStatus';

interface TemplatedResponseProps {
  content: string;
  conceptCardStatus: 'pending' | 'generating' | 'success' | 'failed' | 'none';
  userMessage?: string; // Optional original user message for context
}

/**
 * A component that renders AI responses with special styling for study-related content
 * and shows concept card generation status for educational templates
 */
const TemplatedResponse: React.FC<TemplatedResponseProps> = ({ 
  content, 
  conceptCardStatus,
  userMessage = ''
}) => {
  // Check if this looks like a study question response
  const isStudyResponse = (
    // Study content usually has headings or code blocks
    (content.includes('##') || content.includes('```')) &&
    
    // And contains educational keywords
    (content.toLowerCase().includes('concept') ||
     content.toLowerCase().includes('formula') ||
     content.toLowerCase().includes('equation') ||
     content.toLowerCase().includes('theory') ||
     content.toLowerCase().includes('principle') ||
     content.toLowerCase().includes('definition') ||
     content.toLowerCase().includes('explanation') ||
     content.toLowerCase().includes('solution') ||
     content.toLowerCase().includes('function') ||
     content.toLowerCase().includes('analysis') ||
     content.toLowerCase().includes('introduction to') ||
     content.toLowerCase().includes('properties of') ||
     // Math/code blocks that aren't just JSON/data
     (content.includes('```') && 
      !content.includes('```json') && 
      !content.includes('```html')))
  );
  
  // Only show special styling for study content
  if (!isStudyResponse) {
    return (
      <div className="markdown-content">
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    );
  }
  
  // For study responses, use neumorphic styling and show concept card status
  return (
    <div className="study-response">
      {/* Neumorphic styled container for study content */}
      <div className="bg-gray-50 rounded-xl p-4 shadow-[inset_0_2px_4px_rgba(0,0,0,0.06),_0_2px_2px_rgba(255,255,255,0.5)]">
        <div className="markdown-content">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
        
        {/* Decorative gradient bar */}
        <div className="h-1 w-full bg-gradient-to-r from-purple-400 via-indigo-500 to-blue-500 rounded-full mt-3 mb-1"></div>
        
        {/* Always show concept card status for study content */}
        {conceptCardStatus !== 'none' && <ConceptCardStatus status={conceptCardStatus} />}
      </div>
    </div>
  );
};

export default TemplatedResponse; 