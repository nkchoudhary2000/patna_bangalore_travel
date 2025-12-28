import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import GalleryView from './components/GalleryView';
import MapDisplay from './components/MapDisplay';
import TripFeed from './components/TripFeed';
import AdminPanel from './components/AdminPanel';
import CommentSection from './components/CommentSection';
import { Map, LayoutDashboard, MessageSquare, Camera, ChevronUp, ChevronDown } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

import DeveloperCredit from './components/DeveloperCredit';
import { useState } from 'react';

function App() {
    console.log("App Version 2 Loaded");
    const [focusLocation, setFocusLocation] = useState(null);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                                <MapDisplay focusLocation={focusLocation} />
                            </div>

                            {/* Mobile "Show Updates" Button (Only visible when menu closed) */}
                            {!isMobileMenuOpen && (
                                <button
                                    onClick={() => setIsMobileMenuOpen(true)}
                                    className="md:hidden absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce"
                                >
                                    <ChevronUp size={20} />
                                    <span className="font-bold text-sm">View Updates</span>
                                </button>
                            )}

                            {/* Sidebar Feed - Drawer on Mobile, Side Panel on Desktop */}
                            <div className={`
                                absolute inset-x-0 bottom-0 z-30 w-full bg-dark-800/95 backdrop-blur-md border-t md:border-t-0 md:border-l border-white/10 shadow-2xl transition-all duration-500 ease-in-out flex flex-col
                                ${isMobileMenuOpen ? 'h-[100dvh] top-0' : 'h-0 overflow-hidden'} 
                                md:relative md:inset-auto md:h-full md:w-[400px] md:top-auto
                            `}>
                                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-dark-900/50 shrink-0">
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                        Patna ➜ Bangalore
                                    </h1>
                                    <div className="flex gap-2 items-center">
                                        {/* Mobile Close Button */}
                                        <button
                                            onClick={() => setIsMobileMenuOpen(false)}
                                            className="md:hidden p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400"
                                        >
                                            <ChevronDown size={20} />
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
                                    <TripFeed onLocationSelect={handleLocationSelect} />
                                    <div className="p-4 border-t border-white/10">
                                        <CommentSection />
                                    </div>
                                </div>
                            </div>
                        </div>
                    } />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
