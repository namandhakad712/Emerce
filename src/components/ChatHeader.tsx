import React from "react";
import { Menu, Brain } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Link } from "react-router-dom";

interface ChatHeaderProps {
  onModelSelect?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  onModelSelect = () => {},
}) => {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-theme w-full">
      <div className="flex items-center space-x-2">
        <div className="bg-primary rounded-full p-1.5">
          <Brain className="h-5 w-5 text-white" />
        </div>
        <h1 className="text-xl font-semibold">Chatterbox AI</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="rounded-full bg-white/50 border-0"
        >
          <span className="sr-only">Back</span>
          &lt;
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full bg-white/50 border-0"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl">
            <DropdownMenuItem onClick={onModelSelect}>
              Select AI Model
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/concept-cards">Concept Cards</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default ChatHeader;
