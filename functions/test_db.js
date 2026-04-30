const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function test() {
    // we need credentials? 
    // Wait, Application Default Credentials should work locally using gcloud auth!
    initializeApp();
    const db = getFirestore("calorie-tracker-db");
    
    try {
        const snapshot = await db.collection("daily_entries").get();
        console.log("Documents found:", snapshot.size);
        snapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
        });
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
