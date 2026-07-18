import { motion } from 'framer-motion';
import { useTilt } from '../../hooks/useTilt';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

const C = 2 * Math.PI * 80; // ≈ 502.65

const segments = [
  { pct: 0.40, color: '#00C2FF', colorRgb: '0,194,255',   label: '40%', name: 'Engineering',    sub: 'Solana mainnet, EVM mainnet deploy, monitoring', dashOffset: C * 0.25 },
  { pct: 0.25, color: '#F5A623', colorRgb: '245,166,35',  label: '25%', name: 'Growth',         sub: 'Developer relations, ecosystem partnerships',     dashOffset: C * 0.25 - C * 0.40 },
  { pct: 0.20, color: '#9F58FA', colorRgb: '159,88,250',  label: '20%', name: 'Infrastructure', sub: 'AI APIs, compile cluster, uptime SLA',            dashOffset: C * 0.25 - C * 0.65 },
  { pct: 0.15, color: '#4A6FA5', colorRgb: '74,111,165',  label: '15%', name: 'Operations',     sub: 'Legal, team, compliance',                         dashOffset: C * 0.25 - C * 0.85 },
];

export default function Slide09Raise() {
  const tilt = useTilt(7);

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(245,166,35,0.07) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex" style={{ padding: '6vh 5vw 6vh 6vw' }}>
        {/* Left — headline + breakdown */}
        <div className="flex flex-col justify-center" style={{ width: '50vw', paddingRight: '4vw' }}>
          <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.1)} className="mb-[2vh]">
            <div className="flex items-center gap-[0.7vw] mb-[1.5vh]">
              <div className="w-[3vw] h-[0.25vh]" style={{ background: '#F5A623', boxShadow: '0 0 8px rgba(245,166,35,0.6)' }} />
              <span className="font-body uppercase tracking-widest" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>The Ask</span>
            </div>
            <div className="font-display font-semibold" style={{ fontSize: '2.4vw', color: '#7A8BA0', lineHeight: 1.1 }}>We're raising</div>
            <div className="font-display font-bold text-3d-white" style={{
              fontSize: '8vw', lineHeight: 0.95, letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #00C2FF 0%, #F5A623 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 4px 16px rgba(0,194,255,0.3))',
            }}>
              $1M
            </div>
            <div className="font-body" style={{ fontSize: '1.3vw', color: '#7A8BA0', marginTop: '0.5vh' }}>Pre-Seed Round · 2026</div>
          </motion.div>

          <div className="flex flex-col" style={{ gap: '1.3vh', marginTop: '2.5vh' }}>
            {segments.map((s, i) => (
              <motion.div key={s.name}
                {...anim({ opacity: 0, x: -20, rotateY: -15 }, { opacity: 1, x: 0, rotateY: 0 }, 0.3 + i * 0.12)}
                className="card-3d flex items-center gap-[1.5vw] rounded-[0.8vw] p-[1.3vh_1.5vw]"
                style={{ background: `rgba(${s.colorRgb},0.06)`, border: `1px solid rgba(${s.colorRgb},0.22)`, boxShadow: `0 4px 20px rgba(${s.colorRgb},0.07)` }}>
                <div style={{ width: '1.2vw', height: '1.2vw', borderRadius: '0.2vw', background: s.color, flexShrink: 0, boxShadow: `0 0 10px ${s.color}88` }} />
                <div className="font-display font-bold" style={{ fontSize: '1.8vw', color: s.color, minWidth: '3vw' }}>{s.label}</div>
                <div>
                  <div className="font-display font-semibold" style={{ fontSize: '1.2vw', color: '#F0F4FF' }}>{s.name}</div>
                  <div className="font-body" style={{ fontSize: '1vw', color: '#7A8BA0' }}>{s.sub}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right — 3D tilting donut chart */}
        <motion.div {...anim({ opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, 0.35, 0.9)}
          className="flex items-center justify-center" style={{ flex: 1 }}
          ref={tilt.ref}
          onMouseMove={tilt.onMouseMove}
          onMouseLeave={tilt.onMouseLeave}>
          <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: '34vw', maxHeight: '68vh', overflow: 'visible' }}>
            <defs>
              {/* Glow filter */}
              <filter id="segGlow" x="-25%" y="-25%" width="150%" height="150%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Inner shadow */}
              <radialGradient id="innerGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%"   stopColor="#07090F" stopOpacity="1" />
                <stop offset="100%" stopColor="#0D1420" stopOpacity="1" />
              </radialGradient>
              {/* Segment gradients */}
              {segments.map((s, i) => (
                <linearGradient key={i} id={`segGrad${i}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%"   stopColor={s.color} stopOpacity="1" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.65" />
                </linearGradient>
              ))}
            </defs>

            {/* Background ring shadow */}
            <circle cx="160" cy="160" r="80" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="48" />

            {/* Animated donut segments */}
            {segments.map((s, i) => (
              <motion.circle
                key={i}
                cx="160" cy="160" r="80"
                fill="none"
                stroke={`url(#segGrad${i})`}
                strokeWidth="44"
                strokeDashoffset={s.dashOffset}
                strokeLinecap="butt"
                filter="url(#segGlow)"
                transform="rotate(-90 160 160)"
                initial={{ strokeDasharray: `0 ${C}` }}
                animate={{ strokeDasharray: `${C * s.pct - 4} ${C}` }}
                transition={{ duration: 1.0, delay: 0.6 + i * 0.18, ease: [0.22, 1, 0.36, 1] }}
                style={{ opacity: 0.93 }}
              />
            ))}

            {/* Inner filled circle */}
            <circle cx="160" cy="160" r="53" fill="url(#innerGrad)" />
            {/* Inner border ring */}
            <circle cx="160" cy="160" r="53" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />

            {/* Center text */}
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }}>
              <text x="160" y="150" textAnchor="middle" fill="#F0F4FF"
                fontFamily="Space Grotesk,sans-serif" fontSize="15" fontWeight="700">$1,000,000</text>
              <text x="160" y="170" textAnchor="middle" fill="#7A8BA0"
                fontFamily="DM Sans,sans-serif" fontSize="11">Pre-Seed</text>
            </motion.g>

            {/* Segment labels with glowing connector lines */}
            <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
              {/* Engineering 40% — top right */}
              <line x1="222" y1="82" x2="245" y2="65" stroke="rgba(0,194,255,0.4)" strokeWidth="1" />
              <circle cx="245" cy="65" r="2.5" fill="#00C2FF" opacity="0.7" />
              <text x="250" y="62" fill="#00C2FF" fontFamily="Space Grotesk,sans-serif" fontSize="11" fontWeight="600">Engineering</text>
              <text x="250" y="76" fill="#7A8BA0" fontFamily="DM Sans,sans-serif" fontSize="10">40%</text>

              {/* Growth 25% — right */}
              <line x1="238" y1="185" x2="258" y2="195" stroke="rgba(245,166,35,0.4)" strokeWidth="1" />
              <circle cx="258" cy="195" r="2.5" fill="#F5A623" opacity="0.7" />
              <text x="263" y="192" fill="#F5A623" fontFamily="Space Grotesk,sans-serif" fontSize="11" fontWeight="600">Growth</text>
              <text x="263" y="206" fill="#7A8BA0" fontFamily="DM Sans,sans-serif" fontSize="10">25%</text>

              {/* Infrastructure 20% — bottom left */}
              <line x1="95" y1="238" x2="68" y2="252" stroke="rgba(159,88,250,0.4)" strokeWidth="1" />
              <circle cx="68" cy="252" r="2.5" fill="#9F58FA" opacity="0.7" />
              <text x="5" y="249" fill="#9F58FA" fontFamily="Space Grotesk,sans-serif" fontSize="11" fontWeight="600">Infra</text>
              <text x="5" y="263" fill="#7A8BA0" fontFamily="DM Sans,sans-serif" fontSize="10">20%</text>

              {/* Ops 15% — left */}
              <line x1="82" y1="130" x2="58" y2="120" stroke="rgba(74,111,165,0.4)" strokeWidth="1" />
              <circle cx="58" cy="120" r="2.5" fill="#4A6FA5" opacity="0.7" />
              <text x="0" y="117" fill="#4A6FA5" fontFamily="Space Grotesk,sans-serif" fontSize="11" fontWeight="600">Ops</text>
              <text x="0" y="131" fill="#7A8BA0" fontFamily="DM Sans,sans-serif" fontSize="10">15%</text>
            </motion.g>

            {/* Outer pulsing ring */}
            {!isExport && (
              <circle cx="160" cy="160" r="104" fill="none" stroke="rgba(0,194,255,0.08)" strokeWidth="1"
                style={{ animation: 'glow-pulse 3s ease-in-out infinite' }} />
            )}
          </svg>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, #00C2FF 0%, #F5A623 50%, #9F58FA 100%)', boxShadow: '0 0 10px rgba(245,166,35,0.3)' }} />
    </div>
  );
}
