import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, collection, getDocs } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB56tdZAE3h5spJmOhq19VbJPUAFtll0rc",
  authDomain: "calorie-tracker-rncn24-gcp.firebaseapp.com",
  projectId: "calorie-tracker-rncn24-gcp",
  storageBucket: "calorie-tracker-rncn24-gcp.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
    try {
        const snapshot = await getDocs(collection(db, "daily_entries"));
        console.log("Documents found:", snapshot.size);
        snapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
        });
    } catch (e) {
        console.error(e);
    }
}
run();
