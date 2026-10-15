
"use strict";

// ========================================
// APPLICATION STATE AND API CONFIGURATION
// ========================================

// Product records loaded from the backend API.
let products = [];

// ID of the product currently being edited; null means add mode.
let editingProductId = null;

// Base URL for the StockFlow backend API.
const API_BASE = "http://localhost:3000/api";



// ========================================
// 2. SELECT HTML ELEMENTS
// ========================================

const pageTitle = document.getElementById("pageTitle");
const dashboardPage = document.getElementById("dashboardPage");
const inventoryPage = document.getElementById("inventoryPage");

const totalProducts = document.getElementById("totalProducts");
const totalUnits = document.getElementById("totalUnits");
const lowStockCount = document.getElementById("lowStockCount");
const outOfStockCount = document.getElementById("outOfStockCount");

const healthyCount = document.getElementById("healthyCount");
const healthLowCount = document.getElementById("healthLowCount");
const healthOutCount = document.getElementById("healthOutCount");

const healthyBar = document.getElementById("healthyBar");
const lowBar = document.getElementById("lowBar");
const outBar = document.getElementById("outBar");

const attentionList = document.getElementById("attentionList");
const dashboardTable = document.getElementById("dashboardTable");
const inventoryTable = document.getElementById("inventoryTable");
const inventoryCount = document.getElementById("inventoryCount");

const searchInput = document.getElementById("searchInput");
const categoryFilter = document.getElementById("categoryFilter");
const statusFilter = document.getElementById("statusFilter");

const productModal = document.getElementById("productModal");
const productForm = document.getElementById("productForm");
const formError = document.getElementById("formError");
const toast = document.getElementById("toast");


// ========================================
// 3. STOCK STATUS LOGIC
// ========================================

function getStockStatus(product) {
  if (product.quantity === 0) {
    return "Out of stock";
  }

  if (product.quantity <= product.minStock) {
    return "Low stock";
  }

  return "In stock";
}

function getStatusClass(status) {
  if (status === "Out of stock") return "stock-out";
  if (status === "Low stock") return "stock-low";
  return "stock-in";
}

// Escape user-provided text before placing it in HTML.
function escapeHTML(value) {
  const characters = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value).replace(/[&<>"']/g, char =>
    characters[char]
  );
}

function getProductSymbol(category) {
  const symbols = {
    "Electronics": "E",
    "Packaging": "P",
    "Office Supplies": "O",
    "Safety": "S"
  };

  return symbols[category] || "P";
}


// ========================================
// 4. DASHBOARD STATISTICS
// ========================================

function renderDashboard() {
  const total = products.length;

  const units = products.reduce(
    (sum, product) => sum + product.quantity,
    0
  );

  const outOfStock = products.filter(
    product => getStockStatus(product) === "Out of stock"
  ).length;

  const lowStock = products.filter(
    product => getStockStatus(product) === "Low stock"
  ).length;

  const healthy = total - lowStock - outOfStock;

  totalProducts.textContent = total.toLocaleString();
  totalUnits.textContent = units.toLocaleString();
  lowStockCount.textContent = lowStock.toLocaleString();
  outOfStockCount.textContent = outOfStock.toLocaleString();

  healthyCount.textContent = healthy;
  healthLowCount.textContent = lowStock;
  healthOutCount.textContent = outOfStock;

  // Avoid division by zero when there are no products.
  const percentage = count =>
    total === 0 ? 0 : (count / total) * 100;

  healthyBar.style.width = `${percentage(healthy)}%`;
  lowBar.style.width = `${percentage(lowStock)}%`;
  outBar.style.width = `${percentage(outOfStock)}%`;

  renderAttentionList();
  renderDashboardTable();
}

function renderAttentionList() {
  const attentionProducts = products
    .filter(product => getStockStatus(product) !== "In stock")
    .slice(0, 4);

  if (attentionProducts.length === 0) {
    attentionList.innerHTML =
      '<p class="empty-note">All products are above their minimum stock level.</p>';
    return;
  }

  attentionList.innerHTML = attentionProducts.map(product => {
    const status = getStockStatus(product);

    return `
      <div class="attention-item">
        <span class="attention-symbol">!</span>
        <div>
          <strong>${escapeHTML(product.name)}</strong>
          <small>${escapeHTML(product.sku)} · ${status}</small>
        </div>
        <span class="attention-qty">
          ${product.quantity} left
        </span>
      </div>
    `;
  }).join("");
}

