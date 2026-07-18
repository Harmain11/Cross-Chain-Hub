import { useRef, useCallback } from 'react';

export function useTilt(maxTilt = 10) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    el.style.transition = 'transform 0.08s ease';
    el.style.transform = `perspective(900px) rotateY(${x * maxTilt}deg) rotateX(${-y * maxTilt}deg) translateZ(16px)`;
  }, [maxTilt]);

  const onMouseLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 0.65s cubic-bezier(0.22,1,0.36,1)';
    el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg) translateZ(0px)';
  }, []);

  return { ref, onMouseMove, onMouseLeave };
}
