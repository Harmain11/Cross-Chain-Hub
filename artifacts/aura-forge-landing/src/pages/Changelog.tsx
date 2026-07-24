import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function Changelog() {
  const releases = [
    {
      version: 'v0.9.0',
      date: 'July 2026',
      changes: [
        'CLI login flow: aura-forge login opens browser OAuth',
        'MCP server: 4 tools now available for Claude Desktop',
        'Hardening context questions: auditor asks targeted questions to improve score',
      ]
    },
    {
      version: 'v0.8.0',
      date: 'June 2026',
      changes: [
        'Solana/Anchor support (Rust contracts, IDL generation)',
        'Upgradeable EVM contracts via UUPS proxy',
        'Test suite auto-generation (Foundry for EVM, Anchor TS for Solana)',
      ]
    },
    {
      version: 'v0.7.0',
      date: 'May 2026',
      changes: [
        'Security score overhauled (0–100, detailed breakdown)',
        'Gas estimates for every EVM function',
        'Contract monitoring (post-deploy on-chain activity alerts)',
      ]
    },
    {
      version: 'v0.6.0',
      date: 'April 2026',
      changes: [
        'Team workspaces with invite flow',
        'API key management',
        'Project lineage tracking (hardening version chain)',
      ]
    },
    {
      version: 'Beta',
      date: 'March 2026',
      changes: [
        'Initial closed beta launch',
        'EVM contract generation, compilation, audit',
        'Web app + API server',
      ]
    }
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-32 pb-24 px-6 relative">
        <div className="container mx-auto max-w-3xl relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-mono font-bold text-white mb-6 tracking-tight">
              Changelog
            </h1>
            <p className="text-lg text-muted-foreground">
              We ship continuously. Here's what's new in AURA Forge.
            </p>
          </motion.div>

          <div className="space-y-16 relative before:absolute before:inset-0 before:ml-4 md:before:ml-[8.5rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
            {releases.map((release, index) => (
              <motion.div 
                key={release.version}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
              >
                {/* Timeline Dot */}
                <div className="flex items-center justify-center w-8 h-8 rounded-full border border-white/20 bg-card absolute left-0 md:left-1/2 -translate-x-1/2 z-10 group-hover:border-primary transition-colors">
                  <div className="w-2.5 h-2.5 rounded-full bg-white/50 group-hover:bg-primary transition-colors" />
                </div>

                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] ml-auto md:ml-0 md:odd:pr-8 md:even:pl-8">
                  <div className="bg-card/50 backdrop-blur-sm border border-white/5 p-6 rounded-xl hover:border-white/10 transition-colors">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                      <h3 className="font-mono text-xl font-bold text-white">{release.version}</h3>
                      <span className="text-sm font-mono text-muted-foreground">{release.date}</span>
                    </div>
                    <ul className="space-y-3">
                      {release.changes.map((change, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-start gap-3">
                          <span className="text-primary mt-1">—</span>
                          {change}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}