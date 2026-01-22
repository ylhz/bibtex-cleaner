/**
 * verification-mode.js
 * 验证模式逻辑 - DBLP 批量验证与字段对比
 */

import { parseRawBibtex, processEntries, parseMappingRules } from './processor.js';
import { toBibTeX } from './formatters/bibtex.js';
import { ConfigManager } from './config.js';
import { validateEntryInDBLP } from './dblp-validator.js';
import { detectWarnings } from './warning-system.js';
import { detectAIGenerated } from './ai-detector.js';

// ============ 状态管理 ============
export const VerificationState = {
  isActive: false,
  entries: [],
  currentIndex: 0,
  isPaused: false,
  isVerifying: false,
  verifiedCount: 0,
};

// ============ DOM 引用 ============
const dom = {
  batchContainer: null,
  batchMainGrid: null,
  progressText: null,
  btnPause: null,
  btnResume: null,
  btnExit: null,
};

// ============ 初始化 ============
export function initVerificationMode() {
  // 缓存 DOM
  dom.batchContainer = document.getElementById('batch-mode-container');
  dom.batchMainGrid = document.querySelector('.batch-main-grid');
  dom.progressText = document.getElementById('verification-progress-text');
  dom.btnPause = document.getElementById('btn-pause-verification');
  dom.btnResume = document.getElementById('btn-resume-verification');
  dom.btnExit = document.getElementById('btn-exit-verification-mode');

  // 绑定事件
  dom.btnPause?.addEventListener('click', pauseVerification);
  dom.btnResume?.addEventListener('click', resumeVerification);
  dom.btnExit?.addEventListener('click', exitVerificationMode);

  console.log('[验证模式] 初始化完成');
}

// ============ 进入验证模式 ============
export function enterVerificationMode(entries) {
  console.log('[验证模式] 进入验证模式，条目数:', entries.length);
  
  VerificationState.isActive = true;
  VerificationState.entries = entries;
  VerificationState.currentIndex = 0;
  VerificationState.isPaused = false;
  VerificationState.verifiedCount = 0;

  // 添加验证模式class
  dom.batchContainer?.classList.add('verification-mode');
  
  // 调试：检查元素可见性
  console.log('[验证模式] 容器可见性:', dom.batchContainer ? window.getComputedStyle(dom.batchContainer).display : 'null');
  
  const entriesPane = document.getElementById('batch-entries-pane');
  console.log('[验证模式] 条目面板:', entriesPane ? 'found' : 'not found');
  console.log('[验证模式] 条目面板可见性:', entriesPane ? window.getComputedStyle(entriesPane).display : 'null');
  
  const entriesList = document.getElementById('entries-list');
  console.log('[验证模式] 条目列表:', entriesList ? 'found' : 'not found');
  console.log('[验证模式] 条目列表可见性:', entriesList ? window.getComputedStyle(entriesList).display : 'null');
  console.log('[验证模式] 条目列表子元素数:', entriesList?.children.length);
  
  // 更新工具栏
  updateToolbar();

  // 使用 requestAnimationFrame 确保 DOM 完全渲染
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      console.log('[验证模式] DOM已完全渲染，开始验证');
      startVerification();
    });
  });
}

// ============ 退出验证模式 ============
function exitVerificationMode() {
  console.log('[验证模式] 退出验证模式');
  
  VerificationState.isActive = false;
  VerificationState.isPaused = false;
  VerificationState.isVerifying = false;

  // 移除验证模式class
  dom.batchContainer?.classList.remove('verification-mode');
  
  // 恢复工具栏
  const btnVerifyAll = document.getElementById('btn-verify-all');
  const btnCopyAll = document.getElementById('btn-copy-all');
  const btnCopyClean = document.getElementById('btn-copy-clean');
  const btnExitBatch = document.getElementById('btn-exit-batch-mode');
  const progressText = document.getElementById('verification-progress-text');
  
  if (btnVerifyAll) btnVerifyAll.style.display = 'inline-flex';
  if (btnCopyAll) btnCopyAll.style.display = 'inline-flex';
  if (btnCopyClean) btnCopyClean.style.display = 'inline-flex';
  if (btnExitBatch) btnExitBatch.style.display = 'inline-flex';
  if (progressText) progressText.style.display = 'none';
  if (dom.btnPause) dom.btnPause.style.display = 'none';
  if (dom.btnResume) dom.btnResume.style.display = 'none';
  if (dom.btnExit) dom.btnExit.style.display = 'none';
}

