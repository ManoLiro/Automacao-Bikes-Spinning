import React from 'react';
import { Zap, Timer } from 'lucide-react';
import WkgBadge from './WkgBadge';

export default function SprintScreen({ sprintData, onClose }) {
  if (!sprintData || !sprintData.active) return null;
  
  const { number, duration, elapsed, remaining, rankings = [] } = sprintData;
  const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;
  const showCountdown = remaining <= 3 && remaining > 0;
  
  return (
    <div className="fixed inset-0 bg-dark-900/95 flex flex-col items-center justify-center z-50">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Zap className="w-12 h-12 text-yellow-400 animate-pulse" />
          <h1 className="text-5xl font-extrabold text-white">SPRINT #{number}</h1>
          <Zap className="w-12 h-12 text-yellow-400 animate-pulse" />
        </div>
        
        <div className="flex items-center justify-center gap-4 text-white">
          <Timer className="w-8 h-8" />
          {showCountdown ? (
            <span className="text-8xl font-black countdown-number text-yellow-400">{remaining}</span>
          ) : (
            <span className="text-6xl font-bold">
              {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
            </span>
          )}
        </div>
        
        <div className="w-96 h-4 bg-dark-700 rounded-full mt-4 overflow-hidden mx-auto">
          <div 
            className="h-full progress-animated transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="w-full max-w-4xl px-8">
        <h2 className="text-2xl font-bold text-gray-400 mb-4 text-center">Ranking por W/kg</h2>
        <div className="space-y-3">
          {rankings.slice(0, 8).map((p, i) => (
            <div
              key={p.device}
              className={`flex items-center p-4 rounded-xl ${i === 0 ? 'bg-yellow-500/20 border-2 border-yellow-500 sprint-active' : 'bg-dark-800'}`}
            >
              <span className={`text-4xl font-extrabold w-16 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="flex-1 text-2xl font-bold text-white">{p.name}</span>
              <WkgBadge wkg={p.avg_wkg || 0} size="lg" showStars={false} />
              <div className="ml-8 text-right">
                <span className="text-3xl font-bold text-primary-400">{Math.round(p.avg_power || 0)}</span>
                <span className="text-sm text-gray-500 ml-1">W</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
