import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  User,
  Image as ImageIcon,
  CornerDownRight,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  hasImage?: boolean;
  imageUrl?: string;
  isReplyTo?: string;
}

interface ChatHistoryProps {
  messages?: Message[];
  onReplyToMessage?: (messageId: string) => void;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  messages = [
    {
      id: "1",
      content: "Hello! How can I help with your studies today?",
      sender: "ai",
      timestamp: new Date(Date.now() - 60000 * 5),
    },
    {
      id: "2",
      content: "Can you explain the concept of photosynthesis?",
      sender: "user",
      timestamp: new Date(Date.now() - 60000 * 4),
    },
    {
      id: "3",
      content:
        "Photosynthesis is the process by which green plants and some other organisms use sunlight to synthesize foods with the help of chlorophyll. During this process, plants convert light energy into chemical energy, which is stored in the bonds of glucose molecules. The process primarily takes place in the chloroplasts of plant cells, especially in the leaves. The basic equation for photosynthesis is: 6CO₂ + 6H₂O + light energy → C₆H₁₂O₆ + 6O₂. This process is essential for life on Earth as it produces oxygen and serves as the primary source of energy for most ecosystems.",
      sender: "ai",
      timestamp: new Date(Date.now() - 60000 * 3),
    },
    {
      id: "4",
      content: "Can you also explain the light-dependent reactions?",
      sender: "user",
      timestamp: new Date(Date.now() - 60000 * 2),
      isReplyTo: "3",
    },
    {
      id: "5",
      content:
        "The light-dependent reactions are the first stage of photosynthesis, where light energy is captured and converted to chemical energy. These reactions take place in the thylakoid membrane of the chloroplasts and require direct light to proceed. During this stage, water molecules are split, releasing oxygen as a byproduct, and light energy is converted into chemical energy in the form of ATP and NADPH, which are then used in the light-independent reactions (Calvin cycle) to produce glucose.",
      sender: "ai",
      timestamp: new Date(Date.now() - 60000),
    },
  ],
  onReplyToMessage = () => {},
}) => {
  return (
    <div className="w-full h-full bg-theme flex flex-col">
      <ScrollArea className="flex-1 p-4">
        <div className="flex flex-col space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex ${message.sender === "user" ? "flex-row-reverse" : "flex-row"} max-w-[80%] gap-3`}
              >
                <div className="flex-shrink-0 mt-1">
                  {message.sender === "user" ? (
                    <Avatar className="h-8 w-8 bg-primary">
                      <User className="h-5 w-5 text-white" />
                    </Avatar>
                  ) : (
                    <Avatar className="h-8 w-8 bg-secondary">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </Avatar>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  {message.isReplyTo && (
                    <div className="flex items-center text-xs text-muted-foreground mb-1">
                      <CornerDownRight className="h-3 w-3 mr-1" />
                      <span>Replying to previous message</span>
                    </div>
                  )}

                  <Card
                    className={`p-4 ${message.sender === "user" ? "user-message" : "ai-message"}`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>

                    {message.hasImage && message.imageUrl && (
                      <div className="mt-2">
                        <div className="relative rounded-md overflow-hidden">
                          <img
                            src={message.imageUrl}
                            alt="Uploaded content"
                            className="max-w-full h-auto object-cover"
                          />
                          <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                            <ImageIcon className="h-4 w-4 text-white" />
                          </div>
                        </div>
                      </div>
                    )}
                  </Card>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {message.sender === "ai" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => onReplyToMessage(message.id)}
                      >
                        <CornerDownRight className="h-3 w-3 mr-1" />
                        Reply
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatHistory;
