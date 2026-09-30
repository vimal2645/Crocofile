(function () {
  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const runBtn = document.getElementById('run');
  const targetEl = document.getElementById('target');
  const resultEl = document.getElementById('result');

  let currentFile = null;
  let currentBlob = null;

  setupDropZone(zone, input, {
    accept: 'image/jpeg,image/png,image/webp',
    multiple: false,
    onFiles: files => {
      const f = files[0];
      if (!isImage(f)) return showToast('Please select a JPG, PNG, or WebP.', 'error');
      currentFile = f;
      currentBlob = null;
      zone.querySelector('p strong').textContent = f.name + ' (' + formatBytes(f.size) + ')';
      runBtn.disabled = false;
      resultEl.classList.add('hidden');
    }
  });

  function loadImage(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Image could not be loaded')); };
      img.src = url;
    });
  }

  function render(img, scale, quality) {
    const MAX_DIM = 4000;

    let w = Math.round(img.width * scale);
    let h = Math.round(img.height * scale);

    if (w > MAX_DIM) { h = Math.round(h * MAX_DIM / w); w = MAX_DIM; }
    if (h > MAX_DIM) { w = Math.round(w * MAX_DIM / h); h = MAX_DIM; }
    if (w < 1) w = 1;
    if (h < 1) h = 1;

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    return new Promise((res, rej) => {
      canvas.toBlob(
        b => b ? res(b) : rej(new Error('Canvas export failed')),
        'image/jpeg',
        quality
      );
    });
  }

  async function compressToTarget(file, targetKB) {
    const img = await loadImage(file);
    const targetBytes = targetKB * 1024;

    const scales = [1.0, 0.85, 0.7, 0.55, 0.4, 0.28];
    const qualities = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4, 0.3, 0.2];

    let smallest = null;

    for (const scale of scales) {
      for (const q of qualities) {
        const blob = await render(img, scale, q);
        if (!smallest || blob.size < smallest.size) smallest = blob;
        if (blob.size <= targetBytes) return blob;
      }
    }
    return smallest;
  }

  runBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    const targetKB = parseInt(targetEl.value, 10) || 100;
    if (targetKB < 10) return showToast('Target must be at least 10KB.', 'error');

    showSpinner(runBtn, 'Compressing...');
    resultEl.classList.add('hidden');

    try {
      currentBlob = await compressToTarget(currentFile, targetKB);

      if (!currentBlob) throw new Error('No output produced');

      const ok = currentBlob.size <= targetKB * 1024;
      const originalMB = (currentFile.size / (1024 * 1024)).toFixed(2);
      const finalKB = (currentBlob.size / 1024).toFixed(1);

      resultEl.classList.remove('hidden');
      resultEl.innerHTML =
        'Original: <strong>' + originalMB + ' MB</strong>' +
        ' → Compressed: <span class="' + (ok ? 'ok' : 'warn') + '">' +
        finalKB + ' KB</span>' +
        (ok
          ? ''
          : '<br><small>Could not reach ' + targetKB + 'KB. Smallest possible: ' +
            finalKB + 'KB.</small>') +
        '<br><br><button class="btn" id="download">Download</button>';

      document.getElementById('download').addEventListener('click', () => {
        downloadBlob(currentBlob, 'compressed.jpg');
      });
    } catch (e) {
      console.error(e);
      showToast('Compression failed: ' + e.message, 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();