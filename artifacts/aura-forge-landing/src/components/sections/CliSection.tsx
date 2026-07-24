import { motion } from 'framer-motion';
import { Terminal, Key, Play } from 'lucide-react';

export default function CliSection() {
  return (
    <section id="cli" className="py-24 bg-card/30 border-y border-border">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-mono font-medium mb-6">
                <Terminal className="w-4 h-4" />
                CLI Tool
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Live in your terminal.</h2>
              <p className="text-lg text-muted-foreground">
                For developers who live in the command line. Install globally, set your API key, and generate contracts without ever switching context.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                  <span className="font-mono text-primary font-bold">1</span>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-2">Install the CLI</h4>
                  <div className="bg-[#0a0a0a] border border-border rounded-lg p-3 font-mono text-sm text-gray-300">
                    <span className="text-muted-foreground select-none">$ </span>
                    npm install -g @aura-forge/cli
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                  <span className="font-mono text-primary font-bold">2</span>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-2">Authenticate</h4>
                  <p className="text-sm text-muted-foreground mb-2">Get your key from the web app settings.</p>
                  <div className="bg-[#0a0a0a] border border-border rounded-lg p-3 font-mono text-sm text-gray-300 flex items-center gap-2">
                    <span className="text-muted-foreground select-none">$ </span>
                    aura-forge /key af_sk_...
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                  <span className="font-mono text-primary font-bold">3</span>
                </div>
                <div>
                  <h4 className="text-white font-bold mb-2">Start Forging</h4>
                  <div className="bg-[#0a0a0a] border border-border rounded-lg p-3 font-mono text-sm text-gray-300">
                    <span className="text-muted-foreground select-none">$ </span>
                    aura-forge
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-4">
              <a 
                href="/aura-forge/"
                className="inline-flex items-center gap-2 text-primary font-mono hover:text-primary/80 transition-colors"
              >
                Get your API key <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex-1 w-full"
          >
            <div className="rounded-xl overflow-hidden border border-border bg-[#050505] shadow-2xl">
              <div className="flex items-center px-4 py-3 border-b border-border bg-[#0a0a0a]">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-border" />
                  <div className="w-3 h-3 rounded-full bg-border" />
                  <div className="w-3 h-3 rounded-full bg-border" />
                </div>
                <div className="flex-1 text-center font-mono text-xs text-muted-foreground">
                  Commands Available
                </div>
              </div>
              <div className="p-6 font-mono text-sm space-y-4">
                <div>
                  <span className="text-primary mr-4">/audit &lt;file&gt;</span>
                  <span className="text-muted-foreground">Run security check on local file</span>
                </div>
                <div>
                  <span className="text-primary mr-4">/chain &lt;evm|sol&gt;</span>
                  <span className="text-muted-foreground">Switch target ecosystem</span>
                </div>
                <div>
                  <span className="text-primary mr-4">/list</span>
                  <span className="text-muted-foreground">View your generated contracts</span>
                </div>
                <div>
                  <span className="text-primary mr-4">/help</span>
                  <span className="text-muted-foreground">Show all commands</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
}
