const { VertexAI } = require('@google-cloud/vertexai');

async function test() {
    const vertex_ai = new VertexAI({project: 'calorie-tracker-rncn24-gcp', location: 'us-central1'});
    const generativeModel = vertex_ai.preview.getGenerativeModel({
      model: 'gemini-1.5-flash',
    });

    try {
        const response = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: 'say hello' }] }]
        });
        console.log("Success:", JSON.stringify(response));
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
