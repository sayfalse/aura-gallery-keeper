import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if this is an OAuth callback with tokens in the URL hash
    const hash = window.location.hash;
    if (hash && (hash.includes("access_token") || hash.includes("refresh_token") || hash.includes("type=recovery"))) {
      // Let Supabase handle the auth callback, then redirect to home
      supabase.auth.getSession().then(() => {
        navigate("/", { replace: true });
      });
      return;
    }

    // Check if this might be an auth redirect in progress
    const params = new URLSearchParams(location.search);
    if (params.has("code") || params.has("token")) {
      navigate("/", { replace: true });
      return;
    }

    setChecking(false);
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location, navigate]);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
