import { db, signOut,collection, getDocs, getDoc,
   query, limit , doc,auth ,updateDoc,sendEmailVerification,onAuthStateChanged,addDoc,serverTimestamp
  ,orderBy,onSnapshot} from "./firebase_connection.js";

async function renderHeaderProducts() {

  const container = document.getElementById("headerProductsContainer");
  if (container) {
    container.innerHTML = "";
    try {

      const q = query(collection(db, "products"), limit(8));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach(doc => {
        const product = { id: doc.id, ...doc.data() };

        const card = document.createElement("div");
        card.className =
          "bg-white shadow-lg rounded-2xl p-4 flex flex-col items-center transition transform hover:scale-90 hover:shadow-2xl duration-300";

        card.innerHTML = `
        <div class="relative w-full h-48 flex items-center justify-center bg-gray-50 rounded-xl overflow-hidden">
          <img src="${product.image}" alt="${product.name}" class="max-h-full max-w-full object-contain transition duration-300 hover:scale-110">
        </div>
        <h3 class="text-lg font-semibold text-gray-800 mt-4 mb-1 text-center truncate w-full">${product.name}</h3>
        <p class="text-orange-600 font-bold mb-3 text-lg">${product.price} $</p>
      `;

        container.appendChild(card);
      });
    } catch (err) {
      console.error("Error fetching header products:", err);
    }
  }
}

async function updateCartCount() {
  const user = auth.currentUser;
  if (user) {
    try {
      const userCartRef = collection(db, "users", user.uid, "cart");
      const querySnapshot = await getDocs(userCartRef);
      let totalItems = 0;
      querySnapshot.forEach(doc => {
        totalItems += doc.data().quantity || 0;
      });
      const cartCount = document.getElementById("cartCount");
      const cartCountMobile = document.getElementById("cartCountMobile");
      if (cartCount) cartCount.textContent = totalItems;
      if (cartCountMobile) cartCountMobile.textContent = totalItems;
    } catch (error) {
      console.error("Error updating cart count:", error);
    }
  } else {
    const cartCount = document.getElementById("cartCount");
    const cartCountMobile = document.getElementById("cartCountMobile");
    if (cartCount) cartCount.textContent = "0";
    if (cartCountMobile) cartCountMobile.textContent = "0";
  }
}

window.updateCartCount = updateCartCount;
async function autoCheckEmailVerified() {
  const user = auth.currentUser;
  if (user && !user.emailVerified) {
    await user.reload();
    if (user.emailVerified) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { emailVerified: true });

      const localRaw = localStorage.getItem("user");
      if (localRaw) {
        const localUser = JSON.parse(localRaw);
        localUser.emailVerified = true;
        localStorage.setItem("user", JSON.stringify(localUser));
      }
    }
  }
}

