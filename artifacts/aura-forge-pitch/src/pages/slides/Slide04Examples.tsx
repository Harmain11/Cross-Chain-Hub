import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

const examples = [
  {
    prompt: 'Build me a staking contract where users deposit ETH and earn 8% APY, with auto-compounding every 24 hours and an emergency withdraw.',
    label: 'DeFi Staking Pool',
    chain: 'EVM',
    chainColor: '#627EEA',
    chainRgb: '98,126,234',
    time: '9 min',
    score: 94,
    tag: 'Solidity · EVM Mainnet',
    icon: '⬡',
  },
  {
    prompt: '10,000-piece NFT drop on Solana. Whitelist phase first, then public mint. Reveal mechanic after sellout. Royalties to my wallet.',
    label: 'NFT Drop + Whitelist',
    chain: 'Solana',
    chainColor: '#9945FF',
    chainRgb: '153,69,255',
    time: '11 min',
    score: 91,
    tag: 'Anchor · Solana Devnet → Mainnet',
    icon: '◎',
  },
  {
    prompt: '3-of-5 multisig treasury for our DAO. Any spend over 5 ETH needs a 48-hour timelock and on-chain proposal vote.',
    label: 'DAO Treasury Multisig',
    chain: 'EVM',
    chainColor: '#627EEA',
    chainRgb: '98,126,234',
    time: '7 min',
    score: 97,
    tag: 'Solidity · Governance',
    icon: '⬡',
  },
  {
    prompt: 'Team token allocation — 1-year cliff, then linear vesting over 3 years. Revocable by the company if someone leaves.',
    label: 'Token Vesting',
    chain: 'EVM',
    chainColor: '#627EEA',
    chainRgb: '98,126,234',
    time: '5 min',
    score: 99,
    tag: 'Solidity · ERC-20',
    icon: '⬡',
  },
  {
    prompt: 'USDC presale. Hard cap $500K, soft cap $100K. Auto-refund if soft cap isn\'t hit. Whitelist-only for the first 24 hours.',
    label: 'Launchpad Presale',
    chain: 'EVM',
    chainColor: '#627EEA',
    chainRgb: '98,126,234',
    time: '8 min',
    score: 93,
    tag: 'Solidity · Launchpad',
    icon: '⬡',
  },
];

