import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ProposalSubmitPage from './pages/ProposalSubmitPage';
import VotingPage from './pages/VotingPage';
import ResultsPage from './pages/ResultsPage';
import AdminPage from './pages/AdminPage';
import NotFoundPage from './pages/NotFoundPage';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminRoute from './components/AdminRoute';
import { BlockchainProvider } from './context/BlockchainContext';
import AdminDashboard from './pages/AdminDashboard';

function App() {
  return (
    <BlockchainProvider>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/submit-proposal" element={<ProposalSubmitPage />} />
            <Route path="/voting" element={<VotingPage />} />
            <Route path="/results" element={<ResultsPage />} />
            
            {/* Original admin routes */}
            <Route 
              path="/admin-dashboard" 
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              } 
            />
            <Route path="/admin" element={<Navigate to="/admin-dashboard" replace />} />
            
            {/* New simplified admin route */}
            <Route path="/admin-direct" element={<AdminDashboard />} />
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BlockchainProvider>
  )
}

export default App;
