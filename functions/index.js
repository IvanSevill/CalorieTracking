const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { GoogleGenAI, Type } = require("@google/genai");
const { setGlobalOptions } = require("firebase-functions/v2");

setGlobalOptions({ region: "us-west1" });
// Initialize Firebase Admin
const app = initializeApp();
const db = getFirestore(app, "calorie-tracker-db");

// Define the OpenFoodFacts tool schema
const searchOpenFoodFactsDeclaration = {
    name: 'searchOpenFoodFacts',
    description: 'Search for a food item or ingredient in the OpenFoodFacts database to get real nutritional macros per 100g.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            query: {
                type: Type.STRING,
                description: 'The name of the food or main ingredient to search for (e.g., "Chicken breast", "Banana", "Coca Cola").',
            },
        },
        required: ['query'],
    },
};

// Helper to call OpenFoodFacts API
async function queryOpenFoodFacts(query) {
    console.log(`Executing tool searchOpenFoodFacts with query: ${query}`);
    try {
        const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.products && data.products.length > 0) {
            const product = data.products[0];
            const nutriments = product.nutriments || {};
            return {
                found: true,
                product_name: product.product_name || query,
                macros_per_100g: {
                    calories: nutriments['energy-kcal_100g'] || null,
                    protein: nutriments.proteins_100g || null,
                    carbs: nutriments.carbohydrates_100g || null,
                    fat: nutriments.fat_100g || null
                }
            };
        } else {
            return { found: false, message: "No products found for this query." };
        }
    } catch (e) {
        console.error("Error calling OpenFoodFacts:", e);
        return { found: false, error: e.message };
    }
}

// Configure the new GoogleGenAI client
const project = process.env.GCLOUD_PROJECT || "calorie-tracker-rncn24-gcp";

// This function is triggered automatically when a file is uploaded to Storage
exports.analyzeDish = onObjectFinalized({
    bucket: `${project}.firebasestorage.app` 
}, async (event) => {
    
    // Configure the new GoogleGenAI client inside the handler
    const ai = new GoogleGenAI({ 
        project: project, 
        location: 'us-west1',
        vertexai: true
    });
    
    const filePath = event.data.name;
    
    if (!filePath.startsWith("food_photos/")) {
        return console.log("File outside the target folder, ignoring.");
    }

    const fileName = filePath.split('/').pop();
    const entryId = fileName.split('.')[0];
    
    console.log(`Analyzing image: ${entryId}`);

    try {
        const fileUri = `gs://${event.data.bucket}/${filePath}`;

        const prompt = `
        Analyze this image of food. Identify the main dish.
        If it's a generic ingredient or packaged food, you MUST use the 'searchOpenFoodFacts' tool to get the real macros per 100g.
        After getting the real macros, or if the tool fails/returns nothing for complex dishes, use your best judgement to calculate a realistic approximation of its macros based on a standard portion for what is seen in the photo.
        Return STRICTLY a JSON object with this exact structure, without any additional text:
        {
            "food": "Name of the dish (e.g., Chicken breast with rice)",
            "macros": {
                "calories": 450,
                "protein": 35,
                "carbs": 40,
                "fat": 12
            }
        }`;

        let conversationHistory = [
            { 
                role: 'user', 
                parts: [
                    { fileData: { fileUri: fileUri, mimeType: event.data.contentType || "image/jpeg" } },
                    { text: prompt }
                ]
            }
        ];

        let response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: conversationHistory,
            config: {
                tools: [{ functionDeclarations: [searchOpenFoodFactsDeclaration] }],
                // We do not strictly enforce JSON here to allow function calls to work smoothly
            }
        });

        if (response.functionCalls && response.functionCalls.length > 0) {
            const call = response.functionCalls[0];
            if (call.name === 'searchOpenFoodFacts') {
                const query = call.args.query;
                const toolResult = await queryOpenFoodFacts(query);
                
                conversationHistory.push({ role: 'model', parts: [{ functionCall: call }] });
                conversationHistory.push({
                    role: 'user', 
                    parts: [{ 
                        functionResponse: {
                            name: call.name,
                            response: toolResult
                        }
                    }]
                });

                response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: conversationHistory,
                    config: {
                        responseMimeType: "application/json"
                    }
                });
            }
        }

        let responseText = response.text;
        // Clean up markdown wrapping if present
        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/```json\n?/, '').replace(/```\n?$/, '');
        } else if (responseText.startsWith('```')) {
            responseText = responseText.replace(/```\n?/, '').replace(/```\n?$/, '');
        }

        const nutritionalData = JSON.parse(responseText);
        nutritionalData.error = false;

        await db.collection("daily_entries").doc(entryId).set(nutritionalData, { merge: true });
        
        console.log("Analysis completed and saved to Firestore successfully.");

    } catch (error) {
        console.error("Error processing the image with AI:", error);
        await db.collection("daily_entries").doc(entryId).set({ error: true }, { merge: true });
    }
});