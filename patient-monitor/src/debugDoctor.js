import { db } from './firebase.js';
import { ref, get } from 'firebase/database';

async function debugDoctor() {
    try {
        const snapshot = await get(ref(db, 'Doctor'));
        if (snapshot.exists()) {
            console.log("Doctor Node Data:");
            console.log(JSON.stringify(snapshot.val(), null, 2));
        } else {
            console.log("No Doctor data available");
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

debugDoctor();
