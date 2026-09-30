(function () {
  const { PDFDocument } = PDFLib;
  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const runBtn = document.getElementById('run');
  const controls = document.getElementById('controls');
  const rangesEl = document.getElementById('ranges');
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
      controls.classList.remove('hidden');
      runBtn.disabled = false;
    }
  });

  document.querySelectorAll('input[name="mode"]').forEach(r =>
    r.addEventListener('change', () => {
      const isRange = document.querySelector('input[name="mode"]:checked').value === 'range';
      rangesEl.classList.toggle('hidden', !isRange);
    })
  );

  function parseRanges(str, max) {
    const out = [];
    str.split(',').forEach(part => {
      part = part.trim();
      if (!part) return;
      const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
      if (m) {
        const a = Math.max(1, +m[1]), b = Math.min(max, +m[2]);
        for (let i = a; i <= b; i++) out.push(i);
      } else if (/^\d+$/.test(part)) {
        const n = +part;
        if (n >= 1 && n <= max) out.push(n);
      }
    });
    return out;
  }

  runBtn.addEventListener('click', async () => {
    if (!currentFile) return;
    const mode = document.querySelector('input[name="mode"]:checked').value;
    showSpinner(runBtn, 'Splitting...');
    try {
      const buf = await currentFile.arrayBuffer();
      const src = await PDFDocument.load(buf);
      const total = src.getPageCount();
      const outputs = [];

      if (mode === 'every') {
        for (let i = 0; i < total; i++) {
          const doc = await PDFDocument.create();
          const [p] = await doc.copyPages(src, [i]);
          doc.addPage(p);
          const bytes = await doc.save();
          outputs.push({
            blob: new Blob([bytes], { type: 'application/pdf' }),
            filename: 'page-' + (i + 1) + '.pdf'
          });
        }
      } else {
        const pages = parseRanges(rangesEl.value, total);
        if (!pages.length) { hideSpinner(runBtn); return showToast('Invalid ranges.', 'error'); }
        const doc = await PDFDocument.create();
        const copied = await doc.copyPages(src, pages.map(n => n - 1));
        copied.forEach(p => doc.addPage(p));
        const bytes = await doc.save();
        outputs.push({ blob: new Blob([bytes], { type: 'application/pdf' }), filename: 'split.pdf' });
      }
      renderDownloadResults(resultEl, outputs, outputs.length + ' PDF file(s) ready.');
    } catch (e) {
      console.error(e);
      showToast('Split failed.', 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();