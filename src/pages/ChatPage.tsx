import React, { useState } from "react";
import { Link } from "react-router-dom";
import ChatHeader from "@/components/ChatHeader";
import ChatHistory from "@/components/ChatHistory";
import ChatInput from "@/components/ChatInput";
import ModelSelectionMenu from "@/components/ModelSelectionMenu";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  hasImage?: boolean;
  imageUrl?: string;
  isReplyTo?: string;
}

const ChatPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! How can I help with your studies today?",
      sender: "ai",
      timestamp: new Date(Date.now() - 60000 * 5),
    },
  ]);

  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-pro");
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = (content: string, attachedImage?: File | null) => {
    // Generate a unique ID for the message
    const messageId = Date.now().toString();

    // Create the new user message
    const newUserMessage: Message = {
      id: messageId,
      content,
      sender: "user",
      timestamp: new Date(),
      hasImage: !!attachedImage,
      imageUrl: attachedImage ? URL.createObjectURL(attachedImage) : undefined,
    };

    // Add the user message to the chat
    setMessages((prev) => [...prev, newUserMessage]);

    // Simulate AI response (in a real app, this would call the Gemini API)
    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `This is a simulated response from the ${selectedModel} model. In a real implementation, this would be a response from the Google Gemini API.`,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiResponse]);
      setIsLoading(false);

      // In a real implementation, you would also generate and store a concept card here
    }, 1500);
  };

  const handleVoiceInput = () => {
    // In a real implementation, this would activate speech-to-text
    alert(
      "Voice input feature would be implemented here using a speech-to-text API",
    );
  };

  const handleReplyToMessage = (messageId: string) => {
    // Find the message being replied to
    const replyToMessage = messages.find((msg) => msg.id === messageId);

    if (replyToMessage) {
      // In a real implementation, you might pre-fill the input or show a visual indicator
      alert(`Replying to: ${replyToMessage.content.substring(0, 50)}...`);
    }
  };

  const handleModelSelect = (modelId: string) => {
    setSelectedModel(modelId);
    // In a real implementation, you would configure the API to use the selected model
    console.log(`Selected model: ${modelId}`);
  };

  return (
    <div className="flex flex-col h-screen bg-theme">
      <ChatHeader onModelSelect={() => setIsModelMenuOpen(true)} />

      <div className="flex-1 overflow-hidden">
        <ChatHistory
          messages={messages}
          onReplyToMessage={handleReplyToMessage}
        />
      </div>

      <ChatInput
        onSendMessage={handleSendMessage}
        onVoiceInput={handleVoiceInput}
        isLoading={isLoading}
      />

      <ModelSelectionMenu
        selectedModel={selectedModel}
        onModelSelect={handleModelSelect}
        isOpen={isModelMenuOpen}
        onOpenChange={setIsModelMenuOpen}
      />

      {/* Quick navigation to concept cards for development purposes */}
      <div className="fixed bottom-20 right-4 z-10">
        <Link to="/concept-cards" className="app-button inline-block shadow-lg">
          View Concept Cards
        </Link>
      </div>
    </div>
  );
};

export default ChatPage;
