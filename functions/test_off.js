async function testOpenFoodFacts() {
    const query = "Chicken Breast";
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`;
    console.log("Fetching:", url);
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.products && data.products.length > 0) {
        const product = data.products[0];
        console.log("Found product:", product.product_name);
        const nutriments = product.nutriments;
        console.log("Macros per 100g:");
        console.log("Calories:", nutriments['energy-kcal_100g']);
        console.log("Protein:", nutriments.proteins_100g);
        console.log("Carbs:", nutriments.carbohydrates_100g);
        console.log("Fat:", nutriments.fat_100g);
    } else {
        console.log("No products found.");
    }
}
testOpenFoodFacts();
