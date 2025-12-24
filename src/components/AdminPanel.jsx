import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { Lock, LogOut, Send, Navigation, Camera, Wallet, MapPin, Edit2, Trash2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MediaCarousel from './MediaCarousel';

const AdminPanel = () => {
    const [user, setUser] = useState(null);
    const [formData, setFormData] = useState({
        type: 'drive',
        message: '',
        mediaUrl: '',
        mediaType: 'image',
        cost: '',
        costCategory: 'Petrol',
        coords: null,
        locationName: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [status, setStatus] = useState('');
    const [recentUpdates, setRecentUpdates] = useState([]);
    const navigate = useNavigate();

    // TODO: Replace with your actual email
    const AUTHORIZED_EMAIL = "niraj.choudhary1995@gmail.com";

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (u && u.email === AUTHORIZED_EMAIL || !AUTHORIZED_EMAIL.includes("@")) {
                setUser(u);
            } else if (u) {
                setStatus("Unauthorized User");
                auth.signOut();
            } else {
                setUser(null);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, "trip_updates"), orderBy("timestamp", "desc"), limit(5));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRecentUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [user]);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error(error);
            setStatus("Login failed");
        }
    };

    const getLocation = () => {
        setStatus("Fetching location...");
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;

                    let address = '';
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                        const data = await res.json();
                        address = data.address.city || data.address.town || data.address.village || data.display_name.split(',')[0];
                    } catch (e) {
                        console.error("Reverse geocode failed", e);
                    }

                    setFormData(prev => ({
                        ...prev,
                        locationName: address,
                        coords: {
                            latitude: lat,
                            longitude: lon
                        }
                    }));
                    setStatus("Location updated!");
                },
                (err) => setStatus("Location denied/error")
            );
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        setStatus(editingId ? "Updating..." : "Posting...");

        try {
            const dataToSave = {
                type: formData.type,
                message: formData.message,
                mediaUrl: formData.mediaUrl,
                mediaType: formData.mediaType || 'image',
                cost: Number(formData.cost) || 0,
                costCategory: formData.costCategory,
                coordinates: formData.coords,
                locationName: formData.locationName
            };

            // Only set timestamp on creation to preserve original time
            if (!editingId) {
                dataToSave.timestamp = serverTimestamp();
            }

            if (editingId) {
                await updateDoc(doc(db, "trip_updates", editingId), dataToSave);
                setStatus("Success! Updated.");
                setEditingId(null);
            } else {
                await addDoc(collection(db, "trip_updates"), dataToSave);
                setStatus("Success! Posted.");
            }

            setFormData({ ...formData, message: '', mediaUrl: '', cost: '', locationName: '' });
        } catch (err) {
            console.error(err);
            setStatus("Error saving update.");
        }
    };

    const handleEdit = (update) => {
        setFormData({
            type: update.type,
            message: update.message || '',
            mediaUrl: update.mediaUrl || '',
            mediaType: update.mediaType || 'image',
            cost: update.cost || '',
            costCategory: update.costCategory || 'Petrol',
            coords: update.coordinates,
            locationName: update.locationName || ''
        });
        setEditingId(update.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this update?")) {
            try {
                await deleteDoc(doc(db, "trip_updates", id));
            } catch (err) {
                console.error("Delete failed", err);
            }
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setFormData({ ...formData, message: '', mediaUrl: '', cost: '', locationName: '' });
    };

    if (!user) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-dark-900">
                <div className="p-8 bg-dark-800 rounded-2xl border border-white/10 text-center max-w-sm w-full">
                    <Lock className="mx-auto mb-4 text-purple-400" size={48} />
                    <h2 className="text-xl font-bold mb-2">Admin Access</h2>
                    <p className="text-gray-400 mb-6 text-sm">Security restricted to authorized personnel only.</p>
                    <button
                        onClick={handleLogin}
                        className="w-full py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        Sign in with Google
                    </button>
                    {status && <p className="mt-4 text-red-400 text-sm">{status}</p>}
                    <button onClick={() => navigate('/')} className="mt-4 text-xs text-gray-500 hover:text-white">Back to Map</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-dark-900 text-white p-4 pb-20 overflow-x-hidden">
            <header className="flex justify-between items-center mb-6 max-w-7xl mx-auto">
                <h1 className="text-xl font-bold">Trip Admin</h1>
                <button onClick={() => auth.signOut()} className="p-2 bg-red-500/10 text-red-400 rounded-full">
                    <LogOut size={20} />
                </button>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Input Form (Sticky on Desktop) */}
                <div className="lg:col-span-4">
                    <div className="sticky top-6">
                        <form onSubmit={handleSubmit} className={`space-y-6 transition-all ${editingId ? 'ring-2 ring-blue-500 p-4 rounded-xl bg-blue-500/5' : ''}`}>
                            {editingId && (
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-blue-400 text-sm font-bold flex items-center gap-2"><Edit2 size={14} /> Editing Update</span>
                                    <button type="button" onClick={handleCancelEdit} className="text-gray-400 hover:text-white"><X size={16} /></button>
                                </div>
                            )}

                            <div className="grid grid-cols-3 gap-2">
                                {['drive', 'stop', 'stay'].map(t => (
                                    <button
                                        type="button"
                                        key={t}
                                        onClick={() => setFormData({ ...formData, type: t })}
                                        className={`p-3 rounded-lg capitalize border ${formData.type === t
                                            ? 'bg-blue-600 border-blue-500 text-white'
                                            : 'bg-dark-800 border-white/10 text-gray-400'
                                            }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>

                            <div className="bg-dark-800 p-4 rounded-xl border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-400">GPS Coordinates</span>
                                    <button
                                        type="button"
                                        onClick={getLocation}
                                        className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full flex items-center gap-1"
                                    >
                                        <Navigation size={12} /> Auto-Fetch
                                    </button>
                                </div>

                                {/* Editable GPS Inputs */}
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">Latitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.coords?.latitude || ''}
                                            onChange={e => setFormData({
                                                ...formData,
                                                coords: { ...formData.coords, latitude: parseFloat(e.target.value) }
                                            })}
                                            className="w-full bg-dark-900 border border-white/10 rounded p-2 text-sm font-mono"
                                            placeholder="0.000000"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] text-gray-500 block mb-1">Longitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            value={formData.coords?.longitude || ''}
                                            onChange={e => setFormData({
                                                ...formData,
                                                coords: { ...formData.coords, longitude: parseFloat(e.target.value) }
                                            })}
                                            className="w-full bg-dark-900 border border-white/10 rounded p-2 text-sm font-mono"
                                            placeholder="0.000000"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-500 block mb-1 flex items-center gap-1"><MapPin size={10} /> Location Name</label>
                                    <input
                                        type="text"
                                        value={formData.locationName || ''}
                                        onChange={e => setFormData({ ...formData, locationName: e.target.value })}
                                        className="w-full bg-dark-900 border border-white/10 rounded p-2 text-sm text-white"
                                        placeholder="e.g. Nagpur Highway, Hotel X..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Message</label>
                                    <textarea
                                        value={formData.message}
                                        onChange={e => setFormData({ ...formData, message: e.target.value })}
                                        className="w-full bg-dark-800 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px]"
                                        placeholder="What's happening?"
                                    />
                                </div>

                                <div className="bg-dark-800 p-4 rounded-xl border border-white/10 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <label className="text-sm text-gray-400 flex items-center gap-2">
                                            <Camera size={14} /> Gallery Link
                                        </label>
                                        {/* Media Type Selector */}
                                        <div className="flex bg-dark-900 rounded-lg p-1">
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, mediaType: 'image' })}
                                                className={`px-3 py-1 text-xs rounded-md transition-colors ${formData.mediaType === 'image' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                                            >
                                                Image
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormData({ ...formData, mediaType: 'video' })}
                                                className={`px-3 py-1 text-xs rounded-md transition-colors ${formData.mediaType === 'video' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}
                                            >
                                                Video
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.mediaUrl}
                                        onChange={e => setFormData({ ...formData, mediaUrl: e.target.value })}
                                        className="w-full bg-dark-900 border border-white/10 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                        placeholder={formData.mediaType === 'video' ? "https://drive.google.com/file/d/... (Video)" : "https://drive.google.com/..."}
                                    />
                                    <p className="text-[10px] text-gray-500">Make sure link has "Anyone with link" access.</p>
                                </div>
                            </div>

                            <div className="p-4 bg-dark-800 rounded-xl border border-white/10 space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2 text-gray-300">
                                    <Wallet size={16} /> Expense Tracker
                                </h3>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        value={formData.cost}
                                        onChange={e => setFormData({ ...formData, cost: e.target.value })}
                                        placeholder="Amount (₹)"
                                        className="flex-1 bg-dark-900 border border-white/10 rounded-lg p-3"
                                    />
                                    <select
                                        value={formData.costCategory}
                                        onChange={e => setFormData({ ...formData, costCategory: e.target.value })}
                                        className="bg-dark-900 border border-white/10 rounded-lg p-3"
                                    >
                                        <option>Petrol</option>
                                        <option>Food</option>
                                        <option>Stay</option>
                                        <option>Toll</option>
                                        <option>Misc</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={status.includes("...")}
                                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2
                                    ${editingId ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:shadow-orange-500/20' : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:shadow-blue-500/20'}
                                `}
                            >
                                <Send size={20} />
                                {status.includes("...") ? status : (editingId ? "Update Post" : "Post Update")}
                            </button>

                            {status && <div className="text-center text-sm text-gray-400 animate-pulse">{status}</div>}
                        </form>
                    </div>
                </div>

                {/* Right Column: Updates Table */}
                <div className="lg:col-span-8">
                    <h3 className="text-lg font-bold mb-4 text-gray-300">All Updates ({recentUpdates.length})</h3>
                    <div className="bg-dark-800 rounded-xl border border-white/10 overflow-hidden sticky top-6">
                        <div className="overflow-x-auto max-h-[85vh] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-dark-900/90 backdrop-blur-md z-10 shadow-sm">
                                    <tr className="text-gray-400 text-xs uppercase border-b border-white/10">
                                        <th className="p-4">Time</th>
                                        <th className="p-4">Type</th>
                                        <th className="p-4">Message</th>
                                        <th className="p-4">Loc</th>
                                        <th className="p-4">Cost</th>
                                        <th className="p-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                                    {recentUpdates.map(update => (
                                        <tr key={update.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-mono text-xs whitespace-nowrap">
                                                {update.timestamp?.toDate().toLocaleDateString()}<br />
                                                {update.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </td>
                                            <td className="p-4">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${update.type === 'stop' ? 'bg-orange-500/20 text-orange-400' :
                                                    update.type === 'stay' ? 'bg-blue-500/20 text-blue-400' :
                                                        'bg-green-500/20 text-green-400'
                                                    }`}>{update.type}</span>
                                            </td>
                                            <td className="p-4 max-w-xs truncate" title={update.message}>{update.message}</td>
                                            <td className="p-4 max-w-[100px] truncate" title={update.locationName || 'N/A'}>
                                                {update.locationName || '-'}
                                            </td>
                                            <td className="p-4 font-mono text-xs">
                                                {update.cost > 0 ? `₹${update.cost}` : '-'}
                                            </td>
                                            <td className="p-4 text-right space-x-2">
                                                <button
                                                    onClick={() => handleEdit(update)}
                                                    className="p-2 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(update.id)}
                                                    className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {recentUpdates.length === 0 && (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-gray-500">No updates found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="mt-8 text-center pb-10 lg:text-left">
                        <button onClick={() => navigate('/')} className="text-gray-500 text-sm hover:text-white underline">Back to Public View</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
