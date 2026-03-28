import React, { useEffect, useState } from 'react';
import { Users, Zap, Trophy, Activity } from 'lucide-react';

export default function TeamBattleScreen({ teamData, onClose }) {
  const [animatedLeft, setAnimatedLeft] = useState(0);
  const [animatedRight, setAnimatedRight] = useState(0);
  
  if (!teamData || !teamData.active) return null;
  
  const { mode, metric, left, right } = teamData;
  
  // Calculate percentages for progress bars
  const maxValue = metric === 'total_power' 
    ? Math.max(left.total_power, right.total_power, 1)
    : Math.max(left.avg_wkg, right.avg_wkg, 0.1);
  
  const leftValue = metric === 'total_power' ? left.total_power : left.avg_wkg;
  const rightValue = metric === 'total_power' ? right.total_power : right.avg_wkg;
  const leftPercent = (leftValue / maxValue) * 100;
  const rightPercent = (rightValue / maxValue) * 100;
  
  // Determine leader
  const leftWinning = leftValue > rightValue;
  const rightWinning = rightValue > leftValue;
  const isTied = leftValue === rightValue;
  
  // Animate values on change
  useEffect(() => {
    setAnimatedLeft(leftValue);
    setAnimatedRight(rightValue);
  }, [leftValue, rightValue]);
  
  const metricLabel = metric === 'total_power' ? 'Potência Total' : 'Média W/kg';
  const metricUnit = metric === 'total_power' ? 'W' : 'W/kg';
  
  return (
    <div className="fixed inset-0 bg-dark-900/98 flex flex-col items-center justify-center z-50">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Users className="w-10 h-10 text-primary-400" />
          <h1 className="text-4xl font-extrabold text-white tracking-wider">
            BATALHA DE EQUIPES
          </h1>
          <Users className="w-10 h-10 text-primary-400" />
        </div>
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Activity className="w-5 h-5" />
          <span className="text-lg">{metricLabel}</span>
          <span className="text-xs px-2 py-1 bg-dark-700 rounded-full">
            {mode === 'left_right' ? 'Esquerda vs Direita' : 'Times Aleatórios'}
          </span>
        </div>
      </div>
      
      {/* Battle Arena */}
      <div className="w-full max-w-6xl px-8">
        <div className="grid grid-cols-2 gap-8">
          {/* Left Team */}
          <div className={`relative bg-dark-800 rounded-2xl p-6 border-4 transition-all duration-500 ${leftWinning ? 'border-blue-500 shadow-lg shadow-blue-500/30 scale-105' : 'border-dark-600'}`}>
            {leftWinning && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
              </div>
            )}
            
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold" style={{ color: left.color }}>
                {left.name}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2 text-gray-400">
                <Users className="w-4 h-4" />
                <span>{left.participants} participantes</span>
              </div>
            </div>
            
            {/* Main Score */}
            <div className="text-center mb-6">
              <div className={`text-7xl font-black transition-all duration-500 ${leftWinning ? 'text-blue-400 scale-110' : 'text-white'}`}>
                {metric === 'total_power' 
                  ? Math.round(animatedLeft).toLocaleString()
                  : animatedLeft.toFixed(2)
                }
              </div>
              <div className="text-2xl text-gray-400 mt-1">{metricUnit}</div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-6 bg-dark-900 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${leftPercent}%`,
                  background: `linear-gradient(90deg, ${left.color}80, ${left.color})`
                }}
              />
            </div>
            
            {/* Secondary Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-dark-900 rounded-xl p-3 text-center">
                <div className="text-gray-400 text-sm">Potência Total</div>
                <div className="text-xl font-bold text-white">{left.total_power.toLocaleString()} W</div>
              </div>
              <div className="bg-dark-900 rounded-xl p-3 text-center">
                <div className="text-gray-400 text-sm">Média W/kg</div>
                <div className="text-xl font-bold text-white">{left.avg_wkg.toFixed(2)}</div>
              </div>
            </div>
            
            {/* Devices List */}
            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-2">Bikes:</div>
              <div className="flex flex-wrap gap-1">
                {left.devices.slice(0, 10).map(device => (
                  <span key={device} className="px-2 py-1 bg-dark-700 rounded text-xs text-gray-300">
                    {device}
                  </span>
                ))}
                {left.devices.length > 10 && (
                  <span className="px-2 py-1 bg-dark-700 rounded text-xs text-gray-500">
                    +{left.devices.length - 10}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Team */}
          <div className={`relative bg-dark-800 rounded-2xl p-6 border-4 transition-all duration-500 ${rightWinning ? 'border-red-500 shadow-lg shadow-red-500/30 scale-105' : 'border-dark-600'}`}>
            {rightWinning && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Trophy className="w-8 h-8 text-yellow-400 animate-bounce" />
              </div>
            )}
            
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold" style={{ color: right.color }}>
                {right.name}
              </h2>
              <div className="flex items-center justify-center gap-2 mt-2 text-gray-400">
                <Users className="w-4 h-4" />
                <span>{right.participants} participantes</span>
              </div>
            </div>
            
            {/* Main Score */}
            <div className="text-center mb-6">
              <div className={`text-7xl font-black transition-all duration-500 ${rightWinning ? 'text-red-400 scale-110' : 'text-white'}`}>
                {metric === 'total_power' 
                  ? Math.round(animatedRight).toLocaleString()
                  : animatedRight.toFixed(2)
                }
              </div>
              <div className="text-2xl text-gray-400 mt-1">{metricUnit}</div>
            </div>
            
            {/* Progress Bar */}
            <div className="h-6 bg-dark-900 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${rightPercent}%`,
                  background: `linear-gradient(90deg, ${right.color}80, ${right.color})`
                }}
              />
            </div>
            
            {/* Secondary Stats */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-dark-900 rounded-xl p-3 text-center">
                <div className="text-gray-400 text-sm">Potência Total</div>
                <div className="text-xl font-bold text-white">{right.total_power.toLocaleString()} W</div>
              </div>
              <div className="bg-dark-900 rounded-xl p-3 text-center">
                <div className="text-gray-400 text-sm">Média W/kg</div>
                <div className="text-xl font-bold text-white">{right.avg_wkg.toFixed(2)}</div>
              </div>
            </div>
            
            {/* Devices List */}
            <div className="mt-4">
              <div className="text-sm text-gray-500 mb-2">Bikes:</div>
              <div className="flex flex-wrap gap-1">
                {right.devices.slice(0, 10).map(device => (
                  <span key={device} className="px-2 py-1 bg-dark-700 rounded text-xs text-gray-300">
                    {device}
                  </span>
                ))}
                {right.devices.length > 10 && (
                  <span className="px-2 py-1 bg-dark-700 rounded text-xs text-gray-500">
                    +{right.devices.length - 10}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* VS indicator */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-2xl">
            <span className="text-3xl font-black text-dark-900">VS</span>
          </div>
        </div>
      </div>
      
      {/* Tie indicator */}
      {isTied && (
        <div className="mt-8 text-2xl font-bold text-yellow-400 animate-pulse">
          <Zap className="w-6 h-6 inline mr-2" />
          EMPATE!
          <Zap className="w-6 h-6 inline ml-2" />
        </div>
      )}
    </div>
  );
}
