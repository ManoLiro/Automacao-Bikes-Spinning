import React from 'react';
import { Award, Lock } from 'lucide-react';

const CATEGORY_COLORS = {
  frequency: 'from-blue-500 to-cyan-500',
  performance: 'from-red-500 to-orange-500',
  social: 'from-purple-500 to-pink-500',
  milestone: 'from-yellow-500 to-amber-500',
};

const CATEGORY_NAMES = {
  frequency: 'Frequência',
  performance: 'Performance',
  social: 'Social',
  milestone: 'Marcos',
};

function BadgeCard({ badge, isEarned = false, earnedAt = null }) {
  const categoryColor = CATEGORY_COLORS[badge.category] || 'from-gray-500 to-gray-600';
  
  return (
    <div
      className={`
        relative rounded-lg p-4 border-2 transition-all duration-300
        ${isEarned 
          ? `bg-gradient-to-br ${categoryColor} border-white/30 shadow-lg hover:scale-105` 
          : 'bg-gray-800/50 border-gray-700 opacity-60 hover:opacity-80'
        }
      `}
    >
      {/* Earned badge - show icon prominently */}
      {isEarned ? (
        <>
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-2">{badge.icon}</div>
            <h3 className="text-white font-bold text-lg mb-1">{badge.name}</h3>
            <p className="text-white/80 text-sm mb-2">{badge.description}</p>
            {badge.xp_reward > 0 && (
              <div className="inline-block bg-white/20 rounded-full px-3 py-1 text-xs font-bold text-white">
                +{badge.xp_reward} XP
              </div>
            )}
            {earnedAt && (
              <p className="text-white/60 text-xs mt-2">
                Conquistado em {new Date(earnedAt).toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Locked badge - show grayed out */}
          <div className="flex flex-col items-center text-center">
            <div className="relative text-4xl mb-2 filter grayscale opacity-30">
              {badge.icon}
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="w-6 h-6 text-gray-500" />
              </div>
            </div>
            <h3 className="text-gray-400 font-bold text-base mb-1">{badge.name}</h3>
            <p className="text-gray-500 text-xs mb-2">{badge.description}</p>
            {badge.xp_reward > 0 && (
              <div className="inline-block bg-gray-700/50 rounded-full px-2 py-1 text-xs text-gray-400">
                +{badge.xp_reward} XP
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function BadgesGrid({ allBadges, earnedBadges = [] }) {
  // Create a map of earned badges for quick lookup
  const earnedMap = earnedBadges.reduce((acc, badge) => {
    acc[badge.id] = badge.earned_at;
    return acc;
  }, {});
  
  // Group badges by category
  const badgesByCategory = allBadges.reduce((acc, badge) => {
    if (!acc[badge.category]) {
      acc[badge.category] = [];
    }
    acc[badge.category].push(badge);
    return acc;
  }, {});
  
  const categories = ['frequency', 'performance', 'social', 'milestone'];
  
  return (
    <div className="space-y-8">
      {categories.map(category => {
        const categoryBadges = badgesByCategory[category] || [];
        if (categoryBadges.length === 0) return null;
        
        const earnedCount = categoryBadges.filter(b => earnedMap[b.id]).length;
        
        return (
          <div key={category}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Award className="w-6 h-6" />
                {CATEGORY_NAMES[category]}
              </h2>
              <span className="text-gray-400 text-sm">
                {earnedCount} / {categoryBadges.length}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {categoryBadges.map(badge => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={!!earnedMap[badge.id]}
                  earnedAt={earnedMap[badge.id]}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
