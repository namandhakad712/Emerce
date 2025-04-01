import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Ensure ScrollTrigger is registered
gsap.registerPlugin(ScrollTrigger);

type ElementRef = React.RefObject<HTMLElement>;

export const useGSAPAnimations = () => {
  // Fade in animation
  const fadeIn = (element: ElementRef, delay = 0, duration = 0.8) => {
    useEffect(() => {
      if (!element.current) return;
      
      gsap.fromTo(
        element.current,
        { opacity: 0, y: 20 },
        { 
          opacity: 1, 
          y: 0, 
          duration, 
          delay,
          ease: "power2.out" 
        }
      );
    }, [element, delay, duration]);

    return element;
  };

  // Stagger animation for lists
  const staggerItems = (elements: ElementRef, staggerAmount = 0.1, delay = 0) => {
    useEffect(() => {
      if (!elements.current) return;
      
      const items = elements.current.children;
      
      gsap.fromTo(
        items,
        { opacity: 0, y: 20 },
        { 
          opacity: 1, 
          y: 0, 
          duration: 0.6, 
          stagger: staggerAmount,
          delay,
          ease: "power2.out" 
        }
      );
    }, [elements, staggerAmount, delay]);

    return elements;
  };

  // Scroll reveal animation
  const scrollReveal = (element: ElementRef, delay = 0) => {
    useEffect(() => {
      if (!element.current) return;
      
      gsap.fromTo(
        element.current,
        { opacity: 0, y: 40 },
        { 
          scrollTrigger: {
            trigger: element.current,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse"
          },
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay,
          ease: "power2.out"
        }
      );
      
      return () => {
        // Clean up the ScrollTrigger instance when component unmounts
        ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      };
    }, [element, delay]);

    return element;
  };

  // Animated counter
  const animateCounter = (element: ElementRef, endValue: number, duration = 2) => {
    useEffect(() => {
      if (!element.current) return;
      
      let startValue = 0;
      
      gsap.to({}, {
        duration,
        onUpdate: function() {
          const currentValue = Math.round(startValue + (endValue - startValue) * this.progress());
          if (element.current) {
            element.current.textContent = currentValue.toString();
          }
        },
        ease: "power2.inOut"
      });
    }, [element, endValue, duration]);

    return element;
  };

  // Text reveal animation
  const textReveal = (element: ElementRef, delay = 0) => {
    useEffect(() => {
      if (!element.current) return;
      
      const text = element.current;
      
      // Split text into words
      const splitText = text.textContent?.split(' ') || [];
      text.textContent = '';
      
      // Create spans for each word
      splitText.forEach((word, i) => {
        const wordSpan = document.createElement('span');
        wordSpan.style.display = 'inline-block';
        wordSpan.style.overflow = 'hidden';
        
        const innerSpan = document.createElement('span');
        innerSpan.textContent = word + (i < splitText.length - 1 ? ' ' : '');
        innerSpan.style.display = 'inline-block';
        innerSpan.style.transform = 'translateY(100%)';
        
        wordSpan.appendChild(innerSpan);
        text.appendChild(wordSpan);
      });
      
      // Animate each word
      gsap.to(text.querySelectorAll('span > span'), {
        y: 0,
        duration: 0.8,
        stagger: 0.05,
        delay,
        ease: "power2.out"
      });
    }, [element, delay]);

    return element;
  };

  return {
    fadeIn,
    staggerItems,
    scrollReveal,
    animateCounter,
    textReveal
  };
}; 