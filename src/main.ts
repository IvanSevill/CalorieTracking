import './style.css';
import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable } from 'firebase/storage';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

// 1. Initialize Firebase
// The environment variables come from VITE_ prefix (defined in the root .env)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app, "calorie-tracker-db");

// 2. DOM Elements
const foodImageInput = document.getElementById('foodImage') as HTMLInputElement;
const uploadSection = document.getElementById('uploadSection') as HTMLDivElement;
const previewContainer = document.getElementById('previewContainer') as HTMLDivElement;
const imagePreview = document.getElementById('imagePreview') as HTMLImageElement;
const loadingState = document.getElementById('loadingState') as HTMLDivElement;
const resultsCard = document.getElementById('resultsCard') as HTMLDivElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

const foodName = document.getElementById('foodName') as HTMLHeadingElement;
const macroCalories = document.getElementById('macroCalories') as HTMLSpanElement;
const macroProtein = document.getElementById('macroProtein') as HTMLSpanElement;
const macroCarbs = document.getElementById('macroCarbs') as HTMLSpanElement;
const macroFat = document.getElementById('macroFat') as HTMLSpanElement;

// 3. Event Listeners
foodImageInput.addEventListener('change', handleFileUpload);
resetBtn.addEventListener('click', resetApp);

async function handleFileUpload(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];

  if (!file) return;

  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.src = e.target?.result as string;
    uploadSection.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    loadingState.classList.remove('hidden');
  };
  reader.readAsDataURL(file);

  // Generate a unique ID using timestamp to ensure every upload is treated as new
  // This prevents caching issues where a previous failed upload (error: true) prevents retries
  const uniqueId = `img_${Date.now()}_${file.size}`;
  const fileExtension = file.name.split('.').pop() || 'jpg';
  const filePath = `food_photos/${uniqueId}.${fileExtension}`;

  try {
    // 4. Upload to Firebase Storage
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // We could show progress here if we wanted
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload is ' + progress.toFixed(0) + '% done');
      },
      (error) => {
        console.error("Upload error:", error);
        alert("Error uploading image. Try again.");
        resetApp();
      },
      () => {
        console.log("Upload complete. Waiting for AI analysis...");
        // 5. Start listening to Firestore once upload completes
        listenForResults(uniqueId);
      }
    );
  } catch (error) {
    console.error("General error:", error);
    alert("Something went wrong. Try again.");
    resetApp();
  }
}

function listenForResults(entryId: string) {
  // Use polling instead of onSnapshot to bypass browser restrictions (ERR_BLOCKED_BY_CLIENT)
  const docRef = doc(db, 'daily_entries', entryId);
  
  let attempts = 0;
  const maxAttempts = 30; // Wait up to 60 seconds (30 * 2s)

  const intervalId = setInterval(async () => {
    attempts++;
    try {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.error) {
           clearInterval(intervalId);
           alert("AI couldn't analyze this image. Please try another one.");
           resetApp();
           return;
        }

        if (data.food && data.macros) {
          clearInterval(intervalId);
          console.log("Received data:", data);
          showResults(data);
        }
      } else if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        alert("The analysis is taking too long. Please try again.");
        resetApp();
      }
    } catch (err) {
      console.error("Error polling Firestore:", err);
      // Don't stop polling immediately on error, might be a temporary network glitch
      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        resetApp();
      }
    }
  }, 2000); // Check every 2 seconds
}

function showResults(data: any) {
  // Hide loading, show results
  loadingState.classList.add('hidden');
  resultsCard.classList.remove('hidden');

  // Update UI
  foodName.textContent = data.food;
  macroCalories.textContent = data.macros.calories.toString();
  macroProtein.textContent = data.macros.protein.toString() + 'g';
  macroCarbs.textContent = data.macros.carbs.toString() + 'g';
  macroFat.textContent = data.macros.fat.toString() + 'g';
}

function resetApp() {
  foodImageInput.value = '';
  imagePreview.src = '';
  
  uploadSection.classList.remove('hidden');
  previewContainer.classList.add('hidden');
  loadingState.classList.add('hidden');
  resultsCard.classList.add('hidden');
}
