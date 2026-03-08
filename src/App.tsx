import { useState, useCallback, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import Home from "./pages/Home";
import Index from "./pages/Index";
import NotesPage from "./pages/Notes";
import DrivePage from "./pages/Drive";
import ContactsPage from "./pages/Contacts";
import MailPage from "./pages/Mail";
import GmailCallback from "./pages/GmailCallback";
import PixelAIPage from "./pages/PixelAI";
import SettingsPage from "./pages/Settings";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import SharedView from "./pages/SharedView";
import NotFound from "./pages/NotFound";
import AppLockScreen, { shouldShowLockScreen, updateLastActive } from "./components/AppLockScreen";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [locked, setLocked] = useState(() => shouldShowLockScreen());
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  // Track user activity for app lock timeout
  useEffect(() => {
    if (locked) return;
    const handler = () => updateLastActive();
    const events = ["click", "keydown", "touchstart", "scroll"];
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    updateLastActive();
    return () => events.forEach((e) => window.removeEventListener(e, handler));
  }, [locked]);

  // Check lock on visibility change (app resume)
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === "visible" && shouldShowLockScreen()) {
        setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  return (
    <>
      {showSplash && <SplashScreen onFinish={handleSplashFinish} />}
      {locked && <AppLockScreen onUnlock={() => setLocked(false)} />}
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/gallery" element={<ProtectedRoute><Index /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
          <Route path="/drive" element={<ProtectedRoute><DrivePage /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute><ContactsPage /></ProtectedRoute>} />
          <Route path="/mail" element={<ProtectedRoute><MailPage /></ProtectedRoute>} />
          <Route path="/gmail-callback" element={<ProtectedRoute><GmailCallback /></ProtectedRoute>} />
          <Route path="/pixel-ai" element={<ProtectedRoute><PixelAIPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/shared/:token" element={<SharedView />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <AppContent />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
