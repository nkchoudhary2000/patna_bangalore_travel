import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import GalleryView from './components/GalleryView';
import MapDisplay from './components/MapDisplay';
import TripFeed from './components/TripFeed';
import AdminPanel from './components/AdminPanel';
import CommentSection from './components/CommentSection';
import { Map, LayoutDashboard, MessageSquare, Camera } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

function App() {
    console.log("App Version 2 Loaded");
    return (
        <Router>
            <div className="flex h-screen w-screen bg-dark-900 text-white overflow-hidden font-sans">
                {/* Mobile-first layout: Map is background, Feed is overlay */}

                <Routes>
                    <Route path="/admin" element={<AdminPanel />} />
                    <Route path="/gallery" element={<GalleryView />} />
                    <Route path="/" element={
                        <div className="relative w-full h-full flex flex-col md:flex-row">
                            {/* Map Container - Full Screen on Mobile, Flexible on Desktop */}
                            <div className="absolute inset-0 z-0 h-full w-full md:relative md:flex-1">
                                <MapDisplay />
                            </div>

                            {/* Sidebar Feed - Drawer on Mobile, Side Panel on Desktop */}
                            <div className="absolute inset-x-0 bottom-0 z-10 w-full h-[45vh] md:h-full md:w-[400px] md:relative md:inset-auto bg-dark-800/95 backdrop-blur-md border-t md:border-t-0 md:border-l border-white/10 shadow-2xl transition-transform duration-300 ease-in-out flex flex-col">
                                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-dark-900/50">
                                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                                        Patna ➜ Bangalore
                                    </h1>
                                    <div className="flex gap-2">
                                        <Link to="/gallery" className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Gallery">
                                            <Camera size={18} className="text-gray-400" />
                                        </Link>
                                        <Link to="/admin" className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Admin">
                                            <LayoutDashboard size={18} className="text-gray-400" />
                                        </Link>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                                    <TripFeed />
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
