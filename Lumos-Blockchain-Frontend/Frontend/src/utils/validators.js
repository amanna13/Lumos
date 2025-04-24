// Form field validators

// Email validation using regex
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Word count validation
export const getWordCount = (text) => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export const isWithinWordLimit = (text, minWords, maxWords) => {
  const wordCount = getWordCount(text);
  return wordCount >= minWords && wordCount <= maxWords;
};

// Character count validation
export const getCharacterCount = (text) => {
  return text.length;
};

export const isWithinCharLimit = (text, maxChars) => {
  return text.length <= maxChars;
};

// Stellar wallet address validation
export const isValidStellarAddress = (address) => {
  // Stellar addresses are 56 characters long and start with 'G'
  return /^G[A-Z0-9]{55}$/.test(address);
};

// URL validation
export const isValidURL = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Multiple URLs validation (comma or space-separated)
export const validateURLs = (urlsString) => {
  if (!urlsString.trim()) return true;
  
  const urls = urlsString.split(/[\s,]+/).filter(url => url.trim());
  return urls.every(url => isValidURL(url.trim()));
};

export const validateProposalForm = (formData) => {
  const errors = {};
  
  // Name validation
  if (!formData.name.trim()) {
    errors.name = "Name is required";
  }
  
  // Email validation
  if (!isValidEmail(formData.emailId)) {
    errors.emailId = "Please enter a valid email address";
  }
  
  // Links validation
  if (formData.links && !validateURLs(formData.links)) {
    errors.links = "Please enter valid URLs (separated by commas or spaces)";
  }
  
  // Project title validation
  if (!formData.title.trim()) {
    errors.title = "Project title is required";
  } else if (!isWithinWordLimit(formData.title, 1, 15)) {
    errors.title = "Project title should not exceed 15 words";
  }
  
  // Project description validation
  if (!formData.description.trim()) {
    errors.description = "Project description is required";
  } else if (!isWithinWordLimit(formData.description, 50, 500)) {
    errors.description = "Project description should be between 50-500 words";
  }
  
  // Brief summary validation
  if (!formData.briefSummary.trim()) {
    errors.briefSummary = "Brief summary is required";
  } else if (!isWithinWordLimit(formData.briefSummary, 10, 100)) {
    errors.briefSummary = "Brief summary should be between 10-100 words";
  }
  
  // Primary goal validation
  if (!formData.primaryGoal.trim()) {
    errors.primaryGoal = "Primary goal is required";
  }
  
  // Specific objective validation
  if (!formData.specificObjective.trim()) {
    errors.specificObjective = "Specific objective is required";
  }
  
  // Budget validation
  if (!formData.budget.trim()) {
    errors.budget = "Budget is required";
  }
  
  // Long term plan validation
  if (!formData.longTermPlan.trim()) {
    errors.longTermPlan = "Long term plan is required";
  }
  
  // Future funding plan validation
  if (!formData.futureFundingPlans.trim()) {
    errors.futureFundingPlans = "Future funding plans are required";
  }
  
  // Stellar wallet address validation
  if (!formData.stellarWalletAddress.trim()) {
    errors.stellarWalletAddress = "Stellar wallet address is required";
  } else if (!isValidStellarAddress(formData.stellarWalletAddress)) {
    errors.stellarWalletAddress = "Please enter a valid Stellar wallet address (starts with G, 56 characters)";
  }
  
  return errors;
};
