import { motion } from 'framer-motion';
import { useTilt } from '../../hooks/useTilt';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

function KpiCard({ value, label, sub, delay, accent, rgb }: { value: string; label: string; sub: string; delay: number; accent: string; rgb: string }) {
  const tilt = useTilt(8);
  return (
    <motion.div
      {...anim(
        { opacity: 0, y: 0, rotateX: -90 },
        { opacity: 1, y: 0, rotateX: 0 },
        delay, 0.7
      )}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="flex flex-col justify-between rounded-[1vw] p-[2vh_1.8vw]"
      style={{
        background: `rgba(${rgb},0.04)`,
        border: `1px solid rgba(${rgb},0.22)`,
        flex: 1,
        boxShadow: `0 8px 32px rgba(${rgb},0.08), inset 0 1px 0 rgba(${rgb},0.12)`,
        transformStyle: 'preserve-3d',
      }}>
      {/* Top accent line */}
      <div style={{ height: '2px', borderRadius: '2px', background: `linear-gradient(90deg, ${accent}, transparent)`, marginBottom: '1.5vh', boxShadow: `0 0 8px ${accent}80` }} />
      <div className="font-display font-bold" style={{ fontSize: '3.8vw', color: accent, lineHeight: 1, letterSpacing: '-0.02em', textShadow: `0 0 30px ${accent}66` }}>
        {value}
      </div>
      <div>
        <div className="font-display font-semibold mt-[1.2vh]" style={{ fontSize: '1.2vw', color: '#F0F4FF', lineHeight: 1.2 }}>{label}</div>
        <div className="font-body mt-[0.4vh]" style={{ fontSize: '0.95vw', color: '#7A8BA0', lineHeight: 1.4 }}>{sub}</div>
      </div>
    </motion.div>
  );
}

