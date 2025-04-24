/**
 * Admin authentication utilities
 */

/**
 * Check if the current user is authenticated as an admin
 * @returns {boolean} True if the user is authenticated as admin
 */
export const isAdminAuthenticated = () => {
  try {
    const token = localStorage.getItem('adminAuthToken');
    return !!token; // Convert to boolean
  } catch (error) {
    console.error("Error checking admin authentication:", error);
    return false;
  }
};

/**
 * Authenticate as admin with an access code
 * @param {string} accessCode - The admin access code
 * @returns {boolean} True if authentication was successful
 */
export const authenticateAdmin = (accessCode) => {
  try {
    // This would typically validate against a server endpoint
    // For simplicity, we're using a hardcoded code
    const validCode = "lumos123";
    
    if (accessCode === validCode) {
      const token = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem('adminAuthToken', token);
      console.log("Admin authenticated with token:", token);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error authenticating admin:", error);
    return false;
  }
};

/**
 * Clear admin authentication
 * @returns {boolean} True if logout was successful
 */
export const logoutAdmin = () => {
  try {
    localStorage.removeItem('adminAuthToken');
    return true;
  } catch (error) {
    console.error("Error logging out admin:", error);
    return false;
  }
};

/**
 * Get the admin authentication token
 * @returns {string|null} The admin token or null if not authenticated
 */
export const getAdminToken = () => {
  try {
    return localStorage.getItem('adminAuthToken');
  } catch (error) {
    console.error("Error getting admin token:", error);
    return null;
  }
};

/**
 * Check if a user is authenticated as admin
 * @returns {boolean} Whether the user is authenticated
 */
export const checkAdminAuthentication = () => {
  // Check for admin token in localStorage
  const adminToken = localStorage.getItem('adminAuthToken');
  
  // Log for debugging
  console.log("Admin authentication check:", { 
    hasToken: !!adminToken, 
    tokenValue: adminToken ? `${adminToken.substring(0, 10)}...` : 'none'
  });
  
  // Return boolean indicating if token exists
  return !!adminToken;
};

/**
 * Force admin authentication for development/testing
 * @returns {boolean} Success status
 */
export const forceAdminAuth = () => {
  try {
    const token = `admin-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('adminAuthToken', token);
    console.log("Admin authentication forced with token:", token);
    return true;
  } catch (error) {
    console.error("Error forcing admin authentication:", error);
    return false;
  }
};

/**
 * Check if admin has full permissions (owner)
 * @param {boolean} isOwner - Whether the connected account is the contract owner
 * @returns {Object} Admin permission object
 */
export const getAdminPermissions = (isOwner) => {
  const isAdmin = isAdminAuthenticated();
  
  return {
    isAdmin,
    isFullAdmin: isAdmin && isOwner,
    canChangePhase: isAdmin && isOwner,
    canViewAdminPanel: isAdmin
  };
};
