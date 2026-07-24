import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Menu, X } from 'lucide-react';

export default function Navbar() {
  const { scrollY } = useScroll();
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const background = useTransform(
    scrollY,
    [0, 50],
    ['rgba(10, 10, 10, 0)', 'rgba(10, 10, 10, 0.8)']
  );
  const borderBottom = useTransform(
    scrollY,
    [0, 50],
    ['1px solid rgba(255, 255, 255, 0)', '1px solid rgba(255, 255, 255, 0.1)']
  );

  const navLinks = [
    { name: 'Docs', href: '/docs' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Security', href: '/security' },
    { name: 'Changelog', href: '/changelog' },
  ];

  return (
    <motion.header 
      style={{ background, borderBottom }}
      className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md transition-all duration-300"
    >
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
          </div>
          <span className="font-mono font-bold text-xl tracking-tight text-white">
            AURA <span className="text-primary">Forge</span>
          </span>
        </Link>
        
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          {navLinks.map(link => (
            <Link key={link.name} href={link.href} className="hover:text-white transition-colors">
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <a 
            href="/aura-forge/"
            className="group relative inline-flex items-center justify-center px-6 py-2.5 font-mono text-sm font-medium text-black bg-primary rounded hover:bg-primary/90 transition-all duration-200"
          >
            <span className="relative z-10 flex items-center gap-2">
              Launch App
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
            <div className="absolute inset-0 rounded bg-primary opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-300" />
          </a>
        </div>

        <button 
          className="md:hidden text-white p-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-white/10 shadow-2xl p-6 flex flex-col gap-6 md:hidden"
          >
            <nav className="flex flex-col gap-4 text-lg font-medium text-muted-foreground">
              {navLinks.map(link => (
                <Link key={link.name} href={link.href} className="hover:text-white transition-colors">
                  {link.name}
                </Link>
              ))}
            </nav>
            <a 
              href="/aura-forge/"
              className="group relative inline-flex items-center justify-center px-6 py-3 font-mono text-base font-medium text-black bg-primary rounded hover:bg-primary/90 transition-all duration-200 w-full"
            >
              <span className="relative z-10 flex items-center gap-2">
                Launch App
              </span>
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}