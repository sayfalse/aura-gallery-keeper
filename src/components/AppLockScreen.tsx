import { useState, useEffect, useCallback } from "react";
import { Lock } from "lucide-react";

const PIN_HASH_STORAGE_KEY = "app_lock_pin_hash";
const PIN_SALT_STORAGE_KEY = "app_lock_pin_salt";
const LOCK_TIMEOUT_KEY = "app_lock_timeout";
const LAST_ACTIVE_KEY = "app_lock_last_active";
const LOCK_ENABLED_KEY = "app_lock_enabled";
const FAILED_ATTEMPTS_KEY = "app_lock_failed_attempts";
const LOCKOUT_UNTIL_KEY = "app_lock_lockout_until";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/** Derive a key using PBKDF2 and return hex hash */
async function hashPinPBKDF2(pin: string, salt: Uint8Array): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt.buffer as ArrayBuffer, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getSalt(): Uint8Array {
  const stored = localStorage.getItem(PIN_SALT_STORAGE_KEY);
  if (stored) {
    return new Uint8Array(JSON.parse(stored));
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(PIN_SALT_STORAGE_KEY, JSON.stringify(Array.from(salt)));
  return salt;
}

export const getAppLockSettings = () => ({
  enabled: localStorage.getItem(LOCK_ENABLED_KEY) === "true",
  timeout: parseInt(localStorage.getItem(LOCK_TIMEOUT_KEY) || "0", 10),
  hasPin: !!localStorage.getItem(PIN_HASH_STORAGE_KEY),
});

export const setAppLockEnabled = (enabled: boolean) => {
  localStorage.setItem(LOCK_ENABLED_KEY, String(enabled));
};

export const setAppLockTimeout = (seconds: number) => {
  localStorage.setItem(LOCK_TIMEOUT_KEY, String(seconds));
};

export const setAppLockPin = async (pin: string) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem(PIN_SALT_STORAGE_KEY, JSON.stringify(Array.from(salt)));
  const hashed = await hashPinPBKDF2(pin, salt);
  localStorage.setItem(PIN_HASH_STORAGE_KEY, hashed);
  // Reset failed attempts on PIN change
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_UNTIL_KEY);
};

export const removeAppLock = () => {
  localStorage.removeItem(PIN_HASH_STORAGE_KEY);
  localStorage.removeItem(PIN_SALT_STORAGE_KEY);
  localStorage.removeItem(LOCK_ENABLED_KEY);
  localStorage.removeItem(LOCK_TIMEOUT_KEY);
  localStorage.removeItem(LAST_ACTIVE_KEY);
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_UNTIL_KEY);
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

function getFailedAttempts(): number {
  return parseInt(localStorage.getItem(FAILED_ATTEMPTS_KEY) || "0", 10);
}

function getLockoutUntil(): number {
  return parseInt(localStorage.getItem(LOCKOUT_UNTIL_KEY) || "0", 10);
}

function isLockedOut(): boolean {
  const until = getLockoutUntil();
  return until > Date.now();
}

function recordFailedAttempt(): boolean {
  const attempts = getFailedAttempts() + 1;
  localStorage.setItem(FAILED_ATTEMPTS_KEY, String(attempts));
  if (attempts >= MAX_ATTEMPTS) {
    localStorage.setItem(LOCKOUT_UNTIL_KEY, String(Date.now() + LOCKOUT_DURATION_MS));
    localStorage.setItem(FAILED_ATTEMPTS_KEY, "0");
    return true; // now locked out
  }
  return false;
}

function resetFailedAttempts() {
  localStorage.removeItem(FAILED_ATTEMPTS_KEY);
  localStorage.removeItem(LOCKOUT_UNTIL_KEY);
}

interface AppLockScreenProps {
  onUnlock: () => void;
}

const AppLockScreen = ({ onUnlock }: AppLockScreenProps) => {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [lockedOut, setLockedOut] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);
  const maxLength = 4;

  // Check lockout on mount and update timer
  useEffect(() => {
    const checkLockout = () => {
      const until = getLockoutUntil();
      if (until > Date.now()) {
        setLockedOut(true);
        setLockoutRemaining(Math.ceil((until - Date.now()) / 1000));
      } else {
        setLockedOut(false);
        setLockoutRemaining(0);
      }
    };
    checkLockout();
    const interval = setInterval(checkLockout, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDigit = useCallback((digit: string) => {
    if (lockedOut || pin.length >= maxLength) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError(false);

    if (newPin.length === maxLength) {
      const salt = getSalt();
      hashPinPBKDF2(newPin, salt).then((hashed) => {
        const stored = localStorage.getItem(PIN_HASH_STORAGE_KEY);
        if (hashed === stored) {
          resetFailedAttempts();
          updateLastActive();
          onUnlock();
        } else {
          const nowLockedOut = recordFailedAttempt();
          setError(true);
          if (nowLockedOut) {
            setLockedOut(true);
            setLockoutRemaining(Math.ceil(LOCKOUT_DURATION_MS / 1000));
          }
          setTimeout(() => {
            setPin("");
            setError(false);
          }, 600);
        }
      });
    }
  }, [pin, onUnlock, lockedOut]);

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center">
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground">PixelVault Locked</h1>
        {lockedOut ? (
          <p className="text-sm text-destructive mt-1">
            Too many attempts. Try again in {formatTime(lockoutRemaining)}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">Enter your PIN to unlock</p>
        )}
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
              disabled={lockedOut}
              className="h-16 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors text-lg disabled:opacity-40"
            >
              ⌫
            </button>
          ) : (
            <button
              key={i}
              onClick={() => handleDigit(d)}
              disabled={lockedOut}
              className="h-16 rounded-2xl bg-secondary hover:bg-accent transition-colors flex items-center justify-center text-xl font-semibold text-foreground active:scale-95 disabled:opacity-40"
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
