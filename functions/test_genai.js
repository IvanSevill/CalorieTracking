const { GoogleGenAI } = require("@google/genai");

async function test() {
    const ai = new GoogleGenAI({ 
        project: "calorie-tracker-rncn24-gcp",
        location: "us-west1",
        vertexai: true
    });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'say hello'
        });
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
