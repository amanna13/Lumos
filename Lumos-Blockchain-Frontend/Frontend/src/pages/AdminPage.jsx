import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBlockchain } from '../context/BlockchainContext';

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { 
    isConnected, 
    isOwner, 
    isAdmin,
    currentPhase, 
    connect, 
    proposals,
    advancePhase,
    revertToPreviousPhase,
    setPhaseDirectly,
    runGroqShortlisting
  } = useBlockchain();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionType, setActionType] = useState('');
  const [manualPhase, setManualPhase] = useState('');
  const [debugMode, setDebugMode] = useState(false);
  const [contractInfo, setContractInfo] = useState({});
  const [contractDebug, setContractDebug] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  
  // Added for better debugging
  const [authStatus, setAuthStatus] = useState({
    token: null,
    isConnected: false,
    isOwner: false,
    isAdmin: false,
    queryParams: {}
  });
  
  // Sample access code - in a real app, this would be securely stored/generated
  const ADMIN_ACCESS_CODE = "lumos123";
  
  // Check authentication on load
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = localStorage.getItem('adminAuthToken');
    
    // Update status for debugging
    setAuthStatus({
      token,
      isConnected,
      isOwner,
      isAdmin,
      queryParams: Object.fromEntries(params.entries()),
      timestamp: new Date().toISOString()
    });
    
    // Debug log for troubleshooting
    console.log("Admin authentication status:", {
      token,
      isConnected,
      isOwner,
      isAdmin,
      queryParams: Object.fromEntries(params.entries()),
      timestamp: new Date().toISOString()
    });
    
  }, [isConnected, isOwner, isAdmin, location]);
  
  const handleAccessCodeSubmit = (e) => {
    e.preventDefault();
    
    console.log("Access code submission attempt:", accessCode === ADMIN_ACCESS_CODE ? "Valid" : "Invalid");
    
    if (accessCode === ADMIN_ACCESS_CODE) {
      const token = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('adminAuthToken', token);
      setSuccess('Authentication successful! Reloading admin dashboard...');
      
      // Force a reload of the page to trigger authentication check
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } else {
      setError('Invalid access code. Please try again.');
    }
  };
  
  const forceAuthorization = () => {
    // For emergency access (only in development)
    const token = `emergency-${Date.now()}`;
    localStorage.setItem('adminAuthToken', token);
    window.location.href = '/admin-dashboard?adminAccess=true';
  };
  
  // For direct login without an existing token
  if (!localStorage.getItem('adminAuthToken')) {
    return (
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-md">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold">Admin Authentication</h1>
              <p className="text-slate-600 dark:text-slate-300 mt-2">
                Enter your access code to continue
              </p>
            </div>
            
            {error && (
              <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <p>{error}</p>
              </div>
            )}
            
            {success && (
              <div className="mb-6 p-4 bg-green-100 border-l-4 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-300">
                <p>{success}</p>
              </div>
            )}
            
            <form onSubmit={handleAccessCodeSubmit} className="mb-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Access Code
                </label>
                <input
                  type="password"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700"
                  required
                />
              </div>
              
              <button
                type="submit"
                className="w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Access Dashboard
              </button>
            </form>
            
            <div className="flex justify-between items-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Return to Home
              </button>
              
              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={forceAuthorization}
                  className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Emergency Access (Dev Only)
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Show connection prompt if wallet not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-lg text-center">
          <h1 className="text-3xl font-bold mb-6">Connect Wallet</h1>
          <p className="text-slate-600 dark:text-slate-300 mb-8">
            Please connect your wallet to access the admin dashboard.
          </p>
          <button 
            onClick={connect}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
          >
            Connect Wallet
          </button>
          
          <div className="mt-8">
            <button
              onClick={() => {
                localStorage.removeItem('adminAuthToken');
                window.location.reload();
              }}
              className="text-sm text-red-600 hover:underline"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto max-w-6xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-300">
              Manage the grant application system and control the phases of the process.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-500">
              {isOwner ? (
                <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full">
                  <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                  Owner Access
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                  <span className="w-2 h-2 mr-1 bg-yellow-500 rounded-full"></span>
                  Limited Access
                </span>
              )}
            </div>
            <button
              onClick={() => {
                localStorage.removeItem('adminAuthToken');
                navigate('/');
              }}
              className="px-3 py-1 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-sm"
            >
              Log Out
            </button>
          </div>
        </div>
        
        {/* ...existing admin dashboard content... */}
      </div>
    </div>
  );
}
