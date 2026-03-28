import React, { useState, useEffect } from 'react';
import { X, Trophy, Zap, TrendingUp, Award, Target } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function ClassSummaryScreen({ sessionId, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (sessionId) {
      fetchSummary();
    }
  }, [sessionId]);
  
  const fetchSummary = async () => {
    try {
      const res = await fetch(`${API_URL}/api/class/${sessionId}/summary`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
    setLoading(false);
  };
  
  if (!sessionId) return null;
  if (loading) {
    return (
      <div className="fixed inset-0 bg-dark-900/95 flex items-center justify-center z-50">
        <div className="text-white text-2xl">Carregando resumo...</div>
      </div>
    );
  }
  
  if (!summary) return null;
  
  const { session, participants, badges_earned, stats } = summary;
  
  return (
    <div className="fixed inset-0 bg-dark-900/95 flex flex-col items-center justify-center z-50 p-8 overflow-y-auto">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-extrabold text-white mb-2">
            🎉 Aula Concluída! 🎉
          </h1>
          <p className="text-xl text-gray-400">
            {new Date(session.started_at).toLocaleDateString()} • {session.instructor_name || 'Instrutor'}
          </p>
        </div>
        
        {/* Class Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-800 rounded-xl p-6 text-center">
            <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white">{stats.total_participants}</div>
            <div className="text-sm text-gray-400">Participantes</div>
          </div>
          
          <div className="bg-dark-800 rounded-xl p-6 text-center">
            <Target className="w-8 h-8 text-primary-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white">{stats.total_distance_km}</div>
            <div className="text-sm text-gray-400">Km Totais</div>
          </div>
          
          <div className="bg-dark-800 rounded-xl p-6 text-center">
            <Zap className="w-8 h-8 text-orange-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white">{stats.avg_power}</div>
            <div className="text-sm text-gray-400">Potência Média (W)</div>
          </div>
          
          <div className="bg-dark-800 rounded-xl p-6 text-center">
            <TrendingUp className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <div className="text-3xl font-bold text-white">{stats.total_xp_earned}</div>
            <div className="text-sm text-gray-400">XP Total Ganho</div>
          </div>
        </div>
        
        {/* Badges Earned */}
        {badges_earned.length > 0 && (
          <div className="bg-dark-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-yellow-400" />
              Conquistas Desbloqueadas
            </h2>
            <div className="grid grid-cols-3 gap-4">
              {badges_earned.map((badge, i) => (
                <div key={i} className="bg-dark-900 rounded-lg p-4 flex items-center gap-3">
                  <span className="text-4xl">{badge.badge_icon}</span>
                  <div>
                    <div className="font-bold text-white">{badge.student_name}</div>
                    <div className="text-sm text-gray-400">{badge.badge_name}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Top Performers */}
        <div className="bg-dark-800 rounded-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">🏆 Top Performers</h2>
          <div className="space-y-3">
            {participants.slice(0, 5).map((p, i) => (
              <div key={i} className="flex items-center gap-4 bg-dark-900 rounded-lg p-4">
                <span className={`text-3xl font-bold ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-amber-600' : 'text-gray-500'}`}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                </span>
                <div className="flex-1">
                  <div className="font-bold text-white">{p.student_name}</div>
                  <div className="text-sm text-gray-400">Nível {p.student_level || 1}</div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary-400">{Math.round(p.avg_power)} W</div>
                  <div className="text-sm text-gray-400">{(p.total_distance_m / 1000).toFixed(2)} km</div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-green-400">+{p.xp_earned} XP</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Close Button */}
        <div className="text-center">
          <button
            onClick={onClose}
            className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all"
          >
            Fechar Resumo
          </button>
        </div>
      </div>
    </div>
  );
}
