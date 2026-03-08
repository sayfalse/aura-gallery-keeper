import { useState, useRef, useCallback, ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
}

const THRESHOLD = 80;

const PullToRefresh = ({ onRefresh, children, className = "" }: PullToRefreshProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const pulling = useRef(false);
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, THRESHOLD], [0, 1]);
  const scale = useTransform(y, [0, THRESHOLD], [0.5, 1]);
  const rotate = useTransform(y, [0, THRESHOLD * 2], [0, 360]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    const el = containerRef.current;
    if (el && el.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const diff = Math.max(0, e.touches[0].clientY - startY.current);
    // Dampen the pull
    const dampened = Math.min(diff * 0.5, THRESHOLD * 1.5);
    y.set(dampened);
  }, [refreshing, y]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || refreshing) return;
    pulling.current = false;
    
    if (y.get() >= THRESHOLD) {
      setRefreshing(true);
      animate(y, THRESHOLD * 0.6, { duration: 0.2 });
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        animate(y, 0, { duration: 0.3 });
      }
    } else {
      animate(y, 0, { duration: 0.3 });
    }
  }, [onRefresh, refreshing, y]);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-y-auto ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex items-center justify-center z-10 pointer-events-none"
        style={{ height: y }}
      >
        <motion.div
          style={{ opacity, scale }}
          className="flex items-center justify-center"
        >
          <motion.div style={{ rotate: refreshing ? undefined : rotate }}>
            <Loader2
              className={`w-5 h-5 text-primary ${refreshing ? "animate-spin" : ""}`}
            />
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content shifted down */}
      <motion.div style={{ y }}>
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
