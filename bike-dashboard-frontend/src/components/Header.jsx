import { Wifi, WifiOff, UserPlus, RotateCcw, Trash2 } from 'lucide-react'
import logo from '../public/logo.png'

const Header = ({ totalBikes, activeBikes, isConnected, onOpenStudentModal, onResetAssignments, onDeleteAllBikes }) => {
  const handleReset = () => {
    if (confirm('Deseja realmente desvincular todos os alunos das bikes?\nIsso é útil ao trocar de turma.')) {
      onResetAssignments?.()
    }
  }

  const handleDeleteBikes = () => {
    if (confirm('Deseja realmente deletar TODAS as bikes do sistema?\n\nIsso irá remover todas as bikes e seus vínculos.\nOs alunos cadastrados serão mantidos.')) {
      onDeleteAllBikes?.()
    }
  }

  return (
    <header className="bg-dark-900/95 backdrop-blur-md border-b border-primary-500/20 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo, Título e Botões */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Abitah" className="w-12 h-12 object-contain" />
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide">
                  ABITAH <span className="text-primary-400">SPINNING</span>
                </h1>
                <p className="text-xs text-primary-500/70 font-semibold tracking-widest uppercase">Ranking em Tempo Real</p>
              </div>
            </div>

            {/* Botões Navbar */}
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={onOpenStudentModal}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 hover:border-primary-500/50 hover:bg-dark-700 transition-all text-sm"
                title="Cadastrar Alunos"
              >
                <UserPlus className="w-4 h-4 text-primary-400" />
                <span className="text-gray-300 hidden sm:inline">Alunos</span>
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 hover:border-yellow-500/50 hover:bg-dark-700 transition-all text-sm"
                title="Resetar todos os vínculos (trocar turma)"
              >
                <RotateCcw className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-300 hidden sm:inline">Resetar Vínculos</span>
              </button>
              <button
                onClick={handleDeleteBikes}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800 border border-dark-700 hover:border-red-500/50 hover:bg-dark-700 transition-all text-sm"
                title="Deletar todas as bikes do sistema"
              >
                <Trash2 className="w-4 h-4 text-red-400" />
                <span className="text-gray-300 hidden sm:inline">Deletar Bikes</span>
              </button>
            </div>
          </div>

          {/* Status e Métricas */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-3xl font-extrabold text-primary-400">
                {activeBikes}<span className="text-gray-500">/</span>{totalBikes}
              </div>
              <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Bikes Ativas</div>
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800 border border-dark-700">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-400 animate-pulse" />
                  <span className="text-xs text-green-400 font-medium">Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-400" />
                  <span className="text-xs text-red-400 font-medium">Desconectado</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
