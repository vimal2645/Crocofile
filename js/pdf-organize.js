(function () {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
  const { PDFDocument } = PDFLib;

  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const thumbsEl = document.getElementById('thumbs');
  const runBtn = document.getElementById('run');
  const resultEl = document.getElementById('result');

  let srcBytes = null;
  let order = [];

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
    order = Array.from({ length: doc.numPages }, (_, i) => i);
    thumbsEl.innerHTML = '';
    const cache = [];

    for (let i = 0; i < doc.numPages; i++) {
      const page = await doc.getPage(i + 1);
      const vp = page.getViewport({ scale: 0.3 });
      const canvas = document.createElement('canvas');
      canvas.width = vp.width;
      canvas.height = vp.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
      cache.push(canvas.toDataURL());
    }

    buildDOM(cache);
  }

  function buildDOM(cache) {
    thumbsEl.innerHTML = '';
    order.forEach((origIdx, pos) => {
      const div = document.createElement('div');
      div.className = 'thumb';
      div.draggable = true;
      div.dataset.pos = pos;
      div.innerHTML =
        '<img src="' + cache[origIdx] + '">' +
        '<button class="del" title="Delete">×</button>' +
        '<span class="label">' + (pos + 1) + '</span>';

      div.querySelector('.del').onclick = e => {
        e.stopPropagation();
        order.splice(pos, 1);
        buildDOM(cache);
      };

      div.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', pos));
      div.addEventListener('dragover', e => e.preventDefault());
      div.addEventListener('drop', e => {
        e.preventDefault();
        const from = +e.dataTransfer.getData('text/plain');
        const [moved] = order.splice(from, 1);
        order.splice(pos, 0, moved);
        buildDOM(cache);
      });

      thumbsEl.appendChild(div);
    });
  }

  runBtn.addEventListener('click', async () => {
    if (!srcBytes || !order.length) return showToast('Nothing to save.', 'error');
    showSpinner(runBtn, 'Saving...');
    try {
      const src = await PDFDocument.load(srcBytes.slice(0));
      const out = await PDFDocument.create();
      const copied = await out.copyPages(src, order);
      copied.forEach(p => out.addPage(p));
      const bytes = await out.save();
      renderDownloadResults(resultEl, [
        { blob: new Blob([bytes], { type: 'application/pdf' }), filename: 'organized.pdf' }
      ], 'Organized PDF ready.');
    } catch (e) {
      console.error(e);
      showToast('Failed.', 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();