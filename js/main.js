/* js/main.js — Oplung Store (basic) */
/* ============================================================
   Helpers & Storage
============================================================ */
(function () {
  const STORE = {
    CART_KEY: 'cart',
    ORDERS_KEY: 'orders',
  };

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  function fmtVND(n) {
    return (n || 0).toLocaleString('vi-VN') + '₫';
  }

  function getParam(name, search = location.search) {
    const p = new URLSearchParams(search);
    return p.get(name);
  }

  /* ============================================================
     Cart API (localStorage)
  ============================================================ */
  function getCart() {
    return safeParse(localStorage.getItem(STORE.CART_KEY), []);
  }
  function setCart(arr) {
    localStorage.setItem(STORE.CART_KEY, JSON.stringify(arr));
  }
  function clearCart() {
    setCart([]);
  }
  function cartCount() {
    return getCart().reduce((s, i) => s + (i.qty || 1), 0);
  }
  function addToCart(item) {
    // item: {id, name, price, img, qty}
    const cart = getCart();
    const idx = cart.findIndex((i) => i.id === item.id);
    if (idx >= 0) cart[idx].qty = (cart[idx].qty || 1) + (item.qty || 1);
    else cart.push({ ...item, qty: item.qty || 1 });
    setCart(cart);
    updateCartBadge();
    document.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: cartCount() } }));
  }

  /* ============================================================
     Orders API (localStorage)
  ============================================================ */
  function getOrders() {
    return safeParse(localStorage.getItem(STORE.ORDERS_KEY), []);
  }
  function addOrder(order) {
    const orders = getOrders();
    orders.push(order);
    localStorage.setItem(STORE.ORDERS_KEY, JSON.stringify(orders));
  }

  /* ============================================================
     UI helpers
  ============================================================ */
  function updateYear() {
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  function updateCartBadge() {
    const el = $('#cart-count');
    if (el) el.textContent = String(cartCount());
  }

  // Lấy dữ liệu sản phẩm từ data-product (JSON) hoặc từ .product-card
  function extractProductFromButton(btn) {
    // Ưu tiên data-product (chuỗi JSON)
    const json = btn.getAttribute('data-product');
    if (json) {
      const p = safeParse(json, null);
      if (p && p.id && p.name) return { ...p, qty: p.qty || 1 };
    }

    // Nếu không có data-product, tìm parent .product-card
    const card = btn.closest('.product-card');
    if (!card) return null;

    const id = card.dataset.id;
    const name = card.dataset.name || card.querySelector('.product-card__title')?.textContent?.trim();
    const price = Number(card.dataset.price || 0);
    const img = card.querySelector('img')?.getAttribute('src') || '';
    if (!id || !name) return null;

    return { id, name, price, img, qty: 1 };
  }

  // Gắn handler cho các nút [data-add-to-cart] — idempotent (chỉ gắn 1 lần)
  function bindAddToCartInDoc(root = document) {
    $$('[data-add-to-cart]', root).forEach((btn) => {
      if (btn.__addedToCartBound) return;
      btn.__addedToCartBound = true;
      btn.addEventListener('click', () => {
        const item = extractProductFromButton(btn);
        if (!item) return;
        addToCart(item);
        const old = btn.textContent;
        btn.textContent = 'Đã thêm ✓';
        setTimeout(() => (btn.textContent = old), 900);
      });
    });
  }

  // Khởi tạo dùng chung cho mọi trang
  function initCommonUI() {
    updateYear();
    updateCartBadge();
    bindAddToCartInDoc(document);
  }

  // Expose một API nhỏ nếu trang khác muốn dùng
  window.Store = {
    // storage
    getCart, setCart, clearCart, addToCart, cartCount,
    getOrders, addOrder,
    // utils
    fmtVND, getParam, updateCartBadge, bindAddToCartInDoc, initCommonUI,
    // const
    SHIP_THRESHOLD: 300000,
    SHIP_FEE: 30000,
  };

  document.addEventListener('DOMContentLoaded', initCommonUI);
})();
