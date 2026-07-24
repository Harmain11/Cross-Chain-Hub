import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Hero from '../components/sections/Hero';
import Stats from '../components/sections/Stats';
import Pipeline from '../components/sections/Pipeline';
import UseCases from '../components/sections/UseCases';
import Chains from '../components/sections/Chains';
import CliSection from '../components/sections/CliSection';
import McpSection from '../components/sections/McpSection';

export default function Home() {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground selection:bg-primary/20">
      <Navbar />
      <main className="flex-1 flex flex-col overflow-hidden">
        <Hero />
        <Stats />
        <Pipeline />
        <UseCases />
        <Chains />
        <CliSection />
        <McpSection />
      </main>
      <Footer />
    </div>
  );
}
