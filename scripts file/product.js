import { db, auth, updateDoc, getDocs, getDoc, collection, doc, setDoc, query, where } from './firebase_connection.js';

async function handleAddToCart(product, quantityToAdd) {
  const user = auth.currentUser;

  if (!user) {
    alert("You must log in first to add products.");
    return;
  }

  try {
    const userCartRef = collection(db, "users", user.uid, "cart");

    // check if product already exists in the cart
    const q = query(userCartRef, where("productId", "==", product.id));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // product exists → update quantity
      const cartItemDoc = querySnapshot.docs[0];
      const currentQuantity = cartItemDoc.data().quantity || 1;
      const newQuantity = currentQuantity + quantityToAdd;

      if (newQuantity > product.quantity) {
        alert(`Not enough quantity. Only ${product.quantity} available.`);
        return;
      }

      await updateDoc(doc(userCartRef, cartItemDoc.id), {
        quantity: newQuantity,
      });

      alert("Quantity updated successfully.");
    } else {
      // product not in cart → add new
      if (quantityToAdd > product.quantity) {
        alert(`Not enough quantity. Only ${product.quantity} available.`);
        return;
      }

      if (product.quantity < 1) {
        alert("This product is out of quantity.");
        return;
      }

      await setDoc(doc(userCartRef), {
        productId: product.id,
        name: product.name,
        price: product.price,
        image: product.image,
        stock: product.quantity,
        quantity: quantityToAdd,
        addedAt: new Date(),
      });

      alert("Product added to cart successfully.");
    }
  } catch (error) {
    console.error("Error adding to cart:", error);
    alert("An error occurred while adding the product. Please try again.");
  }
}

// Get product ID from URL
const params = new URLSearchParams(window.location.search);
const productId = params.get('id');
const loading = document.getElementById('loading');

// Show loading
loading.classList.remove('hidden');

// Fetch product data and display
let currentProduct = null;
if (productId) {
  getDoc(doc(db, "products", productId)).then(docSnap => {
    if (docSnap.exists()) {
      const product = docSnap.data();
      const quantityNum = parseInt(product.quantity) || 0;
      currentProduct = { ...product, id: productId, quantity: quantityNum };
      document.getElementById('product-details').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <img src="${product.image}" class="w-full h-64 md:h-96 object-contain bg-white rounded shadow-md p-4" />
          </div>
          <div>
            <h1 class="text-3xl font-bold mb-4">${product.name}</h1>
            <p class="text-gray-600 mb-4 text-lg">${product.category}</p>
            <span class="text-2xl font-bold text-amber-700 mb-4 block">$ ${product.price}</span>
            <p class="text-sm text-gray-600 mb-4">quantity: ${product.quantity || 0}</p>
            <p class="mb-6 text-gray-700 text-lg">${product.description || ""}</p>

            <!-- Quantity Counter -->
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-700 mb-2">Quantity:</label>
              <div class="flex items-center gap-3">
                <button id="decrease-quantity" class="bg-gray-300 hover:bg-gray-400 text-gray-700 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-colors">
                  -
                </button>
                <span id="quantity-display" class="text-xl font-semibold w-12 text-center">1</span>
                <button id="increase-quantity" class="bg-gray-300 hover:bg-gray-400 text-gray-700 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-colors">
                  +
                </button>
              </div>
            </div>

            <div class="flex gap-4">
              <button id="add-to-cart-btn" class="bg-amber-600 text-white px-6 py-3 rounded hover:bg-amber-700 text-lg">
                <i class="fa-solid fa-cart-shopping"></i> Add to Cart
              </button>
            </div>
          </div>
        </div>
      `;
    } else {
      document.getElementById('product-details').innerHTML = "<p>Product not found.</p>";
    }

    // Hide loading
    loading.classList.add('hidden');

    // Add quantity counter functionality
    let quantity = 1;
    const quantityDisplay = document.getElementById('quantity-display');
    const decreaseBtn = document.getElementById('decrease-quantity');
    const increaseBtn = document.getElementById('increase-quantity');

    if (quantityDisplay && decreaseBtn && increaseBtn) {
      decreaseBtn.addEventListener('click', () => {
        if (quantity > 1) {
          quantity--;
          quantityDisplay.textContent = quantity;
        }
      });

      increaseBtn.addEventListener('click', () => {
        if (quantity < (currentProduct.quantity || 0)) {
          quantity++;
          quantityDisplay.textContent = quantity;
        }
      });
    }

    // Add to cart functionality
    const addToCartBtn = document.getElementById('add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', async () => {
        if (currentProduct) {
          const productToAdd = {
            id: currentProduct.id,
            name: currentProduct.name,
            price: parseFloat(currentProduct.price),
            image: currentProduct.image,
            quantity: currentProduct.quantity || 0,
          };
          await handleAddToCart(productToAdd, quantity);
        }
      });
    }
  });
} else {
  document.getElementById('product-details').innerHTML = "<p>No product selected.</p>";
  // Hide loading
  loading.classList.add('hidden');
}