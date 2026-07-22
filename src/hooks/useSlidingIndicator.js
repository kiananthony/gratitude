import { useRef, useState, useLayoutEffect, useEffect, useCallback } from 'react';

// Measures the position/size of whichever child is currently "active" (by key)
// relative to a container, so a single indicator element can slide smoothly
// between positions instead of each item toggling its own background on/off.
// Works for both horizontal (tab bar) and vertical (sidebar) layouts — the
// caller just reads whichever of left/width or top/height it needs.
export function useSlidingIndicator(activeKey) {
  const containerRef = useRef(null);
  const itemRefs = useRef({});
  const [rect, setRect] = useState(null);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const el = itemRefs.current[activeKey];
    if (!container || !el) return;
    const cr = container.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    setRect({ left: er.left - cr.left, top: er.top - cr.top, width: er.width, height: er.height });
  }, [activeKey]);

  useLayoutEffect(() => { measure(); }, [measure]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const setItemRef = (key) => (el) => { itemRefs.current[key] = el; };

  return { containerRef, setItemRef, rect };
}
