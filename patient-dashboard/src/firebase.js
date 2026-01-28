import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD2o4EyppYRqtpK4AZ87ouKeVkmkGl5Do0",
  authDomain: "paindetection-d0ca2.firebaseapp.com",
  databaseURL: "https://paindetection-d0ca2-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "paindetection-d0ca2",
  storageBucket: "paindetection-d0ca2.firebasestorage.app",
  messagingSenderId: "625112195070",
  appId: "1:625112195070:web:5c4938535205fd833a6aaf",
  measurementId: "G-V3Q4197ZE8"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db };
