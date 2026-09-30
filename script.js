const icon = {
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="9" r="1.6"/><path d="m21 15-5-5L5 21"/>',
  compress: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 12v5m-2-2 2 2 2-2"/>',
  merge: '<path d="M6 3v6a4 4 0 0 0 4 4h4a4 4 0 0 1 4 4v4M18 3v6a4 4 0 0 1-4 4"/><path d="m15 18 3 3 3-3"/>',
  split: '<path d="M12 3v18M4 7h5M4 12h5M4 17h5M15 7h5M15 12h5M15 17h5"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><path d="M21 3v5h-5"/>',
  extract: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 14h6M12 11v6"/>',
  organize: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><path d="M14 17.5h7M17.5 14v7"/>',
  toPdf: '<rect x="3" y="4" width="9" height="9" rx="2"/><path d="M15 8h3a3 3 0 0 1 3 3v9H11v-4"/>',
  toImage: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><circle cx="10" cy="13" r="1.3"/><path d="m18 18-3-3-6 3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/>',
  moon: '<path d="M20.8 13.1A8.5 8.5 0 0 1 10.9 3.2 8.5 8.5 0 1 0 20.8 13.1Z"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".8" fill="currentColor" stroke="none"/>'
};

// Keep these links aligned with the real HTML files in this project.
const TOOLS = [
  { title: 'Image Compress', description: 'Shrink JPG, PNG or WebP to an exact size in KB.', href: '/image-compress/index.html', category: 'Image', icon: 'image', tone: '#ffb454', tag: 'Popular' },
  { title: 'Word to PDF', description: 'Convert DOCX or DOC to PDF in your browser.', href: '/word-to-pdf/', category: 'Convert', icon: 'toPdf', tone: '#38bdf8' },
  { title: 'Excel to PDF', description: 'Convert XLSX or XLS to PDF with page-break control.', href: '/excel-to-pdf/', category: 'Convert', icon: 'toPdf', tone: '#22c55e' },
  { title: 'HTML to PDF', description: 'Convert HTML or web pages to PDF.', href: '/html-to-pdf/', category: 'Convert', icon: 'toPdf', tone: '#f59e0b' },
  { title: 'Spreadsheet to PDF', description: 'Convert CSV, XLSX, or XLS to PDF.', href: '/spreadsheet-to-pdf/', category: 'Convert', icon: 'toPdf', tone: '#a78bfa' },
  { title: 'PDF Compress', description: 'Reduce a PDF to 100 KB, 200 KB, 500 KB or a custom size.', href: '/pdf-compress/index.html', category: 'PDF', icon: 'compress', tone: '#a99dff', tag: 'Popular' },
  { title: 'Merge PDF', description: 'Combine multiple PDFs into a single file.', href: '/pdf-merge/index.html', category: 'PDF', icon: 'merge', tone: '#4cc9f0' },
  { title: 'Split PDF', description: 'Split by page range or into one file per page.', href: '/pdf-split/index.html', category: 'PDF', icon: 'split', tone: '#f472b6' },
  { title: 'Rotate PDF', description: 'Turn pages 90°, 180° or 270°.', href: '/pdf-rotate/index.html', category: 'PDF', icon: 'rotate', tone: '#3ddc97' },
  { title: 'Extract Pages', description: 'Pull the pages you pick into a new PDF.', href: '/pdf-extract/index.html', category: 'PDF', icon: 'extract', tone: '#fb923c' },
  { title: 'Organize PDF', description: 'Reorder or delete pages visually.', href: '/pdf-organize/index.html', category: 'PDF', icon: 'organize', tone: '#a78bfa' },
  { title: 'Image to PDF', description: 'Combine images into a single PDF.', href: '/image-to-pdf/index.html', category: 'Convert', icon: 'toPdf', tone: '#22d3ee' },
  { title: 'PDF to Image', description: 'Export PDF pages as PNG or JPG.', href: '/pdf-to-image/index.html', category: 'Convert', icon: 'toImage', tone: '#f87171' }
];

const year = document.querySelector('[data-current-year]');
if (year) year.textContent = String(new Date().getFullYear());

const themeButton = document.querySelector('[data-theme-toggle]');
const savedTheme = localStorage.getItem('pdf-toolkit-theme');
if (savedTheme === 'light' || savedTheme === 'dark') document.documentElement.dataset.theme = savedTheme;
if (themeButton) {
  const updateThemeButton = () => {
    const isDark = document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    themeButton.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    themeButton.setAttribute('title', isDark ? 'Switch to light theme' : 'Switch to dark theme');
    themeButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${isDark ? icon.sun : icon.moon}</svg>`;
  };
  updateThemeButton();
  themeButton.addEventListener('click', () => {
    const isDark = document.documentElement.dataset.theme === 'dark' ||
      (!document.documentElement.dataset.theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const nextTheme = isDark ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem('pdf-toolkit-theme', nextTheme);
    updateThemeButton();
  });
}

const grid = document.querySelector('#grid');
const queryInput = document.querySelector('#q');
const chips = document.querySelector('#chips');
const empty = document.querySelector('#empty');

if (grid && queryInput && chips && empty) {
  const categories = ['All', 'PDF', 'Image', 'Convert'];
  let activeCategory = 'All';

  function renderTools() {
    const query = queryInput.value.trim().toLowerCase();
    const matches = TOOLS.filter(tool =>
      (activeCategory === 'All' || tool.category === activeCategory) &&
      `${tool.title} ${tool.description}`.toLowerCase().includes(query)
    );

    grid.innerHTML = matches.map(tool => `
      <a class="card" href="${tool.href}" style="--tone:${tool.tone}">
        ${tool.tag ? `<span class="tag">${tool.tag}</span>` : ''}
        <span class="ico"><svg viewBox="0 0 24 24" aria-hidden="true">${icon[tool.icon]}</svg></span>
        <h2>${tool.title}</h2>
        <p>${tool.description}</p>
      </a>`).join('');
    empty.hidden = matches.length > 0;
  }

  chips.innerHTML = categories.map(category =>
    `<button class="chip" type="button" role="tab" aria-selected="${category === activeCategory}" data-category="${category}">${category}</button>`
  ).join('');
  chips.addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    chips.querySelectorAll('[data-category]').forEach(chip =>
      chip.setAttribute('aria-selected', String(chip === button))
    );
    renderTools();
  });
  queryInput.addEventListener('input', renderTools);
  document.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement !== queryInput && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      queryInput.focus();
    }
  });
  renderTools();
}
