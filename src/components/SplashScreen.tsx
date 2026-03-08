import { useState, useEffect } from "react";

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen = ({ onFinish }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"intro" | "pulse" | "fadeout">("intro");

  useEffect(() => {
    const introTimer = setTimeout(() => setPhase("pulse"), 100);
    const pulseTimer = setTimeout(() => setPhase("fadeout"), 2000);
    const finishTimer = setTimeout(() => onFinish(), 2600);
    return () => {
      clearTimeout(introTimer);
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
      {/* Animated "A" letter */}
      <div className="relative">
        {/* Outer glow ring */}
        <div
          className={`absolute -inset-4 rounded-full transition-all duration-1000 ${
            phase !== "intro"
              ? "bg-primary/15 blur-2xl scale-100 opacity-100"
              : "bg-primary/0 blur-xl scale-50 opacity-0"
          }`}
          style={{ animation: phase === "pulse" ? "splash-glow 1.8s ease-in-out infinite" : undefined }}
        />

        {/* Inner glow */}
        <div
          className={`absolute -inset-2 rounded-full transition-all duration-700 ${
            phase !== "intro"
              ? "bg-primary/10 blur-lg scale-100 opacity-100"
              : "bg-primary/0 blur-md scale-50 opacity-0"
          }`}
        />

        {/* The "A" container */}
        <div
          className={`relative w-28 h-28 rounded-2xl flex items-center justify-center transition-all duration-700 ${
            phase === "intro"
              ? "scale-50 opacity-0 rotate-12"
              : phase === "pulse"
                ? "scale-100 opacity-100 rotate-0"
                : "scale-90 opacity-0 rotate-0"
          }`}
          style={{
            animation: phase === "pulse" ? "splash-pulse 1.5s ease-in-out infinite" : undefined,
          }}
        >
          {/* Background shape */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-[0_0_40px_rgba(var(--primary),0.3)]" />

          {/* Decorative line accents */}
          <div
            className={`absolute top-2 left-2 right-2 h-px bg-primary-foreground/20 transition-all duration-1000 delay-300 ${
              phase !== "intro" ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
            }`}
          />
          <div
            className={`absolute bottom-2 left-2 right-2 h-px bg-primary-foreground/20 transition-all duration-1000 delay-500 ${
              phase !== "intro" ? "opacity-100 scale-x-100" : "opacity-0 scale-x-0"
            }`}
          />

          {/* The letter */}
          <span
            className="relative z-10 text-primary-foreground font-display select-none"
            style={{
              fontSize: "3.5rem",
              fontWeight: 700,
              letterSpacing: "-0.04em",
              textShadow: "0 2px 12px rgba(0,0,0,0.15)",
              lineHeight: 1,
            }}
          >
             P
          </span>
        </div>
      </div>

      {/* Brand name */}
      <h1
        className={`mt-7 font-display text-2xl font-bold text-foreground tracking-tight transition-all duration-700 delay-200 ${
          phase === "pulse" ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
        }`}
      >
        Aura
      </h1>
    </div>
  );
};

export default SplashScreen;
