/* =========================================================
   Wing Portfolio - app.js (consolidated)
   ========================================================= */

/* -----------------------------
   Platform helpers
----------------------------- */
const UA = navigator.userAgent;
const IS_MOBILE = /iPhone|iPad|iPod|Android/i.test(UA);

/* -----------------------------
   Utilities
----------------------------- */

// Smooth scroll for in-page anchors (ignore bare "#")
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (!id || id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth' });
    history.pushState(null, '', id); // optional: update URL hash
  });
});

// Footer year
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

/* -----------------------------
   PDF helpers
   - Ensure .pdf-scroll wrapper
   - Swap <object> -> <iframe> on mobile
   - Rebuild object URLs to force reload / FitH
----------------------------- */

// 讓所有 <object type="application/pdf"> 外面都有可滾容器
function ensurePdfScrollWrap(root = document) {
  root.querySelectorAll('object[type="application/pdf"]').forEach(obj => {
    const parent = obj.parentElement;
    if (parent && parent.classList.contains('pdf-scroll')) return;
    const wrap = document.createElement('div');
    wrap.className = 'pdf-scroll';
    obj.replaceWith(wrap);
    wrap.appendChild(obj);
  });
}

// 行動裝置上，把 <object> 換成 <iframe>，避免 iOS 滾動/縮放不穩
function swapObjectsToIframes(root = document) {
  if (!IS_MOBILE) return;
  root.querySelectorAll('.pdf-scroll object[type="application/pdf"]').forEach(obj => {
    const src = obj.getAttribute('data') || obj.getAttribute('src') || obj.getAttribute('data-src');
    if (!src) return;
    const iframe = document.createElement('iframe');
    iframe.src = src.includes('#') ? src : (src + '#zoom=page-width');
    iframe.title = 'PDF';
    iframe.loading = 'lazy';
    // 帶上可能需要的資料屬性
    ['data-src','data-page','data-pages'].forEach(a=>{
      if (obj.hasAttribute(a)) iframe.setAttribute(a, obj.getAttribute(a));
    });
    obj.replaceWith(iframe);
  });
}

// Inline 區塊：打開時刷新/包裹/行動裝置替換
function refreshInlinePdfs(container) {
  if (!container) return;
  ensurePdfScrollWrap(container);
  if (IS_MOBILE) { swapObjectsToIframes(container); return; }

  container.querySelectorAll('object[type="application/pdf"]').forEach(oldObj => {
    const base = oldObj.getAttribute('data-src') || oldObj.getAttribute('data') || '';
    if (!base) return;
    const url = base.replace(/#.*$/, '') + '#view=FitH&ts=' + Date.now();
    const fresh = oldObj.cloneNode(false);
    for (const {name, value} of Array.from(oldObj.attributes)) {
      if (name !== 'data') fresh.setAttribute(name, value);
    }
    fresh.setAttribute('data', url);
    oldObj.replaceWith(fresh);
  });
}

// Modal：開啟時重新載入 PDF；行動裝置改用 iframe
function rebuildPdfs(modal) {
  if (!modal) return;
  ensurePdfScrollWrap(modal);
  if (IS_MOBILE) { swapObjectsToIframes(modal); return; }

  modal.querySelectorAll('object[type="application/pdf"]').forEach(oldObj => {
    const base = oldObj.getAttribute('data-src') || oldObj.getAttribute('data') || '';
    if (!base) return;
    const curPage = parseInt(oldObj.getAttribute('data-page') || '1', 10);
    const url = base.replace(/#.*$/, '') + `#page=${curPage}&view=FitH&ts=${Date.now()}`;
    const fresh = oldObj.cloneNode(false);
    for (const {name, value} of Array.from(oldObj.attributes)) {
      if (name !== 'data') fresh.setAttribute(name, value);
    }
    fresh.setAttribute('data', url);
    oldObj.replaceWith(fresh);
  });
}

// Modal：關閉時卸載（釋放資源）
function teardownPdfs(modal) {
  if (!modal) return;
  // 同時處理 object 與 iframe
  modal.querySelectorAll('object[type="application/pdf"], iframe').forEach(el => {
    if (el.tagName === 'IFRAME') el.src = 'about:blank';
    else el.setAttribute('data', 'about:blank');
  });
}

// 初始執行（處理已在 DOM 的 PDF）
ensurePdfScrollWrap(document);
swapObjectsToIframes(document);

/* -----------------------------
   DAAD tabs (click + keyboard + a11y)
----------------------------- */
(() => {
  const tabs = Array.from(document.querySelectorAll('.tabbtn'));
  const slides = Array.from(document.querySelectorAll('.slide'));
  if (!tabs.length || !slides.length) return;

  const activate = (i) => {
    tabs.forEach((t, idx) => {
      const isActive = idx === i;
      t.setAttribute('aria-selected', isActive ? 'true' : 'false');
      t.setAttribute('tabindex', isActive ? '0' : '-1'); // roving
    });

    slides.forEach((s, idx) => {
      const isActive = idx === i;
      s.classList.toggle('active', isActive);
      s.setAttribute('role', 'tabpanel');
      const labelId = tabs[idx]?.id || ('tab-' + (idx+1));
      s.setAttribute('aria-labelledby', labelId);
      s.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    tabs[i].focus();
  };

  tabs.forEach((t, i) => {
    // 角色標示（保險）
    t.setAttribute('role', 'tab');

    t.addEventListener('click', () => activate(i));
    t.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); activate((i + 1) % tabs.length); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); activate((i - 1 + tabs.length) % tabs.length); }
      if (e.key === 'Home')       { e.preventDefault(); activate(0); }
      if (e.key === 'End')        { e.preventDefault(); activate(tabs.length - 1); }
    });
  });
})();

