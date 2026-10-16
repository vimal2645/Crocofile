importScripts('/vendor/pdf.min.js', '/vendor/pdf-lib.min.js');

pdfjsLib.GlobalWorkerOptions.workerSrc = '/vendor/pdf.worker.min.js';
pdfjsLib.GlobalWorkerOptions.workerPort = new Worker('/vendor/pdf.worker.min.js');

const settings = [
  { scale: 1, quality: 0.75 },
  { scale: 1, quality: 0.45 },
  { scale: 0.75, quality: 0.35 },
  { scale: 0.6, quality: 0.25 },
  { scale: 0.45, quality: 0.18 },
  { scale: 0.32, quality: 0.12 },
  { scale: 0.24, quality: 0.08 }
];
let cancelled = false;
let resolveDecision = null;

self.onmessage = event => {
  const data = event.data;
  if (data.type === 'cancel') {
    cancelled = true;
    if (resolveDecision) resolveDecision('cancel');
  } else if (data.type === 'decision' && resolveDecision) {
    resolveDecision(data.choice);
  } else if (data.fileBuffer) {
    compress(data.fileBuffer, data.targetKB).catch(error => {
      self.postMessage({ type: 'error', message: error.message || 'Unknown compression error' });
    });
  }
};

function checkCancelled() {
  if (cancelled) throw new Error('Compression cancelled');
}

async function renderJpeg(pageNumber, pdf, setting) {
  checkCancelled();
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale: setting.scale });
  const pageSize = page.getViewport({ scale: 1 });
  const canvas = new OffscreenCanvas(Math.round(viewport.width), Math.round(viewport.height));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not create a PDF rendering canvas');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: context, viewport }).promise;
  page.cleanup();
  const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: setting.quality });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  canvas.width = 0;
  canvas.height = 0;
  return { bytes, width: pageSize.width, height: pageSize.height };
}

function buildEstimateOptions(estimates, targetBytes, originalSize) {
  const smaller = estimates.filter(estimate => estimate.bytes < originalSize);

  const options = [];
  const addOption = (tier, estimate) => {
    if (estimate && !options.some(option => option.settingIndex === estimate.settingIndex)) {
      options.push({ tier, settingIndex: estimate.settingIndex, bytes: estimate.bytes });
    }
  };
  if (!smaller.length) {
    return [{ tier: 'original', settingIndex: null, bytes: originalSize }];
  }

  const targetFits = smaller.filter(estimate => estimate.bytes <= targetBytes);

  if (targetFits.length) {
    addOption('fit', targetFits.reduce((largest, estimate) => estimate.bytes > largest.bytes ? estimate : largest));
  } else {
    addOption('closest', smaller.reduce((closest, estimate) =>
      Math.abs(estimate.bytes - targetBytes) < Math.abs(closest.bytes - targetBytes) ? estimate : closest));
  }
  addOption('quality', smaller[0]);
  addOption('smallest', smaller.reduce((smallest, estimate) => estimate.bytes < smallest.bytes ? estimate : smallest));

  if (options.length < 3 && smaller.length > 2) {
    addOption('balanced', smaller[Math.floor(smaller.length / 2)]);
  }
  if (options.length < 3) {
    options.push({ tier: 'original', settingIndex: null, bytes: originalSize });
  }
  return options.slice(0, 3);
}

