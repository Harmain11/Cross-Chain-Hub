import { motion } from 'framer-motion';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function Privacy() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-32 pb-24 px-6 relative">
        <div className="container mx-auto max-w-3xl relative z-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12"
          >
            <h1 className="text-4xl font-mono font-bold text-white mb-4">Privacy Policy</h1>
            <p className="text-muted-foreground">Last updated: July 2026</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="prose prose-invert prose-p:text-muted-foreground prose-headings:font-mono prose-headings:text-white max-w-none"
          >
            <h2>Information We Collect</h2>
            <p>
              We collect information to provide better services to all our users. The types of information we collect include:
            </p>
            <ul>
              <li><strong>Account Data:</strong> Email address, name, password hash, and API keys.</li>
              <li><strong>Contract Data:</strong> Prompts you submit, generated contract code, and audit results.</li>
              <li><strong>Usage Analytics:</strong> Information on how you interact with our Web App, CLI, and MCP servers.</li>
            </ul>

            <h2>How We Use It</h2>
            <p>
              The information we collect is used in the following ways:
            </p>
            <ul>
              <li>To deliver the AURA Forge services, including generating and auditing contracts.</li>
              <li>To monitor security, prevent abuse, and investigate suspicious activity.</li>
              <li>To improve our product and tune our internal pipelines (unless you are on an Enterprise plan that opts out).</li>
            </ul>

            <h2>Data Retention</h2>
            <p>
              We retain your account data and contract history for as long as your account is active. If you choose to delete your account, your contract data will be securely purged within 90 days of the deletion request.
            </p>

            <h2>Third Parties</h2>
            <p>
              We leverage Anthropic API for our AI generation capabilities. Prompts and contextual contract data are sent to Anthropic to generate the output. Anthropic does not use API data to train their base models. We do not sell your personal data to any third party.
            </p>

            <h2>Cookies</h2>
            <p>
              We use strictly necessary session cookies to maintain your authentication state in the Web App. We do not use intrusive tracking or advertising cookies.
            </p>

            <h2>Your Rights</h2>
            <p>
              Depending on your location, you have the right to access, correct, delete, or port your personal data. You can perform most of these actions directly in the Web App settings. For complex requests, please contact us.
            </p>

            <h2>Contact</h2>
            <p>
              For any questions regarding this Privacy Policy, please contact us at: <a href="mailto:invest@auraforge.io" className="text-primary hover:underline">invest@auraforge.io</a>.
            </p>
          </motion.div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}