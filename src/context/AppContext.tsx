import { v4 as uuidv4 } from 'uuid';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

import * as supabaseService from '../services/supabase';
import * as geminiService from '../services/gemini';
import * as conceptCardGenerator from '../services/conceptCardGenerator';

// Define types for concept card generation status
export type ConceptCardStatus = 'pending' | 'generating' | 'success' | 'failed' | 'none';

// Map to track concept card generation status for each message
type CardStatusMap = {
  [messageId: string]: ConceptCardStatus;
};

type AppContextType = {
  // Chat state
  currentChatId: string;
  chatHistory: supabaseService.Chat[];
  currentModel: string;
  messages: supabaseService.ChatMessage[];
  isProcessing: boolean;
  selectedImage: File | null;
  isImageLoading: boolean;
  isLoadingModels: boolean;
  models: geminiService.GeminiModel[];
  
  // Concept cards state
  conceptCards: supabaseService.ConceptCard[];
  selectedCategory: string;
  conceptCardStatuses: CardStatusMap;

  // Todos state
  todos: supabaseService.Todo[];

  // Actions
  sendMessage: (content: string) => Promise<void>;
  selectModel: (modelId: string) => void;
  selectChat: (chatId: string) => Promise<boolean>;
  createNewChat: () => Promise<void>;
  uploadImage: (file: File) => void;
  clearImage: () => void;
  loadConceptCards: (category?: string) => Promise<void>;
  generateCardFromQuery: (query: string) => Promise<void>;
  renameChat: (chatId: string, newTitle: string) => Promise<boolean>;
  deleteChat: (chatId: string) => Promise<boolean>;
  autoGenerateChatTitle: (chatId: string, messages: supabaseService.ChatMessage[]) => Promise<boolean>;
  getConceptCardStatus: (messageId: string) => ConceptCardStatus;
  updateCardStatus: (messageId: string, status: ConceptCardStatus) => void;
  deleteConceptCard: (cardId: string) => Promise<boolean>;
  updateConceptCard: (cardId: string, updates: Partial<Omit<supabaseService.ConceptCard, 'id' | 'created_at'>>) => Promise<supabaseService.ConceptCard | null>;

  // Todos actions
  loadTodos: () => Promise<void>;
  addTodo: (todo: Omit<supabaseService.Todo, 'id' | 'created_at'>) => Promise<supabaseService.Todo | null>;
  updateTodo: (todoId: string, updates: Partial<Omit<supabaseService.Todo, 'id' | 'created_at'>>) => Promise<supabaseService.Todo | null>;
  deleteTodo: (todoId: string) => Promise<boolean>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  // Chat state
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<supabaseService.Chat[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('gemini-2.0-flash');
  const [messages, setMessages] = useState<supabaseService.ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isImageLoading, setIsImageLoading] = useState<boolean>(false);
  const [isLoadingModels, setIsLoadingModels] = useState<boolean>(true);
  const [models, setModels] = useState<geminiService.GeminiModel[]>(geminiService.AVAILABLE_MODELS);

  // Concept cards state
  const [conceptCards, setConceptCards] = useState<supabaseService.ConceptCard[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [conceptCardStatuses, setConceptCardStatuses] = useState<CardStatusMap>({});

  // Todos state
  const [todos, setTodos] = useState<supabaseService.Todo[]>([]);

  // Initialize app data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Check and create necessary tables
        if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL === 'your-supabase-url.supabase.co') {
          console.log('Running in offline mode...');
        } else {
          console.log('Ensuring database tables exist...');
          await supabaseService.verifyDatabaseTables();
          await supabaseService.ensureConceptCardsTable();
          await supabaseService.ensureTodosTable();
        }

        // Load available models
        setIsLoadingModels(true);
        const availableModels = await geminiService.fetchAvailableModels();
        setModels(availableModels);
        setIsLoadingModels(false);
        
        // Load chat history
        const chats = await supabaseService.getChats();
        setChatHistory(chats);
        
        // If there are chats, select the most recent one
        if (chats.length > 0) {
          await selectChat(chats[0].id);
        } else {
          // Otherwise create a new chat
          await createNewChat();
        }
        
        // Load todos
        await loadTodos();
      } catch (error) {
        console.error('Error loading initial data:', error);
        setIsLoadingModels(false);
      }
    };
    
    loadInitialData();
  }, []);

  // Load concept cards on initial mount
  useEffect(() => {
    loadConceptCards();
  }, []);

  // Get concept card status for a message
  const getConceptCardStatus = (messageId: string): ConceptCardStatus => {
    return conceptCardStatuses[messageId] || 'none';
  };

  // Update concept card status for a message
  const updateCardStatus = (messageId: string, status: ConceptCardStatus) => {
    setConceptCardStatuses(prev => ({
      ...prev,
      [messageId]: status
    }));
  };

  // Send message to get AI response
  const generateAIResponse = async (chatIdToUse: string, historyForAI: any[]) => {
    console.log(`Generating AI response for chat ${chatIdToUse}`);
    
    try {
      console.log('Generating AI response...');
      
      // Limit history length to avoid token limit errors
      const limitedHistory = limitMessageHistoryTokens(historyForAI);
      console.log(`Using ${limitedHistory.length} messages for AI context after token limit check`);
      
      // Get an AI response
      const aiResponse = await geminiService.generateResponse(
        limitedHistory,
        currentModel,
        { temperature: 0.7 }
      );
      
      console.log('Got AI response');
      
      // Create an AI message
      const aiMessage: supabaseService.ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: aiResponse.content,
        chat_id: chatIdToUse,
        created_at: new Date().toISOString()
      };
      
      console.log('Created AI message:', { 
        id: aiMessage.id, 
        role: aiMessage.role, 
        timestamp: aiMessage.created_at,
        content: aiMessage.content.substring(0, 50) + '...'
      });
      
      return aiMessage;
    } catch (error) {
      console.error('Error generating AI response:', error);
      throw error;
    }
  };

  // Helper function to limit token count for message history
  const limitMessageHistoryTokens = (messages: any[]): any[] => {
    if (messages.length === 0) return [];
    
    // Set token limits based on model type
    const MAX_TOKENS = 100000; // Conservative limit well below the 1M token limit
    
    // Rough token estimation (very approximate)
    const estimateTokens = (content: string | any[]): number => {
      if (typeof content === 'string') {
        // Rough estimate: 1 token is about 4 characters for English text
        return Math.ceil(content.length / 4);
      } else if (Array.isArray(content)) {
        // For message arrays, calculate total
        return content.reduce((sum, part) => {
          if (part.text) {
            return sum + Math.ceil(part.text.length / 4);
          }
          // Images are expensive in tokens
          if (part.inlineData || part.image_url) {
            return sum + 1000; // Assume each image is roughly 1000 tokens
          }
          return sum;
        }, 0);
      }
      return 0;
    };
    
    // Keep track of total tokens and messages
    let totalTokens = 0;
    const limitedMessages = [];
    
    // Always include the most recent message (last in the array)
    const lastMessage = messages[messages.length - 1];
    limitedMessages.push(lastMessage);
    totalTokens += estimateTokens(lastMessage.content);
    
    // Add previous messages until we approach the token limit
    // Start from the second most recent message and go backwards
    for (let i = messages.length - 2; i >= 0; i--) {
      const message = messages[i];
      const messageTokens = estimateTokens(message.content);
      
      // If adding this message would exceed the limit, stop adding more
      if (totalTokens + messageTokens > MAX_TOKENS) {
        console.log(`Token limit reached after ${limitedMessages.length} messages. Estimated tokens: ${totalTokens}`);
        break;
      }
      
      // Add this message to our limited history
      limitedMessages.unshift(message); // Add to beginning to maintain order
      totalTokens += messageTokens;
    }
    
    console.log(`Limited message history from ${messages.length} to ${limitedMessages.length} messages. Estimated tokens: ${totalTokens}`);
    return limitedMessages;
  };

  // Send a message and get AI response
  const sendMessage = async (content: string) => {
    setIsProcessing(true);
    let isNewChat = false;
    let newChatId: string | null = null;
    
    try {
      // Check if this is an image generation command
      const isImageCommand = geminiService.isImageGenerationCommand(content);
      
      // Create a new chat if needed
      if (!currentChatId) {
        console.log('No current chat ID, creating new chat');
        const newChat = await supabaseService.createChat(
          isImageCommand ? 'Image Generation' : 'New Conversation', 
          currentModel
        );
        if (newChat) {
          newChatId = newChat.id;
          setCurrentChatId(newChat.id);
          setChatHistory(prev => [newChat, ...prev]);
          isNewChat = true;
        } else {
          throw new Error('Failed to create new chat');
        }
      }
      
      // Process the content
      let messageContent: string | any[] = content;
      let processedContent = content;
      let generatedImage: string | null = null;
      
      // Handle image generation command
      if (isImageCommand) {
        console.log('Detected image generation command');
        const imagePrompt = geminiService.extractImagePrompt(content);
        
        // Create user message in state and database for the image command
        const chatIdToUse = newChatId || currentChatId;
        const timestamp = Date.now();
        
        const userMessage: supabaseService.ChatMessage = {
          id: uuidv4(),
          role: 'user',
          content: content,
          chat_id: chatIdToUse,
          created_at: new Date(timestamp).toISOString()
        };
        
        // Add user message to state
        setMessages(prev => [...prev, userMessage]);
        
        // Save message to database
        const savedUserMessage = await supabaseService.addChatMessage(userMessage);
        
        if (!savedUserMessage) {
          console.error('Failed to save user message to database');
        }
        
        // Generate the image
        generatedImage = await geminiService.generateImage(imagePrompt);
        
        if (generatedImage) {
          // Create AI message with the generated image
          const aiMessage: supabaseService.ChatMessage = {
            id: uuidv4(),
            role: 'assistant',
            content: JSON.stringify([
              { text: `Here's the image based on your prompt: "${imagePrompt}"` },
              { 
                inlineData: {
                  mimeType: "image/png",
                  data: generatedImage
                }
              }
            ]),
            chat_id: chatIdToUse,
            created_at: new Date().toISOString()
          };
          
          // Add AI message to state
          setMessages(prev => [...prev, aiMessage]);
          
          // Save AI message to database
          const savedAiMessage = await supabaseService.addChatMessage(aiMessage);
          
          if (!savedAiMessage) {
            console.error('Failed to save AI message with image to database');
          }
        } else {
          // Handle error - add error message to chat
          addErrorMessageToChat(
            chatIdToUse,
            'general',
            'I was unable to generate an image based on your prompt. Please try again with a different prompt.'
          );
        }
        
        setIsProcessing(false);
        return;
      }
      
      // Handle image uploads if there's a selected image
      if (selectedImage) {
        console.log('Message includes an image');
        messageContent = [];
        
        // Add text part if provided, otherwise use a default prompt
        if (processedContent.trim()) {
          console.log('Adding text part to message');
          messageContent.push({ text: processedContent });
        } else {
          // Use a default prompt for image-only messages
          messageContent.push({ text: "Analyze this image and provide a detailed description" });
        }
        
        // Convert image to base64 data for Gemini API
        if (selectedImage instanceof File) {
          console.log('Converting File to base64 for Gemini API');
          try {
            const imagePart = await geminiService.fileToGenerativePart(selectedImage);
            console.log('Image successfully converted to Gemini format');
            (messageContent as any[]).push(imagePart);
          } catch (imageError) {
            console.error('Error converting image:', imageError);
            
            // Use the error message from the fileToGenerativePart function
            const errorMessage = imageError instanceof Error 
              ? imageError.message 
              : 'There was an unknown error processing the image';
              
            // Add a user-friendly error message to the chat
            addErrorMessageToChat(
              newChatId || currentChatId,
              'image',
              `I couldn't process that image: ${errorMessage} Please try a different image or format.`
            );
            
            // End processing
            setIsProcessing(false);
            return;
          }
        }
      }
      
      // If this is a new chat with a non-generic message, generate a title immediately
      if (isNewChat) {
        // Use the new chat ID directly since the React state might not be updated yet
        const chatIdToUse = newChatId || currentChatId;
        console.log(`Using chat ID for immediate title generation: ${chatIdToUse}`);
      }
      
      // Create user message in state and database
      const chatIdToUse = newChatId || currentChatId;
      console.log(`Using chat ID for message: ${chatIdToUse}`);
      
      // Validate we have a valid chat ID before proceeding
      if (!chatIdToUse) {
        console.error('Cannot send message: No valid chat ID available');
        setIsProcessing(false);
        return;
      }
      
      // Get the current time in milliseconds
      const timestamp = Date.now();
      
      // Create a user message
      const userMessage: supabaseService.ChatMessage = {
        id: uuidv4(),
        role: 'user',
        content: typeof messageContent === 'string' ? messageContent : JSON.stringify(messageContent),
        chat_id: chatIdToUse,
        created_at: new Date(timestamp).toISOString(),
        attachments: selectedImage ? [URL.createObjectURL(selectedImage)] : undefined
      };
      
      console.log('Created user message:', { 
        id: userMessage.id, 
        role: userMessage.role, 
        timestamp: userMessage.created_at,
        content: typeof userMessage.content === 'string' 
          ? userMessage.content.substring(0, 30) + '...' 
          : 'complex content'
      });
      
      // Add user message to state
      setMessages(prev => [...prev, userMessage]);
      
      // Save message to database
      const savedUserMessage = await supabaseService.addChatMessage(userMessage);
      
      if (!savedUserMessage) {
        console.error('Failed to save user message to database');
      } else {
        console.log('User message saved to database with ID:', savedUserMessage.id);
      }
      
      // Clear image after sending
      if (selectedImage) {
        clearImage();
      }
      
      try {
        console.log('Generating AI response...');
        
        // Get all the messages for context
        const messageHistory = await supabaseService.getChatMessages(chatIdToUse);
        console.log(`Loaded ${messageHistory.length} message(s) for context`);
        
        // Send only the non-system messages as history
        const historyForAI = messageHistory
          .filter(msg => msg.role !== 'system')
          .map(msg => ({
                    role: msg.role, 
                    content: msg.content 
          }));
        
        console.log(`Using ${historyForAI.length} message(s) for AI context`);
        
        // Get actual message content for the AI
        const contentForAI = typeof messageContent === 'string' 
          ? messageContent 
          : messageContent.map(part => {
              if (part.text) return part.text;
              if (part.image_url && part.image_url.substring(0, 100).includes('data:')) return 'Image: [base64 data]';
              return 'unknown content';
            }).join(' ');
        
        console.log(`Sending to AI: "${contentForAI.substring(0, 50)}${contentForAI.length > 50 ? '...' : ''}"`);
        
        // Get an AI response
        const aiMessage = await generateAIResponse(chatIdToUse, historyForAI);
        
        // Add AI message to state
        setMessages(prev => [...prev, aiMessage]);
        
        // Save AI message to database
        const savedAiMessage = await supabaseService.addChatMessage(aiMessage);
        
        if (!savedAiMessage) {
          console.error('Failed to save AI message to database');
        } else {
          console.log('AI message saved to database with ID:', savedAiMessage.id);
        }
        
        // Check if we should generate a concept card (for template responses)
        const isTemplateResponse = aiMessage.content.includes('##') || 
                                   aiMessage.content.includes('```') || 
                                   (aiMessage.content.includes('?') && aiMessage.content.length > 100);
      
        // Determine if this is a study question response
        const isStudyQuestion = (
          // Check user content for study question indicators
          conceptCardGenerator.isEducationalQuery(contentForAI) ||
          
          // Or check AI response format and content
          (isTemplateResponse && (
            // Response has educational headings
            aiMessage.content.toLowerCase().includes('concept') ||
            aiMessage.content.toLowerCase().includes('formula') ||
            aiMessage.content.toLowerCase().includes('equation') ||
            aiMessage.content.toLowerCase().includes('theory') ||
            aiMessage.content.toLowerCase().includes('principle') ||
            aiMessage.content.toLowerCase().includes('definition') ||
            aiMessage.content.toLowerCase().includes('explanation') ||
            aiMessage.content.toLowerCase().includes('solution') ||
            aiMessage.content.toLowerCase().includes('analysis') ||
            // Has educational code blocks (not JSON/HTML)
            (aiMessage.content.includes('```') && 
              !aiMessage.content.includes('```json') && 
              !aiMessage.content.includes('```html'))
          ))
        );
      
        if (isStudyQuestion) {
          // Set the status to pending immediately
          updateCardStatus(aiMessage.id, 'pending');
          
          // GENERATE CONCEPT CARD FOR STUDY QUESTION
          console.log('[STUDY] Generating concept card for study question');
          try {
            // Update status to generating
            updateCardStatus(aiMessage.id, 'generating');
            
            // Use user's original query for card generation
            console.log('[STUDY] Original query for card generation:', contentForAI.substring(0, 100) + '...');
            console.log('[STUDY] Using gemini-2.0-flash model for concept card generation');
            
            // Log the query and model before calling the API
            console.time('[STUDY] Concept card generation time');
            const cardData = await geminiService.generateConceptCard(contentForAI);
            console.timeEnd('[STUDY] Concept card generation time');
            
            console.log('[STUDY] Card data generated:', cardData ? 'SUCCESS' : 'FAILED');
            if (cardData) {
              console.log('[STUDY] Card data details:', {
                title: cardData.title,
                contentPreview: cardData.content.substring(0, 50) + '...',
                category: cardData.category
              });
              
              // Add source information
              const sourceInfo = `\n\nGenerated from a chat on ${new Date().toLocaleDateString()}.`;
              const fullContent = cardData.content + sourceInfo;
              
              // Get a random gradient
              const gradients = [
                "from-blue-500 to-indigo-500",
                "from-purple-500 to-pink-500",
                "from-green-500 to-teal-500", 
                "from-yellow-400 to-orange-500",
                "from-red-500 to-pink-500",
                "from-cyan-500 to-blue-500",
                "from-fuchsia-500 to-purple-500",
                "from-amber-500 to-yellow-500"
              ];
              
              const gradient = gradients[Math.floor(Math.random() * gradients.length)];
              
              console.log('[STUDY] Saving concept card to database with:', {
                title: cardData.title,
                contentPreview: fullContent.substring(0, 50) + '...',
                category: cardData.category,
                gradient
              });
              
              // Retry logic for database saving
              let newCard = null;
              let retryCount = 0;
              const maxRetries = 3;
              
              while (!newCard && retryCount < maxRetries) {
                try {
                  // Save card directly to database
                  newCard = await supabaseService.addConceptCard({
                    title: cardData.title,
                    content: fullContent,
                    category: cardData.category as 'Physics' | 'Chemistry' | 'Biology' | 'Other',
                    color_gradient: gradient
                  });
                  
                  if (newCard) {
                    console.log('[STUDY] Card successfully saved to database on attempt', retryCount + 1, 'ID:', newCard.id);
                  } else {
                    console.error('[STUDY] Database save returned null on attempt', retryCount + 1);
                    retryCount++;
                  }
                } catch (saveError) {
                  console.error('[STUDY] Error saving to database on attempt', retryCount + 1, ':', saveError);
                  retryCount++;
                }
              }
              
              if (newCard) {
                // Update concept cards state
                await loadConceptCards(selectedCategory === 'All' ? undefined : selectedCategory);
                console.log('[STUDY] Concept cards reloaded');
                // Update status to success
                updateCardStatus(aiMessage.id, 'success');
              } else {
                console.error('[STUDY] Failed to save concept card to database after', maxRetries, 'attempts');
                // Update status to failed
                updateCardStatus(aiMessage.id, 'failed');
                
                // Last resort - try to create a direct database entry
                try {
                  console.log('[STUDY] Attempting direct database insert...');
                  const directInsert = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/concept_cards`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY,
                      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_KEY}`,
                      'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                      id: uuidv4(),
                      title: cardData.title,
                      content: fullContent,
                      category: cardData.category,
                      color_gradient: gradient,
                      created_at: new Date().toISOString()
                    })
                  });
                  
                  if (directInsert.ok) {
                    console.log('[STUDY] Direct database insert successful');
                    const insertedCard = await directInsert.json();
                    console.log('[STUDY] Inserted card:', insertedCard);
                    
                    // Update status to success since direct insert worked
                    updateCardStatus(aiMessage.id, 'success');
                    
                    // Reload concept cards
                    await loadConceptCards(selectedCategory === 'All' ? undefined : selectedCategory);
              } else {
                    console.error('[STUDY] Direct database insert failed:', await directInsert.text());
              }
                } catch (directError) {
                  console.error('[STUDY] Error with direct database insert:', directError);
                }
            }
          } else {
              console.log('[STUDY] No card data was generated');
              // Update status to failed
              updateCardStatus(aiMessage.id, 'failed');
            }
        } catch (cardError) {
            console.error('[STUDY] Error in concept card generation:', cardError);
            // Update status to failed
            updateCardStatus(aiMessage.id, 'failed');
          }
        }
        
        // Auto-generate title for this chat if it doesn't have a custom title
        setTimeout(async () => {
          // Reload messages to get the latest, including AI response
          console.log(`Scheduling auto title generation for chat: ${chatIdToUse}`);
          const updatedMessages = await supabaseService.getChatMessages(chatIdToUse);
          console.log(`Retrieved ${updatedMessages.length} messages for title generation`);
          
          // Only proceed if we have at least 2 messages (user + AI response)
          if (updatedMessages.length < 2) {
            console.log('Not enough messages yet, will try again later');
            
            // Try one more time after a longer delay
            setTimeout(async () => {
              const retryMessages = await supabaseService.getChatMessages(chatIdToUse);
              console.log(`RETRY: Retrieved ${retryMessages.length} messages for title generation`);
              const retryResult = await autoGenerateChatTitle(chatIdToUse, retryMessages);
              console.log(`RETRY: Auto title generation completed with result: ${retryResult ? 'SUCCESS' : 'FAILED'}`);
            }, 2000);
            return;
          }
          
          const titleResult = await autoGenerateChatTitle(chatIdToUse, updatedMessages);
          console.log(`Auto title generation completed with result: ${titleResult ? 'SUCCESS' : 'FAILED'}`);
        }, 1000); // Increased from 500ms to 1000ms
      } catch (err) {
        console.error('Error generating AI response:', err);
        
        // Add an error message using our helper function
        const errorType = err instanceof Error && err.message.includes('database') ? 'database' : 
                         (err instanceof Error && err.message.includes('Google') ? 'gemini' : 'general');
        
        addErrorMessageToChat(
          chatIdToUse, 
          errorType, 
          err instanceof Error ? err.message : 'Unknown error'
        );
      }
    } catch (err) {
      console.error('Error in sendMessage:', err);
      
      // Add a general error message if we have a chat ID
      if (currentChatId) {
        addErrorMessageToChat(
          currentChatId, 
          'general', 
          err instanceof Error ? err.message : 'Unknown error in message processing'
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper function to parse message content
  const parseMessageContent = (content: string): string => {
    try {
      // Try to parse as JSON if it's not a plain string
      if (content.startsWith('[') || content.startsWith('{')) {
        const parsed = JSON.parse(content);
        
        // Handle array format
        if (Array.isArray(parsed)) {
          return parsed
            .filter(part => part.text)
            .map(part => part.text)
            .join(' ')
            .trim() || 'Image Analysis';
        }
        
        // Handle object format
        if (parsed && typeof parsed === 'object') {
          return parsed.text || 'Image Analysis';
        }
      }
      
      // Return the original string if it's not JSON or if parsing fails
      return content;
    } catch (e) {
      // If JSON parsing fails, return the original content
      return content;
    }
  };

  // Select a model
  const selectModel = (modelId: string) => {
    try {
      console.log(`Selecting model: ${modelId}`);
      // Check if model exists in available models
      const modelExists = geminiService.AVAILABLE_MODELS.some(model => model.id === modelId);
      
      if (!modelExists) {
        console.warn(`Model ${modelId} is not in the available models list, using gemini-pro as fallback`);
        setCurrentModel('gemini-pro');
      } else {
        setCurrentModel(modelId);
      }
    } catch (error) {
      console.error('Error selecting model:', error);
      // Fallback to gemini-pro if selection fails
      setCurrentModel('gemini-pro');
    }
  };

  // Select a chat and load its messages
  const selectChat = async (chatId: string) => {
    try {
      console.log(`Selecting chat with ID: ${chatId}`);
      
      // Update current chat ID
      setCurrentChatId(chatId);
      
      // Get chat details to update current model
      const selectedChat = chatHistory.find(c => c.id === chatId);
      if (selectedChat?.model) {
        console.log(`Setting model to ${selectedChat.model} from selected chat`);
        setCurrentModel(selectedChat.model);
      }
      
      // Clear current messages
      setMessages([]);
      
      // Load messages for this chat
      const chatMessages = await supabaseService.getChatMessages(chatId);
      console.log(`Loaded ${chatMessages.length} messages for chat ${chatId}`);
      
      // Set messages in state
      setMessages(chatMessages);
      
      return true;
    } catch (error) {
      console.error('Error selecting chat:', error);
      return false;
    }
  };

  // Create a new chat with a default title
  const createNewChat = async () => {
    try {
      console.log('Creating new chat with default title and model:', currentModel);
      const newChat = await supabaseService.createChat('New Conversation', currentModel);
      
      if (newChat) {
        console.log('Successfully created new chat with ID:', newChat.id);
        
        // Update state with the new chat
        setChatHistory(prev => {
          console.log('Updating chat history state with new chat');
          return [newChat, ...prev];
        });
        
        // Set the current chat ID
        console.log('Setting current chat ID to:', newChat.id);
        setCurrentChatId(newChat.id);
        
        // Clear messages
        setMessages([]);
      } else {
        console.error('Failed to create new chat - createChat returned null or undefined');
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  // Upload an image
  const uploadImage = (file: File) => {
    setIsImageLoading(true);
    
    // Simulate processing time for large images
    setTimeout(() => {
      setSelectedImage(file);
      setIsImageLoading(false);
    }, 100);
  };

  // Clear the selected image
  const clearImage = () => {
    setSelectedImage(null);
  };

  // Load concept cards
  const loadConceptCards = async (category?: string) => {
    try {
      const cards = await supabaseService.getConceptCards(category);
      setConceptCards(cards);
      if (category) {
        setSelectedCategory(category);
      }
    } catch (error) {
      console.error('Error loading concept cards:', error);
      // Only add error message if we have a current chat
      if (currentChatId) {
        addErrorMessageToChat(currentChatId, 'database', error instanceof Error ? error.message : 'Unknown database error');
      }
    }
  };

  // Generate a concept card from a query
  const generateCardFromQuery = async (query: string) => {
    try {
      // Only generate cards for substantive queries
      if (query.trim().length < 10) return;
      
      const cardData = await geminiService.generateConceptCard(query);
      
      if (cardData) {
        const newCard = await supabaseService.addConceptCard({
          title: cardData.title,
          content: cardData.content,
          category: cardData.category as 'Physics' | 'Chemistry' | 'Biology' | 'Other'
        });
        
        if (newCard) {
          // If the new card matches the current filter, add it to state
          if (selectedCategory === 'All' || selectedCategory === newCard.category) {
            setConceptCards(prev => [newCard, ...prev]);
          }
        }
      }
    } catch (error) {
      console.error('Error generating concept card:', error);
    }
  };

  // Rename a chat
  const renameChat = async (chatId: string, newTitle: string) => {
    try {
      const updatedChat = await supabaseService.renameChat(chatId, newTitle);
      
      if (updatedChat) {
        setChatHistory(prev => 
          prev.map(chat => 
            chat.id === chatId ? { ...chat, title: newTitle } : chat
          )
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error renaming chat:', error);
      return false;
    }
  };
  
  // Delete a chat
  const deleteChat = async (chatId: string) => {
    try {
      const success = await supabaseService.deleteChat(chatId);
      
      if (success) {
        // Update chat history state
        setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
        
        // If the deleted chat was the current one, select another chat or create a new one
        if (currentChatId === chatId) {
          const remainingChats = chatHistory.filter(chat => chat.id !== chatId);
          if (remainingChats.length > 0) {
            await selectChat(remainingChats[0].id);
          } else {
            await createNewChat();
          }
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error deleting chat:', error);
      return false;
    }
  };

  // Helper to detect greeting messages
  const isGreetingMessage = (content: string | any): boolean => {
    const greetings = [
      "hi", "hello", "hey", "hi there", "hello there", 
      "good morning", "good afternoon", "good evening",
      "greetings", "howdy", "hola", "bonjour", "ciao"
    ];
    
    // Parse content if it's a string in JSON format
    let textContent = '';
    try {
      if (typeof content === 'string') {
        textContent = content;
        // Try to parse as JSON if it looks like JSON
        if ((content.startsWith('{') && content.endsWith('}')) || 
            (content.startsWith('[') && content.endsWith(']'))) {
          const parsed = JSON.parse(content);
          if (Array.isArray(parsed)) {
            // For array format with text parts
            textContent = parsed.map(part => part.text || '').join(' ');
          } else if (parsed && typeof parsed === 'object' && parsed.text) {
            // For object format with text property
            textContent = parsed.text;
          }
        }
      } else if (content && typeof content === 'object') {
        // Already an object or array
        if (Array.isArray(content)) {
          textContent = content.map(part => part.text || '').join(' ');
        } else if (content.text) {
          textContent = content.text;
        } else {
          textContent = JSON.stringify(content);
        }
      }
    } catch (e) {
      // If parsing fails, just use the original content
      console.log('Error parsing content in isGreetingMessage:', e);
      textContent = typeof content === 'string' ? content : '';
    }
    
    const cleanContent = textContent.toLowerCase().trim();
    console.log(`Checking if "${cleanContent}" is a greeting`);
    
    // Check if it's just a greeting by itself
    const isExactGreeting = greetings.some(greeting => 
      cleanContent === greeting || 
      cleanContent.startsWith(`${greeting} `) ||
      cleanContent.endsWith(` ${greeting}`) ||
      cleanContent.includes(` ${greeting} `)
    );
    
    // Check if it's just very short (likely a greeting)
    const isVeryShort = cleanContent.length < 10 && !cleanContent.includes('?');
    
    // Check if it contains only emojis or punctuation (like "hi!")
    const hasOnlyEmojiOrPunctuation = /^[\p{Emoji}\s\p{P}]+$/u.test(cleanContent);
    
    // If it contains substantive content like a question mark, it's not a greeting
    const hasQuestion = cleanContent.includes('?') && cleanContent.length > 15;
    
    const result = (isExactGreeting || isVeryShort || hasOnlyEmojiOrPunctuation) && !hasQuestion;
    console.log(`Is greeting? ${result}`);
    return result;
  };

  // Generate a simple title from message content without API calls
  const generateBasicTitle = (messages: supabaseService.ChatMessage[]): string => {
    try {
      console.log('[TITLE GENERATION] Starting title generation with', messages.length, 'messages');
      
      // Find the first substantive user message
      const userMessages = messages.filter(msg => {
        const isUser = msg.role === 'user';
        const isNotGreeting = !isGreetingMessage(msg.content);
        console.log(`[TITLE GENERATION] Message ${msg.id}: isUser=${isUser}, isNotGreeting=${isNotGreeting}, content=${typeof msg.content === 'string' ? msg.content.substring(0, 30) : 'complex content'}...`);
        return isUser && isNotGreeting;
      });
      
      console.log(`[TITLE GENERATION] Found ${userMessages.length} substantive user messages`);
      
      if (userMessages.length === 0) {
        console.log('[TITLE GENERATION] No substantive user messages found, returning timestamp');
        return getTimestampTitle();
      }
      
      // Get the first real message
      const firstMessage = userMessages[0].content;
      let messageText = '';
      
      // Try to extract text content from possibly JSON-formatted content
      try {
        if (typeof firstMessage === 'string') {
          // Check if it's JSON
          if ((firstMessage.trim().startsWith('{') && firstMessage.trim().endsWith('}')) || 
              (firstMessage.trim().startsWith('[') && firstMessage.trim().endsWith(']'))) {
            const parsed = JSON.parse(firstMessage);
            
            if (Array.isArray(parsed)) {
              // Handle array format (e.g., multimodal messages)
              messageText = parsed.filter(part => part.text).map(part => part.text).join(' ');
            } else if (parsed && typeof parsed === 'object') {
              // Handle object format
              messageText = parsed.text || '';
            }
          } else {
            // Plain text message
            messageText = firstMessage;
          }
        } else {
          // If somehow not a string, stringify it
          messageText = JSON.stringify(firstMessage);
        }
      } catch (e) {
        console.error('[TITLE GENERATION] Error parsing message content:', e);
        messageText = typeof firstMessage === 'string' ? firstMessage : 'New Conversation';
      }
      
      console.log(`[TITLE GENERATION] Extracted message text (first 50 chars): "${messageText.substring(0, 50)}..."`);
      
      // Extract a good title from the content
      let title = '';
      
      // If it's a question, use that
      if (messageText.includes('?')) {
        const questionMatch = messageText.match(/([^.!?]+\?)/);
        if (questionMatch && questionMatch[0]) {
          title = questionMatch[0].trim();
          console.log(`[TITLE GENERATION] Extracted question: "${title}"`);
        }
      } 
      
      // If not a question or extraction failed, try to get the first sentence
      if (!title && messageText.includes('.')) {
        title = messageText.split('.')[0].trim();
        console.log(`[TITLE GENERATION] Extracted first sentence: "${title}"`);
      }
      
      // If still no title, get the first few words
      if (!title) {
        const words = messageText.split(' ');
        title = words.slice(0, Math.min(8, words.length)).join(' ');
        console.log(`[TITLE GENERATION] Extracted first words: "${title}"`);
      }
      
      // Clean and format the title
      title = title
        .replace(/[^\w\s\?\.,!]/g, '') // Remove special chars
        .replace(/^(what is|how to|explain|tell me about|i want to know|can you)/i, '') // Remove common prefixes
        .trim();
      
      console.log(`[TITLE GENERATION] After cleaning: "${title}"`);
      
      // Limit length
      if (title.length > 40) {
        title = title.substring(0, 40) + '...';
      } else if (title.length < 3) {
        // Title too short, use timestamp
        return getTimestampTitle();
      }
      
      // Capitalize first letter
      title = title.charAt(0).toUpperCase() + title.slice(1);
      
      console.log(`[TITLE GENERATION] Final title: "${title}"`);
      return title || getTimestampTitle();
    } catch (error) {
      console.error('[TITLE GENERATION] Error generating title:', error);
      return getTimestampTitle();
    }
  };
  
  // Helper function to get timestamp title
  const getTimestampTitle = (): string => {
    return 'Chat ' + new Date().toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to automatically generate and update chat title
  const autoGenerateChatTitle = async (chatId: string, messages: supabaseService.ChatMessage[]) => {
    try {
      console.log('=== AUTO TITLE GENERATION START ===');
      console.log(`Attempting title generation for chat: ${chatId}`);
      console.log(`Messages available: ${messages.length}`);
      
      // Skip if no messages or too few messages
      if (!messages || messages.length < 2) {
        console.log('Not enough messages available for title generation (need at least 2)');
        return false;
      }
      
      // Get current chat title
      const currentChat = chatHistory.find(chat => chat.id === chatId);
      if (!currentChat) {
        console.log(`Chat ${chatId} not found in history`);
        return false;
      }
      
      console.log(`Current chat title: "${currentChat.title}"`);
      
      // Skip if chat already has a custom title (not "New Conversation")
      if (currentChat.title !== "New Conversation") {
        console.log(`Chat ${chatId} already has a custom title: "${currentChat.title}"`);
        return false;
      }
      
      // Generate a basic title locally without API calls
      const suggestedTitle = generateBasicTitle(messages);
      console.log(`Generated basic title: "${suggestedTitle}" for chat ${chatId}`);
      
      // If the generated title is just a timestamp, skip updating
      if (suggestedTitle.startsWith('Chat ') && suggestedTitle.includes('/') && suggestedTitle.includes(':')) {
        console.log('Generated title is just a timestamp, skipping update');
        return false;
      }
      
      // Update in database - try multiple methods to ensure it updates
      let updateSuccessful = false;
      
      // 1. Call the supabase service
      console.log('1. Calling supabaseService.renameChat...');
      const method1Result = await supabaseService.renameChat(chatId, suggestedTitle);
      if (method1Result) {
        console.log('Method 1 successful!');
        updateSuccessful = true;
      }
      
      // 2. Direct database update with fetch
      try {
        console.log('2. Attempting direct database update with fetch...');
        const apiUrl = import.meta.env.VITE_SUPABASE_URL;
        const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!apiUrl || !apiKey) {
          console.error('Missing Supabase URL or key for direct update');
          console.log('Available env variables:', {
            VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'defined' : 'undefined',
            VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'defined' : 'undefined'
          });
        } else {
          console.log(`Using Supabase URL: ${apiUrl}`);
          const response = await fetch(`${apiUrl}/rest/v1/chats?id=eq.${chatId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': apiKey,
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              title: suggestedTitle,
              updated_at: new Date().toISOString()
            })
          });
          
          if (!response.ok) {
            console.error(`Direct update failed with status: ${response.status}`);
            const responseText = await response.text();
            console.error('Response details:', responseText);
          } else {
            console.log('Direct update successful');
            updateSuccessful = true;
          }
        }
      } catch (dbError) {
        console.error('Error in direct database update:', dbError);
      }
      
      // 3. Use the context function
      if (!updateSuccessful) {
        console.log('3. Using context renameChat function...');
        const contextResult = await renameChat(chatId, suggestedTitle);
        if (contextResult) {
          console.log('Context rename successful!');
          updateSuccessful = true;
        }
      }
      
      // 4. Directly update the state in multiple ways
      console.log('4. Forcing state updates...');
      
      // Immediate state update
      setChatHistory(prev => {
        const newState = prev.map(chat => 
          chat.id === chatId ? { ...chat, title: suggestedTitle } : chat
        );
        console.log('Updated chat history state with new title');
        return newState;
      });
      
      // Delayed state update as a safety measure
      setTimeout(() => {
        setChatHistory(prev => {
          const newState = prev.map(chat => 
            chat.id === chatId ? { ...chat, title: suggestedTitle } : chat
          );
          console.log('Extra safety state update with new title');
          return newState;
        });
      }, 1000);
      
      console.log('=== AUTO TITLE GENERATION END ===');
      return updateSuccessful;
    } catch (error) {
      console.error('Error in autoGenerateChatTitle:', error);
      // Even if we hit an error, try one last state update as a failsafe
      try {
        const fallbackTitle = 'Chat ' + new Date().toLocaleString();
        setChatHistory(prev => 
          prev.map(chat => 
            chat.id === chatId ? { ...chat, title: fallbackTitle } : chat
          )
        );
      } catch (e) {
        console.error('Failed even the fallback title update:', e);
      }
      return false;
    }
  };

  // Process a user message and add a heading if needed
  const processMessageWithHeading = async (messageContent: string): Promise<string> => {
    try {
      // Skip short messages or greetings
      if (isGreetingMessage(messageContent) || messageContent.length < 20) {
        console.log('Message too short or is a greeting, skipping heading generation');
        return messageContent;
      }

      console.log('Analyzing message for heading generation');
      
      // Check if the message appears to be a complex question or topic
      const isComplex = 
        messageContent.length > 80 || 
        messageContent.includes('?') || 
        messageContent.includes('explain') ||
        messageContent.includes('how to') ||
        messageContent.includes('what is');
      
      if (!isComplex) {
        console.log('Message not complex enough for heading, skipping');
        return messageContent;
      }
      
      // Extract a heading from the message
      let heading = '';
      
      if (messageContent.includes('?')) {
        // For questions, use the question as heading
        const questionMatch = messageContent.match(/([^.!?]+\?)/);
        heading = questionMatch ? questionMatch[0].trim() : '';
      } else if (messageContent.includes('.')) {
        // For statements, use first sentence
        heading = messageContent.split('.')[0].trim();
      } else {
        // Otherwise take first few words
        const words = messageContent.split(' ');
        heading = words.slice(0, Math.min(8, words.length)).join(' ');
      }
      
      // Clean and format heading
      heading = heading
        .replace(/[^\w\s\?\.,!]/g, '')
        .trim();
      
      // Limit length and add formatting
      if (heading.length > 50) {
        heading = heading.substring(0, 50) + '...';
      }
      
      // Format as Markdown heading
      const formattedHeading = `## ${heading}\n\n${messageContent}`;
      console.log(`Generated heading: "${heading}"`);
      
      return formattedHeading;
    } catch (error) {
      console.error('Error generating heading:', error);
      return messageContent; // Return original message if heading generation fails
    }
  };

  // Delete a concept card
  const deleteConceptCard = async (cardId: string) => {
    try {
      console.log('[APP CONTEXT] Deleting concept card:', cardId);
      const success = await supabaseService.deleteConceptCard(cardId);
      
      if (success) {
        // Update concept cards state
        setConceptCards(prev => prev.filter(card => card.id !== cardId));
        console.log('[APP CONTEXT] Concept card deleted successfully');
        return true;
      } else {
        console.error('[APP CONTEXT] Failed to delete concept card');
        return false;
      }
    } catch (error) {
      console.error('[APP CONTEXT] Error deleting concept card:', error);
      return false;
    }
  };
  
  // Update a concept card
  const updateConceptCard = async (cardId: string, updates: Partial<Omit<supabaseService.ConceptCard, 'id' | 'created_at'>>) => {
    try {
      console.log('[APP CONTEXT] Updating concept card:', cardId, updates);
      const updatedCard = await supabaseService.updateConceptCard(cardId, updates);
      
      if (updatedCard) {
        // Update concept cards state
        setConceptCards(prev => 
          prev.map(card => card.id === cardId ? updatedCard : card)
        );
        console.log('[APP CONTEXT] Concept card updated successfully');
        return updatedCard;
      } else {
        console.error('[APP CONTEXT] Failed to update concept card');
        return null;
      }
    } catch (error) {
      console.error('[APP CONTEXT] Error updating concept card:', error);
      return null;
    }
  };

  // Load todos from the database
  const loadTodos = async () => {
    try {
      const loadedTodos = await supabaseService.getTodos();
      setTodos(loadedTodos);
      console.log(`Loaded ${loadedTodos.length} todos`);
    } catch (error) {
      console.error('Error loading todos:', error);
    }
  };

  // Add a new todo
  const addTodo = async (todo: Omit<supabaseService.Todo, 'id' | 'created_at'>) => {
    try {
      const newTodo = await supabaseService.addTodo(todo);
      if (newTodo) {
        setTodos(prev => [newTodo, ...prev]);
        return newTodo;
      }
      return null;
    } catch (error) {
      console.error('Error adding todo:', error);
      return null;
    }
  };

  // Update a todo
  const updateTodo = async (todoId: string, updates: Partial<Omit<supabaseService.Todo, 'id' | 'created_at'>>) => {
    try {
      const updatedTodo = await supabaseService.updateTodo(todoId, updates);
      if (updatedTodo) {
        setTodos(prev => prev.map(todo => 
          todo.id === todoId ? updatedTodo : todo
        ));
        return updatedTodo;
      }
      return null;
    } catch (error) {
      console.error('Error updating todo:', error);
      return null;
    }
  };

  // Delete a todo
  const deleteTodo = async (todoId: string) => {
    try {
      const success = await supabaseService.deleteTodo(todoId);
      if (success) {
        setTodos(prev => prev.filter(todo => todo.id !== todoId));
      }
      return success;
    } catch (error) {
      console.error('Error deleting todo:', error);
      return false;
    }
  };

  // Add an error message
  const addErrorMessageToChat = (chatId: string, errorType: 'database' | 'gemini' | 'general' | 'image', details?: string) => {
    const baseErrorMessage = {
      id: uuidv4(),
      role: 'assistant' as const,
      chat_id: chatId,
      created_at: new Date().toISOString(),
      content: ''
    };

    let content = '';
    
    switch (errorType) {
      case 'database':
        content = `
## Database Connection Error

I'm having trouble connecting to the database. This might be because:

1. The Supabase tables haven't been created yet
2. Your Supabase credentials might be incorrect
3. There might be a permission issue with your database

### How to fix this:
- Check your environment variables for SUPABASE_URL and SUPABASE_ANON_KEY
- Make sure your Supabase project is properly set up
- Try clicking the "Show Setup SQL" button at the top of the page
- Follow the instructions to create the necessary tables

${details ? `\n**Error details:** ${details}` : ''}

If the problem persists, you can continue using the application with mock data.
`;
        break;
        
      case 'gemini':
        content = `
## AI Model Connection Error

I'm having trouble connecting to the Gemini AI service. This might be because:

1. Your Google API key might be incorrect or has reached its quota limit
2. There might be network connectivity issues 
3. The Gemini service might be temporarily unavailable

### How to fix this:
- Check your environment variable for GOOGLE_API_KEY
- Verify your API key in the Google Cloud Console
- Try again in a few minutes

${details ? `\n**Error details:** ${details}` : ''}

If the problem persists, some features like concept card generation might not work properly.
`;
        break;
      
      case 'image':
        content = `
## Image Processing Error

I couldn't process the image you uploaded. This might be because:

1. The image format is not supported
2. The image is too large or complex
3. There might be an issue with the image data

${details ? `\n**Error details:** ${details}` : ''}

Please try with a different image, preferably a JPEG or PNG with moderate size and resolution.
`;
        break;
     
      default:
        content = `
## An Error Occurred

I apologize, but I encountered an error processing your request. Please try again.

${details ? `\n**Error details:** ${details}` : ''}
`;
    }
    
    const errorMessage = {
      ...baseErrorMessage,
      content
    };
    
    // Add the error message to state
    setMessages(prev => [...prev, errorMessage]);
    
    // Attempt to save to database if appropriate
    try {
      supabaseService.addChatMessage(errorMessage).catch(e => 
        console.error('Failed to save error message to database:', e)
      );
    } catch (e) {
      console.error('Error trying to save error message:', e);
    }
    
    return errorMessage;
  };

  const contextValue: AppContextType = {
    currentChatId,
    chatHistory,
    currentModel,
    messages,
    isProcessing,
    selectedImage,
    isImageLoading,
    isLoadingModels,
    models,
    conceptCards,
    selectedCategory,
    conceptCardStatuses,
    todos,
    sendMessage,
    selectModel,
    selectChat,
    createNewChat,
    uploadImage,
    clearImage,
    loadConceptCards,
    generateCardFromQuery,
    renameChat,
    deleteChat,
    autoGenerateChatTitle,
    getConceptCardStatus,
    updateCardStatus,
    deleteConceptCard,
    updateConceptCard,
    loadTodos,
    addTodo,
    updateTodo,
    deleteTodo
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}; 