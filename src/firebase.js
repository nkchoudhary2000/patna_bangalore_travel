// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
