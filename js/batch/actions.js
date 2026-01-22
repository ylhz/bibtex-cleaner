/**
 * 条目操作处理
 */

import { BatchModeState } from './state.js';

export function handleEntryAction(action, index, entry, deps) {
  switch (action) {
    case 'search-dblp':
      return handleSearchDBLP(entry, deps);
    case 'ignore-entry':
      return handleIgnoreEntry(index, deps);
    case 'ignore-type':
      return handleIgnoreType(entry, deps);
    case 'confirm-entry':
      return handleConfirmEntry(index, deps);
    case 'unconfirm-entry':
      return handleUnconfirmEntry(index, deps);
    default:
      break;
  }
}

function handleSearchDBLP(entry, { exitBatchMode, showToast }) {
  const title = entry.fields?.title || entry.title || '';
  if (!title) {
    showToast('无法提取标题，无法搜索');
    return;
  }

  exitBatchMode();

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.value = title;
    const btnSearch = document.getElementById('btn-search');
    btnSearch?.click();
  }

  showToast('已切换到单条模式进行DBLP搜索');
}

function handleIgnoreEntry(entryIndex, { updateStats, renderEntriesList, showToast }) {
  const entry = BatchModeState.entries.find(e => e.index === entryIndex);
  if (!entry || !entry.warnings || entry.warnings.length === 0) {
    return;
  }

  entry.isIgnored = true;
  updateStats();
  renderEntriesList();
  showToast('已忽略此条目的警告（可继续解决）');
}

function handleIgnoreType(entry, { updateStats, renderEntriesList, saveIgnoredWarnings, showToast }) {
  if (!entry.warnings || entry.warnings.length === 0) {
    return;
  }

  const firstWarningType = entry.warnings[0].type;
  let affectedCount = 0;

  BatchModeState.entries.forEach(e => {
    if (e.warnings && e.warnings.length > 0) {
      const hasThisType = e.warnings.some(w => w.type === firstWarningType);
      if (hasThisType) {
        affectedCount++;

        if (!BatchModeState.ignoredWarnings[firstWarningType]) {
          BatchModeState.ignoredWarnings[firstWarningType] = [];
        }
        const entryId = e.id || e.key || `entry_${e.index}`;
        if (!BatchModeState.ignoredWarnings[firstWarningType].includes(entryId)) {
          BatchModeState.ignoredWarnings[firstWarningType].push(entryId);
        }

        e.isIgnored = true;
      }
    }
  });

  saveIgnoredWarnings();
  updateStats();
  renderEntriesList();
  showToast(`已忽略 ${affectedCount} 个条目的同类警告`);
}

function handleConfirmEntry(entryIndex, { updateStats, renderEntriesList, showToast }) {
  const entry = BatchModeState.entries.find(e => e.index === entryIndex);
  if (!entry) {
    console.error('未找到条目:', entryIndex);
    return;
  }

  entry.isConfirmed = true;
  entry.confirmedAt = Date.now();

  if (entry.isIgnored) {
    entry.isIgnored = false;
  }

  updateStats();
  renderEntriesList();

  const warningNote = entry.warnings && entry.warnings.length > 0 ? '（注意：此条目仍有警告）' : '';
  showToast('已确认此条目' + warningNote);
}

function handleUnconfirmEntry(entryIndex, { updateStats, renderEntriesList, showToast }) {
  const entry = BatchModeState.entries.find(e => e.index === entryIndex);
  if (!entry) {
    console.error('未找到条目:', entryIndex);
    return;
  }

  entry.isConfirmed = false;
  entry.confirmedAt = null;

  updateStats();
  renderEntriesList();
  showToast('已撤销确认');
}
