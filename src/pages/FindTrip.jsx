import { useState, useEffect } from 'react';
import { Search, Loader2, Car, Hand, MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import LocationInput from '../components/LocationInput';
import TripCard from '../components/TripCard';
import RequestCard from '../components/RequestCard';
import './Forms.css';
import './FindTrip.css';

/**
 * Extracts a city/district name from a location string.
 * "Gandhipuram, Coimbatore" → "Coimbatore"
 * "Coimbatore, Tamil Nadu, India" → "Coimbatore"
 */
const extractCity = (location) => {
  if (!location) return 'Other';
  const parts = location.split(',').map(p => p.trim());
  const ignore = ['india', 'tamil nadu', 'kerala', 'karnataka', 'andhra pradesh', 'telangana', 'maharashtra', 'rajasthan', 'gujarat', 'madhya pradesh', 'uttar pradesh', 'bihar', 'west bengal', 'odisha', 'punjab', 'haryana', 'himachal pradesh', 'uttarakhand', 'jharkhand', 'chhattisgarh', 'goa', 'assam'];
  const meaningful = parts.filter(p => !ignore.includes(p.toLowerCase()));
  if (meaningful.length === 0) return parts[0];
  if (meaningful.length === 1) return meaningful[0];
  return meaningful[meaningful.length - 1];
};

const groupByCity = (items, locationField) => {
  const groups = {};
  items.forEach(item => {
    const city = extractCity(item[locationField]);
    if (!groups[city]) groups[city] = [];
    groups[city].push(item);
  });
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
};

const FindTrip = () => {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [date, setDate] = useState('');
  const [trips, setTrips] = useState([]);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(null); // null | 'trips' | 'requests'

  const fetchTrips = async (searchFrom = from, searchTo = to, searchDate = date) => {
    setIsLoading(true);

    try {
      const queryParams = new URLSearchParams();
      if (searchFrom) queryParams.append('from', searchFrom);
      if (searchTo) queryParams.append('to', searchTo);
      if (searchDate) queryParams.append('date', searchDate);

      const [tripsRes, requestsRes] = await Promise.all([
        fetch(`http://localhost:5000/api/trips?${queryParams.toString()}`),
        fetch(`http://localhost:5000/api/requests`)
      ]);

      const tripsData = await tripsRes.json();
      const requestsData = await requestsRes.json();

      if (tripsData.trips) setTrips(tripsData.trips);

      if (requestsData.requests) {
        let filteredRequests = requestsData.requests;
        if (searchFrom) {
          filteredRequests = filteredRequests.filter(r =>
            r.startingLocation.toLowerCase().includes(searchFrom.toLowerCase())
          );
        }
        if (searchTo) {
          filteredRequests = filteredRequests.filter(r =>
            r.destination.toLowerCase().includes(searchTo.toLowerCase())
          );
        }
        if (searchDate) {
          filteredRequests = filteredRequests.filter(r => r.date === searchDate);
        }
        setRequests(filteredRequests);
      }
    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips('', '', '');
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTrips(from, to, date);
  };

  const toggleSection = (section) => {
    setActiveSection(prev => prev === section ? null : section);
  };

  const tripsByCity = groupByCity(trips, 'startingLocation');
  const requestsByCity = groupByCity(requests, 'startingLocation');

  return (
    <div className="container find-trip-page animate-fade-in">
      {/* Search Bar */}
      <div className="search-section glass-panel">
        <h2 className="text-2xl font-bold mb-4 text-center text-gradient">Find a Trip</h2>
        <p className="text-center text-muted mb-6">
          Search for existing trips and ride requests that match your route.
        </p>
        
        <form className="trip-form" onSubmit={handleSearch}>
          <div className="form-row">
            <div className="form-group">
              <label>Starting Location</label>
              <LocationInput placeholder="Where from?" value={from} onChange={setFrom} />
            </div>
            <div className="form-group">
              <label>Destination</label>
              <LocationInput placeholder="Where to?" value={to} onChange={setTo} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Date (Optional)</label>
              <input type="date" className="glass-input" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="form-group flex items-center justify-center pt-6">
              <button type="submit" className="glass-button btn-primary w-full">
                {isLoading ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
                Search Trips
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Two Clickable Section Cards */}
      <div className="section-cards">
        {/* Ride Offers Card */}
        <button
          className={`section-card ${activeSection === 'trips' ? 'section-card--active' : ''}`}
          onClick={() => toggleSection('trips')}
          type="button"
        >
          <div className="section-card-icon trips-icon">
            <Car size={28} />
          </div>
          <div className="section-card-info">
            <h3 className="section-card-title">Ride Offers</h3>
            <p className="section-card-count">
              {trips.length} {trips.length === 1 ? 'trip' : 'trips'} available
            </p>
          </div>
          <div className="section-card-arrow">
            {activeSection === 'trips' ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
          </div>
        </button>

        {/* Ride Requests Card */}
        <button
          className={`section-card ${activeSection === 'requests' ? 'section-card--active' : ''}`}
          onClick={() => toggleSection('requests')}
          type="button"
        >
          <div className="section-card-icon requests-icon">
            <Hand size={28} />
          </div>
          <div className="section-card-info">
            <h3 className="section-card-title">Ride Requests</h3>
            <p className="section-card-count">
              {requests.length} {requests.length === 1 ? 'person' : 'people'} looking
            </p>
          </div>
          <div className="section-card-arrow">
            {activeSection === 'requests' ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
          </div>
        </button>
      </div>

      {/* Expanded Content */}
      {activeSection === 'trips' && (
        <div className="expanded-section animate-slide-down">
          <div className="expanded-header">
            <Car size={20} className="expanded-header-icon trips-text" />
            <h3 className="expanded-title">Ride Offers</h3>
          </div>

          {isLoading ? (
            <div className="section-empty">
              <Loader2 size={24} className="spin" />
              <span>Loading trips...</span>
            </div>
          ) : tripsByCity.length > 0 ? (
            <div className="city-list">
              {tripsByCity.map(([city, cityTrips]) => (
                <CityGroup key={city} cityName={city} count={cityTrips.length}>
                  {cityTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} />
                  ))}
                </CityGroup>
              ))}
            </div>
          ) : (
            <div className="section-empty">
              <Car size={32} className="text-muted" />
              <span>No matching trips found</span>
              <span className="text-muted text-sm">Try offering a ride!</span>
            </div>
          )}
        </div>
      )}

      {activeSection === 'requests' && (
        <div className="expanded-section animate-slide-down">
          <div className="expanded-header">
            <Hand size={20} className="expanded-header-icon requests-text" />
            <h3 className="expanded-title">Ride Requests</h3>
          </div>

          {isLoading ? (
            <div className="section-empty">
              <Loader2 size={24} className="spin" />
              <span>Loading requests...</span>
            </div>
          ) : requestsByCity.length > 0 ? (
            <div className="city-list">
              {requestsByCity.map(([city, cityRequests]) => (
                <CityGroup key={city} cityName={city} count={cityRequests.length}>
                  {cityRequests.map(request => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </CityGroup>
              ))}
            </div>
          ) : (
            <div className="section-empty">
              <Hand size={32} className="text-muted" />
              <span>No ride requests yet</span>
              <span className="text-muted text-sm">Publish one if you need a ride!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ── City Group (collapsible) ── */
const CityGroup = ({ cityName, count, children }) => {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="city-group">
      <button className="city-group-header" onClick={() => setIsOpen(!isOpen)} type="button">
        <div className="city-group-left">
          <MapPin size={16} className="city-pin-icon" />
          <span className="city-name">{cityName}</span>
          <span className="city-count">{count}</span>
        </div>
        {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isOpen && (
        <div className="city-group-items">
          {children}
        </div>
      )}
    </div>
  );
};

export default FindTrip;
