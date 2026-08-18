import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../config/api';

export default function GlobalSearchBar({ placeholder = "Search for food, groceries, items..." }) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef(null);
  const debounceTimeout = useRef(null);

  const fetchSuggestions = async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
    }
  };

  useEffect(() => {
    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsFocused(true);

    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchSuggestions(value);
    }, 300);
  };

  const submitSearch = (queryStr) => {
    const q = (queryStr || searchQuery).trim();
    if (q) {
      navigate(`/restaurants?search=${encodeURIComponent(q)}`);
    } else {
      navigate('/restaurants');
    }
    setIsFocused(false);
    setSuggestions([]);
  };

  const handleSelectSuggestion = (suggestion) => {
    const text = typeof suggestion === 'object' && suggestion !== null ? (suggestion.text || suggestion.name || '') : String(suggestion || '');
    setSearchQuery(text);
    submitSearch(text);
  };

  const handleKeyDown = (e) => {
    if (!isFocused) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => prev >= suggestions.length - 1 ? 0 : prev + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => prev <= 0 ? suggestions.length - 1 : prev - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelectSuggestion(suggestions[activeIndex]);
      } else {
        submitSearch();
      }
    } else if (e.key === 'Escape') {
      setSuggestions([]);
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative w-full z-30">
      {/* Search Input Container */}
      <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm border border-white/80 rounded-2xl md:rounded-3xl px-4 py-3 sm:py-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.03)] focus-within:border-primary focus-within:shadow-md transition-all">
        <Search className="w-5 h-5 text-primary flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          className="w-full bg-transparent border-none outline-none text-xs sm:text-sm font-semibold text-[#1E1B4B] placeholder:text-slate-400 placeholder:font-medium"
        />
      </div>

      {/* Suggestions Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div className="absolute top-[110%] left-0 right-0 bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-xl overflow-hidden z-40">
          <ul className="py-2 max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, idx) => {
              const text = typeof suggestion === 'object' && suggestion !== null ? (suggestion.text || suggestion.name || '') : String(suggestion || '');
              return (
                <li
                  key={idx}
                  onMouseDown={() => handleSelectSuggestion(suggestion)}
                  className={`px-4 py-2.5 text-xs sm:text-sm font-semibold cursor-pointer transition-colors flex items-center gap-2 ${
                    activeIndex === idx ? 'bg-purple-50 text-primary' : 'text-[#1E1B4B] hover:bg-purple-50/60'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                  <span className="truncate">{text}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
