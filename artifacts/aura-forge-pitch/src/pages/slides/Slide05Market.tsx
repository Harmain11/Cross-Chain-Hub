import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.7) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

export default function Slide05Market() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 55% at 72% 50%, rgba(0,194,255,0.09) 0%, transparent 65%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5.5vh 5vw 4.5vh 6vw' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.1)} className="mb-[2.5vh]">
          <div className="flex items-center gap-[0.7vw] mb-[1.2vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#00C2FF', boxShadow: '0 0 8px rgba(0,194,255,0.6)' }} />
            <span className="font-body uppercase tracking-widest" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Market Opportunity</span>
          </div>
          <div className="font-display font-bold text-3d-white" style={{ fontSize: '4.6vw', letterSpacing: '-0.02em', color: '#F0F4FF' }}>
            $12B market. <span className="text-3d-cyan" style={{ color: '#00C2FF' }}>Zero</span> full-lifecycle tools.
          </div>
        </motion.div>

        <div className="flex flex-1" style={{ gap: '4vw' }}>
          {/* Left: TAM/SAM/SOM + bottom-up */}
          <div className="flex flex-col justify-center" style={{ width: '48vw' }}>
            <div className="flex flex-col" style={{ gap: '1.3vh', marginBottom: '2.3vh' }}>
              {[
                { tag: 'TAM', value: '$12B', note: 'Source: Grand View Research, 2026', sub: 'Global smart contract platform market', accent: '#00C2FF', bg: '0,194,255' },
                { tag: 'SAM', value: '$3B',  note: '~280K active EVM + Solana teams', sub: 'Actively deploying contracts on both chains', accent: '#00C2FF', bg: '0,194,255' },
                { tag: 'SOM', value: '$120M', note: '4% SAM penetration in 36 months', sub: 'Conservative — API-first growth, no paid sales', accent: '#F5A623', bg: '245,166,35' },
              ].map(({ tag, value, note, sub, accent, bg }, i) => (
                <motion.div key={tag}
                  {...anim({ opacity: 0, x: -25, rotateY: -15 }, { opacity: 1, x: 0, rotateY: 0 }, 0.25 + i * 0.13, 0.7)}
                  className="card-3d flex items-start gap-[1.4vw] rounded-[0.9vw] p-[1.4vh_1.5vw]"
                  style={{
                    background: `rgba(${bg},0.05)`,
                    border: `1px solid rgba(${bg},0.18)`,
                    boxShadow: `0 4px 24px rgba(${bg},0.06)`,
                  }}>
                  <div className="font-display font-bold shrink-0" style={{ fontSize: '1.8vw', color: accent, lineHeight: 1.1, minWidth: '4vw' }}>{tag}</div>
                  <div>
                    <div className="flex items-baseline gap-[0.8vw]">
                      <span className="font-display font-semibold" style={{ fontSize: '2.2vw', color: '#F0F4FF' }}>{value}</span>
                      <span className="font-body" style={{ fontSize: '0.95vw', color: '#4A5568' }}>{note}</span>
                    </div>
                    <div className="font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0', marginTop: '0.2vh' }}>{sub}</div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Bottom-up math */}
            <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.65)}
              className="rounded-[0.9vw] p-[1.5vh_1.5vw]"
              style={{ background: 'rgba(0,194,255,0.04)', border: '1px dashed rgba(0,194,255,0.3)', boxShadow: '0 0 25px rgba(0,194,255,0.05)' }}>
              <div className="font-display font-semibold mb-[1vh]" style={{ fontSize: '1.05vw', color: '#7A8BA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bottom-Up Sanity Check</div>
              <div className="flex flex-col" style={{ gap: '0.55vh' }}>
                <div className="flex justify-between font-body" style={{ fontSize: '1.05vw' }}>
                  <span style={{ color: '#7A8BA0' }}>240K Solidity devs × $50/mo avg spend</span>
                  <span style={{ color: '#00C2FF', fontWeight: 600 }}>= $144M/yr</span>
                </div>
                <div className="flex justify-between font-body" style={{ fontSize: '1.05vw' }}>
                  <span style={{ color: '#7A8BA0' }}>40K new DeFi protocols/yr × $500 launch spend</span>
                  <span style={{ color: '#00C2FF', fontWeight: 600 }}>= $20M/yr</span>
                </div>
                <div style={{ height: '1px', background: 'rgba(0,194,255,0.18)', margin: '0.5vh 0' }} />
                <div className="flex justify-between font-display font-semibold" style={{ fontSize: '1.2vw' }}>
                  <span style={{ color: '#F0F4FF' }}>Combined accessible immediately</span>
                  <span style={{ color: '#F5A623' }}>$164M+</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right: Beautiful animated ring chart */}
          <div className="flex flex-col items-center justify-center flex-1">
            <motion.div {...anim({ opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, 0.3, 1.0)}
              className="relative flex items-center justify-center" style={{ width: '100%', maxWidth: '30vw' }}>
              <svg viewBox="0 0 380 380" style={{ width: '100%', overflow: 'visible' }}>
                <defs>
                  {/* Gradient for each ring */}
                  <radialGradient id="glowCenter" cx="50%" cy="50%" r="50%">
                    <stop offset="0%"   stopColor="#00C2FF" stopOpacity="1" />
                    <stop offset="60%"  stopColor="#00C2FF" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#00C2FF" stopOpacity="0" />
                  </radialGradient>
                  <linearGradient id="tamRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#9F58FA" stopOpacity="0.3"/>
                    <stop offset="100%" stopColor="#00C2FF" stopOpacity="0.5"/>
                  </linearGradient>
                  <linearGradient id="samRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%"   stopColor="#00C2FF" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#9F58FA" stopOpacity="0.4"/>
                  </linearGradient>
                  <filter id="ringGlow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="innerGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Outer dotted orbit ring */}
                <circle cx="190" cy="190" r="174" fill="none"
                  stroke="rgba(0,194,255,0.08)" strokeWidth="1" strokeDasharray="4 8" />

                {/* TAM ring — filled area */}
                <motion.circle cx="190" cy="190" r="160"
                  fill="rgba(0,194,255,0.025)"
                  stroke="url(#tamRingGrad)"
                  strokeWidth="1.5"
                  filter="url(#ringGlow)"
                  {...(isExport
                    ? { initial: { opacity: 1, scale: 1 }, animate: { opacity: 1, scale: 1 } }
                    : { initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.8, delay: 0.4 } }
                  )} />

                {/* SAM ring */}
                <motion.circle cx="190" cy="190" r="112"
                  fill="rgba(0,194,255,0.055)"
                  stroke="url(#samRingGrad)"
                  strokeWidth="1.5"
                  filter="url(#ringGlow)"
                  {...(isExport
                    ? { initial: { opacity: 1, scale: 1 }, animate: { opacity: 1, scale: 1 } }
                    : { initial: { opacity: 0, scale: 0.5 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.8, delay: 0.6 } }
                  )} />

                {/* SOM filled ring */}
                <motion.circle cx="190" cy="190" r="64"
                  fill="rgba(0,194,255,0.14)"
                  stroke="#00C2FF"
                  strokeWidth="2"
                  filter="url(#ringGlow)"
                  {...(isExport
                    ? { initial: { opacity: 1, scale: 1 }, animate: { opacity: 1, scale: 1 } }
                    : { initial: { opacity: 0, scale: 0 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.9, delay: 0.8, type: 'spring', stiffness: 120 } }
                  )} />

                {/* Inner bright core */}
                <motion.circle cx="190" cy="190" r="38"
                  fill="rgba(0,194,255,0.32)"
                  filter="url(#innerGlow)"
                  {...(isExport
                    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
                    : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.6, delay: 1.0 } }
                  )} />

                <motion.circle cx="190" cy="190" r="18"
                  fill="rgba(0,194,255,0.7)"
                  {...(isExport
                    ? { initial: { opacity: 1, scale: 1 }, animate: { opacity: 1, scale: 1 } }
                    : { initial: { opacity: 0, scale: 0 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.5, delay: 1.1, type: 'spring' } }
                  )} />

                {/* Pulsing dot at center */}
                {!isExport && (
                  <circle cx="190" cy="190" r="18" fill="#00C2FF" opacity="0.5"
                    style={{ animation: 'ring-pulse 3s ease-in-out infinite' }} />
                )}

                {/* Orbiting dot on TAM ring */}
                {!isExport && (
                  <circle cx="190" cy="30" r="4" fill="#9F58FA"
                    style={{ transformOrigin: '190px 190px', animation: 'orbit 12s linear infinite', '--orbit-r': '0px' } as React.CSSProperties} />
                )}

                {/* Labels — TAM */}
                <motion.g {...(isExport ? { initial: { opacity: 1 }, animate: { opacity: 1 } } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 1.2 } })}>
                  <line x1="330" y1="85" x2="352" y2="62" stroke="rgba(0,194,255,0.3)" strokeWidth="1" />
                  <text x="356" y="58" fill="#7A8BA0" fontFamily="DM Sans,sans-serif" fontSize="12">TAM</text>
                  <text x="356" y="76" fill="#F0F4FF" fontFamily="Space Grotesk,sans-serif" fontSize="19" fontWeight="700">$12B</text>
                </motion.g>

                {/* SAM */}
                <motion.g {...(isExport ? { initial: { opacity: 1 }, animate: { opacity: 1 } } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 1.3 } })}>
                  <line x1="302" y1="190" x2="330" y2="190" stroke="rgba(0,194,255,0.3)" strokeWidth="1" />
                  <text x="334" y="186" fill="#7A8BA0" fontFamily="DM Sans,sans-serif" fontSize="12">SAM</text>
                  <text x="334" y="204" fill="#F0F4FF" fontFamily="Space Grotesk,sans-serif" fontSize="19" fontWeight="700">$3B</text>
                </motion.g>

                {/* SOM center */}
                <motion.g {...(isExport ? { initial: { opacity: 1 }, animate: { opacity: 1 } } : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { delay: 1.4 } })}>
                  <text x="190" y="183" fill="#00C2FF" fontFamily="Space Grotesk,sans-serif" fontSize="12" fontWeight="600" textAnchor="middle">SOM</text>
                  <text x="190" y="202" fill="#F0F4FF" fontFamily="Space Grotesk,sans-serif" fontSize="20" fontWeight="800" textAnchor="middle">$120M</text>
                </motion.g>
              </svg>
            </motion.div>

            {/* Why Now box */}
            <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.75)}
              className="rounded-[0.9vw] p-[1.4vh_1.5vw] w-full"
              style={{ background: 'rgba(245,166,35,0.05)', border: '1px solid rgba(245,166,35,0.22)', boxShadow: '0 0 25px rgba(245,166,35,0.05)' }}>
              <div className="font-display font-semibold mb-[0.7vh]" style={{ fontSize: '1.1vw', color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why Now</div>
              <div className="flex flex-col" style={{ gap: '0.45vh' }}>
                {[
                  'EVM TVL hit $100B+; Solana crossed 100M monthly active wallets',
                  'LLMs can now write production Solidity — verified compilation is the missing piece',
                  'No incumbent owns the full-lifecycle toolchain — window is open right now',
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-[0.6vw] font-body" style={{ fontSize: '1.04vw', color: '#7A8BA0' }}>
                    <span style={{ color: '#F5A623', marginTop: '0.1vh', flexShrink: 0 }}>→</span>
                    <span>{text}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 50%, transparent 100%)', boxShadow: '0 0 10px rgba(0,194,255,0.3)' }} />
    </div>
  );
}
