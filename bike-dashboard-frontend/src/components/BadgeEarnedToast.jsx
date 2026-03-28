import React, { useState, useEffect } from 'react';
import { Award } from 'lucide-react';

function ConfettiPiece({ delay, side }) {
  const colors = ['#fbbf24', '#f97316', '#ef4444', '#22c55e', '#3b82f6', '#8b5cf6'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const size = 6 + Math.random() * 6;
  const rotation = Math.random() * 360;
  const xOffset = (side === 'left' ? -1 : 1) * (20 + Math.random() * 60);
  
  return (
    <div
      className="absolute"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: Math.random() > 0.5 ? '50%' : '2px',
        left: '50%',
        top: '50%',
        transform: `rotate(${rotation}deg)`,
        animation: `confetti-fall 1.5s ease-out ${delay}s forwards`,
        '--x-offset': `${xOffset}px`,
      }}
    />
  );
}

function BadgeEarnedToast({ badge, onDismiss }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  
  useEffect(() => {
    // Animate in
    requestAnimationFrame(() => setIsVisible(true));
    
    // Auto-dismiss after 10 seconds
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(), 400);
    }, 10000);
    
    return () => clearTimeout(dismissTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - timer should only run once on mount
  
  return (
    <div
      className={`
        relative overflow-hidden
        bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-red-500/20
        border-2 border-purple-400
        rounded-xl p-4 shadow-2xl
        transform transition-all duration-400
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      {/* Confetti effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(16)].map((_, i) => (
          <ConfettiPiece key={i} delay={i * 0.05} side={i % 2 === 0 ? 'left' : 'right'} />
        ))}
      </div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-purple-400/10 animate-pulse rounded-xl" />
      
      {/* Content */}
      <div className="relative flex items-center gap-4">
        {/* Badge icon with celebration animation */}
        <div className="flex-shrink-0 relative">
          <div className="w-14 h-14 bg-purple-400/20 rounded-full flex items-center justify-center badge-celebration">
            <Award className="w-8 h-8 text-purple-400" />
          </div>
          <div className="absolute -top-1 -right-1 text-3xl animate-bounce">
            {badge.badge.icon}
          </div>
        </div>
        
        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-purple-400 font-extrabold text-sm uppercase tracking-wider">
              🎖️ Conquista Desbloqueada!
            </span>
          </div>
          
          <p className="text-white font-bold text-lg truncate">
            {badge.student_name}
          </p>
          
          <p className="text-gray-300 text-base font-semibold">
            {badge.badge.name}
          </p>
          
          {badge.badge.xp_reward > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-purple-400 font-extrabold text-lg">
                +{badge.badge.xp_reward} XP
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BadgeEarnedToastContainer({ badges, onDismiss }) {
  if (!badges || badges.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {badges.map((badge, index) => (
        <BadgeEarnedToast
          key={`${badge.student_cpf}-${badge.badge.id}-${index}`}
          badge={badge}
          onDismiss={() => onDismiss(index)}
        />
      ))}
    </div>
  );
}
