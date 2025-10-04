/* js/main.js — Oplung Store (compat) */
/* ============================================================
   Helpers & Storage (IIFE để tránh rò rỉ biến global)
============================================================ */
(function () {
  var STORE = {
    CART_KEY: 'cart',
    ORDERS_KEY: 'orders'
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch (e) { return fallback; }
  }
  function fmtVND(n) {
    return (n || 0).toLocaleString('vi-VN') + '₫';
  }
  function getParam(name, search) {
    var p = new URLSearchParams(search || window.location.search);
    return p.get(name);
  }

  /* ============================================================
     localStorage guard (Safari private mode / old browsers)
  ============================================================ */
  var storageOK = true;
  try {
    var __t = '__t__' + Date.now();
    window.localStorage.setItem(__t, '1');
    window.localStorage.removeItem(__t);
  } catch (e) {
    storageOK = false;
    console.warn('localStorage không khả dụng trên trình duyệt này:', e && e.message);
  }

  function lsGet(key, fallback) {
    if (!storageOK) return fallback;
    try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return fallback; }
  }
  function lsSet(key, val) {
    if (!storageOK) return;
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
  }

  /* ============================================================
     Cart API
  ============================================================ */
  function getCart() {
    return lsGet(STORE.CART_KEY, []) || [];
  }
  function setCart(arr) {
    lsSet(STORE.CART_KEY, arr || []);
  }
  function clearCart() {
    setCart([]);
  }
  function cartCount() {
    var cart = getCart();
    var s = 0; for (var i = 0; i < cart.length; i++) s += (cart[i].qty || 1);
    return s;
  }
  function addToCart(item) {
    if (!item || !item.id) return;
    var cart = getCart();
    var idx = -1;
    for (var i = 0; i < cart.length; i++) {
      if (cart[i].id === item.id) { idx = i; break; }
    }
    if (idx >= 0) cart[idx].qty = (cart[idx].qty || 1) + (item.qty || 1);
    else cart.push({ id: item.id, name: item.name || '', price: +item.price || 0, img: item.img || '', qty: item.qty || 1 });

    setCart(cart);
    updateCartBadge();
    // phát sự kiện cho trang khác bắt nếu cần
    try {
      document.dispatchEvent(new CustomEvent('cart:updated', { detail: { count: cartCount() } }));
    } catch (e) {}
  }

  /* ============================================================
     Orders API
  ============================================================ */
  function getOrders() { return lsGet(STORE.ORDERS_KEY, []) || []; }
  function addOrder(order) {
    var orders = getOrders(); orders.push(order);
    lsSet(STORE.ORDERS_KEY, orders);
  }

  /* ============================================================
     UI helpers
  ============================================================ */
  function updateYear() {
    var el = $('#year'); if (el) el.textContent = String(new Date().getFullYear());
  }
  function updateCartBadge() {
    var el = $('#cart-count'); if (el) el.textContent = String(cartCount());
  }

  // Lấy dữ liệu sản phẩm từ data-product (JSON) hoặc từ .product-card
  function extractProductFromButton(btn) {
    var json = btn.getAttribute('data-product');
    if (json) {
      var p = safeParse(json, null);
      if (p && p.id) {
        return {
          id: p.id,
          name: p.name || '',
          price: +p.price || 0,
          img: p.img || '',
          qty: +p.qty || 1
        };
      }
    }
    // tìm parent .product-card
    var card = btn.closest ? btn.closest('.product-card') : null;
    if (!card) return null;

    var titleEl = card.querySelector('.product-card__title');
    var name = card.dataset ? (card.dataset.name || '') : '';
    if (!name && titleEl) {
      var t = titleEl.textContent || '';
      name = t.replace(/\s+/g, ' ').trim();
    }
    var price = Number((card.dataset && card.dataset.price) || 0);

    var imgEl = card.querySelector('img');
    var img = imgEl ? (imgEl.getAttribute('src') || '') : '';

    var id = card.dataset ? card.dataset.id : '';
    if (!id || !name) return null;

    return { id: id, name: name, price: price, img: img, qty: 1 };
  }

  // Gắn handler cho các nút [data-add-to-cart] — chống gắn trùng
  function bindAddToCartInDoc(root) {
    var scope = root || document;
    var btns = $all('[data-add-to-cart]', scope);
    for (var i = 0; i < btns.length; i++) {
      var btn = btns[i];
      if (btn.__addedToCartBound) continue;
      btn.__addedToCartBound = true;
      // đảm bảo không là submit button
      if (!btn.getAttribute('type')) btn.setAttribute('type', 'button');

      btn.addEventListener('click', (function (b) {
        return function () {
          var item = extractProductFromButton(b);
          if (!item) return;
          addToCart(item);
          var old = b.textContent;
          b.textContent = 'Đã thêm ✓';
          setTimeout(function(){ b.textContent = old; }, 900);
        };
      })(btn));
    }
  }

  function initCommonUI() {
    updateYear();
    updateCartBadge();
    bindAddToCartInDoc(document);
  }

  // DOM ready (tương thích Safari cũ)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCommonUI);
  } else {
    initCommonUI();
  }

  /* ============================================================
     Expose API
  ============================================================ */
  window.Store = {
    // storage
    getCart: getCart,
    setCart: setCart,
    clearCart: clearCart,
    addToCart: addToCart,
    cartCount: cartCount,
    getOrders: getOrders,
    addOrder: addOrder,
    // utils
    fmtVND: fmtVND,
    getParam: getParam,
    updateCartBadge: updateCartBadge,
    bindAddToCartInDoc: bindAddToCartInDoc,
    initCommonUI: initCommonUI,
    // const
    SHIP_THRESHOLD: 300000,
    SHIP_FEE: 30000
  };
})();
