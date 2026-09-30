(function () {
  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const runBtn = document.getElementById('run');
  const resultEl = document.getElementById('result');
  const pageSizeEl = document.getElementById('pageSize');
  const orientationEl = document.getElementById('orientation');
  const fitModeEl = document.getElementById('fitMode');
  const repeatHeaderEl = document.getElementById('repeatHeader');
  const repeatFirstColsEl = document.getElementById('repeatFirstCols');
  const watermarkEl = document.getElementById('watermark');
  const headerTextEl = document.getElementById('headerText');
  const footerTextEl = document.getElementById('footerText');
  const bookmarksEl = document.getElementById('bookmarks');
  const passwordProtectEl = document.getElementById('passwordProtect');
  const passwordEl = document.getElementById('password');

  let file = null;

  setupDropZone(zone, input, {
    accept: '.csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv',
    multiple: false,
    onFiles: incoming => {
      const selected = incoming[0];
      if (!selected) return;
      const isSpreadsheet = /\.(csv|xls|xlsx)$/i.test(selected.name) || /^text\/csv$/i.test(selected.type) || /excel/i.test(selected.type);
      if (!isSpreadsheet) {
        showToast('Please choose a CSV, XLS, or XLSX file.', 'error');
        return;
      }
      file = selected;
      window.renderSelectedFile(zone, file);
      runBtn.disabled = false;
      resultEl.classList.add('hidden');
    }
  });

  function getSettings() {
    return {
      pageSize: pageSizeEl ? pageSizeEl.value : 'a4',
      orientation: orientationEl ? orientationEl.value : 'portrait',
      fitMode: fitModeEl ? fitModeEl.value : 'width',
      repeatHeaderRow: !!(repeatHeaderEl && repeatHeaderEl.checked),
      repeatFirstCols: Number(repeatFirstColsEl ? repeatFirstColsEl.value : 0),
      watermark: watermarkEl ? watermarkEl.value.trim() : '',
      headerText: headerTextEl ? headerTextEl.value.trim() : '',
      footerText: footerTextEl ? footerTextEl.value.trim() : '',
      bookmarks: !!(bookmarksEl && bookmarksEl.checked),
      password: passwordProtectEl && passwordProtectEl.checked && passwordEl ? passwordEl.value : ''
    };
  }

  runBtn.addEventListener('click', async () => {
    if (!file) {
      showToast('Please choose a spreadsheet file first.', 'error');
      return;
    }

    showSpinner(runBtn, 'Converting...');
    try {
      const excelLib = window.excelintopdf || window.excelIntoPdf || (window.excelintopdf && window.excelintopdf.default);
      const readWorkbook = (excelLib && (excelLib.readWorkbook || excelLib.default && excelLib.default.readWorkbook));
      const buildPdf = (excelLib && (excelLib.buildPdf || excelLib.default && excelLib.default.buildPdf));
      const defaultSettings = (excelLib && (excelLib.DEFAULT_SETTINGS || excelLib.default && excelLib.default.DEFAULT_SETTINGS));

      if (!readWorkbook || !buildPdf) {
        throw new Error('excelintopdf library is not available.');
      }

      const workbook = await readWorkbook(file);
      if (passwordProtectEl && passwordProtectEl.checked && !passwordEl.value) {
        throw new Error('Enter a password to protect the PDF.');
      }
      const settings = Object.assign({}, defaultSettings || {}, getSettings());
      const result = await buildPdf({
        sheets: workbook,
        settings,
        title: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name
      });

      if (!result || !result.doc || typeof result.doc.output !== 'function') {
        throw new Error('No PDF output was generated.');
      }
      const blob = result.doc.output('blob');

      renderDownloadResults(resultEl, [{ blob, filename: file.name.replace(/\.[^.]+$/, '') + '.pdf' }], 'PDF created.');
      showToast('PDF created.', 'success');
    } catch (error) {
      console.error('Spreadsheet to PDF conversion failed:', error);
      resultEl.textContent = 'Conversion failed. Please try a simpler document.';
      resultEl.classList.remove('hidden');
      showToast('Conversion failed. Please try a simpler document.', 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();
