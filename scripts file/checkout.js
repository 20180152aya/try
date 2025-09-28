// checkout.js
document.addEventListener("DOMContentLoaded", () => {
  const cart   = JSON.parse(localStorage.getItem("cart")) || [];
  const coupon = JSON.parse(localStorage.getItem("cartCoupon")) || null;
  // coupon = { code: "mina50", percent: 50 }

  const subtotal = cart.reduce(
    (acc, item) => acc + (item.price || 0) * (item.quantity || 0),
    0
  );
  const discountPercent = coupon?.percent || 0;
  const discountAmount  = subtotal * (discountPercent / 100);
  const total           = subtotal - discountAmount;

  const totalInput = document.querySelector(
    '.payment-gateway input[placeholder="total"]'
  ); 
  const totalValue = document.querySelector(
    '.payment-gateway input[readonly]'
  ); 

  if (totalInput) totalInput.value = "Total after discount";
  if (totalValue) totalValue.value = `$${total.toFixed(2)}`;

  const form = document.querySelector(".payment-gateway form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();

      if (cart.length === 0) {
        alert("Your cart is empty.");
        return;
      }

      alert(`Payment of $${total.toFixed(2)} submitted successfully!`);
      localStorage.removeItem("cart");
      localStorage.removeItem("cartCoupon");
    });
  }
});
