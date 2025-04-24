import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../context/BlockchainContext';
import GroqEvaluationProgress from '../components/GroqEvaluationProgress';
import { isGrantManagerV2 } from '../utils/phaseSync';

export default function AdminDashboard() {
  // Defensive fallback: if context is undefined, use empty object to avoid destructure error
  const blockchain = useBlockchain() || {};
  const {
    account,
    isConnected,
    isOwner,
    isAdmin,
    currentPhase,
    setPhase,
    phaseLoading,
    phaseError,
    runGroqShortlisting,
    groqEvaluationStatus,
    connect
  } = blockchain;

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [manualPhase, setManualPhase] = useState('');
  const [isV2, setIsV2] = useState(false);
  const [proposalsState, setProposalsState] = useState([]);

  // Detect contract version on mount
  useEffect(() => {
    isGrantManagerV2().then(setIsV2);
  }, []);

  // Load proposals when the component mounts
  useEffect(() => {
    async function fetchProposalsFromAPI() {
      setLoading(true);
      setError('');
      try {
        // Always use this API endpoint only
        const response = await fetch('https://lumos-mz9a.onrender.com/evaluation/rankings/top', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store'
          }
        });
        if (!response.ok) throw new Error(`Failed to fetch proposals: ${response.status}`);
        const data = await response.json();
        if (!Array.isArray(data)) throw new Error('Invalid proposals data');
        // Normalize proposals for table display
        const normalized = data.map(p => ({
          ...p,
          id: p.id?.toString() ?? '',
          voteCount: p.voteCount || "0",
          title: p.title || `Proposal ${p.id}`,
          proposer: p.proposer || "Unknown",
          description: p.description || ""
        }));
        setProposalsState(normalized);
      } catch (err) {
        setError(err.message || 'Failed to load proposals');
        setProposalsState([]);
      } finally {
        setLoading(false);
      }
    }

    fetchProposalsFromAPI();
  }, [isConnected]);

  // Handle Groq shortlisting
  const handleRunGroq = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await runGroqShortlisting();
      if (result.success) {
        setSuccess('Groq AI evaluation started successfully. Progress will be displayed below.');
      } else {
        setError(result.message || 'Failed to start Groq evaluation');
      }
    } catch (err) {
      setError(err.message || 'Failed to run Groq shortlisting');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual phase change
  const handleManualPhaseChange = async () => {
    setError('');
    setSuccess('');
    if (!manualPhase || manualPhase === currentPhase) {
      setError('Please select a different phase');
      return;
    }
    // Prevent GroqCheck on V1
    if (!isV2 && (manualPhase === "GroqCheck" || manualPhase === "Groq")) {
      setError('GroqCheck phase is not supported on this contract');
      return;
    }
    try {
      await setPhase(manualPhase);
      // Wait for the phase to actually update in the context
      // Poll for the phase to change (max 3 seconds)
      let tries = 0;
      let updated = false;
      while (tries < 15) {
        await new Promise(res => setTimeout(res, 200));
        if (blockchain.currentPhase === (manualPhase === "Groq" ? "GroqCheck" : manualPhase)) {
          updated = true;
          break;
        }
        tries++;
      }
      if (updated) {
        setSuccess(`Phase changed to ${manualPhase === "Groq" ? "GroqCheck" : manualPhase}`);
      } else {
        setError('Phase change did not complete. Please refresh and try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to change phase');
    }
  };

  // Connect wallet if needed
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
      <div className="container mx-auto max-w-4xl">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-slate-600 dark:text-slate-300">
              Manage the grant application system and view proposals.
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
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Current Status Card */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Current Status</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Current Phase:</span>
                <span className="font-semibold">{currentPhase}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Connected Account:</span>
                <span className="font-semibold truncate max-w-[200px]">{isConnected ? (isOwner ? '👑 ' : '') + `${account?.slice(0, 6)}...${account?.slice(-4)}` : 'Not connected'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Admin Status:</span>
                <span className="font-semibold">{isAdmin ? (isOwner ? 'Owner (Full Access)' : 'Admin Access') : 'Not Admin'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Proposal Count:</span>
                <span className="font-semibold">{proposalsState.length}</span>
              </div>
            </div>
          </div>
          
          {/* Manual Phase Changer Card */}
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Manual Phase Control</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="manualPhase" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Select Phase
                </label>
                <select
                  id="manualPhase"
                  value={manualPhase}
                  onChange={(e) => setManualPhase(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700"
                >
                  <option value="">Select a phase...</option>
                  <option value="Submission">Submission</option>
                  {isV2 && <option value="GroqCheck">GroqCheck</option>}
                  <option value="Voting">Voting</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>
              <button
                onClick={handleManualPhaseChange}
                disabled={phaseLoading || !manualPhase}
                className={`w-full px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  phaseLoading || !manualPhase ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {phaseLoading ? 'Changing Phase...' : 'Change Phase'}
              </button>
              {phaseError && <div className="text-red-600 text-xs mt-2">{phaseError}</div>}
              {error && <div className="text-red-600 text-xs mt-2">{error}</div>}
              {success && <div className="text-green-600 text-xs mt-2">{success}</div>}
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                <p>Current phase: <span className="font-semibold">{currentPhase}</span></p>
                <p className="mt-1">Warning: Changing phases can affect the behavior of the application.</p>
              </div>
            </div>
          </div>
          
          {/* GroqCheck Controls - Only show during GroqCheck phase */}
          {currentPhase === "GroqCheck" && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-bold mb-4">GroqCheck Controls</h2>
              <div className="space-y-4">
                <button 
                  onClick={handleRunGroq}
                  disabled={loading && groqEvaluationStatus === 'running'}
                  className={`w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${loading || groqEvaluationStatus === 'running' ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? 'Starting...' : 
                   groqEvaluationStatus === 'running' ? 'Evaluation In Progress...' : 
                   'Run Groq Shortlisting'}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* GroqCheck Progress - Only show during GroqCheck phase */}
        {currentPhase === "GroqCheck" && (
          <div className="mb-8">
            <GroqEvaluationProgress />
          </div>
        )}
        
        {/* Proposals List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Proposals ({proposalsState.length})</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Title</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Proposer</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Votes</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {proposalsState.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">No proposals found</td>
                  </tr>
                ) : (
                  proposalsState.map((proposal) => (
                    <tr key={proposal.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">{proposal.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 max-w-xs truncate" title={proposal.title}>
                        {proposal.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                        {proposal.proposer && proposal.proposer.substring(0, 6)}...{proposal.proposer && proposal.proposer.substring(38)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 font-semibold">
                        {proposal.voteCount}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Navigation Links */}
        <div className="mt-8 flex justify-center space-x-4">
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-sm"
          >
            Return to Home
          </button>
          
          {currentPhase === "Submission" && (
            <button
              onClick={() => navigate('/submit-proposal')}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded text-sm"
            >
              Submit Proposal
            </button>
          )}
          
          {currentPhase === "Voting" && (
            <button
              onClick={() => navigate('/voting')}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded text-sm"
            >
              View Voting
            </button>
          )}
          
          {currentPhase === "Completed" && (
            <button
              onClick={() => navigate('/results')}
              className="px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded text-sm"
            >
              View Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
