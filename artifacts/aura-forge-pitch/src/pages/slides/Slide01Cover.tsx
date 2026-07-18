import { motion } from 'framer-motion';
import { useTilt } from '../../hooks/useTilt';

const base = import.meta.env.BASE_URL;
const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.7) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

function StatCard({ value, label, delay }: { value: string; label: string; delay: number }) {
  const tilt = useTilt(7);
  return (
    <motion.div {...anim({ opacity: 0, y: 20, rotateX: -40 }, { opacity: 1, y: 0, rotateX: 0 }, delay, 0.65)}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="text-center px-[2vw] py-[1.2vh] rounded-[0.7vw]"
      style={{
        background: 'rgba(0,194,255,0.06)',
        border: '1px solid rgba(0,194,255,0.25)',
        cursor: 'default',
        transformStyle: 'preserve-3d',
      }}>
      <div className="font-display font-bold" style={{ fontSize: '2.6vw', color: '#00C2FF', lineHeight: 1 }}>{value}</div>
      <div className="font-body" style={{ fontSize: '1vw', color: '#4A5568', marginTop: '0.4vh' }}>{label}</div>
    </motion.div>
  );
}

export default function Slide01Cover() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F', perspective: '1200px' }}>
      {/* Hero image */}
      <img
        src={`${base}hero-cover.jpg`}
        crossOrigin="anonymous"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: 0.5 }}
      />

      {/* Layered overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.9) 0%, rgba(0,20,40,0.55) 50%, rgba(0,0,0,0.85) 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-[50vh]" style={{ background: 'linear-gradient(to top, #07090F 0%, transparent 100%)' }} />

      {/* Perspective grid floor */}
      <div className="absolute bottom-0 left-0 right-0 h-[38vh] perspective-grid pointer-events-none" />

      {/* Cyan glow orb */}
      <div className="absolute top-[-8vh] right-[-5vw] w-[40vw] h-[40vw] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0,194,255,0.18) 0%, transparent 70%)', animation: 'glow-pulse 4s ease-in-out infinite' }} />
      {/* Gold glow orb bottom-left */}
      <div className="absolute bottom-[-6vh] left-[-4vw] w-[30vw] h-[30vw] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,166,35,0.1) 0%, transparent 70%)', animation: 'glow-pulse 5s ease-in-out infinite 1.5s' }} />

      {/* Dark Pino badge */}
      <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.1)}
        className="absolute top-[4vh] left-[4vw] flex items-center gap-[0.6vw]">
        <div className="w-[0.5vw] h-[0.5vw] rounded-full" style={{ background: '#00C2FF' }} />
        <span className="font-body uppercase tracking-[0.3em]" style={{ fontSize: '1.1vw', letterSpacing: '0.25em', color: '#4A5568' }}>Dark Pino Ecosystem</span>
      </motion.div>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ paddingBottom: '5vh' }}>

        {/* Logo mark — 3D floating spin */}
        <motion.div {...anim({ opacity: 0, scale: 0.6, rotateY: -90 }, { opacity: 1, scale: 1, rotateY: 0 }, 0.2, 0.9)}
          className="mb-[2.2vh]"
          style={{ animation: isExport ? undefined : 'float3d 8s ease-in-out infinite', transformStyle: 'preserve-3d' }}>
          <div className="flex items-center justify-center w-[7.5vw] h-[7.5vw] rounded-[1.6vw]"
            style={{
              background: 'linear-gradient(135deg, rgba(0,194,255,0.25) 0%, rgba(0,194,255,0.06) 100%)',
              border: '1px solid rgba(0,194,255,0.4)',
              boxShadow: '0 0 40px rgba(0,194,255,0.25), inset 0 0 20px rgba(0,194,255,0.08)',
            }}>
            <svg viewBox="0 0 48 48" fill="none" style={{ width: '4.2vw', height: '4.2vw' }}>
              <path d="M24 4L40 14V24L24 34L8 24V14L24 4Z" stroke="#00C2FF" strokeWidth="1.5" fill="none" />
              <path d="M24 12L18 28H24L20 38L32 20H26L30 12H24Z" fill="#00C2FF" />
              {/* Inner glow effect */}
              <path d="M24 12L18 28H24L20 38L32 20H26L30 12H24Z" fill="url(#logoGlow)" opacity="0.5" />
              <defs>
                <radialGradient id="logoGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#00C2FF" stopOpacity="0" />
                </radialGradient>
              </defs>
            </svg>
          </div>
        </motion.div>

        {/* Title with 3D text depth */}
        <motion.div {...anim({ opacity: 0, y: 40, rotateX: 20 }, { opacity: 1, y: 0, rotateX: 0 }, 0.35, 0.85)} className="text-center mb-[1.5vh]" style={{ transformStyle: 'preserve-3d' }}>
          <div className="font-display font-bold tracking-tight leading-none" style={{ fontSize: '9vw', letterSpacing: '-0.03em' }}>
            <span className="text-3d-cyan" style={{ color: '#00C2FF' }}>AURA</span>
            <span className="text-3d-white" style={{ color: '#F0F4FF' }}> FORGE</span>
          </div>
        </motion.div>

        {/* Divider */}
        <motion.div {...anim({ opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1 }, 0.52, 0.6)}
          style={{ width: '22vw', height: '1px', background: 'linear-gradient(90deg, transparent, #00C2FF, transparent)', margin: '0 0 1.8vh', boxShadow: '0 0 12px rgba(0,194,255,0.5)' }} />

        {/* Tagline */}
        <motion.p {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.6, 0.7)}
          className="font-body text-center" style={{ fontSize: '2vw', fontWeight: 400, letterSpacing: '0.04em', color: '#7A8BA0', marginBottom: '0.9vh' }}>
          The AI-Powered Smart Contract Factory
        </motion.p>

        {/* Proof-point */}
        <motion.p {...anim({ opacity: 0, y: 12 }, { opacity: 1, y: 0 }, 0.7, 0.65)}
          className="font-body text-center" style={{ fontSize: '1.3vw', color: '#4A5568', marginBottom: '3.2vh' }}>
          From plain-English prompt → audited, compiled, deployed contract — in under 10 minutes
        </motion.p>

        {/* 3-stat strip */}
        <div className="flex items-center gap-[2.5vw] mb-[3vh]">
          <StatCard value="847+" label="Dev Waitlist" delay={0.78} />
          <div style={{ width: '1px', height: '4vh', background: 'rgba(255,255,255,0.08)' }} />
          <StatCard value="1,200+" label="Beta Contracts" delay={0.85} />
          <div style={{ width: '1px', height: '4vh', background: 'rgba(255,255,255,0.08)' }} />
          <StatCard value="EVM + SOL" label="Both Chains, Live" delay={0.92} />
        </div>

        {/* Raise badge */}
        <motion.div {...anim({ opacity: 0, y: 18, rotateX: -30 }, { opacity: 1, y: 0, rotateX: 0 }, 1.0, 0.7)}
          className="flex items-center gap-[1vw] px-[2.5vw] py-[1.2vh] rounded-full"
          style={{
            border: '1px solid rgba(245,166,35,0.45)',
            background: 'rgba(245,166,35,0.08)',
            boxShadow: '0 0 30px rgba(245,166,35,0.12), inset 0 0 20px rgba(245,166,35,0.04)',
          }}>
          <div className="w-[0.6vw] h-[0.6vw] rounded-full" style={{ background: '#F5A623', animation: 'glow-pulse 2s ease-in-out infinite', boxShadow: '0 0 8px #F5A623' }} />
          <span className="font-display font-semibold" style={{ color: '#F5A623', fontSize: '1.6vw', letterSpacing: '0.06em' }}>
            $1,000,000 Pre-Seed Round · 2026
          </span>
        </motion.div>
      </div>

      {/* Bottom line */}
      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 30%, #F5A623 70%, transparent 100%)', boxShadow: '0 0 12px rgba(0,194,255,0.4)' }} />
    </div>
  );
}
