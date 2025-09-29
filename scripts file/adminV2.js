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
    collectionGroup,
    where
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

// Pagination state
let lastVisible = null;
let loading = false;
const pageSize = 6;

// Cloudinary upload (unsigned)
async function uploadToCloudinary(file) {
    if (!file) throw new Error("No file provided");
    uploadStatus && (uploadStatus.textContent = "Uploading image...");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_products_preset"); // <-- make sure this preset exists in your Cloudinary account

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
    const totalProducts = snap.size; // عدد المنتجات
    let totalStock = 0;
    snap.forEach(docSnap => {
        const p = docSnap.data();
        totalStock += p.quantity || 0;
    });
    document.getElementById("productsStat").textContent = totalProducts + " items (" + totalStock + " in stock)";
}

async function getOrdersStats() {
    try {
        const snap = await getDocs(collectionGroup(db, "orders"));
        const totalOrders = snap.size;
        const counts = {
            completed: 0,
            shipped: 0,
            pending: 0,
            canceled: 0,
            other: 0
        };

        const statusesSeen = {};

        snap.forEach(docSnap => {
            const o = docSnap.data() || {};
            const raw = (o.status || "").toString();
            const st = raw.toLowerCase().trim();

            statusesSeen[st] = (statusesSeen[st] || 0) + 1;

            if (st === "completed") counts.completed++;
            else if (st === "shipped") counts.shipped++;
            else if (st === "pending") counts.pending++;
            else if (st === "canceled" || st === "cancelled") counts.canceled++;
            else counts.other++;
        });

        // primary small summary (your widget)
        const statEl = document.getElementById("ordersStat");
        if (statEl) {
            statEl.innerHTML = `${totalOrders}<br>
    ( completed: ${counts.completed} | shipped: ${counts.shipped} | pending: ${counts.pending} | canceled: ${counts.canceled} | other:${counts.other})`;
        }

        // debug to console so you can inspect unexpected statuses
        console.debug("Order status breakdown:", counts, "raw statuses:", statusesSeen);

    } catch (err) {
        console.error("Error fetching order stats:", err);
        const statEl = document.getElementById("ordersStat");
        if (statEl) statEl.textContent = "Error loading stats";
    }
}

async function getRevenueStats() {
    const snap = await getDocs(collectionGroup(db, "orders"));
    let totalRevenue = 0;
    snap.forEach(docSnap => {
        const o = docSnap.data();
        if (o.status === "shipped") totalRevenue += o.total || 0;
    });
    document.getElementById("revenueStat").textContent = "$" + totalRevenue.toFixed(3) + " (shipped)";
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

loadDashboardStats();/////////////////////////////////////////////////////////////////////////////////////


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
        if (!category) errors.push("Category is required when adding a new product.");
        if (!desc || desc.length < 20 || desc.length > 200) {
            errors.push("Description is required and must be between 20 and 200 characters.");
        }


        if (!id) { // ADD MODE only
            if (!category) errors.push("Category is required when adding a new product.");
            if (!desc || desc.length < 20 || desc.length > 200) {
                errors.push("Description is required and must be between 20 and 200 characters.");
            }
            if (!file) errors.push("Please upload an image for the product.");
        }
        // ------------------------
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
                // form.removeAttribute("data-editing");
                // document.getElementById("formTitle").textContent = "Add New Product";
                // document.getElementById("submitBtn").textContent = "Add Product";
                // document.getElementById("productImage") && (document.getElementById("productImage").required = true);
                // productsContainer && (productsContainer.innerHTML = "");
                // lastVisible = null;
                // await loadProducts(true);
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
    card.style.minHeight = "350px"; // stable card height

    // Image wrapper
    const imgWrap = document.createElement("div");
    imgWrap.className =
        "w-full h-48 overflow-hidden aspect-[4/3] rounded-lg mb-3 flex items-center justify-center bg-gray-100";

    const img = document.createElement("img");
    img.src = p.image || "";
    img.alt = p.name || "";
    img.className =
        "w-full h-full max-h-full max-w-full object-cotainer transition-transform duration-300 hover:scale-105";

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
    editBtn.className =
        "editBtn bg-yellow-500 text-white px-3 py-1 rounded text-sm hover:bg-yellow-600";
    editBtn.textContent = "Edit";
    editBtn.dataset.id = p.id;

    const delBtn = document.createElement("button");
    delBtn.className =
        "deleteBtn bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600";
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
    } catch (err) {
        console.error(err);
        alert("Delete failed: " + err.message);
    }
}

