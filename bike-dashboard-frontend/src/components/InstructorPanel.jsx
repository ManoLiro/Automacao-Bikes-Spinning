import React, { useState, useEffect, useCallback } from 'react';
import { Zap, Target, Users, Play, Square, X, Activity, AlertTriangle, Clock, BookOpen, StopCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function InstructorPanel({ isOpen, onClose, isSprintActive, onSprintStateChange, isFtpTestActive, onFtpTestStateChange }) {
  const [sprintDuration, setSprintDuration] = useState(60);
  const [ftpDuration, setFtpDuration] = useState(20);
  const [loading, setLoading] = useState(false);
  const [ftpLoading, setFtpLoading] = useState(false);
  
  // Class session state
  const [classSession, setClassSession] = useState(null);
  const [classLoading, setClassLoading] = useState(false);
  const [classDuration, setClassDuration] = useState(0);
  
  // Fetch current class status
  const fetchClassStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/class/current`);
      if (res.ok) {
        const data = await res.json();
        setClassSession(data.active ? data : null);
        if (data.active) {
          setClassDuration(data.duration_seconds || 0);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar status da aula:', err);
    }
  }, []);
  
  useEffect(() => {
    if (isOpen) {
      fetchClassStatus();
    }
  }, [isOpen, fetchClassStatus]);
  
  // Update class duration every second when class is active
  useEffect(() => {
    if (!classSession?.active) return;
    
    const interval = setInterval(() => {
      setClassDuration(prev => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [classSession?.active]);
  
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleStartClass = async () => {
    setClassLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/class/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_type: 'regular' })
      });
      if (res.ok) {
        const data = await res.json();
        setClassSession({ active: true, ...data });
        setClassDuration(0);
      }
    } catch (err) {
      console.error('Erro ao iniciar aula:', err);
    }
    setClassLoading(false);
  };
  
  const handleEndClass = async () => {
    if (!window.confirm('Tem certeza que deseja encerrar a aula? Todos os dados serão salvos.')) {
      return;
    }
    setClassLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/class/end`, { method: 'POST' });
      if (res.ok) {
        setClassSession(null);
        setClassDuration(0);
      }
    } catch (err) {
      console.error('Erro ao encerrar aula:', err);
    }
    setClassLoading(false);
  };
  
  const handleStartSprint = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/game/sprint/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: sprintDuration })
      });
      if (res.ok) onSprintStateChange?.(true);
    } catch (err) {
      console.error('Erro ao iniciar sprint:', err);
    }
    setLoading(false);
  };
  
  const handleCancelSprint = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/game/sprint/cancel`, { method: 'POST' });
      if (res.ok) onSprintStateChange?.(false);
    } catch (err) {
      console.error('Erro ao cancelar sprint:', err);
    }
    setLoading(false);
  };

  const handleStartFtpTest = async () => {
    setFtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/game/ftp-test/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_minutes: ftpDuration })
      });
      if (res.ok) {
        onFtpTestStateChange?.(true);
        onClose?.();
      }
    } catch (err) {
      console.error('Erro ao iniciar teste FTP:', err);
    }
    setFtpLoading(false);
  };

  const handleEndFtpTest = async () => {
    setFtpLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/game/ftp-test/end`, { method: 'POST' });
      if (res.ok) onFtpTestStateChange?.(false);
    } catch (err) {
      console.error('Erro ao finalizar teste FTP:', err);
    }
    setFtpLoading(false);
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-2xl p-6 w-full max-w-md border border-dark-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Painel do Instrutor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X className="w-6 h-6" /></button>
        </div>
        
        {/* Class Session Control */}
        <div className="bg-dark-900 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Controle de Aula</h3>
          </div>
          
          {classSession?.active ? (
            <>
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-blue-400 font-medium">Aula em andamento</span>
                  <div className="flex items-center gap-2 text-white">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono text-lg">{formatDuration(classDuration)}</span>
                  </div>
                </div>
                {classSession.participants_count > 0 && (
                  <div className="text-sm text-gray-400 mt-2">
                    {classSession.participants_count} participante{classSession.participants_count !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              
              <button 
                onClick={handleEndClass} 
                disabled={classLoading}
                className="w-full flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                <StopCircle className="w-5 h-5" />
                ENCERRAR AULA
              </button>
            </>
          ) : (
            <button 
              onClick={handleStartClass} 
              disabled={classLoading}
              className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
            >
              <Play className="w-5 h-5" />
              INICIAR AULA
            </button>
          )}
        </div>
        
        {/* Sprint Control */}
        <div className="bg-dark-900 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-semibold text-white">Controle de Sprint</h3>
          </div>
          
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Duração</label>
            <div className="flex gap-2">
              {[30, 45, 60, 90].map(d => (
                <button
                  key={d}
                  onClick={() => setSprintDuration(d)}
                  disabled={isSprintActive || isFtpTestActive}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${sprintDuration === d ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'} ${(isSprintActive || isFtpTestActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>
          
          <div className="flex gap-3">
            {!isSprintActive ? (
              <button onClick={handleStartSprint} disabled={loading || isFtpTestActive} className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50">
                <Play className="w-5 h-5" />INICIAR SPRINT
              </button>
            ) : (
              <button onClick={handleCancelSprint} disabled={loading} className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50">
                <Square className="w-5 h-5" />CANCELAR
              </button>
            )}
          </div>
        </div>

        {/* FTP Test Control */}
        <div className="bg-dark-900 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-orange-400" />
            <h3 className="text-lg font-semibold text-white">Teste de FTP</h3>
          </div>

          {/* Warning */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-200">
                <p className="font-semibold mb-1">Atenção!</p>
                <p className="text-orange-300/80">Este teste atualizará o FTP real de todos os alunos participantes. Use apenas para testes oficiais.</p>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Duração (minutos)</label>
            <div className="flex gap-2">
              {[5, 10, 15, 20].map(d => (
                <button
                  key={d}
                  onClick={() => setFtpDuration(d)}
                  disabled={isFtpTestActive || isSprintActive}
                  className={`flex-1 py-2 rounded-lg font-semibold transition-all ${ftpDuration === d ? 'bg-orange-500 text-white' : 'bg-dark-700 text-gray-400 hover:bg-dark-600'} ${(isFtpTestActive || isSprintActive) ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {d}min
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Padrão: 20 minutos all-out. FTP = Média × 0.95</p>
          </div>
          
          <div className="flex gap-3">
            {!isFtpTestActive ? (
              <button 
                onClick={handleStartFtpTest} 
                disabled={ftpLoading || isSprintActive} 
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                <Play className="w-5 h-5" />INICIAR TESTE FTP
              </button>
            ) : (
              <button 
                onClick={handleEndFtpTest} 
                disabled={ftpLoading} 
                className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                <Square className="w-5 h-5" />FINALIZAR TESTE
              </button>
            )}
          </div>
        </div>
        
        <div className="bg-dark-900/50 rounded-xl p-4 border-2 border-dashed border-dark-700">
          <div className="flex items-center gap-2 text-gray-500">
            <Target className="w-5 h-5" /><span>Meta de Cadência - Em breve</span>
          </div>
        </div>
        <div className="bg-dark-900/50 rounded-xl p-4 border-2 border-dashed border-dark-700 mt-3">
          <div className="flex items-center gap-2 text-gray-500">
            <Users className="w-5 h-5" /><span>Batalha de Equipes - Em breve</span>
          </div>
        </div>
      </div>
    </div>
  );
}