function renderDashboardTable() {
  const recentProducts = [...products]
    .sort((a, b) => b.id - a.id)
    .slice(0, 5);

  if (recentProducts.length === 0) {
    dashboardTable.innerHTML = `
      <tr><td colspan="5" class="empty-row">
        No products have been added yet.
      </td></tr>
    `;
    return;
  }

  dashboardTable.innerHTML = recentProducts.map(product => {
    const status = getStockStatus(product);

    return `
      <tr>
        <td>
          <div class="product-cell">
            <span class="product-symbol">
              ${getProductSymbol(product.category)}
            </span>
            <div>
              <div class="product-name">
                ${escapeHTML(product.name)}
              </div>
              <div class="product-category">
                ${escapeHTML(product.category)}
              </div>
            </div>
          </div>
        </td>
        <td class="sku">${escapeHTML(product.sku)}</td>
        <td>${escapeHTML(product.location)}</td>
        <td class="quantity">${product.quantity}</td>
        <td>
          <span class="stock-badge ${getStatusClass(status)}">
            ${status}
          </span>
        </td>
      </tr>
    `;
  }).join("");
}


// ========================================
// 5. INVENTORY TABLE, SEARCH AND FILTERS
// ========================================

function renderInventory() {
  const searchTerm = searchInput.value.trim().toLowerCase();
  const selectedCategory = categoryFilter.value;
  const selectedStatus = statusFilter.value;

  const filteredProducts = products.filter(product => {
    const matchesSearch = [
      product.name,
      product.sku,
      product.location
    ].some(value =>
      value.toLowerCase().includes(searchTerm)
    );

    const matchesCategory =
      !selectedCategory ||
      product.category === selectedCategory;

    const matchesStatus =
      !selectedStatus ||
      getStockStatus(product) === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  inventoryCount.textContent =
    `${filteredProducts.length} of ${products.length} products`;

  if (filteredProducts.length === 0) {
    inventoryTable.innerHTML = `
      <tr><td colspan="7" class="empty-row">
        No matching products found. Try another search or filter.
      </td></tr>
    `;
    return;
  }

  inventoryTable.innerHTML = filteredProducts.map(product => {
    const status = getStockStatus(product);

    return `
      <tr>
        <td>
          <div class="product-cell">
            <span class="product-symbol">
              ${getProductSymbol(product.category)}
            </span>
            <div>
              <div class="product-name">
                ${escapeHTML(product.name)}
              </div>
            </div>
          </div>
        </td>
        <td class="sku">${escapeHTML(product.sku)}</td>
        <td>${escapeHTML(product.category)}</td>
        <td>${escapeHTML(product.location)}</td>
        <td class="quantity">${product.quantity}</td>
        <td>${product.minStock}</td>
        <td>
          <span class="stock-badge ${getStatusClass(status)}">
            ${status}
          </span>
        </td>
      
<td class="action-buttons">
  <button
    class="button button-secondary edit-product-button"
    data-id="${product.id}">
    Edit
  </button>

  <button
    class="button button-danger delete-product-button"
    data-id="${product.id}">
    Delete
  </button>
</td>

      </tr>
    `;
  }).join("");
}

async function loadProducts() {
  try {
    const response = await fetch(`${API_BASE}/products`, {
      credentials: "include"
    });

    if (response.status === 401) {
      window.location.href = "login/login.html";
      return;
    }

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    products = await response.json();

    renderDashboard();
    renderInventory();

  } catch (error) {
    console.error("Could not load products:", error);
    showToast("Could not load products. Check the backend.");
  }
}


async function checkSession() {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: "include"
    });

    if (!response.ok) {
      window.location.replace("login/login.html");
      return;
    }

    await loadProducts();
  } catch (error) {
    console.error("Session check failed:", error);
    window.location.replace("login/login.html");
  }
}



function editProduct(productId) {
  const product = products.find(p => p.id === productId);

  if (!product) {
    showToast("Product not found.");
    return;
  }

  editingProductId = product.id;

  productForm.elements.name.value = product.name;
  productForm.elements.sku.value = product.sku;
  productForm.elements.category.value = product.category;
  productForm.elements.location.value = product.location;
  productForm.elements.quantity.value = product.quantity;
  productForm.elements.minStock.value = product.minStock;

  document.getElementById("modalTitle").textContent = "Edit product";
  productForm.querySelector('button[type="submit"]').textContent =
    "Update product";

  formError.textContent = "";
  productModal.classList.remove("hidden");
}

// ========================================
// 6. NAVIGATION BETWEEN PAGES
// ========================================

