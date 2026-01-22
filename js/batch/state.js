/**
 * 批量模式状态与常量
 */

// BibTeX 字段显示顺序
export const BIBTEX_FIELD_ORDER = [
  'title', 'author', 'booktitle', 'journal', 'venue', 'year',
  'volume', 'number', 'pages', 'publisher', 'organization',
  'doi', 'url', 'note'
];

// 批量模式状态
export const BatchModeState = {
  isActive: false,
  entries: [],
  currentIndex: 0,
  warnings: [],
  ignoredWarnings: {},
  confirmedEntries: [],
  aiSuspected: [],
  sortMode: 'warning_first',
  currentFilter: 'all',
  shouldResort: false,
  isVerifying: false,
  verificationCancelled: false,
  verificationProgress: {
    current: 0,
    total: 0,
    isPaused: false
  }
};

/**
 * 读取已忽略的警告配置
 */
export function loadIgnoredWarnings() {
  try {
    const saved = localStorage.getItem('bib-ignored-warnings');
    if (saved) {
      BatchModeState.ignoredWarnings = JSON.parse(saved);
    }
  } catch (e) {
    console.error('加载已忽略警告失败:', e);
  }
}

/**
 * 保存已忽略的警告配置
 */
export function saveIgnoredWarnings() {
  try {
    localStorage.setItem('bib-ignored-warnings', JSON.stringify(BatchModeState.ignoredWarnings));
  } catch (e) {
    console.error('保存已忽略警告失败:', e);
  }
}

/**
 * 清理已解决的忽略标记
 */
export function clearResolvedIgnored(entries) {
  entries.forEach(entry => {
    if (entry.isIgnored && (!entry.warnings || entry.warnings.length === 0)) {
      entry.isIgnored = false;
    }
  });
}
