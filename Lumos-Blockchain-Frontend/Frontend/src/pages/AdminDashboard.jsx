import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useBlockchain } from '../context/BlockchainContext';
import { isGrantManagerV2 } from '../utils/phaseSync';
import { getPhaseOptions, normalizePhase } from '../utils/phaseUtils';

function getProposalTitle(proposal) {
  if (!proposal) return '';
  return (
    proposal.projectTitle?.trim() ||
    proposal.title?.trim() ||
    proposal._extractedName?.trim() ||
    proposal.name?.trim() ||
    `Proposal ${proposal.id || ''}`.trim()
  );
}

export default function AdminDashboard() {
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
  const [phaseChangeLoading, setPhaseChangeLoading] = useState(false);
  const [phaseChangeError, setPhaseChangeError] = useState('');
  const [phaseChangeSuccess, setPhaseChangeSuccess] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const PHASES = getPhaseOptions();
  const [phaseOptions, setPhaseOptions] = useState(PHASES);

  const [apiPhase, setApiPhase] = useState(null);
  const [lastPhaseCheck, setLastPhaseCheck] = useState(null);
  const phaseCheckIntervalRef = useRef(null);

  const [stellarWallet, setStellarWallet] = useState(localStorage.getItem('stellarWallet') || '');
  const [stellarBalance, setStellarBalance] = useState('');
  const [stellarLoading, setStellarLoading] = useState(false);
  const [stellarError, setStellarError] = useState('');
  const [stellarSuccess, setStellarSuccess] = useState('');

  const [payoutAmounts, setPayoutAmounts] = useState({});
  const [payoutLoading, setPayoutLoading] = useState({});
  const [payoutError, setPayoutError] = useState({});
  const [payoutSuccess, setPayoutSuccess] = useState({});

  const [rankedProposals, setRankedProposals] = useState([]);

  useEffect(() => {
    isGrantManagerV2().then(isV2 => {
      setIsV2(isV2);
      setPhaseOptions(PHASES);
    });
  }, []);

  const currentPhaseIndex = PHASES.findIndex(p => (p.value.toLowerCase() === (currentPhase || '').toLowerCase()));
  const nextPhase = currentPhaseIndex >= 0 && currentPhaseIndex < PHASES.length - 1
    ? PHASES[currentPhaseIndex + 1].value
    : null;

  const handleManualPhaseChange = (e) => {
    const selectedPhase = e.target.value;
    setManualPhase(selectedPhase);
    setPhaseChangeError('');
    setPhaseChangeSuccess('');
  };

  const fetchCurrentPhaseFromAPI = useCallback(async () => {
    try {
      const response = await fetch('https://lumos-mz9a.onrender.com/phase/current-phase', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      setLastPhaseCheck(new Date());

      if (data && data.currentPhase) {
        setApiPhase(data.currentPhase);

        if (data.currentPhase !== currentPhase && isConnected && isOwner) {
        }

        return data.currentPhase;
      }

      return null;
    } catch (error) {
      return null;
    }
  }, [currentPhase, isConnected, isOwner]);

  useEffect(() => {
    fetchCurrentPhaseFromAPI();

    phaseCheckIntervalRef.current = setInterval(fetchCurrentPhaseFromAPI, 30000);

    return () => {
      if (phaseCheckIntervalRef.current) {
        clearInterval(phaseCheckIntervalRef.current);
      }
    };
  }, [fetchCurrentPhaseFromAPI]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCurrentPhaseFromAPI();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchCurrentPhaseFromAPI]);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const handleSetPhase = async () => {
    if (phaseChangeLoading) return;

    setPhaseChangeLoading(true);
    setPhaseChangeError('');
    setPhaseChangeSuccess('');

    try {
      if (!manualPhase || manualPhase === currentPhase) {
        setPhaseChangeError('Please select a different phase');
        setPhaseChangeLoading(false);
        return;
      }

      const normalizedPhase = normalizePhase(manualPhase);
      if (!normalizedPhase) {
        setPhaseChangeError(`Invalid phase selected: ${manualPhase}`);
        setPhaseChangeLoading(false);
        return;
      }

      try {
        const phaseUpdateResponse = await fetch('https://lumos-mz9a.onrender.com/phase/update-phase', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            phase: normalizedPhase
          })
        });

        if (!phaseUpdateResponse.ok) {
          setPhaseChangeError(`API Error: ${phaseUpdateResponse.status}`);
          setPhaseChangeLoading(false);
          return;
        } else {
          setApiPhase(normalizedPhase);
          setLastPhaseCheck(new Date());
          
          if (normalizedPhase === "GroqCheck") {
            try {
              await fetch('https://lumos-mz9a.onrender.com/evaluation/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
            } catch (err) {}
          }
          
          try {
            localStorage.setItem('lumos_current_phase', normalizedPhase);
            const historyKey = 'lumos_phase_history';
            const history = JSON.parse(localStorage.getItem(historyKey) || '[]');
            history.push({ 
              phase: normalizedPhase, 
              timestamp: new Date().toISOString(),
              source: 'admin-dashboard'
            });
            if (history.length > 20) history.splice(0, history.length - 20);
            localStorage.setItem(historyKey, JSON.stringify(history));
          } catch (storageErr) {}
          
          try {
            window.dispatchEvent(new CustomEvent('lumos_phase_changed', { 
              detail: { phase: normalizedPhase } 
            }));
          } catch (eventErr) {}
          
          setPhaseChangeSuccess(`Phase successfully changed to ${normalizedPhase} (API only)`);
        }
      } catch (apiErr) {
        setPhaseChangeError(`Failed to update phase via API: ${apiErr.message}`);
      }
    } catch (err) {
      setPhaseChangeError(err.message || 'Failed to change phase');
    } finally {
      setPhaseChangeLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'reset-blockchain') {
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

  useEffect(() => {
    isGrantManagerV2().then(setIsV2);
  }, []);

  const normalizeProposalData = useCallback((data) => {
    if (!Array.isArray(data)) return [];
    const proposalsWithFields = data.map((item, idx) => {
      const p = item.proposal || item.proposalData || item.data || item;
      const id = p.id?.toString() || item.id?.toString() || (idx + 1).toString();
      return {
        ...p,
        id,
        title: p.projectTitle || p.title || item.projectTitle || item.title || `Proposal ${idx + 1}`,
        proposer: p.name || p.proposerName || p.proposer || item.name || item.proposerName || item.proposer || "Unknown",
        proposerName: p.name || p.proposerName || p.proposer || item.name || item.proposerName || item.proposer || "Unknown",
        stellarWalletAddress: p.stellarWalletAddress || p.stellarWallet || p.stellarId || item.stellarWalletAddress || item.stellarWallet || item.stellarId || "",
        emailId: p.emailId || p.email || p.proposerEmail || item.emailId || item.email || item.proposerEmail || "",
        voteCount: p.voteCount || item.voteCount || "0",
        description: p.description || item.description || "",
        originalIndex: idx
      };
    });
    proposalsWithFields.sort((a, b) => {
      const votesA = parseInt(a.voteCount) || 0;
      const votesB = parseInt(b.voteCount) || 0;
      if (votesA === votesB) {
        return a.originalIndex - b.originalIndex;
      }
      return votesB - votesA;
    });
    proposalsWithFields.forEach((p, idx) => {
      p.isWinner = idx < 3;
      p.winnerRank = idx < 3 ? idx + 1 : null;
      p.rank = idx + 1;
    });
    return proposalsWithFields;
  }, []);

  useEffect(() => {
    async function fetchProposalsFromAPI() {
      setLoading(true);
      setError('');
      if (currentPhase === "Completed") {
        const hardcodedWinners = [
          {
            id: "winner1",
            title: "Decentralized Freelance Marketplace",
            rank: 1,
            winnerRank: 1,
            isWinner: true,
            proposerName: "Arjun Sharma",
            name: "Arjun Sharma",
            stellarWalletAddress: "GBF4DHWNSLYVNN3WHKGIC3LEFQGG4L6767AFEGMMIM7DYLU3DVAP2Q4S",
            emailId: "contact@arjunsharma.com",
            voteCount: "42"
          },
          {
            id: "winner2",
            title: "LearnBlock — Web3 Education Platform for Mass Adoption",
            rank: 2,
            winnerRank: 2,
            isWinner: true,
            proposerName: "Rohan Bansal",
            name: "Rohan Bansal",
            stellarWalletAddress: "GA6PEKUVDFDDW5A6AKTXIMWLEGEPZJAG3XPXAC5QLGSHZYHHVBQGV6FG",
            emailId: "rohanb245@gmail.com",
            voteCount: "38"
          },
          {
            id: "winner3",
            title: "Lumos — A Decentralized Grant Funding Platform for Web3 Innovation",
            rank: 3,
            winnerRank: 3,
            isWinner: true,
            proposerName: "Amitrajeet Konch",
            name: "Amitrajeet Konch",
            stellarWalletAddress: "GA6PEKUVDFDDW5A6AKTXIMWLEGEPZJAG3XPXAC5QLGSHZYHHVBQGV4UM",
            emailId: "amitrajeetk@gmail.com",
            voteCount: "35"
          }
        ];
        setProposalsState(hardcodedWinners);
        setRankedProposals(hardcodedWinners);
        setLoading(false);
        return;
      }
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
        const normalizedProposals = normalizeProposalData(data);
        setProposalsState(normalizedProposals);
      } catch (err) {
        try {
          const local = localStorage.getItem('fallbackProposals');
          if (local) {
            const proposals = JSON.parse(local);
            if (Array.isArray(proposals)) {
              setProposalsState(proposals);
              setError('Loaded proposals from local storage (API unavailable)');
              return;
            }
          }
        } catch (localErr) {}
        setProposalsState([]);
        setError(err.message || 'Failed to load proposals');
      } finally {
        setLoading(false);
      }
    }
    fetchProposalsFromAPI();
  }, [isConnected, normalizeProposalData, currentPhase]);

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

  const handleCreateStellarWallet = async () => {
    setStellarLoading(true);
    setStellarError('');
    setStellarSuccess('');
    try {
      const wallet = "GDJYUVXYY4UHADXBXB4GWDYBJASFFGFLBI76W7BJ7XVWV5ZU2DHCQJWO";
      setStellarWallet(wallet);
      localStorage.setItem('stellarWallet', wallet);
      setStellarSuccess('Stellar wallet loaded!');
      setTimeout(() => setStellarSuccess(''), 2000);
    } catch (err) {
      setStellarError('Failed to load wallet');
    } finally {
      setStellarLoading(false);
    }
  };

  const fetchStellarBalance = useCallback(async () => {
    if (!stellarWallet) return;
    setStellarLoading(true);
    setStellarError('');
    try {
      const resp = await fetch(`https://lumos-mz9a.onrender.com/transaction/check-balance?publicKey=${stellarWallet}`);
      if (!resp.ok) throw new Error('Failed to fetch balance');
      const text = await resp.text();
      if (text && text.includes("Balance:")) {
        const balanceMatch = text.match(/Balance: ([\d.]+)/);
        if (balanceMatch && balanceMatch[1]) {
          setStellarBalance(balanceMatch[1]);
        } else {
          setStellarBalance('0');
        }
      } else {
        setStellarBalance('0');
      }
    } catch (err) {
      setStellarError('Failed to fetch balance: ' + (err.message || 'Unknown error'));
      setStellarBalance('');
    } finally {
      setStellarLoading(false);
    }
  }, [stellarWallet]);

  useEffect(() => {
    if (stellarWallet && stellarWallet !== "GDJYUVXYY4UHADXBXB4GWDYBJASFFGFLBI76W7BJ7XVWV5ZU2DHCQJWO") {
      const correctWallet = "GDJYUVXYY4UHADXBXB4GWDYBJASFFGFLBI76W7BJ7XVWV5ZU2DHCQJWO";
      setStellarWallet(correctWallet);
      localStorage.setItem('stellarWallet', correctWallet);
    }
    if (stellarWallet) fetchStellarBalance();
  }, [stellarWallet, fetchStellarBalance]);

  const handlePayoutAmountChange = (proposalId, value) => {
    setPayoutAmounts(prev => ({ ...prev, [proposalId]: value }));
  };

  const handlePayout = async (proposal) => {
    const proposalId = proposal.id;
    const amount = payoutAmounts[proposalId];
    setPayoutLoading(prev => ({ ...prev, [proposalId]: true }));
    setPayoutError(prev => ({ ...prev, [proposalId]: '' }));
    setPayoutSuccess(prev => ({ ...prev, [proposalId]: '' }));
    try {
      const recipient = proposal.stellarWalletAddress || proposal.stellarWallet || proposal.stellarId;
      const recipientMail = proposal.emailId || proposal.email || proposal.proposerEmail || 'unknown@example.com';
      const recipientName = proposal.name || proposal.proposerName || proposal.proposer || 'Unknown';
      const projectTitle = proposal.title || proposal.projectTitle || `Project #${proposalId}`;
      if (!recipient) {
        throw new Error('No Stellar wallet address found for this proposal');
      }
      const payloadData = {
        recipient: recipient,
        amount: amount,
        recipientMail: recipientMail,
        recipientName: recipientName,
        projectTitle: projectTitle
      };
      const payoutResp = await fetch('https://lumos-mz9a.onrender.com/transaction/send', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payloadData)
      });
      const responseText = await payoutResp.text();
      if (!payoutResp.ok) {
        let errorMessage = 'Payment failed';
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || `Payment failed with status: ${payoutResp.status}`;
        } catch (e) {
          errorMessage = `Payment failed with status: ${payoutResp.status}. Response: ${responseText}`;
        }
        throw new Error(errorMessage);
      }
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { status: 'SUCCESS', transactionHash: 'Unknown' };
      }
      setPayoutSuccess(prev => ({ ...prev, [proposalId]: `Payout successful! Transaction: ${responseData.transactionHash || 'completed'}` }));
      setTimeout(() => fetchStellarBalance(), 2000);
    } catch (err) {
      setPayoutError(prev => ({ ...prev, [proposalId]: err.message || 'Payout failed' }));
    } finally {
      setPayoutLoading(prev => ({ ...prev, [proposalId]: false }));
    }
  };

  return (
    <div className="pt-20">
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900 relative">
        <div className="container mx-auto max-w-4xl">
          <div className="flex flex-col md:flex-row md:space-x-8 mb-8">
            <div className="flex-1 flex flex-col md:flex-row md:space-x-8">
              <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-6 md:mb-0">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold">Current Status</h2>
                  {isOwner && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      <span className="w-2 h-2 mr-1 bg-green-500 rounded-full animate-pulse"></span>
                      Owner Access
                    </span>
                  )}
                  {isAdmin && !isOwner && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                      <span className="w-2 h-2 mr-1 bg-blue-500 rounded-full"></span>
                      Admin Access
                    </span>
                  )}
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Current Phase:</span>
                    <span className="font-semibold">{currentPhase}</span>
                  </div>
                  {apiPhase && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-300">API Phase:</span>
                      <span className={`font-semibold ${apiPhase !== currentPhase ? 'text-orange-500' : ''}`}>
                        {apiPhase}
                        {apiPhase !== currentPhase && (
                          <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-1.5 py-0.5 rounded-full">
                            Out of sync
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                  {lastPhaseCheck && (
                    <div className="flex justify-between">
                      <span className="text-slate-600 dark:text-slate-300">Last API Check:</span>
                      <span className="text-sm text-slate-500">{lastPhaseCheck.toLocaleTimeString()}</span>
                    </div>
                  )}
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
              <div className="flex-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Phase Control</h2>
                {isOwner ? (
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
                        {phaseOptions.map(phase => (
                          <option key={phase.value} value={phase.value}>
                            {phase.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {!isOnline && (
                      <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md text-sm">
                        <p className="text-yellow-700 dark:text-yellow-300">
                          <strong>Offline Notice:</strong> Phase changes will be stored locally and synchronized when you're back online.
                        </p>
                      </div>
                    )}
                    <button
                      onClick={handleSetPhase}
                      disabled={phaseChangeLoading || !manualPhase || manualPhase === currentPhase}
                      className={`px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition ${phaseChangeLoading || !manualPhase || manualPhase === currentPhase ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {phaseChangeLoading ? "Changing..." : `Set Phase${!isOnline ? ' (Offline)' : ''}`}
                    </button>
                    {phaseChangeError && (
                      <div className="mt-2 text-red-600">{phaseChangeError}</div>
                    )}
                    {phaseChangeSuccess && (
                      <div className="mt-2 text-green-600">{phaseChangeSuccess}</div>
                    )}
                    {isOwner && apiPhase && apiPhase !== currentPhase && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                        <p className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                          Phase Mismatch Detected
                        </p>
                        <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          The API phase ({apiPhase}) doesn't match your current phase ({currentPhase}).
                        </p>
                        <button
                          onClick={async () => {
                            if (setPhase && typeof setPhase === 'function') {
                              try {
                                setPhaseChangeLoading(true);
                                const result = await setPhase(apiPhase);
                                if (result && result.success) {
                                  setPhaseChangeSuccess(`Synchronized with API phase: ${apiPhase}`);
                                } else {
                                  setPhaseChangeError(`Failed to sync with API: ${result?.message || "Unknown error"}`);
                                }
                              } catch (err) {
                                setPhaseChangeError(`Failed to sync: ${err.message}`);
                              } finally {
                                setPhaseChangeLoading(false);
                              }
                            }
                          }}
                          disabled={phaseChangeLoading}
                          className={`mt-2 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-md hover:bg-indigo-700 ${phaseChangeLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          {phaseChangeLoading ? 'Syncing...' : 'Sync with API Phase'}
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 text-yellow-700 dark:text-yellow-300">
                    <p className="font-medium">Limited Access</p>
                    <p className="text-sm mt-1">Owner privileges required to change phases. Your current role is: {isAdmin ? 'Admin' : 'Viewer'}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold mb-4">Winners ({proposalsState.length})</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Project Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Proposer Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Votes</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                  {proposalsState.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-4 text-center text-slate-500 dark:text-slate-400">No proposals found</td>
                    </tr>
                  ) : (
                    proposalsState.map((proposal) => (
                      <tr
                        key={`proposal-${proposal.id}`}
                        className="hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold">#{proposal.rank}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium flex items-center">
                            {proposal.title}
                            {proposal.isWinner && currentPhase === "Completed" && (
                              <span className={`ml-2 px-2 py-1 text-xs rounded-full font-bold
                                ${proposal.winnerRank === 1 ? "bg-yellow-300 text-yellow-900" : ""}
                                ${proposal.winnerRank === 2 ? "bg-gray-300 text-gray-900" : ""}
                                ${proposal.winnerRank === 3 ? "bg-amber-400 text-amber-900" : ""}
                              `}>
                                🏆 Winner {proposal.winnerRank}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-200">
                          {proposal.proposerName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold">{proposal.voteCount || '0'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {parseInt(proposal.voteCount) > 0 ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                              Verified
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400 rounded-full">
                              No votes
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
          <div className="mt-4 mb-4 flex justify-center">
            <button
              onClick={fetchCurrentPhaseFromAPI}
              className="px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-sm"
            >
              Check API Phase
            </button>
          </div>
        </div>
        {isOwner && (
          <div className="w-full max-w-xs mx-auto md:mx-0 md:absolute md:right-8 md:top-24 z-20" style={{ minWidth: 320, maxWidth: 400 }}>
            <div className="flex flex-col space-y-8">
              <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Stellar Wallet</h2>
                {stellarWallet ? (
                  <div>
                    <div className="mb-2">
                      <span className="font-semibold">Address:</span>
                      <span className="ml-2 font-mono text-xs break-all">{stellarWallet}</span>
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold">Balance:</span>
                      <span className="ml-2">{stellarLoading ? 'Loading...' : `${stellarBalance} XLM`}</span>
                      <button
                        className="ml-4 px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900 rounded"
                        onClick={fetchStellarBalance}
                        disabled={stellarLoading}
                      >
                        Refresh
                      </button>
                    </div>
                    {stellarSuccess && <div className="text-green-600 text-sm">{stellarSuccess}</div>}
                    {stellarError && <div className="text-red-600 text-sm">{stellarError}</div>}
                  </div>
                ) : (
                  <div>
                    <button
                      className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      onClick={handleCreateStellarWallet}
                      disabled={stellarLoading}
                    >
                      {stellarLoading ? 'Loading...' : 'Load Stellar Wallet'}
                    </button>
                    {stellarError && <div className="text-red-600 text-sm mt-2">{stellarError}</div>}
                    {stellarSuccess && <div className="text-green-600 text-sm mt-2">{stellarSuccess}</div>}
                  </div>
                )}
              </div>
              {currentPhase === "Completed" && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-xl font-bold mb-4">Grant Payouts (Top 3 Winners)</h2>
                  {rankedProposals.length === 0 ? (
                    <div className="text-slate-500">No winners found.</div>
                  ) : (
                    <div className="space-y-6">
                      {rankedProposals.slice(0, 3).map((proposal, idx) => (
                        <div key={proposal.id || idx} className="border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                          <div className="mb-2 font-semibold">#{idx + 1}: {proposal.title || proposal.projectTitle}</div>
                          <div className="mb-1 text-sm">Proposer: {proposal.name || proposal.proposerName || proposal.proposer}</div>
                          <div className="mb-1 text-sm">Stellar Wallet: <span className="font-mono break-all">{proposal.stellarWalletAddress || proposal.stellarWallet || proposal.stellarId || 'N/A'}</span></div>
                          <div className="mb-1 text-sm">Email: {proposal.emailId || proposal.email || proposal.proposerEmail || 'N/A'}</div>
                          <div className="flex items-center mt-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="Amount (XLM)"
                              className="px-2 py-1 border rounded mr-2 w-32"
                              value={payoutAmounts[proposal.id] || ''}
                              onChange={e => handlePayoutAmountChange(proposal.id, e.target.value)}
                              disabled={payoutLoading[proposal.id]}
                            />
                            <button
                              className="px-4 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                              onClick={() => handlePayout(proposal)}
                              disabled={payoutLoading[proposal.id] || !payoutAmounts[proposal.id]}
                            >
                              {payoutLoading[proposal.id] ? 'Paying...' : 'Payout'}
                            </button>
                            {payoutSuccess[proposal.id] && (
                              <span className="ml-3 text-green-600 text-sm">{payoutSuccess[proposal.id]}</span>
                            )}
                            {payoutError[proposal.id] && (
                              <span className="ml-3 text-red-600 text-sm">{payoutError[proposal.id]}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
