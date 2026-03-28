import React, { useState, useEffect } from 'react';
import { Target, Timer, CheckCircle, XCircle, Trophy, Users } from 'lucide-react';

export default function CadenceScreen({ cadenceData, onClose }) {
  const [showCelebration, setShowCelebration] = useState(false);
  
  if (!cadenceData || !cadenceData.active) return null;
  
  const {
    target_rpm = 90,
    duration = 120,
    elapsed = 0,
    remaining = 0,
    participants_at_target = 0,
    total_participants = 0,
    completion_percent = 0,
    participants = {}
  } = cadenceData;
  
  const progress = duration > 0 ? ((duration - remaining) / duration) * 100 : 0;
  const isFullCompletion = completion_percent === 100 && total_participants > 0;
  
  // Trigger celebration when 100% reach target
  useEffect(() => {
    if (isFullCompletion && !showCelebration) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isFullCompletion]);
  
  // Sort participants by cadence for display
  const participantsList = Object.entries(participants).map(([device, data]) => ({
    device,
    ...data
  })).sort((a, b) => b.cadence - a.cadence);
  
  return (
    <div className="fixed inset-0 bg-dark-900/95 flex flex-col items-center justify-start pt-8 z-50 overflow-auto">
      {/* Celebration overlay */}
      {showCelebration && (
        <div className="absolute inset-0 flex items-center justify-center z-60 pointer-events-none">
          <div className="text-center animate-bounce">
            <Trophy className="w-32 h-32 text-yellow-400 mx-auto mb-4" />
            <span className="text-5xl font-black text-yellow-400">100% NO ALVO!</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Target className="w-12 h-12 text-cyan-400 animate-pulse" />
          <h1 className="text-4xl font-extrabold text-white">DESAFIO DE CADÊNCIA</h1>
          <Target className="w-12 h-12 text-cyan-400 animate-pulse" />
        </div>
        
        {/* Target RPM */}
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl px-12 py-4 mt-4 inline-block">
          <span className="text-7xl font-black text-white">{target_rpm}</span>
          <span className="text-3xl font-bold text-cyan-200 ml-2">RPM</span>
        </div>
      </div>
      
      {/* Timer */}
      <div className="flex items-center justify-center gap-4 text-white mb-4">
        <Timer className="w-8 h-8" />
        <span className="text-5xl font-bold">
          {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="w-full max-w-2xl px-8 mb-6">
        <div className="w-full h-4 bg-dark-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Achievement stats */}
      <div className="bg-dark-800 rounded-2xl p-6 mb-6 w-full max-w-2xl mx-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Users className="w-6 h-6 text-gray-400" />
          <span className="text-xl text-gray-400">Participantes no Alvo</span>
        </div>
        
        <div className="flex items-center justify-center gap-8">
          <div className="text-center">
            <span className={`text-6xl font-black ${isFullCompletion ? 'text-yellow-400' : 'text-cyan-400'}`}>
              {participants_at_target}
            </span>
            <span className="text-3xl text-gray-400">/{total_participants}</span>
          </div>
          
          {/* Completion percentage circle */}
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-dark-700"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                strokeDasharray={`${completion_percent * 3.52} 352`}
                className={isFullCompletion ? 'text-yellow-400' : 'text-cyan-400'}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-black ${isFullCompletion ? 'text-yellow-400' : 'text-white'}`}>
                {completion_percent}%
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Participants grid */}
      <div className="w-full max-w-4xl px-8 pb-8">
        <h2 className="text-xl font-bold text-gray-400 mb-4 text-center">Participantes</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {participantsList.map((participant) => (
            <div
              key={participant.device}
              className={`flex items-center p-3 rounded-xl transition-all ${
                participant.at_target 
                  ? 'bg-green-500/20 border-2 border-green-500' 
                  : 'bg-dark-800 border-2 border-dark-700'
              }`}
            >
              {participant.at_target ? (
                <CheckCircle className="w-6 h-6 text-green-400 mr-2 flex-shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400 mr-2 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {participant.student_name || participant.device}
                </div>
                <div className={`text-lg font-black ${
                  participant.at_target ? 'text-green-400' : 'text-red-400'
                }`}>
                  {Math.round(participant.cadence)} RPM
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {participantsList.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl">Aguardando participantes...</p>
            <p className="text-sm">Os ciclistas aparecerão aqui quando começarem a pedalar</p>
          </div>
        )}
      </div>
    </div>
  );
}
