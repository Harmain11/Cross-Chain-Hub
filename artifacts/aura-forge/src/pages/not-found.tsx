import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="text-8xl font-bold text-primary opacity-20 font-mono tracking-tighter">404</h1>
        <h2 className="text-2xl font-semibold text-foreground font-mono uppercase tracking-widest">Vector Not Found</h2>
        <p className="text-muted-foreground font-mono text-sm">
          The requested path does not exist within the current navigation mesh.
        </p>
        <button 
          onClick={() => setLocation("/")}
          className="mt-8 px-6 py-3 border border-primary/50 text-primary hover:bg-primary/10 transition-colors rounded uppercase font-mono text-xs tracking-widest"
        >
          Return to Hub
        </button>
      </div>
    </div>
  );
}
