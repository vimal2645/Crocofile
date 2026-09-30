(function () {
  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const runBtn = document.getElementById('run');
  const resultEl = document.getElementById('result');
  const htmlTextEl = document.getElementById('htmlText');
  const pageFormatEl = document.getElementById('pageFormat');
  const orientationEl = document.getElementById('orientation');
  const marginEl = document.getElementById('margin');
  const imageQualityEl = document.getElementById('imageQuality');
  const scaleEl = document.getElementById('scale');
  const headerTextEl = document.getElementById('headerText');
  const footerTextEl = document.getElementById('footerText');

  let file = null;

  setupDropZone(zone, input, {
    accept: '.html,.htm,text/html',
    multiple: false,
    onFiles: incoming => {
      const selected = incoming[0];
      if (!selected) return;
      const isHtml = /\.(html|htm)$/i.test(selected.name) || /^text\/html$/i.test(selected.type);
      if (!isHtml) {
        showToast('Please choose an HTML file.', 'error');
        return;
      }
      file = selected;
      window.renderSelectedFile(zone, file);
      runBtn.disabled = false;
      selected.text().then(text => {
        htmlTextEl.value = text || htmlTextEl.value;
      });
    }
  });

  function getRenderTarget() {
    const source = (file && htmlTextEl.value.trim() === '') ? '' : htmlTextEl.value.trim();
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.style.top = '0';
    wrapper.style.width = '800px';
    wrapper.style.padding = '20px';
    wrapper.style.background = '#fff';
    wrapper.style.color = '#111';
    wrapper.innerHTML = source || '<h1>Document</h1><p>Converted to PDF in your browser.</p>';
    document.body.appendChild(wrapper);
    return wrapper;
  }

  runBtn.addEventListener('click', async () => {
    showSpinner(runBtn, 'Creating PDF...');
    try {
      const converterFactory = window.htmlToPDF;
      if (!converterFactory) {
        throw new Error('html-to-pdf-document library is not available.');
      }

      const content = getRenderTarget();
      const pdf = await converterFactory({
        page: {
          format: pageFormatEl ? pageFormatEl.value : 'a4',
          orientation: orientationEl ? orientationEl.value : 'portrait',
          unit: 'pt'
        },
        margin: Number(marginEl ? marginEl.value : 12),
        image: {
          type: 'jpeg',
          quality: Number(imageQualityEl ? imageQualityEl.value : 0.92)
        },
        html2canvas: {
          scale: Number(scaleEl ? scaleEl.value : 2),
          backgroundColor: '#ffffff',
          useCORS: true
        }
      }).from(content).toPdf();
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const filename = file ? file.name.replace(/\.[^.]+$/, '') + '.pdf' : 'document.pdf';
      renderDownloadResults(resultEl, [{ blob, filename }], 'PDF created.');
      showToast('PDF created.', 'success');
      content.remove();
    } catch (error) {
      console.error('HTML to PDF conversion failed:', error);
      resultEl.textContent = 'Conversion failed. Please try a simpler document.';
      resultEl.classList.remove('hidden');
      showToast('Conversion failed. Please try a simpler document.', 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();
