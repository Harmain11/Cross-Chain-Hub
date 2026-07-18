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

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5.5vh 5vw 4.5vh 6vw' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.1)} className="mb-[2.5vh]">
          <div className="flex items-center gap-[0.7vw] mb-[1.2vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#00C2FF' }} />
            <span className="font-body uppercase tracking-widest text-muted" style={{ fontSize: '1.1vw' }}>Market Opportunity</span>
          </div>
          <div className="font-display font-bold leading-[1.05]" style={{ fontSize: '4.8vw', letterSpacing: '-0.02em', color: '#F0F4FF' }}>
            $12B market. <span style={{ color: '#00C2FF' }}>Zero</span> full-lifecycle tools.
          </div>
        </motion.div>

        {/* Two column layout */}
        <div className="flex flex-1" style={{ gap: '4vw' }}>
          {/* Left: TAM/SAM/SOM + bottom-up */}
          <div className="flex flex-col justify-center" style={{ width: '48vw' }}>
            {/* TAM/SAM/SOM */}
            <div className="flex flex-col" style={{ gap: '1.4vh', marginBottom: '2.5vh' }}>
              <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.25)}
                className="flex items-start gap-[1.4vw] rounded-[0.8vw] p-[1.4vh_1.5vw]"
                style={{ background: 'rgba(0,194,255,0.04)', border: '1px solid rgba(0,194,255,0.1)' }}>
                <div className="font-display font-bold shrink-0" style={{ fontSize: '1.8vw', color: '#00C2FF', lineHeight: 1.1, minWidth: '4vw' }}>TAM</div>
                <div>
                  <div className="flex items-baseline gap-[0.8vw]">
                    <span className="font-display font-semibold" style={{ fontSize: '2.2vw', color: '#F0F4FF' }}>$12B</span>
                    <span className="font-body" style={{ fontSize: '1vw', color: '#4A5568' }}>Source: Grand View Research, 2026</span>
                  </div>
                  <div className="font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0' }}>Global smart contract platform market</div>
                </div>
              </motion.div>

              <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.38)}
                className="flex items-start gap-[1.4vw] rounded-[0.8vw] p-[1.4vh_1.5vw]"
                style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.15)' }}>
                <div className="font-display font-bold shrink-0" style={{ fontSize: '1.8vw', color: '#00C2FF', lineHeight: 1.1, minWidth: '4vw' }}>SAM</div>
                <div>
                  <div className="flex items-baseline gap-[0.8vw]">
                    <span className="font-display font-semibold" style={{ fontSize: '2.2vw', color: '#F0F4FF' }}>$3B</span>
                    <span className="font-body" style={{ fontSize: '1vw', color: '#4A5568' }}>~280K active EVM + Solana teams</span>
                  </div>
                  <div className="font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0' }}>Actively deploying contracts on both chains</div>
                </div>
              </motion.div>

              <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.51)}
                className="flex items-start gap-[1.4vw] rounded-[0.8vw] p-[1.4vh_1.5vw]"
                style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.25)' }}>
                <div className="font-display font-bold shrink-0" style={{ fontSize: '1.8vw', color: '#F5A623', lineHeight: 1.1, minWidth: '4vw' }}>SOM</div>
                <div>
                  <div className="flex items-baseline gap-[0.8vw]">
                    <span className="font-display font-semibold" style={{ fontSize: '2.2vw', color: '#F0F4FF' }}>$120M</span>
                    <span className="font-body" style={{ fontSize: '1vw', color: '#4A5568' }}>4% SAM penetration in 36 months</span>
                  </div>
                  <div className="font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0' }}>Conservative — API-first growth, no paid sales</div>
                </div>
              </motion.div>
            </div>

            {/* Bottom-up math box */}
            <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.65)}
              className="rounded-[0.8vw] p-[1.5vh_1.5vw]"
              style={{ background: 'rgba(0,194,255,0.04)', border: '1px dashed rgba(0,194,255,0.25)' }}>
              <div className="font-display font-semibold mb-[1vh]" style={{ fontSize: '1.1vw', color: '#7A8BA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Bottom-Up Sanity Check
              </div>
              <div className="flex flex-col" style={{ gap: '0.6vh' }}>
                <div className="flex justify-between font-body" style={{ fontSize: '1.05vw' }}>
                  <span style={{ color: '#7A8BA0' }}>240K Solidity devs × $50/mo avg spend</span>
                  <span style={{ color: '#00C2FF', fontWeight: 600 }}>= $144M/yr</span>
                </div>
                <div className="flex justify-between font-body" style={{ fontSize: '1.05vw' }}>
                  <span style={{ color: '#7A8BA0' }}>40K new DeFi protocols/yr × $500 launch spend</span>
                  <span style={{ color: '#00C2FF', fontWeight: 600 }}>= $20M/yr</span>
                </div>
                <div style={{ height: '1px', background: 'rgba(0,194,255,0.15)', margin: '0.5vh 0' }} />
                <div className="flex justify-between font-display font-semibold" style={{ fontSize: '1.2vw' }}>
                  <span style={{ color: '#F0F4FF' }}>Combined accessible immediately</span>
                  <span style={{ color: '#F5A623' }}>$164M+</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Visual + Why Now */}
          <div className="flex flex-col items-center justify-center flex-1">
            {/* Concentric rings */}
            <motion.div {...anim({ opacity: 0, scale: 0.85 }, { opacity: 1, scale: 1 }, 0.3, 0.9)}
              className="flex items-center justify-center" style={{ flex: 1, width: '100%' }}>
              <svg viewBox="0 0 320 320" style={{ width: '100%', maxWidth: '28vw', maxHeight: '48vh' }}>
                <circle cx="160" cy="160" r="148" fill="rgba(0,194,255,0.03)" stroke="rgba(0,194,255,0.15)" strokeWidth="1.5" />
                <circle cx="160" cy="160" r="100" fill="rgba(0,194,255,0.06)" stroke="rgba(0,194,255,0.3)" strokeWidth="1.5" />
                <circle cx="160" cy="160" r="55" fill="rgba(0,194,255,0.14)" stroke="#00C2FF" strokeWidth="2" />
                <circle cx="160" cy="160" r="30" fill="rgba(0,194,255,0.28)" />
                <circle cx="160" cy="160" r="14" fill="rgba(0,194,255,0.55)" />
                <line x1="275" y1="78" x2="292" y2="60" stroke="rgba(0,194,255,0.35)" strokeWidth="1" />
                <text x="296" y="56" fill="#7A8BA0" fontFamily="DM Sans,sans-serif" fontSize="11" fontWeight="500">TAM</text>
                <text x="296" y="72" fill="#F0F4FF" fontFamily="Space Grotesk,sans-serif" fontSize="16" fontWeight="700">$12B</text>
                <line x1="260" y1="160" x2="283" y2="160" stroke="rgba(0,194,255,0.35)" strokeWidth="1" />
                <text x="287" y="156" fill="#7A8BA0" fontFamily="DM Sans,sans-serif" fontSize="11" fontWeight="500">SAM</text>
                <text x="287" y="172" fill="#F0F4FF" fontFamily="Space Grotesk,sans-serif" fontSize="16" fontWeight="700">$3B</text>
                <text x="160" y="154" fill="#00C2FF" fontFamily="Space Grotesk,sans-serif" fontSize="11" fontWeight="600" textAnchor="middle">SOM</text>
                <text x="160" y="172" fill="#F0F4FF" fontFamily="Space Grotesk,sans-serif" fontSize="17" fontWeight="800" textAnchor="middle">$120M</text>
              </svg>
            </motion.div>

            {/* Why Now */}
            <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.75)}
              className="rounded-[0.8vw] p-[1.5vh_1.5vw] w-full"
              style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.2)' }}>
              <div className="font-display font-semibold mb-[0.8vh]" style={{ fontSize: '1.15vw', color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why Now</div>
              <div className="flex flex-col" style={{ gap: '0.5vh' }}>
                <div className="flex items-start gap-[0.6vw] font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0' }}>
                  <span style={{ color: '#F5A623', marginTop: '0.15vh' }}>→</span>
                  <span>EVM TVL hit $100B+ in 2024; Solana crossed 100M monthly active wallets</span>
                </div>
                <div className="flex items-start gap-[0.6vw] font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0' }}>
                  <span style={{ color: '#F5A623', marginTop: '0.15vh' }}>→</span>
                  <span>LLMs now write production-quality Solidity — the critical missing piece is verified compilation + security</span>
                </div>
                <div className="flex items-start gap-[0.6vw] font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0' }}>
                  <span style={{ color: '#F5A623', marginTop: '0.15vh' }}>→</span>
                  <span>No incumbent owns the full-lifecycle toolchain — window is open right now</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 50%, transparent 100%)' }} />
    </div>
  );
}
