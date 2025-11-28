# 🛒 E-Commerce Web App (Free Tier-Friendly)

This project is a lightweight, cost-efficient **E-Commerce Web Application** built using modern web technologies and optimized for **Firebase Free Tier** usage.  
The goal is to provide a functional shopping experience with secure authentication, product browsing, and basic admin management — all without exceeding free limits.

---

## 🚀 Tech Stack (All Free Tools)

### **Frontend**
- React.js **or** Vanilla JavaScript  
- TailwindCSS or basic CSS  

### **Backend (Serverless)**
- Firebase Authentication (Email/Password + Google Login)
- Firebase Firestore (Database)
- Firebase Storage (Product images)
- Firebase Hosting (Deployment)
- Firebase Cloud Functions (**optional**, emulator only)

### **Payments**
- Stripe (Test mode only — no live transactions)

---

## 📌 Key Features

### 🔐 **User Features**
- Signup/Login via:
  - Email & Password
  - Google Authentication
- Browse product catalog (with pagination to reduce Firestore reads)
- Product details page
- Add to cart (stored in **LocalStorage** + synced with Firestore)
- Checkout simulation (Stripe test mode)
- View order history (current user only)
- Manage profile (username, email)

### 🛠 **Admin Features**
- Add / Edit / Delete products
- Upload optimized product images (<200KB each)
- View recent 20 customer orders (to minimize read operations)
- Admin-only interface (protected routes + Firestore rules)

### ⚙ **System Features**
- Secure Firestore Rules
- No custom backend required
- Firebase Hosting for deployment
- Sync cart + orders in Firestore with minimal reads/writes

---

## 📊 Firebase Free Tier Optimization

To avoid exceeding free usage limits:

### **Firestore**
- < 20K reads/day  
- Heavy use of:
  - Pagination
  - Caching
  - LocalStorage

### **Authentication**
- Only Email/Password & Google login  
- Avoid SMS login (paid)

### **Storage**
- Compress all images to:
  - **< 200KB**
  - **< 5MB max allowed by Firebase Free Tier**

### **Hosting**
- Keep traffic < 10GB/month


- Only tested via Firebase Emulator Suite (no paid invocations)

---
