import { 
  Gauge, 
  Zap, 
  Activity, 
  Timer, 
  TrendingUp,
  Route,
  Heart,
  Clock,
  Edit2
} from 'lucide-react'
import { useState, useEffect } from 'react'

const BikeCard = ({ bike }) => {
  // Estado para edição do nome
  const [isEditing, setIsEditing] = useState(false)
  const [customName, setCustomName] = useState('')

  // Carrega nome personalizado do localStorage
  useEffect(() => {
    const savedName = localStorage.getItem(`bike_name_${bike.device}`)
    if (savedName) {
      setCustomName(savedName)
    }
  }, [bike.device])

  // Verifica se a bike está ativa (recebeu dados nos últimos 10 segundos)
  const isActive = () => {
    if (!bike.last_update) return false
    const lastUpdate = new Date(bike.last_update)
    const now = new Date()
    return (now - lastUpdate) < 10000
  }

  const active = isActive()

  // Retorna o nome da bike (personalizado ou padrão)
  const getBikeName = () => {
    if (customName) return customName
    
    if (!bike.device) return 'Bike'
    
    // Extrai números do nome do device
    const numbers = bike.device.match(/\d+/)
    
    if (numbers) {
      return `Bike ${numbers[0]}`
    }
    
    return bike.device
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  // Salva o nome personalizado
  const handleSaveName = () => {
    if (customName.trim()) {
      localStorage.setItem(`bike_name_${bike.device}`, customName.trim())
    }
    setIsEditing(false)
  }

  // Cancela a edição
  const handleCancelEdit = () => {
    const savedName = localStorage.getItem(`bike_name_${bike.device}`)
    setCustomName(savedName || '')
    setIsEditing(false)
  }

  // Gerencia teclas no input
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveName()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  // Calcula velocidade aproximada: distância (m) / tempo (s) * 3.6 = km/h
  const calculateSpeed = () => {
    if (!bike.total_distance || !bike.elapsed_time || bike.elapsed_time === 0) return null
    // Distância está em metros, tempo em segundos
    // Velocidade = (distância / tempo) * 3.6 para converter m/s em km/h
    const speedMps = bike.total_distance / bike.elapsed_time
    return speedMps * 3.6
  }

  const avgSpeed = calculateSpeed()

  // Formata valores com fallback
  const formatValue = (value, decimals = 1, unit = '') => {
    if (value === undefined || value === null) return '--'
    return `${Number(value).toFixed(decimals)}${unit}`
  }

  const formatTime = (seconds) => {
    if (!seconds) return '--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className={`card-bike ${active ? 'ring-2 ring-primary-500/30' : ''}`}>
      {/* Header do Card */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSaveName}
              className="text-lg font-bold text-white bg-dark-800 border border-primary-500 rounded px-2 py-1 w-full focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Nome da bike"
              autoFocus
            />
          ) : (
            <div 
              onClick={() => setIsEditing(true)}
              className="cursor-pointer group"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white truncate group-hover:text-primary-400 transition-colors">
                  {getBikeName()}
                </h3>
                <Edit2 className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${active ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`}></div>
            <span className={`text-xs ${active ? 'text-green-400' : 'text-gray-500'}`}>
              {active ? 'Ativa' : 'Inativa'}
            </span>
          </div>
        </div>
        <Activity className={`w-6 h-6 ${active ? 'text-primary-500' : 'text-gray-600'}`} />
      </div>

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Velocidade Instantânea */}
        <MetricBox
          icon={<Gauge className="w-4 h-4" />}
          label="Vel. Inst."
          value={formatValue(bike.instant_speed, 1, ' km/h')}
          active={active}
        />

        {/* Velocidade Média Calculada */}
        <MetricBox
          icon={<TrendingUp className="w-4 h-4" />}
          label="Vel. Média"
          value={formatValue(avgSpeed, 1, ' km/h')}
          active={active}
        />

        {/* Potência */}
        <MetricBox
          icon={<Zap className="w-4 h-4" />}
          label="Potência"
          value={formatValue(bike.instant_power, 0, ' W')}
          active={active}
        />

        {/* Cadência */}
        <MetricBox
          icon={<Activity className="w-4 h-4" />}
          label="Cadência"
          value={formatValue(bike.instant_cadence, 0, ' rpm')}
          active={active}
        />

        {/* Distância */}
        <MetricBox
          icon={<Route className="w-4 h-4" />}
          label="Distância"
          value={formatValue(bike.total_distance ? bike.total_distance / 1000 : null, 2, ' km')}
          active={active}
        />
      </div>

      {/* Métricas Secundárias */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-dark-700">
        {bike.heart_rate && (
          <SmallMetric
            icon={<Heart className="w-3 h-3" />}
            value={bike.heart_rate}
            unit="bpm"
            active={active}
          />
        )}
        
        {bike.elapsed_time && (
          <SmallMetric
            icon={<Clock className="w-3 h-3" />}
            value={formatTime(bike.elapsed_time)}
            unit=""
            active={active}
          />
        )}

        {bike.total_energy && (
          <SmallMetric
            icon={<Zap className="w-3 h-3" />}
            value={bike.total_energy}
            unit="kcal"
            active={active}
          />
        )}
      </div>
    </div>
  )
}

// Componente para métricas principais
const MetricBox = ({ icon, label, value, active }) => (
  <div className="bg-dark-900/50 rounded-lg p-3 border border-dark-700">
    <div className="flex items-center gap-2 mb-1">
      <div className={`${active ? 'text-primary-500' : 'text-gray-600'}`}>
        {icon}
      </div>
      <span className="metric-label">{label}</span>
    </div>
    <div className={`text-xl font-bold ${active ? 'text-primary-400' : 'text-gray-600'}`}>
      {value}
    </div>
  </div>
)

// Componente para métricas pequenas
const SmallMetric = ({ icon, value, unit, active }) => (
  <div className="flex items-center gap-1 text-xs">
    <div className={`${active ? 'text-primary-500' : 'text-gray-600'}`}>
      {icon}
    </div>
    <span className={`font-semibold ${active ? 'text-gray-300' : 'text-gray-600'}`}>
      {value} <span className="text-gray-500">{unit}</span>
    </span>
  </div>
)

export default BikeCard
