import { Calendar, Clock, User, MapPin, Navigation } from 'lucide-react';
import './RequestCard.css';

const RequestCard = ({ request }) => {
  const {
    passengerName,
    passengerRating,
    startingLocation,
    destination,
    date,
    preferredTime
  } = request;

  return (
    <div className="request-card glass-panel animate-fade-in">
      <div className="request-badge">
        <Navigation size={12} />
        <span>Ride Request</span>
      </div>

      <div className="request-header">
        <div className="requester-info">
          <div className="avatar request-avatar font-bold">{passengerName.charAt(0)}</div>
          <div>
            <h4 className="font-semibold text-lg">{passengerName}</h4>
            <div className="rating">
              <span className="text-sm" style={{ color: 'var(--accent)' }}>★ {passengerRating}</span>
            </div>
          </div>
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

      <div className="request-details-grid">
        <div className="detail-item">
          <Calendar size={16} className="text-muted" />
          <span>{date}</span>
        </div>
        <div className="detail-item">
          <Clock size={16} className="text-muted" />
          <span>{preferredTime || 'Flexible'}</span>
        </div>
      </div>
    </div>
  );
};

export default RequestCard;
