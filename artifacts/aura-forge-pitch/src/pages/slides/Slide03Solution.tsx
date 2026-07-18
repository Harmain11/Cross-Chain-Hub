import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

function StepBox({ icon, label, sub, detail, delay, accent = '#00C2FF' }: { icon: string; label: string; sub: string; detail: string; delay: number; accent?: string }) {
  return (
    <motion.div {...anim({ opacity: 0, y: 30 }, { opacity: 1, y: 0 }, delay)}
      className="flex flex-col items-center text-center" style={{ flex: 1 }}>
      <div className="flex items-center justify-center rounded-[1vw] mb-[1.2vh]"
        style={{ width: '5vw', height: '5vw', background: `rgba(0,194,255,0.08)`, border: `1.5px solid ${accent}50`, fontSize: '2.1vw' }}>
        {icon}
      </div>
      <div className="font-display font-semibold" style={{ fontSize: '1.2vw', color: '#F0F4FF', lineHeight: 1.2 }}>{label}</div>
      <div className="font-body mt-[0.4vh]" style={{ fontSize: '0.95vw', color: '#7A8BA0', lineHeight: 1.35 }}>{sub}</div>
      <div className="font-body mt-[0.4vh]" style={{ fontSize: '0.88vw', color: accent, lineHeight: 1.3, opacity: 0.85 }}>{detail}</div>
    </motion.div>
  );
}

function Arrow({ delay }: { delay: number }) {
  return (
    <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, delay)}
      className="flex items-center justify-center shrink-0" style={{ paddingTop: '1.5vh', width: '2.5vw' }}>
      <svg viewBox="0 0 24 24" fill="none" style={{ width: '2vw', height: '2vw' }}>
        <path d="M5 12h14M13 6l6 6-6 6" stroke="rgba(0,194,255,0.4)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}

export default function Slide03Solution() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 60%, rgba(0,194,255,0.06) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5.5vh 5vw 4.5vh' }}>
        {/* Header */}
        <div className="mb-[3vh]">
          <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.1)}
            className="flex items-center gap-[0.7vw] mb-[1.5vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#00C2FF' }} />
            <span className="font-body uppercase tracking-widest text-muted" style={{ fontSize: '1.1vw' }}>The Solution</span>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.2, 0.7)}>
            <span className="font-display font-bold" style={{ fontSize: '4.8vw', color: '#00C2FF', letterSpacing: '-0.02em' }}>Describe it. </span>
            <span className="font-display font-bold" style={{ fontSize: '4.8vw', color: '#F0F4FF', letterSpacing: '-0.02em' }}>We build it.</span>
          </motion.div>
          <motion.p {...anim({ opacity: 0 }, { opacity: 1 }, 0.3)}
            className="font-body" style={{ fontSize: '1.3vw', color: '#4A5568', marginTop: '0.8vh' }}>
            Six autonomous agents. One pipeline. Real compiler. Real binary. No human required.
          </motion.p>
        </div>

        {/* Pipeline */}
        <div className="flex items-start" style={{ gap: 0, marginBottom: '3vh' }}>
          <StepBox icon="💬" label="Your Prompt" sub="Plain English" detail="Any skill level" delay={0.3} />
          <Arrow delay={0.37} />
          <StepBox icon="🤖" label="Generation" sub="Solidity or Anchor/Rust" detail="Haiku-speed output" delay={0.42} />
          <Arrow delay={0.49} />
          <StepBox icon="⚙️" label="Real Compiler" sub="solc · cargo-build-sbf" detail="Actual ELF / bytecode" delay={0.54} accent="#F5A623" />
          <Arrow delay={0.61} />
          <StepBox icon="🛡️" label="Audit Agent" sub="47 vulnerability patterns" detail="0–100 security score" delay={0.66} />
          <Arrow delay={0.73} />
          <StepBox icon="🔁" label="Hardening" sub="Auto-remediates findings" detail="Loops until score ≥ 85" delay={0.78} />
          <Arrow delay={0.85} />
          <StepBox icon="🚀" label="Deploy" sub="One-click to testnet" detail="ABI + IDL returned" delay={0.9} />
        </div>

        {/* Loop badge */}
        <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.95)}
          className="flex justify-center mb-[2.8vh]">
          <div className="flex items-center gap-[0.8vw] px-[2vw] py-[0.8vh] rounded-full"
            style={{ background: 'rgba(0,194,255,0.08)', border: '1px solid rgba(0,194,255,0.25)' }}>
            <svg viewBox="0 0 24 24" fill="none" style={{ width: '1.3vw', height: '1.3vw' }}>
              <path d="M17 1l4 4-4 4" stroke="#00C2FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4" stroke="#00C2FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 13v2a4 4 0 01-4 4H3" stroke="#00C2FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-display font-semibold" style={{ color: '#00C2FF', fontSize: '1.15vw' }}>
              Autonomous loop — Audit ↔ Harden until security target reached. No human in the loop.
            </span>
          </div>
        </motion.div>

        {/* Differentiator cards — 4 across, more specific */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '1.2vh 1.5vw' }}>
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 1.0)}
            className="rounded-[0.8vw] p-[1.5vh_1.4vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-semibold mb-[0.4vh]" style={{ fontSize: '1.2vw', color: '#00C2FF' }}>47 Vuln Patterns</div>
            <div className="font-body" style={{ fontSize: '1vw', color: '#7A8BA0' }}>Re-entrancy, overflow, access control, front-running, and more</div>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 1.08)}
            className="rounded-[0.8vw] p-[1.5vh_1.4vw]"
            style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.2)' }}>
            <div className="font-display font-semibold mb-[0.4vh]" style={{ fontSize: '1.2vw', color: '#F5A623' }}>Real Binaries</div>
            <div className="font-body" style={{ fontSize: '1vw', color: '#7A8BA0' }}>Actual .so / EVM bytecode — not a text snippet that crashes on deploy</div>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 1.16)}
            className="rounded-[0.8vw] p-[1.5vh_1.4vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-semibold mb-[0.4vh]" style={{ fontSize: '1.2vw', color: '#00C2FF' }}>Self-Healing</div>
            <div className="font-body" style={{ fontSize: '1vw', color: '#7A8BA0' }}>94% first-pass compile success after auto-repair loop</div>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 1.24)}
            className="rounded-[0.8vw] p-[1.5vh_1.4vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-semibold mb-[0.4vh]" style={{ fontSize: '1.2vw', color: '#00C2FF' }}>API-First</div>
            <div className="font-body" style={{ fontSize: '1vw', color: '#7A8BA0' }}>REST API + team workspaces — embeds in any product or CI/CD pipeline</div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 50%, transparent 100%)' }} />
    </div>
  );
}
