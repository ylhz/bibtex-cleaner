/**
 * 批量模式预览渲染
 */

import { filterEntries } from './sort-filter.js';

/**
 * 渲染预览列表
 * @param {HTMLElement} previewListDom
 * @param {Object} state
 * @param {Function} copyToClipboard
 * @param {Function} escapeHtml
 * @param {Function} showToast
 */
export function renderPreviewList(previewListDom, state, copyToClipboard, escapeHtml, showToast) {
  if (!previewListDom) return;

  previewListDom.innerHTML = '';

  const filteredEntries = filterEntries(state.entries, state.currentFilter);

  if (filteredEntries.length === 0) {
    previewListDom.innerHTML = '<div class="empty-state"><p>没有预览内容</p></div>';
    return;
  }

  filteredEntries.forEach((entry, index) => {
    const preview = createPreviewCard(entry, index, copyToClipboard, escapeHtml, showToast);
    previewListDom.appendChild(preview);
  });
}

function createPreviewCard(entry, index, copyToClipboard, escapeHtml, showToast) {
  const card = document.createElement('div');
  card.className = 'preview-card';
  card.dataset.entryIndex = index;

  const convertedBibtex = entry.convertedBibtex || entry.rawBibtex || '';

  card.innerHTML = `
    <div class="preview-header">
      <span class="preview-format">BibTeX</span>
      <button class="btn-icon" title="复制此条" data-copy-index="${index}">
        <svg viewBox="0 0 24 24">
          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>
        </svg>
      </button>
    </div>

    <pre class="preview-content"><code>${escapeHtml(convertedBibtex)}</code></pre>

    ${entry.changeCount ? `
      <div class="preview-footer">
        <span class="change-badge">${entry.changeCount}处修改</span>
      </div>
    ` : ''}
  `;

  const copyBtn = card.querySelector('[data-copy-index]');
  copyBtn?.addEventListener('click', () => {
    copyToClipboard(convertedBibtex);
    showToast('已复制此条目');
  });

  return card;
}
