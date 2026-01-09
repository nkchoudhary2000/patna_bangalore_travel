import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { styled } from 'nativewind';
import { useOffline } from '../offline/OfflineQueueContext';
import { db } from '../firebaseConfig';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledButton = styled(TouchableOpacity);

export default function MapScreen({ navigation }) {
    const [location, setLocation] = useState(null);
    const { addToQueue, isConnected } = useOffline();

    // ... (keep useEffect and handlePostUpdate same) ...

    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                alert('Permission into location was denied');
                return;
            }
        })();
    }, []);

    const handlePostUpdate = async () => {
        console.log("Starting update...");
        let loc = await Location.getCurrentPositionAsync({});
        const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };

        try {
            // 1. Save to Firestore (Offline Persistence handles this local save!)
            const docRef = await addDoc(collection(db, "trip_updates"), {
                coordinates: coords,
                timestamp: serverTimestamp(),
                type: 'drive', // default
                message: 'Auto-Update (Mobile)',
                // Pending fields
                locationName: null,
                aqi: null,
                temp: null
            });

            // 2. If Offline, Add to Queue for Enrichment
            if (!isConnected) {
                await addToQueue({
                    id: docRef.id,
                    type: 'ENRICH_METADATA',
                    coords: coords
                });
                alert("Saved Offline! Will enrich details when online.");
            } else {
                // Online: We could fetch details now, OR just let the Queue process it anyway if we treat everything as 'needs enrichment'
                // For simplicity, let's treat it same:
                await addToQueue({
                    id: docRef.id,
                    type: 'ENRICH_METADATA',
                    coords: coords
                });
                alert("Update Posted Successfully!");
                // Trigger process immediately? Context handles it via listener usually.
            }

        } catch (e) {
            console.error(e);
            alert("Error saving: " + e.message);
        }
    };

    return (
        <View style={styles.container}>
            <MapView style={styles.map} showsUserLocation={true} />

            <StyledView className="absolute top-12 right-6">
                <StyledButton
                    onPress={() => navigation.navigate('Admin')}
                    className="bg-slate-800/80 p-3 rounded-xl border border-white/20"
                >
                    <StyledText className="text-white font-bold">Admin Panel</StyledText>
                </StyledButton>
            </StyledView>

            <StyledView className="absolute bottom-10 w-full px-6">
                <StyledButton
                    onPress={handlePostUpdate}
                    className="bg-green-600 p-4 rounded-full items-center shadow-lg"
                >
                    <StyledText className="text-white font-bold text-xl">
                        {isConnected ? "Post Update" : "Post Offline"}
                    </StyledText>
                </StyledButton>
            </StyledView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: '100%', height: '100%' },
});
