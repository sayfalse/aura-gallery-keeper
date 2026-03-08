import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Privacy Policy</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        <p className="text-xs text-muted-foreground">Last updated: March 8, 2026</p>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">1. Information We Collect</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We collect information you provide directly, including your email address, display name, and any content you upload (photos, notes, contacts, files). We also collect usage data to improve our services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">2. How We Use Your Information</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Your data is used solely to provide and improve PixelVault services. We do not sell, share, or distribute your personal information to third parties. Your content remains yours.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">3. Data Storage & Security</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            All data is encrypted at rest using AES-256 encryption and in transit using TLS 1.3. We implement row-level security to ensure your data is isolated and accessible only to you. Your account is protected via secure authentication (OAuth 2.0 / email-password).
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">4. Data Retention</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We retain your data for as long as your account is active. Deleted items are moved to trash and permanently removed after you confirm deletion. You can delete your entire account and all associated data at any time from Settings.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">5. Your Rights</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You have the right to access, export, modify, and delete your data at any time. You can also request complete account deletion which permanently removes all your data from our servers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">6. Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For any privacy-related questions, contact us at{" "}
            <a href="mailto:scor@tuta.io" className="text-primary hover:underline">scor@tuta.io</a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
