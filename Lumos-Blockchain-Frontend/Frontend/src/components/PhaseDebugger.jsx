import { useState, useEffect } from 'react'
import { useBlockchain } from '../context/BlockchainContext'

export default function PhaseDebugger() {
  const { currentPhase, isConnected } = useBlockchain()
  const [phaseHistory, setPhaseHistory] = useState([])
  const [localPhase, setLocalPhase] = useState(null)

  useEffect(() => {
    if (isConnected && currentPhase) {
      setPhaseHistory(prev => [
        ...prev, 
        { 
          phase: currentPhase, 
          timestamp: new Date().toISOString() 
        }
      ].slice(-10)) // Keep only the last 10 phase changes
      
      // Also show localStorage phase for debug
      try {
        const local = localStorage.getItem('lumos_phase_update');
        if (local) setLocalPhase(JSON.parse(local).phase);
      } catch {}

      console.log(`[PhaseDebugger] Phase changed to: ${currentPhase} at ${new Date().toLocaleTimeString()}`)
    }
  }, [currentPhase, isConnected])
  
  if (!isConnected) return null
  
  return (
    <div className="fixed bottom-4 left-4 z-50">
      <div className="bg-black bg-opacity-80 text-green-400 p-2 rounded text-xs font-mono">
        Current Phase: {currentPhase}
        {localPhase && <div className="text-yellow-400">LocalStorage: {localPhase}</div>}
      </div>
      
      {/* Click to expand phase history */}
      <details className="mt-1">
        <summary className="bg-black bg-opacity-80 text-white p-1 rounded text-xs cursor-pointer">
          Phase History
        </summary>
        <div className="mt-1 bg-black bg-opacity-80 p-2 rounded max-h-40 overflow-y-auto">
          {phaseHistory.map((entry, i) => (
            <div key={i} className="text-xs text-gray-300 mb-1">
              <span className="text-yellow-400">{new Date(entry.timestamp).toLocaleTimeString()}</span>: {entry.phase}
            </div>
          ))}
        </div>
      </details>
    </div>
  )
}