// ============ 开始验证 ============
async function startVerification() {
  VerificationState.isVerifying = true;
  if (dom.btnPause) dom.btnPause.style.display = 'inline-flex';
  if (dom.btnResume) dom.btnResume.style.display = 'none';

  // 从当前索引开始验证
  for (let i = VerificationState.currentIndex; i < VerificationState.entries.length; i++) {
    if (VerificationState.isPaused) {
      console.log('[验证模式] 验证已暂停于索引:', i);
      VerificationState.currentIndex = i;
      return;
    }

    VerificationState.currentIndex = i;

    const entry = VerificationState.entries[i];
    if (entry && hasCachedDblpResult(entry)) {
      console.log('[验证模式] 跳过已有缓存的条目:', entry.id || entry.key || entry.index);
      restoreCachedDblpResult(entry);
      VerificationState.verifiedCount++;
      updateProgress();
      continue;
    }

    await verifyCurrentEntry();
    VerificationState.verifiedCount++;
    updateProgress();
  }

  // 验证完成
  VerificationState.isVerifying = false;
  console.log('[验证模式] 全部验证完成');
  
  // 更新进度显示为完成状态
  if (dom.progressText) {
    dom.progressText.textContent = `搜索完毕 (${VerificationState.entries.length}/${VerificationState.entries.length})`;
  }
  
  // 隐藏暂停按钮
  if (dom.btnPause) dom.btnPause.style.display = 'none';
  
  // 触发自定义事件，通知批量模式刷新（避免循环依赖）
  window.dispatchEvent(new CustomEvent('verification-completed', { 
    detail: { entries: VerificationState.entries } 
  }));
}

// ============ 验证当前条目 ============
async function verifyCurrentEntry() {
  const entry = VerificationState.entries[VerificationState.currentIndex];
  const currentIndex = VerificationState.currentIndex;
  const originalIndex = entry.index; // 使用条目的原始索引
  console.log('[验证模式] 验证条目:', currentIndex, '原始索引:', originalIndex, entry.id);

  // 获取该条目的DBLP结果容器（使用原始索引）
  const dblpResultContainer = document.getElementById(`dblp-result-${originalIndex}`);
  if (!dblpResultContainer) {
    console.error('[验证模式] 找不到DBLP结果容器:', `dblp-result-${originalIndex}`);
    console.log('[验证模式] 可用的容器:', 
      Array.from(document.querySelectorAll('[id^="dblp-result-"]')).map(el => el.id)
    );
    return;
  }

  const dblpFieldsList = dblpResultContainer.querySelector('.dblp-fields-list');
  const matchConfidenceEl = dblpResultContainer.querySelector('.match-confidence');
  
  if (!dblpFieldsList) {
    console.error('[验证模式] 找不到 dblp-fields-list');
    return;
  }
  
  if (!matchConfidenceEl) {
    console.error('[验证模式] 找不到 match-confidence');
    return;
  }

  // 显示加载状态
  dblpFieldsList.innerHTML = '<div class="empty-state"><p>正在搜索 DBLP...</p></div>';

  // 调用 DBLP 验证
  try {
    const result = await validateEntryInDBLP(entry);
    console.log('[验证模式] 验证结果:', result);
    console.log('[验证模式] result.matched:', result?.matched);
    console.log('[验证模式] result.matchedEntry:', result?.matchedEntry);
    
    if (result && result.matched && result.matchedEntry) {
      console.log('[验证模式] 开始渲染 DBLP 结果');
      // 显示 DBLP 结果（使用原始索引）
      renderDBLPResult(entry, result.matchedEntry, result.confidence, dblpFieldsList, matchConfidenceEl, originalIndex);
      
      // 保存验证结果到条目
      entry.dblpVerified = true;
      entry.dblpMatched = true;
      entry.dblpEntry = result.matchedEntry;
      entry.dblpConfidence = result.confidence;
    } else {
      console.log('[验证模式] 未匹配，渲染空结果');
      // 未匹配 - 添加警告
      renderNoMatch(dblpFieldsList, matchConfidenceEl);
      // 缓存空结果，避免切换筛选后丢失
      entry.dblpHtml = dblpFieldsList.innerHTML;
      entry.dblpMatchConfidenceHtml = matchConfidenceEl.innerHTML;
      entry.dblpConfidenceClass = matchConfidenceEl.className;
      entry.dblpVerified = true;
      entry.dblpMatched = false;
      entry.isAISuspected = true;
      
      // 添加警告到条目
      if (!entry.warnings) entry.warnings = [];
      const warningExists = entry.warnings.some(w => w.type === 'dblp_not_found');
      if (!warningExists) {
        entry.warnings.push({
          type: 'dblp_not_found',
          field: 'dblp',
          message: '疑似虚假论文或 AI 生成，DBLP 库检索不到',
          severity: 'high'
        });
      }
    }
  } catch (error) {
    console.error('[验证模式] 验证失败:', error);
    renderVerificationError(error, dblpFieldsList);
  }

  // 等待一段时间再继续（API 限流）
  await new Promise(resolve => setTimeout(resolve, 500));
}

