(function () {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
  const { PDFDocument, degrees } = PDFLib;

  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const thumbsEl = document.getElementById('thumbs');
  const runBtn = document.getElementById('run');
  const resultEl = document.getElementById('result');

  let srcBytes = null;
  let previewDoc = null;
  let rotations = [];
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
    previewDoc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
    rotations = [];
    selected.clear();

    for (let i = 1; i <= previewDoc.numPages; i++) {
      const page = await previewDoc.getPage(i);
      rotations.push(((page.rotate % 360) + 360) % 360);
    }

    await renderPageThumbs();
  }

  async function renderPageThumbs() {
    thumbsEl.innerHTML = '';

    for (let i = 1; i <= previewDoc.numPages; i++) {
      const page = await previewDoc.getPage(i);
      const vp = page.getViewport({ scale: 0.3, rotation: rotations[i - 1] });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;

      const div = document.createElement('div');
      div.className = 'thumb';
      div.dataset.idx = i - 1;
      div.classList.toggle('selected', selected.has(i - 1));
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

  async function rotateSelected(delta) {
    const targets = selected.size ? Array.from(selected) : rotations.map((_, i) => i);
    targets.forEach(i => { rotations[i] = (rotations[i] + delta + 360) % 360; });
    await renderPageThumbs();
    showToast('Rotated ' + targets.length + ' page(s).', 'success');
  }

  document.getElementById('all').onclick = () => {
    selected = new Set(rotations.map((_, i) => i));
    document.querySelectorAll('.thumb').forEach(t => t.classList.add('selected'));
  };
  document.getElementById('left').onclick = () => rotateSelected(-90);
  document.getElementById('right').onclick = () => rotateSelected(90);

  runBtn.addEventListener('click', async () => {
    if (!srcBytes) return;
    showSpinner(runBtn, 'Saving...');
    try {
      const doc = await PDFDocument.load(srcBytes.slice(0));
      doc.getPages().forEach((p, i) => p.setRotation(degrees(rotations[i])));
      const bytes = await doc.save();
      renderDownloadResults(resultEl, [
        { blob: new Blob([bytes], { type: 'application/pdf' }), filename: 'rotated.pdf' }
      ], 'Rotated PDF ready.');
    } catch (e) {
      console.error(e);
      showToast('Failed.', 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();