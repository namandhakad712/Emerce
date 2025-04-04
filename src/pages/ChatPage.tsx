import React, { useState, useRef, useEffect, useMemo } from "react";
import { Mic, ChevronUp, Menu, Bell, Plus, Image, X, Grid, ChevronDown, Settings, Layers, AlertTriangle, Edit, Trash2, MessageSquare, Check, Database, Copy, Terminal } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import ChatHistory from "../components/ChatHistory";
import { useAppContext } from "../context/AppContext";
import ReactMarkdown from 'react-markdown';
import * as supabaseService from '../services/supabase';
import { formatDistanceToNow } from 'date-fns';
import TemplatedResponse from "../components/TemplatedResponse";
import { useGSAPAnimations } from "../hooks/useGSAPAnimations";
import { gsap } from "gsap";
import { GeminiModel } from "../services/gemini";

// Extend the GeminiModel type to include multimodal property
interface ExtendedGeminiModel extends GeminiModel {
  multimodal?: boolean;
}

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
  const [dbError, setDbError] = useState<string | null>(null);
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Animation references
  const headerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputContainerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);
  
  // Animation hooks
  const { fadeIn, staggerItems } = useGSAPAnimations();
  
  // Check database tables on mount
  useEffect(() => {
    const checkTables = async () => {
      try {
        const result = await supabaseService.verifyDatabaseTables();
        setTablesExist(result);
        if (!result) {
          setDbError('Database tables could not be verified. You may need to create them manually.');
        }
      } catch (error) {
        console.error('Error checking database tables:', error);
        setDbError(error instanceof Error ? error.message : 'Unknown database error');
        setTablesExist(false);
      }
    };
    
    checkTables();
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Initial page load animations with enhanced effects
  useEffect(() => {
    // Header animation
    gsap.fromTo(
      headerRef.current,
      { y: -50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
    );
    
    // Chat container animation
    gsap.fromTo(
      chatContainerRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 0.8, delay: 0.3, ease: "power2.out" }
    );
    
    // Input container animation
    gsap.fromTo(
      inputContainerRef.current,
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, delay: 0.5, ease: "power3.out" }
    );
    
    // Enhanced bubble animation
    const bubbleElements = document.querySelectorAll('.bubble');
    bubbleElements.forEach((bubble, index) => {
      // Random movement for each bubble
      gsap.to(bubble, {
        y: gsap.utils.random(-15, -30),
        x: gsap.utils.random(-5, 5),
        rotate: gsap.utils.random(-5, 5),
        repeat: -1,
        yoyo: true,
        duration: gsap.utils.random(3, 6),
        ease: "sine.inOut",
        delay: gsap.utils.random(0, 2)
      });
      
      // Subtle size fluctuation
      gsap.to(bubble, {
        scale: gsap.utils.random(0.9, 1.1),
        repeat: -1,
        yoyo: true,
        duration: gsap.utils.random(3, 4),
        ease: "sine.inOut",
        delay: gsap.utils.random(0, 1)
      });
    });
    
    // Subtle background animation
    gsap.to(".responsive-container", {
      backgroundPosition: "100% 100%",
      duration: 20,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut"
    });
  }, []);
  
  // Animate new messages when they appear with enhanced effects
  useEffect(() => {
    if (messagesListRef.current && messages.length > 0) {
      const messageElements = messagesListRef.current.querySelectorAll('.message-item:not(.animated)');
      
      if (messageElements.length > 0) {
        // Main message animation
        gsap.fromTo(
          messageElements,
          { 
            opacity: 0, 
            y: 20,
            scale: 0.95 
          },
          { 
            opacity: 1, 
            y: 0, 
            scale: 1, 
            duration: 0.5, 
            stagger: 0.15,
            ease: "back.out(1.2)",
            onComplete: () => {
              // Mark messages as animated
              messageElements.forEach(el => el.classList.add('animated'));
            }
          }
        );
        
        // Additional subtle effects for user and AI messages
        messageElements.forEach(el => {
          if (el.querySelector('.message')) {
            gsap.fromTo(
              el.querySelector('.message'),
              { boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
              { 
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)", 
                duration: 0.8,
                delay: 0.3
              }
            );
          }
        });
      }
    }
  }, [messages]);
  
  // Menu toggle animation
  useEffect(() => {
    if (showMenu) {
      gsap.fromTo(
        ".menu-container",
        { x: -50, opacity: 0, scale: 0.98 },
        { x: 0, opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.4)" }
      );
      
      // Add staggered animation for menu items
      gsap.fromTo(
        ".menu-container .menu-item",
        { x: -20, opacity: 0 },
        { 
          x: 0, 
          opacity: 1, 
          stagger: 0.05, 
          duration: 0.25, 
          delay: 0.1,
          ease: "power2.out"
        }
      );
    }
  }, [showMenu]);
  
  // Model select toggle animation
  useEffect(() => {
    if (showModelSelect) {
      gsap.fromTo(
        ".model-select-container",
        { y: -10, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.2)" }
      );
      
      // Enhanced staggered animation for model items
      gsap.fromTo(
        ".model-selector-button",
        { 
          y: -15,
          opacity: 0,
          scale: 0.97
        },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          stagger: 0.08, 
          duration: 0.4, 
          delay: 0.1,
          ease: "power3.out"
        }
      );
    }
  }, [showModelSelect]);
  
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
    { size: "w-16 h-16 md:w-24 md:h-24", top: "top-[10%]", left: "left-[15%]", color: "from-purple-300/60 to-indigo-300/60", delay: "0s" },
    { size: "w-24 h-24 md:w-32 md:h-32", top: "top-[30%]", left: "left-[75%]", color: "from-indigo-300/60 to-purple-300/60", delay: "1s" },
    { size: "w-12 h-12 md:w-20 md:h-20", top: "top-[60%]", left: "left-[10%]", color: "from-purple-200/60 to-indigo-200/60", delay: "2s" },
    { size: "w-20 h-20 md:w-28 md:h-28", top: "top-[80%]", left: "left-[70%]", color: "from-indigo-200/60 to-purple-200/60", delay: "1.5s" },
    { size: "w-14 h-14 md:w-20 md:h-20", top: "top-[18%]", left: "left-[85%]", color: "from-pink-200/40 to-purple-200/40", delay: "0.5s" },
    { size: "w-10 h-10 md:w-16 md:h-16", top: "top-[45%]", left: "left-[32%]", color: "from-blue-200/40 to-indigo-200/40", delay: "2.5s" },
  ];

  const currentModelDetails = models.find(m => m.id === currentModel) as ExtendedGeminiModel;
  const isMultimodalModel = true; // Enable image upload for all models

  // Helper function to copy text to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('SQL copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="responsive-container bg-gradient-to-b from-indigo-50 via-purple-50 to-white">
      {/* Glass morphism background effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-200/20 via-purple-100/10 to-transparent pointer-events-none"></div>
      
      {/* Decorative bubbles with enhanced appearance */}
      {bubbles.map((bubble, i) => (
        <div
          key={i}
          className={`bubble ${bubble.size} ${bubble.top} ${bubble.left} bg-gradient-to-br ${bubble.color}`}
          style={{ 
            animationDelay: bubble.delay, 
            filter: "blur(8px)"
          }}
        ></div>
      ))}

      {/* App header with glass effect */}
      <div ref={headerRef} className="flex justify-between items-center px-5 py-3 relative z-20 bg-white/60 backdrop-blur-md border-b border-white/80">
        <div className="flex items-center space-x-2 relative">
          <button
            ref={menuButtonRef}
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-full hover:bg-white/80 transition-colors duration-200"
          >
            <Menu className="h-6 w-6 text-indigo-600" />
          </button>
        </div>

        <Logo />
        
        <div className="flex items-center space-x-2 relative">
          <button 
            onClick={() => setShowModelSelect(!showModelSelect)} 
            className="p-2 rounded-full hover:bg-white/80 transition-colors duration-200 relative"
          >
            <Layers className="h-6 w-6 text-indigo-600" />
            {currentModelDetails && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </div>

      {/* Floating menus (outside the header) */}
      {/* Chat history menu */}
      {showMenu && (
        <div className="fixed top-0 left-0 right-0 bottom-0 bg-black bg-opacity-20 backdrop-blur-sm z-40 transition-all" onClick={() => setShowMenu(false)}>
          <div 
            className="menu-container absolute top-16 left-4 w-80 max-w-[90vw] bg-white/95 rounded-xl shadow-2xl z-50 overflow-hidden border border-gray-100 animate-slideInLeft"
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
                  className="menu-item flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-700 hover:bg-indigo-50 transition-all hover:shadow-sm"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-sm">
                    <Plus className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">New Chat</span>
                </button>
                
                <Link
                  to="/concept-cards"
                  onClick={() => setShowMenu(false)}
                  className="menu-item flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-700 hover:bg-indigo-50 transition-all hover:shadow-sm mt-2"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center mr-3 shadow-sm">
                    <Grid className="h-5 w-5 text-white" />
                  </div>
                  <span className="font-medium">Concept Cards</span>
                </Link>
                
                <Link
                  to="/todos"
                  onClick={() => setShowMenu(false)}
                  className="menu-item flex items-center w-full text-left px-4 py-3 rounded-xl text-gray-700 hover:bg-indigo-50 transition-all hover:shadow-sm mt-2"
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
      
      {/* Model selector dropdown */}
      {showModelSelect && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-sm z-40 flex items-start justify-end pt-16 pr-4 md:pr-6" onClick={() => setShowModelSelect(false)}>
        <div 
            className="model-select-container w-80 max-w-[92vw] bg-white/95 rounded-2xl shadow-xl overflow-hidden border border-white"
          onClick={e => e.stopPropagation()}
        >
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                  AI Models
                </h3>
                <button 
                  onClick={() => setShowModelSelect(false)}
                  className="p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>
              
              <p className="text-sm text-gray-500 mb-5">Select the AI model that best fits your needs</p>
              
              {isLoadingModels ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 rounded-full border-4 border-indigo-100 border-t-indigo-500 animate-spin mb-4"></div>
                  <p className="text-sm text-gray-500">Discovering available models...</p>
              </div>
            ) : (
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1 pb-2">
                {models.map((model) => {
                  // Apply ExtendedGeminiModel type
                  const extendedModel = model as ExtendedGeminiModel;
                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        selectModel(model.id);
                        setShowModelSelect(false);
                      }}
                        className={`model-selector-button group relative flex flex-col items-start w-full px-4 py-3 rounded-xl transition-all duration-300 overflow-hidden ${
                        model.id === currentModel
                            ? "bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 active"
                            : "hover:bg-gray-50 border border-transparent hover:border-gray-100"
                      }`}
                    >
                        {/* Background hover effect */}
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-indigo-100/70 to-purple-100/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform origin-bottom scale-y-0 group-hover:scale-y-100" />
                        
                        <div className="flex items-center justify-between w-full relative z-10">
                        <span className="font-medium text-gray-800">{model.name}</span>
                        {model.id === currentModel && (
                            <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full flex items-center">
                              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mr-1 animate-pulse"></span>
                              Active
                            </span>
                        )}
                      </div>
                      
                        <div className="flex items-center mt-1 space-x-2 relative z-10">
                        {extendedModel.multimodal && (
                          <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-800 rounded-full flex items-center">
                            <Image className="h-2.5 w-2.5 mr-0.5" />
                            Multimodal
                          </span>
                        )}
                        </div>
                        
                        {/* Hidden details that appear on hover */}
                        <div className="mt-2 max-h-0 overflow-hidden transition-all duration-300 ease-in-out group-hover:max-h-24 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 w-full relative z-10">
                        {model.description && (
                            <div className="text-xs text-gray-500 py-1 border-t border-gray-100 mt-1">
                              <p className="mt-1">{model.description.split('.')[0]}</p>
                              
                              <div className="flex items-center justify-between mt-2 text-[10px] text-indigo-600">
                                {extendedModel.inputTokenLimit && (
                                  <span>Input limit: {extendedModel.inputTokenLimit.toLocaleString()} tokens</span>
                                )}
                                {extendedModel.outputTokenLimit && (
                                  <span>Output limit: {extendedModel.outputTokenLimit.toLocaleString()} tokens</span>
                                )}
                              </div>
                            </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* User count and model info in a more compact format */}
      <div className="px-4 py-2 flex justify-between items-center">
        <span className="text-xs text-gray-500">
          <span className="font-medium text-gray-700">{chatHistory.length}</span> chats
        </span>
        
        <div className="flex items-center">
          {isLoadingModels ? (
            <div className="flex items-center text-xs text-gray-600">
              <div className="animate-spin rounded-full h-3 w-3 border-2 border-indigo-500 border-t-transparent mr-1"></div>
              Loading...
            </div>
          ) : (
            <>
              <span className="text-sm font-medium text-gray-700 mr-2">{currentModelDetails?.name || 'AI'}</span>
              <button 
                onClick={() => setShowModelSelect(true)} 
                className="text-xs text-indigo-600 px-2 py-0.5 rounded-full bg-indigo-50 hover:bg-indigo-100 transition-colors"
              >
                Change
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main chat container */}
      {/* Chat messages with enhanced styling */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scroll-smooth" ref={chatContainerRef}>
        <div className="space-y-6" ref={messagesListRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center mt-12">
              <div className="w-34 h-34 mb-6 flex items-center justify-center">
                <img 
                  src="/src/assets/glass-chatpage.png" 
                  alt="Chat Page Background" 
                  className="h-36 w-36 object-contain"
                />
              </div>
              <h3 className="text-2xl font-semibold text-gray-800 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                Start a New Chat
              </h3>
              <p className="text-gray-600 mb-8 max-w-md">
                Ask questions, upload images, or generate images with the "/image" command
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg w-full">
                {[
                  { text: "Explain a concept", icon: <div className="p-1"><MessageSquare className="h-4 w-4" /></div> },
                  { text: "Upload & analyze image", icon: <div className="p-1"><Image className="h-4 w-4" /></div> },
                  { text: "/image a cat in space", icon: <div className="p-1"><Image className="h-4 w-4" /></div> },
                  { text: "Create a summary", icon: <div className="p-1"><Settings className="h-4 w-4" /></div> }
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (item.text.includes("Upload")) {
                        fileInputRef.current?.click();
                      } else {
                        setInput(item.text);
                        setTimeout(() => 
                          item.text.startsWith('/image') 
                            ? sendMessage(item.text) 
                            : sendMessage(item.text), 
                          500
                        );
                      }
                    }}
                    className="flex items-center p-1 text-left rounded-xl bg-white hover:bg-gray-50 shadow-sm hover:shadow border border-gray-100 transition-all duration-200 group"
                  >
                    <div className="h-10 w-10 rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 flex items-center justify-center mr-3 transition-colors duration-200">
                      {item.icon}
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => {
              const isUser = message.role === 'user';
              const prevUserMessage = isUser ? null : messages.slice(0, index)
                .reverse()
                .find(m => m.role === 'user');
              
              // Parse content for potentially complex messages
              let messageContent = message.content;
              let hasInlineImages = false;
              let contentParts: any[] = [];
              
              try {
                // Check if the content is a JSON string
                if (typeof messageContent === 'string' && 
                    (messageContent.startsWith('[') || messageContent.startsWith('{'))) {
                  try {
                    const parsed = JSON.parse(messageContent);
                    
                    if (Array.isArray(parsed)) {
                      contentParts = parsed;
                      // Check if any part contains inline data (images)
                      hasInlineImages = parsed.some(part => part.inlineData || part.inline_data);
                    } else if (parsed && typeof parsed === 'object') {
                      contentParts = [parsed];
                      hasInlineImages = parsed.inlineData || parsed.inline_data;
                    }
                  } catch (e) {
                    // Not valid JSON, use as-is
                    contentParts = [{ text: messageContent }];
                  }
                } else {
                  // Plain text message
                  contentParts = [{ text: messageContent }];
                }
              } catch (error) {
                console.error('Error parsing message content:', error);
                contentParts = [{ text: 'Error displaying message content' }];
              }
              
              // Get friendly timestamp
              const timestamp = message.created_at 
                ? new Date(message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                : '';
                
              return (
                <div 
                  key={message.id} 
                  className={`message-item flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex flex-col max-w-[85%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                    <div 
                      className={`message rounded-2xl p-4 shadow-sm ${
                        isUser 
                          ? 'bg-indigo-600 text-white' 
                          : 'bg-white/80 backdrop-blur-sm text-gray-800 border border-gray-100'
                      }`}
                    >
                      {/* Message content with images or text */}
                      <div className="space-y-3">
                        {contentParts.map((part, partIndex) => {
                          if (part.text) {
                            return (
                              <div key={`text-${partIndex}`} className="prose-sm">
                                {part.text}
                              </div>
                            );
                          } else if (part.inlineData || part.inline_data) {
                            const imgData = part.inlineData || part.inline_data;
                            if (imgData && imgData.data) {
                              return (
                                <div key={`img-${partIndex}`} className="mt-2 relative">
                                  <div className="rounded-lg overflow-hidden bg-gray-50/30 backdrop-blur-sm border border-gray-200 shadow-sm">
                                    <img 
                                      src={`data:${imgData.mimeType || 'image/png'};base64,${imgData.data}`}
                                      alt="Generated image" 
                                      className="max-w-full h-auto rounded-lg"
                                    />
                                  </div>
                                </div>
                              );
                            }
                          }
                          return null;
                        })}
                      </div>
                      
                      {/* For image attachments uploaded as files */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.attachments.map((attachment, i) => (
                            <div key={i} className="relative">
                              <div className="rounded-lg overflow-hidden bg-gray-50/30 backdrop-blur-sm border border-gray-200 shadow-sm">
                                <img 
                                  src={attachment} 
                                  alt={`Attachment ${i+1}`} 
                                  className="max-w-full h-auto rounded-lg"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Message timestamp */}
                    <div className={`text-xs text-gray-500 mt-1 px-2 ${isUser ? 'text-right' : 'text-left'}`}>
                      {timestamp}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Enhanced loading indicator */}
        {isProcessing && (
          <div className="flex justify-center my-6">
            <div className="px-4 py-2 rounded-full bg-white shadow-md flex items-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                <div className="w-2 h-2 md:w-2.5 md:h-2.5 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
              </div>
              <span className="text-sm text-gray-500 font-medium">AI is thinking...</span>
            </div>
          </div>
        )}
        
        {/* Reference for auto-scrolling */}
        <div ref={messageEndRef} />
      </div>
      
      {/* Image preview with enhanced design */}
      {selectedImage && (
        <div className="px-5 py-3 bg-indigo-50/70 backdrop-blur-sm">
          <div className="relative inline-block">
            <div className="rounded-lg overflow-hidden shadow-md border-2 border-white">
            <img 
              src={URL.createObjectURL(selectedImage)} 
              alt="Preview" 
                className="h-20 w-auto object-cover"
            />
            </div>
            <button 
              onClick={clearImage}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md border border-white hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
            <div className="absolute -bottom-2 right-0 left-0 flex justify-center">
              <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full shadow-sm border border-white flex items-center space-x-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                <span>Ready to send</span>
            </span>
            </div>
          </div>
        </div>
      )}

      {/* Bottom controls with glass morphism effect */}
      <form onSubmit={handleSubmit} className="p-4 md:px-6 md:py-5 bg-white/80 backdrop-blur-md rounded-t-3xl shadow-lg border-t border-white">
        <div className="flex gap-3 items-center max-w-6xl mx-auto">
          {/* Image upload button with enhanced states */}
          <div className="relative">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`w-12 h-12 flex items-center justify-center rounded-full shadow-md transition-all duration-300 
                ${isImageLoading ? 'bg-amber-500 text-white animate-pulse' : 
                  selectedImage ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white ring-2 ring-indigo-200' : 
                    'bg-white hover:bg-gray-50 text-indigo-600 hover:shadow-lg hover:-translate-y-0.5 border border-gray-200'
                }`}
              title="Upload image"
              disabled={isImageLoading}
            >
              {isImageLoading ? (
                <div className="animate-spin h-6 w-6 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Image size={20} />
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
            {/* Enhanced status indicators */}
            {selectedImage && (
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-medium bg-green-500 text-white px-2 py-0.5 rounded-full shadow-sm border border-white">
                Ready
              </span>
            )}
            {isImageLoading && (
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs font-medium bg-amber-500 text-white px-2 py-0.5 rounded-full shadow-sm border border-white animate-pulse">
                Processing...
              </span>
            )}
            {!selectedImage && !isImageLoading && (
              <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap text-xs text-gray-500 font-medium bg-white px-2 py-0.5 rounded-full shadow-sm border border-gray-100">
                Add image
              </span>
            )}
          </div>
          
          {/* Enhanced text input */}
          <div className="flex-1 bg-white rounded-2xl flex items-center pl-4 pr-2 py-2 shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow transition-all focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={`Type a message or "/image" to generate an image...`}
              className="bg-transparent flex-1 outline-none text-gray-800 placeholder-gray-500 text-sm md:text-base"
              disabled={isProcessing}
              autoFocus
            />
            <button 
              onClick={handleSubmit}
              disabled={isProcessing || (!input.trim() && !selectedImage)}
              className={`p-2 rounded-lg ${
                !isProcessing && (input.trim() || selectedImage)
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                  : 'bg-gray-100 text-gray-400'
              } transition-colors`}
              aria-label="Send message"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>
          
          {/* Concept cards button with enhanced styling */}
          <Link
            to="/concept-cards"
            className="h-12 w-12 md:h-14 md:w-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 active:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-indigo-400"
          >
            <Grid className="h-6 w-6 md:h-7 md:w-7 text-white" />
          </Link>
        </div>
      </form>

      {/* Database connection error banner */}
      {dbError && (
        <div className="fixed top-16 inset-x-0 px-4 z-50 flex justify-center pointer-events-none">
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded shadow-lg max-w-md pointer-events-auto">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium">Database Connection Error</p>
                <p className="text-xs mt-1">{dbError}</p>
                <div className="mt-2">
                  <button
                    onClick={() => setDbError(null)}
                    className="text-xs font-medium text-red-700 hover:text-red-500 focus:outline-none"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => setShowSqlSetup(true)}
                    className="ml-2 text-xs font-medium text-red-700 hover:text-red-500 focus:outline-none"
                  >
                    Show Setup SQL
                  </button>
                  <a
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      window.open('https://supabase.com/dashboard', '_blank');
                    }}
                    className="ml-4 text-xs font-medium text-red-700 hover:text-red-500 focus:outline-none"
                  >
                    Open Supabase Dashboard
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SQL Setup Instructions Dialog */}
      {showSqlSetup && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center">
              <h3 className="text-white font-medium flex items-center">
                <Database className="h-5 w-5 mr-2" />
                Database Setup Instructions
              </h3>
              <button onClick={() => setShowSqlSetup(false)} className="text-white hover:text-gray-200">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex-grow overflow-auto">
              <p className="mb-4 text-sm text-gray-600">
                Run the following SQL in your Supabase SQL Editor to create the necessary tables for this application:
              </p>
              <div className="relative">
                <pre className="bg-gray-800 text-gray-200 p-4 rounded-md text-xs overflow-x-auto">
                  <code>{supabaseService.getTableSetupInstructions()}</code>
                </pre>
                <button 
                  onClick={() => copyToClipboard(supabaseService.getTableSetupInstructions())}
                  className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white rounded p-1.5"
                  title="Copy to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                <h4 className="text-sm font-medium text-blue-700 flex items-center">
                  <Terminal className="h-4 w-4 mr-2" />
                  How to use these instructions
                </h4>
                <ol className="mt-2 text-xs text-blue-700 list-decimal list-inside">
                  <li className="mb-1">Open your <a href="https://supabase.com/dashboard" target="_blank" className="underline">Supabase dashboard</a></li>
                  <li className="mb-1">Select your project</li>
                  <li className="mb-1">Go to the SQL Editor tab</li>
                  <li className="mb-1">Paste the SQL code above</li>
                  <li className="mb-1">Click "Run" to execute the SQL</li>
                  <li>Return to this app and refresh the page</li>
                </ol>
              </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowSqlSetup(false)} 
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded mr-2"
              >
                Close
              </button>
              <button 
                onClick={() => copyToClipboard(supabaseService.getTableSetupInstructions())}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded hover:opacity-90"
              >
                Copy SQL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
