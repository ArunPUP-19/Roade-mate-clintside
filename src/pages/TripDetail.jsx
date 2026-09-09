import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  MapPin, Calendar, Clock, User, Car, Star, CheckCircle, XCircle,
  Shield, Lock, Play, Flag, ArrowLeft, Loader2, Users, AlertCircle
} from 'lucide-react';
import './TripDetail.css';

const STATUS_CONFIG = {
  ACTIVE: { label: 'Open', color: 'var(--secondary)', icon: CheckCircle },
  PENDING_CONFIRMATION: { label: 'Pending', color: 'var(--accent)', icon: Clock },
  CONFIRMED: { label: 'Confirmed', color: 'var(--primary)', icon: Shield },
  LOCKED: { label: 'Locked', color: '#8b5cf6', icon: Lock },
  LIVE: { label: 'Live', color: '#ef4444', icon: Play },
  FULL: { label: 'Full', color: 'var(--text-muted)', icon: Users },
  COMPLETED: { label: 'Completed', color: 'var(--text-muted)', icon: Flag },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', icon: XCircle },
};

const CONFIRMATION_STATUS = {
  PENDING: { label: 'Pending', color: 'var(--accent)' },
  CONFIRMED: { label: 'Confirmed', color: 'var(--secondary)' },
  REJECTED: { label: 'Rejected', color: '#ef4444' },
  CANCELLED: { label: 'Left', color: 'var(--text-muted)' },
};

