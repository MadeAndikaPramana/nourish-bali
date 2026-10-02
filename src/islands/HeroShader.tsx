import { useEffect, useState } from 'react';
import { MeshGradient } from '@paper-design/shaders-react';
import { baliClock } from '@/lib/hours';
import { PHASE_COLORS, phaseAt, type Phase } from '@/lib/phase';

/**
 * Animated mesh-gradient backdrop (Paper Shaders, Apache-2.0). Only mounts when the device can afford it:
 * WebGL available, no reduced-motion, no data saver. Otherwise the CSS gradient underneath stays.
 */
export default function HeroShader() {
  const [phase, setPhase] = useState<Phase | null>(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const nav = navigator as Navigator & { connection?: { saveData?: boolean }; deviceMemory?: number };
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowEnd = nav.connection?.saveData || (nav.deviceMemory !== undefined && nav.deviceMemory < 4);
    if (reduced || lowEnd || !hasWebGL()) return;

    setPhase(phaseAt(baliClock().minutes));
    const id = setInterval(() => setPhase(phaseAt(baliClock().minutes)), 60_000);

    // Stop rendering when the hero is off-screen.
    const host = document.getElementById('hero');
    const io = host ? new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0 }) : null;
    if (host && io) io.observe(host);
    return () => {
      clearInterval(id);
      io?.disconnect();
    };
  }, []);

  if (!phase) return null;
  return (
    <MeshGradient
      className="absolute inset-0 animate-fade"
      style={{ width: '100%', height: '100%' }}
      colors={PHASE_COLORS[phase]}
      distortion={0.85}
      swirl={0.35}
      grainMixer={0.18}
      grainOverlay={0.12}
      speed={visible ? 0.22 : 0}
      maxPixelCount={1920 * 1080}
    />
  );
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
