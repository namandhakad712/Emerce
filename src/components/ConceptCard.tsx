import React, { useState } from 'react';
import { Calendar, BookOpen, MoreVertical, Eye, Edit, Trash } from 'lucide-react';
import { ConceptCard as ConceptCardType } from '../services/supabase';
import ConceptCardModal from './ConceptCardModal';
import { useAppContext } from '../context/AppContext';

interface ConceptCardProps {
  card: ConceptCardType;
}

const ConceptCard: React.FC<ConceptCardProps> = ({ card }) => {
  const { updateConceptCard, deleteConceptCard } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };
  
  // Default gradient if none is provided
  const gradient = card.color_gradient || 'from-indigo-500 to-purple-600';
  
  // Handle card deletion
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(false);
    
    // Confirm before deleting
    if (window.confirm('Are you sure you want to delete this concept card?')) {
      deleteConceptCard(card.id!);
    }
  };
  
  // Toggle the menu
  const toggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
  };
  
  return (
    <>
      <div 
        className="group relative rounded-xl overflow-hidden backdrop-blur-sm bg-white/90 shadow-md border border-gray-100 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
        onClick={() => setIsModalOpen(true)}
      >
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient} opacity-10 group-hover:opacity-20 transition-opacity duration-300`} />
        <div className={`h-2 bg-gradient-to-r ${gradient} w-full`} />
        
        <div className="p-5 relative z-10">
          <div className="flex justify-between items-start mb-3">
            <h3 className="text-lg font-bold text-gray-800 line-clamp-1 group-hover:text-indigo-700 transition-colors">{card.title}</h3>
            
            <div className="relative">
              <button 
                className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                onClick={toggleMenu}
              >
                <MoreVertical className="h-5 w-5 text-gray-500" />
              </button>
              
              {showMenu && (
                <div 
                  className="absolute right-0 mt-1 w-36 bg-white rounded-md shadow-lg border border-gray-200 z-20 animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button 
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                    onClick={() => {
                      setIsModalOpen(true);
                      setShowMenu(false);
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Card
                  </button>
                  <button 
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                    onClick={handleDelete}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium shadow-sm mb-3 bg-gradient-to-r ${gradient} text-white`}>
            {card.category}
          </span>

          <p className="text-gray-600 text-sm mb-4 line-clamp-3 group-hover:text-gray-800 transition-colors">
            {card.content}
          </p>

          <div className="flex items-center text-xs text-gray-500">
            <Calendar size={14} className="mr-1" />
            <span>{formatDate(card.created_at)}</span>
          </div>
          
          <div className="absolute bottom-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <BookOpen className="h-5 w-5 text-indigo-400" />
          </div>
        </div>
      </div>
      
      {/* Modal for viewing and editing the concept card */}
      {isModalOpen && (
        <ConceptCardModal
          card={card}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  );
};

export default ConceptCard; 