import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Check if we should use mock data (if Supabase URL is not properly configured)
const useMockData = import.meta.env.VITE_SUPABASE_URL === 'your-project-url.supabase.co' ||
                    !import.meta.env.VITE_SUPABASE_URL;

console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Using mock data:', useMockData);

// Create Supabase client
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_KEY || ''
);

// Mock data storage
const mockStorage = {
  chats: [],
  messages: [],
  conceptCards: [],
  todos: [
    {
      id: '1',
      title: 'Complete physics assignment',
      completed: false,
      priority: 'high',
      due_date: new Date(Date.now() + 86400000).toISOString(), // tomorrow
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Review chemistry notes',
      completed: true,
      priority: 'medium',
      due_date: new Date(Date.now() - 86400000).toISOString(), // yesterday
      created_at: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    },
    {
      id: '3',
      title: 'Research biology project',
      completed: false,
      priority: 'low',
      due_date: null,
      created_at: new Date(Date.now() - 259200000).toISOString() // 3 days ago
    }
  ]
};

export type ConceptCard = {
  id?: string;
  title: string;
  content: string;
  category: 'Physics' | 'Chemistry' | 'Biology' | 'Other';
  created_at?: string;
  color_gradient?: string;
};

export type ChatMessage = {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  chat_id: string;
  created_at?: string;
  attachments?: string[];
};

export type Chat = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  model: string;
};

export type Todo = {
  id: string;
  title: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  due_date?: string | null;
  created_at: string;
};

// Chats
export const getChats = async () => {
  try {
    console.log('========= GETTING CHAT HISTORY ==========');
    
    // FORCE DATABASE MODE: Always use real database for getting chats
    const forceDatabaseMode = true; // Set to true to bypass mock storage
    
    if (useMockData && !forceDatabaseMode) {
      console.log('Using mock storage for chats');
      console.log(`Found ${mockStorage.chats.length} mock chats`);
      return mockStorage.chats;
    }
    
    console.log('Querying Supabase for chats');
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Supabase error fetching chats:', error);
      console.error('Error details:', JSON.stringify(error));
      return [];
    }
    
    console.log(`Found ${data?.length || 0} chats in database`);
    if (data && data.length > 0) {
      console.log('Chats:', data.map(c => ({
        id: c.id,
        title: c.title,
        updated_at: c.updated_at
      })));
    }
    return data as Chat[] || [];
  } catch (error) {
    console.error('Error fetching chats:', error);
    return [];
  }
};

export const createChat = async (title: string, model: string = 'gemini-2.0-flash') => {
  try {
    console.log(`========= CREATING NEW CHAT ==========`);
    console.log(`Title: "${title}", Model: ${model}`);
    
    const timestamp = new Date().toISOString();
    const newChatId = uuidv4();
    
    const newChat = {
      id: newChatId,
      title,
      model,
      updated_at: timestamp,
      created_at: timestamp,
    };
    
    // FORCE DATABASE MODE: Always use real database for chat creation
    const forceDatabaseMode = true; // Set to true to bypass mock storage
    
    if (useMockData && !forceDatabaseMode) {
      console.log('Using mock storage for creating chat');
      mockStorage.chats.unshift(newChat);
      return newChat;
    }
    
    console.log('Inserting chat into Supabase:', newChat);
    const { data, error } = await supabase
      .from('chats')
      .insert([newChat])
      .select();
    
    if (error) {
      console.error('Supabase error creating chat:', error);
      console.error('Error details:', JSON.stringify(error));
      // Fallback to mock storage if database insert fails
      console.log('Falling back to mock storage due to error');
      mockStorage.chats.unshift(newChat);
      return newChat;
    }
    
    console.log('Successfully created chat in database:', data?.[0]?.id);
    return data?.[0] as Chat || newChat;
  } catch (error) {
    console.error('Error creating chat:', error);
    // Fallback to local object if everything fails
    const timestamp = new Date().toISOString();
    const fallbackChat = {
      id: uuidv4(),
      title,
      model,
      updated_at: timestamp,
      created_at: timestamp,
    };
    return fallbackChat;
  }
};

