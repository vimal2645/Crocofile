(function () {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
  const { PDFDocument } = PDFLib;

  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const runBtn = document.getElementById('run');
  const targetEl = document.getElementById('target');
  const resultEl = document.getElementById('result');

  let currentFile = null;
  let currentBlob = null;

  const requestedTarget = new URLSearchParams(window.location.search).get('target');
  if (['100', '200', '500'].includes(requestedTarget)) targetEl.value = requestedTarget;

  setupDropZone(zone, input, {
    accept: 'application/pdf',
    multiple: false,
    onFiles: files => {
      const f = files[0];
      if (!isPDF(f)) return showToast('Please select a PDF.', 'error');
      if (!maxSizeCheck(f, 50)) return showToast('File too large (max 50MB).', 'error');
      currentFile = f;
      currentBlob = null;
      zone.querySelector('p strong').textContent = f.name + ' (' + formatBytes(f.size) + ')';
      runBtn.disabled = false;
      resultEl.classList.add('hidden');
    }
  });

  document.querySelectorAll('[data-preset]').forEach(b =>
    b.addEventListener('click', () => { targetEl.value = b.dataset.preset; })
  );

  async function compressToTarget(file, targetKB, onProgress) {
    const buf = await file.arrayBuffer();
    const targetBytes = targetKB * 1024;
    const sourceBlob = new Blob([buf], { type: 'application/pdf' });
    if (sourceBlob.size <= targetBytes) return sourceBlob;

    const srcDoc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;

    let scale = 1.5;
    let quality = 0.7;
    let smallest = sourceBlob;

    for (let attempt = 0; attempt < 8; attempt++) {
      const newDoc = await PDFDocument.create();

      for (let i = 1; i <= srcDoc.numPages; i++) {
        onProgress(attempt + 1, i, srcDoc.numPages);
        const page = await srcDoc.getPage(i);
        const viewport = page.getViewport({ scale });
        const pageSize = page.getViewport({ scale: 1 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        await page.render({ canvasContext: ctx, viewport }).promise;

        const jpgBlob = await new Promise((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas export failed'));
          }, 'image/jpeg', quality);
        });
        const jpgBytes = await jpgBlob.arrayBuffer();
        const jpg = await newDoc.embedJpg(jpgBytes);

        const p = newDoc.addPage([pageSize.width, pageSize.height]);
        p.drawImage(jpg, { x: 0, y: 0, width: pageSize.width, height: pageSize.height });
        canvas.width = 0;
        canvas.height = 0;
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      const bytes = await newDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });

      if (!smallest || blob.size < smallest.size) smallest = blob;
      if (blob.size <= targetBytes) return blob;

      quality -= 0.08;
      if (quality < 0.3) { quality = 0.55; scale -= 0.2; }
      if (scale < 0.4) break;
    }

    return smallest;
  }

  runBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    const targetKB = parseInt(targetEl.value, 10) || 200;
    showSpinner(runBtn, 'Compressing...');
    resultEl.classList.add('hidden');

    try {
      currentBlob = await compressToTarget(currentFile, targetKB, (attempt, page, total) => {
        runBtn.innerHTML = '<span class="spinner"></span>Attempt ' + attempt + '/8, page ' + page + '/' + total;
      });
      if (!currentBlob) throw new Error('No output produced');

      const ok = currentBlob.size <= targetKB * 1024;
      const alreadyWithinTarget = currentFile.size <= targetKB * 1024;

      resultEl.classList.remove('hidden');
      resultEl.innerHTML =
        'Original: <strong>' + formatBytes(currentFile.size) + '</strong>' +
        ' → Compressed: <span class="' + (ok ? 'ok' : 'warn') + '">' +
        formatBytes(currentBlob.size) + '</span>' +
        (alreadyWithinTarget ? '<br><small>Original already met the target and was retained.</small>' : '') +
        (ok ? '' : '<br><small>Target not reached. This is the smallest result found.</small>') +
        '<br><br><button class="btn" id="download">Download</button>';

      document.getElementById('download').addEventListener('click', () => {
        downloadBlob(currentBlob, 'compressed.pdf');
      });
    } catch (e) {
      console.error(e);
      showToast('Compression failed: ' + e.message, 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();