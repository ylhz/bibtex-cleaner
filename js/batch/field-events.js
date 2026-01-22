/**
 * 字段编辑事件绑定
 */

import { BatchModeState } from './state.js';

/**
 * 绑定字段编辑事件
 * @param {HTMLElement} card
 * @param {Object} entry
 * @param {number} index
 * @param {Object} deps
 * @param {Function} deps.reconstructBibtex
 * @param {Function} deps.recheckEntry
 * @param {Function} deps.showToast
 */
export function bindFieldEditEvents(card, entry, index, { reconstructBibtex, recheckEntry, showToast }) {
  const fieldEditor = card.querySelector('.entry-fields-editor');
  if (!fieldEditor) return;

  const editableFields = fieldEditor.querySelectorAll('.field-value[contenteditable="true"]');

  editableFields.forEach(field => {
    field.addEventListener('blur', () => {
      const fieldName = field.dataset.field;
      const newValue = field.textContent;
      handleFieldEditAndRecheck(index, fieldName, newValue, { reconstructBibtex, recheckEntry });
    });

    field.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const fieldName = field.dataset.field;
        const newValue = field.textContent;
        handleFieldEditAndRecheck(index, fieldName, newValue, { reconstructBibtex, recheckEntry });
        field.blur();
      }
    });

    field.addEventListener('paste', (e) => {
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData('text/plain');
      document.execCommand('insertText', false, text);
    });
  });

  const addFieldBtn = card.querySelector('.add-field-btn');
  const addFieldInput = card.querySelector('.add-field-input');

  if (addFieldBtn && addFieldInput) {
    addFieldBtn.addEventListener('click', () => {
      addFieldBtn.classList.add('hidden');
      addFieldInput.classList.remove('hidden');
      addFieldInput.focus();
    });

    addFieldInput.addEventListener('blur', () => {
      handleAddField(index, addFieldInput.value, card, { reconstructBibtex, recheckEntry, showToast });
    });

    addFieldInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddField(index, addFieldInput.value, card, { reconstructBibtex, recheckEntry, showToast });
      }
    });
  }
}

function handleFieldEditAndRecheck(entryIndex, fieldName, newValue, { reconstructBibtex, recheckEntry }) {
  const entry = BatchModeState.entries.find(e => e.index === entryIndex);
  if (!entry || !entry.parsedEntry) {
    console.error('未找到条目或解析数据:', entryIndex);
    return;
  }

  if (!entry.parsedEntry.fields) {
    entry.parsedEntry.fields = {};
  }
  entry.parsedEntry.fields[fieldName] = newValue;
  entry.rawBibtex = reconstructBibtex(entry.parsedEntry);
  recheckEntry(entryIndex);
}

function handleAddField(entryIndex, inputValue, card, { reconstructBibtex, recheckEntry, showToast }) {
  const addFieldBtn = card.querySelector('.add-field-btn');
  const addFieldInput = card.querySelector('.add-field-input');

  if (!inputValue || !inputValue.trim()) {
    addFieldInput.classList.add('hidden');
    addFieldBtn.classList.remove('hidden');
    addFieldInput.value = '';
    return;
  }

  const entry = BatchModeState.entries.find(e => e.index === entryIndex);
  if (!entry || !entry.parsedEntry) {
    showToast('条目数据错误');
    return;
  }

  const match = inputValue.match(/^\s*(\w+)\s*=\s*\{(.+)\}\s*$/);
  if (!match) {
    showToast('格式错误，请使用格式：key = {value}');
    addFieldInput.value = '';
    return;
  }

  const fieldName = match[1].trim();
  const fieldValue = match[2].trim();

  if (entry.parsedEntry.fields && entry.parsedEntry.fields[fieldName]) {
    showToast(`字段 ${fieldName} 已存在`);
    addFieldInput.value = '';
    return;
  }

  if (!entry.parsedEntry.fields) {
    entry.parsedEntry.fields = {};
  }
  entry.parsedEntry.fields[fieldName] = fieldValue;
  entry.rawBibtex = reconstructBibtex(entry.parsedEntry);
  recheckEntry(entryIndex);

  addFieldInput.classList.add('hidden');
  addFieldBtn.classList.remove('hidden');
  addFieldInput.value = '';

  showToast(`已添加字段 ${fieldName}`);
}
