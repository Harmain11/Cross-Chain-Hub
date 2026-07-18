import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

// Bar heights as % of max ($2.1M)
const BAR_MAX_H = 48; // vh available for bar area
const bars = [
  { label: 'Year 1', value: '$180K', pct: 8.6, color: '#00C2FF' },
  { label: 'Year 2', value: '$720K', pct: 34.3, color: '#00C2FF' },
  { label: 'Year 3', value: '$2.1M', pct: 100, color: '#00C2FF' },
];

export default function Slide06Revenue() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(245,166,35,0.05) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5.5vh 6vw 4vh' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, y: -15 }, { opacity: 1, y: 0 }, 0.1)} className="mb-[3.5vh]">
          <div className="flex items-center gap-[0.7vw] mb-[1.2vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#F5A623' }} />
            <span className="font-body uppercase tracking-widest text-muted" style={{ fontSize: '1.1vw' }}>Business Model</span>
          </div>
          <div className="font-display font-bold" style={{ fontSize: '4.4vw', color: '#F0F4FF', letterSpacing: '-0.02em' }}>
            Three ways we get paid
          </div>
        </motion.div>

        {/* Revenue stream cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5vh 2vw', marginBottom: '3.5vh' }}>
          <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.25)}
            className="rounded-[1vw] p-[2.2vh_1.8vw]"
            style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.2)' }}>
            <div className="font-display font-bold mb-[0.5vh]" style={{ fontSize: '1.4vw', color: '#00C2FF' }}>API Per-Job</div>
            <div className="font-display font-semibold mb-[1vh]" style={{ fontSize: '2.2vw', color: '#F0F4FF' }}>$5–$25</div>
            <div className="font-body" style={{ fontSize: '1.1vw', color: '#7A8BA0', lineHeight: 1.5 }}>Per contract forged via API. Developers, protocols, integrators pay at the moment of creation.</div>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.38)}
            className="rounded-[1vw] p-[2.2vh_1.8vw]"
            style={{ background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.25)' }}>
            <div className="font-display font-bold mb-[0.5vh]" style={{ fontSize: '1.4vw', color: '#F5A623' }}>Pro Subscription</div>
            <div className="font-display font-semibold mb-[1vh]" style={{ fontSize: '2.2vw', color: '#F0F4FF' }}>$99/mo</div>
            <div className="font-body" style={{ fontSize: '1.1vw', color: '#7A8BA0', lineHeight: 1.5 }}>Higher limits, Solana compilation, team seats. Free tier drives top-of-funnel.</div>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.51)}
            className="rounded-[1vw] p-[2.2vh_1.8vw]"
            style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.2)' }}>
            <div className="font-display font-bold mb-[0.5vh]" style={{ fontSize: '1.4vw', color: '#00C2FF' }}>Ecosystem Toll</div>
            <div className="font-display font-semibold mb-[1vh]" style={{ fontSize: '2.2vw', color: '#F0F4FF' }}>Per Call</div>
            <div className="font-body" style={{ fontSize: '1.1vw', color: '#7A8BA0', lineHeight: 1.5 }}>Dark Pino sub-projects pay per API call internally. Grows with the ecosystem.</div>
          </motion.div>
        </div>

        {/* Bar chart — Projected ARR */}
        <div className="flex flex-col flex-1">
          <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.55)}
            className="font-display font-semibold mb-[2vh]" style={{ fontSize: '1.3vw', color: '#7A8BA0' }}>
            Projected ARR
          </motion.div>

          <div className="flex items-end flex-1" style={{ gap: '5vw', paddingBottom: '3.5vh', justifyContent: 'center' }}>
            {/* Bar 1 — Year 1 */}
            <div className="flex flex-col items-center">
              <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.7)}
                className="font-display font-bold mb-[1vh]" style={{ fontSize: '1.5vw', color: '#F0F4FF' }}>$180K</motion.div>
              <motion.div
                initial={isExport ? { height: '4.1vh' } : { height: 0 }}
                animate={{ height: '4.1vh' }}
                transition={{ duration: 0.8, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: '8vw', background: 'linear-gradient(to top, #00C2FF, rgba(0,194,255,0.5))', borderRadius: '0.5vw 0.5vw 0 0', minHeight: '4.1vh' }} />
              <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.9)}
                className="font-body mt-[1vh] text-center" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Year 1</motion.div>
            </div>

            {/* Bar 2 — Year 2 */}
            <div className="flex flex-col items-center">
              <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.75)}
                className="font-display font-bold mb-[1vh]" style={{ fontSize: '1.5vw', color: '#F0F4FF' }}>$720K</motion.div>
              <motion.div
                initial={isExport ? { height: '16.5vh' } : { height: 0 }}
                animate={{ height: '16.5vh' }}
                transition={{ duration: 0.85, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: '8vw', background: 'linear-gradient(to top, #00C2FF, rgba(0,194,255,0.5))', borderRadius: '0.5vw 0.5vw 0 0', minHeight: '16.5vh' }} />
              <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.95)}
                className="font-body mt-[1vh] text-center" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Year 2</motion.div>
            </div>

            {/* Bar 3 — Year 3 */}
            <div className="flex flex-col items-center">
              <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.8)}
                className="font-display font-bold mb-[1vh]" style={{ fontSize: '1.5vw', color: '#F5A623' }}>$2.1M</motion.div>
              <motion.div
                initial={isExport ? { height: '26vh' } : { height: 0 }}
                animate={{ height: '26vh' }}
                transition={{ duration: 0.9, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: '8vw', background: 'linear-gradient(to top, #F5A623, rgba(245,166,35,0.5))', borderRadius: '0.5vw 0.5vw 0 0', minHeight: '26vh' }} />
              <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 1.0)}
                className="font-body mt-[1vh] text-center" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Year 3</motion.div>
            </div>
          </div>
        </div>
      </div>

      <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 1.05)}
        className="absolute bottom-[1.5vh] right-[2vw] font-body" style={{ fontSize: '1vw', color: '#4A5568' }}>
        *Projections
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #F5A623 50%, transparent 100%)' }} />
    </div>
  );
}
