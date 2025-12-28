import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import MediaCarousel from './MediaCarousel';
import { MapPin, Navigation, Coffee, Bed, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

const TripFeed = ({ onLocationSelect }) => {
    const [updates, setUpdates] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "trip_updates"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setUpdates(posts);
        });

        return () => unsubscribe();
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'stop': return <Coffee className="text-orange-400" size={16} />;
            case 'stay': return <Bed className="text-blue-400" size={16} />;
            case 'drive':
            default: return <Navigation className="text-green-400" size={16} />;
        }
    };

    const totalCost = updates.reduce((acc, curr) => acc + (Number(curr.cost) || 0), 0);

    // Helper to request location focus
    const handleCardClick = (post) => {
        if (post.coordinates && onLocationSelect) {
            onLocationSelect([post.coordinates.latitude, post.coordinates.longitude]);
        }
    };

    return (
        <div className="flex flex-col gap-6 p-4">
            {/* Total Expense Summary */}
            <div className="bg-gradient-to-r from-green-900/40 to-emerald-900/40 border border-green-500/20 rounded-xl p-4 flex justify-between items-center shadow-lg">
                <span className="text-sm text-green-200 font-medium">Total Trip Expense</span>
                <span className="text-xl font-bold text-green-400 font-mono">₹{totalCost.toLocaleString()}</span>
            </div>

            {updates.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                    <p>No updates yet. The journey begins soon!</p>
                </div>
            )}

            {updates.map((post, index) => (
                <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4 relative"
                >
                    {/* Timeline Line */}
                    {index !== updates.length - 1 && (
                        <div className="absolute left-[19px] top-10 bottom-[-24px] w-[2px] bg-white/10 z-0"></div>
                    )}

                    {/* Timeline Dot */}
                    <div className="relative z-10 w-10 h-10 rounded-full bg-dark-700/50 border border-white/20 flex items-center justify-center shrink-0 shadow-lg backdrop-blur-sm">
                        {getIcon(post.type)}
                    </div>

                    {/* Content Card */}
                    <div
                        onClick={() => handleCardClick(post)}
                        className="flex-1 bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/10 hover:bg-white/10 transition-all shadow-sm cursor-pointer group"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-semibold text-lg text-white/90 capitalize group-hover:text-blue-400 transition-colors">
                                {post.type === 'drive' ? 'Drive' : post.type} Update
                            </h3>
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock size={12} />
                                {post.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>

                        {post.locationName && (
                            <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(post.locationName)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 mb-2 transition-colors"
                            >
                                <MapPin size={12} />
                                {post.locationName}
                            </a>
                        )}

                        {post.message && (
                            <p className="text-gray-300 text-sm mb-3 leading-relaxed">
                                {post.message}
                            </p>
                        )}

                        {post.mediaUrl && (
                            <div className="mb-3">
                                <MediaCarousel mediaItems={[{ url: post.mediaUrl, type: post.mediaType || 'image' }]} />
                            </div>
                        )}

                        {post.cost > 0 && (
                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                                <span className="text-xs text-red-300 font-mono">
                                    ₹{post.cost} ({post.costCategory})
                                </span>
                            </div>
                        )}

                        {post.aqi && (
                            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-900/50 border border-white/5 mr-2">
                                <span className={`text-[10px] font-bold ${post.aqi <= 50 ? 'text-green-400' :
                                    post.aqi <= 100 ? 'text-yellow-400' :
                                        post.aqi <= 150 ? 'text-orange-400' :
                                            post.aqi <= 200 ? 'text-red-400' :
                                                'text-purple-400'
                                    }`}>
                                    AQI {post.aqi}
                                </span>
                            </div>
                        )}
                    </div>
                </motion.div>
            ))}
        </div>
    );
};

export default TripFeed;
