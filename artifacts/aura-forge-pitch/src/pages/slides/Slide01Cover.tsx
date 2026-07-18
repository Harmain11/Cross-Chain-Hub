import { motion } from 'framer-motion';

const base = import.meta.env.BASE_URL;
const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.7) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

export default function Slide01Cover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      {/* Hero image */}
      <img
        src={`${base}hero-cover.jpg`}
        crossOrigin="anonymous"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.55 }}
      />

      {/* Layered gradient overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.88) 0%, rgba(0,20,40,0.6) 50%, rgba(0,0,0,0.82) 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-[45vh]" style={{ background: 'linear-gradient(to top, #07090F 0%, transparent 100%)' }} />

      {/* Cyan glow orb */}
      <div className="absolute top-[-8vh] right-[-5vw] w-[40vw] h-[40vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,194,255,0.15) 0%, transparent 70%)', animation: 'glow-pulse 4s ease-in-out infinite' }} />

      {/* Dark Pino badge */}
      <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.1)}
        className="absolute top-[4vh] left-[4vw] flex items-center gap-[0.6vw]">
        <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: '#00C2FF' }} />
        <span className="font-body uppercase tracking-[0.3em] text-muted" style={{ fontSize: '1.1vw', letterSpacing: '0.25em' }}>Dark Pino Ecosystem</span>
      </motion.div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: '4vh' }}>
        {/* Logo mark */}
        <motion.div {...anim({ opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, 0.2, 0.8)} className="mb-[2vh]">
          <div className="flex items-center justify-center w-[7vw] h-[7vw] rounded-[1.5vw]"
            style={{ background: 'linear-gradient(135deg, rgba(0,194,255,0.2) 0%, rgba(0,194,255,0.05) 100%)', border: '1px solid rgba(0,194,255,0.3)' }}>
            <svg width="4vw" height="4vw" viewBox="0 0 48 48" fill="none" style={{ width: '4vw', height: '4vw' }}>
              <path d="M24 4L40 14V24L24 34L8 24V14L24 4Z" stroke="#00C2FF" strokeWidth="1.5" fill="none" />
              <path d="M24 12L18 28H24L20 38L32 20H26L30 12H24Z" fill="#00C2FF" />
            </svg>
          </div>
        </motion.div>

        {/* Title */}
        <motion.div {...anim({ opacity: 0, y: 40 }, { opacity: 1, y: 0 }, 0.35, 0.8)} className="text-center mb-[1.5vh]">
          <div className="font-display font-bold tracking-tight leading-none" style={{ fontSize: '9vw', letterSpacing: '-0.03em' }}>
            <span style={{ color: '#00C2FF' }}>AURA</span>
            <span style={{ color: '#F0F4FF' }}> FORGE</span>
          </div>
        </motion.div>

        {/* Divider */}
        <motion.div {...anim({ opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1 }, 0.5, 0.6)}
          style={{ width: '22vw', height: '1px', background: 'linear-gradient(90deg, transparent, #00C2FF, transparent)', margin: '0 0 1.8vh' }} />

        {/* Tagline */}
        <motion.p {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.6, 0.7)}
          className="font-body text-center text-muted" style={{ fontSize: '2vw', fontWeight: 400, letterSpacing: '0.04em', marginBottom: '1.2vh' }}>
          The AI-Powered Smart Contract Factory
        </motion.p>

        {/* Proof-point line */}
        <motion.p {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.72, 0.65)}
          className="font-body text-center" style={{ fontSize: '1.35vw', color: '#7A8BA0', marginBottom: '3.5vh' }}>
          From plain-English prompt → audited, compiled, deployed contract — in under 10 minutes
        </motion.p>

        {/* 3-stat strip */}
        <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.82, 0.7)}
          className="flex items-center gap-[3vw] mb-[3.2vh]">
          <div className="text-center">
            <div className="font-display font-bold" style={{ fontSize: '2.4vw', color: '#00C2FF', lineHeight: 1 }}>847+</div>
            <div className="font-body" style={{ fontSize: '1vw', color: '#4A5568', marginTop: '0.3vh' }}>Dev Waitlist</div>
          </div>
          <div style={{ width: '1px', height: '4vh', background: 'rgba(255,255,255,0.1)' }} />
          <div className="text-center">
            <div className="font-display font-bold" style={{ fontSize: '2.4vw', color: '#00C2FF', lineHeight: 1 }}>1,200+</div>
            <div className="font-body" style={{ fontSize: '1vw', color: '#4A5568', marginTop: '0.3vh' }}>Beta Contracts</div>
          </div>
          <div style={{ width: '1px', height: '4vh', background: 'rgba(255,255,255,0.1)' }} />
          <div className="text-center">
            <div className="font-display font-bold" style={{ fontSize: '2.4vw', color: '#00C2FF', lineHeight: 1 }}>EVM + SOL</div>
            <div className="font-body" style={{ fontSize: '1vw', color: '#4A5568', marginTop: '0.3vh' }}>Both Chains, Live</div>
          </div>
        </motion.div>

        {/* Raise badge */}
        <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.95, 0.7)}
          className="flex items-center gap-[1vw] px-[2.5vw] py-[1.2vh] rounded-full"
          style={{ border: '1px solid rgba(245,166,35,0.4)', background: 'rgba(245,166,35,0.07)' }}>
          <div className="w-[0.6vw] h-[0.6vw] rounded-full" style={{ background: '#F5A623', animation: 'glow-pulse 2s ease-in-out infinite' }} />
          <span className="font-display font-semibold" style={{ color: '#F5A623', fontSize: '1.6vw', letterSpacing: '0.06em' }}>
            $1,000,000 Pre-Seed Round · 2026
          </span>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 30%, #F5A623 70%, transparent 100%)' }} />
    </div>
  );
}
