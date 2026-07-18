import { motion } from 'framer-motion';
import { useTilt } from '../../hooks/useTilt';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.7) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

function FeatureRow({ dot, text, delay }: { dot: string; text: string; delay: number }) {
  return (
    <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, delay)}
      className="flex items-center gap-[1vw] rounded-[0.6vw] p-[1.2vh_1.4vw]"
      style={{ background: `rgba(${dot},0.06)`, border: `1px solid rgba(${dot},0.14)` }}>
      <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: `rgb(${dot})`, flexShrink: 0, boxShadow: `0 0 6px rgba(${dot},0.8)` }} />
      <span className="font-body" style={{ fontSize: '1.22vw', color: '#F0F4FF' }} dangerouslySetInnerHTML={{ __html: text }} />
    </motion.div>
  );
}

export default function Slide04TwoChains() {
  const tiltLeft  = useTilt(6);
  const tiltRight = useTilt(6);

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      {/* EVM glow — left */}
      <div className="absolute left-0 top-0 bottom-0 w-[50vw] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 20% 50%, rgba(0,194,255,0.09) 0%, transparent 70%)' }} />
      {/* Solana glow — right */}
      <div className="absolute right-0 top-0 bottom-0 w-[50vw] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 80% 50%, rgba(159,88,250,0.09) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5.5vh 0 5vh' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, y: -20 }, { opacity: 1, y: 0 }, 0.1)} className="text-center mb-[3.5vh] px-[6vw]">
          <div className="font-display font-bold text-3d-white" style={{ fontSize: '4.6vw', letterSpacing: '-0.02em', color: '#F0F4FF' }}>
            Two chains. <span className="text-3d-cyan" style={{ color: '#00C2FF' }}>One platform.</span>
          </div>
        </motion.div>

        {/* Main split — two 3D tiltable panels + center */}
        <div className="flex flex-1 relative">
          {/* EVM left panel */}
          <motion.div {...anim({ opacity: 0, x: -50, rotateY: 20 }, { opacity: 1, x: 0, rotateY: 0 }, 0.25, 0.8)}
            ref={tiltLeft.ref}
            onMouseMove={tiltLeft.onMouseMove}
            onMouseLeave={tiltLeft.onMouseLeave}
            className="flex flex-col justify-center"
            style={{ width: '46vw', padding: '0 4vw 0 6vw', transformStyle: 'preserve-3d' }}>

            {/* EVM badge */}
            <div className="flex items-center gap-[1.2vw] mb-[3vh]">
              <motion.div {...anim({ opacity: 0, scale: 0.5, rotateY: -90 }, { opacity: 1, scale: 1, rotateY: 0 }, 0.35, 0.7)}
                className="flex items-center justify-center rounded-[0.9vw]"
                style={{
                  width: '5vw', height: '5vw',
                  background: 'rgba(0,194,255,0.1)',
                  border: '1px solid rgba(0,194,255,0.35)',
                  boxShadow: '0 0 30px rgba(0,194,255,0.15), inset 0 0 15px rgba(0,194,255,0.05)',
                  fontSize: '2.4vw',
                  animation: isExport ? undefined : 'float3d 7s ease-in-out infinite',
                }}>
                ⬡
              </motion.div>
              <div>
                <div className="font-display font-bold text-3d-cyan" style={{ fontSize: '2.8vw', color: '#00C2FF', lineHeight: 1 }}>EVM</div>
                <div className="font-body" style={{ fontSize: '1.15vw', color: '#7A8BA0' }}>Ethereum Virtual Machine</div>
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: '1.3vh' }}>
              <FeatureRow dot="0,194,255" text="Ethereum · Base · Arbitrum · Polygon · BNB" delay={0.45} />
              <FeatureRow dot="0,194,255" text="Real <code style='color:#00C2FF'>solc</code> compilation with self-healing" delay={0.52} />
              <FeatureRow dot="0,194,255" text="Verified EVM bytecode + ABI output" delay={0.59} />
              <FeatureRow dot="0,194,255" text="Solidity — upgradeable &amp; standard" delay={0.66} />
            </div>
          </motion.div>

          {/* Center divider with 3D orb */}
          <div className="flex flex-col items-center justify-center" style={{ width: '8vw' }}>
            <div style={{ width: '1px', flex: 1, background: 'linear-gradient(to bottom, transparent, rgba(0,194,255,0.35), rgba(159,88,250,0.35), transparent)' }} />
            <motion.div {...anim({ opacity: 0, scale: 0.5, rotateY: 90 }, { opacity: 1, scale: 1, rotateY: 0 }, 0.4, 0.8)}
              className="flex items-center justify-center rounded-full my-[2vh]"
              style={{
                width: '6vw', height: '6vw', flexShrink: 0,
                background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 0 40px rgba(0,194,255,0.1), 0 0 40px rgba(159,88,250,0.1)',
                animation: isExport ? undefined : 'float 6s ease-in-out infinite',
              }}>
              <span className="font-display font-bold" style={{ fontSize: '0.85vw', color: '#7A8BA0', textAlign: 'center', letterSpacing: '0.08em', lineHeight: 1.3 }}>ONE<br />PLATFORM</span>
            </motion.div>
            <div style={{ width: '1px', flex: 1, background: 'linear-gradient(to bottom, transparent, rgba(159,88,250,0.35), rgba(0,194,255,0.35), transparent)' }} />
          </div>

          {/* Solana right panel */}
          <motion.div {...anim({ opacity: 0, x: 50, rotateY: -20 }, { opacity: 1, x: 0, rotateY: 0 }, 0.25, 0.8)}
            ref={tiltRight.ref}
            onMouseMove={tiltRight.onMouseMove}
            onMouseLeave={tiltRight.onMouseLeave}
            className="flex flex-col justify-center"
            style={{ width: '46vw', padding: '0 6vw 0 4vw', transformStyle: 'preserve-3d' }}>

            <div className="flex items-center gap-[1.2vw] mb-[3vh]">
              <motion.div {...anim({ opacity: 0, scale: 0.5, rotateY: 90 }, { opacity: 1, scale: 1, rotateY: 0 }, 0.35, 0.7)}
                className="flex items-center justify-center rounded-[0.9vw]"
                style={{
                  width: '5vw', height: '5vw',
                  background: 'rgba(159,88,250,0.1)',
                  border: '1px solid rgba(159,88,250,0.35)',
                  boxShadow: '0 0 30px rgba(159,88,250,0.15), inset 0 0 15px rgba(159,88,250,0.05)',
                  fontSize: '2.4vw',
                  animation: isExport ? undefined : 'float3d 7s ease-in-out infinite 3.5s',
                }}>
                ◎
              </motion.div>
              <div>
                <div className="font-display font-bold" style={{ fontSize: '2.8vw', color: '#9F58FA', lineHeight: 1, textShadow: '0 0 20px rgba(159,88,250,0.5)' }}>Solana</div>
                <div className="font-body" style={{ fontSize: '1.15vw', color: '#7A8BA0' }}>Anchor / Rust Programs</div>
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: '1.3vh' }}>
              <FeatureRow dot="159,88,250" text="Anchor framework — production Rust programs" delay={0.45} />
              <FeatureRow dot="159,88,250" text="Real <code style='color:#9F58FA'>cargo-build-sbf</code> — actual .so binary" delay={0.52} />
              <FeatureRow dot="159,88,250" text="Real IDL generation via <code style='color:#9F58FA'>anchor idl build</code>" delay={0.59} />
              <FeatureRow dot="159,88,250" text="Phantom wallet devnet deployment" delay={0.66} />
            </div>
          </motion.div>
        </div>

        {/* Bottom stat */}
        <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.72)}
          className="text-center mt-[3vh]">
          <span className="font-display font-semibold" style={{ fontSize: '1.5vw', color: '#7A8BA0' }}>
            <span style={{ color: '#F5A623', textShadow: '0 0 12px rgba(245,166,35,0.5)' }}>95%</span> of on-chain value lives on these two ecosystems — no other AI forge covers both natively
          </span>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, #00C2FF 0%, #9F58FA 50%, #00C2FF 100%)', boxShadow: '0 0 10px rgba(159,88,250,0.3)' }} />
    </div>
  );
}
