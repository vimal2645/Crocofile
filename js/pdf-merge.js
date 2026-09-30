(function () {
  const { PDFDocument } = PDFLib;
  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const list = document.getElementById('list');
  const runBtn = document.getElementById('run');
  const resultEl = document.getElementById('result');

  let files = [];

  setupDropZone(zone, input, {
    accept: 'application/pdf',
    multiple: true,
    onFiles: incoming => {
      const valid = incoming.filter(isPDF);
      if (!valid.length) return showToast('Only PDFs are accepted.', 'error');
      files = files.concat(valid);
      resultEl.classList.add('hidden');
      renderList();
    }
  });

  function renderList() {
    list.innerHTML = '';
    files.forEach((f, i) => {
      const d = document.createElement('div');
      d.className = 'item';
      d.draggable = true;
      const label = document.createElement('span');
      label.textContent = (i + 1) + '. ' + f.name + ' (' + formatBytes(f.size) + ')';
      d.appendChild(label);
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = '×';
      b.onclick = () => { files.splice(i, 1); renderList(); };
      d.appendChild(b);

      d.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', String(i));
        event.dataTransfer.effectAllowed = 'move';
      });
      d.addEventListener('dragover', event => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
      });
      d.addEventListener('drop', event => {
        event.preventDefault();
        const from = Number(event.dataTransfer.getData('text/plain'));
        if (!Number.isInteger(from) || from < 0 || from >= files.length || from === i) return;
        const [moved] = files.splice(from, 1);
        files.splice(i, 0, moved);
        renderList();
      });

      list.appendChild(d);
    });
    runBtn.disabled = files.length < 2;
  }

  runBtn.addEventListener('click', async () => {
    showSpinner(runBtn, 'Merging...');
    try {
      const out = await PDFDocument.create();
      for (const f of files) {
        const buf = await f.arrayBuffer();
        const src = await PDFDocument.load(buf);
        const pages = await out.copyPages(src, src.getPageIndices());
        pages.forEach(p => out.addPage(p));
      }
      const bytes = await out.save();
      renderDownloadResults(resultEl, [
        { blob: new Blob([bytes], { type: 'application/pdf' }), filename: 'merged.pdf' }
      ], 'Merged PDF ready.');
    } catch (e) {
      console.error(e);
      showToast('Merge failed.', 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();