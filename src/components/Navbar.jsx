import { Link, useNavigate } from 'react-router-dom';
import { Map, User, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar glass-panel">
      <div className="container navbar-container">
        <Link to="/" className="navbar-logo">
          <Map className="logo-icon" />
          <span className="font-bold text-xl text-gradient">RouteMate</span>
        </Link>
        <div className="navbar-links">
          <Link to="/" className="nav-link">Dashboard</Link>
          
          {user ? (
            <div className="user-menu" style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span className="text-gradient font-medium">Hello, {user.displayName || user.name || 'User'}</span>
              <button onClick={handleLogout} className="btn-outline glass-button user-btn" style={{ padding: '8px 12px' }}>
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-outline glass-button user-btn" style={{ textDecoration: 'none' }}>
              <User size={18} />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
