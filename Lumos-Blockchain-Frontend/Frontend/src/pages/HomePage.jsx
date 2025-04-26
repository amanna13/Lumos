import { useNavigate } from 'react-router-dom'
import { useBlockchain } from '../context/BlockchainContext'
import { useState, useEffect } from 'react'

// Create fallback motion component until framer-motion is installed
const motion = {
  div: (props) => <div {...props}>{props.children}</div>,
  button: (props) => <button {...props}>{props.children}</button>,
  a: (props) => <a {...props}>{props.children}</a>,
  h1: (props) => <h1 {...props}>{props.children}</h1>,
  h2: (props) => <h2 {...props}>{props.children}</h2>,
  p: (props) => <p {...props}>{props.children}</p>,
  span: (props) => <span {...props}>{props.children}</span>,
}

export default function HomePage() {
  const navigate = useNavigate()
  const { isConnected, connect, currentPhase } = useBlockchain()
  const [animateHero, setAnimateHero] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  
  // Define features array with icons and descriptive content
  const features = [
    {
      title: "Submit Proposals",
      description: "Submit your innovative project ideas with detailed descriptions, timelines, and funding requirements.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      )
    },
    {
      title: "Vote on Projects",
      description: "Review community proposals and cast your votes for projects you believe deserve funding support.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Transparent Allocation",
      description: "All grant allocations are executed on-chain with complete transparency and immutable transaction records.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Community Governance",
      description: "Decisions are made collectively by the community, ensuring a fair and democratic funding process.",
      icon: (
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ];
  
  useEffect(() => {
    setAnimateHero(true)
  }, [])
  
  const handleGetStarted = async () => {
    if (!isConnected) {
      try {
        setIsConnecting(true)
        setConnectionError(null)
        await connect()
      } catch (error) {
        console.error("Connection error:", error)
        setConnectionError(error.message || "Failed to connect wallet. Please try again.")
        setIsConnecting(false)
        return
      }
      setIsConnecting(false)
    } else {
      navigateToCurrentPhase()
    }
  }
  
  const navigateToCurrentPhase = () => {
    if (currentPhase === "Submission") {
      navigate('/submit-proposal')
    } else if (currentPhase === "Voting") {
      navigate('/voting')
    } else if (currentPhase === "GroqCheck") {
      navigate('/groq-check')
    } else {
      navigate('/results')
    }
  }
  
  useEffect(() => {
    if (isConnected && currentPhase) {
      const section = document.getElementById('current-phase-section')
      if (section) {
        section.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [isConnected, currentPhase, navigate])
  
  // Hide any debug elements
  const showDebugElements = false;
  
  return (
    <div className="pt-20 flex flex-col min-h-screen">
      {/* Hero Section - Completely Redesigned */}
      <section className="relative bg-gradient-to-br from-slate-900 to-indigo-950 overflow-hidden min-h-[90vh] flex items-center">
        {/* Animated blockchain grid background */}
        <div className="absolute inset-0 blockchain-grid opacity-20"></div>
        
        {/* Floating elements */}
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="absolute hexagon"
              style={{
                top: `${10 + Math.random() * 80}%`,
                left: `${10 + Math.random() * 80}%`,
                animationDelay: `${i * 0.5}s`,
                opacity: 0.1 + Math.random() * 0.2,
              }}
            ></div>
          ))}
          
          {/* Digital particles */}
          <div className="particles-container">
            {Array.from({ length: 30 }).map((_, i) => (
              <div 
                key={`particle-${i}`} 
                className="particle"
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDuration: `${10 + Math.random() * 20}s`,
                  animationDelay: `${Math.random() * 5}s`,
                  width: `${Math.random() * 4 + 1}px`,
                  height: `${Math.random() * 4 + 1}px`,
                }}
              ></div>
            ))}
          </div>
        </div>
        
        <div className="container mx-auto px-6 z-10 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text Content */}
            <div className={`text-white ${animateHero ? 'animate-fade-in-up' : 'opacity-0'}`}>
              <div className="inline-flex items-center bg-white/10 rounded-full px-3 py-1 backdrop-blur-sm mb-6 border border-indigo-400/30">
                <span className="block w-3 h-3 rounded-full bg-green-400 mr-2 pulse-dot"></span>
                <span className="text-sm font-medium">Blockchain Powered</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-gradient">
                Decentralized <br/>
                Grant Funding <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
                  Reimagined
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-slate-300 mb-8 max-w-xl">
                An innovative platform where transparency meets community power. Submit proposals, 
                vote democratically, and witness funding allocation — all secured by blockchain technology.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={handleGetStarted}
                  className={`cta-button group relative ${isConnecting ? 'opacity-80 cursor-wait' : ''}`}
                  disabled={isConnecting}
                >
                  <span className="cta-button-circle"></span>
                  <span className="relative z-10 font-medium flex items-center">
                    {isConnecting ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connecting...
                      </>
                    ) : isConnected ? 'Get Started' : 'Connect Wallet'}
                  </span>
                </button>
                
                <a 
                  href="#features"
                  className="text-button"
                >
                  <span>Learn More</span>
                  <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              </div>
              
              {connectionError && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-white text-sm">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{connectionError}</span>
                  </div>
                </div>
              )}
              
              <div className="mt-12 grid grid-cols-3 gap-4 max-w-md">
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-indigo-400">100%</div>
                  <div className="text-xs text-slate-400 text-center">Decentralized</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-indigo-400">0%</div>
                  <div className="text-xs text-slate-400 text-center">Platform Fees</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-3xl font-bold text-indigo-400">24/7</div>
                  <div className="text-xs text-slate-400 text-center">Transparency</div>
                </div>
              </div>
            </div>
            
            {/* Right Column - 3D Blockchain Visualization */}
            <div className={`hidden lg:block relative ${animateHero ? 'animate-fade-in-right' : 'opacity-0'}`}>
              <div className="hero-blockchain-model">
                <div className="blockchain-cube">
                  <div className="cube-face cube-face-front"></div>
                  <div className="cube-face cube-face-back"></div>
                  <div className="cube-face cube-face-right"></div>
                  <div className="cube-face cube-face-left"></div>
                  <div className="cube-face cube-face-top"></div>
                  <div className="cube-face cube-face-bottom"></div>
                </div>
                
                {/* Orbiting nodes */}
                {Array.from({ length: 5 }).map((_, i) => (
                  <div 
                    key={`node-${i}`}
                    className="orbiting-node"
                    style={{
                      animationDelay: `${i * 0.8}s`,
                      animationDuration: `${8 + i * 2}s`,
                    }}
                  >
                    <div className="node-dot"></div>
                  </div>
                ))}
                
                {/* Connection lines */}
                <div className="connection-lines"></div>
              </div>
              
              {/* Floating info cards */}
              <div className="floating-card card-1">
                <div className="card-icon">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="card-text">Secure & Immutable</div>
              </div>
              
              <div className="floating-card card-2">
                <div className="card-icon">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div className="card-text">Community Governed</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom curve */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg className="w-full h-auto" viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L48 105C96 90 192 60 288 55C384 50 480 70 576 75C672 80 768 70 864 70C960 70 1056 80 1152 80C1248 80 1344 70 1392 65L1440 60V0H1392C1344 0 1248 0 1152 0C1056 0 960 0 864 0C768 0 672 0 576 0C480 0 384 0 288 0C192 0 96 0 48 0H0V120Z" 
                  fill="url(#paint0_linear)" />
            <defs>
              <linearGradient id="paint0_linear" x1="720" y1="0" x2="720" y2="120" gradientUnits="userSpaceOnUse">
                <stop stopColor="#0f172a" stopOpacity="0" />
                <stop offset="1" stopColor="#f8fafc" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </section>
      
      {/* Current Phase Section - Redesigned */}
      {isConnected && (
        <section id="current-phase-section" className="py-16 px-6 bg-white dark:bg-slate-800 transition-all duration-500 relative overflow-hidden">
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <div className="absolute inset-0 bg-repeat" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%236366f1' fill-opacity='0.3' fill-rule='evenodd'%3E%3Ccircle cx='3' cy='3' r='3'/%3E%3Ccircle cx='13' cy='13' r='3'/%3E%3C/g%3E%3C/svg%3E\")" }}></div>
          </div>
          
          <div className="container mx-auto relative z-10">
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl p-8 shadow-xl border border-indigo-100 dark:border-indigo-800/30 transform transition-all hover:shadow-2xl">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="mb-6 md:mb-0 text-center md:text-left">
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900 mb-4 backdrop-blur-sm">
                    <span className="block w-3 h-3 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
                    <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Current Phase</span>
                  </div>
                  
                  <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                    {currentPhase === "Submission" && "Proposal Submission"}
                    {currentPhase === "Voting" && "Community Voting"}
                    {currentPhase === "GroqCheck" && "Groq AI Evaluation"}
                    {currentPhase === "Completed" && "Results Announced"}
                  </h2>
                  
                  <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mb-4">
                    {currentPhase === "Submission" && "Share your innovative vision with the community and apply for grant funding."}
                    {currentPhase === "Voting" && "Explore proposals and vote for projects you believe deserve funding."}
                    {currentPhase === "GroqCheck" && "Groq AI evaluates all submissions and shortlists the top 10 proposals based on impact, viability, and innovation."}
                    {currentPhase === "Completed" && "The funding process has concluded. View the final results."}
                  </p>
                </div>
                
                <div className="shrink-0">
                  <div className="relative phase-indicator p-2 w-40 h-40">
                    <svg className="w-full h-full" viewBox="0 0 120 120">
                      <circle 
                        cx="60" 
                        cy="60" 
                        r="54" 
                        fill="none" 
                        stroke="#e2e8f0" 
                        strokeWidth="12" 
                        className="dark:opacity-20"
                      />
                      <circle 
                        cx="60" 
                        cy="60" 
                        r="54" 
                        fill="none" 
                        stroke="url(#phaseGradient)" 
                        strokeWidth="12" 
                        strokeDasharray="339.3"
                        strokeDashoffset={
                          currentPhase === "Submission" ? "226.2" : // 1/4 complete
                          currentPhase === "GroqCheck" ? "169.65" : // 2/4 complete
                          currentPhase === "Voting" ? "113.1" : // 3/4 complete
                          "0" // 4/4 complete
                        }
                        className="transform -rotate-90 origin-center transition-all duration-1000"
                      />
                      <defs>
                        <linearGradient id="phaseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#a855f7" />
                        </linearGradient>
                      </defs>
                    </svg>
                    
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
                        {currentPhase === "Submission" ? "1" : currentPhase === "GroqCheck" ? "2" : currentPhase === "Voting" ? "3" : "4"}/4
                      </span>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{currentPhase}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-8 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
                <button 
                  onClick={() => {
                    if (currentPhase === "Submission") navigate('/submit-proposal')
                    else if (currentPhase === "GroqCheck") navigate('/groq-check')
                    else if (currentPhase === "Voting") navigate('/voting')
                    else navigate('/results')
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-300 shadow-md hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                      {currentPhase === "Submission" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />}
                      {currentPhase === "GroqCheck" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 12a2 2 0 100-4 2 2 0 000 4zm-6 8a6 6 0 1112 0H4z" />}
                      {currentPhase === "Voting" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />}
                      {currentPhase === "Completed" && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />}
                    </svg>
                    {currentPhase === "Submission" && "Submit Proposal"}
                    {currentPhase === "GroqCheck" && "View GroqCheck"}
                    {currentPhase === "Voting" && "Vote Now"}
                    {currentPhase === "Completed" && "View Results"}
                  </div>
                </button>
                
                <a
                  href={
                    currentPhase === "Submission" ? "#features" : 
                    currentPhase === "GroqCheck" ? "#process" : 
                    currentPhase === "Voting" ? "#process" : 
                    "#stats"
                  }
                  className="px-8 py-3 bg-white dark:bg-slate-700 border border-indigo-200 dark:border-indigo-700 text-indigo-600 dark:text-indigo-300 rounded-lg font-medium transition-all duration-300 hover:bg-indigo-50 dark:hover:bg-slate-600 w-full sm:w-auto text-center"
                >
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Learn More
                  </div>
                </a>
              </div>
            </div>
          </div>
        </section>
      )}
      
      {/* Features Section - Redesigned */}
      <section id="features" className="py-24 px-6 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 overflow-hidden">
        <div className="container mx-auto relative">
          {/* Floating decoration elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div 
                key={i}
                className="absolute rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"
                style={{
                  backgroundColor: i === 0 ? 'rgba(99, 102, 241, 0.3)' : i === 1 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(79, 70, 229, 0.3)',
                  height: `${Math.random() * 400 + 200}px`,
                  width: `${Math.random() * 400 + 200}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${i * 2}s`,
                }}
              ></div>
            ))}
          </div>
          
          <div className="relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/40 mb-4">
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Platform Features</span>
              </div>
              
              <h2 className="text-4xl font-bold mb-6 tracking-tight">
                How <span className="text-indigo-600 dark:text-indigo-400">Lumos</span> Works
              </h2>
              
              <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mb-16">
                Our platform provides a transparent and democratic process for grant allocation, 
                all secured by blockchain technology.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
              {features.map((feature, index) => (
                <div 
                  key={index} 
                  className="feature-card bg-white dark:bg-slate-800 rounded-xl overflow-hidden transition-all duration-500 shadow-lg hover:shadow-2xl group"
                  style={{ transitionDelay: `${index * 100}ms` }}
                >
                  <div className="h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                  <div className="p-8">
                    <div className="w-16 h-16 rounded-lg flex items-center justify-center mb-6 text-white bg-gradient-to-br from-indigo-500 to-purple-600 group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                    </div>
                    
                    <h3 className="text-xl font-bold mb-4 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    
                    <p className="text-slate-600 dark:text-slate-300">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Trust Indicators Section - Redesigned */}
      <section id="stats" className="py-24 px-6 bg-gradient-to-br from-indigo-900 to-purple-900 text-white overflow-hidden relative">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <radialGradient id="dotPattern" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.12)" />
                <stop offset="70%" stopColor="rgba(255,255,255,0)" />
              </radialGradient>
            </defs>
            <rect x="0" y="0" width="100" height="100" fill="url(#dotPattern)" />
          </svg>
          
          {Array.from({ length: 20 }).map((_, i) => (
            <div 
              key={i}
              className="absolute bg-white/5 rounded-full animate-pulse-slow"
              style={{
                width: `${Math.random() * 8 + 2}px`,
                height: `${Math.random() * 8 + 2}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDuration: `${3 + Math.random() * 5}s`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            ></div>
          ))}
        </div>
        
        <div className="container mx-auto relative z-10">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-4">
              <span className="text-sm font-medium text-indigo-200">Powered By Blockchain</span>
            </div>
            
            <h2 className="text-4xl font-bold mb-6 tracking-tight">
              Security & Transparency Built In
            </h2>
            
            <p className="text-xl text-indigo-200 max-w-3xl mx-auto">
              Our platform leverages blockchain technology to ensure complete transparency,
              security, and trust in the grant allocation process.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="trust-card backdrop-blur-sm rounded-xl p-8 border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:scale-105 duration-300">
              <div className="mb-6 w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/70 to-indigo-500/70 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold mb-4">Secure & Immutable</h3>
              
              <p className="text-indigo-200 mb-6">
                All transactions are securely recorded on the blockchain, ensuring data integrity and preventing manipulation.
              </p>
              
              <div className="mt-auto flex items-center text-indigo-300 text-sm font-medium">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                100% Data Integrity
              </div>
            </div>
            
            <div className="trust-card backdrop-blur-sm rounded-xl p-8 border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:scale-105 duration-300">
              <div className="mb-6 w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/70 to-indigo-500/70 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold mb-4">Fully Decentralized</h3>
              
              <p className="text-indigo-200 mb-6">
                No central authority controls the process. Decisions are made collectively by the community through transparent voting.
              </p>
              
              <div className="mt-auto flex items-center text-indigo-300 text-sm font-medium">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Community Governed
              </div>
            </div>
            
            <div className="trust-card backdrop-blur-sm rounded-xl p-8 border border-white/10 bg-white/5 transition-all hover:bg-white/10 hover:scale-105 duration-300">
              <div className="mb-6 w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/70 to-indigo-500/70 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </div>
              
              <h3 className="text-2xl font-bold mb-4">Full Transparency</h3>
              
              <p className="text-indigo-200 mb-6">
                Every action is publicly verifiable in real-time, ensuring complete visibility into the proposal and voting process.
              </p>
              
              <div className="mt-auto flex items-center text-indigo-300 text-sm font-medium">
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Real-time Results
              </div>
            </div>
          </div>
          
          {/* Chain visualization */}
          <div className="mt-20 blockchain-chain flex items-center justify-center overflow-hidden py-10">
            <div className="flex flex-nowrap space-x-4 chain-animation">
              {Array.from({ length: 8 }).map((_, index) => (
                <div 
                  key={index}
                  className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 backdrop-blur-sm border border-white/10 rounded-lg flex items-center justify-center transform hover:scale-110 transition-transform"
                >
                  <svg 
                    className="w-8 h-8 text-white/60" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={1.5} 
                      d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" 
                    />
                  </svg>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Process Section - Redesigned */}
      <section id="process" className="py-24 px-6 bg-white dark:bg-slate-800 overflow-hidden">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-100 dark:bg-indigo-900/40 mb-4">
              <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Simple Process</span>
            </div>
            
            <h2 className="text-4xl font-bold mb-6 tracking-tight">
              The Grant <span className="text-indigo-600 dark:text-indigo-400">Journey</span>
            </h2>
            
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Our grant allocation process consists of four transparent phases, from proposal submission to final results.
            </p>
          </div>
          
          <div className="relative mt-20">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-16 relative z-10">
              {/* Phase 1 */}
              <div className="process-card flex flex-col items-center text-center relative">
                <div className={`relative w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-8 border-4 ${currentPhase === "Submission" ? "border-indigo-500 shadow-indigo" : "border-slate-200 dark:border-slate-600"} transition-all duration-300 hover:scale-110`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentPhase === "Submission" ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </div>
                  {currentPhase === "Submission" && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                  )}
                </div>
                
                {/* Progress bar for Submission phase */}
                {currentPhase === "Submission" && (
                  <div className="w-full flex items-center justify-center mt-4 mb-2">
                    <svg className="w-7 h-7 mr-2 text-indigo-500 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" className="opacity-30" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M6.93 17.07l-2.83 2.83m0-16.97l2.83 2.83M17.07 17.07l2.83 2.83" />
                    </svg>
                    <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg"></div>
                  </div>
                )}
                
                <h3 className={`text-2xl font-bold mb-4 ${currentPhase === "Submission" ? "text-indigo-600 dark:text-indigo-400" : ""}`}>
                  Submission Phase
                </h3>
                
                <div className={`rounded-xl p-6 h-full ${currentPhase === "Submission" ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500" : "bg-slate-50 dark:bg-slate-700/30 border-l-4 border-transparent"}`}>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    Project creators submit detailed proposals outlining their vision, implementation plan, and funding requirements.
                  </p>
                  
                  {currentPhase === "Submission" && (
                    <button 
                      onClick={() => navigate('/submit-proposal')}
                      className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                      Submit a Proposal
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Phase 2 */}
              <div className="process-card flex flex-col items-center text-center relative">
                <div className={`relative w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-8 border-4 ${currentPhase === "GroqCheck" ? "border-indigo-500 shadow-indigo" : "border-slate-200 dark:border-slate-600"} transition-all duration-300 hover:scale-110`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentPhase === "GroqCheck" ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 12a2 2 0 100-4 2 2 0 000 4zm-6 8a6 6 0 1112 0H4z" />
                    </svg>
                  </div>
                  {currentPhase === "GroqCheck" && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                  )}
                </div>
                
                {/* Progress bar for GroqCheck phase */}
                {currentPhase === "GroqCheck" && (
                  <div className="w-full flex items-center justify-center mt-4 mb-2">
                    <svg className="w-7 h-7 mr-2 text-indigo-500 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" className="opacity-30" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M6.93 17.07l-2.83 2.83m0-16.97l2.83 2.83M17.07 17.07l2.83 2.83" />
                    </svg>
                    <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg"></div>
                  </div>
                )}
                
                <h3 className={`text-2xl font-bold mb-4 ${currentPhase === "GroqCheck" ? "text-indigo-600 dark:text-indigo-400" : ""}`}>
                  Groq Check Phase
                </h3>
                
                <div className={`rounded-xl p-6 h-full ${currentPhase === "GroqCheck" ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500" : "bg-slate-50 dark:bg-slate-700/30 border-l-4 border-transparent"}`}>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    Groq AI evaluates all submissions and shortlists the top 10 proposals based on impact, viability, and innovation.
                  </p>
                  
                  {currentPhase === "GroqCheck" && (
                    <button 
                      onClick={() => navigate('/groq-check')}
                      className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                      View GroqCheck
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Phase 3 */}
              <div className="process-card flex flex-col items-center text-center relative">
                <div className={`relative w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-8 border-4 ${currentPhase === "Voting" ? "border-indigo-500 shadow-indigo" : "border-slate-200 dark:border-slate-600"} transition-all duration-300 hover:scale-110`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentPhase === "Voting" ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {currentPhase === "Voting" && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                  )}
                </div>
                
                {/* Progress bar for Voting phase */}
                {currentPhase === "Voting" && (
                  <div className="w-full flex items-center justify-center mt-4 mb-2">
                    <svg className="w-7 h-7 mr-2 text-indigo-500 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" className="opacity-30" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M6.93 17.07l-2.83 2.83m0-16.97l2.83 2.83M17.07 17.07l2.83 2.83" />
                    </svg>
                    <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg"></div>
                  </div>
                )}
                
                <h3 className={`text-2xl font-bold mb-4 ${currentPhase === "Voting" ? "text-indigo-600 dark:text-indigo-400" : ""}`}>
                  Voting Phase
                </h3>
                
                <div className={`rounded-xl p-6 h-full ${currentPhase === "Voting" ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500" : "bg-slate-50 dark:bg-slate-700/30 border-l-4 border-transparent"}`}>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    Community members review proposals and cast their votes for projects they believe deserve funding.
                  </p>
                  
                  {currentPhase === "Voting" && (
                    <button 
                      onClick={() => navigate('/voting')}
                      className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                      Cast Your Vote
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Phase 4 */}
              <div className="process-card flex flex-col items-center text-center relative">
                <div className={`relative w-20 h-20 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-8 border-4 ${currentPhase === "Completed" ? "border-indigo-500 shadow-indigo" : "border-slate-200 dark:border-slate-600"} transition-all duration-300 hover:scale-110`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${currentPhase === "Completed" ? "bg-indigo-500 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300"}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  {currentPhase === "Completed" && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                  )}
                </div>
                
                {/* Progress bar for Completed phase */}
                {currentPhase === "Completed" && (
                  <div className="w-full flex items-center justify-center mt-4 mb-2">
                    <svg className="w-7 h-7 mr-2 text-indigo-500 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="2" className="opacity-30" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2v4m0 12v4m10-10h-4M6 12H2m15.07-7.07l-2.83 2.83M6.93 17.07l-2.83 2.83m0-16.97l2.83 2.83M17.07 17.07l2.83 2.83" />
                    </svg>
                    <div className="flex-1 h-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-lg"></div>
                  </div>
                )}
                
                <h3 className={`text-2xl font-bold mb-4 ${currentPhase === "Completed" ? "text-indigo-600 dark:text-indigo-400" : ""}`}>
                  Results Phase
                </h3>
                
                <div className={`rounded-xl p-6 h-full ${currentPhase === "Completed" ? "bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500" : "bg-slate-50 dark:bg-slate-700/30 border-l-4 border-transparent"}`}>
                  <p className="text-slate-600 dark:text-slate-300 mb-4">
                    Final rankings are calculated based on community votes, and grant funding is allocated to winning projects.
                  </p>
                  
                  {currentPhase === "Completed" && (
                    <button 
                      onClick={() => navigate('/results')}
                      className="inline-flex items-center text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                    >
                      View Results
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* CTA Section - Redesigned */}
      <section className="py-24 px-6 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute top-0 left-0 w-full opacity-10" viewBox="0 0 800 800">
            <defs>
              <filter id="gooey" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
                <feColorMatrix in="blur" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 19 -9" result="goo" />
              </filter>
            </defs>
            <g filter="url(#gooey)">
              {Array.from({ length: 20 }).map((_, i) => (
                <circle 
                  key={i}
                  cx={Math.random() * 800}
                  cy={Math.random() * 800}
                  r={Math.random() * 40 + 10}
                  fill="white"
                  className="animate-float-slow"
                  style={{ 
                    animationDuration: `${Math.random() * 10 + 10}s`,
                    animationDelay: `${Math.random() * 5}s`
                  }}
                />
              ))}
            </g>
          </svg>
        </div>
        
        <div className="container mx-auto text-center relative z-10 max-w-4xl">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm mb-6">
            <span className="text-sm font-medium text-white">Start Your Journey</span>
          </div>
          
          <h2 className="text-5xl font-bold mb-8 leading-tight">
            Ready to Innovate with <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200">
              Blockchain Technology?
            </span>
          </h2>
          
          <p className="text-xl text-indigo-200 mb-10 max-w-2xl mx-auto">
            Join our decentralized grant platform to either submit your innovative ideas or help fund the next breakthrough project.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={handleGetStarted}
              className={`px-8 py-4 bg-white text-indigo-700 hover:text-indigo-800 rounded-lg font-medium transition-all duration-300 shadow-lg relative overflow-hidden group hover:shadow-xl transform hover:-translate-y-1 active:translate-y-0 w-full sm:w-auto ${isConnecting ? 'opacity-80 cursor-wait' : ''}`}
              disabled={isConnecting}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-100 to-purple-100 opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
              <span className="relative flex items-center justify-center">
                {isConnecting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-indigo-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {isConnected ? 'Get Started Now' : 'Connect Your Wallet'}
                  </>
                )}
              </span>
            </button>
            
            <a 
              href="#features"
              className="px-8 py-4 border-2 border-white/30 hover:border-white/60 text-white rounded-lg font-medium transition-all duration-300 backdrop-blur-sm hover:bg-white/10 w-full sm:w-auto"
            >
              <span className="flex items-center justify-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Learn More
              </span>
            </a>
          </div>
        </div>
      </section>
      
      {/* Remove any debug UI elements by conditionally rendering */}
      {showDebugElements && (
        <div className="hidden">
          {/* Debug elements kept in code but never shown */}
        </div>
      )}
    </div>
  )
}
