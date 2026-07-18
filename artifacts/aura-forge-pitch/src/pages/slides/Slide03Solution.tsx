import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

function StepBox({ icon, label, sub, delay, color = '#00C2FF' }: { icon: string; label: string; sub: string; delay: number; color?: string }) {
  return (
    <motion.div {...anim({ opacity: 0, y: 30 }, { opacity: 1, y: 0 }, delay)}
      className="flex flex-col items-center text-center" style={{ flex: 1 }}>
      <div className="flex items-center justify-center rounded-[1vw] mb-[1.5vh]"
        style={{ width: '5.5vw', height: '5.5vw', background: `rgba(0,194,255,0.08)`, border: `1px solid ${color}40`, fontSize: '2.4vw' }}>
        {icon}
      </div>
      <div className="font-display font-semibold" style={{ fontSize: '1.3vw', color: '#F0F4FF', lineHeight: 1.2 }}>{label}</div>
      <div className="font-body mt-[0.6vh]" style={{ fontSize: '1.05vw', color: '#7A8BA0', lineHeight: 1.4 }}>{sub}</div>
    </motion.div>
  );
}

function Arrow({ delay }: { delay: number }) {
  return (
    <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, delay)}
      className="flex items-center justify-center" style={{ paddingTop: '2vh' }}>
      <svg width="2.5vw" height="2.5vw" viewBox="0 0 24 24" fill="none" style={{ width: '2.5vw', height: '2.5vw' }}>
        <path d="M5 12h14M13 6l6 6-6 6" stroke="rgba(0,194,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}

export default function Slide03Solution() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(0,194,255,0.06) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '6vh 6vw 5vh' }}>
        {/* Header */}
        <div className="mb-[4vh]">
          <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.1)}
            className="flex items-center gap-[0.7vw] mb-[1.8vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#00C2FF' }} />
            <span className="font-body uppercase tracking-widest text-muted" style={{ fontSize: '1.1vw' }}>The Solution</span>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.2, 0.7)}>
            <span className="font-display font-bold" style={{ fontSize: '5vw', color: '#00C2FF', letterSpacing: '-0.02em' }}>Describe it. </span>
            <span className="font-display font-bold" style={{ fontSize: '5vw', color: '#F0F4FF', letterSpacing: '-0.02em' }}>We build it.</span>
          </motion.div>
        </div>

        {/* Pipeline */}
        <div className="flex items-start" style={{ gap: '0', marginBottom: '3.5vh' }}>
          <StepBox icon="💬" label="Your Prompt" sub="Plain English description" delay={0.3} />
          <Arrow delay={0.38} />
          <StepBox icon="🤖" label="Generation Agent" sub="Writes Solidity or Anchor/Rust" delay={0.42} />
          <Arrow delay={0.5} />
          <StepBox icon="⚙️" label="Real Compiler" sub="solc · cargo-build-sbf" delay={0.54} />
          <Arrow delay={0.62} />
          <StepBox icon="🛡️" label="Audit Agent" sub="Scores 0–100, flags issues" delay={0.66} />
          <Arrow delay={0.74} />
          <StepBox icon="🔁" label="Hardening Agent" sub="Remediates every finding" delay={0.78} />
          <Arrow delay={0.86} />
          <StepBox icon="🚀" label="Deploy" sub="One-click to testnet" delay={0.9} />
        </div>

        {/* Loop label */}
        <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.95)}
          className="flex justify-center mb-[3.5vh]">
          <div className="flex items-center gap-[0.8vw] px-[2vw] py-[0.8vh] rounded-full"
            style={{ background: 'rgba(0,194,255,0.08)', border: '1px solid rgba(0,194,255,0.25)' }}>
            <svg width="1.4vw" height="1.4vw" viewBox="0 0 24 24" fill="none" style={{ width: '1.4vw', height: '1.4vw' }}>
              <path d="M17 1l4 4-4 4" stroke="#00C2FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4" stroke="#00C2FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 13v2a4 4 0 01-4 4H3" stroke="#00C2FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-display font-semibold" style={{ color: '#00C2FF', fontSize: '1.2vw' }}>
              Autonomous multi-agent loop — Audit ↔ Harden until security target is reached
            </span>
          </div>
        </motion.div>

        {/* Differentiators */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.4vh 2vw' }}>
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 1.0)}
            className="rounded-[0.8vw] p-[1.6vh_1.6vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-semibold mb-[0.5vh]" style={{ fontSize: '1.3vw', color: '#00C2FF' }}>Self-Healing Compile</div>
            <div className="font-body" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Up to 3 automatic error repairs per job</div>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 1.1)}
            className="rounded-[0.8vw] p-[1.6vh_1.6vw]"
            style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.2)' }}>
            <div className="font-display font-semibold mb-[0.5vh]" style={{ fontSize: '1.3vw', color: '#F5A623' }}>Real Binaries</div>
            <div className="font-body" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Actual .so / bytecode — not just source code</div>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 1.2)}
            className="rounded-[0.8vw] p-[1.6vh_1.6vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-semibold mb-[0.5vh]" style={{ fontSize: '1.3vw', color: '#00C2FF' }}>API-First</div>
            <div className="font-body" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>REST API + team workspaces built in</div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 50%, transparent 100%)' }} />
    </div>
  );
}