// Chat Messages
export const getChatMessages = async (chatId: string) => {
  try {
    console.log('========= GETTING CHAT MESSAGES ==========');
    console.log('Chat ID:', chatId);
    
    // FORCE DATABASE MODE: Always use real database for getting messages
    const forceDatabaseMode = true; // Set to true to bypass mock storage 
    
    if (useMockData && !forceDatabaseMode) {
      console.log('Using mock storage for messages');
      const messages = mockStorage.messages.filter(msg => msg.chat_id === chatId)
        .sort((a, b) => new Date(a.created_at || '').getTime() - new Date(b.created_at || '').getTime());
      console.log(`Found ${messages.length} mock messages`);
      return messages;
    }
    
    console.log('Querying Supabase for messages in chat:', chatId);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Supabase error fetching messages:', error);
      console.error('Error details:', JSON.stringify(error));
      
      // Try fetching without the ordering if there was an error with that clause
      try {
        console.log('Attempting fetch without ordering...');
        const { data: unorderedData, error: unorderedError } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', chatId);
        
        if (unorderedError) {
          console.error('Supabase error fetching unordered messages:', unorderedError);
          return [];
        }
        
        // Sort messages by created_at timestamp manually
        const sortedMessages = (unorderedData || []).sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        
        console.log(`Found and sorted ${sortedMessages.length} messages in database`);
        if (sortedMessages.length > 0) {
          console.log('Messages:', sortedMessages.map(m => ({
            id: m.id,
            role: m.role,
            content_preview: typeof m.content === 'string' ? 
              m.content.substring(0, 20) + '...' : 
              'complex content'
          })));
        }
        return sortedMessages as ChatMessage[];
      } catch (fallbackError) {
        console.error('Error in fallback message fetch:', fallbackError);
      return [];
      }
    }
    
    console.log(`Found ${data?.length || 0} messages in database for chat ${chatId}`);
    if (data && data.length > 0) {
      console.log('Messages:', data.map(m => ({
        id: m.id,
        role: m.role,
        content_preview: typeof m.content === 'string' ? 
          m.content.substring(0, 20) + '...' : 
          'complex content'
      })));
    }
    return data as ChatMessage[] || [];
  } catch (error) {
    console.error('Error fetching messages:', error);
    return [];
  }
};

