import { useState, useEffect } from "react";
import auraLogo from "@/assets/aura-logo.webp";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"pulse" | "fadeout">("pulse");

  useEffect(() => {
    const pulseTimer = setTimeout(() => setPhase("fadeout"), 1800);
    const finishTimer = setTimeout(() => onFinish(), 2400);
    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === "fadeout" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Glow ring */}
      <div className="relative">
        <div className="absolute inset-0 w-24 h-24 rounded-3xl bg-primary/20 blur-xl animate-[pulse_1.5s_ease-in-out_infinite]" />
        <div
          className={`relative w-24 h-24 rounded-3xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-2xl shadow-primary/30 transition-transform duration-700 ${
            phase === "pulse" ? "animate-[splash-pulse_1.5s_ease-in-out_infinite]" : "scale-90"
          }`}
        >
          <Camera className="w-11 h-11 text-primary-foreground" />
        </div>
      </div>

      <h1
        className={`mt-6 font-display text-2xl font-bold text-foreground tracking-tight transition-all duration-700 delay-300 ${
          phase === "pulse" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        Aura
      </h1>
      <p
        className={`mt-1 text-sm text-muted-foreground transition-all duration-700 delay-500 ${
          phase === "pulse" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        Gallery Keeper
      </p>
    </div>
  );
};

export default SplashScreen;
