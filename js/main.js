// ====== CONFIG: INSERT YOUR SHOPIFY DETAILS HERE ======
const SHOPIFY_DOMAIN = "INSERT_YOUR_SHOPIFY_DOMAIN_HERE.myshopify.com"; // e.g. mybrand.myshopify.com
const STOREFRONT_ACCESS_TOKEN = "INSERT_STOREFRONT_API_TOKEN_HERE";
const STOREFRONT_API_VERSION = "2025-01"; // check latest version in Shopify docs

// Optional tags/handles you can coordinate with Tapstitch/Printful products
const FEATURED_COLLECTION_HANDLE = "frontpage"; // change to your featured collection
// =====================================================

const STOREFRONT_ENDPOINT = `https://${SHOPIFY_DOMAIN}/api/${STOREFRONT_API_VERSION}/graphql.json`;

// Basic Storefront API caller
async function storefrontFetch(query, variables = {}) {
  const res = await fetch(STOREFRONT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": STOREFRONT_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = await res.json();
  if (json.errors) {
    console.error("Storefront API errors:", json.errors);
  }
  return json.data;
}

// ===== CART / CHECKOUT LOGIC (Storefront Cart API) =====
const CART_ID_KEY = "my_storefront_cart_id";

async function getOrCreateCart() {
  let cartId = localStorage.getItem(CART_ID_KEY);
  if (cartId) {
    const cart = await fetchCart(cartId);
    if (cart) return cart;
  }
  return await createCart();
}

async function createCart() {
  const mutation = `
    mutation CartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
          cost {
            subtotalAmount { amount currencyCode }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                cost {
                  totalAmount { amount currencyCode }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product { title handle }
                    image { url altText }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await storefrontFetch(mutation, {
    input: { lines: [] },
  });

  const cart = data?.cartCreate?.cart;
  if (cart?.id) {
    localStorage.setItem(CART_ID_KEY, cart.id);
  }
  return cart;
}

async function fetchCart(cartId) {
  const query = `
    query CartQuery($id: ID!) {
      cart(id: $id) {
        id
        checkoutUrl
        cost {
          subtotalAmount { amount currencyCode }
        }
        lines(first: 50) {
          edges {
            node {
              id
              quantity
              cost {
                totalAmount { amount currencyCode }
              }
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  product { title handle }
                  image { url altText }
                }
              }
            }
          }
        }
      }
    }
  `;
  const data = await storefrontFetch(query, { id: cartId });
  return data?.cart || null;
}

async function cartLinesAdd(cartId, lines) {
  const mutation = `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          cost {
            subtotalAmount { amount currencyCode }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                cost {
                  totalAmount { amount currencyCode }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product { title handle }
                    image { url altText }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const data = await storefrontFetch(mutation, { cartId, lines });
  return data?.cartLinesAdd?.cart;
}

async function cartLinesUpdate(cartId, lineId, quantity) {
  const mutation = `
    mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
          cost {
            subtotalAmount { amount currencyCode }
          }
          lines(first: 50) {
            edges {
              node {
                id
                quantity
                cost {
                  totalAmount { amount currencyCode }
                }
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product { title handle }
                    image { url altText }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;
  const data = await storefrontFetch(mutation, {
    cartId,
    lines: [{ id: lineId, quantity }],
  });
  return data?.cartLinesUpdate?.cart;
}

// ===== PRODUCT / COLLECTION QUERIES =====
async function fetchFeaturedProducts() {
  const query = `
    query FeaturedCollection($handle: String!) {
      collection(handle: $handle) {
        title
        products(first: 8) {
          edges {
            node {
              id
              handle
              title
              featuredImage { url altText }
              priceRange {
                minVariantPrice { amount currencyCode }
              }
            }
          }
        }
      }
    }
  `;
  const data = await storefrontFetch(query, { handle: FEATURED_COLLECTION_HANDLE });
  return data?.collection || null;
}

async function fetchCollectionByHandle(handle) {
  const query = `
    query CollectionByHandle($handle: String!) {
      collection(handle: $handle) {
        title
        description
        products(first: 40) {
          edges {
            node {
              id
              handle
              title
              featuredImage { url altText }
              priceRange {
                minVariantPrice { amount currencyCode }
              }
            }
          }
        }
      }
    }
  `;
  const data = await storefrontFetch(query, { handle });
  return data?.collection || null;
}

async function fetchAllProducts(limit = 40) {
  const query = `
    query AllProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            handle
            title
            featuredImage { url altText }
            priceRange {
              minVariantPrice { amount currencyCode }
            }
          }
        }
      }
    }
  `;
  const data = await storefrontFetch(query, { first: limit });
  return data?.products?.edges?.map(e => e.node) || [];
}

async function fetchProductByHandle(handle) {
  const query = `
    query ProductByHandle($handle: String!) {
      product(handle: $handle) {
        id
        title
        description
        handle
        featuredImage { url altText }
        images(first: 6) {
          edges { node { url altText } }
        }
        options {
          name
          values
        }
        variants(first: 50) {
          edges {
            node {
              id
              title
              availableForSale
              price { amount currencyCode }
              selectedOptions {
                name
                value
              }
            }
          }
        }
      }
    }
  `;
  const data = await storefrontFetch(query, { handle });
  return data?.product || null;
}

// ===== UI HELPERS =====
function formatPrice(amount, currency = "USD") {
  if (!amount) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(parseFloat(amount));
}

// Render product cards
function renderProductCard(product) {
  const imgUrl = product.featuredImage?.url || "images/placeholder-product.jpg";
  const price = product.priceRange?.minVariantPrice;
  const href = `product.html?handle=${encodeURIComponent(product.handle)}`;

  return `
    <a href="${href}" class="product-card">
      <div class="product-card-media">
        <img src="${imgUrl}" alt="${product.featuredImage?.altText || product.title}">
      </div>
      <div class="product-card-body">
        <p class="product-card-title">${product.title}</p>
        <p class="product-card-price">${formatPrice(price?.amount, price?.currencyCode)}</p>
      </div>
    </a>
  `;
}

// ===== CART DRAWER UI =====
let currentCart = null;

async function refreshCartUI() {
  const drawer = document.querySelector("[data-cart-drawer]");
  const itemsContainer = document.querySelector("[data-cart-items]");
  const subtotalEl = document.querySelector("[data-cart-subtotal]");
  const countBadges = document.querySelectorAll("[data-cart-count]");

  if (!currentCart && localStorage.getItem(CART_ID_KEY)) {
    currentCart = await fetchCart(localStorage.getItem(CART_ID_KEY));
  }
  if (!currentCart) {
    itemsContainer.innerHTML = "<p>Your bag is empty.</p>";
    subtotalEl.textContent = "$0.00";
    countBadges.forEach(el => (el.textContent = "0"));
    return;
  }

  const lines = currentCart.lines?.edges || [];
  if (lines.length === 0) {
    itemsContainer.innerHTML = "<p>Your bag is empty.</p>";
    subtotalEl.textContent = "$0.00";
    countBadges.forEach(el => (el.textContent = "0"));
    return;
  }

  let html = "";
  let totalQty = 0;

  for (const edge of lines) {
    const line = edge.node;
    const merch = line.merchandise;
    const product = merch.product;
    const imgUrl = merch.image?.url || "images/placeholder-product.jpg";
    const linePrice = line.cost?.totalAmount;

    totalQty += line.quantity;

    html += `
      <div class="cart-item" data-line-id="${line.id}">
        <img src="${imgUrl}" alt="${merch.image?.altText || product.title}">
        <div>
          <p class="cart-item-title">${product.title}</p>
          <p class="cart-item-meta">${merch.title}</p>
          <div class="cart-item-qty">
            <button class="qty-button" data-qty-change="-1">-</button>
            <span>${line.quantity}</span>
            <button class="qty-button" data-qty-change="1">+</button>
          </div>
        </div>
        <div class="cart-item-price">
          ${formatPrice(linePrice?.amount, linePrice?.currencyCode)}
        </div>
      </div>
    `;
  }

  itemsContainer.innerHTML = html;
  const subtotalAmount = currentCart.cost?.subtotalAmount;
  subtotalEl.textContent = formatPrice(subtotalAmount?.amount, subtotalAmount?.currencyCode);
  countBadges.forEach(el => (el.textContent = String(totalQty)));
}

function openCartDrawer() {
  const drawer = document.querySelector("[data-cart-drawer]");
  drawer?.classList.add("is-open");
}

function closeCartDrawer() {
  const drawer = document.querySelector("[data-cart-drawer]");
  drawer?.classList.remove("is-open");
}

// ===== PAGE-SPECIFIC INIT =====
async function initHomePage() {
  const grid = document.querySelector("[data-featured-grid]");
  if (!grid) return;

  const collection = await fetchFeaturedProducts();
  if (!collection) {
    grid.innerHTML = "<p>Featured products coming soon.</p>";
    return;
  }

  const products = collection.products.edges.map(e => e.node);
  grid.innerHTML = products.map(renderProductCard).join("");
}

async function initCollectionPage() {
  const params = new URLSearchParams(window.location.search);
  const handle = params.get("collection"); // e.g. hoodies, tshirts, crewnecks
  const titleEl = document.querySelector("[data-collection-title]");
  const grid = document.querySelector("[data-collection-grid]");

  let products = [];
  if (handle) {
    const collection = await fetchCollectionByHandle(handle);
    if (collection) {
      titleEl.textContent = collection.title;
      products = collection.products.edges.map(e => e.node);
    }
  } else {
    titleEl.textContent = "Shop All";
    products = await fetchAllProducts();
  }

  if (!products.length) {
    grid.innerHTML = "<p>No products available yet.</p>";
    return;
  }

  grid.innerHTML = products.map(renderProductCard).join("");
}

async function initProductPage() {
  const params = new URLSearchParams(window.location.search);
  const handle = params.get("handle");
  if (!handle) return;

  const product = await fetchProductByHandle(handle);
  if (!product) return;

  const titleEl = document.querySelector("[data-product-title]");
  const priceEl = document.querySelector("[data-product-price]");
  const descEl = document.querySelector("[data-product-description]");
  const mediaContainer = document.querySelector("[data-product-media]");
  const optionsWrapper = document.querySelector("[data-option-values]");
  const addButton = document.querySelector("[data-add-to-cart]");
  const relatedGrid = document.querySelector("[data-related-grid]");

  titleEl.textContent = product.title;
  const firstVariant = product.variants.edges[0]?.node;
  priceEl.textContent = formatPrice(firstVariant?.price?.amount, firstVariant?.price?.currencyCode);
  descEl.textContent = product.description || "Random filler description text here.";

  // Images
  const mainImg = product.featuredImage?.url || "images/placeholder-product.jpg";
  mediaContainer.innerHTML = `
    <img src="${mainImg}" alt="${product.featuredImage?.altText || product.title}" class="product-main-image">
  `;

  // Size options (assumes there is an option named "Size")
  let selectedSize = null;
  const sizeOption = product.options.find(o => o.name.toLowerCase() === "size");
  if (sizeOption && optionsWrapper) {
    optionsWrapper.innerHTML = sizeOption.values
      .map((value, idx) => {
        const selectedClass = idx === 0 ? "is-selected" : "";
        if (idx === 0) selectedSize = value;
        return `<button class="option-button ${selectedClass}" data-size-value="${value}">${value}</button>`;
      })
      .join("");

    optionsWrapper.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-size-value]");
      if (!btn) return;
      selectedSize = btn.getAttribute("data-size-value");
      optionsWrapper.querySelectorAll(".option-button").forEach(b => b.classList.remove("is-selected"));
      btn.classList.add("is-selected");
    });
  }

  function getSelectedVariantId() {
    if (!product.variants?.edges?.length) return null;
    if (!selectedSize) return product.variants.edges[0].node.id;

    const match = product.variants.edges.find(edge => {
      const opts = edge.node.selectedOptions || [];
      const sizeOpt = opts.find(o => o.name.toLowerCase() === "size");
      return sizeOpt && sizeOpt.value === selectedSize;
    });
    return match?.node?.id || product.variants.edges[0].node.id;
  }

  addButton.disabled = false;
  addButton.addEventListener("click", async () => {
    addButton.disabled = true;
    try {
      const variantId = getSelectedVariantId();
      currentCart = await getOrCreateCart();
      currentCart = await cartLinesAdd(currentCart.id, [
        { quantity: 1, merchandiseId: variantId },
      ]);
      await refreshCartUI();
      openCartDrawer();
    } catch (err) {
      console.error("Add to cart error", err);
    } finally {
      addButton.disabled = false;
    }
  });

  // Simple "related" as more products
  if (relatedGrid) {
    const others = (await fetchAllProducts(8)).filter(p => p.handle !== product.handle);
    relatedGrid.innerHTML = others.map(renderProductCard).join("");
  }
}

// ===== GLOBAL INIT =====
document.addEventListener("DOMContentLoaded", async () => {
  // Set up cart drawer events
  document.querySelectorAll(".cart-toggle").forEach(btn => {
    btn.addEventListener("click", () => {
      openCartDrawer();
    });
  });

  document.querySelectorAll("[data-cart-close], [data-cart-overlay]").forEach(el => {
    el.addEventListener("click", () => {
      closeCartDrawer();
    });
  });

  const cartItems = document.querySelector("[data-cart-items]");
  if (cartItems) {
    cartItems.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-qty-change]");
      if (!btn) return;

      const change = parseInt(btn.getAttribute("data-qty-change"), 10);
      const itemEl = btn.closest(".cart-item");
      const lineId = itemEl.getAttribute("data-line-id");

      const qtySpan = itemEl.querySelector(".cart-item-qty span");
      const currentQty = parseInt(qtySpan.textContent, 10);
      const newQty = currentQty + change;
      if (newQty < 1) return;

      try {
        currentCart = await getOrCreateCart();
        currentCart = await cartLinesUpdate(currentCart.id, lineId, newQty);
        await refreshCartUI();
      } catch (err) {
        console.error("Update cart error", err);
      }
    });
  }

  // Checkout button
  const checkoutBtn = document.querySelector("[data-cart-checkout]");
  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async () => {
      currentCart = await getOrCreateCart();
      if (currentCart?.checkoutUrl) {
        window.location.href = currentCart.checkoutUrl;
      }
    });
  }

  // Load cart if exists
  if (localStorage.getItem(CART_ID_KEY)) {
    currentCart = await fetchCart(localStorage.getItem(CART_ID_KEY));
    await refreshCartUI();
  }

  // Page-specific init
  const pageType = document.body.getAttribute("data-page");
  if (pageType === "home") {
    initHomePage();
  } else if (pageType === "collection") {
    initCollectionPage();
  } else if (pageType === "product") {
    initProductPage();
  }
});
