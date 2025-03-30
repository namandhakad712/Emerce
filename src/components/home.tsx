import React from "react";
import { Link } from "react-router-dom";
import { Brain } from "lucide-react";

function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-theme">
      <div className="mb-6 flex items-center gap-3">
        <div className="bg-primary rounded-full p-2">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold">Chatterbox AI</h1>
      </div>
      <p className="text-lg text-center max-w-md mb-8">
        Revolutionize Your Learning Path with AI Guidance!
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/chat" className="app-button">
          Start Chatting
        </Link>
        <Link
          to="/concept-cards"
          className="px-6 py-3 bg-white text-black rounded-full hover:bg-white/90 transition-colors shadow-md"
        >
          View Concept Cards
        </Link>
      </div>

      <div className="mt-12 bg-white rounded-[2rem] p-6 shadow-lg max-w-md w-full">
        <h2 className="text-xl font-semibold mb-4">Automations</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-accent rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-medium mb-2">What is photosynthesis?</h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              Photosynthesis is the process by which plants convert light...
            </p>
          </div>
          <div className="bg-theme-light rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer">
            <h3 className="font-medium mb-2">How do plants use glucose?</h3>
            <p className="text-sm text-gray-600 line-clamp-2">
              Plants use glucose for energy through cellular respiration...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
