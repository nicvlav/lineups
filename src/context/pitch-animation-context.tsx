import { createContext, useContext, useState, useCallback, useRef } from 'react';

interface PitchAnimationContextType {
  shouldAnimate: boolean;
  animationSource: 'formation' | 'generation' | 'none';
  triggerAnimation: (source: 'formation' | 'generation') => void;
  clearAnimation: () => void;
  isAnimating: boolean;
  setIsAnimating: (value: boolean) => void;
}

const PitchAnimationContext = createContext<PitchAnimationContextType | undefined>(undefined);

export const usePitchAnimation = () => {
  const context = useContext(PitchAnimationContext);
  if (!context) {
    throw new Error('usePitchAnimation must be used within a PitchAnimationProvider');
  }
  return context;
};

interface PitchAnimationProviderProps {
  children: React.ReactNode;
}

export const PitchAnimationProvider: React.FC<PitchAnimationProviderProps> = ({ children }) => {
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [animationSource, setAnimationSource] = useState<'formation' | 'generation' | 'none'>('none');
  const [isAnimating, setIsAnimatingState] = useState(false);
  const animationTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const triggerAnimation = useCallback((source: 'formation' | 'generation') => {
    // Clear any existing timeout
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }

    setShouldAnimate(true);
    setAnimationSource(source);
    setIsAnimatingState(true);

    // Auto-clear after animation completes (adjust timing as needed)
    animationTimeoutRef.current = setTimeout(() => {
      setShouldAnimate(false);
      setAnimationSource('none');
      setIsAnimatingState(false);
    }, 1500); // Adjust based on your animation duration
  }, []);

  const clearAnimation = useCallback(() => {
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    setShouldAnimate(false);
    setAnimationSource('none');
    setIsAnimatingState(false);
  }, []);

  return (
    <PitchAnimationContext.Provider 
      value={{ 
        shouldAnimate, 
        animationSource, 
        triggerAnimation, 
        clearAnimation,
        isAnimating,
        setIsAnimating: setIsAnimatingState
      }}
    >
      {children}
    </PitchAnimationContext.Provider>
  );
};