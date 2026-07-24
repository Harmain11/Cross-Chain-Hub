import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { ShieldAlert, Fingerprint, Activity, Lock } from 'lucide-react';

export default function Security() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-32 pb-24 px-6 relative">
        <div className="container mx-auto max-w-4xl relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-mono font-bold text-white mb-6 tracking-tight flex items-center gap-4">
              <ShieldAlert className="w-12 h-12 text-primary" />
              Security First
            </h1>
            <p className="text-lg text-muted-foreground">
              AURA Forge is built to output robust code. But smart contract security requires transparency. Here is exactly how our pipeline works, what we check, and what we don't.
            </p>
          </motion.div>

          <div className="space-y-16">
            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-mono font-bold text-white mb-6 border-b border-white/10 pb-2 flex items-center gap-3">
                <Activity className="w-6 h-6 text-primary" />
                Our Audit Pipeline
              </h2>
              <p className="text-muted-foreground mb-4">
                Every generated contract undergoes a multi-pass audit using deterministic tools and an adversarial LLM agent looking for:
              </p>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  'Reentrancy Attacks',
                  'Integer Overflow/Underflow',
                  'Access Control Violations',
                  'Front-running Vectors',
                  'Flash Loan Vulnerabilities',
                  'Unchecked External Calls',
                  'Timestamp Dependence',
                  'Denial of Service (DoS)'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 bg-card p-4 rounded border border-white/5 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-mono font-bold text-white mb-6 border-b border-white/10 pb-2 flex items-center gap-3">
                <Activity className="w-6 h-6 text-primary" />
                Security Score Methodology
              </h2>
              <p className="text-muted-foreground mb-4">
                Contracts receive a score from 0 to 100. The score is calculated based on:
              </p>
              <div className="space-y-4 text-muted-foreground">
                <p><strong>Deductions:</strong> High-severity vectors subtract 30-50 points. Medium severity subtract 10-20. Missing best practices (like emitting events on state changes) subtract 1-5 points.</p>
                <p><strong>Hardening:</strong> If the initial score is below 90, the system iteratively patches the code until the score improves. You can review the exact lineage of changes in the dashboard.</p>
              </div>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-mono font-bold text-destructive mb-6 border-b border-white/10 pb-2">
                What We Don't Guarantee
              </h2>
              <p className="text-muted-foreground mb-4">
                We are building tools, not silver bullets. AURA Forge <strong>does not guarantee</strong> that a contract is 100% exploit-free.
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                <li>We cannot predict novel attack vectors that have never been seen before.</li>
                <li>Complex multi-contract protocol interactions may hide logic flaws invisible in isolated unit tests.</li>
                <li>There is an inherent tradeoff between extreme gas optimization and security. We default to security, but manual review is always required.</li>
                <li><strong>Always do a human audit before deploying to mainnet.</strong></li>
              </ul>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-mono font-bold text-white mb-6 border-b border-white/10 pb-2 flex items-center gap-3">
                <Lock className="w-6 h-6 text-primary" />
                Your Data
              </h2>
              <div className="bg-card p-6 rounded-lg border border-white/5 text-muted-foreground space-y-4">
                <p>We treat your code and prompts as confidential.</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Contracts are stored encrypted at rest.</li>
                  <li>We never share your proprietary logic with third parties.</li>
                  <li>Enterprise customers are isolated in single-tenant models.</li>
                  <li>You can delete your account and all associated data at any time from the Web App settings.</li>
                </ul>
              </div>
            </motion.section>

            <motion.section 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl font-mono font-bold text-white mb-6 border-b border-white/10 pb-2 flex items-center gap-3">
                <Fingerprint className="w-6 h-6 text-primary" />
                Responsible Disclosure
              </h2>
              <p className="text-muted-foreground mb-4">
                If you find a security issue in AURA Forge itself (the web app, CLI, MCP, or the generation pipeline), please email us immediately at <a href="mailto:invest@auraforge.io" className="text-primary hover:underline">invest@auraforge.io</a>.
              </p>
              <p className="text-muted-foreground">
                We follow a standard 90-day disclosure timeline. Please do not discuss vulnerabilities in public forums until we have had a chance to patch them.
              </p>
            </motion.section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}