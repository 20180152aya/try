import {
  auth, db, createUserWithEmailAndPassword, getDoc, doc, setDoc, onAuthStateChanged, updateDoc,
  signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider,
  sendEmailVerification, sendPasswordResetEmail
}
  from "../scripts file/firebase_connection.js";

let login = document.getElementById('login');
let email = document.getElementById('email');
let password = document.getElementById('password');
const resetBtn = document.getElementById("resetPasswordBtn");
const emailInput = document.getElementById("email");

function showAlert(message, type = "info") {
  const alertBox = document.getElementById("customAlert");
  alertBox.textContent = message;

  alertBox.className = "fixed top-5 left-[35%] px-6 py-3 rounded-lg shadow-lg opacity-100 transform transition-all duration-500 z-50";

  if (type === "success") {
    alertBox.classList.add("bg-black", "text-white", "border-l-4", "border-orange-500");
  } else if (type === "error") {
    alertBox.classList.add("bg-orange-500", "text-black", "border-l-4", "border-white");
  } else {
    alertBox.classList.add("bg-gray-800", "text-white"); // info
  }

  alertBox.style.opacity = "1";
  alertBox.style.transform = "translateY(0)";

  setTimeout(() => {
    alertBox.style.opacity = "0";
    alertBox.style.transform = "translateY(-20px)";
  }, 2000);
}

// ==================================================
// Login
// ==================================================
login.addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.value, password.value);
    const user = userCredential.user;
    const userRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userRef);


      const userData = docSnap.exists()
        ? { ...docSnap.data(), uid: user.uid }
        : { uid: user.uid, email: user.email };
      localStorage.setItem('user', JSON.stringify(userData));

      let firestoreWishlist = docSnap.exists() ? docSnap.data().wishlistItems || [] : [];
      const guestWishlist = JSON.parse(localStorage.getItem("guestWishlist")) || [];
      const mergedWishlist = Array.from(new Set([...firestoreWishlist, ...guestWishlist]));

      await updateDoc(userRef, { wishlistItems: mergedWishlist });

      userData.wishlistItems = mergedWishlist;
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.removeItem("guestWishlist");

      const wishlistCount = document.getElementById('wishlistCount');
      if (wishlistCount) wishlistCount.textContent = mergedWishlist.length;

      document.querySelectorAll('.wishlist-toggle').forEach(el => {
        const productId = el.dataset.productId;
        if (mergedWishlist.includes(productId)) {
          el.classList.add('in-wishlist', 'text-red-500');
          el.classList.remove('text-gray-500');
          el.querySelector('i').className = 'fas fa-heart';
          el.title = 'Remove from wishlist';
        }
      });


      window.location.href = "../index.html";
  
  } catch (error) {
    console.error("Login error:", error);

    if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
      showAlert("Email or password is incorrect.", "error");
    } else if (error.code === "auth/user-not-found") {
      showAlert("No account found with this email.", "error");
    } else {
      showAlert("Login failed: " + error.message, "error");
    }
  }
});

// ==================================================
// Reset Password
// ==================================================
resetBtn.addEventListener("click", async () => {
  const emailVal = emailInput.value.trim();
  if (!emailVal) {
    showAlert("Please enter your email first!", "error");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, emailVal);
    showAlert("Password reset email sent! Check your inbox.", "success");
  } catch (error) {
    console.error("Reset password error:", error);
    if (error.code === "auth/user-not-found") {
      showAlert("This email is not registered.", "error");
    } else {
      showAlert(error.message, "error");
    }
  }
});

// login with google
let google = document.getElementById('google');
google.addEventListener('click', function (event) {
  event.preventDefault();

  const provider = new GoogleAuthProvider();

  signInWithPopup(auth, provider)
    .then(async (result) => {
      const user = result.user;

      // Firestore reference
      const userRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userRef);

      let userData;

      if (docSnap.exists()) {
        userData = {
          ...docSnap.data(),
          Name: user.displayName || docSnap.data().Name,
          Email: user.email,
          Photo: user.photoURL || docSnap.data().Photo
        };

        await setDoc(userRef, userData, { merge: true });
      } else {
        userData = {
          id: user.uid,
          Name: user.displayName || "No Name",
          Username: user.displayName || user.email.split("@")[0],
          Address: "No address added",
          City: "No city added",
          Zip: "No zip added",
          Phone: user.phoneNumber || "No phone",
          Email: user.email,
          role: "user",
          Photo: user.photoURL || "./profile.webp",
          emailVerified: user.emailVerified || false,
          wishlistItems: []
        };

        await setDoc(userRef, userData);

        if (!user.emailVerified) {
          await sendEmailVerification(auth.currentUser);
        }
      }
      let firestoreWishlist = userData.wishlistItems || [];
      const guestWishlist = JSON.parse(localStorage.getItem("guestWishlist")) || [];
      const mergedWishlist = Array.from(new Set([...firestoreWishlist, ...guestWishlist]));

      await updateDoc(userRef, { wishlistItems: mergedWishlist });

      userData.wishlistItems = mergedWishlist;
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.removeItem("guestWishlist");
      const wishlistCount = document.getElementById('wishlistCount');
      if (wishlistCount) wishlistCount.textContent = mergedWishlist.length;

      document.querySelectorAll('.wishlist-toggle').forEach(el => {
        const productId = el.dataset.productId;
        if (mergedWishlist.includes(productId)) {
          el.classList.add('in-wishlist', 'text-red-500');
          el.classList.remove('text-gray-500');
          el.querySelector('i').className = 'fas fa-heart';
          el.title = 'Remove from wishlist';
        }
      });

      window.location.href = "../index.html";
    })
    .catch((error) => {
      console.error("Google login error:", error);
      alert("Google login failed: " + error.message);
    });
});

