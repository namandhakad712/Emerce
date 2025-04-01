import { useState, useEffect, useCallback } from 'react';
import * as supabaseService from '../services/supabase';
import { useAppContext } from '../context/AppContext';

export const useChatHistory = () => {
  const { 
    chatHistory, 
    currentChatId, 
    selectChat, 
    renameChat, 
    deleteChat, 
    createNewChat 
  } = useAppContext();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load chat messages for a specific chat
  const loadChatMessages = useCallback(async (chatId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await selectChat(chatId);
      
      if (!success) {
        setError('Failed to load chat messages');
      }
      
      return success;
    } catch (err) {
      setError('An error occurred while loading chat messages');
      console.error('Error in loadChatMessages:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [selectChat]);
  
  // Rename a chat
  const renameChatConversation = useCallback(async (chatId: string, newTitle: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await renameChat(chatId, newTitle);
      
      if (!success) {
        setError('Failed to rename chat');
      }
      
      return success;
    } catch (err) {
      setError('An error occurred while renaming chat');
      console.error('Error in renameChatConversation:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [renameChat]);
  
  // Delete a chat and its messages
  const deleteChatConversation = useCallback(async (chatId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await deleteChat(chatId);
      
      if (!success) {
        setError('Failed to delete chat');
      }
      
      return success;
    } catch (err) {
      setError('An error occurred while deleting chat');
      console.error('Error in deleteChatConversation:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [deleteChat]);
  
  // Create a new chat
  const createNewChatConversation = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      await createNewChat();
      
      return true;
    } catch (err) {
      setError('An error occurred while creating a new chat');
      console.error('Error in createNewChatConversation:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [createNewChat]);
  
  return {
    chatHistory,
    currentChatId,
    isLoading,
    error,
    loadChatMessages,
    renameChatConversation,
    deleteChatConversation,
    createNewChatConversation
  };
}; 