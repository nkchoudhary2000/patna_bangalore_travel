import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { motion } from 'framer-motion';
import { MapPin, Calendar, ArrowLeft, Camera, Video } from 'lucide-react';
import { Link } from 'react-router-dom';

const GalleryView = () => {
    const [mediaPosts, setMediaPosts] = useState([]);

    useEffect(() => {
        const q = query(collection(db, "trip_updates"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const posts = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(post => post.mediaUrl); // Only posts with media
            setMediaPosts(posts);
        });
        return () => unsubscribe();
    }, []);

    const getDirectUrl = (url) => {
        if (!url) return '';
        const idMatch = url.match(/\/d\/(.*?)(?:\/|$)|id=(.*?)(?:&|$)/);
        if (url.includes('drive.google.com') && idMatch) {
            const id = idMatch[1] || idMatch[2];
            return `https://drive.google.com/thumbnail?id=${id}&sz=w800`; // Smaller size for grid
        }
        return url;
    };

    return (
        <div className="min-h-screen bg-dark-900 text-white p-4 pb-20 md:p-8">
            <header className="flex justify-between items-center mb-8 max-w-7xl mx-auto">
                <div className="flex items-center gap-4">
                    <Link to="/" className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Trip Gallery
                    </h1>
                </div>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {mediaPosts.map((post, index) => (
                    <motion.div
                        key={post.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-white/5 rounded-xl overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:shadow-xl group"
                    >
                        {/* Media Thumbnail */}
                        <div className="aspect-video bg-black relative">
                            {post.mediaType === 'video' ? (
                                <div className="w-full h-full flex items-center justify-center bg-dark-800">
                                    <Video size={48} className="text-white/50" />
                                    {/* Overlay helper */}
                                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                                </div>
                            ) : (
                                <img
                                    src={getDirectUrl(post.mediaUrl)}
                                    alt={post.locationName || 'Trip Image'}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                        e.target.src = 'https://placehold.co/600x400/000000/FFF?text=Image';
                                    }}
                                />
                            )}

                            {/* Type Badge */}
                            <div className="absolute top-2 right-2">
                                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full backdrop-blur-md ${post.type === 'stop' ? 'bg-orange-500/80 text-white' :
                                    post.type === 'stay' ? 'bg-blue-500/80 text-white' :
                                        'bg-green-500/80 text-white'
                                    }`}>
                                    {post.type}
                                </span>
                            </div>

                            {/* Link Interaction */}
                            <a href={post.mediaUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 z-10" aria-label="View Full Media" />
                        </div>

                        {/* Metadata Footer */}
                        <div className="p-4 space-y-2">
                            <div className="flex justify-between items-start">
                                <h3 className="text-sm font-semibold truncate flex-1 pr-2" title={post.locationName}>
                                    {post.locationName || 'Unknown Location'}
                                </h3>
                                {post.mediaType === 'video' && <Video size={14} className="text-gray-400 shrink-0 mt-1" />}
                                {post.mediaType === 'image' && <Camera size={14} className="text-gray-400 shrink-0 mt-1" />}
                            </div>

                            <div className="flex justify-between items-center text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Calendar size={12} />
                                    <span>{post.timestamp?.toDate().toLocaleDateString()}</span>
                                </div>
                                {post.cost > 0 && (
                                    <span className="text-green-400 font-mono">₹{post.cost}</span>
                                )}
                            </div>

                            {post.message && (
                                <p className="text-xs text-gray-400 line-clamp-2 mt-2 border-t border-white/5 pt-2">
                                    {post.message}
                                </p>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {mediaPosts.length === 0 && (
                <div className="text-center text-gray-500 py-20">
                    <Camera size={48} className="mx-auto mb-4 opacity-20" />
                    <p>No media uploaded yet.</p>
                </div>
            )}
        </div>
    );
};

export default GalleryView;