const TripDetail = () => {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeaders } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchTrip = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/trips/${tripId}`);
      if (!res.ok) throw new Error('Trip not found');
      const data = await res.json();
      setTrip(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrip();
  }, [tripId]);

  const doAction = async (url, method = 'POST') => {
    setActionLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      });

      if (res.status === 401 || res.status === 403) {
        setError('Your session has expired. Please log in again.');
        setTimeout(() => setError(''), 5000);
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error?.message || data?.message || data?.error || 'Action failed';
        throw new Error(msg);
      }
      setTrip(data.trip);
      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleJoin = () => doAction(`http://localhost:5000/api/trips/${tripId}/join`);
  const handleLeave = () => doAction(`http://localhost:5000/api/trips/${tripId}/leave`, 'DELETE');
  const handleConfirm = (pid) => doAction(`http://localhost:5000/api/trips/${tripId}/participants/${pid}/confirm`, 'PUT');
  const handleReject = (pid) => doAction(`http://localhost:5000/api/trips/${tripId}/participants/${pid}/reject`, 'PUT');
  const handleLock = () => doAction(`http://localhost:5000/api/trips/${tripId}/lock`, 'PUT');
  const handleStart = () => doAction(`http://localhost:5000/api/trips/${tripId}/start`, 'PUT');
  const handleComplete = () => doAction(`http://localhost:5000/api/trips/${tripId}/complete`, 'PUT');
  const handleCancel = () => doAction(`http://localhost:5000/api/trips/${tripId}/cancel`, 'PUT');

  if (loading) {
    return (
      <div className="container trip-detail-page animate-fade-in">
        <div className="loading-state glass-panel">
          <Loader2 size={32} className="spin" />
          <span>Loading trip details...</span>
        </div>
      </div>
    );
  }

  if (error && !trip) {
    return (
      <div className="container trip-detail-page animate-fade-in">
        <div className="error-state glass-panel">
          <AlertCircle size={32} />
          <span>{error}</span>
          <button className="glass-button btn-primary" onClick={() => navigate('/find-trip')}>
            <ArrowLeft size={18} /> Back to Trips
          </button>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[trip.status] || STATUS_CONFIG.ACTIVE;
  const StatusIcon = statusCfg.icon;
  const isOrganizer = user && trip.driverPublicId === user.id;
  const myParticipation = user && trip.participants?.find(p => p.userId === user.id);
  const canJoin = user && !myParticipation && (trip.status === 'ACTIVE' || trip.status === 'PENDING_CONFIRMATION') && trip.seatsAvailable > 0;
  const canLeave = myParticipation && myParticipation.role !== 'DRIVER' &&
    ['PENDING', 'CONFIRMED'].includes(myParticipation.confirmationStatus) &&
    !['LIVE', 'COMPLETED'].includes(trip.status);

  const activeParticipants = trip.participants?.filter(p =>
    p.confirmationStatus !== 'CANCELLED' && p.confirmationStatus !== 'REJECTED'
  ) || [];

  return (
    <div className="container trip-detail-page animate-fade-in">
      <button className="back-button" onClick={() => navigate('/find-trip')}>
        <ArrowLeft size={18} /> Back to trips
      </button>

      {/* Messages */}
      {successMsg && (
        <div className="status-message success-message">
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}
      {error && (
        <div className="status-message error-msg">
          <AlertCircle size={18} /> {error}
        </div>
      )}

      <div className="trip-detail-grid">
        {/* Main Info Card */}
        <div className="trip-info-card glass-panel">
          <div className="trip-detail-header">
            <div className="driver-section">
              <div className="driver-avatar font-bold">{trip.driverName?.charAt(0)}</div>
              <div>
                <h2 className="font-bold text-xl">{trip.driverName}</h2>
                <div className="rating-badge">
                  <Star size={14} className="star-icon" />
                  <span className="font-semibold">{trip.driverRating}</span>
                </div>
                {isOrganizer && <span className="organizer-badge">You (Organizer)</span>}
              </div>
            </div>
            <div className="status-badge-large" style={{ '--status-color': statusCfg.color }}>
              <StatusIcon size={16} />
              <span>{statusCfg.label}</span>
            </div>
          </div>

          <div className="route-display">
            <div className="route-endpoint">
              <div className="route-dot start"></div>
              <div>
                <span className="text-sm text-muted">From</span>
                <p className="font-semibold">{trip.startingLocation}</p>
              </div>
            </div>
            <div className="route-connector"></div>
            <div className="route-endpoint">
              <div className="route-dot end"></div>
              <div>
                <span className="text-sm text-muted">To</span>
                <p className="font-semibold">{trip.destination}</p>
              </div>
            </div>
          </div>

          <div className="trip-meta-grid">
            <div className="meta-item glass-panel">
              <Calendar size={18} className="text-muted" />
              <div>
                <span className="text-sm text-muted">Date</span>
                <span className="font-semibold">{trip.date}</span>
              </div>
            </div>
            <div className="meta-item glass-panel">
              <Clock size={18} className="text-muted" />
              <div>
                <span className="text-sm text-muted">Time</span>
                <span className="font-semibold">{trip.time}</span>
              </div>
            </div>
            <div className="meta-item glass-panel">
              <Users size={18} className="text-muted" />
              <div>
                <span className="text-sm text-muted">Seats</span>
                <span className="font-semibold">{trip.seatsAvailable} / {trip.totalSeats} available</span>
              </div>
            </div>
            <div className="meta-item glass-panel">
              <Car size={18} className="text-muted" />
              <div>
                <span className="text-sm text-muted">Vehicle</span>
                <span className="font-semibold">{trip.vehicle || 'Standard'}</span>
              </div>
            </div>
          </div>

          <div className="price-display">
            <span className="text-muted">Estimated Cost</span>
            <span className="price text-gradient font-bold">₹{trip.estimatedCost}</span>
          </div>

          {/* Action Buttons */}
          <div className="trip-actions">
            {canJoin && (
              <button className="glass-button btn-primary w-full" onClick={handleJoin} disabled={actionLoading}>
                {actionLoading ? <Loader2 size={18} className="spin" /> : <CheckCircle size={18} />}
                Request to Join
              </button>
            )}
            {canLeave && (
              <button className="glass-button btn-outline w-full" onClick={handleLeave} disabled={actionLoading}>
                {actionLoading ? <Loader2 size={18} className="spin" /> : <XCircle size={18} />}
                Leave Trip
              </button>
            )}
            {myParticipation && myParticipation.confirmationStatus === 'PENDING' && (
              <div className="pending-notice">
                <Clock size={16} /> Your join request is pending organizer confirmation
              </div>
            )}
            {myParticipation && myParticipation.confirmationStatus === 'CONFIRMED' && myParticipation.role !== 'DRIVER' && (
              <div className="confirmed-notice">
                <CheckCircle size={16} /> You are confirmed for this trip!
              </div>
            )}
          </div>
        </div>

        {/* Participants Card */}
        <div className="participants-card glass-panel">
          <h3 className="font-bold text-lg" style={{ marginBottom: '16px' }}>
            <Users size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
            Participants ({activeParticipants.length})
          </h3>

          {activeParticipants.length === 0 ? (
            <p className="text-muted">No participants yet. Be the first to join!</p>
          ) : (
            <div className="participant-list">
              {activeParticipants.map(p => {
                const pStatus = CONFIRMATION_STATUS[p.confirmationStatus] || CONFIRMATION_STATUS.PENDING;
                return (
                  <div key={p.id} className="participant-item">
                    <div className="participant-info">
                      <div className="participant-avatar font-bold">{p.displayName?.charAt(0)}</div>
                      <div>
                        <span className="font-semibold">{p.displayName}</span>
                        <div className="participant-meta">
                          <Star size={12} className="star-icon" />
                          <span className="text-sm">{p.rating}</span>
                          <span className="role-tag text-sm">{p.role}</span>
                        </div>
                      </div>
                    </div>
                    <div className="participant-actions">
                      <span className="confirmation-badge" style={{ '--conf-color': pStatus.color }}>
                        {pStatus.label}
                      </span>
                      {isOrganizer && p.confirmationStatus === 'PENDING' && (
                        <div className="organizer-actions">
                          <button
                            className="action-btn confirm-btn"
                            onClick={() => handleConfirm(p.id)}
                            disabled={actionLoading}
                            title="Confirm"
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            className="action-btn reject-btn"
                            onClick={() => handleReject(p.id)}
                            disabled={actionLoading}
                            title="Reject"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Organizer Controls */}
          {isOrganizer && (
            <div className="organizer-controls">
              <h4 className="font-semibold" style={{ marginTop: '24px', marginBottom: '12px' }}>
                Trip Controls
              </h4>
              <div className="control-buttons">
                {(trip.status === 'CONFIRMED' || trip.status === 'PENDING_CONFIRMATION') && (
                  <button className="glass-button btn-primary" onClick={handleLock} disabled={actionLoading}>
                    <Lock size={16} /> Lock Trip
                  </button>
                )}
                {(trip.status === 'LOCKED' || trip.status === 'CONFIRMED') && (
                  <button className="glass-button btn-secondary" onClick={handleStart} disabled={actionLoading}>
                    <Play size={16} /> Start Trip
                  </button>
                )}
                {trip.status === 'LIVE' && (
                  <button className="glass-button btn-primary" onClick={handleComplete} disabled={actionLoading}>
                    <Flag size={16} /> Complete Trip
                  </button>
                )}
                {!['COMPLETED', 'CANCELLED', 'DELETED'].includes(trip.status) && (
                  <button className="glass-button btn-danger" onClick={handleCancel} disabled={actionLoading}>
                    <XCircle size={16} /> Cancel Trip
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TripDetail;