/* -----------------------------
   Academic: publications toggle
----------------------------- */
document.querySelectorAll('.item.pub').forEach(card => {
  const toggle = () => {
    const open = card.classList.toggle('open');
    card.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  card.addEventListener('click', (e) => {
    if (e.target.closest('a')) return; // don’t toggle when clicking a link
    toggle();
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
});

/* -----------------------------
   Badges: delegated open/close
   - one open at a time
   - click outside / Esc closes
   - refresh inline PDFs on open
----------------------------- */
(() => {
  const container = document.querySelector('.badges');
  if (!container) return;

  function closeAllBadges() {
    container.querySelectorAll('.badge.pub.open').forEach(b => {
      b.classList.remove('open');
      b.setAttribute('aria-expanded', 'false');
    });
  }

  // Toggle on pill; ignore clicks inside summary-slide
  container.addEventListener('click', (e) => {
    const badge = e.target.closest('.badge.pub');
    if (!badge || !container.contains(badge)) return;

    if (e.target.closest('.summary-slide')) return; // do not close when interacting with content
    if (e.target.closest('a')) return; // links do not toggle

    const willOpen = !badge.classList.contains('open');
    closeAllBadges();
    if (willOpen) {
      badge.classList.add('open');
      badge.setAttribute('aria-expanded', 'true');
      const slide = badge.querySelector('.summary-slide');
      if (slide && typeof refreshInlinePdfs === 'function') refreshInlinePdfs(slide);
    }
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (e.target.closest('.badges')) return;
    closeAllBadges();
  });

  // Close on Esc
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllBadges();
  });
})();

/* -----------------------------
   Modals
   - open by data-target
   - click backdrop / Esc to close
   - focus trap + body scroll lock
   - rebuild PDFs on open, teardown on close
----------------------------- */

function lockScroll() { document.documentElement.classList.add('no-scroll'); document.body.classList.add('no-scroll'); }
function unlockScroll() { document.documentElement.classList.remove('no-scroll'); document.body.classList.remove('no-scroll'); }

function trapFocus(modal) {
  const FOCUSABLE = 'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, object, embed, [tabindex]:not([tabindex="-1"]), [contenteditable]';
  const focusables = Array.from(modal.querySelectorAll(FOCUSABLE)).filter(el => el.offsetParent !== null);
  if (!focusables.length) return () => {};
  const first = focusables[0], last = focusables[focusables.length - 1];

  function onKey(e) {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
  modal.addEventListener('keydown', onKey);
  return () => modal.removeEventListener('keydown', onKey);
}

let releaseFocusTrap = null;

function openModalById(id, openerEl) {
  const modal = document.getElementById(id);
  if (!modal) { console.warn('[modal] not found:', id); return; }
  if (openerEl && !openerEl.id) openerEl.id = 'opener-' + Math.random().toString(36).slice(2);
  if (openerEl) modal.dataset.opener = openerEl.id;

  modal.setAttribute('aria-hidden', 'false');
  lockScroll();
  rebuildPdfs(modal);
  (modal.querySelector('.close') || modal.querySelector('.modal-content'))?.focus();

  if (releaseFocusTrap) releaseFocusTrap();
  releaseFocusTrap = trapFocus(modal);

  // 若你有 PDF 頁面控制器
  if (typeof initPdfControls === 'function') initPdfControls(modal);
}

function closeModal(modal) {
  if (!modal) return;
  teardownPdfs(modal);
  modal.setAttribute('aria-hidden', 'true');
  unlockScroll();
  if (releaseFocusTrap) { releaseFocusTrap(); releaseFocusTrap = null; }
  const opener = modal.dataset.opener && document.getElementById(modal.dataset.opener);
  opener?.focus();
}

// 1) .open-modal 按鈕
document.querySelectorAll('.open-modal').forEach(btn => {
  if (btn.tagName === 'BUTTON' && !btn.getAttribute('type')) btn.setAttribute('type', 'button');
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation(); // 避免事件冒到外層 .slide
    const id = btn.getAttribute('data-target');
    if (id) openModalById(id, btn);
  });
});

