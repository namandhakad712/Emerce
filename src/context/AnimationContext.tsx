import React, { createContext, useContext, useRef, ReactNode } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins
gsap.registerPlugin(ScrollTrigger);

interface AnimationContextType {
  gsapInstance: typeof gsap;
}

const AnimationContext = createContext<AnimationContextType | undefined>(undefined);

export const AnimationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const gsapInstance = gsap;

  return (
    <AnimationContext.Provider value={{ gsapInstance }}>
      {children}
    </AnimationContext.Provider>
  );
};

export const useAnimation = (): AnimationContextType => {
  const context = useContext(AnimationContext);
  if (context === undefined) {
    throw new Error('useAnimation must be used within an AnimationProvider');
  }
  return context;
}; 