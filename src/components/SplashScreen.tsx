import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2200);
    const finish = setTimeout(() => onFinish(), 2800);
    return () => { clearTimeout(timer); clearTimeout(finish); };
  }, [onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Ambient glow */}
          <motion.div
            className="absolute w-64 h-64 rounded-full bg-primary/8 blur-3xl"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Logo container */}
          <motion.div
            className="relative"
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            {/* Soft ring */}
            <motion.div
              className="absolute -inset-5 rounded-3xl border border-primary/15"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            />

            {/* Icon box */}
            <div className="relative w-24 h-24 rounded-[1.25rem] bg-gradient-to-br from-primary via-primary/90 to-primary/70 flex items-center justify-center shadow-lg shadow-primary/25">
              {/* Shine sweep */}
              <motion.div
                className="absolute inset-0 rounded-[1.25rem] overflow-hidden"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <motion.div
                  className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-[-20deg]"
                  animate={{ left: "200%" }}
                  transition={{ duration: 0.8, delay: 0.8, ease: "easeInOut" }}
                />
              </motion.div>

              {/* Letter */}
              <motion.span
                className="relative z-10 text-primary-foreground font-display select-none"
                style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
              >
                P
              </motion.span>
            </div>
          </motion.div>

          {/* Brand name */}
          <motion.h1
            className="mt-6 font-display text-xl font-bold text-foreground tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.55 }}
          >
            PixelVault
          </motion.h1>

          {/* Subtle tagline dot loader */}
          <div className="flex gap-1 mt-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1 h-1 rounded-full bg-muted-foreground/40"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0.4], scale: [0, 1, 1] }}
                transition={{ duration: 1.2, delay: 0.8 + i * 0.15, ease: "easeOut" }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
