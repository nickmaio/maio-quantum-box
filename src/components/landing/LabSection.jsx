import { useState } from "react";
import { encrypt, decrypt } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Lock, Unlock, Copy, ShieldCheck, KeyRound, ServerOff, FileKey } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const features = [
  {
    icon: ShieldCheck,
    title: "Authenticated encryption",
    text: "AES-256-GCM protects message contents and detects tampering before plaintext is returned.",
  },
  {
    icon: KeyRound,
    title: "Password-derived keys",
    text: "PBKDF2-SHA256 uses a fresh salt and 600,000 iterations for each encrypted payload.",
  },
  {
    icon: ServerOff,
    title: "Local by design",
    text: "Plaintext and secret keys stay in the browser runtime. No backend is involved.",
  },
  {
    icon: FileKey,
    title: "Portable output",
    text: "Ciphertext exports as mv1 and can decrypt compact m1 messenger payloads.",
  },
];

const LabSection = () => {
  const [input, setInput] = useState("");
  const [key, setKey] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("encrypt");

  const handleProcess = async () => {
    if (!input.trim() || !key.trim()) {
      toast.error("Please provide both text and a key.");
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === "encrypt"
          ? await encrypt(input, key)
          : await decrypt(input, key);
      setOutput(result);
      toast.success(mode === "encrypt" ? "Encrypted!" : "Decrypted!");
    } catch {
      toast.error(
        mode === "decrypt"
          ? "Decryption failed - wrong key or corrupted data."
          : "Encryption failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    toast.success("Copied to clipboard!");
  };

  return (
    <section id="lab" className="min-h-screen px-4 py-8 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="w-full max-w-5xl"
      >
        <div className="glass rounded-lg p-6 md:p-10 relative overflow-hidden">
          <div
            className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 blur-3xl"
            style={{ background: "radial-gradient(circle, hsl(188 100% 42% / 0.5), transparent)" }}
          />

          <div className="grid gap-8 sm:grid-cols-2 relative z-10">
            <div>
              <div className="flex items-center gap-2 mb-8 relative z-10">
                <div className="w-8 h-8 rounded-lg bg-[#111827] border border-[#eB8236]/30 flex items-center justify-center shadow-[0_0_18px_rgba(235,130,54,0.18)]">
                  <div className="relative h-[18px] w-[16px]" aria-hidden="true">
                    <div className="absolute left-[3px] top-0 h-[10px] w-[10px] rounded-t-[7px] border-[3px] border-b-0 border-[#eB8236]" />
                    <div className="absolute bottom-0 left-0 h-[11px] w-[16px] rounded-[3px] bg-[#eB8236]">
                      <div className="absolute left-1/2 top-[3px] h-[5px] w-[3px] -translate-x-1/2 rounded-full bg-[#111827]" />
                    </div>
                  </div>
                </div>
                <span className="text-sm font-display font-bold tracking-tight">&nbsp;&nbsp;Maio Quantum Box</span>
                <span className="text-[9px] font-code tracking-widest uppercase text-muted-foreground/40 ml-auto">
                  AES-256-GCM / PBKDF2
                </span>
              </div>

              <div className="flex gap-2 mb-6">
                <Button
                  variant={mode === "encrypt" ? "default" : "secondary"}
                  className={`flex-1 gap-2 font-display rounded-lg ${mode === "encrypt" ? "glow-primary" : ""}`}
                  onClick={() => { setMode("encrypt"); setOutput(""); }}
                >
                  <Lock className="w-4 h-4" /> Encrypt
                </Button>
                <Button
                  variant={mode === "decrypt" ? "default" : "secondary"}
                  className={`flex-1 gap-2 font-display rounded-lg ${mode === "decrypt" ? "glow-primary" : ""}`}
                  onClick={() => { setMode("decrypt"); setOutput(""); }}
                >
                  <Unlock className="w-4 h-4" /> Decrypt
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-code text-muted-foreground uppercase tracking-widest mb-1.5 block">
                    {mode === "encrypt" ? "Plaintext" : "Ciphertext"}
                  </label>
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={mode === "encrypt" ? "Enter text to encrypt..." : "Paste encrypted text..."}
                    className="min-h-[120px] bg-input border-border focus:border-primary rounded-lg resize-none font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-code text-muted-foreground uppercase tracking-widest mb-1.5 block">
                    Decryption Key
                  </label>
                  <Input
                    type="password"
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="Enter your decryption key..."
                    className="bg-input border-border focus:border-primary rounded-lg font-mono text-sm"
                  />
                </div>

                <Button
                  onClick={handleProcess}
                  disabled={loading || !input.trim() || !key.trim()}
                  className="w-full gap-2 glow-primary font-display rounded-lg"
                >
                  {loading ? (
                    <span className="animate-pulse">Processing...</span>
                  ) : mode === "encrypt" ? (
                    <><Lock className="w-4 h-4" /> Encrypt</>
                  ) : (
                    <><Unlock className="w-4 h-4" /> Decrypt</>
                  )}
                </Button>

                {output && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.4 }}
                    className="mt-4"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-code text-muted-foreground uppercase tracking-widest">
                        {mode === "encrypt" ? "Ciphertext" : "Plaintext"}
                      </label>
                      <Button variant="ghost" size="sm" onClick={copyOutput} className="h-6 gap-1 text-xs text-muted-foreground hover:text-foreground">
                        <Copy className="w-3 h-3" /> Copy
                      </Button>
                    </div>
                    <div className="bg-input border border-border rounded-lg p-4 font-mono text-sm break-all text-foreground">
                      {output}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <aside className="border-t border-border/60 pt-6 sm:border-l sm:border-t-0 sm:pl-8 sm:pt-0">
              <div className="mb-6">
                <p className="text-[10px] font-code uppercase tracking-widest text-[#eB8236] mb-3">
                  About
                </p>
                <h2 className="text-2xl font-display font-bold tracking-tight mb-3">
                  Private text encryption in one compact box.
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Maio Quantum Box encrypts and decrypts text locally with browser-native cryptography.
                  It is built for quick, portable message protection without accounts, servers, or saved keys.
                </p>
              </div>

              <div className="space-y-4">
                {features.map((feature) => (
                  <div key={feature.title} className="flex gap-3">
                    <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#eB8236]/10 border border-[#eB8236]/20 text-[#eB8236] flex items-center justify-center shrink-0">
                      <feature.icon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-display font-semibold tracking-tight mb-1">
                        {feature.title}
                      </h3>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {feature.text}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default LabSection;