// ============ 渲染 DBLP 结果 ============
function renderDBLPResult(entry, dblpEntry, confidence, container, confidenceEl, index) {
  console.log('[验证模式] renderDBLPResult 被调用');
  console.log('[验证模式] container:', container);
  console.log('[验证模式] dblpEntry:', dblpEntry);
  
  // 解析当前条目的字段（使用 parsedEntry.fields）
  const currentFields = entry.parsedEntry?.fields || {};

  // DBLP 条目按原样展示，不新增衍生字段
  const dblpFields = {};
  Object.entries(dblpEntry || {}).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    if (key === 'authors' || key === 'author') {
      const formatted = Array.isArray(value)
        ? value.map(a => (typeof a === 'string' ? a : a.text || '')).join(' and ')
        : value;
      dblpFields[key] = formatted ? String(formatted) : '';
      return;
    }
    dblpFields[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
  });

  // 显示匹配度
  const confidenceClass = confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low';
  confidenceEl.innerHTML = `<span class="${confidenceClass}">匹配度: ${(confidence * 100).toFixed(0)}%</span>`;
  confidenceEl.className = `match-confidence ${confidenceClass}`;

  // 生成字段对比列表
  const allKeys = new Set([...Object.keys(currentFields), ...Object.keys(dblpFields)]);
  const fieldsHTML = Array.from(allKeys).map(key => {
    const currentValue = (currentFields[key] || '').trim();
    const dblpValue = (dblpFields[key] || '').trim();
    
    if (!dblpValue) return ''; // DBLP 没有此字段，不显示
    
    // 智能比较：规范化后比较
    const normalize = (str) => str.toLowerCase().replace(/\s+/g, ' ').trim();
    const isMatched = normalize(currentValue) === normalize(dblpValue);
    
    let btnClass = 'matched';
    let btnIcon = '✓';
    let btnTitle = '字段一致';
    
    if (!currentValue) {
      btnClass = 'missing';
      btnIcon = '+';
      btnTitle = '添加字段';
    } else if (!isMatched) {
      btnClass = 'different';
      btnIcon = '↻';
      btnTitle = '更新字段';
    }

    return `
      <div class="dblp-field-item">
        <button class="dblp-field-action-btn ${btnClass}" 
                data-field="${escapeHtml(key)}" 
                data-value="${escapeHtml(dblpValue)}"
                data-entry-index="${index}"
                title="${btnTitle}"
                ${btnClass === 'matched' ? 'disabled' : ''}>
          ${btnIcon}
        </button>
        <div class="dblp-field-content">
          <div class="dblp-field-name">${escapeHtml(key)}</div>
          <div class="dblp-field-value">${escapeHtml(dblpValue)}</div>
        </div>
      </div>
    `;
  }).filter(Boolean).join('');

  container.innerHTML = fieldsHTML || '<div class="empty-state"><p>无可用字段</p></div>';

  // 缓存渲染结果，便于批量模式重新渲染或切换筛选后还原
  entry.dblpHtml = container.innerHTML;
  entry.dblpMatchConfidenceHtml = confidenceEl.innerHTML;
  entry.dblpConfidenceClass = confidenceEl.className;

  // 绑定更新按钮事件（不包括已匹配的按钮）
  container.querySelectorAll('.dblp-field-action-btn').forEach(btn => {
    if (btn.classList.contains('matched') || btn.disabled) {
      return; // 跳过已匹配的按钮
    }
    
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const fieldName = btn.dataset.field;
      const fieldValue = btn.dataset.value;
      const entryIndex = parseInt(btn.dataset.entryIndex);
      
      console.log('[验证模式] 点击字段按钮:', fieldName, '=', fieldValue, 'index:', entryIndex);
      
      updateEntryField(entryIndex, fieldName, fieldValue);
      
      // 更新按钮状态为已匹配
      btn.className = 'dblp-field-action-btn matched';
      btn.innerHTML = '✓';
      btn.disabled = true;
    });
  });
}

