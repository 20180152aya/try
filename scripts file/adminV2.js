// ---------- CONFIG: firebase ----------
const firebaseConfig = {
    apiKey: "AIzaSyCNqJD5GE-_-BQPTkK21V5EJq4Q3owIW_k",
    authDomain: "e-commerce-fb245.firebaseapp.com",
    databaseURL: "https://e-commerce-fb245-default-rtdb.firebaseio.com",
    projectId: "e-commerce-fb245",
    storageBucket: "e-commerce-fb245.firebasestorage.app",
    messagingSenderId: "874144848274",
    appId: "1:874144848274:web:01cd38fe55230ea98d894b",
};

// Firebase modular imports (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
    getFirestore,
    collection,
    addDoc,
    serverTimestamp,
    startAfter,
    query,
    orderBy,
    getDocs,
    updateDoc,
    limit,
    deleteDoc,
    doc,
    getDoc,
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Init firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// DOM refs (safe)
const form = document.getElementById("productForm");
const productsContainer = document.getElementById("productsContainer");
const uploadStatus = document.getElementById("uploadStatus");
const addProductBtn = document.getElementById("addProductBtn");
const addProductSection = document.getElementById("addProduct");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const menuToggle = document.getElementById("menuToggle");
const closeSidebar = document.getElementById("closeSidebar");
const sidebar = document.getElementById("sidebar");
const overlay = document.getElementById("overlay");
const reloadOrdersBtn = document.getElementById("reloadOrdersBtn");
const usersContainer = document.getElementById("usersContainer");

// Sidebar toggle (works on all screens)
if (menuToggle) {
    menuToggle.addEventListener("click", () => {
        if (sidebar) sidebar.classList.remove("-translate-x-full");
        if (overlay) overlay.classList.remove("hidden");
    });
}
if (closeSidebar) {
    closeSidebar.addEventListener("click", () => {
        if (sidebar) sidebar.classList.add("-translate-x-full");
        if (overlay) overlay.classList.add("hidden");
    });
}
if (overlay) {
    overlay.addEventListener("click", () => {
        if (sidebar) sidebar.classList.add("-translate-x-full");
        overlay.classList.add("hidden");
    });
}

// Toggle add product section (prevent default anchor behavior)
if (addProductBtn) {
    addProductBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!addProductSection) return;
        addProductSection.classList.toggle("hidden");
        if (!addProductSection.classList.contains("hidden")) {
            addProductSection.scrollIntoView({ behavior: "smooth" });
            // set form to add mode
            document.getElementById("formTitle").textContent = "Add New Product";
            document.getElementById("submitBtn").textContent = "Add Product";
            form && form.removeAttribute("data-editing");
            document.getElementById("productImage") && (document.getElementById("productImage").required = true);
        }
    });
}

// Cancel add
const cancelAdd = document.getElementById("cancelAdd");
if (cancelAdd) {
    cancelAdd.addEventListener("click", () => {
        addProductSection && addProductSection.classList.add("hidden");
        form && form.reset();
        form && form.removeAttribute("data-editing");
        document.getElementById("productImage") && (document.getElementById("productImage").required = true);
    });
}

let lastVisible = null;
let loading = false;
const pageSize = 6;

