import { useRef, useCallback } from 'react';

interface UseTapHandlerOptions {
  onTap: () => void;
  /** Maximum movement in pixels to still be considered a tap (default: 10) */
  threshold?: number;
  /** Maximum time in ms to be considered a tap (default: 300) */
  tapTimeout?: number;
}

/**
 * Hook to distinguish between tap and drag/scroll gestures on mobile
 *
 * Returns handlers for onClick, onTouchStart, onTouchMove, and onTouchEnd
 * that intelligently detect if user is tapping (to open) or dragging (to scroll)
 */
export function useTapHandler({
  onTap,
  threshold = 10,
  tapTimeout = 300
}: UseTapHandlerOptions) {
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);
  const hasMoved = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    hasMoved.current = false;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);

    // If user has moved beyond threshold, mark as moved (scrolling intent)
    if (deltaX > threshold || deltaY > threshold) {
      hasMoved.current = true;
    }
  }, [threshold]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartPos.current) return;

    const timeDelta = Date.now() - touchStartPos.current.time;
    const isQuickTap = timeDelta < tapTimeout;
    const didNotMove = !hasMoved.current;

    // Only trigger tap if it was quick AND user didn't move
    if (isQuickTap && didNotMove) {
      e.preventDefault(); // Prevent ghost click
      onTap();
    }

    // Reset
    touchStartPos.current = null;
    hasMoved.current = false;
  }, [onTap, tapTimeout]);

  const handleClick = useCallback(() => {
    // Desktop click - always trigger
    onTap();
  }, [onTap]);

  return {
    onClick: handleClick,
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };
}
