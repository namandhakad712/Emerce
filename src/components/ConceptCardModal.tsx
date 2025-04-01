import React, { useState } from 'react';
import { ConceptCard as ConceptCardType } from '../services/supabase';
import { Calendar, X, Edit2, Trash2 } from 'lucide-react';
import { useAppContext } from '../context/AppContext';

interface ConceptCardModalProps {
  card: ConceptCardType;
  isOpen: boolean;
  onClose: () => void;
}

const ConceptCardModal: React.FC<ConceptCardModalProps> = ({ card, isOpen, onClose }) => {
  const { deleteConceptCard, updateConceptCard } = useAppContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(card.title);
  const [editedContent, setEditedContent] = useState(card.content);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const handleSave = async () => {
    if (editedTitle.trim() === '' || editedContent.trim() === '') {
      alert('Title and content cannot be empty');
      return;
    }
    
    try {
      await updateConceptCard(card.id, {
        title: editedTitle,
        content: editedContent
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating concept card:', error);
      alert('Failed to update concept card');
    }
  };
  
  const handleDelete = async () => {
    try {
      await deleteConceptCard(card.id);
      onClose();
    } catch (error) {
      console.error('Error deleting concept card:', error);
      alert('Failed to delete concept card');
    }
  };
  
  if (!isOpen) return null;
  
  // Default gradient if none is provided
  const gradient = card.color_gradient || 'from-purple-500 to-indigo-500';
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className={`bg-gradient-to-r ${gradient} px-6 py-5 flex justify-between items-center relative overflow-hidden`}>
          {/* Decorative elements */}
          <div className="absolute -top-6 -right-6 w-16 h-16 bg-white bg-opacity-20 rounded-full"></div>
          <div className="absolute top-10 -left-10 w-24 h-24 bg-white bg-opacity-10 rounded-full"></div>
          
          <h2 className="text-white text-xl font-bold relative z-10">
            {isEditing ? 'Edit Concept Card' : card.title}
          </h2>
          <button 
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-1 transition-all duration-200 relative z-10"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto flex-grow p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  id="content"
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  rows={12}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={`px-3 py-1 bg-gradient-to-r ${gradient} bg-opacity-10 text-sm font-medium text-gray-700 rounded-full shadow-sm`}>
                  {card.category}
                </span>
                <div className="flex items-center text-sm text-gray-500">
                  <Calendar size={16} className="mr-1" />
                  <span>{formatDate(card.created_at)}</span>
                </div>
              </div>
              
              <div className="mt-4 whitespace-pre-wrap text-gray-700 bg-gray-50 p-5 rounded-lg shadow-inner">
                {card.content}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer with actions */}
        <div className="px-6 py-4 bg-gray-50 flex justify-between border-t">
          {isEditing ? (
            <div className="flex space-x-3">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 shadow-sm transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className={`px-4 py-2 bg-gradient-to-r ${gradient} text-white rounded-md hover:opacity-90 shadow-sm transition-all duration-200`}
              >
                Save Changes
              </button>
            </div>
          ) : isDeleting ? (
            <div className="flex space-x-3 w-full">
              <div className="bg-red-50 border border-red-200 rounded-md p-3 flex-grow shadow-inner">
                <p className="text-red-700 font-medium">Are you sure you want to delete this concept card?</p>
                <p className="text-red-600 text-sm mt-1">This action cannot be undone.</p>
                <div className="flex justify-end mt-3 space-x-3">
                  <button
                    onClick={() => setIsDeleting(false)}
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 shadow-sm transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 shadow-sm transition-all duration-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex space-x-3">
              <button
                onClick={() => setIsDeleting(true)}
                className="flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 shadow-sm transition-all duration-200"
              >
                <Trash2 size={18} className="mr-1" />
                Delete
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className={`flex items-center px-4 py-2 bg-gradient-to-r ${gradient} bg-opacity-10 text-gray-700 rounded-md hover:bg-opacity-20 shadow-sm transition-all duration-200`}
              >
                <Edit2 size={18} className="mr-1" />
                Edit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConceptCardModal; 