import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { Check } from 'lucide-react';

export default function Pricing() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-32 pb-24 px-6 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container mx-auto max-w-6xl relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-mono font-bold text-white mb-6 tracking-tight">
              Simple, transparent pricing.
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start building secure contracts for free. Upgrade when you need more power and volume.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
            {/* Starter */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 flex flex-col"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-mono font-bold text-white mb-2">Starter</h3>
                <div className="text-4xl font-mono font-bold text-white mb-2">Free</div>
                <p className="text-sm text-muted-foreground">Perfect for hackathons and prototyping.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['10 contracts/month', 'EVM + Solana support', 'Security audit + score', 'Community support'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a 
                href="/aura-forge/"
                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded font-mono text-sm text-white text-center transition-colors"
              >
                Get Started
              </a>
            </motion.div>

            {/* Pro */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-primary/50 shadow-[0_0_30px_rgba(0,240,255,0.1)] rounded-2xl p-8 flex flex-col relative"
            >
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-black font-mono text-xs font-bold px-3 py-1 rounded-full">
                MOST POPULAR
              </div>
              <div className="mb-8">
                <h3 className="text-2xl font-mono font-bold text-primary mb-2">Pro</h3>
                <div className="flex items-end gap-1 mb-2">
                  <div className="text-4xl font-mono font-bold text-white">$49</div>
                  <div className="text-muted-foreground mb-1">/mo</div>
                </div>
                <p className="text-sm text-muted-foreground">For serious developers and independent auditors.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['100 contracts/month', 'Everything in Starter', 'CLI + MCP access', 'Priority hardening', 'Gas optimization report', 'Email support'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a 
                href="/aura-forge/"
                className="w-full py-3 px-4 bg-primary hover:bg-primary/90 rounded font-mono text-sm text-black font-bold text-center transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              >
                Upgrade to Pro
              </a>
            </motion.div>

            {/* Enterprise */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-card/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 flex flex-col"
            >
              <div className="mb-8">
                <h3 className="text-2xl font-mono font-bold text-white mb-2">Enterprise</h3>
                <div className="text-4xl font-mono font-bold text-white mb-2">Custom</div>
                <p className="text-sm text-muted-foreground">For teams, protocols, and security firms.</p>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {['Unlimited contracts', 'Everything in Pro', 'Custom model fine-tuning', 'SLA guarantee', 'Dedicated Slack channel', 'SSO / team workspaces'].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground">
                    <Check className="w-5 h-5 text-primary shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
              <a 
                href="mailto:invest@auraforge.io"
                className="w-full py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded font-mono text-sm text-white text-center transition-colors"
              >
                Contact Sales
              </a>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto"
          >
            <h2 className="text-2xl font-mono font-bold text-white mb-8 text-center">Frequently Asked Questions</h2>
            <div className="space-y-6">
              <div className="bg-card/30 border border-white/5 p-6 rounded-lg">
                <h4 className="font-mono text-white mb-2">What counts as one "contract"?</h4>
                <p className="text-sm text-muted-foreground">A contract generation counts as one run through the pipeline. If a prompt generates a system of 3 interconnected files, it still counts as 1 contract generation against your quota.</p>
              </div>
              <div className="bg-card/30 border border-white/5 p-6 rounded-lg">
                <h4 className="font-mono text-white mb-2">Can I upgrade or downgrade anytime?</h4>
                <p className="text-sm text-muted-foreground">Yes. Upgrades are prorated immediately. Downgrades take effect at the start of your next billing cycle.</p>
              </div>
              <div className="bg-card/30 border border-white/5 p-6 rounded-lg">
                <h4 className="font-mono text-white mb-2">Do you offer refunds?</h4>
                <p className="text-sm text-muted-foreground">If you are not satisfied with the Pro tier within your first 14 days, contact support for a full refund, no questions asked.</p>
              </div>
              <div className="bg-card/30 border border-white/5 p-6 rounded-lg">
                <h4 className="font-mono text-white mb-2">How do Enterprise custom models work?</h4>
                <p className="text-sm text-muted-foreground">We fine-tune an isolated generation model on your proprietary smart contracts and coding guidelines, ensuring outputs match your exact standard and style.</p>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}