import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import GalleryView from './components/GalleryView';
import MapDisplay from './components/MapDisplay';
import TripFeed from './components/TripFeed';
import AdminPanel from './components/AdminPanel';
import CommentSection from './components/CommentSection';
import VisitCounter from './components/VisitCounter';
import { Map, LayoutDashboard, MessageSquare, Camera, ChevronUp, ChevronDown } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import DeveloperCredit from './components/DeveloperCredit';
import AnimatedDropdown from './components/AnimatedDropdown';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

function App() {
    console.log("App Version 2 Loaded");
    const [focusLocation, setFocusLocation] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [trips, setTrips] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState('');

    useEffect(() => {
        const q = query(collection(db, "trips"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTrips(t);
            // Default to the first (latest) trip if available, else legacy
            // Only set if we are currently on 'legacy' (or initial load logic)?
            // User requirement: "last trip always display".
            // So if trips exist, default to t[0].id.
            if (t.length > 0) {
                // If the user hasn't manually selected yet (how to track? simplified: just set it)
                // Actually, if I just set it blindly it might override selection on re-renders?
                // `onSnapshot` runs on updates. If a new trip is created, we switch to it.
                // But initially it runs once.
                // Let's rely on checking if selectedTripId is 'legacy' to switch.
                // But we initiated state with 'legacy'.
                // So on first load, we switch.
                // If I select "Legacy" manually later, I don't want it to auto-switch back.
                // Can't easily distinguish "initialized legacy" vs "user selected legacy".
                // Simple approach: Use a "loading" state or distinct initial state.
                // But for now:
                // Assuming this is the *oldest*.
                // If we have new trips, we probably want to see them.
            }
        });
        return () => unsubscribe();
    }, []);

    // Effect to set default trip once trips are loaded
    useEffect(() => {
        if (trips.length > 0 && !selectedTripId) {
            setSelectedTripId(trips[0].id);
        }
    }, [trips, selectedTripId]);

    // Handle initial map load or specific focus
    const handleLocationSelect = (loc) => {
        setFocusLocation(loc);
        // On mobile, close menu to show map when location selected
        setIsMobileMenuOpen(false);
    };

    return (
        <Router>
            <div className="flex h-screen w-screen bg-dark-900 text-white overflow-hidden font-sans relative">
                <DeveloperCredit />

                {/* Mobile-first layout: Map is background, Feed is overlay */}

                <Routes>
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/gallery" element={<GalleryView />} />
                    <Route path="/" element={
                        <div className="relative w-full h-full flex flex-col md:flex-row">
                            {/* Map Container - Full Screen on Mobile, Flexible on Desktop */}
                            <div className="absolute inset-0 z-0 h-full w-full md:relative md:flex-1">
                                <MapDisplay
                                    focusLocation={focusLocation}
                                    selectedTripId={selectedTripId}
                                    tripStart={trips.find(t => t.id === selectedTripId)?.startPoint}
                                    tripEnd={trips.find(t => t.id === selectedTripId)?.endPoint}
                                />
                            </div>

                            {/* Mobile "Show Updates" Button (Only visible when menu closed) */}
                            {!isMobileMenuOpen && (
                                <button
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="md:hidden absolute top-0 left-1/2 -translate-x-1/2 z-20 bg-dark-900/90 backdrop-blur-md border-b border-x border-white/10 text-white px-8 py-3 rounded-b-2xl shadow-[0_5px_20px_rgba(0,0,0,0.5)] flex items-center gap-3 transition-transform hover:translate-y-1"
                                >
                                    <div className="relative flex h-3 w-3">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-sm tracking-wide">View Updates</span>
                                        <ChevronDown size={18} className="text-blue-400" />
                                    </div>
                                </button>
                            )}

                            {/* Sidebar Feed - Curtain Drop on Mobile, Side Panel on Desktop */}
                            <div className={`
                                absolute inset-x-0 top-0 z-30 w-full bg-dark-800/95 backdrop-blur-md border-b md:border-b-0 md:border-l border-white/10 shadow-2xl transition-all duration-500 ease-in-out flex flex-col
                                ${isMobileMenuOpen ? 'h-[100dvh]' : 'h-0 overflow-hidden'} 
                                md:relative md:inset-auto md:h-full md:w-[400px] md:top-auto
                            `}>
                                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-dark-900/50 shrink-0">
                                    <AnimatedDropdown
                                        trips={trips}
                                        selectedTripId={selectedTripId}
                                        onSelect={setSelectedTripId}
                                    />
                                    <div className="flex gap-2 items-center">
                                        {/* Mobile Close Button */}
                                        <button
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"
                                        >
                                            <ChevronUp size={20} />
                                        </button>

                                        <Link to="/gallery" className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Gallery">
                                            <Camera size={18} className="text-gray-400" />
                                        </Link>
                                        <Link to="/admin" className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Admin">
                                            <LayoutDashboard size={18} className="text-gray-400" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                    <TripFeed onLocationSelect={handleLocationSelect} selectedTripId={selectedTripId} />
                                    <div className="p-4 border-t border-white/10">
                                        <CommentSection />
                                    </div>
                                </div>
                            </div>
                        </div>
                    } />
                </Routes>
                <VisitCounter />
            </div>
        </Router>
    );
}

export default App;
