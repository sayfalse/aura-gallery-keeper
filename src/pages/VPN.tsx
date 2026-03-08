import { useState, useEffect, useCallback } from "react";
import ModuleSwitcher from "@/components/ModuleSwitcher";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ShieldCheck, ShieldX, Globe, Zap, Lock, RefreshCw, ExternalLink,
  Copy, CheckCircle2, Power, Download, FileText, QrCode, Smartphone
} from "lucide-react";
import { toast } from "sonner";

interface DnsResult {
  ip: string;
  isp: string;
  location: string;
  usingCf: boolean;
  latency: number;
}

interface WarpConfig {
  config: string;
  clientId: string;
  v4Address: string;
  v6Address: string;
  endpoint: string;
  peerPublicKey: string;
}

const proxyUrl = (params: Record<string, string>) => {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const qs = new URLSearchParams(params).toString();
  return `https://${projectId}.supabase.co/functions/v1/vpn-proxy?${qs}`;
};

const proxyHeaders = () => ({
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
});

const VPNPage = () => {
  const [dnsResult, setDnsResult] = useState<DnsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [copied, setCopied] = useState("");
  const [warpConfig, setWarpConfig] = useState<WarpConfig | null>(null);
  const [generating, setGenerating] = useState(false);

  // DNS lookup state
  const [dnsQuery, setDnsQuery] = useState("");
  const [dnsAnswer, setDnsAnswer] = useState("");
  const [querying, setQuerying] = useState(false);

  const checkConnection = useCallback(async () => {
    setLoading(true);
    try {
      const start = performance.now();
      const res = await fetch(proxyUrl({ action: "trace" }), { headers: proxyHeaders() });
      const latency = Math.round(performance.now() - start);
      const data = await res.json();
      setDnsResult({
        ip: data.ip || "Unknown",
        isp: data.isp || "Unknown",
        location: data.location || "Unknown",
        usingCf: data.cfConnected || false,
        latency: data.cfLatency || latency,
      });
    } catch {
      setDnsResult({ ip: "Error", isp: "Could not connect", location: "", usingCf: false, latency: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { checkConnection(); }, [checkConnection]);

  const runDnsQuery = async () => {
    if (!dnsQuery.trim()) return;
    setQuerying(true);
    try {
      const res = await fetch(proxyUrl({ action: "dns", domain: dnsQuery.trim(), type: "A" }), { headers: proxyHeaders() });
      const data = await res.json();
      setDnsAnswer(data.Answer?.map((a: any) => a.data).join(", ") || "No records found");
    } catch {
      setDnsAnswer("Query failed");
    }
    setQuerying(false);
  };

  const generateWarpConfig = async () => {
    setGenerating(true);
    try {
      // Step 1: Generate X25519 keypair client-side
      const keyPair = await crypto.subtle.generateKey("X25519" as any, true, ["deriveBits"]) as CryptoKeyPair;
      const rawPriv = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
      const rawPub = await crypto.subtle.exportKey("raw", keyPair.publicKey);
      const privBytes = new Uint8Array(rawPriv).slice(-32);
      const pubBytes = new Uint8Array(rawPub);
      const privateKey = btoa(String.fromCharCode(...privBytes));
      const publicKey = btoa(String.fromCharCode(...pubBytes));

      // Step 2: Register via proxy
      const regRes = await fetch(proxyUrl({ action: "warp-register" }), {
        method: "POST",
        headers: { ...proxyHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          install_id: "",
          tos: new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z"),
          key: publicKey,
          fcm_token: "",
          type: "ios",
          locale: "en_US",
        }),
      });
      const regData = await regRes.json();
      if (!regData.result?.id) throw new Error(regData.errors?.[0] || "Registration failed");

      // Step 3: Enable WARP via proxy
      const enableRes = await fetch(proxyUrl({ action: "warp-enable" }), {
        method: "POST",
        headers: { ...proxyHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ id: regData.result.id, token: regData.result.token }),
      });
      const enableData = await enableRes.json();
      const cfg = enableData.result?.config || {};
      const iface = cfg.interface || {};
      const peers = cfg.peers || [];

      const v4Addr = iface.addresses?.v4 || "172.16.0.2/32";
      const v6Addr = iface.addresses?.v6 || "";
      const peerKey = peers[0]?.public_key || "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=";
      const endpoint = peers[0]?.endpoint?.host || "engage.cloudflareclient.com:2408";

      const wgConfig = [
        "[Interface]",
        `PrivateKey = ${privateKey}`,
        `Address = ${v4Addr}${v6Addr ? ", " + v6Addr : ""}`,
        "DNS = 1.1.1.1, 1.0.0.1, 2606:4700:4700::1111, 2606:4700:4700::1001",
        "MTU = 1280",
        "",
        "[Peer]",
        `PublicKey = ${peerKey}`,
        "AllowedIPs = 0.0.0.0/0, ::/0",
        `Endpoint = ${endpoint}`,
        "PersistentKeepalive = 25",
      ].join("\n");

      setWarpConfig({ config: wgConfig, clientId: regData.result.id, v4Address: v4Addr, v6Address: v6Addr, endpoint, peerPublicKey: peerKey });
      toast.success("WARP config generated! Download and import into WireGuard.");
    } catch (e: any) {
      console.error("Config generation error:", e);
      toast.error(e.message || "Failed to generate WARP config. Try the official WARP app instead.");
    }
    setGenerating(false);
  };

  const downloadConfig = () => {
    if (!warpConfig) return;
    const blob = new Blob([warpConfig.config], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "warp.conf";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Config downloaded!");
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success(`${label} copied!`);
    setTimeout(() => setCopied(""), 2000);
  };

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);

    if (!connected) {
      // Generate config if not already done
      if (!warpConfig) {
        await generateWarpConfig();
      }
      // Try to open WireGuard app via deep link
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes("android")) {
        window.open("wireguard://import/tunnel", "_blank");
      } else if (ua.includes("iphone") || ua.includes("ipad")) {
        window.open("wireguard://import/tunnel", "_blank");
      }
      setConnected(true);
      toast.success("Config ready! Import it into WireGuard or WARP app to activate VPN.");
    } else {
      setConnected(false);
      toast("Disconnected");
    }

    setConnecting(false);
    checkConnection();
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
    { label: "iOS", url: "https://apps.apple.com/app/1-1-1-1-faster-internet/id1423538627", icon: "📱" },
    { label: "Android", url: "https://play.google.com/store/apps/details?id=com.cloudflare.onedotonedotonedotone", icon: "🤖" },
    { label: "Windows", url: "https://1.1.1.1/", icon: "💻" },
    { label: "macOS", url: "https://1.1.1.1/", icon: "🍎" },
  ];

  const wireguardLinks = [
    { label: "iOS", url: "https://apps.apple.com/app/wireguard/id1441195209" },
    { label: "Android", url: "https://play.google.com/store/apps/details?id=com.wireguard.android" },
    { label: "Windows", url: "https://download.wireguard.com/windows-client/wireguard-installer.exe" },
    { label: "macOS", url: "https://apps.apple.com/app/wireguard/id1451685025" },
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
        {/* Connect Button */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card border border-border p-6 flex flex-col items-center"
        >
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-5">
            {connected ? "VPN Config Active" : "Generate & Connect VPN"}
          </p>

          <div className="relative">
            <motion.div
              animate={{
                boxShadow: connected
                  ? "0 0 0 8px hsl(var(--primary) / 0.1), 0 0 40px hsl(var(--primary) / 0.15)"
                  : "0 0 0 8px hsl(var(--muted) / 0.5), 0 0 20px transparent",
              }}
              transition={{ duration: 0.6 }}
              className="w-36 h-36 rounded-full flex items-center justify-center"
            >
              <motion.div
                animate={{ borderColor: connected ? "hsl(var(--primary))" : "hsl(var(--border))" }}
                transition={{ duration: 0.4 }}
                className="w-32 h-32 rounded-full border-[3px] flex items-center justify-center"
              >
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleConnect}
                  className={`w-24 h-24 rounded-full flex items-center justify-center transition-colors duration-500 ${
                    connecting ? "bg-amber-500/20" : connected ? "bg-primary/15" : "bg-muted"
                  }`}
                >
                  {connecting ? (
                    <div className="w-8 h-8 border-[3px] border-amber-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Power
                      className={`w-10 h-10 transition-colors duration-500 ${connected ? "text-primary" : "text-muted-foreground"}`}
                      strokeWidth={2.5}
                    />
                  )}
                </motion.button>
              </motion.div>
            </motion.div>

            <AnimatePresence>
              {connected && !connecting && (
                <>
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0.8, opacity: 0.4 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      transition={{ duration: 2, delay: i * 0.6, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border border-primary/30 pointer-events-none"
                    />
                  ))}
                </>
              )}
            </AnimatePresence>
          </div>

          <motion.p
            animate={{ color: connected ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))" }}
            className="mt-5 text-sm font-bold"
          >
            {connecting ? "Generating..." : connected ? "Config Ready" : "Tap to Connect"}
          </motion.p>
          <p className="text-[10px] text-muted-foreground mt-1 text-center max-w-[250px]">
            {connected
              ? "Download the config below and import into WireGuard or WARP app"
              : "Generates a free Cloudflare WARP WireGuard config for your device"}
          </p>
        </motion.div>

        {/* Generated Config */}
        <AnimatePresence>
          {warpConfig && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="rounded-2xl bg-card border border-primary/30 p-5 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  WireGuard Config
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => copyToClipboard(warpConfig.config, "Config")}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    {copied === "Config" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    Copy
                  </button>
                  <button
                    onClick={downloadConfig}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download
                  </button>
                </div>
              </div>

              <pre className="text-[10px] font-mono text-muted-foreground bg-muted/50 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all">
                {warpConfig.config}
              </pre>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-muted/50">
                  <p className="text-[9px] text-muted-foreground">IPv4</p>
                  <p className="text-[11px] font-mono font-medium text-foreground">{warpConfig.v4Address}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-muted/50">
                  <p className="text-[9px] text-muted-foreground">Endpoint</p>
                  <p className="text-[11px] font-mono font-medium text-foreground">{warpConfig.endpoint}</p>
                </div>
              </div>

              {/* How to use instructions */}
              <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                <h3 className="text-xs font-bold text-foreground mb-2">📋 How to use this config:</h3>
                <ol className="text-[11px] text-muted-foreground space-y-1.5 list-decimal pl-4">
                  <li>Download <strong>WireGuard</strong> app on your device</li>
                  <li>Tap <strong>"Download"</strong> above to save the config file</li>
                  <li>Open WireGuard → <strong>"Import from file"</strong></li>
                  <li>Select the downloaded <strong>warp.conf</strong> file</li>
                  <li>Toggle the connection <strong>ON</strong> — you're protected! 🛡️</li>
                </ol>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Get WireGuard App */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-card border border-border p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Get WireGuard App</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Install WireGuard to import your generated config and activate the VPN.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {wireguardLinks.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors text-xs font-medium text-primary"
              >
                {l.label} <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        </motion.div>

        {/* Connection Status */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
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
                {dnsResult?.usingCf ? "Your traffic is routed through Cloudflare" : "Using your ISP's default connection"}
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

        {/* Generate New Config Button */}
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          onClick={generateWarpConfig}
          disabled={generating}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Generating Config...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4" />
              Generate New WARP Config
            </>
          )}
        </motion.button>

        {/* DNS Lookup */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
          transition={{ delay: 0.25 }}
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
          <h2 className="text-sm font-bold mb-1">🛡️ Cloudflare WARP App</h2>
          <p className="text-xs text-white/80 mb-4">
            Alternatively, download the official WARP app for one-tap VPN protection.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {warpLinks.map((l) => (
              <a
                key={l.label}
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors text-sm font-medium"
              >
                {l.icon} {l.label} <ExternalLink className="w-3.5 h-3.5" />
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