// 2) 可點擊的 slide（點空白處才開，一律忽略 .slidebtn）
document.querySelectorAll('.slide[data-target]').forEach(slide => {
  slide.addEventListener('click', (e) => {
    if (e.target.closest('.slidebtn')) return;
    const id = slide.getAttribute('data-target');
    if (id) openModalById(id, slide);
  });
});

// 3) 關閉（×、Backdrop、Esc）
document.querySelectorAll('.modal .close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => closeModal(closeBtn.closest('.modal')));
});
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target !== m) return;
    closeModal(m);
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.modal[aria-hidden="false"]').forEach(closeModal);
});

/* -----------------------------
   PDF Prev/Next controls (optional, robust)
----------------------------- */

// 取得目前 modal 中的 PDF <object>（可能每次翻頁都被替換）
function getPdfObject(modal) {
  // 行動裝置是 iframe，這段只服務桌機 object 的翻頁
  return modal?.querySelector('object[type="application/pdf"]') || null;
}

function setPdfPage(modal, newPage) {
  try {
    const obj = getPdfObject(modal);
    if (!modal || !obj) return;

    const base = obj.getAttribute('data-src') || obj.getAttribute('data') || '';
    if (!base) return;

    const total = parseInt(obj.getAttribute('data-pages') || '0', 10);
    let page = parseInt(newPage, 10);
    if (!Number.isFinite(page) || page < 1) page = 1;
    if (total && page > total) page = total;

    obj.setAttribute('data-page', String(page));

    const url = base.replace(/#.*$/, '') + `#page=${page}&view=FitH&ts=${Date.now()}`;
    const fresh = obj.cloneNode(false);
    for (const { name, value } of Array.from(obj.attributes)) {
      if (name !== 'data') fresh.setAttribute(name, value);
    }
    fresh.setAttribute('data', url);
    obj.replaceWith(fresh);

    const controls = modal.querySelector('.pdf-controls');
    if (controls) {
      const pageEl = controls.querySelector('.pdf-page');
      if (pageEl) pageEl.textContent = String(page);
      const pagesEl = controls.querySelector('.pdf-pages');
      if (pagesEl) pagesEl.textContent = total ? String(total) : '';
    }
  } catch (err) {
    console.warn('[setPdfPage] failed:', err);
  }
}

function initPdfControls(modal) {
  try {
    const controls = modal?.querySelector('.pdf-controls');
    const obj = getPdfObject(modal);
    if (!controls || !obj) return;

    if (controls.dataset.bound === 'true') {
      const current = parseInt(obj.getAttribute('data-page') || '1', 10);
      setPdfPage(modal, current);
      return;
    }
    controls.dataset.bound = 'true';

    const current = parseInt(obj.getAttribute('data-page') || '1', 10);
    setPdfPage(modal, current);

    const prevBtn = controls.querySelector('.pdf-prev');
    const nextBtn = controls.querySelector('.pdf-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        const live = getPdfObject(modal);
        const p = parseInt(live?.getAttribute('data-page') || '1', 10) - 1;
        setPdfPage(modal, p);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const live = getPdfObject(modal);
        const p = parseInt(live?.getAttribute('data-page') || '1', 10) + 1;
        setPdfPage(modal, p);
      });
    }

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevBtn?.click(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn?.click(); }
    });
  } catch (err) {
    console.warn('[initPdfControls] failed:', err);
  }
}

/* -----------------------------
   Project image toggle
----------------------------- */
const toggleBtn = document.getElementById('toggle-image');
if (toggleBtn) {
  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const img = document.getElementById('project-image');
    if (!img) return;
    if (img.src.includes("project.png")) {
      img.src = "Figures/ops.png.jpg";
      img.alt = "OPS slide illustration";
      toggleBtn.textContent = "Show Project";
    } else {
      img.src = "slides/project.png";
      img.alt = "Project slide illustration";
      toggleBtn.textContent = "Show OPS";
    }
  });
}

/* -----------------------------
   Contact form (demo)
----------------------------- */
const contact = document.getElementById('contactForm');
if (contact) {
  contact.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Message captured locally for demo.');
    e.target.reset();
  });
}
