import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlockchain } from '../context/BlockchainContext'
import websocketService from '../utils/websocketService'

// Helper: extract only the required fields from markdown description
function extractFields(description) {
  if (!description) return {};
  // Map markdown section names to required field keys
  const fieldMap = {
    name: "Name",
    emailId: "Email",
    links: "Links",
    projectTitle: "Project Title",
    projectDescription: "Description",
    brief_summary: "Brief Summary",
    primaryGoal: "Primary Goal",
    specificObjective: "Specific Objectives",
    budget: "Budget",
    longTermPlan: "Long Term Plan",
    futureFundingPlans: "Future Funding Plans"
  };
  const result = {};
  for (const [key, section] of Object.entries(fieldMap)) {
    const match = description.match(new RegExp(`## ${section}\\s*([\\s\\S]*?)(?=\\n## |$)`, 'i'));
    if (match && match[1]) result[key] = match[1].trim();
  }
  return result;
}

export default function VotingPage() {
  const navigate = useNavigate()
  const { 
    isConnected, 
    currentPhase, 
    voteForProposal, 
    connect, 
    account,
    hasVoted,
    getVotedProposal,
    diagnoseContractConnectivity,
    clearVote
  } = useBlockchain()
  
  const [proposals, setProposals] = useState([])
  const [selectedProposal, setSelectedProposal] = useState(null)
  const [isVoting, setIsVoting] = useState(false)
  const [hasVotedState, setHasVoted] = useState(false)
  const [votedProposal, setVotedProposal] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [detailProposal, setDetailProposal] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isResettingVote, setIsResettingVote] = useState(false);

  // Fetch proposals from /evaluation/rankings/top
  const fetchProposals = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // Use timestamp to avoid caching issues
      const timestamp = Date.now();
      const response = await fetch(`https://lumos-mz9a.onrender.com/evaluation/rankings/top?_=${timestamp}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        }
      });
      
      if (!response.ok) throw new Error(`Failed to fetch proposals: ${response.status}`);
      
      const text = await response.text();
      if (!text || text.trim() === '') throw new Error('Empty response from server');
      
      console.log('API response text:', text.substring(0, 200) + '...');
      
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error('Invalid proposals data: not an array');
      
      console.log('Fetched proposals count:', data.length);
      
      // Add debug point to check data structure
      console.log('Raw API response data structure:', data);
      
      // Handle the new API response format which has proposal nested inside each item
      const normalized = data.map((item, index) => {
        console.log(`Full item ${index}:`, item); // Log the entire item to understand its structure
        
        // Extract the proposal from the nested structure - handle different API formats
        let p;
        if (item.proposal) {
          p = item.proposal;
        } else if (item.proposalData) {
          p = item.proposalData;
        } else if (item.data) {
          p = item.data;
        } else {
          p = item;
        }

        // Defensive: fallback to empty object if p is null/undefined
        if (!p) p = {};

        // Extract fields safely, with fallbacks and more debugging
        const description = p.description || item.description || '';
        // Improved proposer extraction: check all possible nested locations
        let proposerFinal =
          p.proposer ||
          item.proposer ||
          (item.proposal && item.proposal.proposer) ||
          (item.proposalData && item.proposalData.proposer) ||
          (item.data && item.data.proposer) ||
          (p.projectTitle && p.proposer) ||
          (p._fields && p._fields.proposer) ||
          'Unknown';

        // Try to extract projectTitle from multiple places
        const mergedFields = {
          ...(extractFields(description)),
          ...(p || {}),
        };

        // Title fallback logic: prefer projectTitle, then title, then fallback
        let title =
          p.projectTitle ||
          item.projectTitle ||
          mergedFields.projectTitle ||
          p.title ||
          item.title ||
          `Proposal ${index + 1}`;

        // Description fallback logic
        let descriptionFinal =
          description ||
          mergedFields.projectDescription ||
          mergedFields.description ||
          '';

        // Defensive: ensure title, proposer, description are not undefined/null
        if (!title || typeof title !== 'string' || !title.trim()) {
          title = `Proposal ${index + 1}`;
        }
        if (!proposerFinal || typeof proposerFinal !== 'string' || !proposerFinal.trim()) {
          proposerFinal = 'Unknown';
        }
        if (!descriptionFinal || typeof descriptionFinal !== 'string') {
          descriptionFinal = '';
        }

        // Compose normalized proposal
        const normalizedProposal = {
          ...p,
          id: (index + 1).toString(),
          voteCount: p.voteCount || item.voteCount || "0",
          rank: item.rank || index + 1,
          title,
          proposer: proposerFinal,
          description: descriptionFinal,
          _fields: mergedFields,
        };

        return normalizedProposal;
      });
      
      console.log('Final normalized proposals:', normalized);
      
      // Force UI refresh by creating a new array
      setProposals([...normalized]);
      
      // Debug what's in state
      setTimeout(() => {
        console.log('Current proposals in state:', proposals);
      }, 100);
      
    } catch (err) {
      console.error("Error fetching proposals:", err);
      setError(err.message || 'Failed to load proposals');
      
      // Create fallback proposals if we couldn't fetch any
      const fallbackProposals = [];
      for (let i = 0; i < 3; i++) {
        fallbackProposals.push({
          id: `error-fallback-${i + 1}`,
          title: `Example Proposal ${i + 1}`,
          description: "This is an example proposal created because proposals couldn't be fetched from the API.",
          proposer: "0x0000000000000000000000000000000000000000",
          voteCount: "0",
          rank: i + 1,
          _fields: {
            name: "Example Proposer",
            emailId: "example@example.com",
            projectTitle: `Example Proposal ${i + 1}`,
            brief_summary: "This is an example proposal created because we couldn't fetch real proposals from the API."
          }
        });
      }
      
      setProposals(fallbackProposals);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debug proposals whenever they change
  useEffect(() => {
    console.log('Proposals state updated:', proposals);
  }, [proposals]);

  // Enhance the extractFields function to be more tolerant of different formats
  function enhancedExtractFields(description) {
    if (!description) return {};
    
    console.log("Extracting fields from description:", description.substring(0, 100) + "...");
    
    // First try the standard extraction
    const fields = extractFields(description);
    
    // If we got no fields, try a more lenient approach
    if (Object.keys(fields).length === 0) {
      console.log("Standard extraction found no fields, trying alternative approach");
      
      // Extract sections more leniently
      const sections = description.split(/(?=\s*#+\s+)/);
      
      for (const section of sections) {
        const match = section.match(/^\s*#+\s+([^:\n]+)[:\n\s]*(.+)/s);
        if (match) {
          const [, heading, content] = match;
          const normalizedHeading = heading.trim().toLowerCase();
          
          // Map common headings to our field keys
          if (normalizedHeading.includes('name')) fields.name = content.trim();
          else if (normalizedHeading.includes('email')) fields.emailId = content.trim();
          else if (normalizedHeading.includes('link')) fields.links = content.trim();
          else if (normalizedHeading.includes('title')) fields.projectTitle = content.trim();
          else if (normalizedHeading.includes('description')) fields.projectDescription = content.trim();
          else if (normalizedHeading.includes('summary')) fields.brief_summary = content.trim();
          else if (normalizedHeading.includes('goal') && !normalizedHeading.includes('specific')) fields.primaryGoal = content.trim();
          else if (normalizedHeading.includes('objective')) fields.specificObjective = content.trim();
          else if (normalizedHeading.includes('budget')) fields.budget = content.trim();
          else if (normalizedHeading.includes('long term')) fields.longTermPlan = content.trim();
          else if (normalizedHeading.includes('funding')) fields.futureFundingPlans = content.trim();
        }
      }
    }
    
    // If still no title found but there's a description, use first line as title
    if (!fields.projectTitle && description) {
      const firstLine = description.split('\n')[0].trim();
      if (firstLine) {
        fields.projectTitle = firstLine;
        console.log("Using first line as title:", firstLine);
      }
    }
    
    // If still no summary, use the first paragraph
    if (!fields.brief_summary && description) {
      const paragraphs = description.split('\n\n');
      if (paragraphs.length > 0) {
        fields.brief_summary = paragraphs[0].trim();
        console.log("Using first paragraph as summary");
      }
    }
    
    console.log("Final extracted fields:", Object.keys(fields));
    return fields;
  }

  // Override the original extractFields function with our enhanced version
  useEffect(() => {
    const originalExtractFields = extractFields;
    window.originalExtractFields = originalExtractFields; // Save for debugging
    
    // Replace the global extractFields with our enhanced version while preserving the original
    window.extractFields = enhancedExtractFields;
    
    return () => {
      // Restore original when component unmounts
      window.extractFields = window.originalExtractFields;
    };
  }, []);

  // Fetch proposals on mount and when connected
  useEffect(() => {
    if (isConnected) fetchProposals();
  }, [isConnected, fetchProposals]);

  // Voting status
  useEffect(() => {
    const checkVotingStatus = async () => {
      if (isConnected && account) {
        try {
          const voted = await hasVoted(account);
          setHasVoted(voted);
          if (voted) {
            // Find the voted proposal from fetched proposals
            const votedFor = await getVotedProposal(account);
            if (votedFor) {
              setVotedProposal(votedFor);
              setSelectedProposal(votedFor.id);
            }
          }
        } catch (err) {
          setError("Error checking vote status");
        }
      }
    };
    checkVotingStatus();
  }, [isConnected, account, hasVoted, getVotedProposal]);

  // Real-time vote updates
  useEffect(() => {
    if (isConnected && currentPhase === "Voting") {
      // Use polling instead of websockets for updates
      const pollingInterval = setInterval(() => {
        fetchProposals();
      }, 30000); // Poll every 30 seconds
      
      return () => {
        clearInterval(pollingInterval);
      };
    }
  }, [isConnected, currentPhase, fetchProposals]);

  // Format description for modal (returns only the required fields)
  const formatDescription = (proposal) => {
    if (!proposal || !proposal._fields) {
      return {};
    }
    
    // Return all available fields from proposal instead of just the extracted fields
    const allFields = {
      // First include all direct properties from the proposal object
      ...Object.keys(proposal).reduce((acc, key) => {
        // Skip internal properties (starting with underscore), complex objects, and fields we want to hide
        const fieldsToHide = ['id', 'rank', 'submittedAt', 'stellarWalletAddress', 'status', '_id'];
        if (!key.startsWith('_') && 
            !fieldsToHide.includes(key) &&
            typeof proposal[key] !== 'object' && 
            typeof proposal[key] !== 'function') {
          acc[key] = proposal[key];
        }
        return acc;
      }, {}),
      
      // Then include the fields we've extracted (these will override any duplicates)
      ...(proposal._fields || {})
    };
    
    console.log('All available fields for modal:', allFields);
    return allFields;
  };

  // Get brief summary for card - improved with better fallbacks
  const getBriefDescription = (proposal) => {
    if (!proposal) return "No description available";
    
    // Try summary from fields first
    if (proposal._fields?.brief_summary) {
      const summary = proposal._fields.brief_summary;
      return summary.length > 150 ? summary.substring(0, 147) + '...' : summary;
    }
    
    // Then try project description from fields
    if (proposal._fields?.projectDescription) {
      const desc = proposal._fields.projectDescription;
      return desc.length > 150 ? desc.substring(0, 147) + '...' : desc;
    }
    
    // Then try raw description
    if (proposal.description) {
      const firstParagraph = proposal.description.split('\n\n')[0] || proposal.description;
      return firstParagraph.length > 150 ? firstParagraph.substring(0, 147) + '...' : firstParagraph;
    }
    
    return "No description available";
  };

  // Handler for showing the details modal
  const handleShowDetails = (proposal) => {
    setDetailProposal(proposal);
    setShowModal(true);
  };

  // Handler for submitting a vote
  const handleVote = async () => {
    if (!selectedProposal) {
      return;
    }

    setIsVoting(true);
    try {
      const result = await voteForProposal(selectedProposal);
      console.log("Vote submitted successfully:", result);
      
      // Also update local storage to keep track of the vote
      localStorage.setItem(`hasVoted_${account}`, 'true');
      localStorage.setItem(`votedFor_${account}`, selectedProposal);
      
      // Update UI state
      setHasVoted(true);
      const votedProposal = proposals.find(p => p.id === selectedProposal);
      setVotedProposal(votedProposal);
      
      // Display success message
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("Error submitting vote:", error);
      setError(error.message || "Failed to submit vote");
    } finally {
      setIsVoting(false);
    }
  };

  // UI rendering
  if (error) {
    return (
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-lg text-center">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">Error</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              {error}
            </p>
            <div className="flex flex-col items-center space-y-4 mt-6">
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Reload Page
              </button>
              <button 
                onClick={() => navigate('/')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="spinner-border animate-spin inline-block w-8 h-8 border-4 rounded-full text-indigo-600" role="status"></div>
          <p className="text-slate-600 dark:text-slate-300 mt-4">Loading proposals...</p>
        </div>
      </div>
    );
  }

  // Main component render
  return (
    <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold mb-6">Voting Page</h1>
        {!isConnected ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8 text-center">
            <h2 className="text-xl font-bold mb-4">Connect to Vote</h2>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Please connect your wallet to participate in voting.
            </p>
            <button 
              onClick={connect}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
            >
              Connect Wallet
            </button>
          </div>
        ) : (
          <>
            {/* Phase status notification */}
            {currentPhase !== "Voting" && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-400 mb-2">
                  Voting Not Active
                </h3>
                <p className="text-yellow-700 dark:text-yellow-300">
                  {currentPhase === "Submission" && "Proposals are still being submitted. Voting will begin after the submission phase ends."}
                  {currentPhase === "GroqCheck" && "Proposals are being evaluated by Groq AI. The top proposals will be available for voting soon."}
                  {currentPhase === "Completed" && "The voting phase has ended. Check the results page to see the winning proposals."}
                </p>
              </div>
            )}

            {/* Already voted notification */}
            {hasVotedState && (
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg mb-6">
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-400 mb-2">
                  You've Already Voted
                </h3>
                {votedProposal ? (
                  <>
                    <p className="text-green-700 dark:text-green-300 mb-2">
                      You have cast your vote for:
                    </p>
                    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 mb-4">
                      <h4 className="font-bold">{votedProposal.title}</h4>
                      <p className="text-sm text-slate-500">Current Votes: {votedProposal.voteCount}</p>
                      <div className="mt-2">
                        <button
                          onClick={() => handleShowDetails(votedProposal)}
                          className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Show Details
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-green-700 dark:text-green-300 mb-4">
                    You have already cast your vote for a proposal. This vote is stored on the blockchain and cannot be changed.
                  </p>
                )}
                <div className="mt-4 text-center">
                  <button
                    onClick={() => navigate('/results')}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
                  >
                    View Current Results
                  </button>
                  
                  {/* TESTING MODE: Reset buttons for testing the voting system */}
                  <div className="mt-4 p-2 border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">Testing Tools</p>
                    <div className="flex flex-wrap justify-center gap-2">
                      <button
                        onClick={async () => {
                          if (window.confirm('This will reset your vote in local storage only. Continue?')) {
                            try {
                              // Clear local storage vote records
                              localStorage.removeItem(`hasVoted_${account}`);
                              localStorage.removeItem(`votedFor_${account}`);
                              
                              // Check the actual blockchain state
                              const blockchainVoted = await hasVoted(account);
                              
                              if (blockchainVoted) {
                                // Attempt to reset blockchain vote
                                if (window.confirm("Local storage reset, but you still have a vote on the blockchain. Would you like to perform a blockchain reset?")) {
                                  try {
                                    const resetResult = await clearVote(account);
                                    if (resetResult.success && !resetResult.isLocalOnly) {
                                      alert("Vote successfully reset both in local storage and on the blockchain!");
                                      setHasVoted(false);
                                      setVotedProposal(null);
                                      setSelectedProposal(null);
                                    } else if (resetResult.success && resetResult.isLocalOnly) {
                                      alert("Local storage reset successfully, but blockchain vote couldn't be reset. Please contact an administrator for help.");
                                      
                                      // Ask if they want to go to admin page
                                      if (window.confirm("Would you like to go to the admin panel to try a different reset method?")) {
                                        navigate('/admin-direct?action=reset-blockchain');
                                      }
                                    }
                                  } catch (resetError) {
                                    console.error("Failed to reset vote:", resetError);
                                    alert("Local storage reset, but blockchain reset failed. You may need admin privileges to reset votes on the blockchain.");
                                    
                                    // Offer to navigate to admin panel
                                    if (window.confirm("Would you like to go to the admin panel?")) {
                                      navigate('/admin-direct?action=reset-blockchain');
                                    }
                                  }
                                } else {
                                  alert("Local storage reset. Contact an administrator to reset your blockchain vote.");
                                }
                              } else {
                                alert("Local vote data cleared successfully.");
                                // Update UI state
                                setHasVoted(false);
                                setVotedProposal(null);
                                setSelectedProposal(null);
                              }
                              
                              // No need to reload, just update the state based on blockchain
                              setHasVoted(blockchainVoted);
                            } catch (error) {
                              console.error("Error checking blockchain vote state:", error);
                              alert("Error verifying blockchain state. Please refresh the page manually.");
                            }
                          }
                        }}
                        className="px-3 py-1 text-xs bg-orange-500 text-white rounded-md hover:bg-orange-600 transition duration-300"
                      >
                        Reset Local Storage
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Proposals section - only show if not voted yet */}
            {currentPhase === "Voting" && !hasVotedState ? (
              <div className="mb-8">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden mb-4">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold mb-2">Available Proposals</h2>
                    <p className="text-slate-600 dark:text-slate-300">
                      Review the proposals below and select one to vote for.
                    </p>
                  </div>
                </div>
                
                {proposals.length === 0 ? (
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg text-center">
                    <p className="text-slate-500 dark:text-slate-400">No proposals available yet.</p>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                      Found {proposals.length} proposals available for voting.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {proposals.map((proposal) => (
                        <div 
                          key={proposal.id || `proposal-${Math.random()}`}
                          className={`bg-white dark:bg-slate-800 rounded-lg shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg ${
                            selectedProposal === proposal.id
                              ? 'ring-2 ring-indigo-500 transform scale-[1.02]'
                              : ''
                          }`}
                        >
                          <div className="p-5">
                            <div className="flex justify-between items-start mb-3">
                              <h3 className="font-semibold text-lg line-clamp-2">
                                {proposal.title}
                              </h3>
                              <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded dark:bg-indigo-900 dark:text-indigo-300 whitespace-nowrap ml-2">
                                {proposal.voteCount || 0} votes
                              </span>
                            </div>
                            <div className="mb-4">
                              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 min-h-[3rem]">
                                {getBriefDescription(proposal)}
                              </p>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                              Proposer: {proposal.proposer ? `${proposal.proposer.substring(0, 6)}...${proposal.proposer.substring(38)}` : 'Unknown'}
                            </div>
                            <div className="flex justify-between items-center">
                              <button
                                onClick={() => handleShowDetails(proposal)}
                                className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center"
                              >
                                {/* Proper eye icon */}
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z" />
                                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth={2} fill="none"/>
                                </svg>
                                View Details
                              </button>
                              <button
                                onClick={() => setSelectedProposal(proposal.id)}
                                className={`px-3 py-1 rounded-md text-sm ${
                                  selectedProposal === proposal.id
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                                }`}
                              >
                                {selectedProposal === proposal.id ? 'Selected' : 'Select'}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
                
                {proposals.length > 0 && (
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-md mt-6 flex flex-col sm:flex-row justify-between items-center">
                    <div className="mb-4 sm:mb-0">
                      <p className="text-slate-700 dark:text-slate-300 font-medium">
                        {selectedProposal 
                          ? "You've selected a proposal" 
                          : "Please select a proposal to vote for"}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {selectedProposal 
                          ? "Click 'Submit Vote' to confirm your selection" 
                          : "Click on 'Select' under any proposal to choose it"}
                      </p>
                    </div>
                    <button
                      onClick={handleVote}
                      disabled={isVoting || !selectedProposal}
                      className={`px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300 ${
                        (isVoting || !selectedProposal) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isVoting ? 'Voting...' : 'Submit Vote'}
                    </button>
                  </div>
                )}
              </div>
            ) : null}

            {/* Show "View Results" button when voting is completed */}
            {currentPhase === "Completed" && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => navigate('/results')}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
                >
                  View Results
                </button>
              </div>
            )}

            {/* Proposal Details Modal */}
            {showModal && detailProposal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
                  <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Proposal Details</h3>
                    <button 
                      onClick={() => setShowModal(false)}
                      className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="p-6 overflow-y-auto max-h-[70vh]">
                    <div className="mb-6">
                      <div className="flex justify-between items-start">
                        <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">{detailProposal.title}</h2>
                        <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-3 py-1 rounded dark:bg-indigo-900 dark:text-indigo-300">
                          {detailProposal.voteCount || 0} votes
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Proposer: {detailProposal.proposer ? `${detailProposal.proposer.substring(0, 6)}...${detailProposal.proposer.substring(38)}` : 'Unknown'}
                      </p>
                    </div>
                    {/* Show all available fields */}
                    {(() => {
                      const f = formatDescription(detailProposal);
                      return (
                        <div className="space-y-6">
                          {/* Show all regular fields */}
                          {f.name && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Name</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded">{f.name}</div>
                            </div>
                          )}
                          {f.emailId && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Email</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded">{f.emailId}</div>
                            </div>
                          )}
                          {f.links && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Links</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded">{f.links}</div>
                            </div>
                          )}
                          {f.projectTitle && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Project Title</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded">{f.projectTitle}</div>
                            </div>
                          )}
                          
                          {/* Show full description if available */}
                          {detailProposal.description && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Full Description</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line text-sm">
                                {detailProposal.description}
                              </div>
                            </div>
                          )}
                          
                          {/* Continue with other extracted fields */}
                          {f.projectDescription && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Project Description</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.projectDescription}</div>
                            </div>
                          )}
                          {f.brief_summary && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Brief Summary</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.brief_summary}</div>
                            </div>
                          )}
                          {f.primaryGoal && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Primary Goal</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.primaryGoal}</div>
                            </div>
                          )}
                          {f.specificObjective && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Specific Objective</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.specificObjective}</div>
                            </div>
                          )}
                          {f.budget && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Budget</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.budget}</div>
                            </div>
                          )}
                          {f.longTermPlan && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Long Term Plan</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.longTermPlan}</div>
                            </div>
                          )}
                          {f.futureFundingPlans && (
                            <div>
                              <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">Future Funding Plans</h4>
                              <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">{f.futureFundingPlans}</div>
                            </div>
                          )}
                          
                          {/* Display any additional fields that might be in the data but not explicitly handled */}
                          {Object.entries(f).map(([key, value]) => {
                            // Skip fields we've already handled, technical fields, and fields we want to hide
                            const handledFields = [
                              'id', 'title', 'proposer', 'voteCount', 'description', 'rank', 'timestamp',
                              'name', 'emailId', 'links', 'projectTitle', 'projectDescription', 
                              'brief_summary', 'primaryGoal', 'specificObjective', 'budget',
                              'longTermPlan', 'futureFundingPlans', 'stellarWalletAddress', 'status',
                              'submittedAt'
                            ];
                            
                            if (!handledFields.includes(key) && 
                                !key.startsWith('_') && 
                                typeof value !== 'object' &&
                                typeof value !== 'function') {
                              // Format the key for display (capitalize, replace underscores with spaces)
                              const formattedKey = key
                                .replace(/_/g, ' ')
                                .replace(/\b\w/g, l => l.toUpperCase());
                                
                              return (
                                <div key={key}>
                                  <h4 className="text-md font-semibold mb-1 text-slate-700 dark:text-slate-300">
                                    {formattedKey}
                                  </h4>
                                  <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded whitespace-pre-line">
                                    {value?.toString()}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    {!hasVotedState && currentPhase === "Voting" && (
                      <button
                        onClick={() => {
                          setSelectedProposal(detailProposal.id);
                          setShowModal(false);
                        }}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 mr-2"
                      >
                        Select This Proposal
                      </button>
                    )}
                    <button
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 bg-slate-200 text-slate-800 rounded-md hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
