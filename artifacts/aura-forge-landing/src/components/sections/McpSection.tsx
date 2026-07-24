import { motion } from 'framer-motion';
import { Blocks, Copy, Check } from 'lucide-react';
import { useState } from 'react';

const mcpConfig = `{
  "mcpServers": {
    "aura-forge": {
      "command": "npx",
      "args": ["@aura-forge/mcp"],
      "env": {
        "AURA_FORGE_API_KEY": "af_sk_your_key_here"
      }
    }
  }
}`;

export default function McpSection() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(mcpConfig);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="mcp" className="py-24 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="flex flex-col lg:flex-row-reverse items-center gap-16">
          <div className="flex-1 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-mono font-medium mb-6">
                <Blocks className="w-4 h-4" />
                MCP Integration
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Give Claude superpowers.</h2>
              <p className="text-lg text-muted-foreground">
                Plug AURA Forge directly into Claude Desktop or Claude Code via the Model Context Protocol (MCP). Claude can now generate, compile, and audit contracts on your behalf.
              </p>
            </div>

            <div className="space-y-4 bg-card border border-border p-6 rounded-xl">
              <h4 className="text-white font-bold font-mono mb-4 text-sm uppercase tracking-wider">Available Tools</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground bg-[#0a0a0a] border border-border px-3 py-2 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" /> generate_contract
                </div>
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground bg-[#0a0a0a] border border-border px-3 py-2 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" /> audit_contract
                </div>
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground bg-[#0a0a0a] border border-border px-3 py-2 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> list_contracts
                </div>
                <div className="flex items-center gap-2 text-sm font-mono text-muted-foreground bg-[#0a0a0a] border border-border px-3 py-2 rounded">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> get_contract
                </div>
              </div>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="flex-1 w-full"
          >
            <div className="rounded-xl overflow-hidden border border-border bg-[#050505] shadow-2xl relative">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-[#0a0a0a]">
                <div className="font-mono text-xs text-muted-foreground">claude_desktop_config.json</div>
                <button 
                  onClick={handleCopy}
                  className="text-muted-foreground hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre className="font-mono text-sm text-gray-300">
                  <code>
{`{
  "mcpServers": {
    "aura-forge": {
      "command": "npx",
      "args": ["@aura-forge/mcp"],
      "env": {
        `}<span className="text-primary">"AURA_FORGE_API_KEY"</span>{`: "af_sk_your_key_here"
      }
    }
  }
}`}
                  </code>
                </pre>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
