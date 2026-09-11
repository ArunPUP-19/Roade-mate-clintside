import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LocationInput from '../components/LocationInput';
import { INDIAN_STATES } from '../data/indianStatesAndCities';
import { createTrip } from '../api/tripApi';
import { CheckCircle2, Loader2 } from 'lucide-react';
import './Forms.css';

const ImGoing = () => {
  const navigate = useNavigate();
  const [startingState, setStartingState] = useState('');
  const [startingLocation, setStartingLocation] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [seatsAvailable, setSeatsAvailable] = useState(2);
  const [vehicleType, setVehicleType] = useState('4 wheeler');
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [yourSplit, setYourSplit] = useState('');
  const [negotiable, setNegotiable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const { getAuthHeaders } = useAuth();

  const handleStartingStateChange = (newState) => {
    setStartingState(newState);
    setStartingLocation('');
  };

  const handleDestinationStateChange = (newState) => {
    setDestinationState(newState);
    setDestination('');
  };

  const handleVehicleTypeChange = (newType) => {
    setVehicleType(newType);
    if (newType === '2 wheeler') {
      setSeatsAvailable(1);
    } else if (newType === '3 wheeler') {
      setSeatsAvailable((prev) => {
        const p = parseInt(prev, 10) || 0;
        return p > 4 || p < 1 ? 3 : p;
      });
    } else if (newType === '4 wheeler') {
      setSeatsAvailable((prev) => {
        const p = parseInt(prev, 10) || 0;
        return p < 1 ? 3 : p;
      });
    }
  };

  const getMaxSeats = () => {
    if (vehicleType === '2 wheeler') return 1;
    if (vehicleType === '3 wheeler') return 4;
    return 8;
  };

  const handleSeatsChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setSeatsAvailable('');
      return;
    }
    const num = parseInt(val, 10);
    if (isNaN(num)) return;
    const maxAllowed = getMaxSeats();
    if (num > maxAllowed) {
      setSeatsAvailable(maxAllowed);
    } else if (num < 1) {
      setSeatsAvailable(1);
    } else {
      setSeatsAvailable(num);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startingState || !startingLocation || !destinationState || !destination || !date || !time) {
      alert('Please fill out all required fields (Starting state & location, Destination state & location, Date, and Time).');
      return;
    }

    setIsSubmitting(true);

    try {
      const formattedStarting = startingLocation.toLowerCase().includes(startingState.toLowerCase())
        ? startingLocation
        : `${startingLocation}, ${startingState}`;
      const formattedDestination = destination.toLowerCase().includes(destinationState.toLowerCase())
        ? destination
        : `${destination}, ${destinationState}`;

      const { res, data } = await createTrip({
        startingLocation: formattedStarting,
        destination: formattedDestination,
        date,
        time,
        seatsAvailable: parseInt(seatsAvailable),
        vehicleDetails: `${vehicleType} - ${vehicleName} (${vehicleNumber})`,
        totalCost: totalCost ? parseInt(totalCost) : null,
        yourSplit: yourSplit ? parseInt(yourSplit) : null,
        negotiable
      }, getAuthHeaders());

      if (res.status === 401 || res.status === 403) {
        alert('Your session has expired. Please log in again.');
        return;
      }

      if (res.ok) {
        setSuccessMessage('Your trip has been published successfully!');
        setTimeout(() => {
          // Navigate to Find Trip search to see the published trip
          navigate('/find-trip');
        }, 1500);
      } else {
        alert(data.message || data.error || 'Failed to publish trip.');
      }
    } catch (err) {
      console.error('Error submitting trip:', err);
      alert('Could not connect to the backend server. Please make sure server is running.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container form-page animate-fade-in">
      <div className="form-container glass-panel">
        <h2 className="text-2xl font-bold mb-6 text-center text-gradient">Offer a Ride</h2>
        <p className="text-center text-muted mb-8">
          Already travelling? Offer your empty seats and share travel expenses.
        </p>

        {successMessage && (
          <div className="success-banner mb-6">
            <CheckCircle2 size={20} />
            <span>{successMessage}</span>
          </div>
        )}

        <form className="trip-form" onSubmit={handleSubmit}>
          {/* Starting State */}
          <div className="form-group">
            <label>Starting State *</label>
            <select
              className="glass-input"
              value={startingState}
              onChange={(e) => handleStartingStateChange(e.target.value)}
              required
            >
              <option value="">-- Select State --</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* Starting Location */}
          <div className="form-group">
            <label>Starting Location *</label>
            <LocationInput 
              placeholder={startingState ? `Search or pick location in ${startingState}` : "Select Starting State first"} 
              value={startingLocation}
              onChange={setStartingLocation}
              selectedState={startingState}
              showLocate={true}
              onStateDetected={(detectedState) => setStartingState(detectedState)}
              disabled={!startingState}
            />
          </div>
          
          {/* Destination State */}
          <div className="form-group">
            <label>Destination State *</label>
            <select
              className="glass-input"
              value={destinationState}
              onChange={(e) => handleDestinationStateChange(e.target.value)}
              required
            >
              <option value="">-- Select State --</option>
              {INDIAN_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Location (Current Location button removed) */}
          <div className="form-group">
            <label>Destination *</label>
            <LocationInput 
              placeholder={destinationState ? `Search or pick location in ${destinationState}` : "Select Destination State first"} 
              value={destination}
              onChange={setDestination}
              selectedState={destinationState}
              showLocate={false}
              disabled={!destinationState}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Date *</label>
              <input 
                type="date" 
                className="glass-input" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Time *</label>
              <input 
                type="time" 
                className="glass-input" 
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Available Seats</label>
              <input 
                type="number" 
                min="1" 
                max={getMaxSeats()} 
                value={seatsAvailable}
                onChange={handleSeatsChange}
                disabled={vehicleType === '2 wheeler'}
                className="glass-input" 
              />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {vehicleType === '2 wheeler' 
                  ? 'Auto-set to 1 seat (Bike / Scooter)' 
                  : vehicleType === '3 wheeler' 
                  ? 'Max 4 seats for 3 Wheeler (Auto)' 
                  : 'Max 8 seats for 4 Wheeler (Car)'}
              </span>
            </div>
            <div className="form-group">
              <label>Vehicle Type</label>
              <select 
                value={vehicleType}
                onChange={(e) => handleVehicleTypeChange(e.target.value)}
                className="glass-input"
              >
                <option value="2 wheeler">2 Wheeler</option>
                <option value="3 wheeler">3 Wheeler</option>
                <option value="4 wheeler">4 Wheeler</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Vehicle Name</label>
              <input 
                type="text" 
                placeholder={
                  vehicleType === '2 wheeler' 
                    ? 'e.g., Honda Activa / Royal Enfield' 
                    : vehicleType === '3 wheeler' 
                    ? 'e.g., Bajaj RE Auto / Piaggio' 
                    : 'e.g., Honda City / Swift'
                } 
                value={vehicleName}
                onChange={(e) => setVehicleName(e.target.value)}
                className="glass-input" 
              />
            </div>
            <div className="form-group">
              <label>Vehicle Number</label>
              <input 
                type="text" 
                placeholder="e.g., TN 38 AA 1234" 
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                className="glass-input" 
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Trip Total Cost</label>
              <input 
                type="number" 
                min="0"
                placeholder="e.g., 500" 
                value={totalCost}
                onChange={(e) => setTotalCost(e.target.value)}
                className="glass-input" 
              />
            </div>
            <div className="form-group">
              <label>Your Split</label>
              <input 
                type="number" 
                min="0"
                placeholder="e.g., 250" 
                value={yourSplit}
                onChange={(e) => setYourSplit(e.target.value)}
                className="glass-input" 
              />
            </div>
          </div>
          
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <input 
              type="checkbox" 
              id="negotiable"
              checked={negotiable}
              onChange={(e) => setNegotiable(e.target.checked)}
              style={{ width: '16px', height: '16px' }}
            />
            <label htmlFor="negotiable" style={{ marginBottom: 0 }}>Negotiable</label>
          </div>
          
          <button 
            type="submit" 
            className="glass-button btn-primary w-full mt-4"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spin" />
                Publishing...
              </>
            ) : (
              'Publish Trip'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ImGoing;
