(function () {
  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const runBtn = document.getElementById('run');
  const resultEl = document.getElementById('result');

  let file = null;

  setupDropZone(zone, input, {
    accept: '.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    multiple: false,
    onFiles: incoming => {
      const selected = incoming[0];
      if (!selected) return;
      const isWord = /\.(doc|docx)$/i.test(selected.name);
      if (!isWord) {
        showToast('Please choose a DOC or DOCX file.', 'error');
        return;
      }
      file = selected;
      window.renderSelectedFile(zone, file);
      runBtn.disabled = false;
      resultEl.classList.add('hidden');
    }
  });

  runBtn.addEventListener('click', async () => {
    if (!file) {
      showToast('Please choose a Word file first.', 'error');
      return;
    }

    showSpinner(runBtn, 'Converting...');
    try {
      const ReamCtor = window.Ream || (window.reamkit && window.reamkit.Ream) || (window.ReamKit && window.ReamKit.Ream);
      if (!ReamCtor || typeof ReamCtor.parse !== 'function') {
        throw new Error('Ream library is not available.');
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const doc = ReamCtor.parse(bytes);
      const pdfBytes = await doc.convert('pdf');

      const outputName = file.name.replace(/\.[^.]+$/, '') + '.pdf';
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      renderDownloadResults(resultEl, [{ blob, filename: outputName }], 'PDF created.');
      showToast('PDF created.', 'success');
    } catch (error) {
      console.error('Word to PDF conversion failed:', error);
      resultEl.textContent = 'Conversion failed. Please try a simpler document.';
      resultEl.classList.remove('hidden');
      showToast('Conversion failed. Please try a simpler document.', 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();
