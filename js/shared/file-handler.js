window.formatBytes = function (bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

window.setupDropZone = function (zone, input, opts) {
  opts = opts || {};
  const accept = opts.accept || '';
  const multiple = opts.multiple || false;
  const onFiles = opts.onFiles || function () {};

  if (accept) input.accept = accept;
  input.multiple = multiple;
  zone.tabIndex = 0;
  zone.setAttribute('role', 'button');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  });

  ['dragenter', 'dragover'].forEach(ev =>
    zone.addEventListener(ev, e => {
      e.preventDefault();
      zone.classList.add('dragover');
    })
  );

  ['dragleave', 'drop'].forEach(ev =>
    zone.addEventListener(ev, e => {
      e.preventDefault();
      zone.classList.remove('dragover');
    })
  );

  zone.addEventListener('drop', e => {
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(multiple ? files : [files[0]]);
  });

  input.addEventListener('change', e => {
    const files = Array.from(e.target.files);
    if (files.length) onFiles(multiple ? files : [files[0]]);
    input.value = '';
  });
};

window.renderSelectedFile = function (zone, file) {
  if (!zone || !file) return;
  
  if (!zone.dataset.originalHtml) {
    zone.dataset.originalHtml = zone.innerHTML;
  }
  
  zone.innerHTML = `
    <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #4CAF50;">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
      <div><strong>Selected: ${file.name}</strong></div>
      <div style="font-size:12px; color:#aaa;">${window.formatBytes(file.size)}</div>
      <div style="font-size:12px; color:#888; margin-top:4px;">(Click or drop to change file)</div>
    </div>
  `;
};