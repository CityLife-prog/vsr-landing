// context/MobileContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface MobileContextType {
  isMobile: boolean;
}

const MobileContext = createContext<MobileContextType>({ isMobile: false });

export const MobileProvider = ({ children }: { children: ReactNode }) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile(); // Run once on mount
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <MobileContext.Provider value={{ isMobile }}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobile = () => useContext(MobileContext);
