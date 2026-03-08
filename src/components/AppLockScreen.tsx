import { useState, useEffect, useCallback } from "react";
import { Cloud, Lock, Fingerprint } from "lucide-react";

const PIN_HASH_STORAGE_KEY = "app_lock_pin_hash";
const LOCK_TIMEOUT_KEY = "app_lock_timeout";
const LAST_ACTIVE_KEY = "app_lock_last_active";
const LOCK_ENABLED_KEY = "app_lock_enabled";

export const getAppLockSettings = () => ({
  enabled: localStorage.getItem(LOCK_ENABLED_KEY) === "true",
  timeout: parseInt(localStorage.getItem(LOCK_TIMEOUT_KEY) || "0", 10),
  hasPin: !!localStorage.getItem(PIN_STORAGE_KEY),
});

export const setAppLockEnabled = (enabled: boolean) => {
  localStorage.setItem(LOCK_ENABLED_KEY, String(enabled));
};

export const setAppLockTimeout = (seconds: number) => {
  localStorage.setItem(LOCK_TIMEOUT_KEY, String(seconds));
};

export const setAppLockPin = (pin: string) => {
  localStorage.setItem(PIN_STORAGE_KEY, pin);
};

export const removeAppLock = () => {
  localStorage.removeItem(PIN_STORAGE_KEY);
  localStorage.removeItem(LOCK_ENABLED_KEY);
  localStorage.removeItem(LOCK_TIMEOUT_KEY);
  localStorage.removeItem(LAST_ACTIVE_KEY);
};

export const updateLastActive = () => {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
};

export const shouldShowLockScreen = (): boolean => {
  const settings = getAppLockSettings();
  if (!settings.enabled || !settings.hasPin) return false;
  const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || "0", 10);
  if (lastActive === 0) return true;
  const elapsed = (Date.now() - lastActive) / 1000;
  return elapsed >= settings.timeout;
};

interface AppLockScreenProps {
  onUnlock: () => void;
}

const AppLockScreen = ({ onUnlock }: AppLockScreenProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const maxLength = 4;

  const handleDigit = useCallback((digit: string) => {
    if (pin.length >= maxLength) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === maxLength) {
      const stored = localStorage.getItem(PIN_STORAGE_KEY);
      if (newPin === stored) {
        updateLastActive();
        onUnlock();
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 600);
      }
    }
  }, [pin, onUnlock]);

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") handleDigit(e.key);
      else if (e.key === "Backspace") handleDelete();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleDigit]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center">
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground">PixelVault Locked</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter your PIN to unlock</p>
      </div>

      {/* PIN dots */}
      <div className="flex gap-4 mb-10">
        {Array.from({ length: maxLength }).map((_, i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              error
                ? "bg-destructive animate-shake"
                : i < pin.length
                ? "bg-primary scale-110"
                : "bg-border"
            }`}
          />
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-[260px]">
        {digits.map((d, i) =>
          d === "" ? (
            <div key={i} />
          ) : d === "⌫" ? (
            <button
              key={i}
              onClick={handleDelete}
              className="h-16 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors text-lg"
            >
              ⌫
            </button>
          ) : (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              className="h-16 rounded-2xl bg-secondary hover:bg-accent transition-colors flex items-center justify-center text-xl font-semibold text-foreground active:scale-95"
            >
              {d}
            </button>
          )
        )}
      </div>
    </div>
  );
};

export default AppLockScreen;