// Cloudinary upload (unsigned)
async function uploadToCloudinary(file) {
    if (!file) throw new Error("No file provided");
    uploadStatus && (uploadStatus.textContent = "Uploading image...");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_products_preset");

    const res = await fetch("https://api.cloudinary.com/v1_1/dm1bdgm0b/upload", {
        method: "POST",
        body: formData,
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error("Cloudinary upload failed: " + text);
    }
    const data = await res.json();
    uploadStatus && (uploadStatus.textContent = "Upload finished");
    return { url: data.secure_url, public_id: data.public_id };
}

async function getProductsStats() {
    const snap = await getDocs(collection(db, "products"));
    const totalProducts = snap.size;
    let totalStock = 0;
    snap.forEach(docSnap => {
        const p = docSnap.data();
        totalStock += p.quantity || 0;
    });
    document.getElementById("productsStat").textContent = totalProducts + " items (" + totalStock + " in stock)";
}

async function getOrdersStats() {
    const snap = await getDocs(collection(db, "orders"));
    const totalOrders = snap.size;
    let pending = 0;
    snap.forEach(docSnap => {
        const o = docSnap.data();
        if (o.status !== "shipped") pending++;
    });
    document.getElementById("ordersStat").textContent = totalOrders + " (" + pending + " pending)";
}

async function getRevenueStats() {
    const snap = await getDocs(collection(db, "orders"));
    let totalRevenue = 0;
    snap.forEach(docSnap => {
        const o = docSnap.data();
        if (o.status === "shipped") totalRevenue += o.totalPrice || 0;
    });
    document.getElementById("revenueStat").textContent = "$" + totalRevenue.toFixed(2);
}

async function getUsersStats() {
    const snap = await getDocs(collection(db, "users"));
    const totalUsers = snap.size;
    document.getElementById("usersStat").textContent = totalUsers + " registered";
}

async function loadDashboardStats() {
    await Promise.all([
        getProductsStats(),
        getOrdersStats(),
        getUsersStats(),
        getRevenueStats()
    ]);
}

loadDashboardStats();

// Submit handler (add / edit)
if (form) {
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = form.getAttribute("data-editing");
        const name = document.getElementById("productName").value.trim();
        const category = document.getElementById("productCategory").value.trim();
        const price = Number(document.getElementById("productPrice").value);
        const qty = Number(document.getElementById("productQuantity").value);
        const desc = document.getElementById("productDescription").value.trim();
        const inputFile = document.getElementById("productImage");
        const file = inputFile && inputFile.files && inputFile.files[0];

        // ---------- VALIDATION ----------
        let errors = [];

        if (!name || name.length < 3) {
            errors.push("Product name must be at least 3 characters.");
        }
        if (isNaN(price) || price <= 0) {
            errors.push("Please enter a valid product price.");
        }
        if (!Number.isInteger(qty) || qty < 0) errors.push("Quantity must be a valid positive number.");
        
        if (!id) { // ADD MODE only
            if (!category) errors.push("Category is required when adding a new product.");
            if (!desc || desc.length < 20 || desc.length > 200) {
                errors.push("Description is required and must be between 20 and 200 characters.");
            }
            if (!file) errors.push("Please upload an image for the product.");
        } else { // EDIT MODE
            if (desc && (desc.length < 20 || desc.length > 200)) {
                errors.push("Description must be between 20 and 200 characters.");
            }
        }

        if (errors.length > 0) {
            alert(errors.join("\n"));
            return;
        }

        try {
            if (id) {
                // EDIT MODE
                const updates = {
                    name,
                    category: category || null,
                    price,
                    quantity: qty,
                    description: desc || null,
                    updatedAt: serverTimestamp(),
                };
                if (file) {
                    const { url, public_id } = await uploadToCloudinary(file);
                    updates.image = url;
                    updates.imagePublicId = public_id;
                }
                await updateDoc(doc(db, "products", id), updates);
                alert("Product updated!");
            } else {
                // ADD MODE
                const { url, public_id } = await uploadToCloudinary(file);
                await addDoc(collection(db, "products"), {
                    name,
                    category: category || null,
                    price,
                    quantity: qty,
                    description: desc || null,
                    image: url,
                    imagePublicId: public_id,
                    createdAt: serverTimestamp(),
                });
                alert("Product added!");
            }
            form.reset();
            addProductSection.classList.add("hidden");
            // refresh products
            productsContainer.innerHTML = "";
            lastVisible = null;
            await loadProducts(true);
            await loadDashboardStats(); 
        }
        catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        }
    });
}

// Render product (stable card)
function renderProduct(p) {
    const card = document.createElement("div");
    card.className = "bg-white rounded-lg shadow p-3 flex flex-col";
    card.style.minHeight = "350px";

    // Image wrapper
    const imgWrap = document.createElement("div");
    imgWrap.className = "w-full h-48 overflow-hidden aspect-[4/3] rounded-lg mb-3 flex items-center justify-center bg-gray-100";

    const img = document.createElement("img");
    img.src = p.image || "";
    img.alt = p.name || "";
    img.className = "w-full h-full max-h-full max-w-full object-contain transition-transform duration-300 hover:scale-105";

    imgWrap.appendChild(img);

    // Title
    const title = document.createElement("h3");
    title.className = "text-lg font-semibold mb-1";
    title.textContent = p.name || "";

    // Category
    const cat = document.createElement("p");
    cat.className = "text-sm text-gray-500 mb-1";
    cat.textContent = p.category || "";

    // Price
    const price = document.createElement("p");
    price.className = "text-orange-500 font-bold mb-2";
    price.textContent = `$${Number(p.price).toFixed(2)}`;

    // Quantity
    const qty = document.createElement("p");
    qty.className = "text-gray-600 mb-3";
    qty.textContent = `Quantity: ${Number(p.quantity || 0)}`;

    // Actions
    const actions = document.createElement("div");
    actions.className = "mt-auto flex gap-2";

    const editBtn = document.createElement("button");
    editBtn.className = "editBtn bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600";
    editBtn.textContent = "Edit";
    editBtn.dataset.id = p.id;

    const delBtn = document.createElement("button");
    delBtn.className = "deleteBtn bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600";
    delBtn.textContent = "Delete";
    delBtn.dataset.id = p.id;

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    // Append all
    card.appendChild(imgWrap);
    card.appendChild(title);
    card.appendChild(cat);
    card.appendChild(price);
    card.appendChild(qty);
    card.appendChild(actions);

    productsContainer && productsContainer.appendChild(card);

    // Handlers
    editBtn.addEventListener("click", () => startEdit(p.id));
    delBtn.addEventListener("click", () => deleteProduct(p.id));
}

