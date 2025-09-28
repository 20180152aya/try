// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {getAuth,
  verifyPasswordResetCode,
   signOut,confirmPasswordReset,
   sendEmailVerification, 
  sendPasswordResetEmail,
  onAuthStateChanged,
  createUserWithEmailAndPassword , 
  signInWithEmailAndPassword,
  signInWithPopup, 
  GoogleAuthProvider,
  FacebookAuthProvider,
  EmailAuthProvider,updateEmail,
  reauthenticateWithCredential,
  fetchSignInMethodsForEmail
} 
  from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { 
  getFirestore,
  updateDoc, 
  doc, 
  addDoc,
  setDoc, 
  getDocs, 
  getDoc, 
  collection, 
  query, 
  limit , 
  where,
  serverTimestamp,
  orderBy, onSnapshot
}
  from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCNqJD5GE-_-BQPTkK21V5EJq4Q3owIW_k",
  authDomain: "e-commerce-fb245.firebaseapp.com",
  projectId: "e-commerce-fb245",
  storageBucket: "e-commerce-fb245.firebasestorage.app",
  messagingSenderId: "874144848274",
  appId: "1:874144848274:web:01cd38fe55230ea98d894b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app)

//   end firebase-------------------------------------------------------


export {
  auth, db, getDocs, getDoc, updateDoc, createUserWithEmailAndPassword, doc, setDoc, collection,reauthenticateWithCredential,
  signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider,getAuth, updateEmail,
  getFirestore, app, query, limit,onAuthStateChanged,sendEmailVerification,
  sendPasswordResetEmail, EmailAuthProvider,where, fetchSignInMethodsForEmail,signOut,
  serverTimestamp,onSnapshot,orderBy,addDoc
};



