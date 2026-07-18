import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.7) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

export default function Slide04TwoChains() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      {/* EVM glow — left */}
      <div className="absolute left-0 top-0 bottom-0 w-[50vw] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 20% 50%, rgba(0,194,255,0.08) 0%, transparent 70%)' }} />
      {/* Solana glow — right */}
      <div className="absolute right-0 top-0 bottom-0 w-[50vw] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 80% 70% at 80% 50%, rgba(159,88,250,0.08) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5.5vh 0 5vh' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, y: -20 }, { opacity: 1, y: 0 }, 0.1)} className="text-center mb-[4vh] px-[6vw]">
          <div className="font-display font-bold" style={{ fontSize: '4.6vw', letterSpacing: '-0.02em', color: '#F0F4FF' }}>
            Two chains. <span style={{ color: '#00C2FF' }}>One platform.</span>
          </div>
        </motion.div>

        {/* Main split */}
        <div className="flex flex-1 relative">
          {/* EVM left */}
          <motion.div {...anim({ opacity: 0, x: -40 }, { opacity: 1, x: 0 }, 0.25, 0.75)}
            className="flex flex-col justify-center" style={{ width: '46vw', padding: '0 5vw 0 6vw' }}>
            <div className="flex items-center gap-[1.2vw] mb-[3vh]">
              <div className="flex items-center justify-center rounded-[0.8vw]"
                style={{ width: '4.5vw', height: '4.5vw', background: 'rgba(0,194,255,0.1)', border: '1px solid rgba(0,194,255,0.3)' }}>
                <span style={{ fontSize: '2.2vw' }}>⬡</span>
              </div>
              <div>
                <div className="font-display font-bold" style={{ fontSize: '2.8vw', color: '#00C2FF', lineHeight: 1 }}>EVM</div>
                <div className="font-body" style={{ fontSize: '1.2vw', color: '#7A8BA0' }}>Ethereum Virtual Machine</div>
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: '1.4vh' }}>
              <div className="flex items-center gap-[1vw] rounded-[0.6vw] p-[1.2vh_1.4vw]"
                style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.12)' }}>
                <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#00C2FF', flexShrink: 0 }} />
                <span className="font-body" style={{ fontSize: '1.25vw', color: '#F0F4FF' }}>Ethereum · Base · Arbitrum · Polygon · BNB</span>
              </div>
              <div className="flex items-center gap-[1vw] rounded-[0.6vw] p-[1.2vh_1.4vw]"
                style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.12)' }}>
                <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#00C2FF', flexShrink: 0 }} />
                <span className="font-body" style={{ fontSize: '1.25vw', color: '#F0F4FF' }}>Real <code style={{ color: '#00C2FF' }}>solc</code> compilation with self-healing</span>
              </div>
              <div className="flex items-center gap-[1vw] rounded-[0.6vw] p-[1.2vh_1.4vw]"
                style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.12)' }}>
                <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#00C2FF', flexShrink: 0 }} />
                <span className="font-body" style={{ fontSize: '1.25vw', color: '#F0F4FF' }}>Verified EVM bytecode + ABI output</span>
              </div>
              <div className="flex items-center gap-[1vw] rounded-[0.6vw] p-[1.2vh_1.4vw]"
                style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.12)' }}>
                <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#00C2FF', flexShrink: 0 }} />
                <span className="font-body" style={{ fontSize: '1.25vw', color: '#F0F4FF' }}>Solidity — upgradeable &amp; standard</span>
              </div>
            </div>
          </motion.div>

          {/* Center divider */}
          <div className="flex flex-col items-center justify-center" style={{ width: '8vw' }}>
            <div style={{ width: '1px', flex: 1, background: 'linear-gradient(to bottom, transparent, rgba(0,194,255,0.3), rgba(159,88,250,0.3), transparent)' }} />
            <motion.div {...anim({ opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1 }, 0.4)}
              className="flex items-center justify-center rounded-full my-[2vh]"
              style={{ width: '5.5vw', height: '5.5vw', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', flexShrink: 0 }}>
              <span className="font-display font-bold" style={{ fontSize: '0.85vw', color: '#7A8BA0', textAlign: 'center', letterSpacing: '0.08em' }}>ONE<br />PLATFORM</span>
            </motion.div>
            <div style={{ width: '1px', flex: 1, background: 'linear-gradient(to bottom, transparent, rgba(159,88,250,0.3), rgba(0,194,255,0.3), transparent)' }} />
          </div>

          {/* Solana right */}
          <motion.div {...anim({ opacity: 0, x: 40 }, { opacity: 1, x: 0 }, 0.25, 0.75)}
            className="flex flex-col justify-center" style={{ width: '46vw', padding: '0 6vw 0 0' }}>
            <div className="flex items-center gap-[1.2vw] mb-[3vh]">
              <div className="flex items-center justify-center rounded-[0.8vw]"
                style={{ width: '4.5vw', height: '4.5vw', background: 'rgba(159,88,250,0.1)', border: '1px solid rgba(159,88,250,0.3)' }}>
                <span style={{ fontSize: '2.2vw' }}>◎</span>
              </div>
              <div>
                <div className="font-display font-bold" style={{ fontSize: '2.8vw', color: '#9F58FA', lineHeight: 1 }}>Solana</div>
                <div className="font-body" style={{ fontSize: '1.2vw', color: '#7A8BA0' }}>Anchor / Rust Programs</div>
              </div>
            </div>

            <div className="flex flex-col" style={{ gap: '1.4vh' }}>
              <div className="flex items-center gap-[1vw] rounded-[0.6vw] p-[1.2vh_1.4vw]"
                style={{ background: 'rgba(159,88,250,0.06)', border: '1px solid rgba(159,88,250,0.15)' }}>
                <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#9F58FA', flexShrink: 0 }} />
                <span className="font-body" style={{ fontSize: '1.25vw', color: '#F0F4FF' }}>Anchor framework — production Rust programs</span>
              </div>
              <div className="flex items-center gap-[1vw] rounded-[0.6vw] p-[1.2vh_1.4vw]"
                style={{ background: 'rgba(159,88,250,0.06)', border: '1px solid rgba(159,88,250,0.15)' }}>
                <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#9F58FA', flexShrink: 0 }} />
                <span className="font-body" style={{ fontSize: '1.25vw', color: '#F0F4FF' }}>Real <code style={{ color: '#9F58FA' }}>cargo-build-sbf</code> — actual .so binary</span>
              </div>
              <div className="flex items-center gap-[1vw] rounded-[0.6vw] p-[1.2vh_1.4vw]"
                style={{ background: 'rgba(159,88,250,0.06)', border: '1px solid rgba(159,88,250,0.15)' }}>
                <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#9F58FA', flexShrink: 0 }} />
                <span className="font-body" style={{ fontSize: '1.25vw', color: '#F0F4FF' }}>Real IDL generation via <code style={{ color: '#9F58FA' }}>anchor idl build</code></span>
              </div>
              <div className="flex items-center gap-[1vw] rounded-[0.6vw] p-[1.2vh_1.4vw]"
                style={{ background: 'rgba(159,88,250,0.06)', border: '1px solid rgba(159,88,250,0.15)' }}>
                <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#9F58FA', flexShrink: 0 }} />
                <span className="font-body" style={{ fontSize: '1.25vw', color: '#F0F4FF' }}>Phantom wallet devnet deployment</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom stat */}
        <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.6)}
          className="text-center mt-[3vh]">
          <span className="font-display font-semibold" style={{ fontSize: '1.5vw', color: '#7A8BA0' }}>
            <span style={{ color: '#F5A623' }}>95%</span> of on-chain value lives on these two ecosystems — no other AI forge covers both natively
          </span>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, #00C2FF 0%, #9F58FA 50%, #00C2FF 100%)' }} />
    </div>
  );
}
