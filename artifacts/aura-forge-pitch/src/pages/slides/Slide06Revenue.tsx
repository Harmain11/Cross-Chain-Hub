import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

export default function Slide06Revenue() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 30%, rgba(245,166,35,0.06) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5vh 6vw 4vh' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, y: -15 }, { opacity: 1, y: 0 }, 0.1)} className="mb-[2.5vh]">
          <div className="flex items-center gap-[0.7vw] mb-[1vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#F5A623' }} />
            <span className="font-body uppercase tracking-widest text-muted" style={{ fontSize: '1.1vw' }}>Business Model</span>
          </div>
          <div className="font-display font-bold" style={{ fontSize: '4.2vw', color: '#F0F4FF', letterSpacing: '-0.02em' }}>
            Three revenue streams. <span style={{ color: '#F5A623' }}>One compounding moat.</span>
          </div>
        </motion.div>

        {/* Revenue stream cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.2vh 2vw', marginBottom: '2.5vh' }}>
          <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.25)}
            className="rounded-[1vw] p-[1.8vh_1.6vw]"
            style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.2)' }}>
            <div className="font-display font-bold mb-[0.4vh]" style={{ fontSize: '1.3vw', color: '#00C2FF' }}>API Per-Job</div>
            <div className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: '2.4vw', color: '#F0F4FF' }}>$5–$25</div>
            <div className="font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0', lineHeight: 1.5 }}>Pay-as-you-go per contract. Zero friction onboarding — works from the first API call.</div>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.38)}
            className="rounded-[1vw] p-[1.8vh_1.6vw]"
            style={{ background: 'rgba(245,166,35,0.07)', border: '1px solid rgba(245,166,35,0.28)' }}>
            <div className="font-display font-bold mb-[0.4vh]" style={{ fontSize: '1.3vw', color: '#F5A623' }}>Pro Subscription</div>
            <div className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: '2.4vw', color: '#F0F4FF' }}>$99/mo</div>
            <div className="font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0', lineHeight: 1.5 }}>Higher limits, Solana support, team seats. Free tier drives top-of-funnel with no CAC.</div>
          </motion.div>
          <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.51)}
            className="rounded-[1vw] p-[1.8vh_1.6vw]"
            style={{ background: 'rgba(0,194,255,0.06)', border: '1px solid rgba(0,194,255,0.2)' }}>
            <div className="font-display font-bold mb-[0.4vh]" style={{ fontSize: '1.3vw', color: '#00C2FF' }}>Ecosystem Toll</div>
            <div className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: '2.4vw', color: '#F0F4FF' }}>Per Call</div>
            <div className="font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0', lineHeight: 1.5 }}>Internal API fee for Dark Pino sub-projects. Scales automatically with ecosystem growth.</div>
          </motion.div>
        </div>

        {/* Unit economics strip */}
        <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.6)}
          className="rounded-[0.8vw] p-[1.5vh_2vw] mb-[2.5vh]"
          style={{ background: 'rgba(0,194,255,0.03)', border: '1px solid rgba(0,194,255,0.15)' }}>
          <div className="font-display font-semibold mb-[1.2vh]" style={{ fontSize: '1.1vw', color: '#7A8BA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unit Economics</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '0 1vw' }}>
            <div className="text-center">
              <div className="font-display font-bold" style={{ fontSize: '2vw', color: '#00C2FF' }}>~$12</div>
              <div className="font-body" style={{ fontSize: '0.95vw', color: '#7A8BA0', marginTop: '0.3vh' }}>CAC (API-led)</div>
            </div>
            <div className="text-center">
              <div className="font-display font-bold" style={{ fontSize: '2vw', color: '#00C2FF' }}>$24/mo</div>
              <div className="font-body" style={{ fontSize: '0.95vw', color: '#7A8BA0', marginTop: '0.3vh' }}>Avg Revenue/User</div>
            </div>
            <div className="text-center">
              <div className="font-display font-bold" style={{ fontSize: '2vw', color: '#F5A623' }}>28×</div>
              <div className="font-body" style={{ fontSize: '0.95vw', color: '#7A8BA0', marginTop: '0.3vh' }}>LTV : CAC</div>
            </div>
            <div className="text-center">
              <div className="font-display font-bold" style={{ fontSize: '2vw', color: '#00C2FF' }}>~85%</div>
              <div className="font-body" style={{ fontSize: '0.95vw', color: '#7A8BA0', marginTop: '0.3vh' }}>Gross Margin</div>
            </div>
            <div className="text-center">
              <div className="font-display font-bold" style={{ fontSize: '2vw', color: '#00C2FF' }}>&lt;2 mo</div>
              <div className="font-body" style={{ fontSize: '0.95vw', color: '#7A8BA0', marginTop: '0.3vh' }}>Payback Period</div>
            </div>
          </div>
        </motion.div>

        {/* Projected ARR bars */}
        <div className="flex items-end" style={{ gap: '5vw', justifyContent: 'center', flex: 1, paddingBottom: '1.5vh' }}>
          {/* Year 1 */}
          <div className="flex flex-col items-center">
            <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.72)}
              className="font-display font-bold mb-[0.8vh]" style={{ fontSize: '1.6vw', color: '#F0F4FF' }}>$180K</motion.div>
            <motion.div
              initial={isExport ? { height: '5vh' } : { height: 0 }}
              animate={{ height: '5vh' }}
              transition={{ duration: 0.8, delay: 0.78, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: '8vw', background: 'linear-gradient(to top, #00C2FF, rgba(0,194,255,0.45))', borderRadius: '0.5vw 0.5vw 0 0' }} />
            <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.9)}
              className="font-body mt-[0.8vh] text-center" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Year 1<br/><span style={{ fontSize: '0.9vw', color: '#4A5568' }}>~150 paying users</span></motion.div>
          </div>
          {/* Year 2 */}
          <div className="flex flex-col items-center">
            <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.78)}
              className="font-display font-bold mb-[0.8vh]" style={{ fontSize: '1.6vw', color: '#F0F4FF' }}>$720K</motion.div>
            <motion.div
              initial={isExport ? { height: '19vh' } : { height: 0 }}
              animate={{ height: '19vh' }}
              transition={{ duration: 0.85, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: '8vw', background: 'linear-gradient(to top, #00C2FF, rgba(0,194,255,0.45))', borderRadius: '0.5vw 0.5vw 0 0' }} />
            <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.95)}
              className="font-body mt-[0.8vh] text-center" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Year 2<br/><span style={{ fontSize: '0.9vw', color: '#4A5568' }}>~600 paying users</span></motion.div>
          </div>
          {/* Year 3 */}
          <div className="flex flex-col items-center">
            <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.84)}
              className="font-display font-bold mb-[0.8vh]" style={{ fontSize: '1.6vw', color: '#F5A623' }}>$2.1M</motion.div>
            <motion.div
              initial={isExport ? { height: '28vh' } : { height: 0 }}
              animate={{ height: '28vh' }}
              transition={{ duration: 0.9, delay: 0.92, ease: [0.22, 1, 0.36, 1] }}
              style={{ width: '8vw', background: 'linear-gradient(to top, #F5A623, rgba(245,166,35,0.45))', borderRadius: '0.5vw 0.5vw 0 0' }} />
            <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 1.0)}
              className="font-body mt-[0.8vh] text-center" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Year 3<br/><span style={{ fontSize: '0.9vw', color: '#4A5568' }}>~1,750 paying users</span></motion.div>
          </div>
        </div>
      </div>

      <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 1.05)}
        className="absolute bottom-[1.5vh] right-[2vw] font-body" style={{ fontSize: '0.9vw', color: '#4A5568' }}>
        *Projections based on bottom-up user model. Gross margin assumes LLM API + infra costs.
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #F5A623 50%, transparent 100%)' }} />
    </div>
  );
}
