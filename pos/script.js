const API_URL = "https://script.google.com/macros/s/AKfycbx9mr0IoJv5VFQEV8prGsZkfSm4r5ERWf5bgAvelAhukx6oHOMnDHC-Bwp9u5hXsrG5QA/exec";

let allProducts = [];
let cart = [];
let calculations = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
    const res = await fetch(API_URL);
    allProducts = await res.json();
    populateCategories();
    renderProducts(allProducts);

    categoryFilter.onchange = filterProducts;
    checkoutBtn.onclick = openCheckoutModal;
    cancelModal.onclick = closeModal;
    confirmOrder.onclick = processOrder;
    discountType.onchange = calculateTotals;
    discountValue.oninput = calculateTotals;
}

function populateCategories() {
    [...new Set(allProducts.map(p => p.category))].forEach(c => {
        categoryFilter.innerHTML += `<option>${c}</option>`;
    });
}

function filterProducts() {
    const c = categoryFilter.value;
    renderProducts(c === "All" ? allProducts : allProducts.filter(p => p.category === c));
}

function renderProducts(list) {
    productGrid.innerHTML = "";
    list.forEach(p => {
        productGrid.innerHTML += `
      <div class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between h-[160px]">
        <div>
          <div class="flex justify-between items-start">
             <h3 class="font-bold text-sm text-slate-800 leading-tight">${p.name}</h3>
          </div>
          <span class="inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 uppercase tracking-wider">
            ${p.category}
          </span>
        </div>

        <div class="flex justify-between items-end">
          <div class="flex flex-col">
            <span class="text-[10px] text-slate-400 uppercase font-medium">Price</span>
            <span class="font-bold text-slate-900 text-lg">₹${p.price}</span>
          </div>
          <button class="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-5 py-2 rounded-lg transition-all active:scale-95 shadow-sm"
            onclick='addToCart(${JSON.stringify(p)})'>
            Add
          </button>
        </div>
      </div>
    `;
    });
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    
    // Styling based on success or error
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    
    toast.className = `${bgColor} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 transform transition-all duration-300 translate-y-10 opacity-0`;
    toast.innerHTML = `
        <span class="text-sm font-bold">${message}</span>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
        toast.classList.remove('translate-y-10', 'opacity-0');
    }, 10);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.addToCart = function (p) {
    const item = cart.find(i => i.name === p.name);
    item ? item.qty++ : cart.push({ ...p, qty: 1 });
    renderCart();
    showNotification(`${p.name} added to cart!`);
};

function renderCart() {
    cartItems.innerHTML = "";
    cart.forEach((i, idx) => {
        cartItems.innerHTML += `
        <div class="flex justify-between items-start border border-slate-100 rounded-lg p-3 bg-white shadow-sm mb-2">
            <div class="flex-1 pr-2">
                <p class="text-sm font-medium leading-tight text-slate-800">${i.name}</p>
                <p class="text-xs font-bold text-indigo-600 mt-1">₹${i.price} <span class="text-gray-400 font-normal">× ${i.qty}</span></p>
            </div>

            <div class="flex items-center bg-slate-50 rounded-full p-1 border border-slate-200">
                <button onclick="updateQty(${idx}, -1)" 
                    class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm text-slate-600 transition">
                    −
                </button>
                <span class="w-6 text-center text-xs font-bold text-slate-700">${i.qty}</span>
                <button onclick="updateQty(${idx}, 1)" 
                    class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm text-slate-600 transition">
                    +
                </button>
            </div>
        </div>`;
    });
    calculateTotals();
}

window.updateQty = function (i, c) {
    const itemName = cart[i].name;
    cart[i].qty += c;
    
    if (cart[i].qty <= 0) {
        cart.splice(i, 1);
        showNotification(`${itemName} removed`, 'error');
    }
    renderCart();
};

function calculateTotals() {
    const s = cart.reduce((t, i) => t + i.price * i.qty, 0);
    const v = +discountValue.value || 0;
    const d = discountType.value === "percent" ? (s * v) / 100 : v;
    const g = (s - d) * 0.05;
    const t = s - d + g;

    calculations = { subtotal: s, discount: d, gst: g, total: t };

    subtotalDisplay.textContent = s.toFixed(2);
    discountDisplay.textContent = "-" + d.toFixed(2);
    gstDisplay.textContent = g.toFixed(2);
    finalTotalDisplay.textContent = "₹" + t.toFixed(2);
}

function openCheckoutModal() {
    if (!cart.length) return alert("Cart is empty");
    checkoutModal.classList.remove("hidden");
    setTimeout(() => custName.focus(), 50);
}

function closeModal() {
    checkoutModal.classList.add("hidden");
}

async function processOrder() {
    // Basic validation for modal inputs
    if (!custName.value.trim()) {
        showNotification('Please enter customer name', 'error');
        custName.focus();
        return;
    }

    const mobile = custMobile.value.trim();
    if (!/^\d{10}$/.test(mobile)) {
        showNotification('Enter a valid 10-digit mobile number', 'error');
        custMobile.focus();
        return;
    }

    if (!custToken.value.trim()) {
        showNotification('Please enter table / token no', 'error');
        custToken.focus();
        return;
    }

    fillReceipt();

    const receipt = document.getElementById('receipt-section');
    receipt.classList.remove('hidden');

    setTimeout(() => {
        window.print();

        receipt.classList.add('hidden');

        cart = [];
        renderCart();
        closeModal();
    }, 500);
}

function fillReceipt() {
    recOrderId.textContent = "ORD-" + Date.now();
    recDate.textContent = new Date().toLocaleString();
    recCustomer.textContent = custName.value;

    recItems.innerHTML = cart.map(i =>
        `<div class="flex justify-between">
      <span>${i.name} x${i.qty}</span>
      <span>${(i.price * i.qty).toFixed(2)}</span>
    </div>`
    ).join("");

    recSubtotal.textContent = calculations.subtotal.toFixed(2);
    recDiscount.textContent = calculations.discount.toFixed(2);
    recGST.textContent = calculations.gst.toFixed(2);
    recTotal.textContent = calculations.total.toFixed(2);
}
