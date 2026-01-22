/**
 * 批量模式核心逻辑
 * 负责模式切换、条目管理、UI渲染
 */

import { parseRawBibtex, processEntries, parseMappingRules } from './processor.js';
import { ConfigManager } from './config.js';
import { detectWarnings } from './warning-system.js';
import { detectAIGenerated } from './ai-detector.js';
import { getValidationStats } from './dblp-validator.js';
import { toBibTeX } from './formatters/bibtex.js';
import { showToast } from './utils.js';
import { enterVerificationMode } from './verification-mode.js';
import { BatchModeState, loadIgnoredWarnings, saveIgnoredWarnings, clearResolvedIgnored } from './batch/state.js';
import { debounce, copyToClipboard, escapeHtml, reconstructBibtex, calculateChanges } from './batch/utils.js';
import { sortEntries, filterEntries } from './batch/sort-filter.js';
import { renderPreviewList } from './batch/preview.js';
import { renderFieldsEditor } from './batch/fields-view.js';
import { bindFieldEditEvents } from './batch/field-events.js';
import { createEntryCard, updateCardWarnings, bindDblpActionButtons } from './batch/entry-card.js';
import { handleEntryAction } from './batch/actions.js';
import { createVerificationUI } from './batch/verification-ui.js';
import { createRechecker } from './batch/recheck.js';
import { createListRenderer } from './batch/list-renderer.js';
import { createControls } from './batch/controls.js';

export { BatchModeState, saveIgnoredWarnings };

let batchSwitchPromptDismissed = false;

// 批量模式 DOM 缓存
const dom = {
  singleModeContainer: null,
  batchModeContainer: null,
  batchInput: null,
  entriesList: null,
  previewList: null,
  batchStatTotal: null,
  batchStatWarnings: null,
  batchStatIgnored: null,
  batchStatConfirmed: null,
  filterChips: null,
  btnCopyAll: null,
  btnCopyClean: null,
  btnExitBatchMode: null,
  btnVerifyAll: null,
  btnCloseValidationPane: null,
  validationContent: null,
  batchMainGrid: null,
  modeSwitchDialog: null,
  entryCountText: null,
  btnStaySingleMode: null,
  btnSwitchToBatch: null,
  verificationModal: null,
  verifyProgressText: null,
  verifyProgressBar: null,
  btnCancelVerify: null
};

function cacheDom() {
  dom.singleModeContainer = document.getElementById('single-mode-container');
  dom.batchModeContainer = document.getElementById('batch-mode-container');
  dom.batchInput = document.getElementById('batch-input');
  dom.entriesList = document.getElementById('entries-list');
  dom.previewList = document.getElementById('preview-list');
  dom.batchStatTotal = document.getElementById('batch-stat-total');
  dom.batchStatWarnings = document.getElementById('batch-stat-warnings');
  dom.batchStatIgnored = document.getElementById('batch-stat-ignored');
  dom.batchStatConfirmed = document.getElementById('batch-stat-confirmed');
  dom.filterChips = document.querySelectorAll('.filter-chip');
  dom.btnCopyAll = document.getElementById('btn-copy-all');
  dom.btnCopyClean = document.getElementById('btn-copy-clean');
  dom.btnExitBatchMode = document.getElementById('btn-exit-batch-mode');
  dom.btnVerifyAll = document.getElementById('btn-verify-all');
  dom.btnCloseValidationPane = document.getElementById('btn-close-validation-pane');
  dom.validationContent = document.getElementById('validation-content');
  dom.batchMainGrid = document.querySelector('.batch-main-grid');
  dom.modeSwitchDialog = document.getElementById('mode-switch-dialog');
  dom.entryCountText = document.getElementById('entry-count-text');
  dom.btnStaySingleMode = document.getElementById('btn-stay-single-mode');
  dom.btnSwitchToBatch = document.getElementById('btn-switch-to-batch');
  dom.verificationModal = document.getElementById('verification-modal');
  dom.verifyProgressText = document.getElementById('verify-progress-text');
  dom.verifyProgressBar = document.getElementById('verify-progress-bar');
  dom.btnCancelVerify = document.getElementById('btn-cancel-verify');
}