// Load products with pagination
async function loadProducts(initial = false,) {
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
            // update dashboard stats
            document.getElementById("statProducts") && (document.getElementById("statProducts").textContent = (snap.size + (lastVisible ? "" : "")));
        } else {
            // no documents found
            loadMoreBtn && (loadMoreBtn.classList.add("hidden"));
        }
    } catch (err) {
        console.error("Error loading products:", err);
    }
    loading = false;
}

let lastvisible = null;
let currentFilter = "all";
// Orders
async function loadOrders(filter = "all", nextPage = false) {
    try {
        // Build query with proper filtering
        let q;
        if (filter === "all") {
            q = query(collectionGroup(db, "orders"), orderBy("date", "desc"), limit(5));
        } else {
            // Filter at database level for better performance
            q = query(
                collectionGroup(db, "orders"),
                where("status", "==", filter),
                orderBy("date", "desc"),
                limit(5)
            );
        }

        if (nextPage && lastVisible) {
            q = query(q, startAfter(lastVisible));
        }

        const snap = await getDocs(q);
        const ordersContainer = document.getElementById("ordersContainer");

        // Ensure container exists and clear it
        if (!ordersContainer) {
            console.error("Orders container not found");
            return;
        }

        if (!nextPage) {
            ordersContainer.innerHTML = "";
        }

        // Check if we have any orders
        if (snap.empty) {
            if (!nextPage) {
                ordersContainer.innerHTML = '<p class="text-gray-500 p-4">No orders found.</p>';
            }
            return;
        }
        lastVisible = snap.docs[snap.docs.length - 1];

        console.log(`Loaded ${snap.docs.length} orders`); // Debug log

        snap.docs.forEach((docSnap) => {
            const o = { id: docSnap.id, ...docSnap.data() };
            const refPath = docSnap.ref.path;

            // Calculate total items
            const totalItems = (o.items || []).reduce((sum, p) => sum + (p.qty ?? p.quantity ?? 0), 0);

            // Generate products HTML
            const itemsHtml = (o.items || [])
                .map((p) => `<li>${escapeHtml(p.name)} x${p.qty ?? p.quantity} - $${Number(p.price || 0).toFixed(2)}</li>`)
                .join("");


            // Format date properly
            let formattedDate = "Unknown";
            if (o.date) {
                try {
                    formattedDate = o.date.toDate ? o.date.toDate().toLocaleString() : o.date;
                } catch (err) {
                    console.warn("Date formatting error:", err);
                }
            }


            // Create order card
            // Order card
            const card = document.createElement("div");
            card.className = "bg-white p-4 rounded shadow mb-4";
            card.innerHTML = `
                <p class="text-sm text-gray-500">Order ID: ${o.id}</p>
                <p class="text-sm text-gray-500">User ID: ${escapeHtml(o.userId || "Unknown")}</p>
                <p class="text-sm text-gray-500">User Email: ${escapeHtml(o.email || o.userEmail || "Unknown")}</p>
                <p class="text-sm text-gray-500">Created At: ${formattedDate}</p>
                <p class="text-sm text-gray-500">Items: ${totalItems}</p>
                <ul class="list-disc list-inside text-gray-700 mb-2">${itemsHtml}</ul>
                <p class="text-orange-500 font-bold">Total: $${Number(o.total ?? 0).toFixed(2)}</p>
                <p class="text-sm text-gray-500">Status: <span class="font-semibold">${o.status || "pending"}</span></p>
                <div class="mt-2 flex gap-2">
                    <button data-path="${refPath}" class="shipBtn bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700">Mark as Shipped</button>
                    <button data-path="${refPath}" class="cancelOrderBtn bg-red-600 text-white px-2 py-1 rounded text-sm hover:bg-red-700">Cancel</button>
                </div>
            `;

            ordersContainer.appendChild(card);
        });

        // Attach event handlers
        attachOrderEventHandlers();

    } catch (err) {
        console.error("Load orders error:", err);
        const ordersContainer = document.getElementById("ordersContainer");
        if (ordersContainer) {
            ordersContainer.innerHTML = '<p class="text-red-500 p-4">Error loading orders. Please try again.</p>';
        }
    }
}

