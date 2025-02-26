// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDM9GaY6XmTTscikx2N8pq00pDf_XP2l2I",
  authDomain: "dev-finder-96e7c.firebaseapp.com",
  projectId: "dev-finder-96e7c",
  storageBucket: "dev-finder-96e7c.appspot.com",
  messagingSenderId: "990786948843",
  appId: "1:990786948843:web:869cb76f61f8a951ef38ae",
  measurementId: "G-YTPGBHDGSZ"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);