function showPage(pageName) {
  const isDashboard = pageName === "dashboard";

  dashboardPage.classList.toggle("hidden", !isDashboard);
  inventoryPage.classList.toggle("hidden", isDashboard);

  pageTitle.textContent = isDashboard ? "Dashboard" : "Inventory";

  document.querySelectorAll(".nav-link").forEach(button => {
    const isActive = button.dataset.page === pageName;

    button.classList.toggle("active", isActive);
    button.setAttribute("aria-current", isActive ? "page" : "false");
  });

  if (!isDashboard) {
    renderInventory();
  }
}

document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => {
    showPage(button.dataset.page);
  });
});


inventoryTable.addEventListener("click", async event => {
  const editButton = event.target.closest(".edit-product-button");
  const deleteButton = event.target.closest(".delete-product-button");

  if (editButton) {
    const productId = Number(editButton.dataset.id);
    editProduct(productId);
    return;
  }

  if (deleteButton) {
    const productId = Number(deleteButton.dataset.id);
    const product = products.find(p => p.id === productId);

    if (!product) {
      showToast("Product not found.");
      return;
    }

    const confirmed = confirm(
      `Are you sure you want to delete "${product.name}"?`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(
        `${API_BASE}/products/${productId}`,
        { method: "DELETE" ,
           credentials: "include"
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Could not delete product.");
      }

      await loadProducts();
      showToast(`${product.name} deleted successfully.`);
    } catch (error) {
      showToast(error.message);
    }
  }
});


document.getElementById("viewInventoryButton")
  .addEventListener("click", () => showPage("inventory"));

document.getElementById("dashboardViewAll")
  .addEventListener("click", () => showPage("inventory"));


// ========================================
// 7. ADD-PRODUCT MODAL
// ========================================

function openModal() {
  formError.textContent = "";
  productModal.classList.remove("hidden");

  productForm.elements.name.focus();
}

function closeModal() {
  productModal.classList.add("hidden");
  formError.textContent = "";
}

document.getElementById("addProductButton")
  .addEventListener("click", openModal);

document.getElementById("dashboardAddButton")
  .addEventListener("click", openModal);

document.getElementById("closeModalButton")
  .addEventListener("click", closeModal);

document.getElementById("cancelModalButton")
  .addEventListener("click", closeModal);

productModal.addEventListener("click", event => {
  if (event.target === productModal) {
    closeModal();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !productModal.classList.contains("hidden")) {
    closeModal();
  }
});


// ========================================
// 8. SAVE A NEW PRODUCT
// ========================================



productForm.addEventListener("submit", async event => {
  event.preventDefault();
  formError.textContent = "";

  const formData = new FormData(productForm);

  const payload = {
    name: String(formData.get("name")).trim(),
    sku: String(formData.get("sku")).trim().toUpperCase(),
    category: String(formData.get("category")).trim(),
    location: String(formData.get("location")).trim(),
    quantity: Number(formData.get("quantity")),
    minStock: Number(formData.get("minStock"))
  };

  const isEditing = editingProductId !== null;

  const url = isEditing
    ? `${API_BASE}/products/${editingProductId}`
    : `${API_BASE}/products`;

  const method = isEditing ? "PATCH" : "POST";

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      credentials: "include",
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Could not save product."
      );
    }

    productForm.reset();
    closeModal();
    editingProductId = null;

    await loadProducts();
    showPage("inventory");

    showToast(
      isEditing
        ? `${result.name} updated successfully.`
        : `${result.name} added successfully.`
    );
  } catch (error) {
    formError.textContent = error.message;
  }
});




// ========================================
// 9. SEARCH AND FILTER EVENT LISTENERS
// ========================================

searchInput.addEventListener("input", renderInventory);
categoryFilter.addEventListener("change", renderInventory);
statusFilter.addEventListener("change", renderInventory);


// ========================================
// 10. SIMPLE SUCCESS MESSAGE
// ========================================

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2800);
}


const logoutButton = document.getElementById("logoutButton");

logoutButton?.addEventListener("click", async () => {
  try {
    const response = await fetch(
      `${API_BASE}/auth/logout`,
      {
        method: "POST",
        credentials: "include"
      }
    );

    if (!response.ok) {
      throw new Error("Logout failed. Please try again.");
    }

    window.location.replace("login/login.html");
  } catch (error) {
    console.error("Logout error:", error);
    showToast(error.message);
  }
});



// ========================================
// 11. INITIALIZE THE APPLICATION
// ========================================

checkSession();

window.addEventListener("pageshow", async () => {
  try {
    const response = await fetch(`${API_BASE}/auth/me`, {
      credentials: "include",
      cache: "no-store"
    });

    if (!response.ok) {
      window.location.replace("login/login.html");
    }
  } catch (error) {
    console.error("Session verification failed:", error);
  }
});
