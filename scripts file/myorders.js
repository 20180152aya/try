import { db, auth } from './firebase_connection.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const ordersContainer = document.getElementById('orders-container');
const noOrders = document.getElementById('no-orders');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        await loadOrders(user.uid);
    } else {
        ordersContainer.innerHTML = '<p class="text-center text-gray-500">Please log in to view your orders.</p>';
        noOrders.classList.add('hidden');
    }
});

async function loadOrders(userId) {
    try {
        const ordersRef = collection(db, "users", userId, "orders");
        const q = query(ordersRef, orderBy("date", "desc"));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            noOrders.classList.remove('hidden');
            return;
        }

        noOrders.classList.add('hidden');
        ordersContainer.innerHTML = '';

        querySnapshot.forEach((doc) => {
            const order = doc.data();
            const orderElement = createOrderElement(order);
            ordersContainer.appendChild(orderElement);
        });
    } catch (error) {
        console.error('Error loading orders:', error);
        ordersContainer.innerHTML = '<p class="text-center text-red-500">Error loading orders. Please try again later.</p>';
    }
}

function createOrderElement(order) {
    const orderDiv = document.createElement('div');
    orderDiv.className = 'border border-gray-200 rounded-lg p-4';

    const date = order.date ? new Date(order.date.seconds * 1000).toLocaleDateString() : 'Unknown';

    let itemsHtml = '';
    if (order.items && order.items.length > 0) {
        itemsHtml = order.items.map(item => `
            <div class="flex items-center space-x-4 py-2">
                <img src="${item.image || ''}" alt="${item.name || ''}" class="w-16 h-16 object-cover rounded">
                <div>
                    <p class="font-semibold">${item.name || ''}</p>
                    <p class="text-sm text-gray-600">Quantity: ${item.quantity || 1}</p>
                    <p class="text-sm text-gray-600">Price: $${(item.price || 0).toFixed(2)}</p>
                </div>
            </div>
        `).join('');
    }

    orderDiv.innerHTML = `
        <div class="flex justify-between items-start mb-4">
            <div>
                <h3 class="text-lg font-bold">Order Date: ${date}</h3>
                <p class="text-sm text-gray-600">Status: ${order.status || 'Unknown'}</p>
            </div>
            <div class="text-right">
                <p class="text-lg font-bold text-amber-600">Total: $${(order.total || 0).toFixed(2)}</p>
            </div>
        </div>
        <div class="space-y-2">
            ${itemsHtml}
        </div>
    `;

    return orderDiv;
}
