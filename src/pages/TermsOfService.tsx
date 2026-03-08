import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="font-display text-lg font-bold text-foreground">Terms of Service</h1>
      </header>

      <div className="max-w-lg mx-auto p-4 md:p-6 space-y-6">
        <p className="text-xs text-muted-foreground">Last updated: March 8, 2026</p>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            By accessing or using PixelVault, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">2. User Accounts</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You must provide accurate information when creating an account.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">3. Acceptable Use</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You agree not to use PixelVault for any unlawful purpose or in violation of any applicable laws. You must not upload content that infringes on intellectual property rights or contains malicious software.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">4. Content Ownership</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You retain full ownership of all content you upload to PixelVault. We do not claim any intellectual property rights over your content. You grant us a limited license solely to store and display your content back to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">5. Service Availability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We strive to maintain high availability but do not guarantee uninterrupted access. We may perform maintenance or updates that temporarily affect service availability.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">6. Termination</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            You may terminate your account at any time by using the account deletion feature in Settings. We reserve the right to suspend or terminate accounts that violate these terms.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">7. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            PixelVault is provided "as is" without warranties of any kind. We shall not be liable for any indirect, incidental, or consequential damages arising from the use of our service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">8. Contact</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            For questions about these terms, contact us at{" "}
            <a href="mailto:scor@tuta.io" className="text-primary hover:underline">scor@tuta.io</a>.
          </p>
        </section>
      </div>
    </div>
  );
};

export default TermsOfService;
