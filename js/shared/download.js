window.downloadBlob = function (blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

window.renderDownloadResults = function (container, outputs, message) {
  container.replaceChildren();

  const status = document.createElement('p');
  status.textContent = message;
  container.appendChild(status);

  const actions = document.createElement('div');
  actions.className = 'download-actions';
  outputs.forEach(output => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn';
    button.textContent = outputs.length === 1 ? 'Download' : 'Download ' + output.filename;
    button.addEventListener('click', () => downloadBlob(output.blob, output.filename));
    actions.appendChild(button);
  });
  container.appendChild(actions);

  container.classList.remove('hidden');
};