// ============ 渲染未匹配 ============
function renderNoMatch(container, confidenceEl) {
  confidenceEl.innerHTML = `<span class="low">未找到匹配</span>`;
  confidenceEl.className = 'match-confidence low';

  container.innerHTML = `
    <div class="empty-state">
      <p>未在 DBLP 中找到匹配的论文</p>
      <p style="font-size: 0.65rem; color: var(--md-sys-color-on-surface-variant); margin-top: 4px;">
        可能是虚假论文或 AI 生成的条目
      </p>
    </div>
  `;
}

// ============ 渲染验证错误 ============
function renderVerificationError(error, container) {
  container.innerHTML = `
    <div class="empty-state">
      <p style="color: var(--md-sys-color-error);">验证失败</p>
      <p style="font-size: 0.65rem;">${escapeHtml(error.message)}</p>
    </div>
  `;
}

// ============ 更新条目字段 ============
function updateEntryField(entryIndex, fieldName, fieldValue) {
  // 通过 entry.index 查找条目（而不是数组索引）
  const entry = VerificationState.entries.find(e => e.index === entryIndex);
  console.log('[验证模式] 更新字段, entryIndex:', entryIndex, fieldName, '=', fieldValue);

  if (!entry || !entry.parsedEntry) {
    console.error('[验证模式] 条目不存在或未解析, entryIndex:', entryIndex);
    return;
  }

  console.log('[验证模式] 找到条目:', entry.id);

  // 更新解析后的字段
  if (!entry.parsedEntry.fields) {
    entry.parsedEntry.fields = {};
  }
  entry.parsedEntry.fields[fieldName] = fieldValue;
  
  // 查找左侧编辑区的对应字段（使用 entryIndex）
  const card = document.querySelector(`.entry-card[data-entry-index="${entryIndex}"]`);
  if (!card) {
    console.error('[验证模式] 找不到条目卡片, entryIndex:', entryIndex);
    return;
  }
  
  // 更新左侧字段编辑器
  const fieldEditor = card.querySelector(`[data-field="${fieldName}"][contenteditable="true"]`);
  if (fieldEditor) {
    fieldEditor.textContent = fieldValue;
    console.log('[验证模式] 已更新左侧字段编辑器');
  } else {
    // 字段不存在，需要添加
    console.log('[验证模式] 字段不存在，直接插入到编辑器');
    const editorContainer = card.querySelector('.entry-fields-editor');
    if (editorContainer) {
      const row = document.createElement('div');
      row.className = 'field-row';
      row.dataset.field = fieldName;
      row.innerHTML = `
        <span class="field-name">${escapeHtml(fieldName)}</span>
        <span class="field-eq"> = </span>
        <span class="field-brace-left">{</span>
        <div class="field-value" contenteditable="true" data-field="${escapeHtml(fieldName)}" data-entry-index="${entryIndex}">${escapeHtml(fieldValue)}</div>
        <span class="field-brace-right">}</span>
      `;
      // 插入到“添加字段”行之前
      const addRow = editorContainer.querySelector('.add-field-row');
      if (addRow) {
        editorContainer.insertBefore(row, addRow);
      } else {
        editorContainer.appendChild(row);
      }
      // 绑定编辑事件（与原逻辑一致）
      const newField = row.querySelector('[contenteditable="true"]');
      if (newField) {
        newField.addEventListener('blur', () => {
          const newVal = newField.textContent;
          updateEntryField(entryIndex, fieldName, newVal);
        });
        newField.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const newVal = newField.textContent;
            updateEntryField(entryIndex, fieldName, newVal);
            newField.blur();
          }
        });
        newField.addEventListener('paste', (e) => {
          e.preventDefault();
          const text = (e.clipboardData || window.clipboardData).getData('text/plain');
          document.execCommand('insertText', false, text);
        });
      }
    }
  }
  
  // 重新处理条目以生成转换结果
  const bibtexText = reconstructBibtex(entry.parsedEntry);
  const rules = parseMappingRules(ConfigManager.getMappings());
  const resultObj = processEntries(
    bibtexText,
    rules,
    ConfigManager.getFormat(),
    ConfigManager.getFields(),
    ConfigManager.getVenueMode(),
    ConfigManager.getKeepOriginal(),
    null,
    ConfigManager.getCustomRules()
  );
  entry.rawBibtex = bibtexText;
  entry.convertedEntry = resultObj?.data?.[0];
  
  if (resultObj && resultObj.data && resultObj.data[0]) {
    entry.convertedBibtex = toBibTeX(resultObj.data[0]);
    
    // 更新右侧预览
    const previewContent = card.querySelector('.entry-preview-content');
    if (previewContent) {
      previewContent.textContent = entry.convertedBibtex;
      console.log('[验证模式] 已更新右侧预览');
    }
  }

  // 重新检测警告与AI标记
  const flatEntry = {
    type: entry.parsedEntry.type,
    id: entry.parsedEntry.key,
    ...(entry.parsedEntry.fields || {})
  };
  const warnings = detectWarnings(flatEntry, resultObj);
  const venueWarnings = (resultObj.entryWarnings && resultObj.entryWarnings[0]) || [];
  const mergedWarnings = warnings.concat(venueWarnings.map(msg => ({
    type: 'venue_mapping',
    field: 'booktitle',
    message: msg
  })));
  entry.warnings = mergedWarnings;

  const aiDetection = detectAIGenerated(flatEntry);
  entry.isAISuspected = aiDetection.isAISuspected;
  entry.aiSignals = aiDetection.signals;
  entry.aiConfidence = aiDetection.confidence;

  if (entry.isIgnored && mergedWarnings.length === 0) {
    entry.isIgnored = false;
  }

  // 更新卡片警告显示与状态
  updateCardWarningsInline(card, entry);

  // 同步顶部统计（避免循环依赖，使用全局暴露的更新函数）
  if (window.batchUpdateStats) {
    window.batchUpdateStats();
  }
}

