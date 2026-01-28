import { db } from './firebase.js';
import { ref, get } from 'firebase/database';

async function checkPredict() {
    try {
        const snapshot = await get(ref(db, 'patient'));
        if (snapshot.exists()) {
            const data = snapshot.val();
            Object.keys(data).forEach(hn => {
                const p = data[hn];
                const devices = p['Device no'] || {};
                console.log(`HN: ${hn}`);
                Object.keys(devices).forEach(did => {
                    const dev = devices[did];
                    console.log(`  Device: ${did}`);
                    console.log(`  - Has predict? ${dev.predict ? 'YES' : 'NO'}`);
                    if (dev.predict) {
                        console.log(`  - Payload: ${JSON.stringify(dev.predict)}`);
                    }
                });
            });
        }
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkPredict();
