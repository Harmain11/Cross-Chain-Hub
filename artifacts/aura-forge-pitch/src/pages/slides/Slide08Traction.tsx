import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

export default function Slide08Traction() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 40% at 50% 35%, rgba(0,194,255,0.05) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5.5vh 6vw 5vh' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, y: -15 }, { opacity: 1, y: 0 }, 0.1)} className="mb-[3.5vh]">
          <div className="flex items-center gap-[0.7vw] mb-[1.2vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#00C2FF' }} />
            <span className="font-body uppercase tracking-widest text-muted" style={{ fontSize: '1.1vw' }}>Traction &amp; Roadmap</span>
          </div>
          <div className="font-display font-bold" style={{ fontSize: '4.4vw', color: '#F0F4FF', letterSpacing: '-0.02em' }}>
            Where we stand.
          </div>
        </motion.div>

        {/* Live features — 2 columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.4vh 3vw', marginBottom: '4.5vh' }}>
          <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.25)}
            className="flex items-start gap-[1vw] rounded-[0.7vw] p-[1.4vh_1.4vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-bold shrink-0" style={{ fontSize: '1.3vw', color: '#00C2FF', marginTop: '0.1vh' }}>✓</div>
            <div className="font-body" style={{ fontSize: '1.2vw', color: '#F0F4FF', lineHeight: 1.4 }}>EVM + Solana generation, compile, audit &amp; deploy — <span style={{ color: '#00C2FF' }}>live</span></div>
          </motion.div>

          <motion.div {...anim({ opacity: 0, x: 15 }, { opacity: 1, x: 0 }, 0.3)}
            className="flex items-start gap-[1vw] rounded-[0.7vw] p-[1.4vh_1.4vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-bold shrink-0" style={{ fontSize: '1.3vw', color: '#00C2FF', marginTop: '0.1vh' }}>✓</div>
            <div className="font-body" style={{ fontSize: '1.2vw', color: '#F0F4FF', lineHeight: 1.4 }}>Self-healing compile loop — up to 3 auto-repairs per job</div>
          </motion.div>

          <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.38)}
            className="flex items-start gap-[1vw] rounded-[0.7vw] p-[1.4vh_1.4vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-bold shrink-0" style={{ fontSize: '1.3vw', color: '#00C2FF', marginTop: '0.1vh' }}>✓</div>
            <div className="font-body" style={{ fontSize: '1.2vw', color: '#F0F4FF', lineHeight: 1.4 }}>Multi-agent audit + hardening loop with 0–100 scoring</div>
          </motion.div>

          <motion.div {...anim({ opacity: 0, x: 15 }, { opacity: 1, x: 0 }, 0.43)}
            className="flex items-start gap-[1vw] rounded-[0.7vw] p-[1.4vh_1.4vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-bold shrink-0" style={{ fontSize: '1.3vw', color: '#00C2FF', marginTop: '0.1vh' }}>✓</div>
            <div className="font-body" style={{ fontSize: '1.2vw', color: '#F0F4FF', lineHeight: 1.4 }}>Team workspace + API key infrastructure built</div>
          </motion.div>

          <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.5)}
            className="flex items-start gap-[1vw] rounded-[0.7vw] p-[1.4vh_1.4vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-bold shrink-0" style={{ fontSize: '1.3vw', color: '#00C2FF', marginTop: '0.1vh' }}>✓</div>
            <div className="font-body" style={{ fontSize: '1.2vw', color: '#F0F4FF', lineHeight: 1.4 }}>Generated test suites (Foundry + Anchor/TypeScript)</div>
          </motion.div>

          <motion.div {...anim({ opacity: 0, x: 15 }, { opacity: 1, x: 0 }, 0.55)}
            className="flex items-start gap-[1vw] rounded-[0.7vw] p-[1.4vh_1.4vw]"
            style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.15)' }}>
            <div className="font-display font-bold shrink-0" style={{ fontSize: '1.3vw', color: '#00C2FF', marginTop: '0.1vh' }}>✓</div>
            <div className="font-body" style={{ fontSize: '1.2vw', color: '#F0F4FF', lineHeight: 1.4 }}>Context-aware security hardening with user Q&amp;A flow</div>
          </motion.div>
        </div>

        {/* Roadmap timeline */}
        <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.65)} className="relative">
          <div className="font-display font-semibold mb-[2.5vh]" style={{ fontSize: '1.3vw', color: '#7A8BA0', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Roadmap</div>

          {/* Track */}
          <div className="relative" style={{ height: '10vh' }}>
            <div className="absolute" style={{ left: 0, right: 0, top: '3.5vh', height: '2px', background: 'linear-gradient(90deg, #00C2FF, rgba(0,194,255,0.3))' }} />

            {/* Node 1 — Now */}
            <div className="absolute flex flex-col items-center" style={{ left: '2%', top: 0 }}>
              <div style={{ width: '1.5vw', height: '1.5vw', borderRadius: '50%', background: '#00C2FF', boxShadow: '0 0 12px rgba(0,194,255,0.7)', marginBottom: '1vh' }} />
              <div style={{ width: '2px', height: '2vh', background: '#00C2FF' }} />
              <div className="font-display font-bold mt-[0.8vh] text-center" style={{ fontSize: '1.1vw', color: '#00C2FF' }}>Now</div>
              <div className="font-body text-center" style={{ fontSize: '0.95vw', color: '#7A8BA0', lineHeight: 1.3 }}>Live product</div>
            </div>

            {/* Node 2 */}
            <div className="absolute flex flex-col items-center" style={{ left: '25%', top: 0 }}>
              <div style={{ width: '1.2vw', height: '1.2vw', borderRadius: '50%', background: 'rgba(0,194,255,0.3)', border: '2px solid rgba(0,194,255,0.5)', marginBottom: '1vh' }} />
              <div style={{ width: '2px', height: '2vh', background: 'rgba(0,194,255,0.4)' }} />
              <div className="font-display font-semibold mt-[0.8vh] text-center" style={{ fontSize: '1.1vw', color: '#F0F4FF' }}>Q3 2026</div>
              <div className="font-body text-center" style={{ fontSize: '0.95vw', color: '#7A8BA0', lineHeight: 1.3 }}>Mainnet deploy</div>
            </div>

            {/* Node 3 */}
            <div className="absolute flex flex-col items-center" style={{ left: '50%', top: 0, transform: 'translateX(-50%)' }}>
              <div style={{ width: '1.2vw', height: '1.2vw', borderRadius: '50%', background: 'rgba(0,194,255,0.2)', border: '2px solid rgba(0,194,255,0.35)', marginBottom: '1vh' }} />
              <div style={{ width: '2px', height: '2vh', background: 'rgba(0,194,255,0.3)' }} />
              <div className="font-display font-semibold mt-[0.8vh] text-center" style={{ fontSize: '1.1vw', color: '#F0F4FF' }}>Q4 2026</div>
              <div className="font-body text-center" style={{ fontSize: '0.95vw', color: '#7A8BA0', lineHeight: 1.3 }}>Monitoring</div>
            </div>

            {/* Node 4 */}
            <div className="absolute flex flex-col items-center" style={{ left: '74%', top: 0 }}>
              <div style={{ width: '1.2vw', height: '1.2vw', borderRadius: '50%', background: 'rgba(245,166,35,0.2)', border: '2px solid rgba(245,166,35,0.4)', marginBottom: '1vh' }} />
              <div style={{ width: '2px', height: '2vh', background: 'rgba(245,166,35,0.3)' }} />
              <div className="font-display font-semibold mt-[0.8vh] text-center" style={{ fontSize: '1.1vw', color: '#F0F4FF' }}>Q1 2027</div>
              <div className="font-body text-center" style={{ fontSize: '0.95vw', color: '#7A8BA0', lineHeight: 1.3 }}>Template marketplace</div>
            </div>

            {/* Node 5 */}
            <div className="absolute flex flex-col items-center" style={{ right: '2%', top: 0 }}>
              <div style={{ width: '1.2vw', height: '1.2vw', borderRadius: '50%', background: 'rgba(245,166,35,0.15)', border: '2px solid rgba(245,166,35,0.3)', marginBottom: '1vh' }} />
              <div style={{ width: '2px', height: '2vh', background: 'rgba(245,166,35,0.25)' }} />
              <div className="font-display font-semibold mt-[0.8vh] text-center" style={{ fontSize: '1.1vw', color: '#F0F4FF' }}>Q2 2027</div>
              <div className="font-body text-center" style={{ fontSize: '0.95vw', color: '#7A8BA0', lineHeight: 1.3 }}>Enterprise</div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 50%, transparent 100%)' }} />
    </div>
  );
}
