import { db, auth } from './firebase_connection.js';
import { collection, getDocs, getDoc, doc, updateDoc, deleteDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Stripe setup
const stripe = Stripe('pk_test_51SBIqZHlPFfmTZz4ndONKxKBsrXepmAsUrKOzTHqITxMXcuxCF46cHnXpNBCbq0aSjrulPYCL8DujXhs82YMdKGj00rbhGHNQE');

// Create an instance of Elements
const elements = stripe.elements();

// Create an instance of the card Element and mount it
const cardElement = elements.create('card', {
    style: {
        base: {
            fontSize: '16px',
            color: '#32325d',
            '::placeholder': {
                color: '#aab7c4',
            },
        },
        invalid: {
            color: '#fa755a',
            iconColor: '#fa755a',
        },
    },
});

// Display order total
const orderTotal = document.getElementById('order-total');
let total = 0;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const cartRef = collection(db, "users", user.uid, "cart");
        const cartSnapshot = await getDocs(cartRef);
        total = 0;
        for (const cartDoc of cartSnapshot.docs) {
            const item = cartDoc.data();
            total += item.price * item.quantity;
        }
        if (orderTotal) orderTotal.textContent = total.toFixed(2);
    } else {
        if (orderTotal) orderTotal.textContent = '0.00';
        // Prevent access to checkout if not logged in
        alert("You must log in first to proceed with checkout.");
        window.location.href = "../html files/login.html";
    }
});

// Mount card element if exists
const cardElementDiv = document.getElementById('card-element');
if (cardElementDiv) {
    cardElement.mount('#card-element');
}

// Handle real-time validation errors from the card Element
const cardErrors = document.getElementById('card-errors');
if (cardElement) {
    cardElement.on('change', function(event) {
        if (event.error) {
            if (cardErrors) cardErrors.textContent = event.error.message;
        } else {
            if (cardErrors) cardErrors.textContent = '';
        }
    });
}

// Handle form submission
const form = document.getElementById('payment-form');
const resultMessageDiv = document.getElementById('result-message');
const statusIcon = document.getElementById('status-icon');
const message = document.getElementById('message');
const tokenDisplay = document.getElementById('token-display');

if (form) {
    form.addEventListener('submit', async function(event) {
        event.preventDefault();

        // Prevent multiple submissions
        const button = form.querySelector('button');
        if (button) button.disabled = true;

        const { token, error } = await stripe.createToken(cardElement);

        if (error) {
            // Show error
            if (cardErrors) cardErrors.textContent = error.message;
            if (statusIcon) statusIcon.textContent = '❌';
            if (message) message.textContent = 'Payment Failed';
            if (tokenDisplay) tokenDisplay.textContent = '';
        } else {
            // Token created successfully
            console.log('Token created:', token);

            if (statusIcon) statusIcon.textContent = '✅';
            if (message) message.textContent = 'Payment Token Created Successfully!';
            if (tokenDisplay) tokenDisplay.textContent = `Token ID: ${token.id}`;

            // Process order
            const user = auth.currentUser;
            if (user) {
                try {
                    const cartRef = collection(db, "users", user.uid, "cart");
                    const cartSnapshot = await getDocs(cartRef);
                    const orderItems = [];
                    let orderTotal = 0;
                    for (const cartDoc of cartSnapshot.docs) {
                        const item = cartDoc.data();
                        orderItems.push(item);
                        orderTotal += item.price * item.quantity;
                        // Update product quantity
                        const productRef = doc(db, "products", item.productId);
                        const productSnap = await getDoc(productRef);
                        if (productSnap.exists()) {
                            const currentQuantity = productSnap.data().quantity || 0;
                            await updateDoc(productRef, { quantity: Math.max(0, currentQuantity - item.quantity) });
                        }
                        // Delete cart item
                        await deleteDoc(cartDoc.ref);
                    }
                    // Create order
                    const orderRef = doc(collection(db, "users", user.uid, "orders"));
                    await setDoc(orderRef, {
                        email:user.email,
                        items: orderItems,
                        total: orderTotal,
                        date: new Date(),
                        status: 'completed'
                    });
                    // Clear checkout total and redirect to home
                    localStorage.removeItem('checkoutTotal');
                    setTimeout(() => {
                        window.location.href = '../index.html';
                    }, 2000);
                } catch (error) {
                    console.error('Error processing order:', error);
                    if (message) message.textContent = 'Payment successful, but error processing order.';
                }
            } else {
                if (message) message.textContent = 'User not logged in.';
            }
        }

        // Show the result message and re-enable the button
        if (resultMessageDiv) resultMessageDiv.classList.remove('hidden');
        if (button) button.disabled = false;
    });
}
