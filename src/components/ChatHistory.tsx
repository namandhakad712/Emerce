import React, { useState, useRef } from 'react';
import { Edit, Trash2, MessageSquare, AlertCircle } from 'lucide-react';
import * as supabaseService from '../services/supabase';
import { formatDistanceToNow } from 'date-fns';
import { useChatHistory } from '../hooks/useChatHistory';

interface ChatHistoryProps {
  onChatSelected?: () => void; // Optional callback for when a chat is selected (e.g., to close mobile menu)
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ onChatSelected }) => {
  const { 
    chatHistory, 
    currentChatId, 
    isLoading, 
    error,
    loadChatMessages, 
    renameChatConversation, 
    deleteChatConversation,
    createNewChatConversation
  } = useChatHistory();
  
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [newChatTitle, setNewChatTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Handle chat edit submit
  const handleChatRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingChatId && newChatTitle.trim()) {
      const success = await renameChatConversation(editingChatId, newChatTitle.trim());
      if (success) {
        setEditingChatId(null);
        setNewChatTitle('');
      }
    }
  };

  // Start editing a chat title
  const startEditingChat = (chat: supabaseService.Chat) => {
    setEditingChatId(chat.id);
    setNewChatTitle(chat.title);
    // Focus the input after a short delay to allow rendering
    setTimeout(() => {
      editInputRef.current?.focus();
    }, 50);
  };

  // Handle chat deletion with confirmation
  const handleChatDelete = async (chatId: string) => {
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      await deleteChatConversation(chatId);
    }
  };

  // Format date for better readability
  const formatChatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return 'Unknown date';
    }
  };

  const handleSelectChat = async (chatId: string) => {
    const success = await loadChatMessages(chatId);
    if (success && onChatSelected) {
      onChatSelected();
    }
  };

  return (
    <div className="chat-history">
      <div className="p-3">
        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-sm font-medium text-gray-500">Chat History</span>
          <span className="text-xs text-gray-500">{chatHistory.length} chats</span>
        </div>
        
        {error && (
          <div className="mx-4 my-2 p-2 bg-red-50 border border-red-200 rounded-md text-red-600 text-xs flex items-center">
            <AlertCircle className="h-3 w-3 mr-1" />
            {error}
          </div>
        )}
        
        <div className="mt-2 space-y-1">
          {chatHistory.map((chat) => (
            <div key={chat.id} className="px-2">
              {editingChatId === chat.id ? (
                <form onSubmit={handleChatRename} className="flex items-center p-2 bg-gray-50 rounded-md">
                  <input
                    ref={editInputRef}
                    type="text"
                    value={newChatTitle}
                    onChange={(e) => setNewChatTitle(e.target.value)}
                    className="flex-1 px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                    placeholder="Chat title"
                    disabled={isLoading}
                  />
                  <button 
                    type="submit" 
                    className="ml-1 p-1 text-green-600 hover:text-green-800"
                    disabled={isLoading}
                  >
                    Save
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEditingChatId(null)}
                    className="ml-1 p-1 text-gray-500 hover:text-gray-700"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <div 
                  className={`flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition cursor-pointer 
                    ${currentChatId === chat.id ? 'bg-purple-50 border-l-4 border-purple-500' : ''}`}
                  onClick={() => handleSelectChat(chat.id)}
                >
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <MessageSquare className={`h-5 w-5 ${currentChatId === chat.id ? 'text-purple-600' : 'text-gray-400'}`} />
                    <div className="truncate">
                      <div className="font-medium text-sm truncate">{chat.title}</div>
                      <div className="text-xs text-gray-500">{formatChatDate(chat.updated_at)}</div>
                    </div>
                  </div>
                  
                  <div className="flex space-x-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        startEditingChat(chat);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      disabled={isLoading}
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleChatDelete(chat.id);
                      }}
                      className="p-1 text-gray-400 hover:text-red-600"
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ChatHistory; 