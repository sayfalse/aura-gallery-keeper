import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Volume2, Loader2, X } from "lucide-react";
import { toast } from "sonner";

interface VoiceChatProps {
  onTranscript: (text: string) => void;
  onClose: () => void;
  isProcessing: boolean;
  lastResponse: string;
}

const VoiceChat = ({ onTranscript, onClose, isProcessing, lastResponse }: VoiceChatProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const pulseRef = useRef<HTMLButtonElement>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser 😔");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language || "en-US";

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      if (event.error !== "aborted") {
        toast.error("Microphone error. Please try again. 🎤");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    setTranscript("");
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const sendVoiceMessage = useCallback(() => {
    if (transcript.trim()) {
      onTranscript(transcript.trim());
      setTranscript("");
      stopListening();
    }
  }, [transcript, onTranscript, stopListening]);

  // Auto-read response aloud
  useEffect(() => {
    if (lastResponse && !isProcessing) {
      const utterance = new SpeechSynthesisUtterance(lastResponse.replace(/[#*`_~\[\]()]/g, "").slice(0, 1000));
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        // Auto-restart listening after response
        setTimeout(() => startListening(), 500);
      };
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, [lastResponse, isProcessing]);

  // Cleanup
  useEffect(() => {
    return () => {
      stopListening();
      window.speechSynthesis.cancel();
    };
  }, [stopListening]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col items-center justify-center">
      {/* Close button */}
      <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full bg-muted hover:bg-accent text-muted-foreground">
        <X className="w-5 h-5" />
      </button>

      {/* Voice visualization */}
      <div className="relative mb-12">
        {/* Pulse rings */}
        <div className={`absolute inset-0 -m-8 rounded-full transition-all duration-700 ${
          isListening ? "bg-primary/10 animate-ping" : isSpeaking ? "bg-violet-500/10 animate-ping" : ""
        }`} />
        <div className={`absolute inset-0 -m-4 rounded-full transition-all duration-500 ${
          isListening ? "bg-primary/20 animate-pulse" : isSpeaking ? "bg-violet-500/20 animate-pulse" : ""
        }`} />
        
        {/* Main circle */}
        <button
          ref={pulseRef}
          onClick={isListening ? sendVoiceMessage : startListening}
          disabled={isProcessing || isSpeaking}
          className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all shadow-2xl ${
            isListening
              ? "bg-primary shadow-primary/30 scale-110"
              : isSpeaking
              ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-violet-500/30"
              : isProcessing
              ? "bg-muted"
              : "bg-card border-2 border-border hover:border-primary/40 hover:scale-105"
          }`}
        >
          {isProcessing ? (
            <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
          ) : isSpeaking ? (
            <Volume2 className="w-10 h-10 text-white animate-pulse" />
          ) : isListening ? (
            <Mic className="w-10 h-10 text-primary-foreground" />
          ) : (
            <Mic className="w-10 h-10 text-muted-foreground" />
          )}
        </button>
      </div>

      {/* Status text */}
      <div className="text-center mb-8 px-8">
        <h3 className="text-lg font-bold text-foreground mb-1">
          {isProcessing ? "Thinking... 🤔" : isSpeaking ? "Pixel is speaking 🔊" : isListening ? "Listening... 🎤" : "Tap to speak 🎙️"}
        </h3>
        {transcript && (
          <p className="text-sm text-muted-foreground mt-3 max-w-sm bg-muted/50 rounded-xl p-3">
            "{transcript}"
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {isListening && transcript && (
          <button
            onClick={sendVoiceMessage}
            className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/30"
          >
            Send Message ✨
          </button>
        )}
        {isListening && (
          <button
            onClick={stopListening}
            className="px-6 py-3 rounded-2xl bg-muted text-foreground font-semibold text-sm"
          >
            Cancel
          </button>
        )}
      </div>

      <p className="absolute bottom-8 text-xs text-muted-foreground text-center px-8">
        🎙️ Voice Chat Mode • Speak naturally and Pixel will respond with voice
      </p>
    </div>
  );
};

export default VoiceChat;
