// firebase.js
import { initializeApp } from "firebase/app"; // Import the initialization method
import { getAuth } from "firebase/auth"; // Import auth method
import { get, getDatabase } from "firebase/database"; // Import database method
import { getStorage } from "firebase/storage"; // Import storage method


// Your Firebase project configuration (from Firebase console)
const firebaseConfig = {
    apiKey: "AIzaSyCnZoSml8hNUJYd73Q2VqQhuqmFW3Ugqe0",
    authDomain: "finalyearprojectdb-d036e.firebaseapp.com",
    databaseURL: "https://finalyearprojectdb-d036e-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "finalyearprojectdb-d036e",
    storageBucket: "finalyearprojectdb-d036e.firebasestorage.app",
    messagingSenderId: "706880423674",
    appId: "1:706880423674:web:0be201ba1311081b68eb43",
    measurementId: "G-R095W1KJ2T"
  };

// Initialize Firebase
const app = initializeApp(firebaseConfig); 

// Export the auth and database instances to be used in other parts of your app
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database };
export const storage = getStorage(app);
//
