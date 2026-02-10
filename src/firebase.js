import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyC_0RQS6JBHKFoianhuC9YZRKsIrFat1Zs",
  authDomain: "starco-90180.firebaseapp.com",
  projectId: "starco-90180",
  storageBucket: "starco-90180.firebasestorage.app",
  messagingSenderId: "812113046440",
  appId: "1:812113046440:web:c5bd091096af57daa70b9d"
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const db = getFirestore(app);

export default db;


