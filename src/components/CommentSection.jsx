import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { signInWithPopup } from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';
import { MessageCircle, User as UserIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const CommentSection = () => {
    const [comments, setComments] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [user, setUser] = useState(null);

    useEffect(() => {
        auth.onAuthStateChanged(setUser);
    }, []);

    useEffect(() => {
        const q = query(collection(db, "comments"), orderBy("timestamp", "desc"), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const handleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user || !newMessage.trim()) return;

        try {
            await addDoc(collection(db, "comments"), {
                timestamp: serverTimestamp(),
                message: newMessage,
                user: user.displayName,
                photoURL: user.photoURL,
                uid: user.uid
            });
            setNewMessage('');
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <MessageCircle size={14} /> Guestbook
            </h3>

            {/* Input Area (Moved to Top) */}
            <div className="mb-2">
                {user ? (
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Leave a supportive message..."
                            className="flex-1 bg-dark-900 border border-white/10 rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                        <button
                            type="submit"
                            disabled={!newMessage.trim()}
                            className="p-2 bg-blue-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <div className="rotate-[-45deg] relative left-[-1px]">
                                <SendIcon size={16} />
                            </div>
                        </button>
                    </form>
                ) : (
                    <button
                        onClick={handleLogin}
                        className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg text-xs text-gray-300 transition-colors"
                    >
                        Sign in to leave a message
                    </button>
                )}
            </div>

            {/* Comment List */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {comments.map((comment) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={comment.id}
                        className="flex gap-3 items-start"
                    >
                        {comment.photoURL ? (
                            <img src={comment.photoURL} alt={comment.user} className="w-8 h-8 rounded-full border border-white/10" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                <UserIcon size={14} />
                            </div>
                        )}
                        <div className="flex-1 bg-white/5 p-3 rounded-lg rounded-tl-none border border-white/5">
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm font-semibold text-gray-200">{comment.user}</span>
                                <span className="text-[10px] text-gray-500">
                                    {comment.timestamp?.toDate().toLocaleDateString()}
                                </span>
                            </div>
                            <p className="text-xs text-gray-300">{comment.message}</p>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

// Simple send icon component for the form
const SendIcon = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13"></line>
        <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
    </svg>
);

export default CommentSection;
