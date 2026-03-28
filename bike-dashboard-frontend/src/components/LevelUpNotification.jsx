import { useState, useEffect } from 'react'
import { Star, TrendingUp, Sparkles } from 'lucide-react'

const LevelUpNotification = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    if (notification) {
      setIsVisible(true)
      setIsExiting(false)

      // Auto-close after 10 seconds
      const timer = setTimeout(() => {
        handleClose()
      }, 10000)

      return () => clearTimeout(timer)
    }
  }, [notification])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      setIsVisible(false)
      onClose?.()
    }, 300)
  }

  if (!notification || !isVisible) return null

  const { student_name, old_level, new_level, title } = notification

  return (
    <div 
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 
        ${isExiting ? 'opacity-0 scale-95 -translate-y-4' : 'opacity-100 scale-100'}`}
    >
      <div className="relative bg-gradient-to-r from-primary-600 via-yellow-500 to-primary-600 rounded-2xl p-1 shadow-2xl shadow-yellow-500/30 animate-pulse">
        <div className="bg-dark-900 rounded-xl px-8 py-6">
          {/* Sparkles decoration */}
          <div className="absolute -top-3 -left-3 animate-bounce">
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="absolute -top-3 -right-3 animate-bounce delay-100">
            <Sparkles className="w-8 h-8 text-yellow-400" />
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 animate-bounce delay-200">
            <Sparkles className="w-6 h-6 text-yellow-400" />
          </div>

          <div className="flex flex-col items-center gap-4">
            {/* Level Up Text */}
            <div className="flex items-center gap-2 text-yellow-400 font-bold text-lg uppercase tracking-widest">
              <TrendingUp className="w-5 h-5" />
              <span>Level Up!</span>
              <TrendingUp className="w-5 h-5 scale-x-[-1]" />
            </div>

            {/* Student Name */}
            <div className="text-white text-xl font-bold">
              {student_name}
            </div>

            {/* Level Display */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                <span className="text-gray-500 text-sm">De</span>
                <div className="flex items-center gap-1 text-gray-400">
                  <Star className="w-5 h-5" />
                  <span className="text-2xl font-bold">{old_level}</span>
                </div>
              </div>

              <div className="text-primary-400 font-bold text-3xl animate-pulse">
                →
              </div>

              <div className="flex flex-col items-center">
                <span className="text-yellow-400 text-sm">Para</span>
                <div className="flex items-center gap-1 text-yellow-400">
                  <Star className="w-6 h-6 fill-yellow-400" />
                  <span className="text-3xl font-bold">{new_level}</span>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="bg-primary-500/20 px-4 py-2 rounded-full">
              <span className="text-primary-400 font-bold text-lg">
                {title}
              </span>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-2 right-2 text-gray-500 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

export default LevelUpNotification
