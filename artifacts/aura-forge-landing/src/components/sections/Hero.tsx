import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const lines = [
  { text: 'aura-forge', delay: 0, type: 'input' },
  { text: '> Build me a staking contract with 8% APY and emergency withdraw', delay: 800, type: 'prompt' },
  { text: '[Generating]  ████░░░░░░  StakingVault.sol', delay: 2500, type: 'progress' },
  { text: '[Compiling]   ████████░░  0 errors', delay: 3800, type: 'progress' },
  { text: '[Auditing]    ██████████  Security score: 91/100', delay: 5200, type: 'progress' },
  { text: '[Hardening]   ██████████  Final score: 97/100', delay: 7000, type: 'progress' },
  { text: '[Done]        Saved to ./contracts/StakingVault.sol', delay: 8500, type: 'success' }
];

function AnimatedTerminal() {
  const [visibleLines, setVisibleLines] = useState<number[]>([]);

  useEffect(() => {
    const timers = lines.map((line, index) => 
      setTimeout(() => {
        setVisibleLines(prev => [...prev, index]);
      }, line.delay)
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="relative w-full max-w-2xl mx-auto mt-16 rounded-xl overflow-hidden border border-border bg-[#050505] shadow-[0_0_50px_rgba(0,240,255,0.1)]">
      {/* Terminal Header */}
      <div className="flex items-center px-4 py-3 border-b border-border bg-[#0a0a0a]">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        <div className="flex-1 text-center font-mono text-xs text-muted-foreground">
          bash — aura-forge
        </div>
      </div>
      
      {/* Terminal Body */}
      <div className="p-6 font-mono text-sm h-[320px] overflow-hidden flex flex-col gap-3">
        {lines.map((line, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ 
              opacity: visibleLines.includes(index) ? 1 : 0,
              y: visibleLines.includes(index) ? 0 : 10
            }}
            transition={{ duration: 0.3 }}
            className={`
              ${line.type === 'input' ? 'text-primary' : ''}
              ${line.type === 'prompt' ? 'text-white' : ''}
              ${line.type === 'progress' ? 'text-muted-foreground' : ''}
              ${line.type === 'success' ? 'text-green-400' : ''}
            `}
          >
            {line.type === 'input' && <span className="text-muted-foreground mr-2">$</span>}
            {line.text}
          </motion.div>
        ))}
        {visibleLines.length === lines.length && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, repeat: Infinity, repeatType: "reverse" }}
            className="w-2 h-4 bg-primary mt-2"
          />
        )}
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden flex items-center justify-center min-h-[90vh]">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              V1.0 NOW AVAILABLE
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight text-white mb-6"
          >
            The AI-powered <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-primary to-primary">smart contract</span> factory.
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto"
          >
            Describe a contract in plain English. Get production-ready, audited, compiled Solidity or Rust code in seconds. Never lose a weekend to a broken audit again.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <a 
              href="/aura-forge/"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 font-mono text-base font-bold text-black bg-primary rounded hover:bg-primary/90 transition-all duration-200 shadow-[0_0_30px_rgba(0,240,255,0.3)] hover:shadow-[0_0_50px_rgba(0,240,255,0.5)]"
            >
              Start Forging
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
            <a 
              href="#cli"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-4 font-mono text-base font-medium text-white border border-border bg-card hover:bg-secondary rounded transition-colors"
            >
              <span className="text-muted-foreground mr-2">npm i -g</span> @aura-forge/cli
            </a>
          </motion.div>
        </div>

        <AnimatedTerminal />
      </div>
    </section>
  );
}
