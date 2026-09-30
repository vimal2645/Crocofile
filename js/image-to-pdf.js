(function () {
  const { PDFDocument } = PDFLib;
  const A4 = [595.28, 841.89];
  const LETTER = [612, 792];

  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const thumbsEl = document.getElementById('thumbs');
  const runBtn = document.getElementById('run');
  const sizeEl = document.getElementById('size');
  const resultEl = document.getElementById('result');

  let images = [];
  let previewUrls = [];

  setupDropZone(zone, input, {
    accept: 'image/jpeg,image/png,image/webp',
    multiple: true,
    onFiles: incoming => {
      const valid = incoming.filter(isImage);
      if (!valid.length) return showToast('Only JPG, PNG, WebP allowed.', 'error');
      images = images.concat(valid);
      resultEl.classList.add('hidden');
      renderThumbs();
    }
  });

  function renderThumbs() {
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    previewUrls = [];
    thumbsEl.innerHTML = '';
    images.forEach((f, i) => {
      const url = URL.createObjectURL(f);
      previewUrls.push(url);
      const d = document.createElement('div');
      d.className = 'thumb';
      d.innerHTML = '<img src="' + url + '"><button class="del">×</button>';
      d.querySelector('.del').onclick = () => {
        images.splice(i, 1);
        resultEl.classList.add('hidden');
        renderThumbs();
      };
      thumbsEl.appendChild(d);
    });
    runBtn.disabled = images.length === 0;
  }

  function webpToPngBytes(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.width; c.height = img.height;
        const ctx = c.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          rej(new Error('Canvas is unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        c.toBlob(blob => {
          URL.revokeObjectURL(url);
          if (!blob) {
            rej(new Error('WebP conversion failed'));
            return;
          }
          blob.arrayBuffer().then(res, rej);
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        rej(new Error('Image could not be loaded'));
      };
      img.src = url;
    });
  }

  runBtn.addEventListener('click', async () => {
    if (!images.length) return;
    showSpinner(runBtn, 'Building PDF...');
    try {
      const doc = await PDFDocument.create();
      const mode = sizeEl.value;

      for (const f of images) {
        const bytes = new Uint8Array(await f.arrayBuffer());
        let img;
        if (f.type === 'image/png') img = await doc.embedPng(bytes);
        else if (f.type === 'image/jpeg') img = await doc.embedJpg(bytes);
        else {
          const converted = await webpToPngBytes(f);
          img = await doc.embedPng(converted);
        }

        if (mode === 'fit') {
          const p = doc.addPage([img.width, img.height]);
          p.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        } else {
          const [pw, ph] = mode === 'a4' ? A4 : LETTER;
          const p = doc.addPage([pw, ph]);
          const ratio = Math.min(pw / img.width, ph / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          p.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
        }
      }

      const out = await doc.save();
      renderDownloadResults(resultEl, [
        { blob: new Blob([out], { type: 'application/pdf' }), filename: 'images.pdf' }
      ], 'PDF ready.');
      showToast('PDF created.', 'success');
    } catch (e) {
      console.error(e);
      showToast('PDF creation failed: ' + e.message, 'error');
    } finally {
      hideSpinner(runBtn);
    }
  });
})();