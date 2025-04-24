import { Link } from 'react-router-dom'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-white dark:bg-slate-800 py-8 px-6 shadow-inner">
      <div className="container mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-6 md:mb-0">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">Lumos</span>
            </Link>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Empowering innovation through decentralized grant funding
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-12">
            <div className="space-y-2">
              <h3 className="font-medium text-slate-900 dark:text-white">Platform</h3>
              <div className="flex flex-col space-y-2">
                <Link to="/" className="text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">Home</Link>
                <Link to="/submit-proposal" className="text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">Submit Proposal</Link>
                <Link to="/voting" className="text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">Vote</Link>
                <Link to="/results" className="text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">Results</Link>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium text-slate-900 dark:text-white">Resources</h3>
              <div className="flex flex-col space-y-2">
                <a href="#" className="text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">Documentation</a>
                <a href="#" className="text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">FAQ</a>
                <a href="#" className="text-sm text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400">Community</a>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            © {currentYear} Lumos. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
