import { useState, useEffect, useCallback } from "react";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, ShieldCheck, ShieldX, Globe, Zap, Lock, RefreshCw, ExternalLink, Copy, CheckCircle2, Power } from "lucide-react";
import { toast } from "sonner";

interface DnsResult {
  ip: string;
  isp: string;
  location: string;
  usingCf: boolean;
  latency: number;
}

const VPNPage = () => {
  const [dnsResult, setDnsResult] = useState<DnsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [dnsMode, setDnsMode] = useState<"standard" | "secure">("standard");
  const [copied, setCopied] = useState("");

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const start = performance.now();
      const res = await fetch("https://1.1.1.1/cdn-cgi/trace");
      const latency = Math.round(performance.now() - start);
      const text = await res.text();
      const lines = Object.fromEntries(text.trim().split("\n").map(l => l.split("=")));
      setDnsResult({
        ip: lines.ip || "Unknown",
        isp: lines.org || "Unknown",
        location: `${lines.loc || ""} ${lines.colo || ""}`.trim() || "Unknown",
        usingCf: lines.fl !== undefined,
        latency,
      });
    } catch {
      setDnsResult({ ip: "Error", isp: "Could not connect", location: "", usingCf: false, latency: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  const dohQuery = async (domain: string) => {
    try {
      const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
        headers: { Accept: "application/dns-json" },
      });
      const data = await res.json();
      return data.Answer?.map((a: any) => a.data).join(", ") || "No records found";
    } catch {
      return "Query failed";
    }
  };

  const [dnsQuery, setDnsQuery] = useState("");
  const [dnsAnswer, setDnsAnswer] = useState("");
  const [querying, setQuerying] = useState(false);

  const runDnsQuery = async () => {
    if (!dnsQuery.trim()) return;
    setQuerying(true);
    const result = await dohQuery(dnsQuery.trim());
    setDnsAnswer(result);
    setQuerying(false);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(""), 2000);
  };

  const dnsConfigs = [
    { label: "IPv4 Primary", value: "1.1.1.1" },
    { label: "IPv4 Secondary", value: "1.0.0.1" },
    { label: "IPv6 Primary", value: "2606:4700:4700::1111" },
    { label: "IPv6 Secondary", value: "2606:4700:4700::1001" },
    { label: "DoH", value: "https://cloudflare-dns.com/dns-query" },
    { label: "DoT", value: "1dot1dot1dot1.cloudflare-dns.com" },
  ];

  const warpLinks = [
    { label: "iOS", url: "https://apps.apple.com/app/1-1-1-1-faster-internet/id1423538627" },
    { label: "Android", url: "https://play.google.com/store/apps/details?id=com.cloudflare.onedotonedotonedotone" },
    { label: "Windows", url: "https://1.1.1.1/" },
    { label: "macOS", url: "https://1.1.1.1/" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="px-5 pt-[env(safe-area-inset-top)] py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-foreground flex-1">VPN & DNS</h1>
        <button onClick={checkConnection} className="p-2 rounded-xl hover:bg-accent transition-colors">
          <RefreshCw className={`w-5 h-5 text-muted-foreground ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <main className="px-5 pb-28 space-y-5">
        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-5"
        >
          <div className="flex items-center gap-3 mb-4">
            {dnsResult?.usingCf ? (
              <ShieldCheck className="w-8 h-8 text-emerald-500" />
            ) : (
              <ShieldX className="w-8 h-8 text-orange-500" />
            )}
            <div>
              <h2 className="text-base font-bold text-foreground">
                {loading ? "Checking..." : dnsResult?.usingCf ? "Connected via Cloudflare" : "Standard Connection"}
              </h2>
              <p className="text-xs text-muted-foreground">
                {dnsResult?.usingCf ? "Your DNS queries are routed through Cloudflare" : "Using your ISP's default DNS"}
              </p>
            </div>
          </div>
          {dnsResult && !loading && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "IP Address", value: dnsResult.ip, icon: Globe },
                { label: "Latency", value: `${dnsResult.latency}ms`, icon: Zap },
                { label: "Location", value: dnsResult.location, icon: Lock },
                { label: "ISP", value: dnsResult.isp, icon: Shield },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-muted/50">
                  <item.icon className="w-3.5 h-3.5 text-muted-foreground mb-1" />
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  <p className="text-xs font-semibold text-foreground truncate">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* DNS Lookup */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-card border border-border p-5"
        >
          <h2 className="text-sm font-bold text-foreground mb-3">🔍 DNS Lookup (via Cloudflare DoH)</h2>
          <div className="flex gap-2">
            <input
              value={dnsQuery}
              onChange={(e) => setDnsQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runDnsQuery()}
              placeholder="e.g. google.com"
              className="flex-1 h-10 px-3 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={runDnsQuery}
              disabled={querying}
              className="px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
            >
              {querying ? "..." : "Lookup"}
            </button>
          </div>
          {dnsAnswer && (
            <div className="mt-3 p-3 rounded-xl bg-muted/50">
              <p className="text-xs font-mono text-foreground break-all">{dnsAnswer}</p>
            </div>
          )}
        </motion.div>

        {/* DNS Configuration */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl bg-card border border-border p-5"
        >
          <h2 className="text-sm font-bold text-foreground mb-3">⚙️ Cloudflare DNS Settings</h2>
          <p className="text-xs text-muted-foreground mb-3">Configure your device's DNS to use Cloudflare's 1.1.1.1 for faster, private browsing.</p>
          <div className="space-y-2">
            {dnsConfigs.map((c) => (
              <div key={c.label} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                <div>
                  <p className="text-[10px] text-muted-foreground">{c.label}</p>
                  <p className="text-xs font-mono font-medium text-foreground">{c.value}</p>
                </div>
                <button onClick={() => copyToClipboard(c.value, c.label)} className="p-1.5 rounded-lg hover:bg-accent transition-colors">
                  {copied === c.label ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* WARP App Download */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-white"
        >
          <h2 className="text-sm font-bold mb-1">🛡️ Cloudflare WARP</h2>
          <p className="text-xs text-white/80 mb-4">For full VPN protection, download the official WARP app. It encrypts all your traffic using WireGuard.</p>
          <div className="grid grid-cols-2 gap-2">
            {warpLinks.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
              >
                {l.label} <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        </motion.div>
      </main>

      <ModuleSwitcher />
    </div>
  );
};

export default VPNPage;
