import { collection, query, where, getDocs, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';

// One-time migration function
export const migrateLegacyData = async () => {
    try {
        console.log("Checking for legacy data...");
        // 1. Check if there are updates with NO tripId (or tripId field missing)
        // Note: Firestore queries for "missing field" are tricky. 
        // Simple approach: Fetch ALL updates and filter in memory (assuming dataset isn't huge yet).
        // If huge, we'd need a specific heuristic. Assuming < 1000 updates for now.

        const updatesRef = collection(db, "trip_updates");
        const snapshot = await getDocs(updatesRef);

        const legacyUpdates = snapshot.docs.filter(doc => !doc.data().tripId);

        if (legacyUpdates.length === 0) {
            console.log("No legacy updates found. Migration not needed.");
            return;
        }

        console.log(`Found ${legacyUpdates.length} legacy updates. Migrating...`);

        // 2. Create a restored trip if it doesn't represent real data? 
        // We check for a generic name now.
        const tripsRef = collection(db, "trips");
        const tripsSnapshot = await getDocs(query(tripsRef, where("name", "==", "Restored Trip")));

        let targetTripId;

        if (!tripsSnapshot.empty) {
            targetTripId = tripsSnapshot.docs[0].id;
            console.log("Found existing target trip:", targetTripId);
        } else {
            console.log("Creating new restored trip...");
            const newTripRef = await addDoc(collection(db, "trips"), {
                name: "Restored Trip",
                createdAt: serverTimestamp(),
                isActive: true,
                startPoint: {
                    name: "Start",
                    coords: { latitude: 20.5937, longitude: 78.9629 } // Generic India Center or similar
                },
                endPoint: {
                    name: "End",
                    coords: { latitude: 20.5937, longitude: 78.9629 }
                }
            });
            targetTripId = newTripRef.id;
        }

        // 3. Batch Update legacy updates to link to this Trip ID
        // Firestore batch limit is 500. We'll chunks if needed.
        const batch = writeBatch(db);
        let count = 0;

        legacyUpdates.forEach(updateDoc => {
            const ref = doc(db, "trip_updates", updateDoc.id);
            batch.update(ref, { tripId: targetTripId });
            count++;
        });

        await batch.commit();
        console.log(`Successfully migrated ${count} updates to Trip ID: ${targetTripId}`);
        window.location.reload(); // Force reload to refresh UI state with new data structure

    } catch (error) {
        console.error("Migration failed:", error);
    }
};