// 局部更新卡片的警告区域与样式（避免整卡重渲染）
function updateCardWarningsInline(card, entry) {
  let warningsDiv = card.querySelector('.entry-warnings');

  if (entry.warnings && entry.warnings.length > 0) {
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

  // 更新卡片样式类
  card.classList.remove('warning', 'confirmed', 'ignored', 'unprocessed');
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
}

// 导出到全局，供批量模式重新绑定事件时使用
window.verificationModeUpdateField = updateEntryField;

// ============ 缓存检测与还原 ============
function hasCachedDblpResult(entry) {
  return Boolean(entry && (entry.dblpHtml || entry.dblpMatchConfidenceHtml || entry.dblpEntry));
}

function restoreCachedDblpResult(entry) {
  const container = document.getElementById(`dblp-result-${entry.index}`);
  if (!container) return;

  const fieldsList = container.querySelector('.dblp-fields-list');
  const confidenceEl = container.querySelector('.match-confidence');
  if (!fieldsList || !confidenceEl) return;

  if (entry.dblpHtml) {
    fieldsList.innerHTML = entry.dblpHtml;
  }
  if (entry.dblpMatchConfidenceHtml) {
    confidenceEl.innerHTML = entry.dblpMatchConfidenceHtml;
  }
  if (entry.dblpConfidenceClass) {
    confidenceEl.className = entry.dblpConfidenceClass;
  }

  // 重新绑定字段按钮（缓存的 HTML 没有事件绑定）
  fieldsList.querySelectorAll('.dblp-field-action-btn').forEach(btn => {
    if (btn.classList.contains('matched') || btn.disabled) {
      return;
    }
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      const fieldName = btn.dataset.field;
      const fieldValue = btn.dataset.value;
      const entryIndex = parseInt(btn.dataset.entryIndex);

      updateEntryField(entryIndex, fieldName, fieldValue);

      btn.className = 'dblp-field-action-btn matched';
      btn.innerHTML = '✓';
      btn.disabled = true;
    });
  });
}

