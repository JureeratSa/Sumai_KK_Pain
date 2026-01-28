import { getDatabase, ref, remove } from "firebase/database";
import { initializeApp } from "firebase/app";

// const firebaseConfig = {
//     apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//     authDomain: "inewgenweb.firebaseapp.com",
//     databaseURL: "https://inewgenweb-default-rtdb.asia-southeast1.firebasedatabase.app",
//     projectId: "inewgenweb",
//     storageBucket: "inewgenweb.firebasestorage.app",
//     messagingSenderId: "367428928627",
//     appId: "1:367428928627:web:2c0dad766e8f7918145606",
//     measurementId: "G-C9H5D17Y7T"
// };

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

export { db, ref, remove };
