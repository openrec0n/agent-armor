import { generateCurrentSettings } from '../app';

export function renderExportPanel(): void {
  const copyBtn = document.getElementById('btn-copy');
  const downloadBtn = document.getElementById('btn-download');
  if (!copyBtn || !downloadBtn) return;

  // Clone buttons to remove previous event listeners. renderExportPanel() is
  // called on every state update; cloning prevents listener accumulation.
  const newCopy = copyBtn.cloneNode(true) as HTMLButtonElement;
  const newDownload = downloadBtn.cloneNode(true) as HTMLButtonElement;
  copyBtn.replaceWith(newCopy);
  downloadBtn.replaceWith(newDownload);

  newCopy.addEventListener('click', async () => {
    const result = generateCurrentSettings();
    const json = JSON.stringify(result.finalSettings, null, 2);

    try {
      await navigator.clipboard.writeText(json);
      newCopy.textContent = 'Copied!';
      newCopy.classList.add('copied');
      setTimeout(() => {
        newCopy.textContent = 'Copy to Clipboard';
        newCopy.classList.remove('copied');
      }, 2000);
    } catch {
      // Fallback: select text in the preview
      const preview = document.getElementById('settings-preview');
      if (preview) {
        const range = document.createRange();
        range.selectNodeContents(preview);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  });

  newDownload.addEventListener('click', () => {
    const result = generateCurrentSettings();
    const json = JSON.stringify(result.finalSettings, null, 2);
    const blob = new Blob([json + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
