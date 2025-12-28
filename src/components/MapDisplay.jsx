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

// Component to update map center and bounds
function MapUpdater({ center, focusLocation, bounds }) {
    const map = useMap();
    const [initialBoundSet, setInitialBoundSet] = useState(false);

    // Handle Initial Bounds (Fit Map to show Patna -> Bangalore)
    useEffect(() => {
        if (!initialBoundSet && bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
            setInitialBoundSet(true);
        }
    }, [bounds, map, initialBoundSet]);

    // Handle Focus Location (User Click)
    useEffect(() => {
        if (focusLocation) {
            map.flyTo(focusLocation, 14, { duration: 1.5 }); // Closer zoom for specific updates
        }
    }, [focusLocation, map]);

    // Handle Center Updates (Live Tracking) - Only if no manual focus interaction occurred recently
    // For now, we only update if it's a significant move or strictly live mode. 
    // Simplified: Just fly to center if passed, but lower priority than focus
    /* 
    useEffect(() => {
        if (center && !focusLocation) {
             map.flyTo(center, 10, { duration: 2 });
        }
    }, [center, map, focusLocation]); 
    */
    // NOTE: Disabled auto-center to preventing fighting with user control, as requested "zoom out... entirely".

    return null;
}

// Button to reset map view
function ResetMapControl({ bounds }) {
    const map = useMap();

    const handleReset = (e) => {
        e.stopPropagation(); // Prevent map click
        if (bounds) {
            map.fitBounds(bounds, { padding: [50, 50] });
        }
    };

    return (
        <div className="absolute top-4 right-4 z-[1000]">
            <button
                onClick={handleReset}
                className="bg-dark-900/80 backdrop-blur-md text-white p-2 rounded-lg border border-white/10 shadow-xl hover:bg-white/10 transition-colors flex items-center gap-2"
                title="Reset View"
            >
                <span className="text-xs font-bold">Reset View</span>
            </button>
        </div>
    );
}