// ============ 重建 BibTeX ============
function reconstructBibtex(parsedEntry) {
  const type = parsedEntry.rawType || parsedEntry.type || 'article';
  const id = parsedEntry.key || parsedEntry.id || 'unknown';
  const fields = parsedEntry.fields || {};

  let bibtex = `@${type}{${id},\n`;
  Object.keys(fields).forEach(key => {
    if (fields[key]) {
      bibtex += `  ${key} = {${fields[key]}},\n`;
    }
  });
  bibtex += '}\n';
  return bibtex;
}

// ============ 更新进度 ============
function updateProgress() {
  if (dom.progressText) {
    dom.progressText.textContent = `验证中... ${VerificationState.verifiedCount} / ${VerificationState.entries.length}`;
  }
}

// ============ 更新工具栏 ============
function updateToolbar() {
  // 显示验证模式按钮
  const btnVerifyAll = document.getElementById('btn-verify-all');
  const btnCopyAll = document.getElementById('btn-copy-all');
  const btnCopyClean = document.getElementById('btn-copy-clean');
  const btnExitBatch = document.getElementById('btn-exit-batch-mode');
  const progressText = document.getElementById('verification-progress-text');
  
  // 隐藏批量模式按钮
  if (btnVerifyAll) btnVerifyAll.style.display = 'none';
  if (btnCopyAll) btnCopyAll.style.display = 'none';
  if (btnCopyClean) btnCopyClean.style.display = 'none';
  if (btnExitBatch) btnExitBatch.style.display = 'none';
  
  // 显示验证模式按钮
  if (dom.btnPause) dom.btnPause.style.display = 'inline-flex';
  if (dom.btnExit) dom.btnExit.style.display = 'inline-flex';
  if (progressText) {
    progressText.style.display = 'inline';
    progressText.textContent = `验证中... 0 / ${VerificationState.entries.length}`;
  }
}

// ============ 暂停验证 ============
function pauseVerification() {
  console.log('[验证模式] 暂停验证');
  VerificationState.isPaused = true;
  if (dom.btnPause) dom.btnPause.style.display = 'none';
  if (dom.btnResume) dom.btnResume.style.display = 'inline-flex';
}

// ============ 继续验证 ============
function resumeVerification() {
  console.log('[验证模式] 继续验证');
  VerificationState.isPaused = false;
  if (dom.btnPause) dom.btnPause.style.display = 'inline-flex';
  if (dom.btnResume) dom.btnResume.style.display = 'none';
  
  // 从当前位置继续
  startVerification();
}

// ============ 工具函数 ============
function parseEntryFields(bibtexStr) {
  const parsed = parseRawBibtex(bibtexStr);
  if (!parsed || parsed.length === 0) return {};
  return parsed[0].fields;
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
