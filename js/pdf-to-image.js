(function () {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';

  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const runBtn = document.getElementById('run');
  const formatEl = document.getElementById('format');
  const scaleEl = document.getElementById('scale');
  const resultEl = document.getElementById('result');

  let currentFile = null;

  setupDropZone(zone, input, {
    accept: 'application/pdf',
    multiple: false,
    onFiles: files => {
      const f = files[0];
      if (!isPDF(f)) return showToast('Please select a PDF.', 'error');
      currentFile = f;
      resultEl.classList.add('hidden');
      zone.querySelector('p strong').textContent = f.name;
      runBtn.disabled = false;
    }
  });

  runBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    showSpinner(runBtn, 'Converting...');
    try {
      const outputs = [];
      const buf = await currentFile.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: buf }).promise;
      const fmt = formatEl.value;
      const scale = parseFloat(scaleEl.value);
      const ext = fmt === 'image/png' ? 'png' : 'jpg';

      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

        const blob = await new Promise((resolve, reject) => {
          canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('Could not export page ' + i));
          }, fmt, 0.92);
        });
        outputs.push({ blob, filename: 'page-' + i + '.' + ext });
      }
      renderDownloadResults(resultEl, outputs, outputs.length + ' page image(s) ready.');
      showToast('Done.', 'success');
    } catch (e) {
      console.error(e);
      showToast('Failed.', 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();