export function initBatchMode() {
  cacheDom();
  loadIgnoredWarnings();
  recheckEntry = createRechecker(BatchModeState, {
    parseRawBibtex,
    parseMappingRules,
    processEntries,
    ConfigManager,
    toBibTeX,
    detectWarnings,
    detectAIGenerated,
    calculateChanges,
    updateStats,
    updateCardWarnings,
    updateBatchInput: updateBatchInputFromState
  });

  const listRenderer = createListRenderer(dom, BatchModeState, {
    sortEntries,
    filterEntries,
    createEntryCard,
    bindDblpActionButtons,
    renderFieldsEditor,
    bindFieldEditEvents,
    handleEntryAction,
    reconstructBibtex,
    recheckEntry,
    showToast,
    saveIgnoredWarnings,
    exitBatchMode,
    updateStats,
    getShowValidationDetails: () => verificationUI?.showValidationDetails || (() => {})
  });
  renderEntriesList = listRenderer.renderEntriesList;

  const controls = createControls(dom, BatchModeState, {
    renderEntriesList,
    renderPreviewList,
    copyToClipboard,
    escapeHtml,
    showToast
  });
  const { handleFilterChange: handleFilterChangeFn, bindFilterChips, copyAllEntries, copyCleanEntries } = controls;
  handleFilterChange = handleFilterChangeFn;

  verificationUI = createVerificationUI(dom, BatchModeState, {
    enterVerificationMode,
    getValidationStats,
    updateStats,
    renderEntriesList,
    handleFilterChange,
    showToast,
    escapeHtml
  });
  verificationUI.hideValidationPane();

  bindEventListeners();

  dom.batchInput?.addEventListener('input', debounce(handleBatchInputChange, 300));

  bindFilterChips();

  dom.btnCopyAll?.addEventListener('click', copyAllEntries);
  dom.btnCopyClean?.addEventListener('click', copyCleanEntries);
  dom.btnExitBatchMode?.addEventListener('click', exitBatchMode);
  dom.btnCloseValidationPane?.addEventListener('click', verificationUI.hideValidationPane);
  dom.btnVerifyAll?.addEventListener('click', verificationUI.handleVerifyAll);
  dom.btnCancelVerify?.addEventListener('click', verificationUI.handleCancelVerification);

  // 初始统计与空状态
  updateStats();
}

let verificationUI = null;
let recheckEntry = null;
export let renderEntriesList = () => {};
let handleFilterChange = () => {};


/**
 * 绑定事件监听器
 */
function bindEventListeners() {
  // 模式切换对话框
  dom.btnStaySingleMode?.addEventListener('click', () => {
    batchSwitchPromptDismissed = true;
    closeModeSwitchDialog();
  });

  dom.btnSwitchToBatch?.addEventListener('click', () => {
    closeModeSwitchDialog();
    switchToBatchMode();
  });
}

/**
 * 检查是否应该切换到批量模式
 * @param {Array} entries - 解析出的条目数组
 * @returns {boolean} - 是否应该提示切换
 */
export function checkShouldSwitchToBatchMode(entries) {
  // 如果已经在批量模式，不提示
  if (BatchModeState.isActive) {
    return false;
  }

  if (batchSwitchPromptDismissed) {
    return false;
  }

  // 如果条目数 >= 3，提示切换
  if (entries && entries.length >= 3) {
    return true;
  }

  return false;
}

/**
 * 显示模式切换对话框
 * @param {number} entryCount - 条目数量
 */
export function showModeSwitchDialog(entryCount) {
  if (dom.entryCountText) {
    dom.entryCountText.textContent = entryCount;
  }
  dom.modeSwitchDialog?.classList.remove('hidden');
}

/**
 * 关闭模式切换对话框
 */
function closeModeSwitchDialog() {
  dom.modeSwitchDialog?.classList.add('hidden');
}

/**
 * 切换到批量模式
 */
export function switchToBatchMode() {
  console.log('切换到批量模式');

  BatchModeState.isActive = true;

  // 隐藏单条模式，显示批量模式
  dom.singleModeContainer?.classList.add('hidden');
  dom.batchModeContainer?.classList.remove('hidden');

  // 将单条模式的输入复制到批量模式
  const singleInput = document.getElementById('input');
  if (singleInput && dom.batchInput) {
    dom.batchInput.value = singleInput.value;

    // 立即触发解析
    setTimeout(() => {
      handleBatchInputChange();
    }, 100);
  }
}

/**
 * 退出批量模式
 */
export function exitBatchMode() {
  console.log('退出批量模式');

  BatchModeState.isActive = false;

  // 显示单条模式，隐藏批量模式
  dom.batchModeContainer?.classList.add('hidden');
  dom.singleModeContainer?.classList.remove('hidden');

   // 将当前批量输入回填到单条模式，避免还原到旧内容
  const singleInput = document.getElementById('input');
  if (singleInput && dom.batchInput) {
    singleInput.value = dom.batchInput.value;
  }

  // 清空批量模式状态
  resetBatchModeState();
}

/**
 * 重置批量模式状态
 */
function resetBatchModeState() {
  BatchModeState.entries = [];
  BatchModeState.warnings = [];
  BatchModeState.confirmedEntries = [];
  BatchModeState.aiSuspected = [];
  BatchModeState.currentIndex = 0;
  BatchModeState.currentFilter = 'all';

  // 清空列表
  if (dom.entriesList) {
    dom.entriesList.innerHTML = '<div class="empty-state"><p>粘贴 BibTeX 条目后，这里将显示条目列表</p></div>';
  }
  if (dom.previewList) {
    dom.previewList.innerHTML = '<div class="empty-state"><p>转换结果预览</p></div>';
  }

  // 重置统计
  updateStats();
}

