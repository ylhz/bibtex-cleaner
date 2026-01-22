/**
 * 字段编辑区域渲染
 */

import { BIBTEX_FIELD_ORDER } from './state.js';
import { escapeHtml } from './utils.js';

/**
 * 渲染字段列表编辑器
 * @param {Object} parsedEntry
 * @param {number} index
 * @returns {string}
 */
export function renderFieldsEditor(parsedEntry, index) {
  if (!parsedEntry || !parsedEntry.fields) {
    return '<div class="empty-state"><p>无法解析条目字段</p></div>';
  }

  const fields = parsedEntry.fields;
  const orderedKeys = [];

  BIBTEX_FIELD_ORDER.forEach(key => {
    if (fields[key]) {
      orderedKeys.push(key);
    }
  });

  Object.keys(fields).forEach(key => {
    if (!orderedKeys.includes(key) && fields[key]) {
      orderedKeys.push(key);
    }
  });

  let html = '<div class="entry-fields-editor" data-entry-index="' + index + '">';

  orderedKeys.forEach(key => {
    const value = fields[key] || '';
    html += `
      <div class="field-row" data-field="${key}">
        <span class="field-name">${escapeHtml(key)}</span>
        <span class="field-eq"> = </span>
        <span class="field-brace-left">{</span>
        <div class="field-value" contenteditable="true" data-field="${key}" data-entry-index="${index}">${escapeHtml(value)}</div>
        <span class="field-brace-right">}</span>
      </div>
    `;
  });

  html += `
    <div class="field-row add-field-row" data-entry-index="${index}">
      <button class="add-field-btn" data-entry-index="${index}">
        <svg viewBox="0 0 24 24" width="14" height="14" style="vertical-align: middle; margin-right: 4px;">
          <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
        </svg>
        添加字段
      </button>
      <input type="text" class="add-field-input hidden" data-entry-index="${index}" placeholder='例如: year = {2023}'>
    </div>
  `;

  html += '</div>';
  return html;
}
