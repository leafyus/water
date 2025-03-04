// Your Firebase configuration
// Replace these values with your actual Firebase project configuration
 const firebaseConfig = {
    apiKey: "AIzaSyBmxs5Kk94E6hc1hUnik2L1FRQ0P2TCtHI",
    authDomain: "nutrient-tracker-60112.firebaseapp.com",
    databaseURL: "https://nutrient-tracker-60112-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "nutrient-tracker-60112",
    storageBucket: "nutrient-tracker-60112.firebasestorage.app",
    messagingSenderId: "680326719834",
    appId: "1:680326719834:web:915baa50cb17cd2ac8ab63",
    measurementId: "G-191SCNWELL"
  };

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get a reference to the database service
const database = firebase.database();
const auth = firebase.auth();

// Reference to the current user's data
let userDataRef = null;
