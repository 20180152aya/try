import {
  doc, updateDoc, db, collection, getDoc, getDocs, getFirestore, onAuthStateChanged
  , auth, sendEmailVerification, EmailAuthProvider, query, where, fetchSignInMethodsForEmail,
  reauthenticateWithCredential, updateEmail, getAuth
} from "./firebase_connection.js";
import {
  validCity, validPhone, validEmail, validZip, validateAddress,
  validateName, validateUsername
} from "./signup.js";


// ====================== User Data ======================
// ====================== User Data ======================
let userData = JSON.parse(localStorage.getItem("user")) || {};
if (!userData.id && auth?.currentUser) {
  userData.id = auth.currentUser.uid;
} 

// upload photo to cloudinary
async function uploadToCloudinary(file) {
  const cloudName = "dwx6an6yh";
  const uploadPreset = "unsigned_preset";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();
  return data.secure_url;
}

function readData() {
  const editName = document.getElementById("editName");
  const editUsername = document.getElementById("editUsername");
  const editPhone = document.getElementById("editPhone");
  const editCity = document.getElementById("editCity");
  const editEmail = document.getElementById("editEmail");
  const editAddress = document.getElementById("editAddress");
  const editZip = document.getElementById("editZip");

  userData = JSON.parse(localStorage.getItem("user")) || {};

  if (!userData) return;

  if (editName) editName.value = userData.Name || "";
  if (editUsername) editUsername.value = userData.Username || "";
  if (editPhone) editPhone.value = userData.Phone || "";
  if (editCity) editCity.value = userData.City || "";
  if (editEmail) editEmail.value = userData.Email || "";
  if (editAddress) editAddress.value = userData.Address || "";
  if (editZip) editZip.value = userData.Zip || "";

  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profileImage = document.getElementById("profileImage");

  if (profileName) profileName.textContent = userData.Name || "No name";
  if (profileEmail) profileEmail.textContent = userData.Email || "No email";
  if (profileImage) profileImage.src = userData.Photo || "default.png";
}

window.addEventListener("DOMContentLoaded", () => {
  readData();
});

let confirmPasswordCallback = null;

function openPasswordModal(callback) {
  confirmPasswordCallback = callback;
  const modal = document.getElementById("passwordModal");
  if (!modal) return;
  modal.classList.remove("hidden");
  modal.classList.add("flex");
}

function closePasswordModal() {
  const modal = document.getElementById("passwordModal");
  if (!modal) return;
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  const input = document.getElementById("modalPassword");
  if (input) input.value = "";
}

document.getElementById("cancelPasswordBtn")?.addEventListener("click", closePasswordModal);

document.getElementById("confirmPasswordBtn")?.addEventListener("click", () => {
  const password = document.getElementById("modalPassword")?.value.trim();
  if (confirmPasswordCallback && password) {
    confirmPasswordCallback(password);
  }
  closePasswordModal();
});

//  Update Profile 
async function updateProfile(e) {
  e.preventDefault();

  const editName = document.getElementById("editName");
  const editUsername = document.getElementById("editUsername");
  const editPhone = document.getElementById("editPhone");
  const editCity = document.getElementById("editCity");
  const editEmail = document.getElementById("editEmail");
  const editAddress = document.getElementById("editAddress");
  const editZip = document.getElementById("editZip");
  const uploadPhoto = document.getElementById("uploadPhoto");

  let valid = [
    validateName(editName),
    validateUsername(editUsername),
    validPhone(editPhone),
    validateAddress(editAddress),
    validCity(editCity),
    validZip(editZip)
  ].every(v => v);

  if (!valid) return;

  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) {
    console.error("⚠️ No user is currently signed in.");
    return;
  }

  if (!userData.id) userData.id = currentUser.uid;
  const userRef = doc(db, "users", userData.id);

  try {
    // لو رفع صورة جديدة
    if (uploadPhoto && uploadPhoto.files[0]) {
      const photoURL = await uploadToCloudinary(uploadPhoto.files[0]);
      userData.Photo = photoURL;
    }

    const updateData = {
      Name: editName.value,
      Username: editUsername.value,
      Phone: editPhone.value,
      City: editCity.value,
      Address: editAddress.value,
      Zip: editZip.value,
      Photo: userData.Photo,
      Email: userData.Email,
      emailVerified: userData.emailVerified
    };

    await updateDoc(userRef, updateData);

    if (currentUser.email !== editEmail.value) {
      const methods = await fetchSignInMethodsForEmail(auth, editEmail.value);
      if (methods.length === 0) {
        openPasswordModal(async (password) => {
          try {
            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await reauthenticateWithCredential(currentUser, credential);
            await updateEmail(currentUser, editEmail.value);
            await sendEmailVerification(currentUser);
            await updateDoc(userRef, {
              Email: editEmail.value,
              emailVerified: false
            });
            userData = {
              ...userData,
              ...updateData,
              Email: editEmail.value,
              emailVerified: false
            };
            localStorage.setItem("user", JSON.stringify(userData));

            showAlert("Profile updated successfully! Check your email for verification.", true);
            readData();
            document.getElementById("editForm").classList.add("hidden");

          } catch (err) {
            console.error("Error updating email:", err);
            showAlert(err.message, false);
          }
        });
      } else {
        throw new Error("Email already in use");
      }
    } else {
      userData = { ...userData, ...updateData };
      localStorage.setItem("user", JSON.stringify(userData));
      showAlert("Profile updated successfully!", true);
      readData();
      document.getElementById("editForm").classList.add("hidden");
    }

  } catch (err) {
    console.error(err);
    showAlert(err.message, false);
  }
}

