import { Link } from 'wouter';

export default function Footer() {
  return (
    <footer className="bg-card border-t border-card-border py-12 md:py-16">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Column 1 - Brand */}
          <div className="flex flex-col">
            <Link href="/" className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/50">
                <div className="w-2 h-2 bg-primary rounded-full" />
              </div>
              <span className="font-mono font-bold text-lg text-white">
                AURA Forge
              </span>
            </Link>
            <p className="text-muted-foreground text-sm">
              The AI-powered smart contract factory. Describe your logic, deploy production-ready code.
            </p>
          </div>
          
          {/* Column 2 - Product */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-sm font-semibold text-white mb-2">Product</h4>
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-primary transition-colors">Docs</Link>
            <Link href="/pricing" className="text-sm text-muted-foreground hover:text-primary transition-colors">Pricing</Link>
            <Link href="/security" className="text-sm text-muted-foreground hover:text-primary transition-colors">Security</Link>
            <Link href="/changelog" className="text-sm text-muted-foreground hover:text-primary transition-colors">Changelog</Link>
          </div>

          {/* Column 3 - Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-sm font-semibold text-white mb-2">Legal</h4>
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">Terms of Service</Link>
          </div>

          {/* Column 4 - Team */}
          <div className="flex flex-col gap-3">
            <h4 className="font-mono text-sm font-semibold text-white mb-2">Team</h4>
            <a href="https://linkedin.com/in/georgios-samaras" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              George Samaras <span className="text-xs opacity-50">(LinkedIn)</span>
            </a>
            <a href="https://github.com/Harmain11" target="_blank" rel="noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Harmain Mughal <span className="text-xs opacity-50">(GitHub)</span>
            </a>
            <a href="mailto:invest@auraforge.io" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              invest@auraforge.io
            </a>
          </div>
        </div>
        
        <div className="mt-16 pt-8 border-t border-card-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} AURA Forge. All rights reserved.
          </p>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            Systems Operational
          </div>
        </div>
      </div>
    </footer>
  );
}