export const addChatMessage = async (message: Omit<ChatMessage, 'id' | 'created_at'>) => {
  try {
    console.log(`========= ADDING MESSAGE ==========`);
    console.log(`Chat ID: ${message.chat_id}, Role: ${message.role}`);
    console.log('Content preview:', typeof message.content === 'string' ? message.content.substring(0, 50) + '...' : 'complex content');
    
    // Validate message has required fields
    if (!message.chat_id) {
      console.error('Error: Cannot add message - missing chat_id');
      return null;
    }
    
    if (!message.role) {
      console.error('Error: Cannot add message - missing role');
      return null;
    }
    
    if (!message.content) {
      console.error('Error: Cannot add message - missing content');
      return null;
    }
    
    const newMessage = {
      ...message,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
    
    // FORCE DATABASE MODE: Always use real database for messages
    const forceDatabaseMode = true; // Set to true to bypass mock storage and use real database
    
    if (useMockData && !forceDatabaseMode) {
      console.log('Using mock storage for adding message');
      mockStorage.messages.push(newMessage);
      return newMessage;
    }
    
    // Convert attachments to proper format for database
    const messageToInsert = {
      ...message,
      id: uuidv4(), // Generate explicit ID
      attachments: message.attachments ? JSON.stringify(message.attachments) : null,
      created_at: new Date().toISOString(),
    };
    
    console.log('Inserting message into Supabase:', {
      id: messageToInsert.id, // Log the explicitly generated ID
      chat_id: messageToInsert.chat_id,
      role: messageToInsert.role,
      content_length: messageToInsert.content?.length || 0,
      has_attachments: !!messageToInsert.attachments
    });
    
    // Verify chat exists before inserting message
    const { data: chatExists, error: chatCheckError } = await supabase
      .from('chats')
      .select('id')
      .eq('id', message.chat_id)
      .single();
    
    if (chatCheckError) {
      console.error('Error checking if chat exists:', chatCheckError);
      console.error(`Chat with ID ${message.chat_id} may not exist for message insertion`);
    } else {
      console.log(`Verified chat ${message.chat_id} exists:`, !!chatExists);
    }
    
    // Insert the message
    const { data, error } = await supabase
      .from('messages')
      .insert([messageToInsert])
      .select();
    
    if (error) {
      console.error('Supabase error adding message:', error);
      console.error('Error details:', JSON.stringify(error));
      
      console.log('Attempting message insert without automatic ID generation...');
      // Try inserting without the id field to let Supabase generate it
      const simplifiedMessage = {
        role: message.role,
        content: message.content,
        chat_id: message.chat_id,
        attachments: message.attachments ? JSON.stringify(message.attachments) : null,
        created_at: new Date().toISOString(),
      };
      
      const { data: retryData, error: retryError } = await supabase
        .from('messages')
        .insert([simplifiedMessage])
        .select();
      
      if (retryError) {
        console.error('Retry insertion also failed:', retryError);
      // Fallback to mock storage if database insert fails
      console.log('Falling back to mock storage due to error');
      mockStorage.messages.push(newMessage);
      return newMessage;
      }
      
      console.log('Retry successful! Message added with ID:', retryData?.[0]?.id);
      return retryData?.[0] as ChatMessage || newMessage;
    }
    
    console.log('Successfully added message to database:', data?.[0]?.id);
    return data?.[0] as ChatMessage || newMessage;
  } catch (error) {
    console.error('Error adding message:', error);
    // Return the message anyway so the UI doesn't break
    return {
      ...message,
      id: uuidv4(),
      created_at: new Date().toISOString(),
    };
  }
};

// Concept Cards
export const getConceptCards = async (category?: string) => {
  try {
    console.log('[SUPABASE] Fetching concept cards, category filter:', category || 'All');
    
    if (useMockData) {
      console.log('[SUPABASE] Using mock data for concept cards');
      
      // If category is specified, filter by it
      if (category && category !== 'All') {
        return [...mockStorage.conceptCards]
          .filter(card => card.category === category)
          .sort((a, b) => {
            // Sort by creation date, newest first
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          });
      }
      
      // Otherwise return all cards
      return [...mockStorage.conceptCards].sort((a, b) => {
        // Sort by creation date, newest first
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    }
    
    // Query builder
    let query = supabase
      .from('concept_cards')
      .select('*');
    
    // Apply category filter if provided
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    
    // Order by creation date, newest first
    query = query.order('created_at', { ascending: false });
    
    // Execute the query
    const { data, error } = await query;
    
    if (error) {
      console.error('[SUPABASE] Error fetching concept cards:', error);
      return [];
    }
    
    console.log(`[SUPABASE] Successfully fetched ${data?.length || 0} concept cards`);
    if (data?.length > 0) {
      console.log('[SUPABASE] First card:', {
        id: data[0].id,
        title: data[0].title,
        category: data[0].category,
        createdAt: data[0].created_at
      });
    } else {
      console.log('[SUPABASE] No concept cards found in database');
    }
    
    return data as ConceptCard[];
  } catch (error) {
    console.error('[SUPABASE] Error fetching concept cards:', error);
    return [];
  }
};

export const addConceptCard = async (card: Omit<ConceptCard, 'id' | 'created_at'>) => {
  try {
    console.log('[SUPABASE] Adding concept card:', card.title);
    
    // Generate a unique ID to use for both mock and real data
    const cardId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Use the provided gradient or select a random one
    const gradients = [
      'from-purple-500 to-indigo-500',
      'from-blue-500 to-teal-500',
      'from-green-500 to-teal-500',
      'from-yellow-500 to-red-500',
      'from-pink-500 to-purple-500',
      'from-indigo-500 to-blue-500',
      'from-red-500 to-pink-500',
      'from-teal-500 to-blue-500',
    ];
    
    const cardGradient = card.color_gradient || 
      gradients[Math.floor(Math.random() * gradients.length)];
    
    // Create a complete card object with ID
    const newCard = {
      id: cardId,
      title: card.title,
      content: card.content,
      category: card.category,
      color_gradient: cardGradient,
      created_at: timestamp
    };
    
    // For mock data, simply add to the in-memory storage
    if (useMockData) {
      mockStorage.conceptCards.unshift(newCard);
      return newCard;
    }
    
    console.log('[SUPABASE] Saving concept card to database using method 1');
    
    // METHOD 1: Standard insert
    let savedCard = null;
    try {
    const { data, error } = await supabase
      .from('concept_cards')
      .insert([{
          title: newCard.title,
          content: newCard.content,
          category: newCard.category,
          color_gradient: newCard.color_gradient,
          created_at: newCard.created_at
      }])
      .select();
    
    if (error) {
        console.error('[SUPABASE] Method 1 failed:', error);
      } else if (data && data.length > 0) {
        console.log('[SUPABASE] Method 1 succeeded, card saved with ID:', data[0].id);
        return data[0] as ConceptCard;
      }
    } catch (method1Error) {
      console.error('[SUPABASE] Method 1 exception:', method1Error);
    }
    
    // METHOD 2: Insert with explicit ID
    if (!savedCard) {
      console.log('[SUPABASE] Trying method 2: Insert with explicit ID');
      try {
        const { data, error } = await supabase
          .from('concept_cards')
          .insert([newCard])
          .select();
          
        if (error) {
          console.error('[SUPABASE] Method 2 failed:', error);
        } else if (data && data.length > 0) {
          console.log('[SUPABASE] Method 2 succeeded, card saved with ID:', data[0].id);
    return data[0] as ConceptCard;
        }
      } catch (method2Error) {
        console.error('[SUPABASE] Method 2 exception:', method2Error);
      }
    }
    
    // METHOD 3: Direct SQL insert
    if (!savedCard) {
      console.log('[SUPABASE] Trying method 3: Direct SQL insert');
      try {
        const { error } = await supabase.rpc('execute_sql', {
          sql_query: `
            INSERT INTO concept_cards (id, title, content, category, color_gradient, created_at)
            VALUES ('${cardId}', '${newCard.title.replace(/'/g, "''")}', '${newCard.content.replace(/'/g, "''")}', '${newCard.category}', '${newCard.color_gradient}', '${newCard.created_at}')
            RETURNING id;
          `
        });
        
        if (error) {
          console.error('[SUPABASE] Method 3 failed:', error);
        } else {
          console.log('[SUPABASE] Method 3 succeeded, card saved with ID:', cardId);
          return newCard;
        }
      } catch (method3Error) {
        console.error('[SUPABASE] Method 3 exception:', method3Error);
      }
    }
    
    // METHOD 4: REST API call
    if (!savedCard) {
      console.log('[SUPABASE] Trying method 4: REST API call');
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
        
        if (!supabaseUrl || !supabaseKey) {
          console.error('[SUPABASE] Missing URL or key for REST API call');
        } else {
          const response = await fetch(`${supabaseUrl}/rest/v1/concept_cards`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': supabaseKey,
              'Authorization': `Bearer ${supabaseKey}`,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(newCard)
          });
          
          if (!response.ok) {
            console.error('[SUPABASE] Method 4 failed:', response.statusText);
          } else {
            const responseData = await response.json();
            console.log('[SUPABASE] Method 4 succeeded:', responseData);
            if (Array.isArray(responseData) && responseData.length > 0) {
              return responseData[0] as ConceptCard;
            } else if (typeof responseData === 'object') {
              return responseData as ConceptCard;
            }
          }
        }
      } catch (method4Error) {
        console.error('[SUPABASE] Method 4 exception:', method4Error);
      }
    }
    
    // If all database operations failed but we still need a card for the UI
    console.warn('[SUPABASE] All database methods failed, returning in-memory card');
    return newCard;
  } catch (error) {
    console.error('[SUPABASE] Error adding concept card:', error);
    // Even with errors, return a fake card so UI doesn't break
    return {
      id: uuidv4(),
      title: card.title || 'Concept Card',
      content: card.content || 'Content unavailable',
      category: card.category || 'Other',
      color_gradient: card.color_gradient || 'from-gray-400 to-gray-600',
      created_at: new Date().toISOString()
    };
  }
};

// Rename chat
export const renameChat = async (chatId: string, newTitle: string) => {
  console.log(`[SUPABASE] Renaming chat ${chatId} to "${newTitle}"`);
  
  if (!chatId || !newTitle) {
    console.error('[SUPABASE] Cannot rename chat: Missing chat ID or title');
      return null;
    }
    
  try {
    // First attempt: standard update
    const { data, error } = await supabase
      .from('chats')
      .update({ 
        title: newTitle,
        updated_at: new Date().toISOString()
      })
      .eq('id', chatId)
      .select()
      .single();
    
    if (error) {
      console.error('[SUPABASE] Error updating chat title (method 1):', error);
      
      // Second attempt: make sure the chat exists with select first
      const { data: chatExists } = await supabase
        .from('chats')
        .select('id')
        .eq('id', chatId)
        .single();
      
      if (chatExists) {
        console.log('[SUPABASE] Chat exists, trying direct update without return...');
        
        // Try update without returning data
        const { error: updateError } = await supabase
          .from('chats')
          .update({ 
            title: newTitle,
            updated_at: new Date().toISOString() 
          })
          .eq('id', chatId);
        
        if (updateError) {
          console.error('[SUPABASE] Error updating chat title (method 2):', updateError);
      return null;
    }
    
        // Manually construct the return data
        return { id: chatId, title: newTitle };
      }
      
      console.error('[SUPABASE] Chat does not exist, cannot rename');
      return null;
    }
    
    console.log('[SUPABASE] Successfully renamed chat');
    return data;
  } catch (err) {
    console.error('[SUPABASE] Error in renameChat:', err);
    return null;
  }
};

// Delete chat
export const deleteChat = async (chatId: string) => {
  try {
    console.log(`Deleting chat ${chatId}`);
    
    if (useMockData) {
      console.log('Using mock storage for deleting chat');
      // First remove all messages for this chat
      mockStorage.messages = mockStorage.messages.filter(msg => msg.chat_id !== chatId);
      // Then remove the chat itself
      mockStorage.chats = mockStorage.chats.filter(chat => chat.id !== chatId);
      return true;
    }
    
    // First delete all messages for this chat
    const { error: messagesError } = await supabase
      .from('messages')
      .delete()
      .eq('chat_id', chatId);
    
    if (messagesError) {
      console.error('Supabase error deleting chat messages:', messagesError);
      return false;
    }
    
    // Then delete the chat itself
    const { error: chatError } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);
    
    if (chatError) {
      console.error('Supabase error deleting chat:', chatError);
      return false;
    }
    
    console.log('Successfully deleted chat and its messages from database');
    return true;
  } catch (error) {
    console.error('Error deleting chat:', error);
    return false;
  }
};

