import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Map, Check } from 'lucide-react';

const AnimatedDropdown = ({ trips, selectedTripId, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedTripName = selectedTripId === 'legacy'
        ? 'Patna ➜ Bangalore (Old)'
        : trips.find(t => t.id === selectedTripId)?.name || 'Select Trip';

    return (
        <div className="relative group" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 cursor-pointer focus:outline-none"
            >
                <div className="flex flex-col items-start">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Current Trip</span>
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent truncate max-w-[200px]">
                            {selectedTripName}
                        </span>
                        <ChevronDown
                            size={16}
                            className={`text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                        />
                    </div>
                </div>
            </button>

            {/* Dropdown Menu */}
            <div
                className={`
                    absolute top-full left-0 mt-2 w-64 bg-dark-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50
                    transition-all duration-300 origin-top-left
                    ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}
                `}
            >
                <div className="p-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {/* Trips List */}
                    {trips.map((trip) => (
                        <button
                            key={trip.id}
                            onClick={() => {
                                onSelect(trip.id);
                                setIsOpen(false);
                            }}
                            className={`
                                w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group/item transition-all
                                ${selectedTripId === trip.id ? 'bg-blue-600/20' : 'hover:bg-white/5'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-full ${selectedTripId === trip.id ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500 group-hover/item:text-gray-300'}`}>
                                    <Map size={16} />
                                </div>
                                <div>
                                    <div className={`font-semibold text-sm ${selectedTripId === trip.id ? 'text-blue-400' : 'text-gray-300'}`}>
                                        {trip.name}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                        {trip.startPoint?.name || 'Start'} ➜ {trip.endPoint?.name || 'End'}
                                    </div>
                                </div>
                            </div>
                            {selectedTripId === trip.id && <Check size={16} className="text-blue-400" />}
                        </button>
                    ))}

                    <div className="h-px bg-white/10 my-1 mx-2"></div>

                    {/* Legacy Option */}
                    <button
                        onClick={() => {
                            onSelect('legacy');
                            setIsOpen(false);
                        }}
                        className={`
                            w-full text-left px-3 py-3 rounded-lg flex items-center justify-between group/item transition-all
                            ${selectedTripId === 'legacy' ? 'bg-purple-500/10' : 'hover:bg-white/5'}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${selectedTripId === 'legacy' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-800 text-gray-500 group-hover/item:text-gray-300'}`}>
                                <Map size={16} />
                            </div>
                            <div>
                                <div className={`font-semibold text-sm ${selectedTripId === 'legacy' ? 'text-purple-400' : 'text-gray-300'}`}>
                                    Patna ➜ Bangalore
                                </div>
                                <div className="text-[10px] text-gray-500">
                                    Legacy Data (Old)
                                </div>
                            </div>
                        </div>
                        {selectedTripId === 'legacy' && <Check size={16} className="text-purple-400" />}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AnimatedDropdown;
