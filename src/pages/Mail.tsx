import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Inbox, Send, FileText, Trash2, Star } from "lucide-react";

const MailPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-20">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1 flex items-center gap-2">
          <Mail className="w-5 h-5 text-sky-500" />
          <h1 className="font-display text-lg font-bold text-foreground">Mail</h1>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-display text-2xl font-bold text-foreground mb-3">Mail Coming Soon</h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            The Mail module requires an email service provider to send and receive emails. 
            This feature is under development and will be available in a future update.
          </p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            {[
              { icon: Inbox, label: "Inbox" },
              { icon: Send, label: "Send" },
              { icon: Star, label: "Starred" },
              { icon: Trash2, label: "Trash" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 text-muted-foreground">
                <item.icon className="w-4 h-4" />
                <span className="text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MailPage;
