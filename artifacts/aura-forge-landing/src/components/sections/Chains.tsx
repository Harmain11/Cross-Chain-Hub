import { motion } from 'framer-motion';
import { SiEthereum, SiSolana, SiPolygon } from 'react-icons/si';

const chains = [
  { name: 'Ethereum', icon: SiEthereum, type: 'EVM (Solidity)' },
  { name: 'Base', icon: null, type: 'EVM (Solidity)' },
  { name: 'Arbitrum', icon: null, type: 'EVM (Solidity)' },
  { name: 'Optimism', icon: null, type: 'EVM (Solidity)' },
  { name: 'Polygon', icon: SiPolygon, type: 'EVM (Solidity)' },
  { name: 'Solana', icon: SiSolana, type: 'Rust / Anchor', accent: 'text-purple-400' },
];

export default function Chains() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Write once. Deploy anywhere.</h2>
        <p className="text-lg text-muted-foreground mb-16 max-w-2xl mx-auto">
          AURA Forge understands the specific security models, gas optimizations, and account structures of different ecosystems.
        </p>

        <div className="flex flex-wrap justify-center gap-4 md:gap-6 max-w-4xl mx-auto">
          {chains.map((chain, i) => (
            <motion.div
              key={chain.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-center gap-3 px-6 py-4 rounded-xl border border-border bg-card/50 hover:bg-card hover:border-primary/50 transition-colors"
            >
              {chain.icon && <chain.icon className={`w-6 h-6 ${chain.accent || 'text-white'}`} />}
              {!chain.icon && <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-primary flex items-center justify-center text-[10px] font-bold text-white uppercase">{chain.name[0]}</div>}
              <div className="text-left">
                <div className="font-bold text-white">{chain.name}</div>
                <div className="text-xs text-muted-foreground font-mono">{chain.type}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
