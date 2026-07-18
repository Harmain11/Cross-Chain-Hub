import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.7) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

export default function Slide05Market() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 60% at 70% 50%, rgba(0,194,255,0.07) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex" style={{ padding: '7vh 5vw 7vh 6vw' }}>
        {/* Left — text */}
        <div className="flex flex-col justify-center" style={{ width: '44vw', paddingRight: '4vw' }}>
          <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.1)}
            className="flex items-center gap-[0.7vw] mb-[2.5vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#00C2FF' }} />
            <span className="font-body uppercase tracking-widest text-muted" style={{ fontSize: '1.1vw' }}>Market Opportunity</span>
          </motion.div>

          <motion.div {...anim({ opacity: 0, y: 25 }, { opacity: 1, y: 0 }, 0.2, 0.8)} className="mb-[4vh]">
            <div className="font-display font-bold leading-[1.05]" style={{ fontSize: '5.2vw', letterSpacing: '-0.02em', color: '#F0F4FF' }}>
              $12B market.
            </div>
            <div className="font-display font-bold leading-[1.05]" style={{ fontSize: '5.2vw', letterSpacing: '-0.02em', color: '#00C2FF' }}>
              We are at
            </div>
            <div className="font-display font-bold leading-[1.05]" style={{ fontSize: '5.2vw', letterSpacing: '-0.02em', color: '#00C2FF' }}>
              the front door.
            </div>
          </motion.div>

          <div className="flex flex-col" style={{ gap: '1.8vh' }}>
            <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.4)}
              className="flex items-start gap-[1.5vw] rounded-[0.8vw] p-[1.5vh_1.6vw]"
              style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.12)' }}>
              <div className="font-display font-bold shrink-0" style={{ fontSize: '2vw', color: '#00C2FF', lineHeight: 1.1, minWidth: '4.5vw' }}>TAM</div>
              <div>
                <div className="font-display font-semibold" style={{ fontSize: '1.8vw', color: '#F0F4FF' }}>$12B</div>
                <div className="font-body" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Global smart contract market (2026)</div>
              </div>
            </motion.div>
            <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.52)}
              className="flex items-start gap-[1.5vw] rounded-[0.8vw] p-[1.5vh_1.6vw]"
              style={{ background: 'rgba(0,194,255,0.05)', border: '1px solid rgba(0,194,255,0.12)' }}>
              <div className="font-display font-bold shrink-0" style={{ fontSize: '2vw', color: '#00C2FF', lineHeight: 1.1, minWidth: '4.5vw' }}>SAM</div>
              <div>
                <div className="font-display font-semibold" style={{ fontSize: '1.8vw', color: '#F0F4FF' }}>$3B</div>
                <div className="font-body" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Teams actively deploying on EVM + Solana</div>
              </div>
            </motion.div>
            <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.64)}
              className="flex items-start gap-[1.5vw] rounded-[0.8vw] p-[1.5vh_1.6vw]"
              style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.2)' }}>
              <div className="font-display font-bold shrink-0" style={{ fontSize: '2vw', color: '#F5A623', lineHeight: 1.1, minWidth: '4.5vw' }}>SOM</div>
              <div>
                <div className="font-display font-semibold" style={{ fontSize: '1.8vw', color: '#F0F4FF' }}>$120M</div>
                <div className="font-body" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Reachable in 36 months at 4% SAM penetration</div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Right — concentric rings SVG */}
        <motion.div {...anim({ opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 }, 0.3, 0.9)}
          className="flex items-center justify-center" style={{ flex: 1 }}>
          <svg viewBox="0 0 380 380" style={{ width: '100%', maxWidth: '38vw', maxHeight: '72vh' }}>
            {/* TAM — outer ring fill */}
            <circle cx="190" cy="190" r="170" fill="rgba(0,194,255,0.04)" stroke="rgba(0,194,255,0.2)" strokeWidth="1.5" />
            {/* SAM — middle ring fill */}
            <circle cx="190" cy="190" r="118" fill="rgba(0,194,255,0.08)" stroke="rgba(0,194,255,0.35)" strokeWidth="1.5" />
            {/* SOM — inner circle fill */}
            <circle cx="190" cy="190" r="66" fill="rgba(0,194,255,0.18)" stroke="#00C2FF" strokeWidth="2" />
            {/* Center glow */}
            <circle cx="190" cy="190" r="40" fill="rgba(0,194,255,0.28)" />
            <circle cx="190" cy="190" r="20" fill="rgba(0,194,255,0.5)" />

            {/* TAM label — top-right */}
            <line x1="320" y1="90" x2="340" y2="70" stroke="rgba(0,194,255,0.4)" strokeWidth="1" />
            <text x="344" y="65" fill="#7A8BA0" fontFamily="DM Sans, sans-serif" fontSize="13" fontWeight="500">TAM</text>
            <text x="344" y="82" fill="#F0F4FF" fontFamily="Space Grotesk, sans-serif" fontSize="18" fontWeight="700">$12B</text>

            {/* SAM label — right */}
            <line x1="308" y1="190" x2="335" y2="190" stroke="rgba(0,194,255,0.4)" strokeWidth="1" />
            <text x="339" y="186" fill="#7A8BA0" fontFamily="DM Sans, sans-serif" fontSize="13" fontWeight="500">SAM</text>
            <text x="339" y="204" fill="#F0F4FF" fontFamily="Space Grotesk, sans-serif" fontSize="18" fontWeight="700">$3B</text>

            {/* SOM label — center */}
            <text x="190" y="184" fill="#00C2FF" fontFamily="Space Grotesk, sans-serif" fontSize="13" fontWeight="600" textAnchor="middle">SOM</text>
            <text x="190" y="203" fill="#F0F4FF" fontFamily="Space Grotesk, sans-serif" fontSize="20" fontWeight="800" textAnchor="middle">$120M</text>
          </svg>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 50%, transparent 100%)' }} />
    </div>
  );
}
