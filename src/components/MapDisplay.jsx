import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import 'leaflet/dist/leaflet.css';

// Fix for default Leaflet marker icons in React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to update map center
function MapUpdater({ center }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.flyTo(center, 13, { duration: 2 });
        }
    }, [center, map]);
    return null;
}

const MapDisplay = () => {
    const [points, setPoints] = useState([]); // Now stores full update objects
    const [currentLocation, setCurrentLocation] = useState(null);
    const [totalDistance, setTotalDistance] = useState(0);

    useEffect(() => {
        const q = query(collection(db, "trip_updates"), orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedData = [];

            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                if (data.coordinates) {
                    fetchedData.push({ id: doc.id, ...data });
                }
            });

            setPoints(fetchedData);
            if (fetchedData.length > 0) {
                const last = fetchedData[fetchedData.length - 1];
                setCurrentLocation([last.coordinates.latitude, last.coordinates.longitude]);
            }
        });

        return () => unsubscribe();
    }, []);

    // Patna Start: 25.5941, 85.1376
    const defaultCenter = [25.5941, 85.1376];

    return (
        <div className="h-full w-full relative">
            {/* Floating Stats Card */}
            <div className="absolute top-4 left-4 z-[400] bg-dark-900/80 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl max-w-[200px]">
                <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</div>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    <span className="font-bold text-green-400">Live</span>
                </div>
                {currentLocation && (
                    <div className="mt-3 text-xs text-gray-300">
                        <div className="font-semibold text-white">Latest Update</div>
                        Lat: {currentLocation[0].toFixed(4)}<br />
                        Lng: {currentLocation[1].toFixed(4)}
                    </div>
                )}
            </div>

            <MapContainer
                center={defaultCenter}
                zoom={6}
                scrollWheelZoom={true}
                className="h-full w-full outline-none"
                zoomControl={false}
            >
                <TileLayer
                    // Using CartoDB Dark Matter for that sleek dark integration
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {points.length > 0 && <Polyline positions={points.map(p => [p.coordinates.latitude, p.coordinates.longitude])} color="#60a5fa" weight={4} opacity={0.7} />}

                {points.map((update) => (
                    <Marker key={update.id} position={[update.coordinates.latitude, update.coordinates.longitude]}>
                        <Popup className="custom-popup min-w-[200px]">
                            <div className="p-1">
                                <div className="font-bold text-sm mb-1 capitalize">{update.type}</div>
                                {update.locationName && <div className="text-xs text-gray-500 mb-2">{update.locationName}</div>}
                                {update.mediaUrl && (
                                    <div className="w-40 h-24 mb-2 rounded bg-gray-900 overflow-hidden">
                                        {/* Simplified Media View for Popup - just image/video thumbnail */}
                                        {update.mediaType === 'video' ? (
                                            <div className="w-full h-full flex items-center justify-center bg-black">
                                                <span className="text-xs text-white">Video</span>
                                            </div>
                                        ) : (
                                            <img src={update.mediaUrl.includes('drive.google.com') ? `https://drive.google.com/thumbnail?id=${update.mediaUrl.match(/\/d\/(.*?)(?:\/|$)|id=(.*?)(?:&|$)/)?.[1] || update.mediaUrl.match(/\/d\/(.*?)(?:\/|$)|id=(.*?)(?:&|$)/)?.[2]}&sz=s200` : update.mediaUrl} className="w-full h-full object-cover" />
                                        )}
                                    </div>
                                )}
                                <p className="text-xs line-clamp-3">{update.message}</p>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {currentLocation && (
                    <MapUpdater center={currentLocation} />
                )}
            </MapContainer>
        </div>
    );
};

export default MapDisplay;
