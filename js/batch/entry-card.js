/**
 * 条目卡片渲染与事件
 */

import { escapeHtml } from './utils.js';

/**
 * 创建条目卡片
 * @param {Object} entry
 * @param {number} displayIndex
 * @param {Object} deps
 * @param {Function} deps.renderFieldsEditor
 * @param {Function} deps.bindFieldEditEvents
 * @param {Function} deps.showValidationDetails
 * @param {Function} deps.handleEntryAction
 * @param {Object} deps.fieldEditDeps
 * @returns {HTMLElement}
 */
export function createEntryCard(entry, displayIndex, { renderFieldsEditor, bindFieldEditEvents, showValidationDetails, handleEntryAction, fieldEditDeps }) {
  const card = document.createElement('div');
  card.className = 'entry-card';

  const originalIndex = entry.index;
  card.dataset.entryIndex = originalIndex;

  const hasWarnings = entry.warnings && entry.warnings.length > 0;

  if (entry.isConfirmed) {
    card.classList.add('confirmed');
  } else if (hasWarnings && !entry.isIgnored) {
    card.classList.add('warning');
  } else if (entry.isIgnored) {
    card.classList.add('ignored');
  } else {
    card.classList.add('unprocessed');
  }

  if (entry.isAISuspected) {
    card.classList.add('ai-suspected');
  }

  const entryId = entry.key || entry.id || `entry-${originalIndex}`;
  const statusIcons = [];

  if (hasWarnings) {
    statusIcons.push('<span class="status-icon warning">⚠️</span>');
  } else {
    statusIcons.push('<span class="status-icon confirmed">✓</span>');
  }

  if (entry.isAISuspected) {
    statusIcons.push('<span class="status-icon ai-suspected">🤖</span>');
  }

  card.innerHTML = `
    <div class="entry-header">
      <div class="entry-status">
        ${statusIcons.join('')}
        <span class="entry-id">[${displayIndex + 1}] ${entryId}</span>
      </div>
      <button class="icon-btn collapse-btn" title="收起">
        <svg viewBox="0 0 24 24" width="20" height="20">
          <path d="M7.41 15.41L12 10.83l4.59 4.58L18 14l-6-6-6 6z" fill="currentColor"/>
        </svg>
      </button>
    </div>

    <div class="entry-card-content">
      <div class="entry-left">
        <div style="font-size: 0.75rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 8px; font-weight: 500;">
          编辑字段
        </div>
        ${renderFieldsEditor(entry.parsedEntry, originalIndex)}
      </div>

      <div class="entry-dblp-result" id="dblp-result-${originalIndex}">
        <div style="font-size: 0.75rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 8px; font-weight: 500; display: flex; justify-content: space-between; align-items: center;">
          <span>DBLP 搜索结果</span>
          <span class="match-confidence"></span>
        </div>
        <div class="dblp-fields-list">
          <div class="empty-state">
            <p>等待验证...</p>
          </div>
        </div>
      </div>

      <div class="entry-right">
        <div style="font-size: 0.75rem; color: var(--md-sys-color-on-surface-variant); margin-bottom: 8px; font-weight: 500; display: flex; justify-content: space-between; align-items: center;">
          <span>转换结果</span>
          ${entry.changeCount > 0 ? `<span class="change-badge">${entry.changeCount}处修改</span>` : ''}
        </div>
        <pre class="entry-preview-content">${escapeHtml(entry.convertedBibtex || entry.rawBibtex || '')}</pre>
      </div>
    </div>

    ${hasWarnings ? `
      <div class="entry-warnings">
        ${entry.warnings.map(w => `
          <div class="warning-item">
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">${w.message}</span>
          </div>
        `).join('')}
      </div>
    ` : ''}

    <div class="entry-actions">
      <button class="btn-text primary" data-action="search-dblp" data-entry-index="${originalIndex}">
        🔍 搜索DBLP
      </button>
      ${hasWarnings ? `
        <button class="btn-text" data-action="ignore-entry" data-entry-index="${originalIndex}">忽略此条</button>
        <button class="btn-text" data-action="ignore-type" data-entry-index="${originalIndex}">忽略同类</button>
      ` : ''}
      ${!entry.isConfirmed ? `
        <button class="btn-text primary" data-action="confirm-entry" data-entry-index="${originalIndex}">✓ 确认无误</button>
      ` : `
        <span class="confirmed-badge">✓ 已确认</span>
        <button class="btn-text small" data-action="unconfirm-entry" data-entry-index="${originalIndex}">撤销确认</button>
      `}
    </div>
  `;

  bindCardEvents(card, entry, originalIndex, { bindFieldEditEvents, showValidationDetails, handleEntryAction, fieldEditDeps });
  return card;
}

function bindCardEvents(card, entry, index, { bindFieldEditEvents, showValidationDetails, handleEntryAction, fieldEditDeps }) {
  const cardHeader = card.querySelector('.entry-header');
  cardHeader?.addEventListener('click', (e) => {
    if (e.target.closest('.collapse-btn')) {
      return;
    }
    showValidationDetails(entry, index);
  });

  const collapseBtn = card.querySelector('.collapse-btn');
  collapseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    card.classList.toggle('collapsed');
  });

  bindFieldEditEvents(card, entry, index, fieldEditDeps);

  card.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      handleEntryAction(action, index, entry);
    });
  });
}

/**
 * 更新卡片的警告区域
 */
export function updateCardWarnings(card, entry) {
  let warningsDiv = card.querySelector('.entry-warnings');
  const hasWarnings = entry.warnings && entry.warnings.length > 0;

  if (hasWarnings) {
    const warningsHTML = entry.warnings.map(w => `
      <div class="warning-item">
        <span class="warning-icon">⚠️</span>
        <span class="warning-text">${escapeHtml(w.message)}</span>
      </div>
    `).join('');

    if (warningsDiv) {
      warningsDiv.innerHTML = warningsHTML;
    } else {
      warningsDiv = document.createElement('div');
      warningsDiv.className = 'entry-warnings';
      warningsDiv.innerHTML = warningsHTML;
      const actionsDiv = card.querySelector('.entry-actions');
      if (actionsDiv) {
        card.insertBefore(warningsDiv, actionsDiv);
      } else {
        card.appendChild(warningsDiv);
      }
    }
  } else if (warningsDiv) {
    warningsDiv.remove();
  }
}

/**
 * 绑定 DBLP 字段按钮，用于缓存恢复后复用
 */
export function bindDblpActionButtons(container) {
  container.querySelectorAll('.dblp-field-action-btn').forEach(btn => {
    if (btn.classList.contains('matched') || btn.disabled) {
      return;
    }

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const fieldName = btn.dataset.field;
      const fieldValue = btn.dataset.value;
      const entryIndex = parseInt(btn.dataset.entryIndex);

      if (window.verificationModeUpdateField) {
        window.verificationModeUpdateField(entryIndex, fieldName, fieldValue);
      }

      btn.className = 'dblp-field-action-btn matched';
      btn.innerHTML = '✓';
      btn.disabled = true;
    });
  });
}
