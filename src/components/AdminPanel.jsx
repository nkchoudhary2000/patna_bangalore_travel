import React, { useState, useEffect } from 'react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { collection, addDoc, getDocs, updateDoc, setDoc, deleteDoc, doc, serverTimestamp, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase';
import { Lock, LogOut, Send, Navigation, Camera, Wallet, MapPin, Edit2, Trash2, X, FileDown, FileUp, ChevronLeft, ChevronRight, Plus, Calendar, Map } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import MediaCarousel from './MediaCarousel';
import { migrateLegacyData } from '../utils/migration';

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

        locationName: '',
        aqi: '',
        temp: ''
    });
    const [editingId, setEditingId] = useState(null);
    const [status, setStatus] = useState('');
    const [recentUpdates, setRecentUpdates] = useState([]);

    // Trip Management State
    const [trips, setTrips] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState(''); // Default empty, load from trips
    const [showNewTripInput, setShowNewTripInput] = useState(false);
    // New Trip Form State
    const [newTripData, setNewTripData] = useState({
        name: '',
        startName: '', startLat: '', startLon: '',
        endName: '', endLat: '', endLon: ''
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const navigate = useNavigate();

    // TODO: Replace with your actual email
    const AUTHORIZED_EMAIL = "niraj.choudhary1995@gmail.com";

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((u) => {
            if (u && u.email === AUTHORIZED_EMAIL || !AUTHORIZED_EMAIL.includes("@")) {
                setUser(u);
                migrateLegacyData(); // Check and run migration if needed once authorized
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


        // Fetch Trips
        const fetchTrips = () => {
            const q = query(collection(db, "trips"), orderBy("createdAt", "desc"));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setTrips(t);

                // If no trip selected, default to first one
                if (!selectedTripId && t.length > 0) {
                    setSelectedTripId(t[0].id);
                }
            });
            return unsubscribe;
        };
        const unsubTrips = fetchTrips();

        // Fetch all updates sorted by timestamp DESCENDING (Latest first)
        // We fetch ALL and filter client side to avoid complex querying/indexing for now
        const q = query(collection(db, "trip_updates"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRecentUpdates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => {
            unsubscribe();
            unsubTrips();
        };
    }, [user]);

    const handleCreateTrip = async () => {
        if (!newTripData.name.trim()) return;
        setStatus("Creating Trip...");
        try {
            const docRef = await addDoc(collection(db, "trips"), {
                name: newTripData.name,
                createdAt: serverTimestamp(),
                isActive: true,
                startPoint: {
                    name: newTripData.startName || 'Start',
                    coords: {
                        latitude: parseFloat(newTripData.startLat) || 0,
                        longitude: parseFloat(newTripData.startLon) || 0
                    }
                },
                endPoint: {
                    name: newTripData.endName || 'End',
                    coords: {
                        latitude: parseFloat(newTripData.endLat) || 0,
                        longitude: parseFloat(newTripData.endLon) || 0
                    }
                }
            });
            setShowNewTripInput(false);
            setNewTripData({
                name: '',
                startName: '', startLat: '', startLon: '',
                endName: '', endLat: '', endLon: ''
            });
            setSelectedTripId(docRef.id);
            setStatus(`Created trip: ${newTripData.name}`);
        } catch (e) {
            console.error("Error creating trip", e);
            setStatus("Failed to create trip");
        }
    };

    const handleDeleteTrip = async () => {
        if (!selectedTripId) return;
        const tripName = trips.find(t => t.id === selectedTripId)?.name || 'this trip';

        if (window.confirm(`Are you sure you want to delete "${tripName}"? WARNING: This will PERMANENTLY DELETE the trip AND ALL ${filteredUpdates.length} associated updates. This action cannot be undone.`)) {
            setStatus("Deleting entire trip...");
            try {
                // 1. Delete all updates for this trip
                // We likely need to query all, not just recentUpdates (though recentUpdates loads all).
                // Safest is to rely on what we have or query specifically to be sure.
                const updatesToDelete = recentUpdates.filter(u => u.tripId === selectedTripId);
                const batch = db.batch ? db.batch() : null; // React native compat? No, web.

                // Manual delete loop if batch complex or too big, but let's try concurrent promises
                const deletePromises = updatesToDelete.map(u => deleteDoc(doc(db, "trip_updates", u.id)));
                await Promise.all(deletePromises);

                // 2. Delete the trip doc
                await deleteDoc(doc(db, "trips", selectedTripId));

                setStatus(`Deleted trip: ${tripName}`);
                setSelectedTripId(''); // Reset selection

                // If trips remain, effect will likely set new default or we can do it:
                // setTrips will update via listener
            } catch (e) {
                console.error("Error deleting trip", e);
                setStatus("Failed to delete trip");
            }
        }
    };

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error(error);
            setStatus("Login failed");
        }
    };

    // Helper to fetch details based on Lat/Lon
    const fetchLocationDetails = async (lat, lon) => {
        setStatus("Fetching details...");
        let updates = {};

        // 1. Reverse Geocode for Name
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            const address = data.address.city || data.address.town || data.address.village || data.display_name.split(',')[0];
            if (address) updates.locationName = address;
        } catch (e) {
            console.error("Reverse geocode failed", e);
        }

        // 2. Fetch AQI
        try {
            const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`);
            const aqiData = await aqiRes.json();
            if (aqiData.current && aqiData.current.us_aqi) {
                updates.aqi = aqiData.current.us_aqi;
            }
        } catch (aqiErr) {
            console.error("AQI fetch failed", aqiErr);
        }

        // 3. Fetch Temperature
        try {
            const tempRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`);
            const tempData = await tempRes.json();
            if (tempData.current && tempData.current.temperature_2m !== undefined) {
                updates.temp = tempData.current.temperature_2m;
            }
        } catch (tempErr) {
            console.error("Temp fetch failed", tempErr);
        }

        setFormData(prev => ({
            ...prev,
            ...updates
        }));
        setStatus("Details updated!");
    };

    const getLocation = () => {
        setStatus("Fetching GPS...");
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const lat = position.coords.latitude;
                    const lon = position.coords.longitude;

                    setFormData(prev => ({
                        ...prev,
                        coords: { latitude: lat, longitude: lon }
                    }));

                    // Fetch details using the new helper
                    await fetchLocationDetails(lat, lon);
                },
                (err) => setStatus("Location denied/error")
            );
        }
    };

    const handleManualRefetch = () => {
        const lat = formData.coords?.latitude;
        const lon = formData.coords?.longitude;
        if (lat && lon) {
            fetchLocationDetails(lat, lon);
        } else {
            alert("Please enter valid Latitude and Longitude first.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;

        // Prevent posting if no trip selected (unless editing - though editing usually implies existing trip)
        // But for safety:
        if (!selectedTripId && !editingId) {
            alert("Please select or create a trip first.");
            return;
        }

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
                locationName: formData.locationName,
                aqi: formData.aqi ? Number(formData.aqi) : null,
                temp: formData.temp ? Number(formData.temp) : null
            };

            // Only set timestamp on creation to preserve original time
            if (!editingId) {
                dataToSave.timestamp = serverTimestamp();
                if (selectedTripId) {
                    dataToSave.tripId = selectedTripId;
                }
            }

            if (editingId) {
                await updateDoc(doc(db, "trip_updates", editingId), dataToSave);
                setStatus("Success! Updated.");
                setEditingId(null);
            } else {
                await addDoc(collection(db, "trip_updates"), dataToSave);
                setStatus("Success! Posted.");
            }

            setFormData({ ...formData, message: '', mediaUrl: '', cost: '', locationName: '', aqi: '', temp: '' });
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
            locationName: update.locationName || '',
            aqi: update.aqi || '',
            temp: update.temp || ''
        });
        // If editing an item from a different trip context?
        // Ideally we should switch context, but for now we trust the filter.
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
        setFormData({ ...formData, message: '', mediaUrl: '', cost: '', locationName: '', aqi: '', temp: '' });
    };

    const escapeCSV = (str) => {
        if (!str) return '';
        const stringValue = String(str);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    };

    const handleExport = async () => {
        setStatus("Exporting...");
        try {
            // Ensure export is also sorted Ascending
            const q = query(collection(db, "trip_updates"), orderBy("timestamp", "asc"));
            const querySnapshot = await getDocs(q);
            const updates = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const headers = ['id', 'timestamp', 'type', 'message', 'locationName', 'latitude', 'longitude', 'cost', 'costCategory', 'mediaUrl', 'mediaType', 'aqi', 'temp'];
            const csvContent = [
                headers.join(','),
                ...updates.map(row => {
                    const timestamp = row.timestamp?.toDate().toISOString() || '';
                    return [
                        escapeCSV(row.id),
                        escapeCSV(timestamp),
                        escapeCSV(row.type),
                        escapeCSV(row.message),
                        escapeCSV(row.locationName),
                        row.coordinates?.latitude || '',
                        row.coordinates?.longitude || '',
                        row.cost || 0,
                        escapeCSV(row.costCategory),
                        escapeCSV(row.mediaUrl),
                        escapeCSV(row.mediaType),
                        row.aqi || '',
                        row.temp || ''
                    ].join(',');
                })
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', 'trip_updates_backup.csv');
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setStatus("Export Complete!");
        } catch (error) {
            console.error("Export failed:", error);
            setStatus("Export Failed");
        }
    };

    const handleImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setStatus("Importing...");
        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target.result;
            const rows = text.split('\n').filter(row => row.trim() !== '');
            // Skip header row

            let successCount = 0;
            let errorCount = 0;

            // Helper to parse CSV line respecting quotes
            const parseCSVLine = (line) => {
                const result = [];
                let start = 0;
                let insideQuotes = false;

                for (let i = 0; i < line.length; i++) {
                    if (line[i] === '"') {
                        insideQuotes = !insideQuotes;
                    } else if (line[i] === ',' && !insideQuotes) {
                        let val = line.substring(start, i);
                        if (val.startsWith('"') && val.endsWith('"')) {
                            val = val.slice(1, -1).replace(/""/g, '"');
                        }
                        result.push(val);
                        start = i + 1;
                    }
                }
                let lastVal = line.substring(start);
                if (lastVal.startsWith('"') && lastVal.endsWith('"')) {
                    lastVal = lastVal.slice(1, -1).replace(/""/g, '"');
                }
                result.push(lastVal);
                return result;
            };

            for (let i = 1; i < rows.length; i++) {
                try {
                    const values = parseCSVLine(rows[i]);
                    // Map values to object based on fixed index structure from export
                    const id = values[0];
                    const timestampStr = values[1];
                    const type = values[2] || 'drive';
                    const message = values[3] || '';
                    const locationName = values[4] || '';
                    const lat = parseFloat(values[5]);
                    const lon = parseFloat(values[6]);
                    const cost = parseFloat(values[7]) || 0;
                    const costCategory = values[8] || 'Petrol';
                    const mediaUrl = values[9] || '';
                    const mediaType = values[10] || 'image';
                    const aqi = values[11] ? parseFloat(values[11]) : null;
                    const temp = values[12] ? parseFloat(values[12]) : null;

                    const data = {
                        type,
                        message,
                        locationName,
                        coordinates: (!isNaN(lat) && !isNaN(lon)) ? { latitude: lat, longitude: lon } : null,
                        cost,
                        costCategory,
                        mediaUrl,
                        mediaType,
                        aqi,
                        temp
                    };

                    if (timestampStr) {
                        data.timestamp = new Date(timestampStr);
                    }

                    if (id && id.trim() !== '') {
                        // Use setDoc with merge: true to handle both updates and restores (upsert)
                        await setDoc(doc(db, "trip_updates", id), data, { merge: true });
                    } else {
                        // Create new
                        if (!data.timestamp) data.timestamp = serverTimestamp();
                        await addDoc(collection(db, "trip_updates"), data);
                    }
                    successCount++;
                } catch (err) {
                    console.error("Row import failed:", err);
                    errorCount++;
                    setStatus(`Error on row ${i}: ${err.message}`);
                }
            }
            if (errorCount === 0) {
                setStatus(`Import Successful! processed ${successCount} records.`);
            } else {
                setStatus(`Completed with errors. Success: ${successCount}, Failed: ${errorCount}`);
            }
            // Reset file input
            event.target.value = null;
        };
        reader.readAsText(file);
    };

    if (!user) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center bg-dark-900 p-4 overflow-y-auto">
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


    // Pagination Logic
    // Filter updates by selected Trip ID
    const filteredUpdates = recentUpdates.filter(u => {
        if (!selectedTripId) return false;
        return u.tripId === selectedTripId;
    });

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredUpdates.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUpdates.length / itemsPerPage);

    const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
    const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

    return (
        <div className="min-h-screen bg-dark-900 text-white p-4 pb-20 overflow-x-hidden">
            <header className="flex justify-between items-center mb-6 max-w-7xl mx-auto">
                <h1 className="text-xl font-bold">Trip Admin</h1>
                <button onClick={() => auth.signOut()} className="p-2 bg-red-500/10 text-red-400 rounded-full">
                    <LogOut size={20} />
                </button>
            </header>

            {/* Trip Selector Bar */}
            <div className="max-w-7xl mx-auto mb-6 bg-dark-800 p-4 rounded-xl border border-white/10 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Map size={18} className="text-blue-400" />
                        <span className="text-gray-400 text-sm">Active Trip:</span>
                    </div>
                    <select
                        value={selectedTripId}
                        onChange={(e) => {
                            setSelectedTripId(e.target.value);
                            setCurrentPage(1); // Reset page on switch
                            setEditingId(null);
                        }}
                        className="bg-dark-900 border border-white/10 rounded-lg p-2 text-white min-w-[200px]"
                    >
                        {!selectedTripId && <option value="">Select a Trip</option>}
                        {trips.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleDeleteTrip}
                        disabled={!selectedTripId}
                        className={`p-2 rounded-lg transition-colors ${!selectedTripId ? 'text-gray-600 cursor-not-allowed' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'}`}
                        title="Delete this Trip"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                {!showNewTripInput ? (
                    <button
                        onClick={() => setShowNewTripInput(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-semibold transition-colors"
                    >
                        <Plus size={16} /> New Trip
                    </button>
                ) : (

                    <div className="bg-dark-900 border border-white/10 rounded-xl p-4 w-full animate-in fade-in slide-in-from-top-4 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-bold text-sm text-gray-300">New Trip Details</h3>
                            <button
                                onClick={() => setShowNewTripInput(false)}
                                className="text-gray-500 hover:text-white"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] text-gray-500 uppercase">Trip Name</label>
                                <input
                                    type="text"
                                    value={newTripData.name}
                                    onChange={(e) => setNewTripData({ ...newTripData, name: e.target.value })}
                                    placeholder="e.g. Summer Road Trip"
                                    className="w-full bg-dark-800 border border-white/10 rounded p-2 text-sm text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 p-2 bg-dark-800/50 rounded-lg">
                                    <span className="text-[10px] text-green-400 font-bold uppercase">Start Point</span>
                                    <input
                                        type="text"
                                        value={newTripData.startName}
                                        onChange={(e) => setNewTripData({ ...newTripData, startName: e.target.value })}
                                        placeholder="Name (e.g. City A)"
                                        className="w-full bg-dark-800 border border-white/10 rounded p-1.5 text-xs text-white"
                                    />
                                    <div className="flex gap-1">
                                        <input type="number" step="any" placeholder="Lat" value={newTripData.startLat} onChange={e => setNewTripData({ ...newTripData, startLat: e.target.value })} className="w-1/2 bg-dark-800 border-white/10 border rounded p-1 text-[10px]" />
                                        <input type="number" step="any" placeholder="Lon" value={newTripData.startLon} onChange={e => setNewTripData({ ...newTripData, startLon: e.target.value })} className="w-1/2 bg-dark-800 border-white/10 border rounded p-1 text-[10px]" />
                                    </div>
                                </div>

                                <div className="space-y-2 p-2 bg-dark-800/50 rounded-lg">
                                    <span className="text-[10px] text-red-400 font-bold uppercase">End Point</span>
                                    <input
                                        type="text"
                                        value={newTripData.endName}
                                        onChange={(e) => setNewTripData({ ...newTripData, endName: e.target.value })}
                                        placeholder="Name (e.g. Goa)"
                                        className="w-full bg-dark-800 border border-white/10 rounded p-1.5 text-xs text-white"
                                    />
                                    <div className="flex gap-1">
                                        <input type="number" step="any" placeholder="Lat" value={newTripData.endLat} onChange={e => setNewTripData({ ...newTripData, endLat: e.target.value })} className="w-1/2 bg-dark-800 border-white/10 border rounded p-1 text-[10px]" />
                                        <input type="number" step="any" placeholder="Lon" value={newTripData.endLon} onChange={e => setNewTripData({ ...newTripData, endLon: e.target.value })} className="w-1/2 bg-dark-800 border-white/10 border rounded p-1 text-[10px]" />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleCreateTrip}
                                className="w-full py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold shadow-lg transition-transform active:scale-95"
                            >
                                Create Trip
                            </button>
                        </div>
                    </div >
                )}
            </div >

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
                                    <div className="flex gap-2">
                                        {/* Refetch Button moved to input row */}
                                        <button
                                            type="button"
                                            className="text-xs bg-green-500/20 text-green-400 px-3 py-1 rounded-full flex items-center gap-1 hover:bg-green-500/30 transition-colors"
                                        >
                                            <Navigation size={12} /> Auto-GPS
                                        </button>
                                    </div>
                                </div>

                                {/* Editable GPS Inputs & Refetch */}
                                <div className="flex gap-2 items-end mb-3">
                                    <div className="flex-1">
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
                                    <div className="flex-1">
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
                                    <button
                                        type="button"
                                        onClick={handleManualRefetch}
                                        title="Refetch Details"
                                        className="mb-[2px] p-2.5 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
                                    >
                                        <RefreshCw size={18} />
                                    </button>
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

                                <div className="mt-3">
                                    <label className="text-[10px] text-gray-500 block mb-1">AQI (US)</label>
                                    <div className="flex gap-2 items-center">
                                        <input
                                            type="number"
                                            value={formData.aqi || ''}
                                            onChange={e => setFormData({ ...formData, aqi: e.target.value })}
                                            className="w-full bg-dark-900 border border-white/10 rounded p-2 text-sm text-white"
                                            placeholder="Air Quality Index"
                                        />
                                        {formData.aqi && (
                                            <div className={`px-3 py-1 rounded text-xs font-bold ${formData.aqi <= 50 ? 'bg-green-500/20 text-green-400' :
                                                formData.aqi <= 100 ? 'bg-yellow-500/20 text-yellow-400' :
                                                    formData.aqi <= 150 ? 'bg-orange-500/20 text-orange-400' :
                                                        formData.aqi <= 200 ? 'bg-red-500/20 text-red-400' :
                                                            'bg-purple-500/20 text-purple-400'
                                                }`}>
                                                {formData.aqi <= 50 ? 'Good' :
                                                    formData.aqi <= 100 ? 'Moderate' :
                                                        formData.aqi <= 150 ? 'Sensitive' :
                                                            formData.aqi <= 200 ? 'Unhealthy' :
                                                                'Hazardous'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3">
                                    <label className="text-[10px] text-gray-500 block mb-1">Temperature (°C)</label>
                                    <input
                                        type="number"
                                        step="any"
                                        value={formData.temp || ''}
                                        onChange={e => setFormData({ ...formData, temp: e.target.value })}
                                        className="w-full bg-dark-900 border border-white/10 rounded p-2 text-sm text-white"
                                        placeholder="Temp"
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
                                        placeholder={formData.mediaType === 'video' ? "https://drive.google.com/file/d/... (Video)" : "https://drive.google.com/... or Google Photos Link"}
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
                </div >

                {/* Right Column: Updates Table */}
                < div className="lg:col-span-8" >
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-300">
                            {trips.find(t => t.id === selectedTripId)?.name || 'Updates'}
                            <span className="text-sm font-normal text-gray-500 ml-2">(Total: {filteredUpdates.length})</span>
                        </h3>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 text-xs font-semibold transition-colors"
                            >
                                <FileDown size={14} /> Export CSV
                            </button>
                            <label className="flex items-center gap-1 px-3 py-1.5 bg-green-500/10 text-green-400 rounded-lg hover:bg-green-500/20 text-xs font-semibold transition-colors cursor-pointer">
                                <FileUp size={14} /> Import CSV
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={handleImport}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                    <div className="bg-dark-800 rounded-xl border border-white/10 overflow-hidden sticky top-6">
                        <div className="overflow-x-auto max-h-[75vh] overflow-y-auto">
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
                                    {currentItems.map(update => (
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

                        {/* Pagination Footer */}
                        {recentUpdates.length > itemsPerPage && (
                            <div className="flex justify-between items-center p-4 border-t border-white/10 bg-dark-900/50">
                                <button
                                    onClick={prevPage}
                                    disabled={currentPage === 1}
                                    className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
                                >
                                    <ChevronLeft size={20} />
                                </button>
                                <span className="text-xs text-gray-500 font-mono">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={nextPage}
                                    disabled={currentPage === totalPages}
                                    className="p-2 bg-dark-800 rounded-lg hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="mt-8 text-center pb-10 lg:text-left">
                        <button onClick={() => navigate('/')} className="text-gray-500 text-sm hover:text-white underline">Back to Public View</button>
                    </div>
                </div >
            </div >
        </div >
    );
};

export default AdminPanel;
