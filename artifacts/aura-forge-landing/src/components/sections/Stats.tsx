import { motion } from 'framer-motion';

const stats = [
  { value: '1,200+', label: 'Contracts Generated' },
  { value: '93/100', label: 'Average Security Score' },
  { value: '< 45s', label: 'Average Build Time' },
  { value: '20', label: 'Closed Beta Partners' },
];

export default function Stats() {
  return (
    <section className="py-20 border-y border-border bg-card/50">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-4xl md:text-5xl font-mono font-bold text-white mb-2 shadow-primary drop-shadow-[0_0_10px_rgba(0,240,255,0.3)]">
                {stat.value}
              </div>
              <div className="text-sm md:text-base text-muted-foreground font-medium uppercase tracking-wider">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
