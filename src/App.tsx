import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ChatPage from "./pages/ChatPage";
import ConceptCardsPage from "./pages/ConceptCardsPage";
import TodoPage from "./pages/TodoPage";
import { AppProvider } from "./context/AppContext";
import { AnimationProvider } from "./context/AnimationContext";
import './App.css';

// Check if we're in offline mode (no Supabase)
const isOfflineMode = !import.meta.env.VITE_SUPABASE_URL || 
                      import.meta.env.VITE_SUPABASE_URL === 'your-supabase-url.supabase.co';

function App() {
  return (
    <AnimationProvider>
      <AppProvider>
        {isOfflineMode && (
          <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-xs md:text-sm text-center py-0.5 z-50">
            Running in offline mode — data will not be saved between sessions
          </div>
        )}
        <Router>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/concept-cards" element={<ConceptCardsPage />} />
            <Route path="/todos" element={<TodoPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AppProvider>
    </AnimationProvider>
  );
}

export default App;
