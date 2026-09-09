import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Car, Star, ArrowRight } from 'lucide-react';
import './TripCard.css';

const STATUS_LABELS = {
  ACTIVE: 'Open',
  PENDING_CONFIRMATION: 'Pending',
  CONFIRMED: 'Confirmed',
  LOCKED: 'Locked',
  LIVE: 'Live',
  FULL: 'Full',
  COMPLETED: 'Done',
  CANCELLED: 'Cancelled',
};

const TripCard = ({ trip }) => {
  const navigate = useNavigate();
  const {
    id,
    driverName,
    driverRating,
    startingLocation,
    destination,
    date,
    time,
    seatsAvailable,
    estimatedCost,
    vehicle,
    status
  } = trip;

  return (
    <div
      className="trip-card glass-panel animate-fade-in"
      onClick={() => navigate(`/trip/${id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/trip/${id}`)}
    >
      <div className="trip-header">
        <div className="driver-info">
          <div className="avatar font-bold">{driverName.charAt(0)}</div>
          <div>
            <h4 className="font-semibold text-lg">{driverName}</h4>
            <div className="rating">
              <Star size={14} className="star-icon" />
              <span className="text-sm font-semibold">{driverRating}</span>
            </div>
          </div>
        </div>

        <div className="trip-price text-right">
          <span className="text-2xl font-bold text-gradient">₹{estimatedCost}</span>
          <span className="text-xs text-muted block">estimated split</span>
          {status && status !== 'ACTIVE' && (
            <span className={`trip-status-tag status-${status?.toLowerCase()}`}>
              {STATUS_LABELS[status] || status}
            </span>
          )}
        </div>
      </div>

      <div className="trip-route">
        <div className="route-point">
          <div className="dot start-dot"></div>
          <div className="location-name">{startingLocation}</div>
        </div>
        <div className="route-line"></div>
        <div className="route-point">
          <div className="dot end-dot"></div>
          <div className="location-name">{destination}</div>
        </div>
      </div>

      <div className="trip-details-grid">
        <div className="detail-item">
          <Calendar size={16} className="text-muted" />
          <span>{date}</span>
        </div>
        <div className="detail-item">
          <Clock size={16} className="text-muted" />
          <span>{time}</span>
        </div>
        <div className="detail-item">
          <User size={16} className="text-muted" />
          <span>{seatsAvailable} seats left</span>
        </div>
        <div className="detail-item">
          <Car size={16} className="text-muted" />
          <span>{vehicle || 'Standard'}</span>
        </div>
      </div>

      <div className="trip-footer">
        <button className="glass-button btn-primary w-full">
          <span>View Details</span>
          <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default TripCard;
