import React, { useState, useEffect } from 'react';
import { Activity, Timer, Target, TrendingUp, CheckCircle } from 'lucide-react';

const API_URL = 'http://localhost:8000';

export default function FTPTestScreen({ ftpTestData, onClose }) {
  const [testStatus, setTestStatus] = useState(null);
  const [results, setResults] = useState(null);

  // Fetch status periodically when test is active
  useEffect(() => {
    if (!ftpTestData?.active) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/game/ftp-test/status`);
        if (res.ok) {
          const data = await res.json();
          setTestStatus(data);
        }
      } catch (err) {
        console.error('Error fetching FTP test status:', err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 1000);
    return () => clearInterval(interval);
  }, [ftpTestData?.active]);

  // Handle test results
  useEffect(() => {
    if (ftpTestData?.results) {
      setResults(ftpTestData.results);
    }
  }, [ftpTestData?.results]);

  if (!ftpTestData?.active && !results) return null;

  // Show results screen
  if (results && results.length > 0) {
    return (
      <div className="fixed inset-0 bg-dark-900/95 flex flex-col items-center justify-center z-50">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <h1 className="text-4xl font-extrabold text-white">TESTE FTP CONCLUÍDO</h1>
          </div>
          <p className="text-xl text-gray-400">Os valores de FTP foram atualizados</p>
        </div>

        <div className="w-full max-w-4xl px-8">
          <div className="space-y-4">
            {results.map((r, i) => (
              <div
                key={r.device}
                className="flex items-center p-6 rounded-xl bg-dark-800 border border-dark-700"
              >
                <div className="flex-1">
                  <span className="text-2xl font-bold text-white">{r.student_name}</span>
                  <span className="text-sm text-gray-500 ml-3">({r.device})</span>
                </div>
                <div className="text-center px-8">
                  <div className="text-sm text-gray-400 mb-1">Potência Média</div>
                  <div className="text-3xl font-bold text-primary-400">{r.avg_power}W</div>
                </div>
                <div className="text-center px-8 border-l border-dark-600">
                  <div className="text-sm text-gray-400 mb-1">Novo FTP</div>
                  <div className="text-4xl font-extrabold text-green-400">{r.calculated_ftp}W</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => {
            setResults(null);
            onClose?.();
          }}
          className="mt-8 px-8 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-bold text-lg transition-all"
        >
          Fechar
        </button>
      </div>
    );
  }

  // Active test screen
  const duration = testStatus?.duration || ftpTestData?.duration || 1200;
  const elapsed = testStatus?.elapsed || 0;
  const remaining = testStatus?.remaining || duration;
  const progress = duration > 0 ? (elapsed / duration) * 100 : 0;
  const participants = testStatus?.participants || [];

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-dark-900/95 flex flex-col items-center justify-center z-50">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Activity className="w-12 h-12 text-orange-400 animate-pulse" />
          <h1 className="text-5xl font-extrabold text-white">TESTE DE FTP</h1>
          <Activity className="w-12 h-12 text-orange-400 animate-pulse" />
        </div>
        <p className="text-lg text-gray-400">20 minutos all-out • FTP = Média × 0.95</p>
      </div>

      {/* Timer */}
      <div className="flex items-center justify-center gap-4 text-white mb-4">
        <Timer className="w-10 h-10 text-orange-400" />
        <span className="text-7xl font-bold tabular-nums">
          {formatTime(remaining)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-96 h-4 bg-dark-700 rounded-full overflow-hidden mx-auto mb-8">
        <div 
          className="h-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Participants */}
      <div className="w-full max-w-5xl px-8">
        <h2 className="text-xl font-bold text-gray-400 mb-4 text-center flex items-center justify-center gap-2">
          <Target className="w-5 h-5" />
          Participantes ({participants.length})
        </h2>
        
        {participants.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg">Aguardando dados das bikes...</p>
            <p className="text-gray-600 text-sm mt-2">Comece a pedalar para registrar!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {participants.map((p) => (
              <div
                key={p.device}
                className="bg-dark-800 rounded-xl p-4 border border-dark-700"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-lg font-bold text-white truncate">{p.student_name}</span>
                  <span className="text-xs text-gray-500">{p.device}</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Atual</div>
                    <div className="text-xl font-bold text-primary-400">{p.current_power}W</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">Média</div>
                    <div className="text-xl font-bold text-blue-400">{p.avg_power}W</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">FTP Est.</div>
                    <div className="text-xl font-bold text-green-400">{p.projected_ftp}W</div>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-600">
                  <TrendingUp className="w-3 h-3" />
                  <span>{p.samples_count} amostras</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