// Separate function for event handlers to avoid duplication
function attachOrderEventHandlers() {
    // Ship order handlers
    document.querySelectorAll(".shipBtn").forEach((btn) => {
        btn.addEventListener("click", async (ev) => {
            const path = ev.target.getAttribute("data-path");
            ev.target.disabled = true; // Prevent double-clicking
            ev.target.textContent = "Updating...";

            try {
                await updateDoc(doc(db, ...path.split("/")), { status: "shipped" });
                alert("Order marked as shipped!");
                await loadOrders("all");
            } catch (err) {
                console.error(err);
                alert("Failed to update order: " + err.message);
                ev.target.disabled = false;
                ev.target.textContent = "Mark as Shipped";
            }
        });
    });

    // Cancel order handlers
    document.querySelectorAll(".cancelOrderBtn").forEach((btn) => {
        btn.addEventListener("click", async (ev) => {
            const path = ev.target.getAttribute("data-path");
            if (!confirm("Cancel this order?")) return;

            ev.target.disabled = true;
            ev.target.textContent = "Canceling...";

            try {
                const orderRef = doc(db, ...path.split("/"));
                await updateDoc(orderRef, { status: "canceled" });

                // Get order details for email
                const snap = await getDoc(orderRef);
                const order = snap.data();

                if (order && (order.userEmail || order.email)) {
                    const userEmail = order.userEmail || order.email;

                    emailjs.send("service_08ss765", "template_pkakpnq", {
                        email: userEmail,
                        name: userEmail.split("@")[0],
                        order_id: snap.id,
                        total_price: order.total || 0,
                    }).then(() => {
                        alert("Cancel email sent to " + userEmail);
                    }).catch((err) => {
                        console.error("EmailJS error:", err);
                        alert("Order canceled, but email failed.");
                    });
                }

                alert("Order marked as canceled.");
                await loadOrders("all");
            } catch (err) {
                console.error(err);
                alert("Failed to cancel order: " + err.message);
                ev.target.disabled = false;
                ev.target.textContent = "Cancel";
            }
        });
    });
}
// apply filter 
document.getElementById("applyFilter").addEventListener("click", () => {
    const filter = document.getElementById("orderFilter").value;
    loadOrders(filter);
});




// small helper to prevent XSS
function escapeHtml(str = "") {
    return String(str).replace(/[&<>"']/g, (s) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s])
    );
}

// First loads//////////////////////////////////////////////////////////////////////////////////////////////////
loadProducts(true);
loadOrders("all");


// Load more button
if (loadMoreBtn) loadMoreBtn.addEventListener("click", () => loadProducts(false));
if (reloadOrdersBtn) {
    reloadOrdersBtn.addEventListener("click", () => loadOrders(currentFilter, true));
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Users

// Load users
async function loadUsers() {
    try {
        const snap = await getDocs(collection(db, "users"));
        const container = document.getElementById("usersContainer");
        container.innerHTML = "";

        snap.forEach(docSnap => {
            const u = { id: docSnap.id, ...docSnap.data() };

            // Build user card
            const card = document.createElement("div");
            card.className = "bg-white p-6 rounded shadow text-gray-800";

            card.innerHTML = `
                <p class="font-bold">${escapeHtml(u.Name || "No Name")}</p>
                <p>Email: ${escapeHtml(u.Email || "N/A")}</p>
                <p>Role: ${escapeHtml(u.role || "customer")}</p>
            `;

            container.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading users:", err);
    }
}

// Call on page load
loadUsers();
