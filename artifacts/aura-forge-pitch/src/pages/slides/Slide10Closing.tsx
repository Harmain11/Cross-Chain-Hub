import { motion } from 'framer-motion';

const base = import.meta.env.BASE_URL;
const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.8) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

export default function Slide10Closing() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      {/* Hero image */}
      <img
        src={`${base}hero-closing.jpg`}
        crossOrigin="anonymous"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.5 }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,10,30,0.65) 50%, rgba(0,0,0,0.85) 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-[40vh]" style={{ background: 'linear-gradient(to top, #07090F 0%, transparent 100%)' }} />

      {/* Dual glow orbs */}
      <div className="absolute top-[-10vh] left-[-5vw] w-[40vw] h-[40vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,194,255,0.12) 0%, transparent 70%)', animation: 'glow-pulse 5s ease-in-out infinite' }} />
      <div className="absolute bottom-[-10vh] right-[-5vw] w-[40vw] h-[40vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(245,166,35,0.1) 0%, transparent 70%)', animation: 'glow-pulse 5s ease-in-out infinite 2.5s' }} />

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center" style={{ paddingBottom: '5vh' }}>
        {/* Logo mark */}
        <motion.div {...anim({ opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, 0.2, 0.9)} className="mb-[3vh]">
          <div className="flex items-center justify-center rounded-[1.5vw] mx-auto"
            style={{ width: '6.5vw', height: '6.5vw', background: 'linear-gradient(135deg, rgba(0,194,255,0.2) 0%, rgba(0,194,255,0.05) 100%)', border: '1px solid rgba(0,194,255,0.35)' }}>
            <svg width="3.5vw" height="3.5vw" viewBox="0 0 48 48" fill="none" style={{ width: '3.5vw', height: '3.5vw' }}>
              <path d="M24 4L40 14V24L24 34L8 24V14L24 4Z" stroke="#00C2FF" strokeWidth="1.5" fill="none" />
              <path d="M24 12L18 28H24L20 38L32 20H26L30 12H24Z" fill="#00C2FF" />
            </svg>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div {...anim({ opacity: 0, y: 40 }, { opacity: 1, y: 0 }, 0.35, 0.9)} className="mb-[3vh]">
          <div className="font-display font-bold leading-[1.1]" style={{ fontSize: '5.5vw', letterSpacing: '-0.025em', color: '#F0F4FF' }}>
            Let's build the contract layer
          </div>
          <div className="font-display font-bold leading-[1.1]" style={{ fontSize: '5.5vw', letterSpacing: '-0.025em', color: '#00C2FF' }}>
            for Web3.
          </div>
        </motion.div>

        {/* Divider */}
        <motion.div {...anim({ opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1 }, 0.55, 0.65)}
          style={{ width: '18vw', height: '1px', background: 'linear-gradient(90deg, transparent, #00C2FF, transparent)', margin: '0 0 3vh' }} />

        {/* Product + ecosystem */}
        <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.65, 0.7)}>
          <div className="font-display font-semibold" style={{ fontSize: '2.2vw', color: '#F0F4FF', letterSpacing: '0.02em' }}>
            AURA Forge · <span style={{ color: '#7A8BA0', fontWeight: 400 }}>auraforge.io</span>
          </div>
        </motion.div>

        <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.78, 0.6)}
          className="flex items-center gap-[0.7vw] mt-[1.8vh]">
          <div style={{ width: '0.45vw', height: '0.45vw', borderRadius: '50%', background: '#F5A623' }} />
          <span className="font-body uppercase tracking-[0.3em]" style={{ fontSize: '1.2vw', color: '#7A8BA0' }}>Dark Pino Ecosystem</span>
          <div style={{ width: '0.45vw', height: '0.45vw', borderRadius: '50%', background: '#F5A623' }} />
        </motion.div>

        {/* Raise reminder badge */}
        <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.9, 0.6)}
          className="flex items-center gap-[1vw] px-[2.5vw] py-[1.2vh] rounded-full mt-[3.5vh]"
          style={{ border: '1px solid rgba(0,194,255,0.35)', background: 'rgba(0,194,255,0.06)' }}>
          <div style={{ width: '0.6vw', height: '0.6vw', borderRadius: '50%', background: '#00C2FF', animation: 'glow-pulse 2s ease-in-out infinite' }} />
          <span className="font-display font-semibold" style={{ color: '#00C2FF', fontSize: '1.5vw', letterSpacing: '0.04em' }}>
            Raising $1,000,000 · Pre-Seed 2026
          </span>
        </motion.div>
      </div>

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, #9F58FA 0%, #00C2FF 40%, #F5A623 70%, transparent 100%)' }} />
    </div>
  );
}
