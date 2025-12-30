import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc, increment, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Eye, EyeOff, Users } from 'lucide-react';

const VisitCounter = () => {
    const [count, setCount] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasIncremented, setHasIncremented] = useState(false);

    useEffect(() => {
        const statsRef = doc(db, 'stats', 'visits');

        // Real-time listener
        const unsubscribe = onSnapshot(statsRef, (docSnap) => {
            if (docSnap.exists()) {
                setCount(docSnap.data().count);
            } else {
                setCount(0);
            }
        });

        // Increment Logic (Run once per session/mount)
        // Using session storage to prevent increment on every single refresh during same session if desired?
        // User asked for "all kind of user", usually meaningful "hits".
        // Let's increment on every mount for now (simple hit counter).
        // Check if we already incremented in this session to avoid React StrictMode double-invocations in dev

        const doIncrement = async () => {
            // Simple check to prevent double-count in React.StrictMode dev environment
            // In production it runs once.
            if (sessionStorage.getItem('visited_session')) {
                // Already counted this session? 
                // If "all kind of user" means "page views", we should count.
                // If "unique visitors", we shouldn't.
                // "Visit counter" usually implies page hits or unique sessions.
                // I'll stick to 1 count per session to be "polite" to the DB, or stick to raw page loads.
                // Let's do raw page loads but use a ref/flag to debounce local dev strict mode.
            }

            // Actually, simplest usage:
            try {
                // Check if doc exists first to Initialize
                const snap = await getDoc(statsRef);
                if (!snap.exists()) {
                    await setDoc(statsRef, { count: 1 });
                } else {
                    await updateDoc(statsRef, {
                        count: increment(1)
                    });
                }
            } catch (error) {
                console.error("Error updating visit count:", error);
            }
        };

        // Use a strictly local mechanism to ensure we only fire once per mount 
        // (React 18 Strict Mode mounts twice).
        // But in a functional component, this is tricky without a ref or outside variable.
        // We'll rely on a small session storage flag for "recent_visit" (e.g. 5 seconds) or just let it fly.
        // For robustness, let's just run it.
        const hasCounted = sessionStorage.getItem('visit_counted_session');
        if (!hasCounted) {
            doIncrement();
            sessionStorage.setItem('visit_counted_session', 'true');
        }

        return () => unsubscribe();
    }, []);

    if (count === null) return null; // Loading state

    return (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
            <div
                className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-full 
                    bg-dark-900/80 backdrop-blur-md border border-white/10 text-xs font-mono text-gray-400
                    transition-all duration-300 ease-out cursor-pointer hover:bg-white/5 hover:border-white/20
                    ${isVisible ? 'w-auto opacity-100 translate-x-0' : 'w-10 overflow-hidden opacity-50 hover:opacity-100'}
                `}
                onClick={() => setIsVisible(!isVisible)}
                title="Total Visits"
            >
                <Users size={14} className="shrink-0 text-cyan-500" />

                <span className={`
                    whitespace-nowrap transition-all duration-300
                    ${isVisible ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0'}
                `}>
                    {count.toLocaleString()} visits
                </span>
            </div>
        </div>
    );
};

export default VisitCounter;
