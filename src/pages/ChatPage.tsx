import React, { useState, useRef, useEffect } from "react";
import { Mic, ChevronUp, Menu, Bell, Plus, Image, X, Grid, ChevronDown, Settings, Layers, AlertTriangle, Edit, Trash2, MessageSquare, Check } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import ChatHistory from "../components/ChatHistory";
import { useAppContext } from "../context/AppContext";
import ReactMarkdown from 'react-markdown';
import * as supabaseService from '../services/supabase';
import { formatDistanceToNow } from 'date-fns';
import TemplatedResponse from "../components/TemplatedResponse";

export default function ChatPage() {
  const {
    messages,
    isProcessing,
    sendMessage,
    selectedImage,
    isImageLoading,
    uploadImage,
    clearImage,
    currentModel,
    selectModel,
    createNewChat,
    chatHistory,
    isLoadingModels,
    models,
    selectChat,
    renameChat,
    deleteChat,
    currentChatId,
    getConceptCardStatus
  } = useAppContext();
  
  const [input, setInput] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [showModelSelect, setShowModelSelect] = useState(false);
  const [tablesExist, setTablesExist] = useState<boolean | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Check database tables on mount
  useEffect(() => {
    const checkTables = async () => {
      const result = await supabaseService.verifyDatabaseTables();
      setTablesExist(result);
    };
    
    checkTables();
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure there's either text or an image to send
    if (input.trim() || selectedImage) {
      console.log("Sending message:", input.trim() ? input : "Image only");
      
      // Set a default text for image-only messages
      let messageText = input;
      if (!input.trim() && selectedImage) {
        messageText = "Analyze this image";
      }
      
      sendMessage(messageText);
      setInput("");
    } else {
      console.warn("Attempted to send empty message");
    }
  };
  
  // Handle file selection for image upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };
  
  // Handle voice input (mock implementation)
  const handleVoiceInput = () => {
    // In a real app, this would use the Web Speech API
    alert("Voice input would be activated here");
    // Mock voice recognition result after a delay
    setTimeout(() => {
      setInput("This is a voice input example");
    }, 2000);
  };
  
  // Decorative bubbles
  const bubbles = [
    { size: "w-16 h-16 md:w-24 md:h-24", top: "top-[10%]", left: "left-[15%]", color: "from-purple-300 to-indigo-300", delay: "0s" },
    { size: "w-24 h-24 md:w-32 md:h-32", top: "top-[30%]", left: "left-[75%]", color: "from-indigo-300 to-purple-300", delay: "1s" },
    { size: "w-12 h-12 md:w-20 md:h-20", top: "top-[60%]", left: "left-[10%]", color: "from-purple-200 to-indigo-200", delay: "2s" },
    { size: "w-20 h-20 md:w-28 md:h-28", top: "top-[80%]", left: "left-[70%]", color: "from-indigo-200 to-purple-200", delay: "1.5s" },
  ];

  const currentModelDetails = models.find(m => m.id === currentModel);
  const isMultimodalModel = currentModelDetails?.multimodal || false;

  return (
    <div className="responsive-container">
      {/* Decorative bubbles */}
      {bubbles.map((bubble, i) => (
        <div
          key={i}
          className={`bubble ${bubble.size} ${bubble.top} ${bubble.left} bg-gradient-to-br ${bubble.color}`}
          style={{ animationDelay: bubble.delay }}
        ></div>
      ))}

      {/* App header */}
      <div className="flex justify-between items-center px-5 py-2 relative z-20">
        <div className="flex items-center space-x-2 relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <Menu className="h-7 w-7 text-gray-600" />
          </button>
        </div>

        <Logo />
        
        <div className="flex items-center space-x-2 relative">
          <button onClick={() => setShowModelSelect(!showModelSelect)} className="p-2 rounded-full hover:bg-gray-100">
            <Layers className="h-7 w-7 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Floating menus (outside the header) */}
      {/* Chat history menu */}
      {showMenu && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-20 backdrop-blur-sm z-40 transition-all" onClick={() => setShowMenu(false)}>
          <div 
            className="absolute top-16 left-4 w-80 max-w-[90vw] bg-white/95 rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100 animate-slideInLeft"
            onClick={e => e.stopPropagation()}
          >
            <div className="max-h-[80vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-lg font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Menu</h3>
                <button
                  onClick={() => {
                    createNewChat();
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-700 hover:bg-indigo-50 transition-all hover:shadow-sm"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-sm">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">New Chat</span>
                </button>
                
                <Link
                  to="/concept-cards"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-700 hover:bg-indigo-50 transition-all hover:shadow-sm mt-2"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-sm">
                    <Grid className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">Concept Cards</span>
                </Link>
                
                <Link
                  to="/todos"
                  onClick={() => setShowMenu(false)}
                  className="flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-700 hover:bg-indigo-50 transition-all hover:shadow-sm mt-2"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-sm">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">Todo List</span>
                </Link>
              </div>
              
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Database Connection</span>
                  {import.meta.env.VITE_SUPABASE_URL === 'your-project-url.supabase.co' || !import.meta.env.VITE_SUPABASE_URL ? (
                    <span className="flex items-center text-xs text-red-500 font-medium px-2 py-1 bg-red-50 rounded-full">
                      Offline <span className="ml-1 h-2 w-2 rounded-full bg-red-500"></span>
                    </span>
                  ) : tablesExist === false ? (
                    <span className="flex items-center text-xs text-orange-500 font-medium px-2 py-1 bg-orange-50 rounded-full">
                      Missing Tables <AlertTriangle className="ml-1 h-3 w-3" />
                    </span>
                  ) : (
                    <span className="flex items-center text-xs text-green-500 font-medium px-2 py-1 bg-green-50 rounded-full">
                      Connected <span className="ml-1 h-2 w-2 rounded-full bg-green-500"></span>
                    </span>
                  )}
                </div>
              </div>
              
              {/* Chat History Section */}
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-500 mb-3 px-2">Recent Conversations</h3>
                {chatHistory.length > 0 ? (
                  <ChatHistory 
                    onChatSelected={() => setShowMenu(false)}
                  />
                ) : (
                  <div className="text-center py-8 px-4">
                    <div className="w-16 h-16 mx-auto bg-indigo-100 rounded-full flex items-center justify-center mb-3">
                      <MessageSquare className="h-8 w-8 text-indigo-500" />
                            </div>
                    <p className="text-gray-500 text-sm">No chat history yet. Start a new conversation!</p>
                  </div>
                )}
                </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Model selection dropdown */}
      {showModelSelect && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-20 backdrop-blur-sm z-40 transition-all" onClick={() => setShowModelSelect(false)}>
          <div 
            className="absolute top-16 right-4 w-80 max-w-[90vw] bg-white/95 rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100 animate-slideInRight"
            onClick={e => e.stopPropagation()}
          >
            <div className="py-4 px-4 border-b border-gray-100">
              <h3 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">AI Models</h3>
            </div>
            <div className="max-h-[70vh] overflow-y-auto">
              {isLoadingModels ? (
                <div className="px-6 py-8 text-sm text-gray-500 text-center">
                  <div className="flex justify-center my-4">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                  </div>
                  <p>Loading available models...</p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {models.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        selectModel(model.id);
                        setShowModelSelect(false);
                      }}
                      className={`block w-full text-left px-4 py-3 rounded-xl transition-all ${
                        currentModel === model.id
                          ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 shadow-sm'
                          : 'bg-white hover:bg-gray-50 border border-gray-100 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className={`font-medium ${currentModel === model.id ? 'text-indigo-700' : 'text-gray-700'}`}>
                          {model.name}
                        </span>
                        {currentModel === model.id && (
                          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-indigo-100">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1">
                      {model.multimodal && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2">
                            <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 8 8">
                              <circle cx="4" cy="4" r="3" />
                            </svg>
                            Multimodal
                          </span>
                        )}
                        
                        {model.inputTokenLimit > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {(model.inputTokenLimit / 1000).toFixed(0)}K tokens
                        </span>
                      )}
                      </div>
                      
                      {model.description && (
                        <p className="mt-1 text-xs text-gray-500 line-clamp-2">
                          {model.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* User count */}
      <div className="flex justify-between px-5 py-1">
        <div className="flex items-center">
          <div className="flex -space-x-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 ring-2 ring-white" />
            ))}
          </div>
          <span className="ml-2 text-sm md:text-base text-gray-600">Recent Chats: {chatHistory.length}</span>
        </div>
      </div>

      {/* Main heading */}
      <div className="px-5 py-2">
        <p className="text-gray-600 flex items-center">
          {isLoadingModels ? (
            <span className="flex items-center">
              <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-500 mr-1"></span>
              Loading models...
            </span>
          ) : (
            <>
              <span className="font-medium">{currentModelDetails?.name || 'AI'}</span>
              <button 
                onClick={() => setShowModelSelect(true)} 
                className="ml-2 text-purple-600 text-sm underline"
              >
                Change
              </button>
            </>
          )}
        </p>
      </div>

      {/* Chat messages */}
      <div className="flex-1 px-5 py-4 chat-messages space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-purple-400 to-indigo-500 mb-6 flex items-center justify-center">
              <img 
                src="https://cdn2.iconfinder.com/data/icons/round-robot/500/Round_robot_500x500-21-1024.png" 
                alt="Robot" 
                className="h-20 w-20 object-contain mix-blend-screen"
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">Start a conversation</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              {isMultimodalModel 
                ? "Ask questions or upload images for analysis and explanations"
                : "Ask questions about physics, chemistry, biology, or any other subject to generate concept cards"}
            </p>
            <div className="space-y-2">
              {isMultimodalModel
                ? [
                    "Solve the given question", 
                    "Explain the concept", 
                    "Analyze this image (upload below)"
                  ].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (q.includes("image")) {
                          fileInputRef.current?.click();
                        } else {
                          setInput(q);
                          setTimeout(() => sendMessage(q), 500);
                        }
                      }}
                      className="block w-full px-6 py-3 text-left rounded-xl bg-white shadow-sm hover:shadow-md border border-gray-200 transition-shadow"
                    >
                      {q}
                    </button>
                  ))
                : ["Solve the given question", "Explain the concept", "What is cellular respiration?"].map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => sendMessage(q), 500);
                      }}
                      className="block w-full px-6 py-3 text-left rounded-xl bg-white shadow-sm hover:shadow-md border border-gray-200 transition-shadow"
                    >
                      {q}
                    </button>
                  ))
              }
            </div>
          </div>
        ) : (
          messages.map((message, index) => {
            // Find the previous user message for this AI response
            const getPreviousUserMessage = () => {
              if (message.role !== 'assistant' || index === 0) return '';
              
              // Look for the most recent user message before this one
              for (let i = index - 1; i >= 0; i--) {
                if (messages[i].role === 'user') {
                  return messages[i].content;
                }
              }
              return '';
            };
            
            const previousUserMessage = message.role === 'assistant' ? getPreviousUserMessage() : '';
            
            return (
              <div key={index} className={`flex flex-col ${message.role === 'assistant' ? 'items-start' : 'items-end'}`}>
                <div 
                  className={`message max-w-[80%] p-4 rounded-2xl ${message.role === 'assistant' 
                    ? 'bg-white text-slate-800 shadow-sm border border-gray-100' 
                    : 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'}`}
                >
                  {/* Message content */}
                  {message.role === 'assistant' ? (
                    <TemplatedResponse 
                      content={message.content} 
                      conceptCardStatus={getConceptCardStatus(message.id)}
                      userMessage={previousUserMessage}
                    />
                  ) : (
                    <div>
                      {message.content}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2">
                    <img 
                      src={message.attachments[0]} 
                      alt="Attached image" 
                            className="rounded-lg max-w-full max-h-64 object-contain" 
                    />
                        </div>
                      )}
                  </div>
                )}
                          </div>
                
                {/* Timestamp */}
                <div className="text-xs text-gray-500 mt-1 px-2">
                  {message.created_at ? (
                    formatDistanceToNow(new Date(message.created_at), { addSuffix: true })
                  ) : (
                    'Just now'
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {/* Loading indicator */}
        {isProcessing && (
          <div className="flex justify-center my-4">
            <div className="flex space-x-2">
              <div className="w-2 h-2 md:w-3 md:h-3 bg-purple-600 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 md:w-3 md:h-3 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              <div className="w-2 h-2 md:w-3 md:h-3 bg-purple-600 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
        )}
        
        {/* Reference for auto-scrolling */}
        <div ref={messageEndRef} />
      </div>
      
      {/* Image preview (if image is selected) */}
      {selectedImage && (
        <div className="px-5 py-2">
          <div className="relative inline-block">
            <img 
              src={URL.createObjectURL(selectedImage)} 
              alt="Preview" 
              className="h-20 rounded-lg object-cover"
            />
            <button 
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
            >
              <X size={16} />
            </button>
            <span className="absolute -bottom-1 right-0 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm">
              Ready to send
            </span>
          </div>
        </div>
      )}

      {/* Bottom controls */}
      <form onSubmit={handleSubmit} className="p-4 md:p-6 bg-white/95 backdrop-blur-sm rounded-t-3xl shadow-lg border-t border-gray-100">
        <div className="flex gap-3 items-center max-w-6xl mx-auto">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-12 h-12 flex items-center justify-center rounded-full shadow-md transition-all duration-200 
                ${isImageLoading ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white' : 
                  selectedImage ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white animate-pulse' : 
                    'bg-white hover:bg-gray-50 text-indigo-600 hover:shadow-lg hover:-translate-y-0.5 border border-gray-200'
                }`}
              title="Upload image"
              disabled={!isMultimodalModel || isImageLoading}
            >
              {isImageLoading ? (
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Image size={22} />
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                disabled={isImageLoading}
              />
            </button>
            {selectedImage && (
              <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-medium bg-green-500 text-white px-2 py-0.5 rounded-full shadow-sm border border-green-600">
                Image ready
              </span>
            )}
            {isImageLoading && (
              <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-medium bg-yellow-500 text-white px-2 py-0.5 rounded-full shadow-sm border border-yellow-600 animate-pulse">
                Processing...
              </span>
            )}
            {!selectedImage && !isImageLoading && isMultimodalModel && (
              <span className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-gray-500 font-medium bg-white px-2 py-0.5 rounded-full shadow-sm">
                Add image
              </span>
            )}
          </div>
          
          <div className="flex-1 bg-white rounded-2xl flex items-center pl-4 pr-2 py-2 shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isProcessing}
              placeholder={
                isMultimodalModel
                  ? "Ask me anything or upload an image..."
                  : "Ask me anything..."
              }
              className="bg-transparent flex-1 outline-none text-gray-800 placeholder-gray-500 text-sm md:text-base"
            />
            <button 
              type="submit" 
              disabled={isProcessing || (!input.trim() && !selectedImage)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 p-3 rounded-xl shadow-md disabled:opacity-50 hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
            >
              {input.trim() ? (
                <ChevronUp className="h-5 w-5 md:h-6 md:w-6 text-white" />
              ) : (
                <Mic 
                  className="h-5 w-5 md:h-6 md:w-6 text-white" 
                  onClick={(e) => {
                    if (!input.trim() && !selectedImage) {
                      e.preventDefault();
                      handleVoiceInput();
                    }
                  }}
                />
              )}
            </button>
          </div>
          <Link
            to="/concept-cards"
            className="h-12 w-12 md:h-14 md:w-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-md"
          >
            <Grid className="h-6 w-6 md:h-7 md:w-7 text-white" />
          </Link>
        </div>
      </form>
    </div>
  );
}
