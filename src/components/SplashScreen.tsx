import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 2400);
    const finish = setTimeout(() => onFinish(), 3000);
    return () => { clearTimeout(timer); clearTimeout(finish); };
  }, [onFinish]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center overflow-hidden"
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        >
          {/* Animated radial rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-primary/10"
              style={{ width: 200 + i * 120, height: 200 + i * 120 }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: [0, 0.6, 0.2] }}
              transition={{ duration: 2, delay: 0.2 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}

          {/* Soft ambient glow */}
          <motion.div
            className="absolute w-80 h-80 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(217 90% 55% / 0.10), hsl(199 85% 50% / 0.05), transparent 70%)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.6, 1.4], opacity: [0, 1, 0.7] }}
            transition={{ duration: 2.2, ease: [0.22, 1, 0.36, 1] }}
          />

          {/* Logo group */}
          <motion.div
            className="relative z-10"
            initial={{ scale: 0.3, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          >
            {/* Shadow beneath */}
            <motion.div
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-16 h-3 rounded-full bg-primary/10 blur-md"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            />

            {/* Icon box */}
            <div className="relative w-[5.5rem] h-[5.5rem] rounded-[1.375rem] bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-blue-500/35">
              {/* Inner highlight */}
              <div className="absolute inset-[1px] rounded-[1.3rem] bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

              {/* Shine sweep */}
              <motion.div className="absolute inset-0 rounded-[1.375rem] overflow-hidden">
                <motion.div
                  className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
                  initial={{ left: "-100%" }}
                  animate={{ left: "200%" }}
                  transition={{ duration: 0.7, delay: 1.1, ease: "easeInOut" }}
                />
              </motion.div>

              {/* Letter P */}
              <motion.span
                className="relative z-10 text-white font-display select-none"
                style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.5 }}
              >
                P
              </motion.span>
            </div>
          </motion.div>

          {/* Brand name — letter-by-letter */}
          <div className="mt-7 flex overflow-hidden">
            {"PixelVault".split("").map((char, i) => (
              <motion.span
                key={i}
                className="font-display text-xl font-bold text-foreground"
                style={{ display: "inline-block" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.7 + i * 0.04, ease: "easeOut" }}
              >
                {char}
              </motion.span>
            ))}
          </div>

          {/* Animated line */}
          <motion.div
            className="mt-5 h-[2px] rounded-full bg-gradient-to-r from-transparent via-primary to-transparent"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 64, opacity: [0, 1, 0.5] }}
            transition={{ duration: 1.2, delay: 1.2, ease: "easeOut" }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SplashScreen;
