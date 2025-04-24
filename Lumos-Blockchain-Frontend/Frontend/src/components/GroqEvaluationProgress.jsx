import React, { useEffect, useState } from 'react';
import groqProgressService from '../utils/groqProgressService';

export default function GroqEvaluationProgress() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [usePolling, setUsePolling] = useState(false);

  useEffect(() => {
    // Subscribe to progress updates
    const unsubscribe = groqProgressService.subscribe(data => {
      setProgress(data.percent);
      setStatus(data.status);
      setMessage(data.message);
      setIsConnected(data.isConnected);
      setUsePolling(data.usePolling);
    });
    
    // Start monitoring if not idle
    if (status !== 'idle') {
      groqProgressService.start();
    }
    
    // Clean up on unmount
    return () => {
      unsubscribe();
    };
  }, [status]);

  // Stop monitoring when completed or error
  useEffect(() => {
    if (status === 'completed' || status === 'error') {
      groqProgressService.stop();
    }
  }, [status]);

  if (status === 'idle') return null;

  return (
    <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-2 flex items-center">
        <span>Groq AI Evaluation {status === 'completed' ? 'Completed' : 'Progress'}</span>
        {usePolling && <span className="text-xs ml-2 text-slate-500">(Polling Mode)</span>}
        {isConnected && <span className="text-xs ml-2 text-green-500">(WebSocket Connected)</span>}
      </h3>

      {status === 'running' && (
        <div className="flex items-center mb-2">
          <div className="relative w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-indigo-600 transition-all duration-300 ease-out flex items-center"
              style={{ width: `${progress}%` }}
            >
              <span
                className="absolute right-2 text-xs font-semibold text-white"
                style={{
                  right: progress < 10 ? '0.5rem' : '0.75rem',
                  color: progress > 15 ? 'white' : '#6366f1',
                  transition: 'color 0.2s',
                }}
              >
                {progress}%
              </span>
            </div>
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="flex items-center mb-2 text-green-600 dark:text-green-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>All proposals have been evaluated successfully!</span>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center mb-2 text-red-600 dark:text-red-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>Evaluation process encountered an error</span>
        </div>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-400">
        {message || 'Processing proposals with Groq AI...'}
      </p>

      {status === 'completed' && (
        <div className="mt-3 text-sm text-indigo-600 dark:text-indigo-400">
          You can now advance to the Voting phase.
        </div>
      )}
    </div>
  );
}
