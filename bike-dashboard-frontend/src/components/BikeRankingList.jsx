import { useState, useMemo } from 'react'
import { Trophy, Bike, Pencil, Check, X, User, Star } from 'lucide-react'
import ZoneIndicator from './ZoneIndicator'
import WkgBadge from './WkgBadge'

const API_URL = 'http://localhost:8000'

const MEDAL_STYLES = [
  'ranking-gold',
  'ranking-silver',
  'ranking-bronze',
]

const MEDAL_COLORS = [
  'text-yellow-400',
  'text-gray-300',
  'text-amber-600',
]

const BikeRankingList = ({ bikes, assignments, onClickBike, onDisplayNameUpdated }) => {
  const [editingDevice, setEditingDevice] = useState(null)
  const [editValue, setEditValue] = useState('')

  // Separar bikes com aluno (competição) e sem aluno, ordenar por distância
  const { ranked, unassigned } = useMemo(() => {
    const bikeArray = Object.values(bikes)
    const getDistance = (bike) => bike.class_distance_m !== undefined ? bike.class_distance_m : bike.total_distance
    const withStudent = bikeArray
      .filter(b => assignments[b.device])
      .sort((a, b) => (getDistance(b) || 0) - (getDistance(a) || 0))
    const withoutStudent = bikeArray
      .filter(b => !assignments[b.device])
      .sort((a, b) => (getDistance(b) || 0) - (getDistance(a) || 0))
    return { ranked: withStudent, unassigned: withoutStudent }
  }, [bikes, assignments])

  const isActive = (bike) => {
    if (!bike.last_update) return false
    const lastUpdate = new Date(bike.last_update)
    const now = new Date()
    return (now - lastUpdate) < 10000
  }

  const getDisplayName = (bike) => {
    return bike.display_name || bike.device
  }

  const startEditing = (e, device, currentName) => {
    e.stopPropagation()
    setEditingDevice(device)
    setEditValue(currentName)
  }

  const cancelEditing = (e) => {
    e.stopPropagation()
    setEditingDevice(null)
    setEditValue('')
  }

  const saveDisplayName = async (e, device) => {
    e.stopPropagation()
    const trimmed = editValue.trim()
    if (!trimmed) return

    try {
      const res = await fetch(`${API_URL}/api/bikes/${encodeURIComponent(device)}/display-name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: trimmed }),
      })
      if (res.ok) {
        onDisplayNameUpdated?.()
      }
    } catch (err) {
      console.error('Erro ao atualizar display name:', err)
    }
    setEditingDevice(null)
    setEditValue('')
  }

  const handleKeyDown = (e, device) => {
    if (e.key === 'Enter') saveDisplayName(e, device)
    if (e.key === 'Escape') cancelEditing(e)
  }

  const renderBikeRow = (bike, index, isRanked) => {
    const assignment = assignments[bike.device]
    const active = isActive(bike)
    const medalClass = isRanked && index < 3 ? MEDAL_STYLES[index] : ''
    const medalColor = isRanked && index < 3 ? MEDAL_COLORS[index] : 'text-gray-500'

    return (
      <div
        key={bike.device}
        className={`ranking-row ${medalClass} ${!isRanked ? 'ranking-row-unassigned' : ''} cursor-pointer`}
        onClick={() => onClickBike?.(bike.device)}
      >
        {/* Posição */}
        <div className="ranking-position">
          {isRanked ? (
            index < 3 ? (
              <Trophy className={`w-10 h-10 mx-auto ${medalColor} drop-shadow-lg`} />
            ) : (
              <span className="text-gray-400">{index + 1}º</span>
            )
          ) : (
            <span className="text-gray-600">—</span>
          )}
        </div>

        {/* Aluno + Bike */}
        <div className="flex-1 min-w-0 ml-2">
          {assignment ? (
            <div className="flex items-center gap-2">
              <div className="ranking-student-name truncate">
                {assignment.student_name}
              </div>
              {/* Student level badge with progress */}
              {bike.gamification?.student_level && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-primary-500/20 to-yellow-500/10 rounded-full border border-primary-500/30">
                  <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400/50" />
                  <span className="text-xs font-bold text-primary-300">Nv.{bike.gamification.student_level}</span>
                  {bike.gamification.student_title && (
                    <span className="text-xs text-gray-400 hidden sm:inline">• {bike.gamification.student_title}</span>
                  )}
                  {/* Mini XP progress bar */}
                  {bike.gamification.xp_progress !== undefined && (
                    <div className="w-12 h-1.5 bg-dark-700 rounded-full overflow-hidden ml-1 hidden md:block">
                      <div 
                        className="h-full bg-gradient-to-r from-primary-500 to-yellow-500 transition-all duration-300"
                        style={{ width: `${Math.round(bike.gamification.xp_progress * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="ranking-student-name text-gray-500 truncate">
              Sem aluno vinculado
            </div>
          )}

          <div className="flex items-center gap-2 mt-0.5">
            {/* Status indicator */}
            <div className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />

            {/* Display name editável */}
            {editingDevice === bike.device ? (
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, bike.device)}
                  className="bg-dark-900 border border-primary-500 rounded px-2 py-0.5 text-sm text-white focus:outline-none w-40"
                  autoFocus
                />
                <button
                  onClick={(e) => saveDisplayName(e, bike.device)}
                  className="p-1 hover:bg-green-500/20 rounded"
                >
                  <Check className="w-3.5 h-3.5 text-green-400" />
                </button>
                <button
                  onClick={cancelEditing}
                  className="p-1 hover:bg-red-500/20 rounded"
                >
                  <X className="w-3.5 h-3.5 text-red-400" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group">
                <Bike className="w-3.5 h-3.5 text-gray-500" />
                <span className="ranking-bike-name">{getDisplayName(bike)}</span>
                <button
                  onClick={(e) => startEditing(e, bike.device, getDisplayName(bike))}
                  className="p-0.5 hover:bg-dark-700 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Editar nome da bike"
                >
                  <Pencil className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Gamification - Zone and W/kg */}
        {bike.gamification && (
          <div className="flex items-center gap-3 mr-4 shrink-0">
            {bike.gamification.current_zone && (
              <ZoneIndicator 
                zone={bike.gamification.current_zone} 
                ftpPercent={bike.gamification.ftp_percent}
                compact={true}
              />
            )}
            {bike.gamification.current_wkg !== undefined && bike.gamification.current_wkg > 0 && (
              <WkgBadge 
                wkg={bike.gamification.current_wkg} 
                size="sm" 
                showStars={false}
              />
            )}
          </div>
        )}

        {/* Métricas */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="ranking-metric">
            <div className="ranking-metric-value">{bike.instant_cadence || 0}</div>
            <div className="ranking-metric-label">RPM</div>
          </div>
          <div className="ranking-metric">
            <div className="ranking-metric-value">{bike.instant_power || 0}</div>
            <div className="ranking-metric-label">Watts</div>
          </div>
          <div className="ranking-metric">
            <div className="ranking-metric-value">{bike.instant_speed || 0}</div>
            <div className="ranking-metric-label">Km/h</div>
          </div>
          <div className="ranking-metric ranking-metric-distance min-w-[120px] bg-primary-500/10 rounded-xl py-2">
            <div className="ranking-metric-value">
              {bike.class_distance_m !== undefined 
                ? ((bike.class_distance_m || 0) / 1000).toFixed(2)
                : ((bike.total_distance || 0) / 1000).toFixed(2)}
            </div>
            <div className="ranking-metric-label text-primary-500">Km</div>
          </div>
        </div>
      </div>
    )
  }

  if (Object.keys(bikes).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Bike className="w-16 h-16 mb-4 text-gray-600" />
        <p className="text-xl font-semibold">Nenhuma bike conectada</p>
        <p className="text-sm mt-1">Aguardando dados das bicicletas...</p>
      </div>
    )
  }

  return (
    <div className="bg-dark-800/60 backdrop-blur-sm border border-primary-500/15 rounded-2xl overflow-hidden shadow-2xl shadow-primary-900/20">
      {/* Header da tabela */}
      <div className="flex items-center px-6 py-3 bg-primary-500/10 border-b-2 border-primary-500/30 text-sm uppercase tracking-wider text-primary-400/80 font-bold">
        <div className="w-20 text-center shrink-0">#</div>
        <div className="flex-1 ml-2">Aluno / Bike</div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="text-center px-4 min-w-[100px]">RPM</div>
          <div className="text-center px-4 min-w-[100px]">Watts</div>
          <div className="text-center px-4 min-w-[100px]">Km/h</div>
          <div className="text-center px-4 min-w-[120px]">Distância</div>
        </div>
      </div>

      {/* Bikes com aluno (ranking) */}
      {ranked.map((bike, i) => renderBikeRow(bike, i, true))}

      {/* Separador se houver bikes sem aluno */}
      {unassigned.length > 0 && ranked.length > 0 && (
        <div className="flex items-center gap-3 px-6 py-3 bg-dark-900/60 border-y border-dark-700/50">
          <User className="w-4 h-4 text-gray-600" />
          <span className="text-sm text-gray-600 uppercase tracking-wider font-bold">
            Sem aluno vinculado
          </span>
        </div>
      )}

      {/* Bikes sem aluno */}
      {unassigned.map((bike, i) => renderBikeRow(bike, i, false))}
    </div>
  )
}

export default BikeRankingList
