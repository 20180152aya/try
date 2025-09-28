import { auth, db, createUserWithEmailAndPassword, doc, setDoc , sendEmailVerification}
    from "../scripts file/firebase_connection.js";


// Cloudinary configuration
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

// -----------------------------------------------

// Get form + inputs
let form = document.getElementById("register");
let signup = document.getElementById('signup')
let name = document.getElementById('name');
let username = document.getElementById('username');
let email = document.getElementById('email');
let password = document.getElementById('password');
let confirmPassword = document.getElementById('confirmPassword');
let address = document.getElementById('address');
let city = document.getElementById('city');
let zip = document.getElementById('zip');
let Phone = document.getElementById('phone')
let photo = document.getElementById('photo')



if (name) name.addEventListener('input', () => validateName(name));
if (username) username.addEventListener('input', () => validateUsername(username));
if (email) email.addEventListener('input', () => validEmail(email));
if (Phone) Phone.addEventListener('input', () => validPhone(Phone));
if (password) password.addEventListener('input', () => validatePassword(password));
if (confirmPassword) confirmPassword.addEventListener('input', () => validateConfirmPassword(password, confirmPassword));
if (address) address.addEventListener('input', () => validateAddress(address));
if (city) city.addEventListener('input', () => validCity(city));
if (zip) zip.addEventListener('input', () => validZip(zip));

// Function Validation

function validateName(input) {
    let error = document.getElementById('nameError');

    if (input.value.trim() === "" || input.value.length < 3) {
        error.classList.add('text-red-500');
        error.textContent = "Please enter a valid name (at least 3 characters)";
        return false;
    } else {

        error.textContent = "";
        return true;
    }
}

function validateUsername(input) {
    const pattern = /^[a-zA-Z0-9_ ]+$/;
    let error = document.getElementById('usernameError');
    if (!pattern.test(input.value.trim()) || input.value.length < 4) {
        error.classList.add('text-red-500');
        error.textContent = "Username must be at least 4 chars (letters, numbers, underscore only)";
        return false;
    }
    error.textContent = "";
    return true;
}

function validEmail(input) {
    const pattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    let error = document.getElementById('emailError');

    if (!pattern.test(input.value.trim())) {
        error.classList.add('text-red-500');
        error.textContent = "Please enter valid email";
        return false;
    }

    error.textContent = "";
    return true;
}

function validPhone(input) {
    const pattern = /^(010|015|011|010|012)[0-9]{8}$/;
    let error = document.getElementById('phoneError');

    if (!pattern.test(input.value.trim())) {
        error.classList.add('text-red-500');
        error.textContent = "Please enter valid phone ";
        return false;
    }

    error.textContent = "";
    return true;
}

function validatePassword(input) {
    const passwordpattern = /^[A-Za-z0-9]{4,12}$/;
    let error = document.getElementById('passwordError');
    if (input.value.length < 8 || !passwordpattern.test(input.value)) {
        error.classList.add('text-red-500');
        error.textContent = "Password must be at least 8 characters";
        return false;
    }
    error.textContent = "";
    return true;
}

function validateConfirmPassword(pass, confirm) {
    let error = document.getElementById('confirmError')
    if (confirm.value !== pass.value || !confirm.value) {
        error.classList.add('text-red-500')
        error.textContent = "Passwords do not match"
        return false
    }
    error.textContent = ""
    return true;
}

function validateAddress(input) {
    const addressPattern = /^[a-zA-Z0-9\u0600-\u06FF\s.,'’/#-]+$/;
    let error = document.getElementById('addressError');

    if (input.value.trim() === "" || !addressPattern.test(input.value.trim())) {
        error.classList.add('text-red-500');
        error.textContent = "Please enter a valid address";
        return false;
    }

    error.textContent = "";
    return true;
}

function validCity(input) {
    const pattern = /^[a-zA-Z\u0600-\u06FF\s'-]+$/;
    let error = document.getElementById('cityError');

    if (input.value.trim() === "" || !pattern.test(input.value.trim())) {
        error.classList.add('text-red-500');
        error.textContent = "Please enter a valid city name";
        return false;
    }

    error.textContent = "";
    return true;
}


function validZip(input) {
    const pattern = /^[0-9]{4,6}$/;
    let error = document.getElementById('zipError');

    if (input.value.trim() === "" || !pattern.test(input.value.trim())) {
        error.classList.add('text-red-500');
        error.textContent = "Please enter a valid ZIP code";
        return false;
    }

    error.textContent = "";
    return true;
}

// end valiation function
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        let isValid = true;

        const validators = [
            () => validateName(name),
            () => validateUsername(username),
            () => validEmail(email),
            () => validPhone(Phone),
            () => validatePassword(password),
            () => validateConfirmPassword(password, confirmPassword),
            () => validateAddress(address),
            () => validCity(city),
            () => validZip(zip),
        ];

        validators.forEach(fn => {
            if (!fn()) isValid = false;
        });

        if (isValid) {
            try {
                let photo = document.getElementById("photo").files[0];
                let photoURL = 'https://res.cloudinary.com/dwx6an6yh/image/upload/v1758135294/profile_ahsawd.webp';

                const userCredential = await createUserWithEmailAndPassword(auth, email.value, password.value);
                const user = userCredential.user;

                if (photo) {
                    photoURL = await uploadToCloudinary(photo);
                }

                await setDoc(doc(db, "users", user.uid), {
                    Name: name.value,
                    Username: username.value,
                    Address: address.value,
                    City: city.value,
                    Zip: zip.value,
                    Phone: Phone.value,
                    Email: email.value,
                    role: "user",
                    Photo: photoURL,
                    id: user.uid,
                    emailVerified: false,
                    wishlistItems: []
                });

                // ==== Send Email Verification ====
                await sendEmailVerification(user);

                // ==== Show success message ====
                const alertBox = document.getElementById('alertBox');
                alertBox.textContent = "Account created! Please check your email to verify your account.";
                alertBox.style.backgroundColor = "orange"; // green
                alertBox.style.color = "white";
                alertBox.classList.remove('opacity-0', 'scale-90');

                setTimeout(() => {
                    alertBox.classList.add('opacity-0', 'scale-90');
                    window.location.href = "../html files/login.html"; // redirect to login
                }, 2000);

            } catch (error) {
                const alertBox = document.getElementById('alertBox');

                if (error.code === "auth/email-already-in-use") {
                    alertBox.textContent = "This email is already registered. Please login.";
                } else {
                    alertBox.textContent = "Error: " + error.message;
                }
                alertBox.style.backgroundColor = "#f44336"; // red
                alertBox.style.color = "white";
                alertBox.classList.remove('opacity-0', 'scale-90');

                setTimeout(() => alertBox.classList.add('opacity-0', 'scale-90'), 3000);
            }
        }
    });
}


export { validateName, validateUsername, validEmail, validPhone, validateAddress, validCity, validZip };

