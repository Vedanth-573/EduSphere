import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, setPersistence, browserSessionPersistence, browserLocalPersistence, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyAsM08K7a5WSCFx8bzhJNCk4Hd7OaZEnlQ",
  authDomain: "edusphere-7b740.firebaseapp.com",
  projectId: "edusphere-7b740",
  storageBucket: "edusphere-7b740.firebasestorage.app",
  messagingSenderId: "655334773681",
  appId: "1:655334773681:web:e1054ddd70d68bed7ee390",
  measurementId: "G-SHKKQTZ282"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, updateProfile, setPersistence, browserSessionPersistence, browserLocalPersistence, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup };
