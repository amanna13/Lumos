import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBlockchain } from '../context/BlockchainContext'
import { 
  validateProposalForm, 
  getWordCount, 
  getCharacterCount,
  isWithinWordLimit, 
  isWithinCharLimit 
} from '../utils/validators'

export default function ProposalSubmitPage() {

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  
  const navigate = useNavigate()
  const { 
    isConnected, 
    currentPhase, 
    connect 
  } = useBlockchain()
  
  const [formData, setFormData] = useState({
    name: '',
    emailId: '',
    links: '',
    title: '',
    description: '',
    briefSummary: '',
    primaryGoal: '',
    specificObjective: '',
    budget: '',
    longTermPlan: '',
    futureFundingPlans: '',
    stellarWalletAddress: ''
  })
  
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitNote, setSubmitNote] = useState('')
  const [wordCounts, setWordCounts] = useState({
    description: 0,
    briefSummary: 0,
    primaryGoal: 0,
    specificObjective: 0
  })
  
  useEffect(() => {
    setWordCounts({
      description: getWordCount(formData.description),
      briefSummary: getWordCount(formData.briefSummary),
      primaryGoal: getWordCount(formData.primaryGoal),
      specificObjective: getWordCount(formData.specificObjective)
    })
  }, [formData])
  
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
    
    if (!touched[name]) {
      setTouched({ ...touched, [name]: true })
    }
    
    if (touched[name]) {
      const validationErrors = validateProposalForm({
        ...formData,
        [name]: value
      })
      
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: validationErrors[name]
      }))
    }
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched({ ...touched, [name]: true })
    
    const validationErrors = validateProposalForm(formData)
    setErrors(prevErrors => ({
      ...prevErrors,
      [name]: validationErrors[name]
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateProposalForm(formData);
    setErrors(validationErrors);

    const allTouched = Object.keys(formData).reduce((acc, key) => {
      acc[key] = true;
      return acc;
    }, {});
    setTouched(allTouched);

    if (Object.keys(validationErrors).length > 0) {
      setSubmitError("Please fix the errors in the form before submitting");
      return;
    }

    if (!isConnected) {
      try {
        await connect();
      } catch (error) {
        setSubmitError("Please connect your wallet to submit a proposal");
        return;
      }
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      // Prepare the payload as expected by the backend
      const payload = {
        name: formData.name,
        emailId: formData.emailId,
        links: formData.links,
        projectTitle: formData.title,
        projectDescription: formData.description,
        brief_summary: formData.briefSummary,
        primaryGoal: formData.primaryGoal,
        specificObjective: formData.specificObjective,
        budget: formData.budget,
        longTermPlan: formData.longTermPlan,
        futureFundingPlans: formData.futureFundingPlans,
        stellarWalletAddress: formData.stellarWalletAddress
      };

      const response = await fetch('https://lumos-mz9a.onrender.com/proposals/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      setSuccess(true);
      setSubmitNote("Your proposal was successfully submitted! It will be visible in the voting section.");
      setFormData({
        name: '',
        emailId: '',
        links: '',
        title: '',
        description: '',
        briefSummary: '',
        primaryGoal: '',
        specificObjective: '',
        budget: '',
        longTermPlan: '',
        futureFundingPlans: '',
        stellarWalletAddress: ''
      });
      setTouched({});
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
        navigate('/');
      }, 3000);

    } catch (err) {
      setSubmitError(err.message || 'Failed to submit proposal');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (!isConnected) {
    return (
      <div className="pt-20">
        <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-lg text-center">
            <h1 className="text-3xl font-bold mb-6">Connect to Submit a Proposal</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              Please connect your wallet to submit a grant proposal.
            </p>
            <button 
              onClick={connect}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  if (currentPhase !== "Submission") {
    return (
      <div className="pt-20">
        <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-lg text-center">
            <h1 className="text-3xl font-bold mb-6">Submission Phase Closed</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              The proposal submission phase is currently not active. Please check back later or participate in the current {currentPhase} phase.
            </p>
            <button 
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                navigate('/');
              }}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    )
  }
  
  if (success) {
    return (
      <div className="pt-20">
        <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto max-w-lg text-center">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
              <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-4">Proposal Submitted Successfully!</h1>
              <p className="text-slate-600 dark:text-slate-300 mb-8">
                {submitNote || "Your grant proposal has been submitted to the blockchain and saved to our database. You will be redirected to the home page shortly."}
              </p>
              <button 
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  navigate('/');
                }}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="pt-20">
      <div className="min-h-screen py-12 px-6 bg-slate-50 dark:bg-slate-900">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold mb-2">Submit a Grant Proposal</h1>
            <p className="text-slate-600 dark:text-slate-300 mb-8">
              Share your innovative project idea with the community to receive grant funding. Provide detailed information to increase your chances of success.
            </p>
            
            {submitError && (
              <div className="mb-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                <p>{submitError}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name*
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.name ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="Enter your full name"
                      required
                    />
                    {errors.name && touched.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="emailId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Email Address*
                    </label>
                    <input
                      type="email"
                      id="emailId"
                      name="emailId"
                      value={formData.emailId}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.emailId ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="Enter your email address"
                      required
                    />
                    {errors.emailId && touched.emailId && (
                      <p className="mt-1 text-sm text-red-500">{errors.emailId}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="links" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Relevant Links (GitHub, LinkedIn, Portfolio, etc.)
                    </label>
                    <input
                      type="text"
                      id="links"
                      name="links"
                      value={formData.links}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.links ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="Enter relevant links separated by commas"
                    />
                    {errors.links && touched.links && (
                      <p className="mt-1 text-sm text-red-500">{errors.links}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">Project Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Project Title* (Max 15 words)
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.title ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="Enter a concise, descriptive title for your project"
                      required
                    />
                    {errors.title && touched.title && (
                      <p className="mt-1 text-sm text-red-500">{errors.title}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="briefSummary" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Brief Project Summary* (10-100 words)
                    </label>
                    <textarea
                      id="briefSummary"
                      name="briefSummary"
                      rows="3"
                      value={formData.briefSummary}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.briefSummary ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="Provide a brief summary of your project (10-100 words)"
                      required
                    />
                    <div className="flex justify-between mt-1">
                      <p className={`text-sm ${
                        wordCounts.briefSummary < 10 || wordCounts.briefSummary > 100 
                          ? 'text-red-500' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        Word count: {wordCounts.briefSummary}/100 (min: 10)
                      </p>
                    </div>
                    {errors.briefSummary && touched.briefSummary && (
                      <p className="mt-1 text-sm text-red-500">{errors.briefSummary}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Project Description* (50-500 words)
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows="6"
                      value={formData.description}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.description ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="Provide a comprehensive overview of your project, including the problem it solves and your approach (50-500 words)"
                      required
                    />
                    <div className="flex justify-between mt-1">
                      <p className={`text-sm ${
                        wordCounts.description < 50 || wordCounts.description > 500 
                          ? 'text-red-500' 
                          : 'text-slate-500 dark:text-slate-400'
                      }`}>
                        Word count: {wordCounts.description}/500 (min: 50)
                      </p>
                    </div>
                    {errors.description && touched.description && (
                      <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">Goals and Objectives</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="primaryGoal" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Primary Goal*
                    </label>
                    <textarea
                      id="primaryGoal"
                      name="primaryGoal"
                      rows="3"
                      value={formData.primaryGoal}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.primaryGoal ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="Describe the main goal of your project"
                      required
                    />
                    {errors.primaryGoal && touched.primaryGoal && (
                      <p className="mt-1 text-sm text-red-500">{errors.primaryGoal}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="specificObjective" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Specific Objectives*
                    </label>
                    <textarea
                      id="specificObjective"
                      name="specificObjective"
                      rows="3"
                      value={formData.specificObjective}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.specificObjective ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="List specific, measurable objectives for your project"
                      required
                    />
                    {errors.specificObjective && touched.specificObjective && (
                      <p className="mt-1 text-sm text-red-500">{errors.specificObjective}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">Financial Information</h2>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="budget" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Budget Allocation*
                    </label>
                    <textarea
                      id="budget"
                      name="budget"
                      rows="3"
                      value={formData.budget}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.budget ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="Describe how you plan to allocate the grant funds"
                      required
                    />
                    {errors.budget && touched.budget && (
                      <p className="mt-1 text-sm text-red-500">{errors.budget}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="longTermPlan" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Long Term Plan*
                    </label>
                    <textarea
                      id="longTermPlan"
                      name="longTermPlan"
                      rows="3"
                      value={formData.longTermPlan}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.longTermPlan ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="Describe your vision beyond the grant period. Include your project's sustainability model, future development roadmap, potential for community involvement, and how you plan to maintain or scale it over time."
                      required
                    />
                    {errors.longTermPlan && touched.longTermPlan && (
                      <p className="mt-1 text-sm text-red-500">{errors.longTermPlan}</p>
                    )}
                  </div>
                  
                  <div>
                    <label htmlFor="futureFundingPlans" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Future Funding Plans*
                    </label>
                    <textarea
                      id="futureFundingPlans"
                      name="futureFundingPlans"
                      rows="3"
                      value={formData.futureFundingPlans}
                      onChange={handleInputChange}
                      onBlur={handleBlur}
                      className={`w-full px-4 py-2 border ${errors.futureFundingPlans ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                      placeholder="Outline how you plan to secure additional funding after this grant. Include potential revenue streams, fundraising strategies, partnerships, or any plans to become self-sustainable."
                      required
                    />
                    {errors.futureFundingPlans && touched.futureFundingPlans && (
                      <p className="mt-1 text-sm text-red-500">{errors.futureFundingPlans}</p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-lg mb-6">
                <h2 className="text-xl font-semibold mb-4">Wallet Information</h2>
                
                <div>
                  <label htmlFor="stellarWalletAddress" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Stellar Wallet Address*
                  </label>
                  <input
                    type="text"
                    id="stellarWalletAddress"
                    name="stellarWalletAddress"
                    value={formData.stellarWalletAddress}
                    onChange={handleInputChange}
                    onBlur={handleBlur}
                    className={`w-full px-4 py-2 border ${errors.stellarWalletAddress ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-slate-700`}
                    placeholder="Enter your Stellar wallet address (starts with G)"
                    required
                  />
                  {errors.stellarWalletAddress && touched.stellarWalletAddress && (
                    <p className="mt-1 text-sm text-red-500">{errors.stellarWalletAddress}</p>
                  )}
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    This address will be used to transfer grant funds if your proposal is selected.
                  </p>
                </div>
              </div>
              
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition duration-300 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {submitting ? 'Submitting...' : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
