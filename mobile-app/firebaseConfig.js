// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyANyBu2sTNxDMB0sZcls7BoXA1SuBE6Sss",
    authDomain: "patblrtravel.firebaseapp.com",
    projectId: "patblrtravel",
    storageBucket: "patblrtravel.firebasestorage.app",
    messagingSenderId: "299156729588",
    appId: "1:299156729588:web:42bc81229f6d48e73b38a1",
    measurementId: "G-KGE1MGDVZB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with Persistence
export const auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
