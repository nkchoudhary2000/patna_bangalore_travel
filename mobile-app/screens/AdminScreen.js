import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import * as Location from 'expo-location';
import { styled } from 'nativewind';
import { db, auth } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useOffline } from '../offline/OfflineQueueContext';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledInput = styled(TextInput);
const StyledButton = styled(TouchableOpacity);

export default function AdminScreen({ navigation }) {
    const [message, setMessage] = useState('');
    const { isConnected } = useOffline();

    // Trip State
    const [trips, setTrips] = useState([]);
    const [selectedTripId, setSelectedTripId] = useState('');
    const [showNewTripModal, setShowNewTripModal] = useState(false);
    const [newTripData, setNewTripData] = useState({
        name: '',
        startName: '', startLat: '', startLon: '',
        endName: '', endLat: '', endLon: ''
    });
    const [showTripSelector, setShowTripSelector] = useState(false); // Dropdown Modal

    // Updates State
    const [updates, setUpdates] = useState([]);
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
    const [loadingGps, setLoadingGps] = useState(false);
    const [fetchingDetails, setFetchingDetails] = useState(false);

    useEffect(() => {
        // Fetch Trips
        const q = query(collection(db, "trips"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const t = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTrips(t);
            if (!selectedTripId && t.length > 0) {
                setSelectedTripId(t[0].id);
            }
        });
        return unsubscribe;
    }, []);

    // Fetch Updates for Selected Trip
    useEffect(() => {
        if (!selectedTripId) return;

        // We fetch all updates sorted by time, then filter client side slightly inefficient but ok for <1000 docs
        // Or use composite index query: where("tripId", "==", selectedTripId).orderBy("timestamp", "desc")
        // For simplicity without index alerts, let's try client filtering first or simple query
        const q = query(collection(db, "trip_updates"), orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allUpdates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUpdates(allUpdates.filter(u => u.tripId === selectedTripId));
        });
        return unsubscribe;

    }, [selectedTripId]);


    const handleLogout = () => {
        signOut(auth);
    };

    const handleCreateTrip = async () => {
        if (!newTripData.name.trim()) {
            Alert.alert("Error", "Trip name is required");
            return;
        }
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
            setSelectedTripId(docRef.id);
            setNewTripData({ name: '', startName: '', startLat: '', startLon: '', endName: '', endLat: '', endLon: '' });
            setShowNewTripModal(false);
            Alert.alert("Success", "Trip created!");
        } catch (e) {
            Alert.alert("Error", e.message);
        }
    };

    const handleDeleteTrip = async () => {
        if (!selectedTripId) return;
        const trip = trips.find(t => t.id === selectedTripId);

        Alert.alert(
            "Delete Trip",
            `Are you sure you want to delete "${trip?.name}"? This will delete ALL associated updates.`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete", style: "destructive", onPress: async () => {
                        try {
                            const updatesQ = query(collection(db, "trip_updates"));
                            const updatesSnapshot = await getDocs(updatesQ);
                            const updatesToDelete = updatesSnapshot.docs.filter(d => d.data().tripId === selectedTripId);

                            const deletePromises = updatesToDelete.map(u => deleteDoc(doc(db, "trip_updates", u.id)));
                            await Promise.all(deletePromises);
                            await deleteDoc(doc(db, "trips", selectedTripId));
                            setSelectedTripId('');
                            Alert.alert("Success", "Trip deleted.");
                        } catch (e) {
                            Alert.alert("Error", e.message);
                        }
                    }
                }
            ]
        );
    };

    // --- Update CRUD & Enrichment Logic ---

    const fetchLocationDetails = async (lat, lon) => {
        if (!isConnected) return; // Skip if offline
        setFetchingDetails(true);
        let updates = {};

        try {
            // 1. Reverse Geocode for Name
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
                    headers: {
                        'User-Agent': 'TravelTrackerApp/1.0'
                    }
                });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const data = await res.json();
                const address = data.address?.city || data.address?.town || data.address?.village || data.display_name.split(',')[0];
                if (address) updates.locationName = address;
            } catch (e) { console.log("Reverse geocode failed", e); }

            // 2. Fetch AQI
            try {
                const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`);
                const aqiData = await aqiRes.json();
                if (aqiData.current?.us_aqi) updates.aqi = String(aqiData.current.us_aqi);
            } catch (e) { console.log("AQI fetch failed", e); }

            // 3. Fetch Temp
            try {
                const tempRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`);
                const tempData = await tempRes.json();
                if (tempData.current?.temperature_2m) updates.temp = String(tempData.current.temperature_2m);
            } catch (e) { console.log("Temp fetch failed", e); }

            setFormData(prev => ({ ...prev, ...updates }));

        } catch (error) {
            console.log("Enrichment error:", error);
        } finally {
            setFetchingDetails(false);
        }
    };

    const getGps = async () => {
        setLoadingGps(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission denied');
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            const { latitude, longitude } = location.coords;

            setFormData(prev => ({
                ...prev,
                coords: { latitude, longitude }
            }));

            // Auto-enrich details
            await fetchLocationDetails(latitude, longitude);

        } catch (e) {
            console.log(e);
            Alert.alert("Error", "Failed to fetch GPS location");
        } finally {
            setLoadingGps(false);
        }
    };

    const handleSubmit = async () => {
        if (!selectedTripId) {
            alert("No trip selected");
            return;
        }

        try {
            // Prepare data
            // Ensure numbers
            const dataToSave = {
                tripId: selectedTripId, // IMPORTANT: Link to trip
                type: formData.type,
                message: formData.message,
                mediaUrl: formData.mediaUrl,
                mediaType: formData.mediaType,
                cost: formData.cost ? parseFloat(formData.cost) : 0,
                costCategory: formData.costCategory,
                coordinates: formData.coords,
                locationName: formData.locationName,
                aqi: formData.aqi ? parseFloat(formData.aqi) : null,
                temp: formData.temp ? parseFloat(formData.temp) : null
            };

            if (editingId) {
                await updateDoc(doc(db, "trip_updates", editingId), dataToSave);
                setEditingId(null);
                Alert.alert("Success", "Update edited!");
            } else {
                dataToSave.timestamp = serverTimestamp();
                await addDoc(collection(db, "trip_updates"), dataToSave);
                Alert.alert("Success", "Update posted!");
            }

            // Reset Form but keep location? No reset all
            setFormData({
                type: 'drive', message: '', mediaUrl: '', mediaType: 'image',
                cost: '', costCategory: 'Petrol', coords: null,
                locationName: '', aqi: '', temp: ''
            });

        } catch (e) {
            Alert.alert("Error", e.message);
        }
    };

    const handleEdit = (item) => {
        setFormData({
            type: item.type || 'drive',
            message: item.message || '',
            mediaUrl: item.mediaUrl || '',
            mediaType: item.mediaType || 'image',
            cost: item.cost ? String(item.cost) : '',
            costCategory: item.costCategory || 'Petrol',
            coords: item.coordinates || null,
            locationName: item.locationName || '',
            aqi: item.aqi ? String(item.aqi) : '',
            temp: item.temp ? String(item.temp) : ''
        });
        setEditingId(item.id);
        // Scroll to top? usually ok
    };

    const handleDeleteUpdate = (id) => {
        Alert.alert("Delete", "Delete this update?", [
            { text: "Cancel" },
            { text: "Delete", style: 'destructive', onPress: async () => await deleteDoc(doc(db, "trip_updates", id)) }
        ]);
    };

    const activeTripName = trips.find(t => t.id === selectedTripId)?.name || 'Select a Trip';

    return (
        <StyledView className="flex-1 bg-slate-900">
            {/* --- Header & Dropdown Trip Selector --- */}
            <StyledView className="p-6 pt-12 pb-4 bg-slate-800 border-b border-white/10 shadow-lg z-10">
                <StyledView className="flex-row justify-between items-center mb-4">
                    <StyledText className="text-white text-2xl font-bold">Admin Panel</StyledText>
                    <StyledButton onPress={handleLogout} className="bg-red-500/20 px-3 py-1 rounded-lg">
                        <StyledText className="text-red-400 font-bold text-xs">Log Out</StyledText>
                    </StyledButton>
                </StyledView>

                <StyledView className="flex-row gap-2 items-center">
                    {/* Dropdown Button */}
                    <StyledButton
                        onPress={() => setShowTripSelector(true)}
                        className="flex-1 bg-slate-700 border border-slate-600 p-3 rounded-xl flex-row justify-between items-center"
                    >
                        <StyledText className="text-white font-bold text-base" numberOfLines={1}>{activeTripName}</StyledText>
                        <StyledText className="text-gray-400 text-xs">▼</StyledText>
                    </StyledButton>

                    <StyledButton onPress={() => setShowNewTripModal(true)} className="bg-green-600 p-3 rounded-xl items-center justify-center">
                        <StyledText className="text-white font-bold text-xl">+</StyledText>
                    </StyledButton>
                    <StyledButton onPress={handleDeleteTrip} disabled={!selectedTripId} className={`p-3 rounded-xl items-center justify-center ${!selectedTripId ? 'opacity-50' : 'bg-red-500/20'}`}>
                        <StyledText className="text-red-400 font-bold">X</StyledText>
                    </StyledButton>
                </StyledView>
            </StyledView>


            <ScrollView className="flex-1 p-6 space-y-6">
                {!isConnected && (
                    <StyledView className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/30 mb-4">
                        <StyledText className="text-yellow-400 text-center">
                            ⚠️ You are Offline. Updates will sync when online.
                        </StyledText>
                    </StyledView>
                )}

                {/* --- UPDATE FORM --- */}
                {selectedTripId ? (
                    <StyledView className={`bg-slate-800 p-4 rounded-xl border ${editingId ? 'border-blue-500' : 'border-white/10'} space-y-4`}>
                        <StyledView className="flex-row justify-between">
                            <StyledText className="text-gray-400 font-bold">{editingId ? "Editing Update" : "New Update"}</StyledText>
                            {editingId && <TouchableOpacity onPress={() => { setEditingId(null); setFormData({ type: 'drive', message: '', mediaUrl: '', cost: '', locationName: '', aqi: '', temp: '' }) }}><StyledText className="text-red-400">Cancel</StyledText></TouchableOpacity>}
                        </StyledView>

                        {/* Type Selector */}
                        <StyledView className="flex-row gap-2">
                            {['drive', 'stop', 'stay'].map(type => (
                                <StyledButton
                                    key={type}
                                    onPress={() => setFormData({ ...formData, type })}
                                    className={`flex-1 p-2 rounded-lg items-center ${formData.type === type ? 'bg-blue-600' : 'bg-slate-700'}`}
                                >
                                    <StyledText className="text-white capitalize">{type}</StyledText>
                                </StyledButton>
                            ))}
                        </StyledView>

                        {/* Message */}
                        <StyledInput
                            placeholder="Message..."
                            placeholderTextColor="#64748b"
                            value={formData.message}
                            onChangeText={t => setFormData({ ...formData, message: t })}
                            className="bg-slate-900 text-white p-4 rounded-lg border border-slate-700"
                            multiline
                        />

                        {/* Media URL & Type */}
                        <StyledInput
                            placeholder="Image/Video URL..."
                            placeholderTextColor="#64748b"
                            value={formData.mediaUrl}
                            onChangeText={t => setFormData({ ...formData, mediaUrl: t })}
                            className="bg-slate-900 text-white p-3 rounded-lg border border-slate-700"
                        />

                        {/* Location & GPS */}
                        <StyledView className="flex-row gap-2">
                            <StyledInput
                                placeholder={fetchingDetails ? "Auto-filling..." : "Location Name"}
                                placeholderTextColor="#64748b"
                                value={formData.locationName}
                                onChangeText={t => setFormData({ ...formData, locationName: t })}
                                className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-700"
                            />
                            <StyledButton onPress={getGps} disabled={loadingGps} className="bg-green-600 p-3 rounded-lg items-center justify-center">
                                <StyledText className="text-white text-xs">{loadingGps ? 'GPS...' : 'GPS'}</StyledText>
                            </StyledButton>
                        </StyledView>
                        {formData.coords && <StyledText className="text-green-400 text-xs">Coords: {formData.coords.latitude.toFixed(4)}, {formData.coords.longitude.toFixed(4)}</StyledText>}

                        {/* Stats Row */}
                        <StyledView className="flex-row gap-2">
                            <StyledInput placeholder="Cost (₹)" placeholderTextColor="#64748b" value={formData.cost} onChangeText={t => setFormData({ ...formData, cost: t })} keyboardType="numeric" className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-700" />
                            <StyledInput placeholder="AQI" placeholderTextColor="#64748b" value={formData.aqi} onChangeText={t => setFormData({ ...formData, aqi: t })} keyboardType="numeric" className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-700" />
                            <StyledInput placeholder="Temp °C" placeholderTextColor="#64748b" value={formData.temp} onChangeText={t => setFormData({ ...formData, temp: t })} keyboardType="numeric" className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-700" />
                        </StyledView>

                        <StyledButton onPress={handleSubmit} className="bg-green-600 p-4 rounded-xl items-center">
                            <StyledText className="text-white font-bold">{editingId ? "Update" : "Post Update"}</StyledText>
                        </StyledButton>
                    </StyledView>
                ) : (
                    <StyledText className="text-gray-400 text-center">Select a trip above first.</StyledText>
                )}

                {/* --- LIST UPDATES --- */}
                {updates.map(item => (
                    <StyledView key={item.id} className="bg-slate-800 p-4 rounded-xl border border-white/5 relative">
                        <StyledView className="flex-row justify-between mb-2">
                            <StyledText className={`font-bold capitalize ${item.type === 'drive' ? 'text-green-400' : item.type === 'stop' ? 'text-orange-400' : 'text-blue-400'}`}>{item.type}</StyledText>
                            <StyledText className="text-gray-500 text-xs">{item.timestamp?.toDate ? item.timestamp.toDate().toLocaleTimeString() : 'Pending'}</StyledText>
                        </StyledView>
                        <StyledText className="text-white mb-2">{item.message}</StyledText>
                        {item.locationName && <StyledText className="text-gray-400 text-xs">📍 {item.locationName}</StyledText>}

                        <StyledView className="flex-row justify-end gap-4 mt-2 border-t border-white/5 pt-2">
                            <TouchableOpacity onPress={() => handleEdit(item)}><StyledText className="text-blue-400 font-bold">Edit</StyledText></TouchableOpacity>
                            <TouchableOpacity onPress={() => handleDeleteUpdate(item.id)}><StyledText className="text-red-400 font-bold">Delete</StyledText></TouchableOpacity>
                        </StyledView>
                    </StyledView>
                ))}

                <StyledView className="h-20" />
            </ScrollView>

            {/* Trip Selector Modal */}
            <Modal visible={showTripSelector} transparent animationType="fade">
                <TouchableOpacity activeOpacity={1} onPress={() => setShowTripSelector(false)} className="flex-1 bg-black/80 justify-center p-6">
                    <StyledView className="bg-slate-800 p-6 rounded-2xl border border-white/10 max-h-[70%]">
                        <StyledText className="text-white text-xl font-bold mb-4">Select Trip</StyledText>
                        <ScrollView className="space-y-2">
                            {trips.length === 0 && <StyledText className="text-gray-400">No trips found.</StyledText>}
                            {trips.map(trip => (
                                <StyledButton
                                    key={trip.id}
                                    onPress={() => { setSelectedTripId(trip.id); setShowTripSelector(false); }}
                                    className={`p-4 rounded-xl border ${selectedTripId === trip.id ? 'bg-blue-600 border-blue-500' : 'bg-slate-700 border-slate-600'}`}
                                >
                                    <StyledText className={`font-bold ${selectedTripId === trip.id ? 'text-white' : 'text-gray-300'}`}>
                                        {trip.name}
                                    </StyledText>
                                    <StyledText className="text-gray-400 text-xs mt-1">
                                        {trip.createdAt?.toDate ? trip.createdAt.toDate().toLocaleDateString() : 'Active'}
                                    </StyledText>
                                </StyledButton>
                            ))}
                        </ScrollView>
                        <StyledButton onPress={() => setShowTripSelector(false)} className="mt-4 p-3 bg-slate-700 rounded-xl items-center">
                            <StyledText className="text-gray-300">Close</StyledText>
                        </StyledButton>
                    </StyledView>
                </TouchableOpacity>
            </Modal>

            {/* New Trip Modal */}
            <Modal visible={showNewTripModal} transparent animationType="slide">
                <StyledView className="flex-1 bg-black/80 justify-center p-6">
                    <StyledView className="bg-slate-800 p-6 rounded-2xl border border-white/10 max-h-[90%]">
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <StyledText className="text-white text-xl font-bold mb-4">New Trip Details</StyledText>

                            <StyledText className="text-gray-400 text-xs mb-1 uppercase">Trip Name</StyledText>
                            <StyledInput
                                placeholder="e.g. Summer Road Trip"
                                placeholderTextColor="#64748b"
                                value={newTripData.name}
                                onChangeText={t => setNewTripData({ ...newTripData, name: t })}
                                className="bg-slate-900 text-white p-4 rounded-lg border border-slate-700 mb-4"
                            />

                            {/* Start Point */}
                            <StyledView className="mb-4">
                                <StyledText className="text-green-400 text-xs mb-1 uppercase font-bold">Start Point</StyledText>
                                <StyledInput
                                    placeholder="Name (e.g. City A)"
                                    placeholderTextColor="#64748b"
                                    value={newTripData.startName}
                                    onChangeText={t => setNewTripData({ ...newTripData, startName: t })}
                                    className="bg-slate-900 text-white p-3 rounded-lg border border-slate-700 mb-2"
                                />
                                <StyledView className="flex-row gap-2">
                                    <StyledInput
                                        placeholder="Lat" placeholderTextColor="#64748b"
                                        keyboardType="numeric"
                                        value={newTripData.startLat}
                                        onChangeText={t => setNewTripData({ ...newTripData, startLat: t })}
                                        className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-700"
                                    />
                                    <StyledInput
                                        placeholder="Lon" placeholderTextColor="#64748b"
                                        keyboardType="numeric"
                                        value={newTripData.startLon}
                                        onChangeText={t => setNewTripData({ ...newTripData, startLon: t })}
                                        className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-700"
                                    />
                                </StyledView>
                            </StyledView>

                            {/* End Point */}
                            <StyledView className="mb-6">
                                <StyledText className="text-red-400 text-xs mb-1 uppercase font-bold">End Point</StyledText>
                                <StyledInput
                                    placeholder="Name (e.g. Goa)"
                                    placeholderTextColor="#64748b"
                                    value={newTripData.endName}
                                    onChangeText={t => setNewTripData({ ...newTripData, endName: t })}
                                    className="bg-slate-900 text-white p-3 rounded-lg border border-slate-700 mb-2"
                                />
                                <StyledView className="flex-row gap-2">
                                    <StyledInput
                                        placeholder="Lat" placeholderTextColor="#64748b"
                                        keyboardType="numeric"
                                        value={newTripData.endLat}
                                        onChangeText={t => setNewTripData({ ...newTripData, endLat: t })}
                                        className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-700"
                                    />
                                    <StyledInput
                                        placeholder="Lon" placeholderTextColor="#64748b"
                                        keyboardType="numeric"
                                        value={newTripData.endLon}
                                        onChangeText={t => setNewTripData({ ...newTripData, endLon: t })}
                                        className="flex-1 bg-slate-900 text-white p-3 rounded-lg border border-slate-700"
                                    />
                                </StyledView>
                            </StyledView>

                            <StyledView className="flex-row gap-4">
                                <StyledButton onPress={() => setShowNewTripModal(false)} className="flex-1 bg-slate-700 p-4 rounded-xl items-center">
                                    <StyledText className="text-gray-300 font-bold">Cancel</StyledText>
                                </StyledButton>
                                <StyledButton onPress={handleCreateTrip} className="flex-1 bg-green-600 p-4 rounded-xl items-center">
                                    <StyledText className="text-white font-bold">Create Trip</StyledText>
                                </StyledButton>
                            </StyledView>
                        </ScrollView>
                    </StyledView>
                </StyledView>
            </Modal>
        </StyledView>
    );
}
