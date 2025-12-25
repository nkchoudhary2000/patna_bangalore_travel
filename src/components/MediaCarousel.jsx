import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';

const getDirectUrl = (url) => {
    if (!url) return '';

    // Extract ID from various Google Drive link formats
    const idMatch = url.match(/\/d\/(.*?)(?:\/|$)|id=(.*?)(?:&|$)/);

    if (url.includes('drive.google.com') && idMatch) {
        const id = idMatch[1] || idMatch[2];
        // Use thumbnail endpoint with large size (s4000) for reliable image loading
        // effectively bypassing standard view limit restrictions for public files
        return `https://drive.google.com/thumbnail?id=${id}&sz=s4000`;
    }
    return url;
};

const MediaCarousel = ({ mediaItems = [] }) => {
    // MediaItems should be an array of { type: 'image' | 'video', url: string } or just strings
    const [currentIndex, setCurrentIndex] = useState(0);
    const [items, setItems] = useState([]);
    const [isFullScreen, setIsFullScreen] = useState(false);

    useEffect(() => {
        if (!mediaItems || mediaItems.length === 0) {
            setItems([]);
            return;
        }

        // Normalize input
        const normalized = mediaItems.map(item => {
            if (!item) return null;
            if (typeof item === 'string') {
                return { type: 'image', url: getDirectUrl(item) };
            }
            // If it's a video and google drive, we need the preview URL, NOT the direct download UC link
            if (item.type === 'video' && item.url && item.url.includes('drive.google.com')) {
                const idMatch = item.url.match(/\/d\/(.*?)(?:\/|$)|id=(.*?)(?:&|$)/);
                const id = idMatch ? (idMatch[1] || idMatch[2]) : null;
                if (id) return { ...item, url: `https://drive.google.com/file/d/${id}/preview` };
            }
            return { ...item, url: getDirectUrl(item.url) };
        }).filter(Boolean); // Remove nulls

        setItems(normalized);
    }, [mediaItems]);

    useEffect(() => {
        if (items.length <= 1) return;
        const timer = setInterval(() => {
            nextSlide();
        }, 5000); // 5s Auto-play
        return () => clearInterval(timer);
    }, [items, currentIndex]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % items.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    };

    if (!items || items.length === 0) return null;

    const currentItem = items[currentIndex];
    if (!currentItem) return null;

    const getIframeSrc = (url) => {
        try {
            return url.replace('/view', '/preview')
                .replace('uc?export=view&id=', 'file/d/')
                .replace('preview&id=', 'preview');
        } catch (e) {
            return url;
        }
    };



    // ... (rest of render logic remains, but add onClick to main container to open full screen)

    return (
        <>
            {/* Main Carousel Container */}
            <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden group shadow-2xl border border-white/10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/40"
                    >
                        {currentItem.type === 'video' ? (
                            currentItem.url && currentItem.url.includes('drive.google.com') ? (
                                <iframe
                                    src={getIframeSrc(currentItem.url)}
                                    className="w-full h-full"
                                    allow="autoplay"
                                    title="Video Player"
                                ></iframe>
                            ) : (
                                <video
                                    src={currentItem.url}
                                    className="w-full h-full object-contain"
                                    controls
                                    playsInline
                                    loop
                                />
                            )
                        ) : (
                            // Image / Photos Logic
                            currentItem.url && currentItem.url.includes('photos.app.goo.gl') ? (
                                <div className="w-full h-full bg-dark-800 flex flex-col items-center justify-center p-4 text-center cursor-pointer hover:bg-dark-700 transition"
                                    onClick={() => window.open(currentItem.url, '_blank')}
                                >
                                    <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                                        <Maximize2 className="text-blue-400" />
                                    </div>
                                    <h3 className="text-white font-bold mb-1">Google Photos Link</h3>
                                    <p className="text-xs text-gray-400">Cannot embed directly.<br />Click to view album.</p>
                                </div>
                            ) : (
                                <img
                                    src={currentItem.url}
                                    alt="Trip update"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                    onError={(e) => {
                                        // Fallback for broken links (often expired drive links or restricted photos)
                                        e.target.style.display = 'none';
                                        e.target.parentElement.innerHTML = `
                                        <div class="w-full h-full bg-dark-800 flex flex-col items-center justify-center p-4 text-center">
                                            <p class="text-xs text-red-400 mb-2">Image Failed to Load</p>
                                            <a href="${currentItem.url}" target="_blank" class="px-3 py-1 bg-white/10 rounded text-xs text-white hover:bg-white/20">
                                                Open Link
                                            </a>
                                        </div>`;
                                    }}
                                />
                            )
                        )}

                        {/* Expand Button - Explicit Action (Only for non-placeholder) */}
                        {!currentItem.url.includes('photos.app.goo.gl') && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsFullScreen(true);
                                }}
                                className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80 hover:text-blue-400 z-10"
                                title="View Full Screen"
                            >
                                <Maximize2 size={24} />
                            </button>
                        )}
                    </motion.div>
                </AnimatePresence>

                {/* Navigation Overlays - STOP PROPAGATION to prevent opening modal when clicking next/prev */}
                {items.length > 1 && (
                    <>
                        <div className="absolute inset-0 flex items-center justify-between p-2 pointer-events-none">
                            <button onClick={(e) => { e.stopPropagation(); prevSlide(); }} className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm pointer-events-auto transition-colors">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); nextSlide(); }} className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white backdrop-blur-sm pointer-events-auto transition-colors">
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2" onClick={e => e.stopPropagation()}>
                            {items.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex ? 'bg-white w-6' : 'bg-white/50'}`}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Full Screen Modal */}
            <AnimatePresence>
                {isFullScreen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
                        onClick={() => setIsFullScreen(false)}
                    >
                        <div className="relative w-full h-full max-w-7xl flex items-center justify-center" onClick={e => e.stopPropagation()}>
                            {/* Close Button */}
                            <button
                                onClick={() => setIsFullScreen(false)}
                                className="absolute top-4 right-4 text-white hover:text-red-400 z-50 p-2 bg-black/50 rounded-full"
                            >
                                <ChevronRight className="rotate-90" size={32} /> {/* Using rotated chevron as helper or LogOut/X if available, sticking to available icons */}
                            </button>

                            {currentItem.type === 'video' ? (
                                currentItem.url && currentItem.url.includes('drive.google.com') ? (
                                    <iframe
                                        src={getIframeSrc(currentItem.url)}
                                        className="w-full h-full rounded-xl"
                                        allow="autoplay; fullscreen"
                                        title="Video Player Full"
                                    ></iframe>
                                ) : (
                                    <video
                                        src={currentItem.url}
                                        controls
                                        className="w-full h-full object-contain rounded-xl"
                                        autoPlay
                                    />
                                )
                            ) : (
                                <img
                                    src={currentItem.url}
                                    alt="Full screen view"
                                    className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                                    referrerPolicy="no-referrer"
                                />
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default MediaCarousel;
