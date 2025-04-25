import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBlockchain } from '../context/BlockchainContext';
import GroqEvaluationProgress from '../components/GroqEvaluationProgress';
import { isGrantManagerV2, fetchCurrentPhaseFromContract } from '../utils/phaseSync';

const ADMIN_ACCESS_CODE = "lumos123";

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
    connect,
    clearVote,
    resetAllVotes
  } = blockchain;

  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [manualPhase, setManualPhase] = useState('');
  const [isV2, setIsV2] = useState(false);
  const [proposalsState, setProposalsState] = useState([]);
  const [isResettingBlockchain, setIsResettingBlockchain] = useState(false);
  const [userToReset, setUserToReset] = useState('');
  const [resetCompleted, setResetCompleted] = useState(0);
  const [resetFailed, setResetFailed] = useState(0);
  const [resetAllLoading, setResetAllLoading] = useState(false);
  const [resetAllError, setResetAllError] = useState('');
  const [resetAllSuccess, setResetAllSuccess] = useState('');

  // Add state for phase control
  const [phaseChangeLoading, setPhaseChangeLoading] = useState(false);
  const [phaseChangeError, setPhaseChangeError] = useState('');
  const [phaseChangeSuccess, setPhaseChangeSuccess] = useState('');

  // List of phases in order
  const PHASES = [
    { value: "Submission", label: "Submission" },
    { value: "GroqCheck", label: "GroqCheck" },
    { value: "Voting", label: "Voting" },
    { value: "Completed", label: "Completed" }
  ];

  // Determine current and next phase
  const currentPhaseIndex = PHASES.findIndex(p => (p.value.toLowerCase() === (currentPhase || '').toLowerCase()));
  const nextPhase = currentPhaseIndex >= 0 && currentPhaseIndex < PHASES.length - 1
    ? PHASES[currentPhaseIndex + 1].value
    : null;

  // Handler for phase change (dropdown/manual)
  const handleManualPhaseChange = async (e) => {
    const selectedPhase = e.target.value;
    setManualPhase(selectedPhase);
    setPhaseChangeError('');
    setPhaseChangeSuccess('');
  };

  // Handler to actually set the phase
  const handleSetPhase = async () => {
    setPhaseChangeLoading(true);
    setPhaseChangeError('');
    setPhaseChangeSuccess('');
    try {
      if (!manualPhase || manualPhase === currentPhase) {
        setPhaseChangeError('Please select a different phase');
        setPhaseChangeLoading(false);
        return;
      }
      // For GroqCheck, trigger backend API as well
      if (manualPhase === "GroqCheck") {
        const resp = await fetch('https://lumos-mz9a.onrender.com/evaluation/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!resp.ok) throw new Error('Failed to start GroqCheck phase');
      }
      if (typeof setPhase === 'function') {
        await setPhase(manualPhase);
        // Wait for the phase to actually update in the contract (poll for up to 5 seconds)
        let tries = 0;
        let updated = false;
        let latestPhase = "";
        while (tries < 25) {
          await new Promise(res => setTimeout(res, 200));
          try {
            latestPhase = await fetchCurrentPhaseFromContract();
          } catch (e) {
            latestPhase = manualPhase;
          }
          const normalizedCurrent = (latestPhase || '').toLowerCase();
          const normalizedTarget = manualPhase.toLowerCase();
          if (
            normalizedCurrent === normalizedTarget ||
            (normalizedCurrent === "groqcheck" && normalizedTarget === "groq") ||
            (normalizedCurrent === "groq" && normalizedTarget === "groqcheck")
          ) {
            updated = true;
            break;
          }
          tries++;
        }
        if (!updated) {
          setPhaseChangeError(
            `Phase change did not complete. Current phase is "${latestPhase}". Please refresh and try again.`
          );
          setPhaseChangeLoading(false);
          return;
        }
      }
      setPhaseChangeSuccess(`Phase changed to ${manualPhase}`);
    } catch (err) {
      setPhaseChangeError(err.message || 'Failed to change phase');
    } finally {
      setPhaseChangeLoading(false);
    }
  };

  // Check if we were directed here to reset blockchain
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'reset-blockchain') {
      // Focus on the reset blockchain section
      setTimeout(() => {
        const section = document.getElementById('blockchain-reset-section');
        if (section) {
          section.scrollIntoView({ behavior: 'smooth' });
          section.classList.add('highlight-section');
          setTimeout(() => section.classList.remove('highlight-section'), 2000);
        }
      }, 500);
    }
  }, [location]);

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

        // Extract nested proposal data robustly
        const normalized = data.map((item, idx) => {
          // Try to find the nested proposal object
          let proposal = item.proposal || item.proposalData || item.data || item;
          // Fallbacks for fields
          return {
            id: proposal.id?.toString() ?? item.id?.toString() ?? (idx + 1),
            title: proposal.projectTitle || item.projectTitle || "" ,
            proposerName: proposal.name || item.name || "",
            stellarId: proposal.stellarWalletAddress || item.stellarWalletAddress || "",
            voteCount: proposal.voteCount || item.voteCount || "0"
          };
        });

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

  // Handle blockchain reset for a specific user
  const handleResetUserVote = async () => {
    if (!userToReset || !userToReset.startsWith('0x') || userToReset.length !== 42) {
      setError('Please enter a valid Ethereum address (0x... format, 42 characters)');
      return;
    }

    setIsResettingBlockchain(true);
    setError('');
    setSuccess('');

    try {
      const result = await clearVote(userToReset);
      
      if (result.success) {
        const successMessage = result.isLocalOnly 
          ? `Reset local vote data for ${userToReset.substring(0, 6)}...${userToReset.substring(38)}. Note: The blockchain data could not be modified.` 
          : `Successfully reset vote for ${userToReset.substring(0, 6)}...${userToReset.substring(38)}`;
          
        setSuccess(successMessage);
        setResetCompleted(prev => prev + 1);
        setUserToReset('');
      } else {
        throw new Error(result.message || 'Failed to reset vote');
      }
    } catch (err) {
      setError(`Failed to reset vote: ${err.message}`);
      setResetFailed(prev => prev + 1);
    } finally {
      setIsResettingBlockchain(false);
    }
  };

  // Handle reset all votes
  const handleResetAllVotes = async () => {
    if (!window.confirm("Are you sure you want to reset ALL votes on the blockchain? This cannot be undone.")) return;
    setResetAllLoading(true);
    setResetAllError('');
    setResetAllSuccess('');
    try {
      const result = await resetAllVotes();
      if (result.success) {
        setResetAllSuccess("All votes have been reset on the blockchain.");
      } else {
        setResetAllError(result.error || "Failed to reset all votes.");
      }
    } catch (err) {
      setResetAllError(err.message);
    } finally {
      setResetAllLoading(false);
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
        <div className="flex flex-col md:flex-row md:space-x-8 mb-8">
          {/* Current Status Card */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6 md:mb-0">
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
                <span className="font-semibold">
                  {isOwner
                    ? 'Owner (Full Access)'
                    : isAdmin
                      ? 'Admin'
                      : 'Not Admin'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Proposal Count:</span>
                <span className="font-semibold">{proposalsState.length}</span>
              </div>
            </div>
          </div>
          {/* Phase Control Card - moved to the side */}
          <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Phase Control</h2>
            <div className="flex flex-col gap-4">
              <div>
                <span className="text-slate-600 dark:text-slate-300 mr-2">Current Phase:</span>
                <span className="font-semibold">{currentPhase}</span>
              </div>
              <div>
                <label htmlFor="phase-select" className="text-slate-600 dark:text-slate-300 mr-2">Set Phase:</label>
                <select
                  id="phase-select"
                  value={manualPhase || currentPhase}
                  onChange={handleManualPhaseChange}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
                >
                  {PHASES.map(phase => (
                    <option key={phase.value} value={phase.value}>{phase.label}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSetPhase}
                disabled={phaseChangeLoading || !manualPhase || manualPhase === currentPhase}
                className={`px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition ${
                  phaseChangeLoading || !manualPhase || manualPhase === currentPhase ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {phaseChangeLoading ? "Changing..." : `Set Phase`}
              </button>
              {phaseChangeError && (
                <div className="mt-2 text-red-600">{phaseChangeError}</div>
              )}
              {phaseChangeSuccess && (
                <div className="mt-2 text-green-600">{phaseChangeSuccess}</div>
              )}
              <div className="text-xs text-slate-500 mt-2">
                You can set any phase directly. For GroqCheck, backend evaluation will be triggered.
              </div>
            </div>
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
        
        {/* Blockchain Reset Section */}
        <div id="blockchain-reset-section" className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8 transition-all duration-300">
          <h2 className="text-xl font-bold mb-4">Blockchain Vote Reset</h2>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300">
              <p className="font-medium">Warning: Advanced Feature</p>
              <p className="text-sm mt-1">Resetting votes directly interacts with the blockchain and requires admin privileges. This action cannot be undone.</p>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-slate-600 dark:text-slate-300">Successful Resets:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{resetCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Failed Resets:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{resetFailed}</span>
              </div>
            </div>
            
            <div>
              <label htmlFor="userAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                User Address to Reset
              </label>
              <div className="flex gap-2">
                <input
                  id="userAddress"
                  type="text"
                  value={userToReset}
                  onChange={(e) => setUserToReset(e.target.value)}
                  placeholder="0x... Ethereum address to reset"
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700"
                />
                <button 
                  onClick={handleResetUserVote}
                  disabled={isResettingBlockchain || !userToReset}
                  className={`px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    isResettingBlockchain || !userToReset ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isResettingBlockchain ? 'Resetting...' : 'Reset Vote'}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Enter the Ethereum address of the user whose vote you want to reset
              </p>
            </div>

            <div className="mt-6 border-t pt-4">
              <button
                onClick={handleResetAllVotes}
                disabled={resetAllLoading}
                className="px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 font-bold"
              >
                {resetAllLoading ? "Resetting All Votes..." : "Reset ALL Votes (Admin)"}
              </button>
              {resetAllSuccess && <div className="mt-2 text-green-700">{resetAllSuccess}</div>}
              {resetAllError && <div className="mt-2 text-red-700">{resetAllError}</div>}
              <div className="text-xs text-red-600 mt-2">This will clear all votes and vote counts on-chain. Use only for testing!</div>
            </div>
          </div>
        </div>
        
        {/* Proposals List */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4">Proposals ({proposalsState.length})</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Project Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Proposer Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Votes</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                {proposalsState.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">No proposals found</td>
                  </tr>
                ) : (
                  proposalsState.map((proposal, idx) => (
                    <tr
                      key={proposal.id && proposalsState.findIndex(p => p.id === proposal.id) === idx ? proposal.id : `${proposal.id || 'unknown'}-${idx}`}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">{(idx + 1).toString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200 max-w-xs truncate" title={proposal.title}>
                        {proposal.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">{proposal.proposerName}</td>
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
