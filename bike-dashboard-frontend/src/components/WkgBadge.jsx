import React from 'react';
import { Zap } from 'lucide-react';

function getWkgLevel(wkg) {
  if (wkg >= 4.0) return { stars: 4, label: 'Elite', color: 'text-yellow-400' };
  if (wkg >= 3.0) return { stars: 3, label: 'Avançado', color: 'text-orange-400' };
  if (wkg >= 2.0) return { stars: 2, label: 'Intermediário', color: 'text-blue-400' };
  return { stars: 1, label: 'Iniciante', color: 'text-gray-400' };
}

export default function WkgBadge({ wkg, showStars = true, size = 'md' }) {
  const level = getWkgLevel(wkg);
  
  const sizes = {
    sm: { text: 'text-lg', icon: 'w-3 h-3' },
    md: { text: 'text-2xl', icon: 'w-4 h-4' },
    lg: { text: 'text-4xl', icon: 'w-6 h-6' },
  };
  
  const s = sizes[size] || sizes.md;
  
  return (
    <div className="flex flex-col items-center">
      <div className={`flex items-center gap-1 ${level.color}`}>
        <Zap className={s.icon} />
        <span className={`font-extrabold ${s.text}`}>
          {wkg.toFixed(2)}
        </span>
        <span className={size === 'lg' ? 'text-base' : 'text-xs'}>W/kg</span>
      </div>
      {showStars && (
        <div className="flex gap-0.5 mt-0.5">
          {[...Array(4)].map((_, i) => (
            <span
              key={i}
              className={`text-xs ${i < level.stars ? level.color : 'text-gray-600'}`}
            >
              ★
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
