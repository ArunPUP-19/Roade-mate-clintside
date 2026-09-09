import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import ImGoing from './pages/ImGoing';
import FindTrip from './pages/FindTrip';
import IWantToGo from './pages/IWantToGo';
import Login from './pages/Login';
import Signup from './pages/Signup';
import TripDetail from './pages/TripDetail';
import './App.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return null; // or a loading spinner
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/find-trip" element={<FindTrip />} />
              <Route 
                path="/im-going" 
                element={
                  <ProtectedRoute>
                    <ImGoing />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/i-want-to-go" 
                element={
                  <ProtectedRoute>
                    <IWantToGo />
                  </ProtectedRoute>
                } 
              />
              <Route path="/trip/:tripId" element={<TripDetail />} />
              <Route path="/index.html" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
