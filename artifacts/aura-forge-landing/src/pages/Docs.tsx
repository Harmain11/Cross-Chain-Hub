import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Terminal, Shield, Cpu, Key, FileCode2, BookOpen, Play } from 'lucide-react';

const CodeBlock = ({ code }: { code: string }) => (
  <div className="bg-black/50 border border-white/10 rounded-lg overflow-hidden my-4">
    <div className="flex items-center px-4 py-2 border-b border-white/10 bg-black/40">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
        <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
      </div>
    </div>
    <div className="p-4 overflow-x-auto text-sm font-mono text-muted-foreground terminal-scroll">
      <pre><code>{code}</code></pre>
    </div>
  </div>
);

export default function Docs() {
  const sections = [
    { id: 'quick-start', title: 'Quick Start' },
    { id: 'web-app', title: 'Web App' },
    { id: 'cli-setup', title: 'CLI Setup' },
    { id: 'mcp-setup', title: 'MCP Setup' },
    { id: 'api-keys', title: 'API Keys' },
    { id: 'contract-types', title: 'Contract Types' },
    { id: 'faq', title: 'FAQ' },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20">
      <Navbar />
      
      <div className="flex-1 flex flex-col md:flex-row pt-20 border-t border-white/5 relative">
        {/* Sidebar */}
        <aside className="w-full md:w-64 lg:w-72 border-r border-white/5 bg-card/30 backdrop-blur-sm md:sticky md:top-20 md:h-[calc(100vh-5rem)] overflow-y-auto p-6 hidden md:block">
          <nav className="flex flex-col gap-2">
            <div className="font-mono text-sm font-bold text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              Documentation
            </div>
            {sections.map(section => (
              <a 
                key={section.id} 
                href={`#${section.id}`}
                className="text-sm text-muted-foreground hover:text-primary hover:bg-primary/5 px-3 py-2 rounded-md transition-colors"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        {/* Mobile Navigation */}
        <div className="md:hidden border-b border-white/5 p-4 bg-card/30 overflow-x-auto whitespace-nowrap">
          <div className="flex gap-4">
            {sections.map(section => (
              <a 
                key={section.id} 
                href={`#${section.id}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                {section.title}
              </a>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 max-w-4xl mx-auto p-6 md:p-12 lg:p-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
            id="quick-start"
          >
            <h1 className="text-4xl font-mono font-bold text-white mb-4">Documentation</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Everything you need to build, audit, and deploy smart contracts with AURA Forge.
            </p>

            <h2 className="text-2xl font-mono font-bold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <Play className="w-6 h-6 text-primary" />
              Quick Start
            </h2>
            <p className="text-muted-foreground mb-4">
              Get your first secure smart contract deployed in under 60 seconds.
            </p>
            <div className="space-y-4 text-muted-foreground mb-8">
              <p>1. Install the CLI:</p>
              <CodeBlock code={`npm install -g @aura-forge/cli`} />
              <p>2. Set your API Key (Get one from the Web App):</p>
              <CodeBlock code={`aura-forge key af_sk_...`} />
              <p>3. Generate a contract:</p>
              <CodeBlock code={`aura-forge generate "A deflationary ERC20 token with a 2% burn on transfer"`} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
            id="web-app"
          >
            <h2 className="text-2xl font-mono font-bold text-white mb-4 border-b border-white/10 pb-2">Web App</h2>
            <p className="text-muted-foreground mb-4">
              The AURA Forge Web App is your central dashboard for managing projects, viewing audit pipelines, and downloading your secure artifacts.
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground mb-4">
              <li><strong>Sign up</strong> at <a href="/aura-forge/" className="text-primary hover:underline">/aura-forge/</a>.</li>
              <li><strong>Create a project</strong> to group your contracts.</li>
              <li><strong>Pipeline Phases:</strong> Watch your prompt go through Generation, Compilation, Hardening, and Auditing in real time.</li>
              <li><strong>Download outputs:</strong> Get the raw <code>.sol</code>/<code>.rs</code> files, ABI, and detailed audit PDF.</li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
            id="cli-setup"
          >
            <h2 className="text-2xl font-mono font-bold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <Terminal className="w-6 h-6 text-primary" />
              CLI Setup
            </h2>
            <p className="text-muted-foreground mb-4">
              Our command-line tool brings the full power of AURA Forge directly to your local dev environment.
            </p>
            <CodeBlock code={`npm install -g @aura-forge/cli`} />
            <div className="space-y-4">
              <div className="bg-card p-4 rounded border border-white/5">
                <code className="text-primary font-mono text-sm block mb-2">aura-forge key &lt;token&gt;</code>
                <p className="text-sm text-muted-foreground">Stores your API key locally.</p>
              </div>
              <div className="bg-card p-4 rounded border border-white/5">
                <code className="text-primary font-mono text-sm block mb-2">aura-forge chain &lt;evm|solana&gt;</code>
                <p className="text-sm text-muted-foreground">Set your default target ecosystem.</p>
              </div>
              <div className="bg-card p-4 rounded border border-white/5">
                <code className="text-primary font-mono text-sm block mb-2">aura-forge audit ./MyContract.sol</code>
                <p className="text-sm text-muted-foreground">Uploads a local file and runs it through the security pipeline.</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
            id="mcp-setup"
          >
            <h2 className="text-2xl font-mono font-bold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <Cpu className="w-6 h-6 text-primary" />
              MCP Setup
            </h2>
            <p className="text-muted-foreground mb-4">
              Give Claude direct access to generate and audit smart contracts via our Model Context Protocol (MCP) server.
            </p>
            <p className="text-muted-foreground mb-2">Add this to your <code>claude_desktop_config.json</code>:</p>
            <CodeBlock code={`{
  "mcpServers": {
    "aura-forge": {
      "command": "npx",
      "args": ["-y", "@aura-forge/mcp"],
      "env": {
        "AURA_FORGE_API_KEY": "af_sk_your_key_here"
      }
    }
  }
}`} />
            <p className="text-muted-foreground mt-4 mb-2">Available tools to AI agents:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><code>generate_contract</code></li>
              <li><code>audit_contract</code></li>
              <li><code>list_contracts</code></li>
              <li><code>get_contract</code></li>
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
            id="api-keys"
          >
            <h2 className="text-2xl font-mono font-bold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <Key className="w-6 h-6 text-primary" />
              API Keys
            </h2>
            <p className="text-muted-foreground mb-4">
              To use the CLI or API directly, you need an API key. All keys start with <code>af_sk_</code>.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground mb-4">
              <li>Go to <strong>Settings</strong> in the Web App.</li>
              <li>Navigate to the <strong>API Keys</strong> tab.</li>
              <li>Click <strong>Generate New Key</strong>.</li>
            </ol>
            <p className="text-muted-foreground">
              When calling the REST API, provide it in the Authorization header:
            </p>
            <CodeBlock code={`Authorization: Bearer af_sk_...`} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
            id="contract-types"
          >
            <h2 className="text-2xl font-mono font-bold text-white mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
              <FileCode2 className="w-6 h-6 text-primary" />
              Contract Types
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="bg-card p-6 rounded-lg border border-white/5">
                <h3 className="font-mono text-lg text-white mb-2">EVM (Solidity)</h3>
                <p className="text-sm text-muted-foreground mb-4">Standard ERC20, ERC721, ERC1155, custom DeFi protocols, DAOs, and Escrow logic.</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  <li>OpenZeppelin integration</li>
                  <li>UUPS Upgradeable proxies</li>
                  <li>Hardhat/Foundry compatible</li>
                </ul>
              </div>
              <div className="bg-card p-6 rounded-lg border border-white/5">
                <h3 className="font-mono text-lg text-white mb-2">Solana (Rust)</h3>
                <p className="text-sm text-muted-foreground mb-4">SPL Tokens, NFT programs, automated market makers, and custom instruction sets.</p>
                <ul className="text-sm text-muted-foreground list-disc list-inside">
                  <li>Anchor Framework</li>
                  <li>PDA (Program Derived Address) handling</li>
                  <li>Auto-generated IDLs</li>
                </ul>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
            id="faq"
          >
            <h2 className="text-2xl font-mono font-bold text-white mb-6 border-b border-white/10 pb-2">FAQ</h2>
            <div className="space-y-6">
              <div>
                <h4 className="font-mono text-white mb-1">Is the generated code production-ready?</h4>
                <p className="text-sm text-muted-foreground">While our pipeline includes strict auditing, compilation checks, and security scoring, you should <strong>always perform a human audit</strong> before deploying to mainnet with significant value at risk.</p>
              </div>
              <div>
                <h4 className="font-mono text-white mb-1">What chains are supported?</h4>
                <p className="text-sm text-muted-foreground">Currently we support EVM-compatible chains (Ethereum, Arbitrum, Base, Polygon, Optimism) via Solidity, and Solana via Rust/Anchor.</p>
              </div>
              <div>
                <h4 className="font-mono text-white mb-1">How does hardening work?</h4>
                <p className="text-sm text-muted-foreground">The initial generated contract is fed into an adversarial LLM agent configured to exploit it. If vulnerabilities are found, the code is iteratively re-written to patch them until the exploit agent fails.</p>
              </div>
              <div>
                <h4 className="font-mono text-white mb-1">Can I edit the generated contract?</h4>
                <p className="text-sm text-muted-foreground">Yes. AURA Forge is a starting point, not a walled garden. You receive raw source files to integrate into your repo.</p>
              </div>
              <div>
                <h4 className="font-mono text-white mb-1">What's the security score?</h4>
                <p className="text-sm text-muted-foreground">A 0-100 metric based on best practices, access control, reentrancy guards, and test coverage. A score above 90 is recommended for mainnet.</p>
              </div>
              <div>
                <h4 className="font-mono text-white mb-1">Is there a rate limit?</h4>
                <p className="text-sm text-muted-foreground">Starter tier limits you to 10 contracts per month. Pro and Enterprise have much higher or unlimited caps. API requests are rate-limited to 60 per minute.</p>
              </div>
            </div>
          </motion.div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}