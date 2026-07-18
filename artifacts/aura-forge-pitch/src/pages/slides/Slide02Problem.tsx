import { motion } from 'framer-motion';

const base = import.meta.env.BASE_URL;
const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

export default function Slide02Problem() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      {/* Red glow */}
      <div className="absolute top-[-5vh] right-[18vw] w-[38vw] h-[38vw] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(255,75,75,0.1) 0%, transparent 70%)' }} />

      {/* Left content */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center" style={{ width: '55vw', padding: '0 4vw 0 6vw' }}>
        <motion.div {...anim({ opacity: 0, x: -20 }, { opacity: 1, x: 0 }, 0.1)}
          className="flex items-center gap-[0.7vw] mb-[2vh]">
          <div className="w-[3vw] h-[0.25vh]" style={{ background: '#FF4B4B' }} />
          <span className="font-body uppercase tracking-widest" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>The Problem</span>
        </motion.div>

        <motion.div {...anim({ opacity: 0, y: 25 }, { opacity: 1, y: 0 }, 0.2, 0.7)} className="mb-[3.5vh]">
          <div className="font-display font-bold leading-[1.05]" style={{ fontSize: '5.4vw', letterSpacing: '-0.02em', color: '#F0F4FF' }}>
            Smart contracts are
          </div>
          <div className="font-display font-bold leading-[1.05]" style={{ fontSize: '5.4vw', letterSpacing: '-0.02em', color: '#FF4B4B' }}>
            a $3.8B liability.
          </div>
        </motion.div>

        {/* Problem statements */}
        <div className="flex flex-col" style={{ gap: '1.5vh' }}>
          <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.35)}
            className="flex items-start gap-[1.2vw] rounded-[0.7vw] p-[1.3vh_1.4vw]"
            style={{ background: 'rgba(255,75,75,0.06)', border: '1px solid rgba(255,75,75,0.18)' }}>
            <div className="font-display font-bold shrink-0" style={{ fontSize: '2.4vw', color: '#FF4B4B', lineHeight: 1, minWidth: '5.5vw' }}>$3.8B</div>
            <div>
              <div className="font-body font-medium" style={{ fontSize: '1.2vw', color: '#F0F4FF' }}>Lost to smart contract exploits in 2023</div>
              <div className="font-body" style={{ fontSize: '0.95vw', color: '#4A5568' }}>Source: Immunefi Web3 Security Report 2024</div>
            </div>
          </motion.div>

          <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.46)}
            className="flex items-start gap-[1.2vw] rounded-[0.7vw] p-[1.3vh_1.4vw]"
            style={{ background: 'rgba(255,75,75,0.06)', border: '1px solid rgba(255,75,75,0.18)' }}>
            <div className="font-display font-bold shrink-0" style={{ fontSize: '2.4vw', color: '#FF4B4B', lineHeight: 1, minWidth: '5.5vw' }}>$150K</div>
            <div>
              <div className="font-body font-medium" style={{ fontSize: '1.2vw', color: '#F0F4FF' }}>Max cost for a professional security audit, 4–8 weeks wait</div>
              <div className="font-body" style={{ fontSize: '0.95vw', color: '#4A5568' }}>Source: Trail of Bits, CertiK, ConsenSys Diligence public pricing</div>
            </div>
          </motion.div>

          <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.57)}
            className="flex items-start gap-[1.2vw] rounded-[0.7vw] p-[1.3vh_1.4vw]"
            style={{ background: 'rgba(255,75,75,0.06)', border: '1px solid rgba(255,75,75,0.18)' }}>
            <div className="font-display font-bold shrink-0" style={{ fontSize: '2.4vw', color: '#FF4B4B', lineHeight: 1, minWidth: '5.5vw' }}>73%</div>
            <div>
              <div className="font-body font-medium" style={{ fontSize: '1.2vw', color: '#F0F4FF' }}>Of DeFi hacks in 2023 were directly caused by contract vulnerabilities</div>
              <div className="font-body" style={{ fontSize: '0.95vw', color: '#4A5568' }}>Source: Chainalysis Crypto Crime Report 2024</div>
            </div>
          </motion.div>

          <motion.div {...anim({ opacity: 0, x: -15 }, { opacity: 1, x: 0 }, 0.68)}
            className="flex items-start gap-[1.2vw] rounded-[0.7vw] p-[1.3vh_1.4vw]"
            style={{ background: 'rgba(255,75,75,0.06)', border: '1px solid rgba(255,75,75,0.18)' }}>
            <div className="font-display font-bold shrink-0" style={{ fontSize: '2.4vw', color: '#FF4B4B', lineHeight: 1, minWidth: '5.5vw' }}>&lt;1%</div>
            <div>
              <div className="font-body font-medium" style={{ fontSize: '1.2vw', color: '#F0F4FF' }}>Of software developers are proficient in Solidity or Rust/Anchor</div>
              <div className="font-body" style={{ fontSize: '0.95vw', color: '#4A5568' }}>Source: Stack Overflow Developer Survey 2023 — language prevalence data</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right: image */}
      <motion.div {...anim({ opacity: 0, x: 40 }, { opacity: 1, x: 0 }, 0.25, 0.8)}
        className="absolute right-0 top-0 bottom-0" style={{ width: '45vw' }}>
        <img
          src={`${base}hero-problem.jpg`}
          crossOrigin="anonymous"
          alt=""
          className="w-full h-full object-cover"
          style={{ opacity: 0.7 }}
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #07090F 0%, transparent 25%, transparent 75%, #07090F 100%)' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, #07090F 0%, transparent 15%, transparent 85%, #07090F 100%)' }} />
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, #FF4B4B 0%, transparent 60%)' }} />
    </div>
  );
}
