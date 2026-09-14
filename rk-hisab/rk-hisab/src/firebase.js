import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

// আপনার Firebase প্রজেক্টের কনফিগারেশন
const firebaseConfig = {
  apiKey: "AIzaSyDYWIbLI4FsFj-fDFq5pLoB95RLY5_KYZY",
  authDomain: "rk-ad-4c9fb.firebaseapp.com",
  projectId: "rk-ad-4c9fb",
  storageBucket: "rk-ad-4c9fb.firebasestorage.app",
  messagingSenderId: "353960254944",
  appId: "1:353960254944:web:c5efbc0312629bc99bdf85",
  measurementId: "G-Q4QB6EED7C",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const COLLECTION = "rkHisab";

// এই ছোট wrapper-টা Claude আর্টিফ্যাক্টের window.storage.get/set-এর মতোই কাজ করে,
// যাতে বাকি অ্যাপের কোড প্রায় অপরিবর্তিত থাকতে পারে — শুধু ব্যাকএন্ড এখন Firestore।
export const storage = {
  async get(key) {
    const ref = doc(db, COLLECTION, key);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return { key, value: snap.data().value };
  },
  async set(key, value) {
    const ref = doc(db, COLLECTION, key);
    await setDoc(ref, { value });
    return { key, value };
  },
};
