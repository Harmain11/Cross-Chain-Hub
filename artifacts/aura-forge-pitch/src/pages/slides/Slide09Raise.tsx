import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

// Donut chart: r=80, cx=160, cy=160, circumference = 2π×80 ≈ 502.65
// strokeWidth=44, gap between segments = 3px
const C = 2 * Math.PI * 80; // ≈ 502.65

const segments = [
  { pct: 0.40, color: '#00C2FF', label: '40%', name: 'Engineering', offset: 0 },
  { pct: 0.25, color: '#F5A623', label: '25%', name: 'Growth', offset: 0.40 },
  { pct: 0.20, color: '#9F58FA', label: '20%', name: 'Infrastructure', offset: 0.65 },
  { pct: 0.15, color: '#4A6FA5', label: '15%', name: 'Operations', offset: 0.85 },
];

export default function Slide09Raise() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(245,166,35,0.05) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex" style={{ padding: '6vh 5vw 6vh 6vw' }}>
        {/* Left — headline + breakdown */}
        <div className="flex flex-col justify-center" style={{ width: '50vw', paddingRight: '4vw' }}>
          <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.1)} className="mb-[2vh]">
            <div className="flex items-center gap-[0.7vw] mb-[1.5vh]">
              <div className="w-[3vw] h-[0.25vh]" style={{ background: '#F5A623' }} />
              <span className="font-body uppercase tracking-widest text-muted" style={{ fontSize: '1.1vw' }}>The Ask</span>
            </div>
            <div className="font-display font-semibold" style={{ fontSize: '2.4vw', color: '#7A8BA0', lineHeight: 1.1 }}>We're raising</div>
            <div className="font-display font-bold" style={{ fontSize: '8vw', lineHeight: 0.95, letterSpacing: '-0.03em', background: 'linear-gradient(135deg, #00C2FF, #F5A623)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              $1M
            </div>
            <div className="font-body" style={{ fontSize: '1.3vw', color: '#7A8BA0', marginTop: '0.5vh' }}>Pre-Seed Round · 2026</div>
          </motion.div>

          <div className="flex flex-col" style={{ gap: '1.5vh', marginTop: '2.5vh' }}>
            <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.3)}
              className="flex items-center gap-[1.5vw] rounded-[0.7vw] p-[1.4vh_1.6vw]"
              style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.2)' }}>
              <div style={{ width: '1.2vw', height: '1.2vw', borderRadius: '0.2vw', background: '#00C2FF', flexShrink: 0 }} />
              <div className="font-display font-bold" style={{ fontSize: '1.8vw', color: '#00C2FF', minWidth: '3vw' }}>40%</div>
              <div>
                <div className="font-display font-semibold" style={{ fontSize: '1.2vw', color: '#F0F4FF' }}>Engineering</div>
                <div className="font-body" style={{ fontSize: '1vw', color: '#7A8BA0' }}>Solana mainnet, EVM mainnet deploy, monitoring</div>
              </div>
            </motion.div>

            <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.42)}
              className="flex items-center gap-[1.5vw] rounded-[0.7vw] p-[1.4vh_1.6vw]"
              style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)' }}>
              <div style={{ width: '1.2vw', height: '1.2vw', borderRadius: '0.2vw', background: '#F5A623', flexShrink: 0 }} />
              <div className="font-display font-bold" style={{ fontSize: '1.8vw', color: '#F5A623', minWidth: '3vw' }}>25%</div>
              <div>
                <div className="font-display font-semibold" style={{ fontSize: '1.2vw', color: '#F0F4FF' }}>Growth</div>
                <div className="font-body" style={{ fontSize: '1vw', color: '#7A8BA0' }}>Developer relations, ecosystem partnerships</div>
              </div>
            </motion.div>

            <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.54)}
              className="flex items-center gap-[1.5vw] rounded-[0.7vw] p-[1.4vh_1.6vw]"
              style={{ background: 'rgba(159,88,250,0.06)', border: '1px solid rgba(159,88,250,0.2)' }}>
              <div style={{ width: '1.2vw', height: '1.2vw', borderRadius: '0.2vw', background: '#9F58FA', flexShrink: 0 }} />
              <div className="font-display font-bold" style={{ fontSize: '1.8vw', color: '#9F58FA', minWidth: '3vw' }}>20%</div>
              <div>
                <div className="font-display font-semibold" style={{ fontSize: '1.2vw', color: '#F0F4FF' }}>Infrastructure</div>
                <div className="font-body" style={{ fontSize: '1vw', color: '#7A8BA0' }}>AI APIs, compile cluster, uptime</div>
              </div>
            </motion.div>

            <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.66)}
              className="flex items-center gap-[1.5vw] rounded-[0.7vw] p-[1.4vh_1.6vw]"
              style={{ background: 'rgba(74,111,165,0.06)', border: '1px solid rgba(74,111,165,0.2)' }}>
              <div style={{ width: '1.2vw', height: '1.2vw', borderRadius: '0.2vw', background: '#4A6FA5', flexShrink: 0 }} />
              <div className="font-display font-bold" style={{ fontSize: '1.8vw', color: '#4A6FA5', minWidth: '3vw' }}>15%</div>
              <div>
                <div className="font-display font-semibold" style={{ fontSize: '1.2vw', color: '#F0F4FF' }}>Operations</div>
                <div className="font-body" style={{ fontSize: '1vw', color: '#7A8BA0' }}>Legal, team</div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right — donut chart */}
        <motion.div {...anim({ opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 }, 0.35, 0.9)}
          className="flex items-center justify-center" style={{ flex: 1 }}>
          <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: '34vw', maxHeight: '68vh' }}>
            {/* Donut segments */}
            {/* Segment 1 — Engineering 40% — cyan */}
            <circle cx="160" cy="160" r="80" fill="none" stroke="#00C2FF" strokeWidth="44"
              strokeDasharray={`${C * 0.40 - 3} ${C - (C * 0.40 - 3)}`}
              strokeDashoffset={C * 0.25}
              transform="rotate(-90 160 160)"
              style={{ opacity: 0.9 }} />
            {/* Segment 2 — Growth 25% — gold */}
            <circle cx="160" cy="160" r="80" fill="none" stroke="#F5A623" strokeWidth="44"
              strokeDasharray={`${C * 0.25 - 3} ${C - (C * 0.25 - 3)}`}
              strokeDashoffset={C * 0.25 - C * 0.40}
              transform="rotate(-90 160 160)"
              style={{ opacity: 0.9 }} />
            {/* Segment 3 — Infrastructure 20% — purple */}
            <circle cx="160" cy="160" r="80" fill="none" stroke="#9F58FA" strokeWidth="44"
              strokeDasharray={`${C * 0.20 - 3} ${C - (C * 0.20 - 3)}`}
              strokeDashoffset={C * 0.25 - C * 0.65}
              transform="rotate(-90 160 160)"
              style={{ opacity: 0.9 }} />
            {/* Segment 4 — Operations 15% — slate */}
            <circle cx="160" cy="160" r="80" fill="none" stroke="#4A6FA5" strokeWidth="44"
              strokeDasharray={`${C * 0.15 - 3} ${C - (C * 0.15 - 3)}`}
              strokeDashoffset={C * 0.25 - C * 0.85}
              transform="rotate(-90 160 160)"
              style={{ opacity: 0.9 }} />

            {/* Center */}
            <circle cx="160" cy="160" r="54" fill="#07090F" />
            <text x="160" y="153" textAnchor="middle" fill="#F0F4FF" fontFamily="Space Grotesk, sans-serif" fontSize="14" fontWeight="700">$1,000,000</text>
            <text x="160" y="172" textAnchor="middle" fill="#7A8BA0" fontFamily="DM Sans, sans-serif" fontSize="11">Pre-Seed</text>

            {/* Labels */}
            <text x="220" y="80" fill="#00C2FF" fontFamily="Space Grotesk, sans-serif" fontSize="12" fontWeight="600">Engineering 40%</text>
            <text x="240" y="185" fill="#F5A623" fontFamily="Space Grotesk, sans-serif" fontSize="12" fontWeight="600">Growth 25%</text>
            <text x="50" y="240" fill="#9F58FA" fontFamily="Space Grotesk, sans-serif" fontSize="12" fontWeight="600">Infra 20%</text>
            <text x="20" y="140" fill="#4A6FA5" fontFamily="Space Grotesk, sans-serif" fontSize="12" fontWeight="600">Ops 15%</text>
          </svg>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, #00C2FF 0%, #F5A623 50%, #9F58FA 100%)' }} />
    </div>
  );
}
