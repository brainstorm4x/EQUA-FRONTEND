'use client';

// STYLE PREVIEW ONLY: floating picker that switches the site between the
// three proposed style directions. The choice is kept in localStorage and can
// be preset with ?style=a|b|c|now.
import { useEffect, useState } from 'react';

const STYLES = [
  { id: 'now', label: 'Now' },
  { id: 'a', label: 'A Indigo & Gold' },
  { id: 'b', label: 'B Emerald' },
  { id: 'c', label: 'C Ink & Sky' },
];

export function StylePicker() {
  const [style, setStyle] = useState('a');

  useEffect(() => {
    setStyle(document.documentElement.dataset.style || 'a');
  }, []);

  const choose = (id: string) => {
    document.documentElement.dataset.style = id;
    try {
      localStorage.setItem('uniyaa:style-preview', id);
    } catch {}
    setStyle(id);
  };

  return (
    <div
      style={{
        position: 'fixed', left: 8, right: 8, bottom: 8, zIndex: 9999,
        display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex', gap: 4, padding: 4, borderRadius: 999,
          background: 'rgba(0,0,0,0.75)', pointerEvents: 'auto',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', flexWrap: 'wrap', justifyContent: 'center',
        }}
      >
        {STYLES.map((s) => (
          <button
            key={s.id}
            onClick={() => choose(s.id)}
            style={{
              padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer',
              background: style === s.id ? '#fff' : 'transparent',
              color: style === s.id ? '#000' : '#fff',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