// Start edit mode
async function startEdit(id) {
    try {
        const docSnap = await getDoc(doc(db, "products", id));
        if (!docSnap.exists()) return;
        const p = docSnap.data();
        document.getElementById("productName").value = p.name || "";
        document.getElementById("productCategory").value = p.category || "";
        document.getElementById("productPrice").value = p.price || "";
        document.getElementById("productQuantity").value = p.quantity || 0;
        document.getElementById("productDescription").value = p.description || "";
        document.getElementById("productImage").required = false;

        document.getElementById("formTitle").textContent = "Edit Product";
        document.getElementById("submitBtn").textContent = "Update Product";
        addProductSection && addProductSection.classList.remove("hidden");
        addProductSection && addProductSection.scrollIntoView({ behavior: "smooth" });
        form && form.setAttribute("data-editing", id);
    } catch (err) {
        console.error(err);
        alert("Failed to start edit: " + err.message);
    }
}

// Delete product
async function deleteProduct(id) {
    if (!confirm("Delete product?")) return;
    try {
        await deleteDoc(doc(db, "products", id));
        alert("Product deleted");
        productsContainer && (productsContainer.innerHTML = "");
        lastVisible = null;
        await loadProducts(true);
        await loadDashboardStats(); // تحديث الإحصائيات
    } catch (err) {
        console.error(err);
        alert("Delete failed: " + err.message);
    }
}

