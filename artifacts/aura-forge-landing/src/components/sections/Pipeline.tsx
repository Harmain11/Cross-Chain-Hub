import { motion } from 'framer-motion';
import { Bot, Cpu, ShieldAlert, ShieldCheck, CheckCircle2 } from 'lucide-react';

const steps = [
  {
    id: 'generating',
    title: 'Generating',
    description: 'AI translates English requirements to optimized smart contract code.',
    icon: Bot,
    color: 'text-blue-400',
    borderColor: 'border-blue-400/30',
    bg: 'bg-blue-400/10'
  },
  {
    id: 'compiling',
    title: 'Compiling',
    description: 'Validates syntax, checks dependencies, and compiles bytecode.',
    icon: Cpu,
    color: 'text-purple-400',
    borderColor: 'border-purple-400/30',
    bg: 'bg-purple-400/10'
  },
  {
    id: 'auditing',
    title: 'Auditing',
    description: 'Static analysis for reentrancy, access control, and overflows.',
    icon: ShieldAlert,
    color: 'text-yellow-400',
    borderColor: 'border-yellow-400/30',
    bg: 'bg-yellow-400/10'
  },
  {
    id: 'hardening',
    title: 'Hardening',
    description: 'Iteratively rewrites vulnerabilities until score hits threshold.',
    icon: ShieldCheck,
    color: 'text-primary',
    borderColor: 'border-primary/30',
    bg: 'bg-primary/10'
  },
  {
    id: 'done',
    title: 'Done',
    description: 'Returns source, ABI, bytecode, and gas estimates.',
    icon: CheckCircle2,
    color: 'text-green-400',
    borderColor: 'border-green-400/30',
    bg: 'bg-green-400/10'
  }
];

export default function Pipeline() {
  return (
    <section id="pipeline" className="py-24 md:py-32 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">The Forge Pipeline</h2>
          <p className="text-lg text-muted-foreground">
            A continuous loop of generation, auditing, and hardening. We don't just write code — we battle-test it before it ever reaches your terminal.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Connecting Line */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-border -translate-y-1/2 hidden md:block" />
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 md:gap-4 relative z-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: i * 0.15 }}
                className="relative flex flex-col items-center text-center group"
              >
                <div className={`w-16 h-16 rounded-2xl border ${step.borderColor} ${step.bg} flex items-center justify-center mb-6 relative overflow-hidden transition-all duration-300 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)]`}>
                  <step.icon className={`w-8 h-8 ${step.color} relative z-10`} />
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <h3 className="text-lg font-mono font-bold text-white mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
                
                {/* Mobile connecting line */}
                {i < steps.length - 1 && (
                  <div className="w-px h-8 bg-border my-4 md:hidden" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
