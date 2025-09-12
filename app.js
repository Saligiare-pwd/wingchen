/* -----------------------------
   Utilities
----------------------------- */

// Smooth scroll for in-page anchors
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id && id.length > 1) {
      e.preventDefault();
      document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Footer year
const y = document.getElementById('year');
if (y) y.textContent = new Date().getFullYear();

/* -----------------------------
   DAAD tabs (click + keyboard)
----------------------------- */
(() => {
  const tabs = Array.from(document.querySelectorAll('.tabbtn'));
  const slides = Array.from(document.querySelectorAll('.slide'));
  if (!tabs.length || !slides.length) return;

  const activate = (i) => {
    tabs.forEach((t, idx) => t.setAttribute('aria-selected', idx === i ? 'true' : 'false'));
    slides.forEach((s, idx) => s.classList.toggle('active', idx === i));
    tabs[i].focus();
  };

  tabs.forEach((t, i) => {
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
   Badges: same simple toggle
   + refresh inline PDFs on open
----------------------------- */
// Rebuild any <object type="application/pdf"> inside a container
function refreshInlinePdfs(container) {
  if (!container) return;
  container.querySelectorAll('object[type="application/pdf"]').forEach(oldObj => {
    const base = oldObj.getAttribute('data-src') || oldObj.getAttribute('data') || '';
    if (!base) return;
    const url = base.replace(/#.*$/, '') + '#view=FitH&ts=' + Date.now(); // fit + cache-bust
    const fresh = oldObj.cloneNode(false);
    // copy all attributes except data; then set fresh data
    for (const {name, value} of Array.from(oldObj.attributes)) {
      if (name !== 'data') fresh.setAttribute(name, value);
    }
    fresh.setAttribute('data', url);
    oldObj.replaceWith(fresh);
  });
}

document.querySelectorAll('.badge.pub').forEach(badge => {
  const slide = badge.querySelector('.summary-slide');
  const toggle = () => {
    const willOpen = !badge.classList.contains('open');
    badge.classList.toggle('open');
    badge.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (willOpen) refreshInlinePdfs(slide);
  };
  badge.addEventListener('click', (e) => {
    if (e.target.closest('a')) return;
    toggle();
  });
  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
});

/* -----------------------------
   Modals (direct listeners)
   + rebuild PDFs on open
   + unload PDFs on close
----------------------------- */
function rebuildPdfs(modal) {
  modal.querySelectorAll('object[type="application/pdf"]').forEach(oldObj => {
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
function teardownPdfs(modal) {
  modal.querySelectorAll('object[type="application/pdf"]').forEach(obj => {
    obj.setAttribute('data', 'about:blank'); // unload plugin
  });
}

// 開啟指定 id 的 modal（原樣保留）
function openModalById(id, openerEl) {
  const modal = document.getElementById(id);
  if (!modal) { console.warn('[modal] not found:', id); return; }
  if (openerEl && !openerEl.id) openerEl.id = 'opener-' + Math.random().toString(36).slice(2);
  if (openerEl) modal.dataset.opener = openerEl.id;

  modal.setAttribute('aria-hidden', 'false');
  // 若有嵌入 PDF，確保每次打開都重新載入
  if (typeof rebuildPdfs === 'function') rebuildPdfs(modal);
  (modal.querySelector('.close') || modal.querySelector('.modal-content'))?.focus();

  // 若你有 PDF 頁面控制器
  if (typeof initPdfControls === 'function') initPdfControls(modal);
}

// 1) 針對 .open-modal（含 .slidebtn）— 防止預設行為 + 阻止冒泡
document.querySelectorAll('.open-modal').forEach(btn => {
  // 若是 <button> 且沒指定 type，強制為 button 避免提交表單
  if (btn.tagName === 'BUTTON' && !btn.getAttribute('type')) btn.setAttribute('type', 'button');

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation(); // 重要：避免事件冒到外層 .slide
    const id = btn.getAttribute('data-target');
    if (id) openModalById(id, btn);
  });
});

// 2) 針對可點擊的 slide：只在「沒點到 .slidebtn」時才開共用 modal
document.querySelectorAll('.slide[data-target]').forEach(slide => {
  slide.addEventListener('click', (e) => {
    // 如果點擊源頭或其祖先是 .slidebtn，就不觸發 slide 的 modal
    if (e.target.closest('.slidebtn')) return;
    const id = slide.getAttribute('data-target');
    if (id) openModalById(id, slide);
  });
});

// 3) 關閉（× 按鈕）
document.querySelectorAll('.modal .close').forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    const modal = closeBtn.closest('.modal');
    if (!modal) return;
    if (typeof teardownPdfs === 'function') teardownPdfs(modal);
    modal.setAttribute('aria-hidden', 'true');
    const opener = modal.dataset.opener && document.getElementById(modal.dataset.opener);
    opener?.focus();
  });
});

// Close: clicking backdrop
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target !== m) return;
    teardownPdfs(m);
    m.setAttribute('aria-hidden', 'true');
    const opener = m.dataset.opener && document.getElementById(m.dataset.opener);
    opener?.focus();
  });
});

// Close: Esc key
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('.modal[aria-hidden="false"]').forEach(m => {
    teardownPdfs(m);
    m.setAttribute('aria-hidden', 'true');
    const opener = m.dataset.opener && document.getElementById(m.dataset.opener);
    opener?.focus();
  });
});

/* -----------------------------
   PDF Prev/Next controls (robust)
----------------------------- */

// Helper: always get the current PDF <object> (it gets replaced on every page change)
function getPdfObject(modal) {
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

    // Persist current page number
    obj.setAttribute('data-page', String(page));

    // Fresh URL (Fit width + cache-bust)
    const url = base.replace(/#.*$/, '') + `#page=${page}&view=FitH&ts=${Date.now()}`;

    // Rebuild the <object> to avoid stale plugin state
    const fresh = obj.cloneNode(false);
    for (const { name, value } of Array.from(obj.attributes)) {
      if (name !== 'data') fresh.setAttribute(name, value);
    }
    fresh.setAttribute('data', url);
    obj.replaceWith(fresh);

    // Update status UI if present
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
    if (!controls || !obj) return; // nothing to do if toolbar or pdf is missing

    // Avoid double-binding if modal opens multiple times
    if (controls.dataset.bound === 'true') {
      // Still sync the displayed page in case content was rebuilt
      const current = parseInt(obj.getAttribute('data-page') || '1', 10);
      setPdfPage(modal, current);
      return;
    }
    controls.dataset.bound = 'true';

    // Initial sync
    const current = parseInt(obj.getAttribute('data-page') || '1', 10);
    setPdfPage(modal, current);

    // Bind buttons (always re-read current page from live <object>)
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

    // Arrow keys while modal focused
    modal.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevBtn?.click(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nextBtn?.click(); }
    });

  } catch (err) {
    console.warn('[initPdfControls] failed:', err);
  }
}

// 切換 project.png <-> ops.png
const toggleBtn = document.getElementById('toggle-image');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
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
