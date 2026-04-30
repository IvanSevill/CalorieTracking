const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const app = initializeApp({ projectId: 'calorie-tracker-rncn24-gcp' });
console.log("App initialized");

try {
    const db1 = getFirestore().database("calorie-tracker-db");
    console.log("db1 works!", db1.projectId, db1.databaseId);
} catch (e) {
    console.error("db1 error:", e.message);
}
