import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LocationInput from '../components/LocationInput';
import { INDIAN_STATES } from '../data/indianStatesAndCities';
import { createRequest } from '../api/requestApi';
import { CheckCircle2, Loader2 } from 'lucide-react';
import './Forms.css';

const IWantToGo = () => {
  const navigate = useNavigate();
  const [startingState, setStartingState] = useState('');
  const [startingLocation, setStartingLocation] = useState('');
  const [destinationState, setDestinationState] = useState('');
  const [destination, setDestination] = useState('');
  const [date, setDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startingState || !startingLocation || !destinationState || !destination || !date) {
      alert('Please fill out all required fields (Starting state & location, Destination state & location, and Date).');
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

      const { res, data } = await createRequest({
        startingLocation: formattedStarting,
        destination: formattedDestination,
        date,
        preferredTime
      }, getAuthHeaders());

      if (res.status === 401 || res.status === 403) {
        alert('Your session has expired. Please log in again.');
        return;
      }

      if (res.ok) {
        setSuccessMessage('Your ride request has been published!');
        setTimeout(() => {
          navigate('/find-trip');
        }, 1500);
      } else {
        alert(data.message || data.error || 'Failed to submit request.');
      }
    } catch (err) {
      console.error('Error submitting request:', err);
      alert('Could not connect to the backend server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container form-page animate-fade-in">
      <div className="form-container glass-panel">
        <h2 className="text-2xl font-bold mb-6 text-center text-gradient">Request a Ride</h2>
        <p className="text-center text-muted mb-8">
          Can't find a trip? Let people know where you need to go.
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
              <label>Preferred Time</label>
              <input 
                type="time" 
                className="glass-input" 
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            className="glass-button btn-secondary w-full mt-4"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="spin" />
                Submitting Request...
              </>
            ) : (
              'Publish Request'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default IWantToGo;
