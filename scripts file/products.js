import { db, auth, updateDoc, getDocs, collection, doc, setDoc,
   onAuthStateChanged,sendEmailVerification,getAuth, query,where } from './firebase_connection.js';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('product-container');
  const loading = document.getElementById('loading');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const categoryFilter = document.getElementById('category-filter');
  const minPriceInput = document.getElementById('min-price');
  const maxPriceInput = document.getElementById('max-price');
  const filterBtn = document.getElementById('filter-btn');
  const wishlistCount = document.getElementById('wishlistCount');

  let allProducts = [];
  let filteredProducts = []; // Store current filtered products
  let user = JSON.parse(localStorage.getItem('user')) || {};
  let wishlistItems = user.wishlistItems || [];
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
  const pageSize = 12;
  let currentPage = parseInt(sessionStorage.getItem('productsPage')) || 1;
  wishlistCount.textContent = wishlistItems.length;

  function initAddToCart() {
    let addtocartBtns = document.querySelectorAll(".add-to-cart");

    addtocartBtns.forEach((btn) => {
      btn.addEventListener("click", async (e) => {

        const productCard = e.target.closest(".relative");
        const productId = productCard.getAttribute("data-id");
        const quantity = parseInt(productCard.getAttribute("data-quantity") || 10);
        const name = productCard.parentElement.querySelector(".product-name").textContent;
        const price = productCard.parentElement.querySelector(".product-price").textContent.replace("$", "").trim();
        const image = productCard.querySelector("img").src;

        const product = {
          id: productId,
          name: name,
          price: parseFloat(price),
          image: image,
          quantity: quantity,
        };

        if (quantity < 1) {
          alert("This product is out of quantity.");
          return;
        }

        await handleAddToCart(product);
      });
    });
  }

  async function handleAddToCart(product) {
    const user = auth.currentUser;

    if (!user) {
      alert("You must log in first to add products.");
      return;
    }

    try {
      // Fetch current quantity from Firebase
      const productDoc = await getDocs(query(collection(db, "products"), where("__name__", "==", product.id)));
      if (productDoc.empty) {
        alert("Product not found.");
        return;
      }
      const currentquantity = productDoc.docs[0].data().quantity || 0;

      const userCartRef = collection(db, "users", user.uid, "cart");

      // check if product already exists in the cart
      const q = query(userCartRef, where("productId", "==", product.id));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        // product exists → update quantity
        const cartItemDoc = querySnapshot.docs[0];
        const currentQuantity = cartItemDoc.data().quantity || 1;
        const newQuantity = currentQuantity + 1;

        if (newQuantity > currentquantity) {
          alert(`Not enough quantity. Only ${currentquantity} available.`);
          return;
        }

        await updateDoc(doc(userCartRef, cartItemDoc.id), {
          quantity: newQuantity,
        });

        await window.updateCartCount();
        alert("Quantity updated successfully.");
      } else {
        // product not in cart → add new
        if (currentquantity < 1) {
          alert("This product is out of quantity.");
          return;
        }

        await setDoc(doc(userCartRef), {
          productId: product.id,
          name: product.name,
          price: product.price,
          image: product.image,
          quantity: 1,
          addedAt: new Date(),
        });

        await window.updateCartCount();
        alert("Product added to cart successfully.");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("An error occurred while adding the product. Please try again.");
    }
  }

  function applyFilters() {
    const selectedCategory = categoryFilter.value;
    const minPrice = parseFloat(minPriceInput.value) || 0;
    const maxPrice = parseFloat(maxPriceInput.value) || Infinity;

    const filtered = allProducts.filter(product => {
      // Category filter
      const categoryMatch = !selectedCategory || product.category === selectedCategory;

      // Price filter (assumes price is a number or a string like "$123")
      let price = product.price;
      if (typeof price === "string") {
        price = parseFloat(price.replace(/[^0-9.]/g, ""));
      }
      if (isNaN(price)) price = 0;
      const priceMatch = price >= minPrice && price <= maxPrice;

      return categoryMatch && priceMatch;
    });

    // Store filtered products for pagination
    filteredProducts = filtered;
    currentPage = 1;
    renderProducts(filtered);
  }

  // Render products with pagination
  function renderProducts(products) {
    container.innerHTML = "";
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const paginatedProducts = products.slice(start, end);

    paginatedProducts.forEach(product => {
      const productId = product.id;
      const inWishlist = wishlistItems.includes(productId);

      const heartClass = inWishlist ? "fas fa-heart" : "far fa-heart";
      const heartColor = inWishlist ? "text-red-500 in-wishlist" : "text-gray-500";
      const heartTitle = inWishlist ? "Remove from wishlist" : "Add to wishlist";

      const card = document.createElement('div');
card.className = "product-card bg-white p-4 rounded-lg shadow w-80 h-80 md:h-96 flex flex-col group transition-all duration-300 cursor-pointer";

      card.innerHTML = `
        <div class="relative" data-id="${product.id}" data-quantity="${product.quantity || 10}">
          <img src="${product.image || ''}" class="rounded-md w-full h-40 md:h-56 object-contain bg-white shadow-md transform transition-transform duration-300 group-hover:scale-105">
          <div class="absolute inset-x-0 bottom-2 mx-auto flex justify-around items-center h-8 w-5/6 bg-white rounded-sm shadow opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div class="cursor-pointer pointer-events-auto add-to-cart" title="Add to cart">
              <i class="fa-solid fa-cart-shopping"></i>
            </div>
            <div class="cursor-pointer ${heartColor} pointer-events-auto wishlist-toggle" title="${heartTitle}" data-product-id="${productId}">
              <i class="${heartClass}"></i>
            </div>
            <div class="cursor-pointer pointer-events-auto view-product" title="Quick view" data-id ="${productId}">
              <i class="fa-solid fa-eye"></i>
            </div>
          </div>
        </div>
        <div class="flex flex-col justify-between flex-grow mt-3">
          <div>
            <p class="product-category hover:text-amber-700 category-link" style="display:inline-block;cursor:pointer;">${product.category}</p>
            <h3 class="product-name text-lg font-semibold text-gray-800 mt-4 mb-1 text-center truncate w-full" data-id="${productId}" style="cursor:pointer;">${product.name}</h3>
          </div>
          <div class="flex justify-between items-center">
            <span class="product-price font-bold text-amber-700">$ ${product.price}</span>
            <span class="text-sm text-gray-600">quantity: ${product.quantity || 0}</span>
          </div>
        </div>
      `;
      container.appendChild(card);
    });

    // Product click
    container.querySelectorAll('.product-link, .view-product').forEach(el => {
      el.addEventListener('click', function () {
        const id = this.getAttribute('data-id');
        sessionStorage.setItem('productsPage', currentPage.toString());
        sessionStorage.setItem('productsScrollPosition', window.scrollY.toString());
        window.location.href = `product.html?id=${id}`;
      });
    });

    // Category filter click
    container.querySelectorAll('.category-link').forEach(el => {
      el.addEventListener('click', function () {
        const category = this.textContent;
        categoryFilter.value = category;
        loading.classList.remove('hidden');
        applyFilters();
        setTimeout(() => loading.classList.add('hidden'), 500);
      });
    });

    // Wishlist toggle
      // Wishlist toggle
container.querySelectorAll('.wishlist-toggle').forEach(el => {
  el.addEventListener('click', async function (e) {
    e.stopPropagation();
    const heartIcon = this.querySelector('i');
    const productId = this.dataset.productId;
    const isInWishlist = wishlistItems.includes(productId);

    if (isInWishlist) {
      // إزالة المنتج
      wishlistItems = wishlistItems.filter(id => id !== productId);
      this.classList.remove('in-wishlist', 'text-red-500');
      this.classList.add('text-gray-500');
      heartIcon.className = 'far fa-heart';
      this.title = 'Add to wishlist';
    } else {
      // إضافة المنتج
      wishlistItems.push(productId);
      this.classList.add('in-wishlist', 'text-red-500');
      this.classList.remove('text-gray-500');
      heartIcon.className = 'fas fa-heart';
      this.title = 'Remove from wishlist';
    }

   if (user && user.uid) {
  try {
    const userRef = doc(db, "users", user.uid);
    await updateDoc(userRef, { wishlistItems });
    
    // تحديث localStorage
    user.wishlistItems = wishlistItems;
    localStorage.setItem('user', JSON.stringify(user));

  } catch (err) {
    console.error("Error updating wishlist in Firestore:", err);
  }
}else {
      // تحديث localStorage للمستخدم غير المسجل
      localStorage.setItem('guestWishlist', JSON.stringify(wishlistItems));
    }

    // تحديث العداد
    wishlistCount.textContent = wishlistItems.length;
  });
});


    renderPagination(products.length);

    initAddToCart();
  }

  async function updateWishlistInFirestore(userId, wishlist) {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { wishlistItems: wishlist });
    
  }
  // Pagination
  function renderPagination(totalProducts) {
    const pagination = document.getElementById('pagination');
    const totalPages = Math.ceil(totalProducts / pageSize);
    pagination.innerHTML = "";

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = "Prev";
    prevBtn.className = "px-3 py-1 bg-gray-200 rounded hover:bg-gray-300";
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
      if (currentPage > 1) {
        loading.classList.remove('hidden');
        currentPage--;
        sessionStorage.setItem('productsPage', currentPage.toString());
        // Use filtered products if available, otherwise use all products
        const productsToRender = filteredProducts.length > 0 ? filteredProducts : allProducts;
        renderProducts(productsToRender);
        setTimeout(() => loading.classList.add('hidden'), 500);
      }
    };
    pagination.appendChild(prevBtn);

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.textContent = i;
      pageBtn.className = `px-3 py-1 rounded ${i === currentPage ? 'bg-amber-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`;
      pageBtn.onclick = () => {
        loading.classList.remove('hidden');
        currentPage = i;
        sessionStorage.setItem('productsPage', currentPage.toString());
        // Use filtered products if available, otherwise use all products
        const productsToRender = filteredProducts.length > 0 ? filteredProducts : allProducts;
        renderProducts(productsToRender);
        setTimeout(() => loading.classList.add('hidden'), 500);
      };
      pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = "Next";
    nextBtn.className = "px-3 py-1 bg-gray-200 rounded hover:bg-gray-300";
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
      if (currentPage < totalPages) {
        loading.classList.remove('hidden');
        currentPage++;
        sessionStorage.setItem('productsPage', currentPage.toString());
        // Use filtered products if available, otherwise use all products
        const productsToRender = filteredProducts.length > 0 ? filteredProducts : allProducts;
        renderProducts(productsToRender);
        setTimeout(() => loading.classList.add('hidden'), 500);
      }
    };
    pagination.appendChild(nextBtn);
  }

  // Populate categories
  function populateCategories(products) {
    const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      categoryFilter.appendChild(option);
    });
  }

  // Fetch products
  async function fetchProducts() {
    loading.classList.remove('hidden');
    
    try {
      const querySnapshot = await getDocs(collection(db, "products"));
      allProducts = [];
      querySnapshot.forEach((docSnap) => {
        allProducts.push({ ...docSnap.data(), id: docSnap.id });
      });
      populateCategories(allProducts);
      renderProducts(allProducts);
      loading.classList.add('hidden');

      // Restore scroll position
      const savedScrollPosition = sessionStorage.getItem('productsScrollPosition');
      if (savedScrollPosition) {
        setTimeout(() => {
          window.scrollTo(0, parseInt(savedScrollPosition));
          sessionStorage.removeItem('productsScrollPosition');
        }, 100);
      }
    } catch (err) {
      console.error("Error fetching products:", err);
      loading.classList.add('hidden');
    }
    // add to cart



  }

  fetchProducts();

  // Search
  searchBtn.addEventListener('click', function () {
    const value = searchInput.value.trim().toLowerCase();
    const filtered = allProducts.filter(product =>
      product.name && product.name.toLowerCase().includes(value)
    );
    // Store search results for pagination
    filteredProducts = filtered;
    currentPage = 1;
    loading.classList.remove('hidden');
    renderProducts(filtered);
    setTimeout(() => loading.classList.add('hidden'), 500);
  });

  // Filter
  filterBtn.addEventListener('click', function () {
    loading.classList.remove('hidden');
    applyFilters();
    setTimeout(() => loading.classList.add('hidden'), 500);
  });

  categoryFilter.addEventListener('change', function () {
    loading.classList.remove('hidden');
    applyFilters();
    setTimeout(() => loading.classList.add('hidden'), 500);
  });
});

