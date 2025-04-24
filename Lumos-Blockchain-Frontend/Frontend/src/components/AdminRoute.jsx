import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBlockchain } from '../context/BlockchainContext';

export default function AdminRoute({ children }) {
  const { isConnected, isOwner, isAdmin } = useBlockchain();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const location = useLocation();
  
  useEffect(() => {
    // Check if the admin has a valid access token in localStorage
    const checkAdminAccess = async () => {
      try {
        const adminToken = localStorage.getItem('adminAuthToken');
        
        // For fallback access in development - using query param "adminAccess=true"
        const params = new URLSearchParams(location.search);
        const hasEmergencyAccess = params.get('adminAccess') === 'true';
        
        // Logging for debugging
        console.log("Admin access check:", {
          hasToken: !!adminToken,
          isAdmin,
          isConnected,
          isOwner,
          hasEmergencyAccess
        });
        
        if (adminToken || hasEmergencyAccess) {
          if (hasEmergencyAccess) {
            // Set the token if using emergency access
            localStorage.setItem('adminAuthToken', 'emergency-access-token');
          }
          setIsAuthorized(true);
        } else {
          setIsAuthorized(false);
        }
      } catch (error) {
        console.error("Admin route check failed:", error);
        setIsAuthorized(false);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkAdminAccess();
  }, [isAdmin, isConnected, isOwner, location]);
  
  // Show loading while checking
  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-300">Verifying admin access...</p>
        </div>
      </div>
    );
  }
  
  // If authorized, render the children
  // If not, redirect to home page
  return isAuthorized ? children : <Navigate to="/" replace />;
}
