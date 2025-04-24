import { useState, useEffect } from 'react';
import { useBlockchain } from '../context/BlockchainContext';

export default function PhaseTracker() {
  const { isConnected, currentPhase, grantManager } = useBlockchain();
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [phaseInfo, setPhaseInfo] = useState(null);
  const [localPhase, setLocalPhase] = useState(null);
  
  // Poll for phase changes every 5 seconds
  useEffect(() => {
    if (!isConnected || !grantManager) return;
    
    const checkPhase = async () => {
      try {
        if (grantManager && typeof grantManager.validatePhase === 'function') {
          const validation = await grantManager.validatePhase();
          console.log("Phase validation:", validation);
          setPhaseInfo({
            phaseNumber: validation[0].toString(),
            phaseName: validation[1],
            timestamp: new Date(validation[2].toNumber() * 1000).toLocaleString(),
          });
          setLastUpdate(new Date());
        } else {
          console.log("validatePhase function not available, using currentPhase directly");
          setPhaseInfo({
            phaseNumber: currentPhase,
            phaseName: "Unknown",
            timestamp: new Date().toLocaleString(),
          });
        }
      } catch (err) {
        console.warn("Failed to validate phase:", err);
        setPhaseInfo({
          phaseNumber: currentPhase,
          phaseName: "Unknown",
          timestamp: new Date().toLocaleString(),
        });
      }
    };
    
    // Check immediately on component mount
    checkPhase();
    
    try {
      const local = localStorage.getItem('lumos_phase_update');
      if (local) setLocalPhase(JSON.parse(local).phase);
    } catch {}
    
    // Set up polling
    const interval = setInterval(checkPhase, 5000);
    return () => clearInterval(interval);
  }, [isConnected, grantManager]);
  
  if (!isConnected || !phaseInfo) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 bg-black bg-opacity-80 text-xs text-green-400 p-2 rounded font-mono">
      <div>Contract Phase: {phaseInfo.phaseName} ({phaseInfo.phaseNumber})</div>
      <div>UI Phase: {currentPhase}</div>
      {localPhase && <div>LocalStorage: {localPhase}</div>}
      <div>Last changed: {phaseInfo.timestamp}</div>
      <div className="text-gray-400 text-[10px] mt-1">
        Last checked: {lastUpdate.toLocaleTimeString()}
      </div>
    </div>
  );
}
