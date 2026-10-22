(function () {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
  const zone = document.getElementById('zone');
  const input = document.getElementById('input');
  const runBtn = document.getElementById('run');
  const resultEl = document.getElementById('result');

  let currentFile = null;
  let currentBlob = null;

  const requestedTarget = new URLSearchParams(window.location.search).get('target');
  const defaultTarget = window.location.pathname.replace(/\/+$/, '') === '/pdf-compress-to-100kb' ? 100 : 200;
  const targetKB = ['100', '200', '500'].includes(requestedTarget) ? Number(requestedTarget) : defaultTarget;

  setupDropZone(zone, input, {
    accept: 'application/pdf',
    multiple: false,
    onFiles: files => {
      const f = files[0];
      if (!isPDF(f)) return showToast('Please select a PDF.', 'error');
      if (!maxSizeCheck(f, 50)) return showToast('File too large (max 50MB).', 'error');
      currentFile = f;
      currentBlob = null;
      zone.querySelector('p strong').textContent = f.name + ' (' + formatBytes(f.size) + ')';
      runBtn.disabled = false;
      resultEl.classList.add('hidden');
    }
  });

  let activeWorker = null;

  function showProgress(message, current, total) {
    resultEl.classList.remove('hidden');
    resultEl.innerHTML = '<p>' + message + '</p>' +
      (typeof current === 'number'
        ? '<progress max="' + total + '" value="' + current + '" style="width:100%;margin:12px 0 6px"></progress>' +
          '<small>Page ' + current + ' of ' + total + '</small>'
        : '') +
      '<p><button class="btn secondary" id="cancel-compress">Cancel</button></p>';
    document.getElementById('cancel-compress').addEventListener('click', cancelCompression);
  }

  function cancelCompression() {
    if (activeWorker) {
      runBtn.innerHTML = '<span class="spinner"></span>Canceling...';
      activeWorker.postMessage({ type: 'cancel' });
    }
  }

  function startCompression(choice) {
    if (!activeWorker) return;
    activeWorker.postMessage({ type: 'decision', choice });
    runBtn.innerHTML = '<span class="spinner"></span>Compressing...';
    showProgress('Compressing...', 0, 1);
  }

  runBtn.addEventListener('click', async () => {
    if (!currentFile) return;

    showSpinner(runBtn, 'Estimating...');
    await new Promise(resolve => setTimeout(resolve, 0));
    showProgress('Estimating achievable size from the first pages...');
    activeWorker = new Worker('/js/pdf-compress-worker.js?v=8');
    activeWorker.onmessage = event => {
      const data = event.data;
      if (data.type === 'estimate') {
        const options = data.options.map(option => {
          const labels = {
            fit: 'Fits target',
            closest: 'Closest to target',
            quality: 'Higher quality',
            smallest: 'Smallest file',
            balanced: 'Balanced',
            original: 'Keep original'
          };
          const choice = option.tier === 'original' ? 'original' : option.settingIndex;
          return '<button class="btn' + (option.tier === 'fit' || option.tier === 'closest' ? '' : ' secondary') +
            '" data-compress-choice="' + choice + '">' + labels[option.tier] + ' · ' + formatBytes(option.bytes) + '</button>';
        });
        resultEl.classList.remove('hidden');
        const hasSmallerEstimate = data.options.some(option =>
          option.tier !== 'original' && option.bytes < currentFile.size
        );
        const estimateMessage = !hasSmallerEstimate
          ? 'No sampled compression setting looks smaller than the original. You can still try one; if the output is larger, the original will be kept.'
          : data.canReachTarget
            ? 'Choose a compression size. The estimate is based on the first pages.'
            : 'The target may not be reachable. Choose the size and quality that works for you.';
        resultEl.innerHTML = '<p>' + estimateMessage +
          '</p><p>' + options.join(' ') + ' <button class="btn secondary" id="cancel-compress">Cancel</button></p>';
        runBtn.innerHTML = 'Choose an option';
        resultEl.querySelectorAll('[data-compress-choice]').forEach(button => {
          button.addEventListener('click', () => {
            const choice = button.dataset.compressChoice === 'original'
              ? 'original'
              : Number(button.dataset.compressChoice);
            startCompression(choice);
          });
        });
        document.getElementById('cancel-compress').addEventListener('click', cancelCompression);
      } else if (data.type === 'estimate-progress') {
        showProgress('Estimating achievable size...', data.current, data.total);
      } else if (data.type === 'progress') {
        showProgress('Compressing...', data.current, data.total);
      } else if (data.type === 'done') {
        currentBlob = new Blob([data.fileBuffer], { type: 'application/pdf' });
        const ok = currentBlob.size <= targetKB * 1024;
        const bytesSaved = currentFile.size - currentBlob.size;
        resultEl.classList.remove('hidden');
        resultEl.innerHTML = 'Original: <strong>' + formatBytes(currentFile.size) + '</strong>' +
          ' → Compressed: <span class="' + (ok ? 'ok' : 'warn') + '">' + formatBytes(currentBlob.size) + '</span>' +
          (data.preservedOriginal
            ? data.estimatedKB
              ? '<br><small>Original retained; the sample estimates compression would increase it to about ' +
                Math.round(data.estimatedKB) + ' KB.</small>'
              : ok ? '<br><small>Original already met the target and was retained.</small>'
                : '<br><small>Original retained because compression would increase its size.</small>'
            : ok ? '' : '<br><small>Target not reached. Reduced by ' + formatBytes(bytesSaved) +
              '. The output uses the setting you selected from the sample.</small>') +
          '<br><br><button class="btn" id="download">Download</button>';
        document.getElementById('download').addEventListener('click', () => downloadBlob(currentBlob, 'compressed.pdf'));
        activeWorker.terminate();
        activeWorker = null;
        hideSpinner(runBtn);
      } else if (data.type === 'cancelled') {
        resultEl.classList.add('hidden');
        activeWorker.terminate();
        activeWorker = null;
        hideSpinner(runBtn);
      } else if (data.type === 'error') {
        showToast('Compression failed: ' + data.message, 'error');
        activeWorker.terminate();
        activeWorker = null;
        hideSpinner(runBtn);
        resultEl.classList.add('hidden');
      }
    };
    activeWorker.onerror = event => {
      console.error(event);
      showToast('Compression failed: ' + event.message, 'error');
      activeWorker.terminate();
      activeWorker = null;
      hideSpinner(runBtn);
      resultEl.classList.add('hidden');
    };
    currentFile.arrayBuffer().then(fileBuffer => {
      if (activeWorker) activeWorker.postMessage({ fileBuffer, targetKB }, [fileBuffer]);
    }).catch(error => {
      showToast('Could not read the PDF: ' + error.message, 'error');
      if (activeWorker) activeWorker.terminate();
      activeWorker = null;
      hideSpinner(runBtn);
    });
  });
})();