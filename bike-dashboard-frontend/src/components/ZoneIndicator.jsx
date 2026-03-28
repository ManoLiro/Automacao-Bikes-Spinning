import React from 'react';

const ZONE_CONFIG = {
  1: { name: 'Recuperação', bg: 'bg-gray-500', text: 'text-gray-100' },
  2: { name: 'Endurance', bg: 'bg-blue-500', text: 'text-blue-100' },
  3: { name: 'Tempo', bg: 'bg-green-500', text: 'text-green-100' },
  4: { name: 'Threshold', bg: 'bg-yellow-500', text: 'text-yellow-900' },
  5: { name: 'VO2max', bg: 'bg-orange-500', text: 'text-orange-100', fire: true },
  6: { name: 'Anaeróbico', bg: 'bg-red-500', text: 'text-red-100', fire: true },
};

export default function ZoneIndicator({ zone, ftpPercent, showLabel = true, compact = false }) {
  const config = ZONE_CONFIG[zone] || ZONE_CONFIG[1];
  
  if (compact) {
    return (
      <div className={`px-2 py-1 rounded ${config.bg} ${config.text} ${config.fire ? 'zone-fire' : ''}`}>
        <span className="text-sm font-bold">Z{zone}</span>
      </div>
    );
  }
  
  return (
    <div className={`
      flex items-center gap-2 px-3 py-1.5 rounded-lg
      ${config.bg} ${config.text}
      ${config.fire ? 'zone-fire' : ''}
      transition-all duration-300
    `}>
      <span className="text-lg font-bold">Z{zone}</span>
      {showLabel && (
        <>
          <span className="text-sm font-medium">{config.name}</span>
          {ftpPercent !== undefined && (
            <span className="text-xs opacity-80">{Math.round(ftpPercent)}%</span>
          )}
        </>
      )}
    </div>
  );
}
