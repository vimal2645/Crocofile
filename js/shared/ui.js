window.showToast = function (msg, type) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.className = 'toast'; }, 3200);
};

window.showSpinner = function (btn, text) {
  if (!btn) return;
  btn._original = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>' + (text || 'Working...');
};

window.hideSpinner = function (btn) {
  if (!btn) return;
  btn.disabled = false;
  if (btn._original) btn.innerHTML = btn._original;
};