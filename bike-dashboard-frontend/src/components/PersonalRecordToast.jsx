import React, { useState, useEffect } from 'react';
import { Trophy, Zap, Activity, Gauge, Timer } from 'lucide-react';

const RECORD_ICONS = {
  max_power: Zap,
  max_wkg: Zap,
  max_cadence: Activity,
  max_speed: Gauge,
  best_sprint_30s: Timer,
  best_sprint_60s: Timer,
  longest_z4_streak: Zap,
};

const RECORD_UNITS = {
  max_power: 'W',
  max_wkg: 'W/kg',
  max_cadence: 'RPM',
  max_speed: 'km/h',
  best_sprint_30s: 'W/kg',
  best_sprint_60s: 'W/kg',
  longest_z4_streak: 's',
};

function formatValue(type, value) {
  if (type === 'max_wkg' || type === 'best_sprint_30s' || type === 'best_sprint_60s') {
    return value.toFixed(2);
  }
  if (type === 'max_speed') {
    return value.toFixed(1);
  }
  return Math.round(value);
}

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

function PersonalRecordToast({ record, onDismiss }) {
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
  
  const Icon = RECORD_ICONS[record.record_type] || Trophy;
  const unit = RECORD_UNITS[record.record_type] || '';
  const formattedOld = formatValue(record.record_type, record.old_value);
  const formattedNew = formatValue(record.record_type, record.new_value);
  
  return (
    <div
      className={`
        relative overflow-hidden
        bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-red-500/20
        border-2 border-yellow-400
        rounded-xl p-4 shadow-2xl
        transform transition-all duration-400
        ${isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      {/* Confetti effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <ConfettiPiece key={i} delay={i * 0.05} side={i % 2 === 0 ? 'left' : 'right'} />
        ))}
      </div>
      
      {/* Glow effect */}
      <div className="absolute inset-0 bg-yellow-400/10 animate-pulse rounded-xl" />
      
      {/* Content */}
      <div className="relative flex items-center gap-4">
        {/* Trophy icon with celebration animation */}
        <div className="flex-shrink-0 relative">
          <div className="w-14 h-14 bg-yellow-400/20 rounded-full flex items-center justify-center personal-record">
            <Trophy className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="absolute -top-1 -right-1 bg-red-500 rounded-full p-1">
            <Icon className="w-4 h-4 text-white" />
          </div>
        </div>
        
        {/* Text content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-yellow-400 font-extrabold text-sm uppercase tracking-wider">
              🏆 Recorde Pessoal!
            </span>
          </div>
          
          <p className="text-white font-bold text-lg truncate">
            {record.student_name}
          </p>
          
          <p className="text-gray-300 text-sm">
            {record.record_name}
          </p>
          
          <div className="flex items-center gap-2 mt-2">
            {record.old_value > 0 && (
              <>
                <span className="text-gray-500 line-through text-sm">
                  {formattedOld} {unit}
                </span>
                <span className="text-gray-500">→</span>
              </>
            )}
            <span className="text-yellow-400 font-extrabold text-xl">
              {formattedNew} {unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PersonalRecordToastContainer({ records, onDismiss }) {
  if (!records || records.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm">
      {records.map((record, index) => (
        <PersonalRecordToast
          key={`${record.student_cpf}-${record.record_type}-${index}`}
          record={record}
          onDismiss={() => onDismiss(index)}
        />
      ))}
    </div>
  );
}
