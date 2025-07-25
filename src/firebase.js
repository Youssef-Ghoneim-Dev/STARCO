import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
  apiKey: "AIzaSyDeozMrczaLiZRMKCwmiZWth1m4BJyS79k",
  authDomain: "starco-14b2f.firebaseapp.com",
  projectId: "starco-14b2f",
  storageBucket: "starco-14b2f.firebasestorage.app",
  messagingSenderId: "806277717305",
  appId: "1:806277717305:web:6641323954851828671ce8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default db;


