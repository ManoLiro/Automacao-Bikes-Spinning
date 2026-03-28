import { useState, useEffect, useCallback } from 'react'
import { Zap } from 'lucide-react'
import Header from './components/Header'
import BikeRankingList from './components/BikeRankingList'
import StudentRegistrationModal from './components/StudentRegistrationModal'
import StudentSelectModal from './components/StudentSelectModal'
import SprintScreen from './components/SprintScreen'
import FTPTestScreen from './components/FTPTestScreen'
import InstructorPanel from './components/InstructorPanel'
import LevelUpNotification from './components/LevelUpNotification'
import PersonalRecordToastContainer from './components/PersonalRecordToast'
import BadgeEarnedToastContainer from './components/BadgeEarnedToast'
import ClassSummaryScreen from './components/ClassSummaryScreen'
import useWebSocket from './hooks/useWebSocket'

// URL do backend
const WS_URL = 'ws://localhost:8000/ws'
const API_URL = 'http://localhost:8000'

function App() {
  const [bikes, setBikes] = useState({})
  const [assignments, setAssignments] = useState({})
  const { isConnected, lastMessage } = useWebSocket(WS_URL)

  // Modais
  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [selectModalOpen, setSelectModalOpen] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [instructorPanelOpen, setInstructorPanelOpen] = useState(false)
  
  // Game state
  const [gameState, setGameState] = useState(null)
  
  // FTP Test state
  const [ftpTestData, setFtpTestData] = useState(null)
  
  // Level up notifications
  const [levelUpNotification, setLevelUpNotification] = useState(null)
  
  // Personal record notifications (queue)
  const [personalRecords, setPersonalRecords] = useState([])
  
  // Badge earned notifications (queue)
  const [badgesEarned, setBadgesEarned] = useState([])
  
  // Class summary state
  const [showClassSummary, setShowClassSummary] = useState(false)
  const [summarySessionId, setSummarySessionId] = useState(null)

  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage)
        
        if (data.type === 'initial') {
          setBikes(data.bikes || {})
          setAssignments(data.assignments || {})
        } else if (data.type === 'update') {
          setBikes(prev => ({
            ...prev,
            [data.device]: {
              ...data.data,
              gamification: data.gamification
            }
          }))
        } else if (data.type === 'assignments') {
          setAssignments(data.assignments || {})
        } else if (data.type === 'game_state') {
          setGameState(data.state || null)
        } else if (data.type === 'event' && data.event === 'level_up') {
          // Handle level up event
          setLevelUpNotification(data.data)
        } else if (data.type === 'ftp_test_start') {
          // FTP test started
          setFtpTestData({
            active: true,
            duration: data.duration,
            start_time: data.start_time
          })
        } else if (data.type === 'ftp_test_end') {
          // FTP test ended with results
          setFtpTestData({
            active: false,
            results: data.results
          })
        }else if (data.type === 'event' && data.event === 'personal_record') {
          // Handle personal record event - add to queue
          setPersonalRecords(prev => [...prev, data.data])
        } else if (data.type === 'event' && data.event === 'badge_earned') {
          // Handle badge earned event - add to queue
          setBadgesEarned(prev => [...prev, data.data])
        } else if (data.type === 'event' && data.event === 'class_ended') {
          // Handle class ended event - show summary
          setSummarySessionId(data.data.session_id)
          setShowClassSummary(true)
        }
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error)
      }
    }
  }, [lastMessage])
  
  // Dismiss personal record from queue
  const handleDismissRecord = useCallback((index) => {
    setPersonalRecords(prev => prev.filter((_, i) => i !== index))
  }, [])
  
  // Dismiss badge earned from queue
  const handleDismissBadge = useCallback((index) => {
    setBadgesEarned(prev => prev.filter((_, i) => i !== index))
  }, [])

  const activeBikesCount = Object.values(bikes).filter(bike => {
    if (!bike.last_update) return false
    const lastUpdate = new Date(bike.last_update)
    const now = new Date()
    return (now - lastUpdate) < 10000
  }).length

  // Clique na bike → abrir modal de seleção de aluno
  const handleClickBike = (device) => {
    setSelectedDevice(device)
    setSelectModalOpen(true)
  }

  // Resetar todos os vínculos
  const handleResetAssignments = async () => {
    try {
      await fetch(`${API_URL}/api/assignments/reset`, { method: 'POST' })
    } catch (err) {
      console.error('Erro ao resetar vínculos:', err)
    }
  }

  // Deletar todas as bikes
  const handleDeleteAllBikes = async () => {
    try {
      await fetch(`${API_URL}/api/bikes/reset`, { method: 'POST' })
    } catch (err) {
      console.error('Erro ao deletar bikes:', err)
    }
  }

  return (
    <div className="min-h-screen">
      <Header 
        totalBikes={Object.keys(bikes).length}
        activeBikes={activeBikesCount}
        isConnected={isConnected}
        onOpenStudentModal={() => setStudentModalOpen(true)}
        onResetAssignments={handleResetAssignments}
        onDeleteAllBikes={handleDeleteAllBikes}
      />
      <main className="container mx-auto px-4 py-6">
        <BikeRankingList
          bikes={bikes}
          assignments={assignments}
          onClickBike={handleClickBike}
        />
      </main>

      {/* Botão flutuante para Painel do Instrutor */}
      <button
        onClick={() => setInstructorPanelOpen(true)}
        className="fixed bottom-6 right-6 bg-primary-500 hover:bg-primary-600 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 z-40"
        title="Painel do Instrutor"
      >
        <Zap className="w-6 h-6" />
      </button>

      {/* Sprint Screen Overlay */}
      <SprintScreen 
        sprintData={gameState?.sprint} 
        onClose={() => {}}
      />

      {/* FTP Test Screen Overlay */}
      <FTPTestScreen 
        ftpTestData={ftpTestData}
        onClose={() => setFtpTestData(null)}
      />

      {/* Painel do Instrutor */}
      <InstructorPanel
        isOpen={instructorPanelOpen}
        onClose={() => setInstructorPanelOpen(false)}
        isSprintActive={gameState?.sprint?.active || false}
        onSprintStateChange={(active) => {
          setGameState(prev => ({
            ...prev,
            sprint: { ...prev?.sprint, active }
          }))
        }}
        isFtpTestActive={ftpTestData?.active || false}
        onFtpTestStateChange={(active) => {
          if (active) {
            setFtpTestData({ active: true })
          } else {
            // Keep results if they exist
            setFtpTestData(prev => prev?.results ? { ...prev, active: false } : null)
          }
        }}
      />

      {/* Modal de Cadastro de Alunos */}
      <StudentRegistrationModal
        isOpen={studentModalOpen}
        onClose={() => setStudentModalOpen(false)}
        onStudentsChanged={() => {}}
      />

      {/* Modal de Seleção de Aluno para Bike */}
      <StudentSelectModal
        isOpen={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        device={selectedDevice}
        currentAssignment={selectedDevice ? assignments[selectedDevice] : null}
        onOpenRegister={() => setStudentModalOpen(true)}
      />

      {/* Level Up Notification */}
      <LevelUpNotification
        notification={levelUpNotification}
        onClose={() => setLevelUpNotification(null)}
      />
      
      {/* Personal Record Toasts */}
      <PersonalRecordToastContainer
        records={personalRecords}
        onDismiss={handleDismissRecord}
      />
      
      {/* Badge Earned Toasts */}
      <BadgeEarnedToastContainer
        badges={badgesEarned}
        onDismiss={handleDismissBadge}
      />
      
      {/* Class Summary Screen */}
      {showClassSummary && (
        <ClassSummaryScreen 
          sessionId={summarySessionId}
          onClose={() => setShowClassSummary(false)}
        />
      )}
    </div>
  )
}

export default App
