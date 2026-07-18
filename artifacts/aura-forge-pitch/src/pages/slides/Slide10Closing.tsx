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
        style={{ opacity: 0.45 }}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(0,10,30,0.65) 50%, rgba(0,0,0,0.88) 100%)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-[40vh]" style={{ background: 'linear-gradient(to top, #07090F 0%, transparent 100%)' }} />

      {/* Glow orbs */}
      <div className="absolute top-[-10vh] left-[-5vw] w-[40vw] h-[40vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,194,255,0.12) 0%, transparent 70%)', animation: 'glow-pulse 5s ease-in-out infinite' }} />
      <div className="absolute bottom-[-10vh] right-[-5vw] w-[40vw] h-[40vw] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(245,166,35,0.09) 0%, transparent 70%)', animation: 'glow-pulse 5s ease-in-out infinite 2.5s' }} />

      {/* Full layout */}
      <div className="absolute inset-0 flex" style={{ padding: '6vh 7vw' }}>
        {/* Left: main CTA */}
        <div className="flex flex-col justify-center" style={{ flex: 1, paddingRight: '5vw' }}>
          {/* Logo */}
          <motion.div {...anim({ opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, 0.15, 0.9)} className="mb-[3vh]">
            <div className="flex items-center justify-center rounded-[1.5vw]"
              style={{ width: '6vw', height: '6vw', background: 'linear-gradient(135deg, rgba(0,194,255,0.2) 0%, rgba(0,194,255,0.05) 100%)', border: '1px solid rgba(0,194,255,0.35)' }}>
              <svg viewBox="0 0 48 48" fill="none" style={{ width: '3.2vw', height: '3.2vw' }}>
                <path d="M24 4L40 14V24L24 34L8 24V14L24 4Z" stroke="#00C2FF" strokeWidth="1.5" fill="none" />
                <path d="M24 12L18 28H24L20 38L32 20H26L30 12H24Z" fill="#00C2FF" />
              </svg>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div {...anim({ opacity: 0, y: 40 }, { opacity: 1, y: 0 }, 0.3, 0.9)} className="mb-[2.5vh]">
            <div className="font-display font-bold leading-[1.05]" style={{ fontSize: '5.2vw', letterSpacing: '-0.025em', color: '#F0F4FF' }}>
              Let's build the
            </div>
            <div className="font-display font-bold leading-[1.05]" style={{ fontSize: '5.2vw', letterSpacing: '-0.025em', color: '#00C2FF' }}>
              contract layer for Web3.
            </div>
          </motion.div>

          {/* Divider */}
          <motion.div {...anim({ opacity: 0, scaleX: 0 }, { opacity: 1, scaleX: 1 }, 0.48, 0.65)}
            style={{ width: '14vw', height: '1px', background: 'linear-gradient(90deg, #00C2FF, transparent)', marginBottom: '2.5vh', transformOrigin: 'left' }} />

          {/* Raise badge */}
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.58, 0.65)}
            className="inline-flex items-center gap-[1vw] px-[2.2vw] py-[1.1vh] rounded-full mb-[3.5vh]"
            style={{ border: '1px solid rgba(0,194,255,0.35)', background: 'rgba(0,194,255,0.06)', alignSelf: 'flex-start' }}>
            <div style={{ width: '0.55vw', height: '0.55vw', borderRadius: '50%', background: '#00C2FF', animation: 'glow-pulse 2s ease-in-out infinite' }} />
            <span className="font-display font-semibold" style={{ color: '#00C2FF', fontSize: '1.5vw', letterSpacing: '0.04em' }}>
              Raising $1,000,000 · Pre-Seed 2026
            </span>
          </motion.div>

          {/* What we're looking for */}
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.68, 0.65)}
            className="rounded-[0.8vw] p-[1.5vh_1.6vw]"
            style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.2)', maxWidth: '30vw' }}>
            <div className="font-display font-semibold mb-[0.8vh]" style={{ fontSize: '1.1vw', color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Ideal partner
            </div>
            <div className="flex flex-col" style={{ gap: '0.5vh' }}>
              {['Web3 / DeFi infrastructure experience', 'Developer tools or AI portfolio', 'Hands-on with technical go-to-market'].map((s, i) => (
                <div key={i} className="flex items-center gap-[0.6vw] font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0' }}>
                  <span style={{ color: '#F5A623' }}>→</span> {s}
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: contact card + ecosystem */}
        <div className="flex flex-col justify-center" style={{ width: '28vw' }}>
          {/* Contact card */}
          <motion.div {...anim({ opacity: 0, x: 30 }, { opacity: 1, x: 0 }, 0.45, 0.8)}
            className="rounded-[1.2vw] p-[3vh_2.5vw] mb-[2.5vh]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(0,194,255,0.2)', backdropFilter: 'blur(10px)' }}>
            <div className="font-display font-semibold mb-[2.5vh]" style={{ fontSize: '1.3vw', color: '#7A8BA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Get in Touch
            </div>

            <div className="flex flex-col" style={{ gap: '2vh' }}>
              <div>
                <div className="font-body" style={{ fontSize: '0.9vw', color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3vh' }}>Investor Inquiries</div>
                <div className="font-display font-semibold" style={{ fontSize: '1.3vw', color: '#00C2FF' }}>invest@auraforge.io</div>
              </div>
              <div>
                <div className="font-body" style={{ fontSize: '0.9vw', color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3vh' }}>Platform</div>
                <div className="font-display font-semibold" style={{ fontSize: '1.3vw', color: '#F0F4FF' }}>auraforge.io</div>
              </div>
              <div>
                <div className="font-body" style={{ fontSize: '0.9vw', color: '#4A5568', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.3vh' }}>API Docs & Beta Access</div>
                <div className="font-display font-semibold" style={{ fontSize: '1.3vw', color: '#F0F4FF' }}>docs.auraforge.io</div>
              </div>
            </div>

            <div style={{ height: '1px', background: 'rgba(0,194,255,0.12)', margin: '2.5vh 0' }} />

            {/* Quick stats recap */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5vh 1.5vw' }}>
              <div>
                <div className="font-display font-bold" style={{ fontSize: '2vw', color: '#00C2FF', lineHeight: 1 }}>1,200+</div>
                <div className="font-body" style={{ fontSize: '0.95vw', color: '#4A5568' }}>Beta contracts</div>
              </div>
              <div>
                <div className="font-display font-bold" style={{ fontSize: '2vw', color: '#00C2FF', lineHeight: 1 }}>28×</div>
                <div className="font-body" style={{ fontSize: '0.95vw', color: '#4A5568' }}>LTV : CAC</div>
              </div>
              <div>
                <div className="font-display font-bold" style={{ fontSize: '2vw', color: '#F5A623', lineHeight: 1 }}>$3.8B</div>
                <div className="font-body" style={{ fontSize: '0.95vw', color: '#4A5568' }}>Market problem</div>
              </div>
              <div>
                <div className="font-display font-bold" style={{ fontSize: '2vw', color: '#00C2FF', lineHeight: 1 }}>~85%</div>
                <div className="font-body" style={{ fontSize: '0.95vw', color: '#4A5568' }}>Gross margin</div>
              </div>
            </div>
          </motion.div>

          {/* Dark Pino badge */}
          <motion.div {...anim({ opacity: 0, y: 10 }, { opacity: 1, y: 0 }, 0.85, 0.6)}
            className="flex items-center gap-[0.7vw] justify-center">
            <div style={{ width: '0.4vw', height: '0.4vw', borderRadius: '50%', background: '#F5A623' }} />
            <span className="font-body uppercase tracking-[0.3em]" style={{ fontSize: '1.05vw', color: '#4A5568' }}>Dark Pino Ecosystem</span>
            <div style={{ width: '0.4vw', height: '0.4vw', borderRadius: '50%', background: '#F5A623' }} />
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, #9F58FA 0%, #00C2FF 40%, #F5A623 70%, transparent 100%)' }} />
    </div>
  );
}
