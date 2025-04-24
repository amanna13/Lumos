import { useState } from 'react';
import { useBlockchain } from '../context/BlockchainContext';

/**
 * Button component that clears all application storage
 * This is useful for debugging and resetting the application state
 */
export default function ClearStorageButton({ className = "", buttonText = "Clear All Data" }) {
  const { clearAllStorage } = useBlockchain();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const handleClearStorage = () => {
    try {
      const result = clearAllStorage();
      if (result) {
        setSuccess(true);
        setError(null);
        // Reset success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError("Failed to clear storage");
      }
    } catch (err) {
      setError(err.message || "An error occurred");
    }
  };
  
  return (
    <div>
      <button
        onClick={handleClearStorage}
        className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 ${className}`}
      >
        {buttonText}
      </button>
      
      {success && (
        <div className="mt-2 p-2 bg-green-100 text-green-800 text-sm rounded">
          Application data cleared successfully
        </div>
      )}
      
      {error && (
        <div className="mt-2 p-2 bg-red-100 text-red-800 text-sm rounded">
          {error}
        </div>
      )}
    </div>
  );
}
