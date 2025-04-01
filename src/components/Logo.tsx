import React, { useState } from 'react';
import { useAppContext } from '../context/AppContext';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className }) => {
  const { createNewChat } = useAppContext();
  const [isClicked, setIsClicked] = useState(false);
  
  const handleLogoClick = () => {
    console.log('Logo clicked, creating new chat');
    setIsClicked(true);
    
    // Create new chat
    createNewChat();
    
    // Reset the clicked state after a delay
    setTimeout(() => {
      setIsClicked(false);
    }, 500);
  };
  
  return (
    <div 
      className={`flex items-center gap-2 cursor-pointer transition-transform ${isClicked ? 'scale-95' : 'scale-100'} ${className || ''}`}
      onClick={handleLogoClick}
      title="Start a new chat"
    >
      <div className={`h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-md overflow-hidden ${isClicked ? 'opacity-80' : 'opacity-100'}`}>
        <img 
          src="/images/molecule-icon.png"
          alt="Molecule icon" 
          className="w-7 h-7 object-contain"
          onError={(e) => {
            // If the image fails to load, show the data URL version
            console.log('Image failed to load, using embedded version');
            e.currentTarget.src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAyNCIgaGVpZ2h0PSIxMDI0IiB2aWV3Qm94PSIwIDAgMTAyNCAxMDI0IiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0zMzUgMjIwQzM2My43IDIwNC45IDQwMC4zIDIwNC45IDQyOSAyMjBMNTAxIDI2MkM1MjkuNyAyNzcuMSA1NDggMzA3LjEgNTQ4IDM0MFY0MjRDNTQ4IDQ1Ni45IDUyOS43IDQ4Ni45IDUwMSA1MDJMNDMwIDU0NEMzOTguNSA1NjAuNSAzNjEuMyA1NTkuNSAzMzUgNTQ0TDI2MyA1MDJDMjM0LjMgNDg2LjkgMjE2IDQ1Ni45IDIxNiA0MjRWMzQwQzIxNiAzMDcuMSAyMzQuMyAyNzcuMSAyNjMgMjYyTDMzNSAyMjBaIiBzdHJva2U9ImJsYWNrIiBzdHJva2VXaWR0aD0iMjAiIGZpbGw9IiNFNkVFRjYiLz48cGF0aCBkPSJNNjcwIDQ2MEM2OTguNyA0NDQuOSA3MzUuMyA0NDQuOSA3NjQgNDYwTDgzNiA1MDJDODY0LjcgNTE3LjEgODgzIDU0Ny4xIDg4MyA1ODBWNJY0Qzg4MyA2OTYuOSA4NjQuNyA3MjYuOSA4MzYgNzQyTDc2NCA3ODRDNzM1LjMgNzk5LjEgNjk4LjcgNzk5LjEgNjcwIDc4NEw1OTggNzQyQzU2OS4zIDcyNi45IDU1MSA2OTYuOSA1NTEgNjY0VjU4MEM1NTEgNTQ3LjEgNTY5LjMgNTE3LjEgNTk4IDUwMkw2NzAgNDYwWiIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlV2lkdGg9IjIwIiBmaWxsPSIjRTZGNkY3Ii8+PHBhdGggZD0iTTUwMCA2MDBDNTI4LjcgNTg0LjkgNTY1LjMgNTg0LjkgNTk0IDYwMEw2NjYgNjQyQzY5NC43IDY1Ny4xIDcxMyA2ODcuMSA3MTMgNzIwVjgwNEM3MTMgODM2LjkgNjk0LjcgODY2LjkgNjY2IDg4Mkw1OTQgOTI0QzU2NS4zIDkzOS4xIDUyOC43IDkzOS4xIDUwMCA5MjRMNDI4IDg4MkMzOTkuMyA4NjYuOSAzODEgODM2LjkgMzgxIDgwNFY3MjBDMzgxIDY4Ny4xIDM5OS4zIDY1Ny4xIDQyOCA2NDJMNTA2IDYwMFoiIHN0cm9rZT0iYmxhY2siIHN0cm9rZVdpZHRoPSIyMCIgZmlsbD0iI0U2RjZGNyIvPjxwYXRoIGQ9Ik0zMzUgNzAwQzM2My43IDY4NC45IDQwMC4zIDY4NC45IDQyOSA3MDBMNTAxIDc0MkM1MjkuNyA3NTcuMSA1NDggNzg3LjEgNTQ4IDgyMFY5MDRDNTQ4IDkzNi45IDUyOS43IDk2Ni45IDUwMSA5ODJMNDM5IDEwMjRDNDAwLjMgMTAzOS4xIDM2My43IDEwMzkuMSAzMzUgMTAyNEwyNjMgOTgyQzIzNC4zIDk2Ni45IDIxNiA5MzYuOSAyMTYgOTA0VjgyMEMyMTYgNzg3LjEgMjM0LjMgNzU3LjEgMjYzIDc0MkwzMzUgNzAwWiIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlV2lkdGg9IjIwIiBmaWxsPSIjRTZFRUY2Ii8+PGNpcmNsZSBjeD0iMjkwIiBjeT0iNTc1IiByPSI1MCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlV2lkdGg9IjIwIiBmaWxsPSJ3aGl0ZSIvPjxjaXJjbGUgY3g9Ijc3MCIgY3k9IjkwMCIgcj0iNTAiIHN0cm9rZT0iYmxhY2siIHN0cm9rZVdpZHRoPSIyMCIgZmlsbD0id2hpdGUiLz48L3N2Zz4=";
          }}
        />
      </div>
      <span className={`font-bold text-xl bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent hover:from-blue-800 hover:to-indigo-700 transition-colors ${isClicked ? 'opacity-80' : 'opacity-100'}`}>
        Emerce
      </span>
    </div>
  );
};

export default Logo; 