async function compress(fileBuffer, targetKB) {
  try {
    const targetBytes = targetKB * 1024;
    if (fileBuffer.byteLength <= targetBytes) {
      self.postMessage({ type: 'done', fileBuffer }, [fileBuffer]);
      return;
    }

    if (typeof OffscreenCanvas === 'undefined') {
      throw new Error('This browser does not support background PDF compression. Try a recent version of Chrome, Edge, or Firefox.');
    }

    const originalSize = fileBuffer.byteLength;
    const srcDoc = await pdfjsLib.getDocument({ data: fileBuffer.slice(0) }).promise;
    const sampleCount = Math.min(5, srcDoc.numPages);
    const samples = settings.map(() => []);

    for (let pageNumber = 1; pageNumber <= sampleCount; pageNumber++) {
      checkCancelled();
      const page = await srcDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const pageSize = page.getViewport({ scale: 1 });
      const canvas = new OffscreenCanvas(Math.round(viewport.width), Math.round(viewport.height));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not create a PDF rendering canvas');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: context, viewport }).promise;
      page.cleanup();

      for (let settingIndex = 0; settingIndex < settings.length; settingIndex++) {
        const setting = settings[settingIndex];
        let candidateCanvas = canvas;
        if (setting.scale !== 1) {
          candidateCanvas = new OffscreenCanvas(
            Math.max(1, Math.round(canvas.width * setting.scale)),
            Math.max(1, Math.round(canvas.height * setting.scale))
          );
          const candidateContext = candidateCanvas.getContext('2d');
          if (!candidateContext) throw new Error('Could not create a PDF sample canvas');
          candidateContext.drawImage(canvas, 0, 0, candidateCanvas.width, candidateCanvas.height);
        }
        const blob = await candidateCanvas.convertToBlob({ type: 'image/jpeg', quality: setting.quality });
        samples[settingIndex].push({
          bytes: new Uint8Array(await blob.arrayBuffer()),
          width: pageSize.width,
          height: pageSize.height
        });
        if (candidateCanvas !== canvas) {
          candidateCanvas.width = 0;
          candidateCanvas.height = 0;
        }
      }
      canvas.width = 0;
      canvas.height = 0;
      self.postMessage({ type: 'estimate-progress', current: pageNumber, total: sampleCount });
    }

    const estimates = [];
    for (let settingIndex = 0; settingIndex < settings.length; settingIndex++) {
      const sampleBytes = samples[settingIndex].reduce((total, sample) => total + sample.bytes.byteLength, 0);
      estimates.push({
        setting: settings[settingIndex],
        settingIndex,
        bytes: Math.ceil(sampleBytes / sampleCount * srcDoc.numPages * 1.15) + srcDoc.numPages * 256
      });
    }

    const selected = estimates.find(estimate => estimate.bytes <= targetBytes) ||
      estimates.reduce((smallest, estimate) => estimate.bytes < smallest.bytes ? estimate : smallest);
    const canReachTarget = selected.bytes <= targetBytes;
    const options = buildEstimateOptions(estimates, targetBytes, originalSize);

    self.postMessage({
      type: 'estimate',
      canReachTarget,
      estimatedKB: selected.bytes / 1024,
      quality: selected.setting.quality,
      scale: selected.setting.scale,
      options
    });

    checkCancelled();
    const choice = await new Promise(resolve => { resolveDecision = resolve; });
    resolveDecision = null;
    if (choice === 'cancel' || cancelled) throw new Error('Compression cancelled');
    if (choice === 'original') {
      self.postMessage({ type: 'done', fileBuffer, preservedOriginal: true }, [fileBuffer]);
      return;
    }
    const chosenEstimate = estimates.find(estimate => estimate.settingIndex === Number(choice));
    if (!chosenEstimate) throw new Error('Invalid compression option');
    checkCancelled();

    const resultDoc = await PDFLib.PDFDocument.create();
    const selectedSamples = samples[chosenEstimate.settingIndex];
    const chunkSize = 4;
    for (let start = 1; start <= srcDoc.numPages; start += chunkSize) {
      checkCancelled();
      const end = Math.min(start + chunkSize - 1, srcDoc.numPages);
      const chunk = await Promise.all(Array.from({ length: end - start + 1 }, async (_, offset) => {
        const pageNumber = start + offset;
        if (pageNumber <= sampleCount) return selectedSamples[pageNumber - 1];
        return renderJpeg(pageNumber, srcDoc, chosenEstimate.setting);
      }));

      for (const rendered of chunk) {
        const image = await resultDoc.embedJpg(rendered.bytes);
        const page = resultDoc.addPage([rendered.width, rendered.height]);
        page.drawImage(image, { x: 0, y: 0, width: rendered.width, height: rendered.height });
      }
      self.postMessage({ type: 'progress', current: end, total: srcDoc.numPages });
    }

    checkCancelled();
    const bytes = await resultDoc.save();
    if (bytes.byteLength >= originalSize) {
      self.postMessage({ type: 'done', fileBuffer, preservedOriginal: true }, [fileBuffer]);
      return;
    }
    const resultBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    self.postMessage({ type: 'done', fileBuffer: resultBuffer, preservedOriginal: false }, [resultBuffer]);
  } catch (error) {
    if (cancelled || error.message === 'Compression cancelled') {
      self.postMessage({ type: 'cancelled' });
      return;
    }
    throw error;
  }
}