export default function Slide08Traction() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F', perspective: '1200px' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 40% at 50% 35%, rgba(0,194,255,0.07) 0%, transparent 70%)' }} />

      {/* Subtle perspective grid at top */}
      <div className="absolute top-0 left-0 right-0 h-[20vh] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(0,194,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,194,255,0.08) 1px, transparent 1px)',
          backgroundSize: '5vw 5vw',
          transform: 'perspective(200px) rotateX(-55deg) scaleY(1.4)',
          transformOrigin: '50% 0%',
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 90%)',
          WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 90%)',
        }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5vh 5.5vw 4.5vh' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, y: -15 }, { opacity: 1, y: 0 }, 0.1)} className="mb-[2.5vh]">
          <div className="flex items-center gap-[0.7vw] mb-[1vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#00C2FF', boxShadow: '0 0 8px rgba(0,194,255,0.6)' }} />
            <span className="font-body uppercase tracking-widest" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Traction</span>
          </div>
          <div className="font-display font-bold text-3d-white" style={{ fontSize: '4.2vw', color: '#F0F4FF', letterSpacing: '-0.02em' }}>
            Built. Tested. <span className="text-3d-cyan" style={{ color: '#00C2FF' }}>People are using it.</span>
          </div>
        </motion.div>

        {/* KPI cards with 3D flip entrance */}
        <div className="flex" style={{ gap: '1.5vw', marginBottom: '2.2vh', perspective: '1000px' }}>
          <KpiCard value="1,200+" label="Contracts Generated"  sub="In private beta — EVM and Solana" delay={0.22} accent="#00C2FF" rgb="0,194,255" />
          <KpiCard value="847"    label="Developer Waitlist"   sub="Organic signups, zero paid acquisition" delay={0.34} accent="#00C2FF" rgb="0,194,255" />
          <KpiCard value="94%"    label="Compile Success Rate" sub="After autonomous self-healing loop" delay={0.46} accent="#F5A623" rgb="245,166,35" />
          <KpiCard value="3"      label="Enterprise LOIs"      sub="DeFi protocols in active discussions" delay={0.58} accent="#00C2FF" rgb="0,194,255" />
        </div>

        {/* Live features strip */}
        <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.65)}
          className="rounded-[0.9vw] p-[1.4vh_1.8vw] mb-[2.2vh]"
          style={{ background: 'rgba(0,194,255,0.04)', border: '1px solid rgba(0,194,255,0.15)', boxShadow: '0 0 30px rgba(0,194,255,0.04)' }}>
          <div className="font-display font-semibold mb-[1vh]" style={{ fontSize: '1.05vw', color: '#7A8BA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            What's Live Today
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.7vh 2vw' }}>
            {[
              'EVM + Solana generation, compile, audit & deploy',
              '47-pattern security audit with 0–100 scoring',
              'Self-healing compile loop (avg 1.3 retries to success)',
              'Context-aware hardening Q&A with the user',
              'Foundry + Anchor/TypeScript test suite generation',
              'REST API + team workspaces — embed anywhere',
            ].map((item, i) => (
              <motion.div key={i} {...anim({ opacity: 0, x: i % 3 === 0 ? -10 : i % 3 === 2 ? 10 : 0, y: 5 }, { opacity: 1, x: 0, y: 0 }, 0.72 + i * 0.06)}
                className="flex items-center gap-[0.7vw]">
                <div style={{ width: '0.45vw', height: '0.45vw', borderRadius: '50%', background: '#00C2FF', flexShrink: 0, boxShadow: '0 0 6px rgba(0,194,255,0.8)' }} />
                <span className="font-body" style={{ fontSize: '1.05vw', color: '#F0F4FF' }}>{item}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Roadmap */}
        <motion.div {...anim({ opacity: 0, y: 18 }, { opacity: 1, y: 0 }, 0.72)}>
          <div className="font-display font-semibold mb-[1.6vh]" style={{ fontSize: '1.05vw', color: '#7A8BA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Roadmap</div>

          <div className="relative" style={{ height: '9.5vh' }}>
            {/* Track */}
            <div className="absolute" style={{ left: 0, right: 0, top: '2.6vh', height: '2px', background: 'linear-gradient(90deg, #00C2FF 25%, rgba(0,194,255,0.2) 100%)', boxShadow: '0 0 8px rgba(0,194,255,0.3)' }} />

            {[
              { pos: '2%',  label: 'Now',    sub: 'Beta live',           dot: '#00C2FF',               glow: '0,194,255',  big: true },
              { pos: '25%', label: 'Q3 2026', sub: 'Mainnet deploy',     dot: 'rgba(0,194,255,0.5)',   glow: '0,194,255' },
              { pos: '50%', label: 'Q4 2026', sub: 'On-chain monitoring',dot: 'rgba(0,194,255,0.35)',  glow: '0,194,255' },
              { pos: '74%', label: 'Q1 2027', sub: 'Template marketplace',dot:'rgba(245,166,35,0.5)', glow: '245,166,35' },
              { pos: '97%', label: 'Q2 2027', sub: 'Enterprise SLA',     dot: 'rgba(245,166,35,0.35)',glow: '245,166,35' },
            ].map(({ pos, label, sub, dot, glow, big }, i) => (
              <motion.div key={label} {...anim({ opacity: 0, y: 8 }, { opacity: 1, y: 0 }, 0.82 + i * 0.07)}
                className="absolute flex flex-col items-center" style={{ left: pos, transform: 'translateX(-50%)' }}>
                <div style={{
                  width: big ? '1.5vw' : '1.1vw',
                  height: big ? '1.5vw' : '1.1vw',
                  borderRadius: '50%',
                  background: dot,
                  marginBottom: '0.7vh',
                  boxShadow: big ? `0 0 16px rgba(${glow},0.9)` : `0 0 8px rgba(${glow},0.5)`,
                  border: big ? undefined : `1.5px solid rgba(${glow},0.5)`,
                  flexShrink: 0,
                }} />
                <div style={{ width: '2px', height: '1.6vh', background: `rgba(${glow},0.4)` }} />
                <div className="font-display font-semibold text-center" style={{ fontSize: '1.05vw', color: big ? '#00C2FF' : '#F0F4FF', marginTop: '0.5vh' }}>{label}</div>
                <div className="font-body text-center" style={{ fontSize: '0.88vw', color: '#7A8BA0' }}>{sub}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 50%, transparent 100%)', boxShadow: '0 0 10px rgba(0,194,255,0.3)' }} />
    </div>
  );
}
