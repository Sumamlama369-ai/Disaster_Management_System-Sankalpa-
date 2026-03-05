import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDjNWoMOSZIXGgKSpLxIhpKfaAMLxSDaXA",
  authDomain: "disaster-management-4c3f6.firebaseapp.com",
  databaseURL: "https://disaster-management-4c3f6-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "disaster-management-4c3f6",
  storageBucket: "disaster-management-4c3f6.firebasestorage.app",
  messagingSenderId: "267393059356",
  appId: "1:267393059356:web:ec2c2cc65db72a49fd6dd9"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
