import { motion } from 'framer-motion';

const isExport = typeof window !== 'undefined' && window.location.pathname.toLowerCase().includes('allslides');

function anim(initial: object, animate: object, delay = 0, duration = 0.65) {
  if (isExport) return { initial: animate, animate };
  return { initial, animate, transition: { duration, delay, ease: [0.22, 1, 0.36, 1] } };
}

const CHECK = () => (
  <div className="flex items-center justify-center w-full">
    <div style={{ width: '1.4vw', height: '1.4vw', borderRadius: '50%', background: 'rgba(0,194,255,0.15)', border: '1.5px solid #00C2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="0.8vw" height="0.8vw" viewBox="0 0 12 9" fill="none" style={{ width: '0.8vw', height: '0.8vw' }}>
        <path d="M1 4.5L4.5 8L11 1" stroke="#00C2FF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  </div>
);

const CROSS = () => (
  <div className="flex items-center justify-center w-full">
    <div style={{ width: '1.4vw', height: '1.4vw', borderRadius: '50%', background: 'rgba(255,75,75,0.08)', border: '1.5px solid rgba(255,75,75,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="0.8vw" height="0.8vw" viewBox="0 0 10 10" fill="none" style={{ width: '0.8vw', height: '0.8vw' }}>
        <path d="M1 1L9 9M9 1L1 9" stroke="rgba(255,75,75,0.7)" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </div>
  </div>
);

const PARTIAL = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center w-full">
    <span className="font-body" style={{ fontSize: '1vw', color: '#F5A623' }}>{label}</span>
  </div>
);

// Column header cell
function ColHead({ label, isUs }: { label: string; isUs?: boolean }) {
  return (
    <div className="flex items-center justify-center text-center px-[0.4vw]"
      style={{ borderBottom: isUs ? '2px solid #00C2FF' : '1px solid rgba(255,255,255,0.07)', paddingBottom: '1.2vh', paddingTop: '0.4vh' }}>
      <span className="font-display font-semibold" style={{ fontSize: isUs ? '1.15vw' : '1vw', color: isUs ? '#00C2FF' : '#7A8BA0', lineHeight: 1.2 }}>{label}</span>
    </div>
  );
}

// Row label
function RowLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center" style={{ paddingRight: '1.5vw' }}>
      <span className="font-body" style={{ fontSize: '1.05vw', color: '#7A8BA0', whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

// Table cell wrapper
function Cell({ children, isUs, isLast }: { children: React.ReactNode; isUs?: boolean; isLast?: boolean }) {
  return (
    <div className="flex items-center justify-center"
      style={{
        background: isUs ? 'rgba(0,194,255,0.05)' : 'transparent',
        borderLeft: isUs ? '1px solid rgba(0,194,255,0.15)' : 'none',
        borderRight: isUs && isLast ? '1px solid rgba(0,194,255,0.15)' : 'none',
        paddingTop: '1.1vh', paddingBottom: '1.1vh',
      }}>
      {children}
    </div>
  );
}

export default function Slide07Competitive() {
  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ background: '#07090F' }}>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 50% 40% at 50% 30%, rgba(0,194,255,0.05) 0%, transparent 70%)' }} />

      <div className="absolute inset-0 flex flex-col" style={{ padding: '5vh 5.5vw 4.5vh' }}>
        {/* Header */}
        <motion.div {...anim({ opacity: 0, y: -15 }, { opacity: 1, y: 0 }, 0.1)} className="mb-[3vh]">
          <div className="flex items-center gap-[0.7vw] mb-[1vh]">
            <div className="w-[3vw] h-[0.25vh]" style={{ background: '#00C2FF' }} />
            <span className="font-body uppercase tracking-widest" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>Competitive Landscape</span>
          </div>
          <div className="font-display font-bold" style={{ fontSize: '4vw', color: '#F0F4FF', letterSpacing: '-0.02em' }}>
            Nothing else does <span style={{ color: '#00C2FF' }}>all of this.</span>
          </div>
        </motion.div>

        {/* Comparison table */}
        <motion.div {...anim({ opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.25, 0.7)} className="flex-1">
          {/* Grid: 7 columns (label + 5 products + padding) */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '13vw repeat(5, 1fr)',
            rowGap: 0,
          }}>
            {/* Header row */}
            <div /> {/* empty label cell */}
            <ColHead label="AURA Forge" isUs />
            <ColHead label="GitHub Copilot" />
            <ColHead label="ChatGPT / LLMs" />
            <ColHead label="Manual Auditors" />
            <ColHead label="Slither / Mythril" />

            {/* Row separator */}
            <div style={{ gridColumn: '1 / -1', height: '0.8vh' }} />

            {/* Row 1 — AI Code Generation */}
            <RowLabel label="AI Code Generation" />
            <Cell isUs><CHECK /></Cell>
            <Cell><CHECK /></Cell>
            <Cell><CHECK /></Cell>
            <Cell><CROSS /></Cell>
            <Cell isLast><CROSS /></Cell>

            <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.6vh 0' }} />

            {/* Row 2 — Real Compilation */}
            <RowLabel label="Real Compilation" />
            <Cell isUs><CHECK /></Cell>
            <Cell><CROSS /></Cell>
            <Cell><CROSS /></Cell>
            <Cell><CROSS /></Cell>
            <Cell isLast><CROSS /></Cell>

            <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.6vh 0' }} />

            {/* Row 3 — Security Audit */}
            <RowLabel label="Security Audit" />
            <Cell isUs><CHECK /></Cell>
            <Cell><CROSS /></Cell>
            <Cell><CROSS /></Cell>
            <Cell><CHECK /></Cell>
            <Cell isLast><PARTIAL label="Partial" /></Cell>

            <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.6vh 0' }} />

            {/* Row 4 — Auto Remediation */}
            <RowLabel label="Auto Remediation" />
            <Cell isUs><CHECK /></Cell>
            <Cell><CROSS /></Cell>
            <Cell><CROSS /></Cell>
            <Cell><CROSS /></Cell>
            <Cell isLast><CROSS /></Cell>

            <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.6vh 0' }} />

            {/* Row 5 — EVM + Solana */}
            <RowLabel label="EVM + Solana Native" />
            <Cell isUs><CHECK /></Cell>
            <Cell><CROSS /></Cell>
            <Cell><CROSS /></Cell>
            <Cell><PARTIAL label="One chain" /></Cell>
            <Cell isLast><PARTIAL label="EVM only" /></Cell>

            <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.6vh 0' }} />

            {/* Row 6 — One-Click Deploy */}
            <RowLabel label="One-Click Deploy" />
            <Cell isUs><CHECK /></Cell>
            <Cell><CROSS /></Cell>
            <Cell><CROSS /></Cell>
            <Cell><CROSS /></Cell>
            <Cell isLast><CROSS /></Cell>

            <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.6vh 0' }} />

            {/* Row 7 — Time to result */}
            <RowLabel label="Time to Result" />
            <Cell isUs><PARTIAL label="~10 min" /></Cell>
            <Cell><PARTIAL label="N/A" /></Cell>
            <Cell><PARTIAL label="N/A" /></Cell>
            <Cell><PARTIAL label="4–8 wks" /></Cell>
            <Cell isLast><PARTIAL label="Hours" /></Cell>

            <div style={{ gridColumn: '1 / -1', height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0.6vh 0' }} />

            {/* Row 8 — Cost */}
            <RowLabel label="Cost" />
            <Cell isUs><PARTIAL label="$5–$25/job" /></Cell>
            <Cell><PARTIAL label="Free–$19/mo" /></Cell>
            <Cell><PARTIAL label="Free–$20/mo" /></Cell>
            <Cell><PARTIAL label="$20K–$150K" /></Cell>
            <Cell isLast><PARTIAL label="Free / DIY" /></Cell>
          </div>
        </motion.div>

        {/* Bottom note */}
        <motion.div {...anim({ opacity: 0 }, { opacity: 1 }, 0.7)}
          className="flex items-center gap-[0.8vw] mt-[2.5vh]">
          <div style={{ width: '0.5vw', height: '0.5vw', borderRadius: '50%', background: '#00C2FF', flexShrink: 0 }} />
          <span className="font-body" style={{ fontSize: '1.1vw', color: '#7A8BA0' }}>
            AURA Forge is the only solution that covers the full lifecycle — generation, compilation, audit, remediation, and deployment — across both major chains.
          </span>
        </motion.div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[0.3vh]"
        style={{ background: 'linear-gradient(90deg, transparent 0%, #00C2FF 50%, transparent 100%)' }} />
    </div>
  );
}