setInterval(autoCheckEmailVerified, 5000);
onAuthStateChanged(auth, async (user) => {
  if (user) {
    await user.reload(); // تحديث حالة المستخدم
    if (user.emailVerified) {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { emailVerified: true });

      // تحديث localStorage أيضًا
      const localRaw = localStorage.getItem("user");
      if (localRaw) {
        const localUser = JSON.parse(localRaw);
        localUser.emailVerified = true;
        localStorage.setItem("user", JSON.stringify(localUser));
      }
    }
    // Update cart count when user signs in
    await updateCartCount();
  } else {
    // Set cart count to 0 when user signs out
    const cartCount = document.getElementById("cartCount");
    const cartCountMobile = document.getElementById("cartCountMobile");
    if (cartCount) cartCount.textContent = "0";
    if (cartCountMobile) cartCountMobile.textContent = "0";
  }
});
window.addEventListener("DOMContentLoaded",async () => {
  renderHeaderProducts();

  const accountLink = document.getElementById("account");
  const account_mobile = document.getElementById("account_mobile");
  const logout = document.getElementById("logout");
  const logout_mobile = document.getElementById("logout_mobile");
  const account_content = document.getElementById("account_content");
  const wishlistCount = document.getElementById("wishlistCount");
  const raw = localStorage.getItem("user");
  // 
  const gustlist = localStorage.getItem('guestWishlist');

  let wishlen = 0;
  if (raw) {
    const userData = JSON.parse(raw);
    wishlen = userData.wishlistItems ? userData.wishlistItems.length : 0;
    if (wishlistCount) wishlistCount.textContent = `(${wishlen})`;
    const name = userData.Username || userData.Email || "Account";
    if (accountLink) {
      accountLink.textContent = `Hello, ${name}`;
      accountLink.href = "/public/html files/profile.html";
    }
    if (account_content) account_content.classList.remove("hidden");
    if (account_mobile) {
      account_mobile.innerHTML = `<img src='${userData.Photo}' height='50px' width='50px' style='border:1px solid white; border-radius:50%;padding:5px'>`;
      account_mobile.href = "/public/html files/profile.html";
    }
    await updateCartCount();
  } else {
    const gust = JSON.parse(gustlist || '[]');
    if (wishlistCount) wishlistCount.textContent = gust.length;
    if (accountLink) {
      accountLink.textContent = "Account";
      accountLink.href = "../html files/login.html";
    }
    if (account_mobile) account_mobile.href = "../html files/login.html";
    if (account_content) account_content.classList.add("hidden");
    await updateCartCount();
  }

  // ==== Logout ====

const handleLogout = async () => {
  try {

    await signOut(auth);


    localStorage.removeItem("user");

    const guestWishlist = JSON.parse(localStorage.getItem("guestWishlist") || '[]');
    if (wishlistCount) wishlistCount.textContent = guestWishlist.length ? `(${guestWishlist.length})` : `(0)`;

    if (account_content) account_content.classList.add("hidden");

    if (accountLink) {
      accountLink.textContent = "Account";
      accountLink.href = "../html files/login.html";
    }

    setTimeout(() => window.location.href = "../index.html", 50);
  } catch (error) {
    console.error("Error signing out:", error);
  }
};

if (logout) logout.addEventListener("click", handleLogout);
if (logout_mobile) logout_mobile.addEventListener("click", handleLogout);

console.log(auth.currentUser); 

  const first = document.getElementById("products");
  const sec = document.getElementById("experience");
  if (first && sec) {
    let count = 0;
    let interval = setInterval(() => {
      if (count >= 200) {
        clearInterval(interval);
      } else {
        count += 5;
        first.textContent = count;
        sec.textContent = Math.floor(count / 10);
      }
    }, 100);
  }

  // ✅ Menu bar
  const menu = document.getElementById("menu");
  const close_menu = document.getElementById("close_menu");
  const meanu_drop = document.getElementById("meanu_drop");
  const header = document.getElementById("header");

  if (menu && meanu_drop && header) {
    menu.addEventListener("click", () => {
      header.style.backgroundColor = "gray";
      meanu_drop.classList.remove("translate-x-full");
      meanu_drop.classList.add("translate-x-0");
    });
  }

  if (close_menu && meanu_drop && header) {
    close_menu.addEventListener("click", (e) => {
      e.preventDefault();
      meanu_drop.classList.remove("translate-x-0");
      meanu_drop.classList.add("translate-x-full");
      header.style.backgroundColor = "black";
    });
  }

  const bottomBar = document.getElementById("bottom_bar");
  let lastScroll = 0;
  if (bottomBar) {
    window.addEventListener("scroll", () => {
      const currentScroll = window.pageYOffset;
      if (currentScroll > lastScroll) {
        bottomBar.classList.add("translate-y-full");
        bottomBar.classList.remove("translate-y-0");
      } else {
        bottomBar.classList.add("translate-y-0");
        bottomBar.classList.remove("translate-y-full");
      }
      lastScroll = currentScroll;
    });
  }

  const alertBox = document.getElementById("alertBox");
  const wishlist = document.getElementById("wishlist");
  const love = document.getElementById("love");

const handleAuthRedirect = () => {
  const alertBox = document.getElementById("alertBox");
  if (alertBox) {
    alertBox.classList.remove("opacity-0", "scale-90");
    alertBox.classList.add("opacity-100", "scale-100");
    setTimeout(() => {
      alertBox.classList.remove("opacity-100", "scale-100");
      alertBox.classList.add("opacity-0", "scale-90");
    }, 1000);
  }
};

[wishlist, love].forEach((btn) => {
  if (btn) {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const raw = localStorage.getItem("user");
      if (!raw) {
        handleAuthRedirect();
        return;
      }
      window.location.href = "../html files/profile.html";
    });
  }
});


  const searchInput = document.getElementById("searchInput");
  const productsContainer = document.getElementById("headerProductsContainer");

  if (searchInput && productsContainer) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();
      const productCards = productsContainer.querySelectorAll(".bg-white");
      let anyVisible = false;

      productCards.forEach((card) => {
        const name = card.querySelector("h3")?.textContent.toLowerCase() || "";
        if (name.includes(query)) {
          card.style.display = "flex";
          anyVisible = true;
        } else {
          card.style.display = "none";
        }
      });

      const noProductsMsg = productsContainer.querySelector("p.text-center");
      if (!anyVisible) {
        if (!noProductsMsg) {
          const msg = document.createElement("p");
          msg.className = "text-center col-span-full text-gray-500";
          msg.textContent = "No products found";
          productsContainer.appendChild(msg);
        }
      } else if (noProductsMsg) {
        noProductsMsg.remove();
      }
    });
  }

  const img = document.getElementById("scroll-img");
  if (img) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          img.classList.remove("opacity-0", "translate-y-10");
          img.classList.add("opacity-100", "translate-y-0");
        }
      });
    });
    observer.observe(img);
  }
});

async function getProducts() {
  const productsCol = collection(db, "products");
  const productsSnapshot = await getDocs(productsCol);
  const productsList = productsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const topSalesContainer = document.querySelector(".top-sales-container");
  if (!topSalesContainer) return;

  topSalesContainer.innerHTML = "";
  const sortedProducts = productsList.sort((a, b) => b.price - a.price);
  const top3Products = sortedProducts.slice(0, 3);

  top3Products.forEach((item) => {
    topSalesContainer.innerHTML += `
      <div class="top-sales-card" data-id="${item.id}">
        <div class="top-sales-image">
          <img src="${item.image}">
        </div>
        <p class="hover:text-amber-700 hover:cursor-pointer">${item.category}</p>
        <h3 class="text-xl font-bold hover:text-amber-700 hover:cursor-pointer">${item.name}</h3>
        <span class="font-bold">$${item.price}</span>
      </div>
    `;
  });
}
getProducts();


onAuthStateChanged(auth, async (user) => {
  const adminLink = document.getElementById("adminLink");

  
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && snap.data().role === "admin\n") {
      adminLink.classList.remove("hidden"); ///////////////////////////////////////
    } else {
      adminLink.classList.add("hidden");
    }
  } catch (err) {
    console.error("Error checking role:", err);
    adminLink.classList.add("hidden");
  }
});

