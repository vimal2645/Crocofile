(function () {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
  const { PDFDocument } = PDFLib;

  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const thumbsEl = document.getElementById('thumbs');
  const runBtn = document.getElementById('run');
  const allBtn = document.getElementById('all');
  const resultEl = document.getElementById('result');

  let srcBytes = null;
  let selected = new Set();

  setupDropZone(zone, input, {
    accept: 'application/pdf',
    multiple: false,
    onFiles: async files => {
      const f = files[0];
      if (!isPDF(f)) return showToast('Please select a PDF.', 'error');
      resultEl.classList.add('hidden');
      srcBytes = await f.arrayBuffer();
      await renderThumbs(srcBytes);
      runBtn.disabled = false;
    }
  });

  async function renderThumbs(buf) {
    const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
    selected.clear();
    thumbsEl.innerHTML = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const vp = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

      const div = document.createElement('div');
      div.className = 'thumb';
      div.dataset.idx = i - 1;
      div.innerHTML = '<img src="' + canvas.toDataURL() + '"><span class="label">' + i + '</span>';
      div.addEventListener('click', () => {
        const idx = +div.dataset.idx;
        if (selected.has(idx)) selected.delete(idx);
        else selected.add(idx);
        div.classList.toggle('selected');
      });
      thumbsEl.appendChild(div);
    }
  }

  allBtn.onclick = () => {
    document.querySelectorAll('.thumb').forEach(t => {
      selected.add(+t.dataset.idx);
      t.classList.add('selected');
    });
  };

  runBtn.addEventListener('click', async () => {
    if (!srcBytes || !selected.size) return showToast('Select pages first.', 'error');
    showSpinner(runBtn, 'Extracting...');
    try {
      const src = await PDFDocument.load(srcBytes.slice(0));
      const out = await PDFDocument.create();
      const idx = Array.from(selected).sort((a, b) => a - b);
      const copied = await out.copyPages(src, idx);
      copied.forEach(p => out.addPage(p));
      const bytes = await out.save();
      renderDownloadResults(resultEl, [
        { blob: new Blob([bytes], { type: 'application/pdf' }), filename: 'extracted.pdf' }
      ], 'Extracted PDF ready.');
    } catch (e) {
      console.error(e);
      showToast('Failed.', 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();