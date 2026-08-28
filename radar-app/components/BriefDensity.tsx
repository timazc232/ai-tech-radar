'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { BRIEF_DENSITY_KEY, parseBriefDensity, type BriefDensity } from '@/lib/ui';

const Ctx = createContext<{ density: BriefDensity; setDensity: (d: BriefDensity) => void }>({
  density: 'compact',
  setDensity: () => {},
});

export function BriefDensityProvider({ children }: { children: ReactNode }) {
  const [density, setDensityState] = useState<BriefDensity>('compact');

  useEffect(() => {
    setDensityState(parseBriefDensity(localStorage.getItem(BRIEF_DENSITY_KEY)));
  }, []);

  function setDensity(next: BriefDensity) {
    setDensityState(next);
    try {
      localStorage.setItem(BRIEF_DENSITY_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }

  return <Ctx.Provider value={{ density, setDensity }}>{children}</Ctx.Provider>;
}

export function useBriefDensity() {
  return useContext(Ctx);
}

export function BriefDensityToggle() {
  const { density, setDensity } = useBriefDensity();
  return (
    <div className="tabs" role="group" aria-label="阅读密度">
      <button
        type="button"
        className={`tab touch-target ${density === 'compact' ? 'active' : ''}`}
        aria-pressed={density === 'compact'}
        onClick={() => setDensity('compact')}
      >
        精简
      </button>
      <button
        type="button"
        className={`tab touch-target ${density === 'full' ? 'active' : ''}`}
        aria-pressed={density === 'full'}
        onClick={() => setDensity('full')}
      >
        完整
      </button>
    </div>
  );
}
