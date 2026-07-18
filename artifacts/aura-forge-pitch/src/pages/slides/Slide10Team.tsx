import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.7) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

const founders = [
  {
    name: 'George Samaras',
    title: 'CEO & Co-Founder',
    accent: '#00C2FF',
    rgb: '0,194,255',
    avatar: 'GS',
    tags: ['AI / ML', 'Dark Pino CEO', 'Systems Architecture'],
    bullets: [
      'CEO of Dark Pino — full ecosystem of Web3 AI tooling',
      'Deep expertise in large-scale AI/ML model pipelines',
      'Architect of AURA Forge multi-agent generation loop',
      'Vision: make smart contracts as easy as describing them',
    ],
  },
  {
    name: 'Harmain Mughal',
    title: 'Co-Founder',
    accent: '#9F58FA',
    rgb: '159,88,250',
    avatar: 'HM',
    tags: ['Blockchain', 'Smart Contracts', 'Product'],
    bullets: [
      'Deep hands-on experience in smart contract development',
      'Solana + EVM dual-chain implementation lead',
      'Drives product strategy and developer experience',
      'Built and tested AURA Forge with beta developers',
    ],
  },
];

export default function Slide10Team() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 55% at 50% 40%, rgba(0,194,255,0.06) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5vh 6vw 4vh' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, y: -15 }, { opacity: 1, y: 0 }, 0.1)} className="mb-[3vh]">
          <div className="flex items-center gap-[0.7vw] mb-[1vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#00C2FF', boxShadow: '0 0 8px rgba(0,194,255,0.6)' }} />
            <span className="font-body uppercase tracking-widest" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>The Team</span>
          </div>
          <div className="font-display font-bold" style={{ fontSize: '4.2vw', color: '#F0F4FF', letterSpacing: '-0.02em' }}>
            Built by people who've <span style={{ color: '#00C2FF' }}>lived the problem.</span>
          </div>
        </motion.div>

        {/* Founder cards */}
        <div className="flex flex-1" style={{ gap: '2.5vw', marginBottom: '2.5vh' }}>
          {founders.map((f, fi) => (
            <motion.div
              key={f.name}
              {...anim({ opacity: 0, y: 30 }, { opacity: 1, y: 0 }, 0.25 + fi * 0.15, 0.75)}
              className="flex flex-col rounded-[1.2vw] p-[3vh_2.5vw]"
              style={{ flex: 1, background: `rgba(${f.rgb},0.04)`, border: `1px solid rgba(${f.rgb},0.22)`, boxShadow: `0 8px 40px rgba(${f.rgb},0.08)` }}>

              {/* Top accent */}
              <div style={{ height: '2px', background: `linear-gradient(90deg, ${f.accent}, transparent)`, borderRadius: '2px', marginBottom: '2.5vh', boxShadow: `0 0 10px ${f.accent}66` }} />

              {/* Avatar + name */}
              <div className="flex items-center gap-[1.5vw] mb-[2vh]">
                <div className="flex items-center justify-center rounded-full font-display font-bold"
                  style={{ width: '5.5vw', height: '5.5vw', fontSize: '1.8vw', background: `linear-gradient(135deg, rgba(${f.rgb},0.25) 0%, rgba(${f.rgb},0.08) 100%)`, border: `1.5px solid rgba(${f.rgb},0.4)`, color: f.accent, boxShadow: `0 0 20px rgba(${f.rgb},0.2), inset 0 1px 0 rgba(${f.rgb},0.2)`, flexShrink: 0 }}>
                  {f.avatar}
                </div>
                <div>
                  <div className="font-display font-bold" style={{ fontSize: '1.9vw', color: '#F0F4FF', lineHeight: 1.1 }}>{f.name}</div>
                  <div className="font-body" style={{ fontSize: '1.1vw', color: f.accent, marginTop: '0.3vh' }}>{f.title}</div>
                </div>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-[0.5vw] mb-[2vh]">
                {f.tags.map(tag => (
                  <span key={tag} className="font-body rounded-full px-[0.9vw] py-[0.3vh]"
                    style={{ fontSize: '0.88vw', color: f.accent, background: `rgba(${f.rgb},0.1)`, border: `1px solid rgba(${f.rgb},0.25)` }}>
                    {tag}
                  </span>
                ))}
              </div>

              {/* Bullets */}
              <div className="flex flex-col" style={{ gap: '1vh' }}>
                {f.bullets.map((b, i) => (
                  <motion.div key={i} {...anim({ opacity: 0, x: -10 }, { opacity: 1, x: 0 }, 0.45 + fi * 0.15 + i * 0.07)}
                    className="flex items-start gap-[0.7vw]">
                    <div style={{ width: '0.4vw', height: '0.4vw', borderRadius: '50%', background: f.accent, flexShrink: 0, marginTop: '0.7vh', boxShadow: `0 0 5px ${f.accent}99` }} />
                    <span className="font-body" style={{ fontSize: '1.08vw', color: '#C8D4E8', lineHeight: 1.5 }}>{b}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Dark Pino Ecosystem context + Why us row */}
        <div className="flex" style={{ gap: '2vw' }}>
          {/* Dark Pino explanation */}
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.65)}
            className="flex-1 rounded-[0.9vw] p-[1.5vh_1.8vw]"
            style={{ background: 'rgba(245,166,35,0.04)', border: '1px solid rgba(245,166,35,0.2)' }}>
            <div className="flex items-center gap-[0.7vw] mb-[0.8vh]">
              <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#F5A623' }} />
              <span className="font-display font-semibold uppercase tracking-widest" style={{ fontSize: '0.95vw', color: '#F5A623' }}>Dark Pino Ecosystem</span>
            </div>
            <p className="font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0', lineHeight: 1.55 }}>
              Dark Pino is George's parent Web3 AI company — a growing suite of products spanning smart contract tooling,
              on-chain analytics, and developer infrastructure. AURA Forge is the flagship product and primary revenue driver.
              The ecosystem creates <span style={{ color: '#F5A623' }}>built-in distribution</span> across sister products from day one.
            </p>
          </motion.div>

          {/* Why us */}
          <motion.div {...anim({ opacity: 0, y: 15 }, { opacity: 1, y: 0 }, 0.75)}
            className="flex-1 rounded-[0.9vw] p-[1.5vh_1.8vw]"
            style={{ background: 'rgba(0,194,255,0.04)', border: '1px solid rgba(0,194,255,0.18)' }}>
            <div className="font-display font-semibold mb-[0.8vh]" style={{ fontSize: '0.95vw', color: '#00C2FF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Why This Team Wins</div>
            <div className="flex flex-col" style={{ gap: '0.55vh' }}>
              {[
                'AI/ML × Blockchain — rare combination at the intersection of both',
                'Existing ecosystem = no cold start, captive dev audience',
                'Product-first — shipped real contracts with real users already',
                'Operator mindset — 20 beta testers before asking for capital',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-[0.6vw] font-body" style={{ fontSize: '1.02vw', color: '#7A8BA0' }}>
                  <span style={{ color: '#00C2FF', flexShrink: 0 }}>→</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, #00C2FF 0%, #9F58FA 50%, transparent 100%)', boxShadow: '0 0 10px rgba(0,194,255,0.3)' }} />
    </div>
  );
}