// Verify database tables exist
export const verifyDatabaseTables = async () => {
  if (useMockData) {
    console.log('Using mock data, skipping database verification');
    return false;
  }
  
  try {
    console.log('Verifying database tables...');
    
    // Check if the 'chats' table exists
    const { data: chatsData, error: chatsError } = await supabase
      .from('chats')
      .select('id')
      .limit(1);
    
    if (chatsError) {
      console.error('Chats table error:', chatsError);
      return false;
    }
    
    // Check if the 'messages' table exists
    const { data: messagesData, error: messagesError } = await supabase
      .from('messages')
      .select('id')
      .limit(1);
    
    if (messagesError) {
      console.error('Messages table error:', messagesError);
      return false;
    }
    
    // Check if the 'concept_cards' table exists
    const { data: cardsData, error: cardsError } = await supabase
      .from('concept_cards')
      .select('id')
      .limit(1);
    
    if (cardsError) {
      console.error('Concept cards table error:', cardsError);
      return false;
    }
    
    console.log('Database tables verified successfully');
    return true;
  } catch (error) {
    console.error('Error verifying database tables:', error);
    return false;
  }
};

// Call verification on initialization
verifyDatabaseTables().then(tablesExist => {
  if (!tablesExist && !useMockData) {
    console.error('WARNING: Database tables not found! You need to create them using the SQL script.');
  }
}); 

