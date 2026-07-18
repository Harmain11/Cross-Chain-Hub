import { motion } from 'framer-motion';
import { useTilt } from '../../hooks/useTilt';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

// SVG chart: viewBox 0 0 520 210
// X: 0–36 months → 18 to 502 (range 484)
// Y: 0–2300K → 195 to 10 (range 185, inverted)
// Points: [month, $K]
const pts: [number, number][] = [
  [0,0],[3,12],[6,45],[9,130],[12,180],
  [15,250],[18,390],[21,560],[24,720],
  [27,1050],[30,1520],[33,1880],[36,2100],
];

function toPx([m, v]: [number, number]): [number, number] {
  return [18 + (m / 36) * 484, 195 - (v / 2200) * 185];
}

const pxPts = pts.map(toPx);

// Smooth cubic bezier path
function buildPath(points: [number, number][]): string {
  const d: string[] = [`M ${points[0][0]},${points[0][1]}`];
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [cx2, cy2] = points[i];
    const cpx1 = px + (cx2 - px) * 0.55;
    const cpy1 = py;
    const cpx2 = cx2 - (cx2 - px) * 0.55;
    const cpy2 = cy2;
    d.push(`C ${cpx1},${cpy1} ${cpx2},${cpy2} ${cx2},${cy2}`);
  }
  return d.join(' ');
}

const linePath = buildPath(pxPts);
const last = pxPts[pxPts.length - 1];
const areaPath = `${linePath} L ${last[0]},195 L ${pxPts[0][0]},195 Z`;

// Milestone dots: Y1 (idx 4), Y2 (idx 8), Y3 (idx 12)
const milestones = [
  { pt: pxPts[4],  label: 'Year 1', value: '$180K', color: '#00C2FF' },
  { pt: pxPts[8],  label: 'Year 2', value: '$720K', color: '#00C2FF' },
  { pt: pxPts[12], label: 'Year 3', value: '$2.1M', color: '#F5A623' },
];

function RevenueCard({ label, price, desc, color, delay }: { label: string; price: string; desc: string; color: string; delay: number }) {
  const tilt = useTilt(6);
  return (
    <motion.div {...anim({ opacity: 0, y: 20, rotateX: -30 }, { opacity: 1, y: 0, rotateX: 0 }, delay)}
      ref={tilt.ref}
      onMouseMove={tilt.onMouseMove}
      onMouseLeave={tilt.onMouseLeave}
      className="rounded-[0.9vw] p-[1.6vh_1.6vw]"
      style={{ background: `rgba(${color},0.06)`, border: `1px solid rgba(${color},0.22)`, boxShadow: `0 4px 20px rgba(${color},0.07)`, transformStyle: 'preserve-3d' }}>
      <div className="font-display font-bold mb-[0.4vh]" style={{ fontSize: '1.25vw', color: `rgb(${color})` }}>{label}</div>
      <div className="font-display font-semibold mb-[0.6vh]" style={{ fontSize: '2.4vw', color: '#F0F4FF' }}>{price}</div>
      <div className="font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0', lineHeight: 1.5 }}>{desc}</div>
    </motion.div>
  );
}

