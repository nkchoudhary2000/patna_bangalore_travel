import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo'; // Using direct if expo wrapper fails
// import { useNetInfo } from 'expo-netinfo'; // Fallback

export const OfflineContext = createContext();

export const OfflineProvider = ({ children }) => {
    const [queue, setQueue] = useState([]);
    const [isConnected, setIsConnected] = useState(true);

    // Load queue on mount
    useEffect(() => {
        loadQueue();
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsConnected(state.isConnected);
            if (state.isConnected) {
                processQueue();
            }
        });
        return unsubscribe;
    }, []);

    const loadQueue = async () => {
        const q = await AsyncStorage.getItem('offline_queue');
        if (q) setQueue(JSON.parse(q));
    };

    const saveQueue = async (newQueue) => {
        setQueue(newQueue);
        await AsyncStorage.setItem('offline_queue', JSON.stringify(newQueue));
    };

    const addToQueue = async (action) => {
        const newQueue = [...queue, action];
        await saveQueue(newQueue);
    };

    const processQueue = async () => {
        if (queue.length === 0) return;
        console.log("Processing Offline Queue: ", queue.length, " items");

        const newQueue = [...queue];
        const processedIndices = [];

        for (let i = 0; i < newQueue.length; i++) {
            const item = newQueue[i];

            if (item.type === 'ENRICH_METADATA') {
                try {
                    const { latitude, longitude } = item.coords;
                    const updates = {};

                    // 1. Fetch Address
                    try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                        const data = await res.json();
                        updates.locationName = data.address?.city || data.address?.town || data.address?.village || data.display_name.split(',')[0];
                    } catch (e) { console.log('Address fetch failed', e); }

                    // 2. Fetch AQI
                    try {
                        const aqiRes = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}&current=us_aqi`);
                        const aqiData = await aqiRes.json();
                        if (aqiData.current?.us_aqi) updates.aqi = aqiData.current.us_aqi;
                    } catch (e) { console.log('AQI fetch failed', e); }

                    // 3. Fetch Temp
                    try {
                        const tempRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`);
                        const tempData = await tempRes.json();
                        if (tempData.current?.temperature_2m) updates.temp = tempData.current.temperature_2m;
                    } catch (e) { console.log('Temp fetch failed', e); }

                    // 4. Update Firestore
                    // We reference the doc ID we saved offline
                    // Import 'doc' and 'updateDoc' dynamically or ensure imported at top
                    const { doc, updateDoc } = require('firebase/firestore');
                    const { db } = require('../firebaseConfig');

                    if (Object.keys(updates).length > 0) {
                        await updateDoc(doc(db, "trip_updates", item.id), updates);
                        console.log(`Enriched doc ${item.id} with`, updates);
                    }

                    processedIndices.push(i);

                } catch (err) {
                    console.error("Failed to process item", item.id, err);
                    // If error is permanent, maybe remove? For now keep to retry.
                }
            }
        }

        // Remove processed
        if (processedIndices.length > 0) {
            // filter out processed
            const remaining = newQueue.filter((_, idx) => !processedIndices.includes(idx));
            await saveQueue(remaining);
        }
    };

    return (
        <OfflineContext.Provider value={{ addToQueue, isConnected }}>
            {children}
        </OfflineContext.Provider>
    );
};

export const useOffline = () => useContext(OfflineContext);
