import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

function KpiCard({ value, label, sub, delay, accent = '#00C2FF' }: { value: string; label: string; sub: string; delay: number; accent?: string }) {
  return (
    <motion.div {...anim({ opacity: 0, y: 25 }, { opacity: 1, y: 0 }, delay)}
      className="flex flex-col justify-between rounded-[0.9vw] p-[2vh_1.8vw]"
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${accent}30`, flex: 1 }}>
      <div className="font-display font-bold" style={{ fontSize: '3.8vw', color: accent, lineHeight: 1, letterSpacing: '-0.02em' }}>
        {value}
      </div>
      <div>
        <div className="font-display font-semibold mt-[1vh]" style={{ fontSize: '1.2vw', color: '#F0F4FF', lineHeight: 1.2 }}>{label}</div>
        <div className="font-body mt-[0.4vh]" style={{ fontSize: '0.95vw', color: '#7A8BA0', lineHeight: 1.4 }}>{sub}</div>
      </div>
    </motion.div>
  );
}

export default function Slide08Traction() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 40% at 50% 35%, rgba(0,194,255,0.06) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5vh 5.5vw 4.5vh' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, y: -15 }, { opacity: 1, y: 0 }, 0.1)} className="mb-[2.5vh]">
          <div className="flex items-center gap-[0.7vw] mb-[1vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#00C2FF' }} />
            <span className="font-body uppercase tracking-widest text-muted" style={{ fontSize: '1.1vw' }}>Traction</span>
          </div>
          <div className="font-display font-bold" style={{ fontSize: '4.2vw', color: '#F0F4FF', letterSpacing: '-0.02em' }}>
            Built. Tested. <span style={{ color: '#00C2FF' }}>People are using it.</span>
          </div>
        </motion.div>

        {/* KPI metric cards — top row */}
        <div className="flex" style={{ gap: '1.5vw', marginBottom: '2.2vh' }}>
          <KpiCard value="1,200+" label="Contracts Generated" sub="In private beta — EVM and Solana" delay={0.22} accent="#00C2FF" />
          <KpiCard value="847" label="Developer Waitlist" sub="Organic signups, zero paid acquisition" delay={0.32} accent="#00C2FF" />
          <KpiCard value="94%" label="Compile Success Rate" sub="After autonomous self-healing loop" delay={0.42} accent="#F5A623" />
          <KpiCard value="3" label="Enterprise LOIs" sub="DeFi protocols in active discussions" delay={0.52} accent="#00C2FF" />
        </div>

        {/* Second row — live proof strip */}
        <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.6)}
          className="rounded-[0.8vw] p-[1.4vh_1.8vw] mb-[2.2vh]"
          style={{ background: 'rgba(0,194,255,0.04)', border: '1px solid rgba(0,194,255,0.15)' }}>
          <div className="font-display font-semibold mb-[1.2vh]" style={{ fontSize: '1.1vw', color: '#7A8BA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            What's Live Today
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8vh 2vw' }}>
            {[
              'EVM + Solana generation, compile, audit & deploy',
              '47-pattern security audit with 0–100 scoring',
              'Self-healing compile loop (avg 1.3 retries to success)',
              'Context-aware hardening Q&A with the user',
              'Foundry + Anchor/TypeScript test suite generation',
              'REST API + team workspaces — embed anywhere',
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-[0.7vw]">
                <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#00C2FF', flexShrink: 0 }} />
                <span className="font-body" style={{ fontSize: '1.05vw', color: '#F0F4FF' }}>{item}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Roadmap — compact horizontal */}
        <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.72)}>
          <div className="font-display font-semibold mb-[1.8vh]" style={{ fontSize: '1.1vw', color: '#7A8BA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Roadmap</div>

          <div className="relative" style={{ height: '9vh' }}>
            <div className="absolute" style={{ left: 0, right: 0, top: '2.8vh', height: '2px', background: 'linear-gradient(90deg, #00C2FF 30%, rgba(0,194,255,0.2) 100%)' }} />

            {/* NOW */}
            <div className="absolute flex flex-col items-center" style={{ left: '2%' }}>
              <div style={{ width: '1.4vw', height: '1.4vw', borderRadius: '50%', background: '#00C2FF', boxShadow: '0 0 14px rgba(0,194,255,0.8)', marginBottom: '0.8vh' }} />
              <div style={{ width: '2px', height: '1.8vh', background: '#00C2FF' }} />
              <div className="font-display font-bold text-center" style={{ fontSize: '1.05vw', color: '#00C2FF', marginTop: '0.5vh' }}>Now</div>
              <div className="font-body text-center" style={{ fontSize: '0.9vw', color: '#7A8BA0' }}>Beta live</div>
            </div>

            {/* Q3 2026 */}
            <div className="absolute flex flex-col items-center" style={{ left: '25%' }}>
              <div style={{ width: '1.1vw', height: '1.1vw', borderRadius: '50%', background: 'rgba(0,194,255,0.3)', border: '2px solid rgba(0,194,255,0.5)', marginBottom: '0.8vh' }} />
              <div style={{ width: '2px', height: '1.8vh', background: 'rgba(0,194,255,0.4)' }} />
              <div className="font-display font-semibold text-center" style={{ fontSize: '1.05vw', color: '#F0F4FF', marginTop: '0.5vh' }}>Q3 2026</div>
              <div className="font-body text-center" style={{ fontSize: '0.9vw', color: '#7A8BA0' }}>Mainnet deploy</div>
            </div>

            {/* Q4 2026 */}
            <div className="absolute flex flex-col items-center" style={{ left: '50%', transform: 'translateX(-50%)' }}>
              <div style={{ width: '1.1vw', height: '1.1vw', borderRadius: '50%', background: 'rgba(0,194,255,0.2)', border: '2px solid rgba(0,194,255,0.35)', marginBottom: '0.8vh' }} />
              <div style={{ width: '2px', height: '1.8vh', background: 'rgba(0,194,255,0.3)' }} />
              <div className="font-display font-semibold text-center" style={{ fontSize: '1.05vw', color: '#F0F4FF', marginTop: '0.5vh' }}>Q4 2026</div>
              <div className="font-body text-center" style={{ fontSize: '0.9vw', color: '#7A8BA0' }}>On-chain monitoring</div>
            </div>

            {/* Q1 2027 */}
            <div className="absolute flex flex-col items-center" style={{ left: '74%' }}>
              <div style={{ width: '1.1vw', height: '1.1vw', borderRadius: '50%', background: 'rgba(245,166,35,0.2)', border: '2px solid rgba(245,166,35,0.4)', marginBottom: '0.8vh' }} />
              <div style={{ width: '2px', height: '1.8vh', background: 'rgba(245,166,35,0.3)' }} />
              <div className="font-display font-semibold text-center" style={{ fontSize: '1.05vw', color: '#F0F4FF', marginTop: '0.5vh' }}>Q1 2027</div>
              <div className="font-body text-center" style={{ fontSize: '0.9vw', color: '#7A8BA0' }}>Template marketplace</div>
            </div>

            {/* Q2 2027 */}
            <div className="absolute flex flex-col items-center" style={{ right: '2%' }}>
              <div style={{ width: '1.1vw', height: '1.1vw', borderRadius: '50%', background: 'rgba(245,166,35,0.15)', border: '2px solid rgba(245,166,35,0.3)', marginBottom: '0.8vh' }} />
              <div style={{ width: '2px', height: '1.8vh', background: 'rgba(245,166,35,0.25)' }} />
              <div className="font-display font-semibold text-center" style={{ fontSize: '1.05vw', color: '#F0F4FF', marginTop: '0.5vh' }}>Q2 2027</div>
              <div className="font-body text-center" style={{ fontSize: '0.9vw', color: '#7A8BA0' }}>Enterprise SLA</div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 50%, transparent 100%)' }} />
    </div>
  );
}
