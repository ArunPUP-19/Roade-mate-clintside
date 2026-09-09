import { useState, useEffect, useRef } from 'react';
import { MapPin, LocateFixed, Loader2 } from 'lucide-react';
import { getCitiesForState, matchStateName } from '../data/indianStatesAndCities';
import './LocationInput.css';

const LocationInput = ({
  placeholder,
  value,
  onChange,
  className,
  selectedState = '',
  showLocate = true,
  onStateDetected,
  disabled = false
}) => {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  // Sync query state with external value prop changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Compute suggestions based on selectedState and current query
  useEffect(() => {
    if (disabled || !selectedState) {
      setSuggestions([]);
      return;
    }

    const stateCities = getCitiesForState(selectedState);

    // If query is empty or short, show popular cities for the selected state
    if (!query || query.trim().length < 2) {
      const initialList = stateCities.map(city => ({
        place_id: `local-${city}`,
        display_name: `${city}, ${selectedState}`,
        isLocal: true
      }));
      setSuggestions(initialList);
      return;
    }

    // Filter local curated cities first (instant match)
    const lowerQuery = query.toLowerCase().trim();
    const matchedLocal = stateCities
      .filter(city => city.toLowerCase().includes(lowerQuery))
      .map(city => ({
        place_id: `local-${city}`,
        display_name: `${city}, ${selectedState}`,
        isLocal: true
      }));

    // In addition, query OSM Nominatim with selectedState constraint for granular places/localities
    let isCancelled = false;
    const fetchOSM = async () => {
      try {
        const osmQuery = `${query}, ${selectedState}, India`;
        const osmRes = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(osmQuery)}&addressdetails=1&limit=8`
        );
        if (isCancelled) return;
        const osmData = await osmRes.json();

        // Filter results to ensure they belong to the selected state
        const stateLower = selectedState.toLowerCase();
        const filteredOsm = osmData
          .filter(item => {
            const itemState = item.address?.state?.toLowerCase() || '';
            const itemDisplayName = item.display_name?.toLowerCase() || '';
            return itemState.includes(stateLower) || itemDisplayName.includes(stateLower);
          })
          .map(item => ({
            place_id: item.place_id,
            display_name: item.display_name,
            isLocal: false
          }));

        // Merge local matches and OSM matches without duplicates
        const combined = [...matchedLocal];
        filteredOsm.forEach(item => {
          if (!combined.some(c => c.display_name.toLowerCase() === item.display_name.toLowerCase())) {
            combined.push(item);
          }
        });

        if (!isCancelled) {
          setSuggestions(combined);
        }
      } catch (err) {
        if (!isCancelled) {
          // If network fetch fails, fallback to local matches
          setSuggestions(matchedLocal);
        }
      }
    };

    const debounceTimeout = setTimeout(fetchOSM, 350);
    // Set immediate local matches while OSM query is debouncing
    setSuggestions(matchedLocal);

    return () => {
      isCancelled = true;
      clearTimeout(debounceTimeout);
    };
  }, [query, selectedState, disabled]);

  const handleSelect = (placeName) => {
    setQuery(placeName);
    setShowDropdown(false);
    if (onChange) onChange(placeName);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        let address = '';

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          if (data && data.display_name) {
            const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.suburb;
            const state = data.address?.state;

            if (state) {
              const matched = matchStateName(state);
              if (matched && onStateDetected) {
                onStateDetected(matched);
              }
            }

            address = city && state ? `${city}, ${state}` : data.display_name;
          }
        } catch (err) {
          console.error("Client-side reverse geocoding failed:", err);
        }

        if (address) {
          setQuery(address);
          if (onChange) onChange(address);
        } else {
          alert("Could not retrieve address for your location.");
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Geolocation error:", err);
        alert("Unable to retrieve your location. Please check browser permissions.");
        setIsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className={`location-input-wrapper ${disabled ? 'disabled-wrapper' : ''}`} ref={wrapperRef}>
      <MapPin className="location-icon" size={18} />
      <input
        type="text"
        placeholder={placeholder}
        disabled={disabled}
        className={`glass-input location-input ${!showLocate ? 'no-locate' : ''} ${className || ''}`}
        value={query}
        onChange={(e) => {
          const val = e.target.value;
          setQuery(val);
          setShowDropdown(true);
          if (onChange) onChange(val);
        }}
        onFocus={() => {
          if (!disabled) {
            setShowDropdown(true);
          }
        }}
      />

      {showLocate && (
        <button
          type="button"
          className="locate-btn"
          onClick={getCurrentLocation}
          title="Use my current location"
        >
          {isLoading ? <Loader2 size={18} className="spin" /> : <LocateFixed size={18} />}
        </button>
      )}

      {showDropdown && !disabled && suggestions.length > 0 && (
        <ul className="suggestions-dropdown">
          {selectedState && (
            <li className="suggestions-header">
              Locations in <strong>{selectedState}</strong>
            </li>
          )}
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.place_id}
              onClick={() => handleSelect(suggestion.display_name)}
              className="suggestion-item"
            >
              <MapPin size={14} className="suggestion-icon" />
              <span className="suggestion-text">{suggestion.display_name}</span>
            </li>
          ))}
        </ul>
      )}

      {showDropdown && !disabled && selectedState && suggestions.length === 0 && (
        <ul className="suggestions-dropdown">
          <li className="suggestion-item no-match">
            <span>No matching locations found in {selectedState}</span>
          </li>
        </ul>
      )}
    </div>
  );
};

export default LocationInput;
