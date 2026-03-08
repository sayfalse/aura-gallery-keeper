import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import SplashScreen from "@/components/SplashScreen";
import ErrorBoundary from "@/core/ErrorBoundary";
import LoadingScreen from "@/core/LoadingScreen";
import AppLockScreen, { shouldShowLockScreen, updateLastActive } from "./components/AppLockScreen";

// Lazy-loaded module pages for code splitting
const Home = lazy(() => import("./pages/Home"));
const Index = lazy(() => import("./pages/Index"));
const NotesPage = lazy(() => import("./pages/Notes"));
const DrivePage = lazy(() => import("./pages/Drive"));
const ContactsPage = lazy(() => import("./pages/Contacts"));
const MailPage = lazy(() => import("./pages/Mail"));
const GmailCallback = lazy(() => import("./pages/GmailCallback"));
const PixelAIPage = lazy(() => import("./pages/PixelAI"));
const ChatPage = lazy(() => import("./pages/Chat"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const Auth = lazy(() => import("./pages/Auth"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const SharedView = lazy(() => import("./pages/SharedView"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min cache
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const ProtectedRoute = ({ children, module }: { children: React.ReactNode; module?: string }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen module={module} />;
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <ErrorBoundary moduleName={module}>
      <Suspense fallback={<LoadingScreen module={module} />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return (
    <Suspense fallback={<LoadingScreen />}>
      {children}
    </Suspense>
  );
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
          {/* Auth routes */}
          <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
          <Route path="/forgot-password" element={<AuthRoute><ForgotPassword /></AuthRoute>} />
          <Route path="/reset-password" element={<Suspense fallback={<LoadingScreen />}><ResetPassword /></Suspense>} />

          {/* Core module routes - each wrapped in error boundary */}
          <Route path="/" element={<ProtectedRoute module="Home"><Home /></ProtectedRoute>} />
          <Route path="/gallery" element={<ProtectedRoute module="Gallery"><Index /></ProtectedRoute>} />
          <Route path="/notes" element={<ProtectedRoute module="Notes"><NotesPage /></ProtectedRoute>} />
          <Route path="/drive" element={<ProtectedRoute module="Drive"><DrivePage /></ProtectedRoute>} />
          <Route path="/contacts" element={<ProtectedRoute module="People"><ContactsPage /></ProtectedRoute>} />
          <Route path="/mail" element={<ProtectedRoute module="Mail"><MailPage /></ProtectedRoute>} />
          <Route path="/gmail-callback" element={<ProtectedRoute module="Mail"><GmailCallback /></ProtectedRoute>} />
          <Route path="/pixel-ai" element={<ProtectedRoute module="Pixel AI"><PixelAIPage /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute module="Chat"><ChatPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute module="Settings"><SettingsPage /></ProtectedRoute>} />

          {/* Public routes */}
          <Route path="/privacy-policy" element={<Suspense fallback={<LoadingScreen />}><PrivacyPolicy /></Suspense>} />
          <Route path="/terms-of-service" element={<Suspense fallback={<LoadingScreen />}><TermsOfService /></Suspense>} />
          <Route path="/shared/:token" element={<Suspense fallback={<LoadingScreen />}><SharedView /></Suspense>} />
          <Route path="*" element={<Suspense fallback={<LoadingScreen />}><NotFound /></Suspense>} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <ErrorBoundary moduleName="App">
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
  </ErrorBoundary>
);

export default App;