// Load products with pagination
async function loadProducts(initial = false) {
    if (loading) return;
    loading = true;
    try {
        if (initial) {
            productsContainer && (productsContainer.innerHTML = "");
            lastVisible = null;
        }
        let q;
        if (!lastVisible) {
            q = query(collection(db, "products"), orderBy("createdAt", "desc"), limit(pageSize));
        } else {
            q = query(collection(db, "products"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(pageSize));
        }
        const snap = await getDocs(q);
        if (!snap.empty) {
            lastVisible = snap.docs[snap.docs.length - 1];
            snap.docs.forEach((docSnap) => {
                const p = { id: docSnap.id, ...docSnap.data() };
                renderProduct(p);
            });
            // show load more only if result size === pageSize
            if (snap.size === pageSize) {
                loadMoreBtn && (loadMoreBtn.classList.remove("hidden"));
            } else {
                loadMoreBtn && (loadMoreBtn.classList.add("hidden"));
            }
        } else {
            // no documents found
            loadMoreBtn && (loadMoreBtn.classList.add("hidden"));
            if (initial) {
                productsContainer.innerHTML = "<p class='text-gray-500 text-center py-8'>No products found</p>";
            }
        }
    } catch (err) {
        console.error("Error loading products:", err);
        productsContainer.innerHTML = `<p class='text-red-500 text-center py-8'>Error loading products: ${err.message}</p>`;
    }
    loading = false;
}

async function loadOrders() {
    try {
        const ordersContainer = document.getElementById("ordersContainer");
        if (!ordersContainer) return;
        ordersContainer.innerHTML = "<p class='text-gray-500 text-center py-4'>Loading orders...</p>";

        const usersSnap = await getDocs(collection(db, "users"));
        const allOrders = [];

        for (const userDoc of usersSnap.docs) {
            const ordersSnap = await getDocs(collection(db, "users", userDoc.id, "orders"));
            ordersSnap.forEach(orderDoc => {
                allOrders.push({
                    userId: userDoc.id,
                    orderId: orderDoc.id,
                    ...orderDoc.data()
                });
            });
        }

        ordersContainer.innerHTML = ""; 

        if (allOrders.length === 0) {
            ordersContainer.innerHTML = "<p class='text-gray-500 text-center py-8'>No orders found</p>";
            return;
        }

        allOrders.forEach(o => {
            const orderItems = o.items || [];
            const totalItems = orderItems.reduce((sum, p) => sum + (p.qty || 0), 0);
            const itemsHtml = orderItems
                .map(p => `<li class="text-sm">${escapeHtml(p.name)} x${p.qty} - $${Number(p.price || 0).toFixed(2)}</li>`)
                .join("");

            const card = document.createElement("div");
            card.className = "bg-white p-4 rounded shadow mb-4 border-l-4 border-orange-500 hover:shadow-md transition-shadow";
            card.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <p class="text-sm text-gray-500 font-mono">Order #${o.orderId.substring(0,8)}</p>
                    <span class="px-2 py-1 text-xs rounded ${
                        o.status === 'shipped' ? 'bg-green-100 text-green-800' : 
                        o.status === 'processing' ? 'bg-blue-100 text-blue-800' : 
                        'bg-yellow-100 text-yellow-800'
                    }">${o.status || 'pending'}</span>
                </div>
                <p class="text-sm text-gray-600 mb-1"><strong>Customer:</strong> ${escapeHtml(o.email || 'Unknown')}</p>

                <ul class="list-disc list-inside text-gray-700 mb-3 text-sm">${itemsHtml}</ul>
                <div class="flex justify-between items-center border-t pt-2">
                    <p class="text-orange-500 font-bold">$${Number(o.total || 0).toFixed(2)}</p>
                    <p class="text-xs text-gray-400">
                        ${o.date ? new Date(o.date.toDate()).toLocaleString('en-US', {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Unknown date'}
                    </p>
                </div>
            `;
            ordersContainer.appendChild(card);
        });

    } catch (err) {
        console.error("Load orders error:", err);
        const ordersContainer = document.getElementById("ordersContainer");
        if (ordersContainer) {
            ordersContainer.innerHTML = `<p class='text-red-500 text-center py-8'>Error loading orders: ${err.message}</p>`;
        }
    }
}

// Load users
async function loadUsers() {
    try {
        const snap = await getDocs(collection(db, "users"));
        const container = document.getElementById("usersContainer");
        if (!container) return;
        container.innerHTML = "";

        if (snap.empty) {
            container.innerHTML = "<p class='text-gray-500 text-center py-8'>No users found</p>";
            return;
        }

        snap.forEach(docSnap => {
            const u = { id: docSnap.id, ...docSnap.data() };

            const card = document.createElement("div");
            card.className = "bg-white p-4 rounded shadow mb-4 border-l-4 border-blue-500";
            
            card.innerHTML = `
                <p class="font-bold text-gray-800 mb-1">${escapeHtml(u.Name || "No Name")}</p>
                <p class="text-sm text-gray-600 mb-1"><strong>Email:</strong> ${escapeHtml(u.Email || "N/A")}</p>
                <p class="text-sm text-gray-600 mb-2"><strong>Role:</strong> 
                    <span class="px-2 py-1 text-xs rounded ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }">${escapeHtml(u.role || "customer")}</span>
                </p>
            `;

            container.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading users:", err);
        const container = document.getElementById("usersContainer");
        if (container) {
            container.innerHTML = `<p class='text-red-500 text-center py-8'>Error loading users: ${err.message}</p>`;
        }
    }
}

// small helper to prevent XSS
function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (s) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
    );
}

loadProducts(true);
loadOrders();
loadUsers();

if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => loadProducts(false));
}

if (reloadOrdersBtn) {
    reloadOrdersBtn.addEventListener("click", () => {
        loadOrders();
        loadDashboardStats(); 
    });
}








// import { db, signOut,collection, getDocs, getDoc,
//    query, limit , doc,auth ,updateDoc,sendEmailVerification,onAuthStateChanged} from "./firebase_connection.js";

// async function printAllOrders() {
//     try {
//         // استدعاء collection "orders" على مستوى المستخدمين أو global حسب مكان الأوردرات
//         // لو الأوردرات مخزنة تحت كل يوزر:
//         const usersSnap = await getDocs(collection(db, "users"));

//         const allOrders = [];

//         for (const userDoc of usersSnap.docs) {
//             const ordersSnap = await getDocs(collection(db, "users", userDoc.id, "orders"));
//             ordersSnap.forEach(orderDoc => {
//                 allOrders.push({
//                     userId: userDoc.id,
//                     orderId: orderDoc.id,
//                     ...orderDoc.data()
//                 });
//             });
//         }

//         console.log("All orders:", allOrders);

//     } catch (err) {
//         console.error("Error fetching orders:", err);
//     }
// }

// // استدعاء الدالة
// printAllOrders();