export default function Slide06Revenue() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 55% 40% at 50% 30%, rgba(245,166,35,0.07) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '4.5vh 6vw 3.5vh' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, y: -15 }, { opacity: 1, y: 0 }, 0.1)} className="mb-[2vh]">
          <div className="flex items-center gap-[0.7vw] mb-[0.9vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#F5A623', boxShadow: '0 0 8px rgba(245,166,35,0.6)' }} />
            <span className="font-body uppercase tracking-widest" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Business Model</span>
          </div>
          <div className="font-display font-bold" style={{ fontSize: '4vw', color: '#F0F4FF', letterSpacing: '-0.02em' }}>
            Three revenue streams. <span style={{ color: '#F5A623' }}>One compounding moat.</span>
          </div>
        </motion.div>

        {/* Revenue cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1vh 1.8vw', marginBottom: '2vh' }}>
          <RevenueCard label="API Per-Job" price="$5–$25" desc="Pay-as-you-go per contract. Zero friction — works from the first API call." color="0,194,255" delay={0.22} />
          <RevenueCard label="Pro Subscription" price="$99/mo" desc="Higher limits, Solana, team seats. Free tier drives top-of-funnel with zero CAC." color="245,166,35" delay={0.34} />
          <RevenueCard label="Ecosystem Toll" price="Per Call" desc="Internal API fee for Dark Pino sub-projects. Scales with the ecosystem." color="0,194,255" delay={0.46} />
        </div>

        {/* Unit economics */}
        <motion.div {...anim({ opacity: 0, y: 12 }, { opacity: 1, y: 0 }, 0.55)}
          className="rounded-[0.8vw] p-[1.2vh_1.8vw] mb-[2vh]"
          style={{ background: 'rgba(0,194,255,0.03)', border: '1px solid rgba(0,194,255,0.15)' }}>
          <div className="font-display font-semibold mb-[0.9vh]" style={{ fontSize: '1vw', color: '#7A8BA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Unit Economics</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)' }}>
            {[
              { v: '~$12',   l: 'CAC (API-led)',      c: '#00C2FF' },
              { v: '$24/mo', l: 'Avg Rev/User',        c: '#00C2FF' },
              { v: '28×',    l: 'LTV : CAC',           c: '#F5A623' },
              { v: '~85%',   l: 'Gross Margin',        c: '#00C2FF' },
              { v: '<2 mo',  l: 'CAC Payback',         c: '#00C2FF' },
            ].map(({ v, l, c }) => (
              <div key={l} className="text-center">
                <div className="font-display font-bold" style={{ fontSize: '1.9vw', color: c }}>{v}</div>
                <div className="font-body" style={{ fontSize: '0.9vw', color: '#7A8BA0', marginTop: '0.2vh' }}>{l}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Beautiful area line chart */}
        <motion.div {...anim({ opacity: 0, y: 18 }, { opacity: 1, y: 0 }, 0.62)} className="flex-1 flex flex-col min-h-0" style={{ minHeight: '18vh' }}>
          <div className="font-display font-semibold mb-[1vh]" style={{ fontSize: '1.05vw', color: '#7A8BA0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Projected ARR — 36 Month View
          </div>

          <div className="flex-1 relative min-h-0">
            <svg viewBox="0 0 520 210" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                {/* Area gradient */}
                <linearGradient id="areaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%"   stopColor="#00C2FF" stopOpacity="0.35" />
                  <stop offset="55%"  stopColor="#00C2FF" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#00C2FF" stopOpacity="0" />
                </linearGradient>
                {/* Line gradient */}
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#00C2FF" />
                  <stop offset="65%"  stopColor="#00C2FF" />
                  <stop offset="100%" stopColor="#F5A623" />
                </linearGradient>
                {/* Gold glow for Y3 dot */}
                <filter id="dotGlow" x="-100%" y="-100%" width="300%" height="300%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Subtle grid lines */}
              {[0.25, 0.5, 0.75, 1.0].map(frac => {
                const y = 195 - frac * 185;
                return (
                  <g key={frac}>
                    <line x1="18" y1={y} x2="502" y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                    <text x="10" y={y + 4} textAnchor="end" fill="#4A5568" fontFamily="DM Sans,sans-serif" fontSize="9">
                      ${Math.round(2200 * frac / 1000)}M
                    </text>
                  </g>
                );
              })}

              {/* Year dividers */}
              {[12, 24].map(m => {
                const x = 18 + (m / 36) * 484;
                return (
                  <line key={m} x1={x} y1="10" x2={x} y2="195" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
                );
              })}

              {/* Baseline */}
              <line x1="18" y1="195" x2="502" y2="195" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

              {/* Area fill */}
              <motion.path
                d={areaPath}
                fill="url(#areaGrad)"
                {...(isExport
                  ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
                  : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5, delay: 0.9 } }
                )}
              />

              {/* Line */}
              <motion.path
                d={linePath}
                fill="none"
                stroke="url(#lineGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                {...(isExport
                  ? { initial: { pathLength: 1, opacity: 1 }, animate: { pathLength: 1, opacity: 1 } }
                  : { initial: { pathLength: 0, opacity: 0 }, animate: { pathLength: 1, opacity: 1 }, transition: { pathLength: { duration: 1.8, delay: 0.7, ease: 'easeOut' }, opacity: { duration: 0.3, delay: 0.7 } } }
                )}
              />

              {/* Milestone dots + labels */}
              {milestones.map(({ pt, label, value, color }, i) => (
                <motion.g key={label}
                  {...(isExport
                    ? { initial: { opacity: 1, scale: 1 }, animate: { opacity: 1, scale: 1 } }
                    : { initial: { opacity: 0, scale: 0 }, animate: { opacity: 1, scale: 1 }, transition: { duration: 0.4, delay: 1.8 + i * 0.15, type: 'spring' } }
                  )}>
                  {/* Outer ring */}
                  <circle cx={pt[0]} cy={pt[1]} r="8" fill="none" stroke={color} strokeWidth="1.5" opacity="0.5" filter="url(#dotGlow)" />
                  {/* Inner dot */}
                  <circle cx={pt[0]} cy={pt[1]} r="4.5" fill={color} filter="url(#dotGlow)" />
                  {/* Value label */}
                  <text x={pt[0]} y={pt[1] - 14} textAnchor="middle" fill={color}
                    fontFamily="Space Grotesk,sans-serif" fontSize="12" fontWeight="700">{value}</text>
                  {/* Year label */}
                  <text x={pt[0]} y="208" textAnchor="middle" fill="#7A8BA0"
                    fontFamily="DM Sans,sans-serif" fontSize="10">{label}</text>
                </motion.g>
              ))}

              {/* Start dot */}
              <circle cx={pxPts[0][0]} cy={pxPts[0][1]} r="3" fill="#00C2FF" opacity="0.5" />
            </svg>
          </div>
        </motion.div>
      </div>

      <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 1.2)}
        className="absolute bottom-[1.5vh] right-[2vw] font-body" style={{ fontSize: '0.88vw', color: '#4A5568' }}>
        *Projections based on bottom-up user model · ~85% gross margin assumed
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #F5A623 50%, transparent 100%)', boxShadow: '0 0 10px rgba(245,166,35,0.3)' }} />
    </div>
  );
}