function ScoreBar({ score, accent }: { score: number; accent: string }) {
  return (
    <div className="flex items-center gap-[0.5vw]">
      <div style={{ flex: 1, height: '0.35vh', background: 'rgba(255,255,255,0.07)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${score}%`, height: '100%', background: score >= 95 ? '#00C2FF' : score >= 90 ? '#9F58FA' : '#F5A623', borderRadius: 99 }} />
      </div>
      <span className="font-display font-bold" style={{ fontSize: '0.85vw', color: score >= 95 ? '#00C2FF' : score >= 90 ? '#9F58FA' : '#F5A623' }}>
        {score}/100
      </span>
    </div>
  );
}

export default function Slide04Examples() {
  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden"
      style={{ padding: '4vh 4vw 3vh', background: 'linear-gradient(135deg, #050C18 0%, #080F1E 60%, #060A16 100%)' }}>

      {/* Ambient glow */}
      <div style={{ position: 'absolute', top: '-15%', right: '5%', width: '40vw', height: '40vw', background: 'radial-gradient(circle, rgba(0,194,255,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '10%', width: '30vw', height: '30vw', background: 'radial-gradient(circle, rgba(159,88,250,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Header */}
      <motion.div {...anim({ opacity: 0, y: -10 }, { opacity: 1, y: 0 }, 0)}>
        <div className="flex items-center gap-[0.8vw] mb-[0.6vh]">
          <div style={{ width: '2.5vw', height: '2px', background: '#00C2FF' }} />
          <span className="font-body" style={{ fontSize: '0.85vw', color: '#00C2FF', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Built with AURA Forge</span>
        </div>
        <h1 className="font-display font-black" style={{ fontSize: '3.6vw', lineHeight: 1.08, color: '#F0F4FF' }}>
          Describe it. <span style={{ color: '#00C2FF' }}>Ship it.</span>
        </h1>
        <p className="font-body mt-[0.6vh]" style={{ fontSize: '1.05vw', color: '#7A8BA0' }}>
          Plain English in → compiled, audited, mainnet-ready contract out.
        </p>
      </motion.div>

      {/* Cards grid — 3 top, 2 bottom centered */}
      <div className="flex-1 flex flex-col justify-center" style={{ gap: '1.2vh', marginTop: '2vh' }}>
        {/* Row 1 — 3 cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.2vw' }}>
          {examples.slice(0, 3).map((ex, i) => (
            <motion.div key={ex.label}
              {...anim({ opacity: 0, y: 18 }, { opacity: 1, y: 0 }, 0.15 + i * 0.1)}
              className="rounded-[0.9vw] flex flex-col"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '1.4vh 1.3vw', backdropFilter: 'blur(8px)' }}>

              {/* Chain badge + label */}
              <div className="flex items-center justify-between mb-[1vh]">
                <div className="flex items-center gap-[0.5vw]">
                  <span style={{ fontSize: '1.1vw', color: ex.chainColor }}>{ex.icon}</span>
                  <span className="font-display font-bold" style={{ fontSize: '1.05vw', color: '#F0F4FF' }}>{ex.label}</span>
                </div>
                <span className="font-body rounded-full px-[0.6vw] py-[0.2vh]"
                  style={{ fontSize: '0.72vw', color: ex.chainColor, background: `rgba(${ex.chainRgb},0.12)`, border: `1px solid rgba(${ex.chainRgb},0.25)` }}>
                  {ex.chain}
                </span>
              </div>

              {/* Prompt bubble */}
              <div className="flex-1 rounded-[0.5vw] p-[0.9vh_0.9vw] mb-[1vh]"
                style={{ background: 'rgba(0,194,255,0.04)', border: '1px solid rgba(0,194,255,0.1)' }}>
                <div className="flex items-center gap-[0.4vw] mb-[0.4vh]">
                  <div style={{ width: '0.35vw', height: '0.35vw', borderRadius: '50%', background: '#00C2FF' }} />
                  <span className="font-body" style={{ fontSize: '0.7vw', color: '#00C2FF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Prompt</span>
                </div>
                <p className="font-body" style={{ fontSize: '0.82vw', color: '#9AAFC5', lineHeight: 1.55, fontStyle: 'italic' }}>
                  "{ex.prompt}"
                </p>
              </div>

              {/* Meta row */}
              <div className="flex items-center justify-between mb-[0.6vh]">
                <span className="font-body" style={{ fontSize: '0.75vw', color: '#4A5A70' }}>{ex.tag}</span>
                <div className="flex items-center gap-[0.4vw]">
                  <div style={{ width: '0.35vw', height: '0.35vw', borderRadius: '50%', background: '#00C2FF', boxShadow: '0 0 4px rgba(0,194,255,0.8)' }} />
                  <span className="font-display font-bold" style={{ fontSize: '0.85vw', color: '#00C2FF' }}>{ex.time}</span>
                </div>
              </div>

              {/* Audit score */}
              <div>
                <div className="flex justify-between mb-[0.3vh]">
                  <span className="font-body" style={{ fontSize: '0.72vw', color: '#4A5A70', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Audit score</span>
                </div>
                <ScoreBar score={ex.score} accent={ex.chainColor} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Row 2 — 2 cards + stats panel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.2vw' }}>
          {examples.slice(3).map((ex, i) => (
            <motion.div key={ex.label}
              {...anim({ opacity: 0, y: 18 }, { opacity: 1, y: 0 }, 0.45 + i * 0.1)}
              className="rounded-[0.9vw] flex flex-col"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', padding: '1.4vh 1.3vw', backdropFilter: 'blur(8px)' }}>

              {/* Chain badge + label */}
              <div className="flex items-center justify-between mb-[1vh]">
                <div className="flex items-center gap-[0.5vw]">
                  <span style={{ fontSize: '1.1vw', color: ex.chainColor }}>{ex.icon}</span>
                  <span className="font-display font-bold" style={{ fontSize: '1.05vw', color: '#F0F4FF' }}>{ex.label}</span>
                </div>
                <span className="font-body rounded-full px-[0.6vw] py-[0.2vh]"
                  style={{ fontSize: '0.72vw', color: ex.chainColor, background: `rgba(${ex.chainRgb},0.12)`, border: `1px solid rgba(${ex.chainRgb},0.25)` }}>
                  {ex.chain}
                </span>
              </div>

              {/* Prompt bubble */}
              <div className="flex-1 rounded-[0.5vw] p-[0.9vh_0.9vw] mb-[1vh]"
                style={{ background: 'rgba(0,194,255,0.04)', border: '1px solid rgba(0,194,255,0.1)' }}>
                <div className="flex items-center gap-[0.4vw] mb-[0.4vh]">
                  <div style={{ width: '0.35vw', height: '0.35vw', borderRadius: '50%', background: '#00C2FF' }} />
                  <span className="font-body" style={{ fontSize: '0.7vw', color: '#00C2FF', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Prompt</span>
                </div>
                <p className="font-body" style={{ fontSize: '0.82vw', color: '#9AAFC5', lineHeight: 1.55, fontStyle: 'italic' }}>
                  "{ex.prompt}"
                </p>
              </div>

              {/* Meta row */}
              <div className="flex items-center justify-between mb-[0.6vh]">
                <span className="font-body" style={{ fontSize: '0.75vw', color: '#4A5A70' }}>{ex.tag}</span>
                <div className="flex items-center gap-[0.4vw]">
                  <div style={{ width: '0.35vw', height: '0.35vw', borderRadius: '50%', background: '#00C2FF', boxShadow: '0 0 4px rgba(0,194,255,0.8)' }} />
                  <span className="font-display font-bold" style={{ fontSize: '0.85vw', color: '#00C2FF' }}>{ex.time}</span>
                </div>
              </div>
              <ScoreBar score={ex.score} accent={ex.chainColor} />
            </motion.div>
          ))}

          {/* Stats panel — fills the third column */}
          <motion.div {...anim({ opacity: 0, y: 18 }, { opacity: 1, y: 0 }, 0.6)}
            className="rounded-[0.9vw] flex flex-col justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(0,194,255,0.06) 0%, rgba(159,88,250,0.06) 100%)', border: '1px solid rgba(0,194,255,0.15)', padding: '1.4vh 1.5vw', gap: '1.6vh' }}>
            {[
              { val: '< 12 min', label: 'avg. time to mainnet-ready' },
              { val: '93 / 100', label: 'avg. audit score across beta' },
              { val: '1,200+', label: 'contracts shipped by beta devs' },
              { val: 'EVM + Solana', label: 'both major chains, one prompt' },
            ].map(({ val, label }) => (
              <div key={label} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.2vh' }}>
                <div className="font-display font-black" style={{ fontSize: '1.55vw', color: '#00C2FF', lineHeight: 1 }}>{val}</div>
                <div className="font-body mt-[0.3vh]" style={{ fontSize: '0.8vw', color: '#4A5A70' }}>{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Footer stat */}
      <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.7)}
        className="flex items-center justify-center gap-[2.5vw] mt-[1.5vh]">
        {[
          { val: '< 12 min', label: 'avg. time to mainnet-ready' },
          { val: '93/100', label: 'avg. audit score across beta' },
          { val: '1,200+', label: 'contracts shipped by beta devs' },
        ].map(({ val, label }) => (
          <div key={label} className="flex items-center gap-[0.8vw]">
            <span className="font-display font-bold" style={{ fontSize: '1.3vw', color: '#00C2FF' }}>{val}</span>
            <span className="font-body" style={{ fontSize: '0.82vw', color: '#4A5A70' }}>{label}</span>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
