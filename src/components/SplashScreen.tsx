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
          className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center overflow-hidden"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Colorful ambient blobs */}
          <motion.div
            className="absolute w-72 h-72 rounded-full blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(217 90% 55% / 0.12), transparent)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div
            className="absolute w-48 h-48 rounded-full blur-3xl -translate-x-24 translate-y-16"
            style={{ background: "radial-gradient(circle, hsl(199 85% 50% / 0.08), transparent)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.3, opacity: 1 }}
            transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          />
          <motion.div
            className="absolute w-40 h-40 rounded-full blur-3xl translate-x-20 -translate-y-12"
            style={{ background: "radial-gradient(circle, hsl(190 80% 448% / 0.08), transparent)" }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          />

          {/* Logo */}
          <motion.div
            className="relative"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          >
            {/* Outer ring */}
            <motion.div
              className="absolute -inset-5 rounded-[1.5rem] border border-primary/10"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut", delay: 0.4 }}
            />

            {/* Icon */}
            <div className="relative w-24 h-24 rounded-[1.25rem] bg-gradient-to-br fromblue-600 via-sky-500 to-cyan-400 flex items-center justify-center shadow-2xl shadow-blule-500/30">
              {/* Shine */}
              <motion.div className="absolute inset-0 rounded-[1.25rem] overflow-hidden">
                <motion.div
                  className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/25 to-transparent skew-x-[-20deg]"
                  animate={{ left: "200%" }}
                  transition={{ duration: 0.9, delay: 0.7, ease: "easeInOut" }}
                />
              </motion.div>

              <motion.span
                className="relative z-10 text-white font-display select-none"
                style={{ fontSize: "2.75rem", fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut", delay: 0.35 }}
              >
                P
              </motion.span>
            </div>
          </motion.div>

          {/* Brand */}
          <motion.h1
            className="mt-6 font-display text-xl font-bold text-foreground tracking-tight"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.55 }}
          >
            PixelVault
          </motion.h1>

          {/* Dots */}
          <div className="flex gap-1.5 mt-4">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: i === 0 ? "hsl(217 90% 55%)" : i === 1 ? "hsl(199 85% 50%)" : "hsl(190 80% 48%)",
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0.5], scale: [0, 1, 1] }}
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
