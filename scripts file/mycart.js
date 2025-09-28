import { db, auth, signOut } from './firebase_connection.js';
import { collection, getDocs, doc, deleteDoc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


let cart = [];
let userId = null;
let tbody, subtotalElem, totalElem

document.addEventListener("DOMContentLoaded", () => {
  tbody = document.querySelector(".table-cart-body");
  subtotalElem = document.getElementById("all-subtotal-mycart");
  totalElem = document.querySelector(".total-mycart");


  if (!tbody) {
    console.error("table-cart-body not found in DOM.");
    return;
  }

  // ✅
  onAuthStateChanged(auth, (user) => {
    if (user) {
      userId = user.uid;
      fetchCart(user);
    } else {
      // 
      userId = null;
      cart = [];
      tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500">Please log in to view your cart.</td></tr>`;
      if (subtotalElem) subtotalElem.textContent = `$0.00`;
      if (totalElem) totalElem.textContent = `$0.00`;
    }
  });
});

// fetch cart
async function fetchCart(user) {
  if (!user) return;
  const cartRef = collection(db, "users", user.uid, "cart");
  const querySnapshot = await getDocs(cartRef);
  cart = querySnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  renderCart();

}


function renderCart() {
  tbody.innerHTML = "";

  if (!cart || cart.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="py-4 text-center text-gray-500">Your cart is empty.</td></tr>`;
    updateTotalsDisplay();
    return;
  }

  cart.forEach((item) => {
    const tr = document.createElement("tr");
    tr.className = "border-b border-gray-200";

    tr.innerHTML = `
      <td class="py-4 px-2 w-24">
        <img src="${item.image || ''}" alt="${item.name || ''}" class="w-20 h-20 object-cover rounded">
      </td>
      <td class="py-4 px-2">
        <div class="font-semibold text-gray-800">${item.name || ''}</div>
        <div class="text-sm text-gray-500">${item.category || ''}</div>
        <div class="text-sm text-gray-600 mt-1">$${(item.price || 0).toFixed(2)}</div>
        <button class="remove-btn mt-2 text-red-600 hover:text-red-800" data-id="${item.id}">Remove</button>
      </td>
      <td class="py-4 px-2 text-center">
        <input type="number" min="1" value="${item.quantity || 1}" 
          class="qty-input w-16 border border-gray-300 rounded px-2 py-1 text-center" data-id="${item.id}">
      </td>
      <td class="py-4 px-2 text-center font-semibold subtotal-cell">
        $${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
      </td>
    `;

    tbody.appendChild(tr);

  });



  updateTotalsDisplay();



  appendCouponRow();


  tbody.querySelectorAll(".qty-input").forEach(input => {
    input.addEventListener("change", onQtyChange);
    input.addEventListener("input", onQtyInput); //
  });
  tbody.querySelectorAll(".remove-btn").forEach(btn => {
    btn.addEventListener("click", onRemove);
  });



  function appendCouponRow() {

    const existing = tbody.querySelector(".coupon-row");
    if (existing) existing.remove();

    const couponRow = document.createElement("tr");
    couponRow.className = "coupon-row";
    couponRow.innerHTML = `
 
      <td>
        <div class="mt-5">
          <form id="update-cart">
            <button type="submit" class="update-mycart bg-amber-700 px-6 py-3 rounded-lg text-white ml-5 hover:bg-amber-800 duration-300">Update</button>
          </form>
        </div>
      </td>
    `;
    tbody.appendChild(couponRow);
  }

  const updateCartForm = document.getElementById("update-cart");
  if (updateCartForm) {
    updateCartForm.removeEventListener("submit", onUpdateCart);
    updateCartForm.addEventListener("submit", onUpdateCart);
  }

  updateTotalsDisplay();


  function onQtyInput(e) {
    // 
    const idx = Number(e.target.dataset.index);
    let v = parseInt(e.target.value, 10);
    if (isNaN(v) || v < 1) v = 1;

    const subtotalCell = e.target.closest("tr").querySelector(".subtotal-cell");
    const price = cart[idx]?.price || 0;
    if (subtotalCell) subtotalCell.textContent = `$${(price * v).toFixed(2)}`;
  }
  function onQtyChange(e) {
    const idx = Number(e.target.dataset.index);
    let v = parseInt(e.target.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    e.target.value = v;
    if (cart[idx]) {
      cart[idx].quantity = v;
      saveCart();
      updateTotalsDisplay();
    }
  }

  function onRemove(e) {
    const idx = Number(e.target.dataset.index);
    if (isNaN(idx)) return;
    cart.splice(idx, 1);
    saveCart();
    renderCart();
  }


  async function onUpdateCart(e) {
    e.preventDefault();

    if (!userId || user.emailVerified === false) {
      alert("You must log in first.");
      return;
    }

    const inputs = tbody.querySelectorAll(".qty-input");

    for (const input of inputs) {
      const id = input.dataset.id;
      let newQty = Math.max(1, parseInt(input.value, 10) || 1);
      const cartRef = doc(db, "users", userId, "cart", id);
      const cartSnap = await getDoc(cartRef);

      if (!cartSnap.exists()) continue;

      const cartData = cartSnap.data();
      const productId = cartData.productId;

      const productRef = doc(db, "products", productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) continue;

      const available = productSnap.data().quantity || 0;

      if (newQty > available) {
        alert(`This quantity is not available, max quantity is ${available}.`);
        input.value = available; 
        newQty = available;
      }


      await updateDoc(cartRef, { quantity: newQty });
      const item = cart.find(i => i.id === id);
      if (item) item.quantity = newQty;
    }

    alert("Cart updated successfully!");
    renderCart();
  }


  tbody.querySelectorAll(".remove-btn").forEach(btn => btn.addEventListener("click", onRemove));
  tbody.querySelectorAll(".qty-input").forEach(input => input.addEventListener("change", onQtyChange));


  function updateTotalsDisplay() {
    const subtotal = cart.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);
    if (subtotalElem) subtotalElem.textContent = `$${subtotal.toFixed(2)}`;
    if (totalElem) totalElem.textContent = `$${subtotal.toFixed(2)}`;
  }

  async function onRemove(e) {
    const id = e.target.dataset.id;
    if (!id || !userId) return;
    await deleteDoc(doc(db, "users", userId, "cart", id));
    cart = cart.filter(item => item.id !== id);
    renderCart();
  }
  let checkoutBtn = document.getElementById("checkout-btn")
  console.log(checkoutBtn);

 if (checkoutBtn) {
  checkoutBtn.addEventListener("click", () => {
    if (totalElem) {
      const total = totalElem.textContent.replace("$", "").trim();
      localStorage.setItem("checkoutTotal", total);
    }

    onAuthStateChanged(auth, (user) => {
      if (!user) {
        alert("You must log in first to proceed with checkout.");
        window.location.href = "login.html";
        return;
      }

      if (user.emailVerified === false) {
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

        // Close overlay
        closeEmailVerified.addEventListener('click', () => {
          emailVerified.classList.add("opacity-0", "scale-90");
          emailVerified.classList.remove("opacity-100", "scale-100");
        });

        // Resend email
        Resend.addEventListener('click', async (e) => {
          e.preventDefault();
          if (currentUser) {
            console.log("From button:", currentUser);
            await sendEmailVerification(currentUser);

            // Create persistent message
            const message = document.createElement('div');
            message.className = `z-[200] fixed left-1/2 -translate-x-1/2 top-5 w-[auto] max-w-[300px] text-center 
             bg-orange-600 text-white px-4 py-2 rounded-lg shadow-lg 
             opacity-0 scale-90 transform transition-all duration-500 ease-out flex justify-between items-center`;
            message.innerHTML = `Verification email sent! <button id="closeMsg" class="ml-2 bg-white text-black px-2 rounded">Close</button>`;

            document.body.appendChild(message);

            setTimeout(() => {
              message.classList.remove("opacity-0", "scale-90");
              message.classList.add("opacity-100", "scale-100");
            }, 50);

            // Close button for message
            const closeMsg = document.getElementById('closeMsg');
            closeMsg.addEventListener('click', () => {
              message.classList.remove("opacity-100", "scale-100");
              message.classList.add("opacity-0", "scale-90");
              setTimeout(() => message.remove(), 500);
            });
          } else {
            console.log("User is still null");
          }
        });
        return;
      }
      window.location.href = "../html files/payment.html";
    });
  });
}


}