// Add to export functions
export const ensureConceptCardsTable = async (): Promise<boolean> => {
  try {
    console.log('[SUPABASE] Verifying concept_cards table exists');
    
    // Check if we're in mock data mode
    if (useMockData) {
      console.log('[SUPABASE] Using mock data, skipping table verification');
      return true;
    }
    
    // First check if the table exists by querying it
    const { error } = await supabase
      .from('concept_cards')
      .select('id')
      .limit(1);
    
    // If there's no error, the table exists
    if (!error) {
      console.log('[SUPABASE] concept_cards table exists');
      return true;
    }
    
    console.error('[SUPABASE] Error checking concept_cards table:', error);
    
    // If we get here, there was an error, try to create the table
    console.log('[SUPABASE] Attempting to create concept_cards table');
    
    // Use Supabase SQL to create the table
    const { error: createError } = await supabase.rpc('execute_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS concept_cards (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          category TEXT NOT NULL,
          color_gradient TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (createError) {
      console.error('[SUPABASE] Failed to create concept_cards table:', createError);
      return false;
    }
    
    console.log('[SUPABASE] Successfully created concept_cards table');
    return true;
  } catch (error) {
    console.error('[SUPABASE] Error in ensureConceptCardsTable:', error);
    return false;
  }
};

/**
 * Delete a concept card by ID
 */
export const deleteConceptCard = async (cardId: string): Promise<boolean> => {
  try {
    console.log('[SUPABASE] Deleting concept card:', cardId);
    
    // For mock data, filter out the card
    if (useMockData) {
      const initialLength = mockStorage.conceptCards.length;
      mockStorage.conceptCards = mockStorage.conceptCards.filter(card => card.id !== cardId);
      return mockStorage.conceptCards.length < initialLength;
    }
    
    // For real data, delete from database
    const { error } = await supabase
      .from('concept_cards')
      .delete()
      .eq('id', cardId);
    
    if (error) {
      console.error('[SUPABASE] Error deleting concept card:', error);
      return false;
    }
    
    console.log('[SUPABASE] Concept card deleted successfully');
    return true;
  } catch (error) {
    console.error('[SUPABASE] Exception in deleteConceptCard:', error);
    return false;
  }
};

/**
 * Update a concept card
 */
export const updateConceptCard = async (
  cardId: string, 
  updates: Partial<Omit<ConceptCard, 'id' | 'created_at'>>
): Promise<ConceptCard | null> => {
  try {
    console.log('[SUPABASE] Updating concept card:', cardId, updates);
    
    // For mock data, update in-memory
    if (useMockData) {
      const cardIndex = mockStorage.conceptCards.findIndex(card => card.id === cardId);
      if (cardIndex >= 0) {
        mockStorage.conceptCards[cardIndex] = {
          ...mockStorage.conceptCards[cardIndex],
          ...updates,
          // Don't let these be overwritten
          id: cardId,
          created_at: mockStorage.conceptCards[cardIndex].created_at
        };
        return mockStorage.conceptCards[cardIndex];
      }
      return null;
    }
    
    // For real data, update in database
    const { data, error } = await supabase
      .from('concept_cards')
      .update(updates)
      .eq('id', cardId)
      .select();
    
    if (error) {
      console.error('[SUPABASE] Error updating concept card:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      console.log('[SUPABASE] Concept card updated successfully');
      return data[0] as ConceptCard;
    }
    
    console.log('[SUPABASE] No data returned from update');
    return null;
  } catch (error) {
    console.error('[SUPABASE] Exception in updateConceptCard:', error);
    return null;
  }
};

// Get todos
export const getTodos = async (): Promise<Todo[]> => {
  try {
    console.log('[SUPABASE] Getting todos');
    
    if (useMockData) {
      console.log('[SUPABASE] Using mock data for todos');
      return [...mockStorage.todos].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    
    const { data, error } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[SUPABASE] Error getting todos:', error);
      return [];
    }
    
    return data as Todo[];
  } catch (error) {
    console.error('[SUPABASE] Exception in getTodos:', error);
    return [];
  }
};

// Add todo
export const addTodo = async (todo: Omit<Todo, 'id' | 'created_at'>): Promise<Todo | null> => {
  try {
    console.log('[SUPABASE] Adding todo:', todo.title);
    
    // Generate a unique ID
    const todoId = uuidv4();
    const timestamp = new Date().toISOString();
    
    // Create a complete todo object
    const newTodo: Todo = {
      id: todoId,
      title: todo.title,
      completed: todo.completed || false,
      priority: todo.priority || 'medium',
      due_date: todo.due_date || null,
      created_at: timestamp
    };
    
    if (useMockData) {
      mockStorage.todos.unshift(newTodo);
      return newTodo;
    }
    
    // Save to database
    const { data, error } = await supabase
      .from('todos')
      .insert([newTodo])
      .select();
    
    if (error) {
      console.error('[SUPABASE] Error adding todo:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      return data[0] as Todo;
    }
    
    return null;
  } catch (error) {
    console.error('[SUPABASE] Exception in addTodo:', error);
    return null;
  }
};

// Update todo
export const updateTodo = async (todoId: string, updates: Partial<Omit<Todo, 'id' | 'created_at'>>): Promise<Todo | null> => {
  try {
    console.log('[SUPABASE] Updating todo:', todoId);
    
    if (useMockData) {
      const todoIndex = mockStorage.todos.findIndex(todo => todo.id === todoId);
      if (todoIndex >= 0) {
        mockStorage.todos[todoIndex] = {
          ...mockStorage.todos[todoIndex],
          ...updates
        };
        return mockStorage.todos[todoIndex];
      }
      return null;
    }
    
    const { data, error } = await supabase
      .from('todos')
      .update(updates)
      .eq('id', todoId)
      .select();
    
    if (error) {
      console.error('[SUPABASE] Error updating todo:', error);
      return null;
    }
    
    if (data && data.length > 0) {
      return data[0] as Todo;
    }
    
    return null;
  } catch (error) {
    console.error('[SUPABASE] Exception in updateTodo:', error);
    return null;
  }
};

// Delete todo
export const deleteTodo = async (todoId: string): Promise<boolean> => {
  try {
    console.log('[SUPABASE] Deleting todo:', todoId);
    
    if (useMockData) {
      const initialLength = mockStorage.todos.length;
      mockStorage.todos = mockStorage.todos.filter(todo => todo.id !== todoId);
      return mockStorage.todos.length < initialLength;
    }
    
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', todoId);
    
    if (error) {
      console.error('[SUPABASE] Error deleting todo:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[SUPABASE] Exception in deleteTodo:', error);
    return false;
  }
};

// Ensure todos table exists
export const ensureTodosTable = async (): Promise<boolean> => {
  try {
    console.log('[SUPABASE] Ensuring todos table exists');
    
    if (useMockData) {
      console.log('[SUPABASE] Using mock data, skipping table verification');
      return true;
    }
    
    // Check if the table exists by querying it
    const { error } = await supabase
      .from('todos')
      .select('id')
      .limit(1);
    
    // If there's no error, the table exists
    if (!error) {
      console.log('[SUPABASE] todos table exists');
      return true;
    }
    
    console.log('[SUPABASE] Table does not exist. Please create it manually using the SQL editor in Supabase.');
    console.log('[SUPABASE] You can find the SQL script in the todos_table.sql file.');
    
    // Can't create the table automatically without execute_sql stored procedure
    // Return false to indicate the table doesn't exist
    return false;
  } catch (error) {
    console.error('[SUPABASE] Error ensuring todos table:', error);
    return false;
  }
}; 