// ====================== Alert Box ======================
function showAlert(message, success = true) {
  const alertBox = document.getElementById("alertBox");
  if (!alertBox) return;

  alertBox.textContent = message;
  alertBox.className = success
    ? "bg-orange-600  text-white px-4 py-3 rounded  mb-4 fixed top-5 left-[35%] z-10 w-[40%]"
    : "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4";

  alertBox.classList.remove("opacity-0", "scale-90");
  setTimeout(() => alertBox.classList.add("opacity-0", "scale-90"), 5000);
}

// ====================== Bind Form ======================
window.addEventListener("DOMContentLoaded", () => {
  const editForm = document.getElementById("editForm");
  const editBtn = document.getElementById("editBtn");

  if (editBtn && editForm) {
    editBtn.addEventListener("click", (e) => {
      e.preventDefault();
      editForm.classList.toggle("hidden");

      if (!editForm.classList.contains("hidden") && userData) {
        document.getElementById("editName").value = userData.Name || "";
        document.getElementById("editUsername").value = userData.Username || "";
        document.getElementById("editEmail").value = userData.Email || "";
        document.getElementById("editPhone").value = userData.Phone || "";
        document.getElementById("editCity").value = userData.City || "";
        document.getElementById("editAddress").value = userData.Address || "";
        document.getElementById("editZip").value = userData.Zip || "";
      }
    });
  }

  if (editForm) {
    editForm.addEventListener("submit", updateProfile);
  }
});

// ====================== Render Favorites ======================
async function renderFavorites() {
  const userWish = userData.wishlistItems || [];
  const container = document.getElementById('favoritesContainer');
  if (!container) return;

  container.innerHTML = '';

  if (!userWish.length) {
    container.innerHTML = '<p>Sorry you have not favourite products</p>';
    return;
  }

  try {
    const promises = userWish.map(id => getDoc(doc(db, 'products', id)));
    const snaps = await Promise.all(promises);

    snaps.forEach((snap) => {
      if (snap.exists()) {
        const product = snap.data();
        const idFromLoop = snap.id;

        const card = document.createElement('div');
        card.className = "bg-red-100 shadow-md rounded-2xl p-2 flex flex-col items-center transition hover:shadow-lg";

        card.innerHTML = `
          <img src="${product.image}" alt="${product.name}" class="w-full h-40 object-contain mb-3 rounded-md">
          <h3 class="text-lg font-semibold text-gray-800 mt-4 mb-1 text-center truncate w-full">${product.name}</h3>
          <p class="text-gray-600 font-bold mb-3">${product.price} $</p>
          <button class="delete bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition">
            <i class="fas fa-heart-broken"></i> Delete
          </button>
        `;

        container.append(card);

        const removeBtn = card.querySelector('.delete');
        removeBtn.addEventListener('click', async () => {
          try {
            let newWishlist = userWish.filter(id => id !== idFromLoop);
            await updateDoc(doc(db, "users", userData.id), {
              wishlistItems: newWishlist
            });

            userData.wishlistItems = newWishlist;
            localStorage.setItem("user", JSON.stringify(userData));

            card.remove();
            showAlert(`You Deleted ${product.name} from your favourite`, true);

          } catch (err) {
            console.error("Error removing from wishlist:", err);
          }
        });
      }
    });
  } catch (err) {
    console.error('Error rendering favorites:', err);
  }
}

renderFavorites();

const emailVerified = document.getElementById('emailVerified');
const closeEmailVerified = document.getElementById('closeEmailVerified');
const Resend = document.getElementById('Resend');
 
let currentUser = null;

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    console.log("User loaded:", currentUser);

    if (!user.emailVerified) {
      emailVerified.classList.remove("opacity-0", "scale-90");
      emailVerified.classList.add("opacity-100", "scale-100");
    }
  } else {
    console.log("No user signed in");
  }
});

closeEmailVerified.addEventListener('click', () => {
  emailVerified.classList.add("opacity-0", "scale-90");
  emailVerified.classList.remove("opacity-100", "scale-100");
});

Resend.addEventListener('click', async (e) => {
  e.preventDefault();
  if (currentUser) {
    console.log("From button:", currentUser);
    await sendEmailVerification(currentUser);

    const message = document.createElement('div');
    message.className = `z-[200] fixed left-1/2 -translate-x-1/2 top-5 w-[auto] max-w-[300px] text-center 
                         bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg 
                         opacity-0 scale-90 transform transition-all duration-500 ease-out`;
    message.innerText = 'Verification email sent!';

    document.body.appendChild(message);

    setTimeout(() => {
      message.classList.remove("opacity-0", "scale-90");
      message.classList.add("opacity-100", "scale-100");
    }, 50);

    setTimeout(() => {
      message.classList.remove("opacity-100", "scale-100");
      message.classList.add("opacity-0", "scale-90");
      setTimeout(() => message.remove(), 500); 
    }, 2000);

    emailVerified.classList.add("opacity-0", "scale-90");
    emailVerified.classList.remove("opacity-100", "scale-100");
  } else {
    console.log("User is still null");
  }
});
