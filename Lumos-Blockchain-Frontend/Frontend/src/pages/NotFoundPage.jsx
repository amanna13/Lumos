import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen py-20 px-6 bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto max-w-lg text-center">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="text-8xl font-bold bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              404
            </div>
            <h1 className="text-3xl font-bold mt-4 mb-2">Page Not Found</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              The page you are looking for doesn't exist or has been moved.
            </p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
            >
              Return to Home
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-full px-6 py-3 bg-transparent border border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400 rounded-lg font-medium hover:bg-indigo-50 dark:hover:bg-slate-700 transition duration-300"
            >
              Go Back
            </button>
          </div>
        </div>
        
        <div className="mt-8">
          <p className="text-slate-500 dark:text-slate-400">
            Lost? You can navigate to one of these pages:
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              Home
            </button>
            <button
              onClick={() => navigate('/submit-proposal')}
              className="px-4 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              Submit Proposal
            </button>
            <button
              onClick={() => navigate('/voting')}
              className="px-4 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              Vote
            </button>
            <button
              onClick={() => navigate('/results')}
              className="px-4 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-full text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              Results
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
