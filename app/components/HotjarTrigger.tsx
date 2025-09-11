'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    hj: ((...args: any[]) => void) & { q?: any[] };
  }
}

const HotjarTrigger = () => {
  useEffect(() => {
    const handleMouseLeave = (event: MouseEvent) => {
      if (event.clientY <= 0) {
        window.hj = window.hj || function() {
            (window.hj.q = window.hj.q || []).push(arguments)
        };
        window.hj('trigger', 'abandon_page');
        document.removeEventListener('mouseleave', handleMouseLeave);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return null;
};

export default HotjarTrigger;
