import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { testApiConnectivity } from './utils/offlineMode'
import { initializePhaseSynchronization } from './utils/phaseSync'

// Check API connectivity early
testApiConnectivity()
  .then(isConnected => {
    console.log(`Application starting in ${isConnected ? 'online' : 'offline'} mode`);
  })
  .catch(err => {
    console.warn('Error during connectivity check:', err);
  });

// Initialize phase synchronization
initializePhaseSynchronization();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