const MapDisplay = ({ focusLocation }) => {
    const [points, setPoints] = useState([]);
    const [currentLocation, setCurrentLocation] = useState(null);
    const [stats, setStats] = useState({ traveled: 0, remaining: 0, total: 0, progress: 0 });

    // Coordinates
    const PATNA_COORDS = [25.5941, 85.1376];
    const BANGALORE_COORDS = [13.0018, 77.6892]; // KR Puram

    // Calculate distance between two points (Haversine formula) in km
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        const R = 6371; // Radius of the earth in km
        const dLat = (lat2 - lat1) * (Math.PI / 180);
        const dLon = (lon2 - lon1) * (Math.PI / 180);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Distance in km
    };

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

            // Calculate Stats
            let traveledDist = 0;
            let current = PATNA_COORDS;

            fetchedData.forEach(p => {
                const next = [p.coordinates.latitude, p.coordinates.longitude];
                traveledDist += calculateDistance(current[0], current[1], next[0], next[1]);
                current = next;
            });

            const remainingDist = calculateDistance(current[0], current[1], BANGALORE_COORDS[0], BANGALORE_COORDS[1]);
            const totalDist = traveledDist + remainingDist;

            // If no updates yet, total is just straight line Patna -> Bangalore
            const finalTotal = totalDist === 0 ? calculateDistance(PATNA_COORDS[0], PATNA_COORDS[1], BANGALORE_COORDS[0], BANGALORE_COORDS[1]) : totalDist;

            setStats({
                traveled: Math.round(traveledDist),
                remaining: Math.round(remainingDist),
                total: Math.round(finalTotal),
                progress: Math.min(100, Math.round((traveledDist / finalTotal) * 100))
            });

            if (fetchedData.length > 0) {
                const last = fetchedData[fetchedData.length - 1];
                setCurrentLocation([last.coordinates.latitude, last.coordinates.longitude]);
            } else {
                setCurrentLocation(PATNA_COORDS);
            }
        });

        return () => unsubscribe();
    }, []);

    // Traveled Path: Patna -> ...Points
    const traveledPath = [PATNA_COORDS, ...points.map(p => [p.coordinates.latitude, p.coordinates.longitude])];

    // Remaining Path: Last Point (or Patna) -> Bangalore
    const lastPoint = points.length > 0
        ? [points[points.length - 1].coordinates.latitude, points[points.length - 1].coordinates.longitude]
        : PATNA_COORDS;
    const remainingPath = [lastPoint, BANGALORE_COORDS];

    // Initial Bounds: Patna to Bangalore
    const initialBounds = L.latLngBounds([PATNA_COORDS, BANGALORE_COORDS]);

    return (
        <div className="h-full w-full relative">
            {/* Floating Stats Card */}
            <div className="absolute top-4 left-4 z-[1000] space-y-3">
                {/* Live Status */}
                <div className="bg-dark-900/80 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl w-[220px]">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Trip Status</div>
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="font-bold text-green-400 text-sm">Live Tracking</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-gray-400 uppercase tracking-wider">Progress</div>
                            <div className="text-xl font-bold text-white">{stats.progress}%</div>
                        </div>
                    </div>

                    {/* Distance Bars */}
                    <div className="space-y-2">
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span>Covered</span>
                                <span className="text-white font-mono">{stats.traveled} km</span>
                            </div>
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 transition-all duration-1000" style={{ width: `${stats.progress}%` }}></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span>Remaining</span>
                                <span className="text-blue-300 font-mono">{stats.remaining} km</span>
                            </div>
                            <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500/50" style={{ width: '100%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Location Debug Info (Optional, can be removed if too cluttered) */}
                {currentLocation && (
                    <div className="bg-dark-900/80 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-xl w-[220px]">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Current Location</div>
                        <div className="text-xs font-mono text-gray-300">
                            {currentLocation[0].toFixed(4)}, {currentLocation[1].toFixed(4)}
                        </div>
                    </div>
                )}
            </div>

            <MapContainer
                center={PATNA_COORDS}
                zoom={5}
                scrollWheelZoom={true}
                className="h-full w-full outline-none"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />

                {/* Traveled Route (Green) */}
                <Polyline
                    positions={traveledPath}
                    color="#22c55e" // green-500
                    weight={4}
                    opacity={0.9}
                    dashArray={null}
                />

                {/* Remaining Route (Blue, Dashed) */}
                <Polyline
                    positions={remainingPath}
                    color="#3b82f6" // blue-500
                    weight={3}
                    opacity={0.6}
                    dashArray="10, 10" // Dashed line to show it's projected
                />

                {/* Start Marker (Patna) */}
                <Marker position={PATNA_COORDS}>
                    <Popup>
                        <div className="font-bold text-sm">Patna (Start)</div>
                        <div className="text-xs text-gray-500">Railway Station</div>
                    </Popup>
                </Marker>

                {/* End Marker (Bangalore) */}
                <Marker position={BANGALORE_COORDS}>
                    <Popup>
                        <div className="font-bold text-sm">Bangalore (Destination)</div>
                        <div className="text-xs text-gray-500">KR Puram Railway Station</div>
                    </Popup>
                </Marker>

                {points.map((update) => (
                    <Marker key={update.id} position={[update.coordinates.latitude, update.coordinates.longitude]}>
                        <Popup className="custom-popup min-w-[200px]">
                            <div className="p-1">
                                <div className="font-bold text-sm mb-1 capitalize">{update.type}</div>
                                {update.locationName && <div className="text-xs text-gray-500 mb-2">{update.locationName}</div>}
                                {update.mediaUrl && (
                                    <div className="w-40 h-24 mb-2 rounded bg-gray-900 overflow-hidden">
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
                                {update.aqi && (
                                    <div className="mt-1 text-[10px] font-bold">
                                        AQI: <span className={
                                            update.aqi <= 50 ? 'text-green-600' :
                                                update.aqi <= 100 ? 'text-yellow-600' :
                                                    update.aqi <= 150 ? 'text-orange-600' :
                                                        update.aqi <= 200 ? 'text-red-600' :
                                                            'text-purple-600'
                                        }>{update.aqi}</span>
                                    </div>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                <MapUpdater center={currentLocation} focusLocation={focusLocation} bounds={initialBounds} />
                <ResetMapControl bounds={initialBounds} />
            </MapContainer>
        </div>
    );
};

export default MapDisplay;
