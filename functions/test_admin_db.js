const { Firestore } = require('@google-cloud/firestore');

async function test() {
    const db = new Firestore({
        projectId: 'calorie-tracker-rncn24-gcp',
        databaseId: '(default)'
    });
    
    try {
        const collections = await db.listCollections();
        console.log("Collections:", collections.map(c => c.id));
        for (const collection of collections) {
            const snapshot = await collection.get();
            console.log(`Collection ${collection.id} has ${snapshot.size} docs.`);
            snapshot.forEach(doc => {
                console.log(doc.id);
            });
        }
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