function updateBatchInputFromState() {
  if (!dom.batchInput) return;
  const merged = [...BatchModeState.entries]
    .sort((a, b) => (a.index || 0) - (b.index || 0))
    .map(e => e.rawBibtex || '')
    .filter(Boolean)
    .join('\n\n');
  dom.batchInput.value = merged;
}

/**
 * 处理批量输入变化
 */
function handleBatchInputChange() {
  const inputText = dom.batchInput?.value || '';

  if (!inputText.trim()) {
    processBatchEntries([]);
    return;
  }

  try {
    const parsedEntries = parseRawBibtex(inputText);
    if (!parsedEntries || parsedEntries.length === 0) {
      processBatchEntries([]);
      return;
    }

    const mappingRules = parseMappingRules(ConfigManager.getMappings());
    const resultObj = processEntries(
      inputText,
      mappingRules,
      ConfigManager.getFormat(),
      ConfigManager.getFields(),
      ConfigManager.getVenueMode(),
      ConfigManager.getKeepOriginal(),
      null,
      ConfigManager.getCustomRules()
    );

    const processedEntries = parsedEntries.map((entry, idx) => {
      const converted = resultObj.data && resultObj.data[idx];
      const convertedBibtex = converted ? toBibTeX(converted) : reconstructBibtex(entry);

      const flatEntry = {
        type: entry.type,
        id: entry.key,
        ...(entry.fields || {})
      };

      const warnings = detectWarnings(flatEntry, resultObj);
      const venueWarnings = (resultObj.entryWarnings && resultObj.entryWarnings[idx]) || [];
      const mergedWarnings = warnings.concat(venueWarnings.map(msg => ({
        type: 'venue_mapping',
        field: 'booktitle',
        message: msg
      })));
      const aiDetection = detectAIGenerated(flatEntry);
      const rawText = reconstructBibtex(entry);

      return {
        ...entry,
        index: idx,
        rawBibtex: rawText,
        parsedEntry: entry,
        convertedEntry: converted,
        convertedBibtex,
        warnings: mergedWarnings,
        isIgnored: false,
        isConfirmed: false,
        isAISuspected: aiDetection.isAISuspected,
        aiSignals: aiDetection.signals,
        aiConfidence: aiDetection.confidence,
        changeCount: calculateChanges(rawText, convertedBibtex)
      };
    });

    BatchModeState.shouldResort = true;

    processBatchEntries(processedEntries);
  } catch (err) {
    console.error('解析失败:', err);
    showToast('解析BibTeX失败，请检查格式');
  }
}

/**
 * 重新处理所有条目（当设置变更时调用）
 */
export function reprocessAllEntries() {
  if (!BatchModeState.isActive || !dom.batchInput) {
    return;
  }

  console.log('设置变更，重新处理所有条目...');
  handleBatchInputChange();
}

/**
 * 处理批量条目
 * @param {Array} entries - 解析出的条目
 */
export function processBatchEntries(entries) {
  console.log('处理批量条目:', entries.length);

  BatchModeState.entries = entries;

  // 检查并清理已解决的忽略标记
  clearResolvedIgnored(BatchModeState.entries);

  // 渲染条目列表
  renderEntriesList();

  // 更新统计
  updateStats();

  // 刷新同步滚动（已不需要）
  // setTimeout(() => {
  //   refreshSyncScroll();
  // }, 100);
}

/**
 * 渲染条目列表
 */
/**
 * 更新统计信息
 */
export function updateStats() {
  const total = BatchModeState.entries.length;
  const warnings = BatchModeState.entries.filter(e => e.warnings && e.warnings.length > 0 && !e.isIgnored).length;
  const ignoredCount = BatchModeState.entries.filter(e => e.isIgnored === true).length;
  const confirmed = BatchModeState.entries.filter(e => e.isConfirmed === true).length;

  if (dom.batchStatTotal) dom.batchStatTotal.textContent = `全部 (${total})`;
  if (dom.batchStatWarnings) dom.batchStatWarnings.textContent = `⚠️ 仅警告 (${warnings})`;
  if (dom.batchStatIgnored) dom.batchStatIgnored.textContent = `🚫 已忽略 (${ignoredCount})`;
  if (dom.batchStatConfirmed) dom.batchStatConfirmed.textContent = `✓ 已确认 (${confirmed})`;
}

// 暴露统计更新以便验证模式在不引入循环依赖的情况下刷新顶部计数
window.batchUpdateStats = updateStats;

// ==================== 工具函数 ====================


