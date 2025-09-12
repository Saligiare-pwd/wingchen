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

// ----- Slides 游標控制：當 active slide 可點，容器顯示手指 -----
(() => {
  const root = document.querySelector('.slides');
  if (!root) return;

  function updateSlidesCursor() {
    const clickable = !!root.querySelector('.slide.active[data-target]');
    root.classList.toggle('is-clickable', clickable);
  }

  // 1) 進場先判斷一次
  updateSlidesCursor();

  // 2) 監看 slide 的 class 變化（tabs 切換會改 .active）
  const mo = new MutationObserver(() => updateSlidesCursor());
  mo.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });

  // 3) 保險：tab 按鈕點擊後也跑一次（鍵盤左右切換也會被 MutationObserver 捕捉）
  document.querySelectorAll('.tabbtn').forEach(btn => {
    btn.addEventListener('click', updateSlidesCursor);
  });
})();

/* -----------------------------
   Contact form → Google Sheets (via GAS)
----------------------------- */
(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const submitBtn = document.getElementById('cf-submit');
  const status = document.getElementById('contact-status');
  const draftKey = form.dataset.autosave || 'contact-draft';
  const endpoint = form.action;  // GAS Web App URL
  const SECRET_TOKEN = '';       // 可選：填寫後需同步到 GAS 的 expectedToken

  const setBusy = (on) => {
    if (!submitBtn) return;
    submitBtn.setAttribute('aria-busy', on ? 'true' : 'false');
  };
  const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  // 簡易錯誤顯示
  function ensureErrorBox(input) {
    if (input.nextElementSibling && input.nextElementSibling.classList?.contains('form-error')) return input.nextElementSibling;
    const box = document.createElement('div');
    box.className = 'form-error';
    box.setAttribute('aria-live', 'polite');
    input.insertAdjacentElement('afterend', box);
    return box;
  }

  // 自動存草稿
  function saveDraft() {
    const data = new FormData(form);
    const obj = Object.fromEntries(data.entries());
    try { localStorage.setItem(draftKey, JSON.stringify(obj)); } catch {}
  }
  function restoreDraft() {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const obj = JSON.parse(raw);
      for (const [k, v] of Object.entries(obj)) {
        const field = form.querySelector(`[name="${k}"]`);
        if (field && 'value' in field) field.value = v;
      }
    } catch {}
  }
  restoreDraft();
  form.addEventListener('input', saveDraft);

  // 即時驗證
  ['input', 'blur'].forEach(evt => {
    form.addEventListener(evt, (e) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (!['INPUT','TEXTAREA'].includes(t.tagName)) return;
      const el = /** @type {HTMLInputElement|HTMLTextAreaElement} */(t);
      const box = ensureErrorBox(el); box.textContent = '';
      if (el.hasAttribute('required') && !el.value.trim()) {
        box.textContent = 'This field is required.';
      } else if (el.id === 'cf-email' && el.value && !emailOk(el.value.trim())) {
        box.textContent = 'Please enter a valid email.';
      } else if (el.minLength > 0 && el.value.length > 0 && el.value.length < el.minLength) {
        box.textContent = `Please enter at least ${el.minLength} characters.`;
      }
    }, true);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // 蜜罐（隱藏欄位）— 有值表示機器人，靜默中止
    const hp = form.querySelector('input[name="website"]');
    if (hp && hp.value) return;

    // 本地驗證
    const name = /** @type {HTMLInputElement} */(form.querySelector('#cf-name'));
    const email = /** @type {HTMLInputElement} */(form.querySelector('#cf-email'));
    const message = /** @type {HTMLTextAreaElement} */(form.querySelector('#cf-message'));
    const consent = /** @type {HTMLInputElement} */(form.querySelector('#cf-consent'));
    const fields = [name, email, message, consent].filter(Boolean);

    let hasError = false;
    fields.forEach(f => {
      const box = ensureErrorBox(f); box.textContent = '';
      if (f === consent && !consent.checked) { box.textContent = 'Please provide consent.'; hasError = true; return; }
      if (f.hasAttribute('required') && !f.value.trim()) { box.textContent = 'This field is required.'; hasError = true; }
      else if (f === email && !emailOk(email.value.trim())) { box.textContent = 'Please enter a valid email.'; hasError = true; }
      else if (f === message && message.value.trim().length < 10) { box.textContent = 'Please write a bit more (≥ 10 chars).'; hasError = true; }
    });
    if (hasError) { status.textContent = 'Please fix the highlighted fields.'; return; }

    setBusy(true);
    status.textContent = '';

    try {
      // 用 x-www-form-urlencoded 避免 CORS 預檢（Apps Script 無法處理 OPTIONS）
      const payload = new URLSearchParams({
        name: name.value.trim(),
        email: email.value.trim(),
        message: message.value.trim(),
        referrer: location.href,
        userAgent: navigator.userAgent,
        token: SECRET_TOKEN || '',
        website: '' // 蜜罐
      });

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: payload.toString()
      });

      // Apps Script web app 回傳 200/200-like；解析文字再嘗試 JSON
      const text = await res.text();
      let ok = res.ok;
      try { const j = JSON.parse(text || '{}'); ok = ok && j.ok !== false; } catch {}
      if (!ok) throw new Error('Submit failed');

      form.reset();
      try { localStorage.removeItem(draftKey); } catch {}
      const okBox = document.createElement('div');
      okBox.className = 'form-banner';
      okBox.textContent = 'Thanks! Your message was sent successfully.';
      form.appendChild(okBox);
    } catch (err) {
      const fail = document.createElement('div');
      fail.className = 'form-banner error';
      fail.textContent = 'Sorry, something went wrong. Please try again or email me directly.';
      form.appendChild(fail);
      console.warn('[contact→sheets] error:', err);
    } finally {
      setBusy(false);
    }
  });
})();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
