import { useEffect, useState } from 'react';

// Phones (< 768px, Bootstrap "md") get card lists instead of wide tables
const COMPACT_MAX_WIDTH = 767;

export function useIsCompactViewport(): boolean {
  const [isCompact, setIsCompact] = useState(() => window.innerWidth <= COMPACT_MAX_WIDTH);
  useEffect(() => {
    const onResize = () => setIsCompact(window.innerWidth <= COMPACT_MAX_WIDTH);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return isCompact;
}
