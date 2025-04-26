import { Link, useLocation } from 'react-router-dom'
import { useBlockchain } from '../context/BlockchainContext'
import { useState, useEffect } from 'react'

export default function Navbar() {
  const location = useLocation()
  
  // Add error protection to blockchain hook
  const blockchainContext = useBlockchain()
  const { 
    account = '', 
    isConnected = false, 
    connect = () => console.error("Connect function not available"), 
    disconnect = () => console.error("Disconnect function not available"),
    currentPhase = "",
    setPhase = () => console.error("SetPhase function not available")
  } = blockchainContext || {}
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  
  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location])
  
  // Format account address for display
  const formattedAccount = account ? `${account.substring(0, 6)}...${account.substring(account.length - 4)}` : ''
  
  return (
    <nav
      className="backdrop-blur-md bg-white/40 dark:bg-slate-800/40 shadow-lg rounded-2xl border border-slate-200 dark:border-slate-700 mx-auto mt-4 max-w-3xl flex justify-center items-center z-50"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        marginLeft: 'auto',
        marginRight: 'auto',
        // Ensure the navbar overlays content but allows for offset
      }}
    >
      <div className="w-full container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                LUMOS
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link 
                to="/" 
                className={`${
                  location.pathname === '/' 
                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Home
              </Link>
              
              <Link 
                to="/submit-proposal" 
                className={`${
                  location.pathname === '/submit-proposal' 
                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Submit Proposal
              </Link>
              
              <Link 
                to="/voting" 
                className={`${
                  location.pathname === '/voting' 
                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Voting
              </Link>
              
              <Link 
                to="/results" 
                className={`${
                  location.pathname === '/results' 
                    ? 'border-indigo-500 text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300'
                } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
              >
                Results
              </Link>
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            {isConnected ? (
              <div className="ml-3 relative">
                <div>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="bg-white dark:bg-slate-700 py-1 px-3 border border-gray-300 dark:border-slate-600 rounded-md flex items-center text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none"
                  >
                    <span className="mr-1">🟢</span>
                    <span>{formattedAccount}</span>
                    <svg
                      className="-mr-1 ml-2 h-5 w-5"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </div>
                {dropdownOpen && (
                  <div
                    className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white dark:bg-slate-700 ring-1 ring-black ring-opacity-5 focus:outline-none"
                    role="menu"
                    aria-orientation="vertical"
                    aria-labelledby="user-menu-button"
                  >
                    <div 
                      className="block px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
                    >
                      Current Phase: <span className="font-semibold">{currentPhase}</span>
                    </div>
                    <button
                      onClick={() => {
                        disconnect();
                        setDropdownOpen(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-600"
                      role="menuitem"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={connect}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
              >
                Connect Wallet
              </button>
            )}
          </div>
          <div className="-mr-2 flex items-center sm:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700 dark:hover:text-gray-300 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {mobileMenuOpen ? (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="block h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            <Link
              to="/"
              className={`${
                location.pathname === '/'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-800 dark:hover:text-white'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Home
            </Link>
            <Link
              to="/submit-proposal"
              className={`${
                location.pathname === '/submit-proposal'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-800 dark:hover:text-white'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Submit Proposal
            </Link>
            <Link
              to="/voting"
              className={`${
                location.pathname === '/voting'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-800 dark:hover:text-white'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Voting
            </Link>
            <Link
              to="/results"
              className={`${
                location.pathname === '/results'
                  ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-500 text-indigo-700 dark:text-indigo-400'
                  : 'border-transparent text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 hover:border-gray-300 dark:hover:border-slate-500 hover:text-gray-800 dark:hover:text-white'
              } block pl-3 pr-4 py-2 border-l-4 text-base font-medium`}
            >
              Results
            </Link>
          </div>
          
          <div className="pt-4 pb-3 border-t border-gray-200 dark:border-slate-700">
            {isConnected ? (
              <>
                <div className="flex items-center px-4">
                  <div className="flex-shrink-0">
                    <span className="text-xl">👤</span>
                  </div>
                  <div className="ml-3">
                    <div className="text-base font-medium text-gray-800 dark:text-white">
                      Connected Wallet
                    </div>
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {formattedAccount}
                    </div>
                  </div>
                </div>
                <div className="mt-3 space-y-1">
                  <div 
                    className="block px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-400"
                  >
                    Current Phase: <span className="font-semibold">{currentPhase}</span>
                  </div>
                  <button
                    onClick={disconnect}
                    className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    Disconnect Wallet
                  </button>
                </div>
              </>
            ) : (
              <div className="px-4">
                <button
                  onClick={connect}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none"
                >
                  Connect Wallet
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
