/**
 * 警告检测和管理系统
 */

// 警告类型定义
export const WarningTypes = {
  VENUE_UNKNOWN: {
    id: 'venue_unknown',
    label: '会议/期刊场所未识别',
    icon: '📍'
  },
  MISSING_FIELD: {
    id: 'missing_field',
    label: '缺少必要字段',
    icon: '📝'
  },
  FORMAT_ISSUE: {
    id: 'format_issue',
    label: '格式不规范',
    icon: '⚠️'
  },
  AI_GENERATED: {
    id: 'ai_generated',
    label: 'AI生成疑似',
    icon: '🤖'
  }
};

/**
 * 检测条目警告
 * @param {Object} entry - BibTeX条目
 * @param {Object} processingResult - 处理结果（包含venue映射信息）
 * @returns {Array} - 警告列表
 */
export function detectWarnings(entry, processingResult) {
  const warnings = [];

  // 检测1: 会议/期刊场所未识别
  if (processingResult && processingResult.venueWarning) {
    warnings.push({
      type: WarningTypes.VENUE_UNKNOWN.id,
      field: 'booktitle',
      message: `会议场所未识别 (${entry.booktitle || entry.journal || '未知'})`,
      originalValue: entry.booktitle || entry.journal,
      suggestion: processingResult.venueSuggestion || null
    });
  }

  // 检测2: 缺少必要字段
  const missingFields = checkMissingFields(entry);
  if (missingFields.length > 0) {
    missingFields.forEach(field => {
      warnings.push({
        type: WarningTypes.MISSING_FIELD.id,
        field: field,
        message: `缺少字段: ${field}`,
        severity: 'error'  // 必要字段缺失是高严重级
      });
    });
  }

  // 检测3: 格式问题
  const formatIssues = checkFormatIssues(entry);
  formatIssues.forEach(issue => {
    warnings.push({
      type: WarningTypes.FORMAT_ISSUE.id,
      field: issue.field,
      message: issue.message,
      originalValue: issue.originalValue,
      suggestedValue: issue.suggestedValue
    });
  });

  return warnings;
}

/**
 * 检查缺失字段
 */
function checkMissingFields(entry) {
  const missing = [];

  // 根据条目类型检查必要字段
  const entryType = (entry.type || '').toLowerCase();

  const hasVenueField = Boolean(
    (entry.booktitle && entry.booktitle.trim()) ||
    (entry.journal && entry.journal.trim()) ||
    (entry.venue && entry.venue.trim())
  );

  // 通用必要字段检查
  if (!entry.author || entry.author.trim() === '' || entry.author.toLowerCase().includes('unknown')) {
    missing.push('author');
  }

  if (!entry.title || entry.title.trim() === '') {
    missing.push('title');
  }

  if (!entry.year || entry.year.toString().trim() === '') {
    missing.push('year');
  }

  // 期刊论文必要字段
  if (entryType === 'article') {
    if (!hasVenueField) {
      missing.push('booktitle/journal/venue');
    }
  }

  // 会议论文必要字段
  if (entryType === 'inproceedings' || entryType === 'conference') {
    if (!hasVenueField) {
      missing.push('booktitle/journal/venue');
    }
  }

  // 书籍必要字段
  if (entryType === 'book' || entryType === 'inbook') {
    if (!entry.publisher || entry.publisher.trim() === '') {
      missing.push('publisher');
    }
  }

  return missing;
}

/**
 * 检查格式问题
 */
function checkFormatIssues(entry) {
  const issues = [];

  // 检查页码格式 (应该使用 -- 而不是 -)
  if (entry.pages) {
    const pagesStr = String(entry.pages);
    // 检测单个连字符（但不是双连字符）
    if (pagesStr.includes('-') && !pagesStr.includes('--')) {
      const suggestedPages = pagesStr.replace(/(\d+)-(\d+)/g, '$1--$2');
      issues.push({
        field: 'pages',
        message: `页码格式不规范 (${pagesStr} 应为 ${suggestedPages})`,
        originalValue: pagesStr,
        suggestedValue: suggestedPages
      });
    }
  }

  // 检查年份格式
  if (entry.year) {
    const yearStr = String(entry.year);
    if (!/^\d{4}$/.test(yearStr)) {
      issues.push({
        field: 'year',
        message: `年份格式异常 (${yearStr})`,
        originalValue: yearStr,
        suggestedValue: null
      });
    }
  }

  // 检查DOI格式
  if (entry.doi) {
    const doiStr = String(entry.doi);
    if (!doiStr.startsWith('10.')) {
      issues.push({
        field: 'doi',
        message: `DOI格式可能不正确 (${doiStr})`,
        originalValue: doiStr,
        suggestedValue: null
      });
    }
  }

  return issues;
}

/**
 * 按类型分组警告
 * @param {Array} entries - 所有条目
 * @returns {Object} - 按类型分组的警告
 */
export function groupWarningsByType(entries) {
  const grouped = {};

  entries.forEach(entry => {
    if (!entry.warnings) return;

    entry.warnings.forEach(warning => {
      const type = warning.type;
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push({
        entryId: entry.id,
        entryIndex: entry.index,
        warning: warning
      });
    });
  });

  return grouped;
}

/**
 * 忽略单个条目的警告
 * @param {Object} entry - 条目
 * @param {Array} warningIndices - 要忽略的警告索引
 */
export function ignoreEntryWarnings(entry, warningIndices) {
  if (!entry.warnings) return;

  // 标记警告为已忽略
  warningIndices.forEach(index => {
    if (entry.warnings[index]) {
      entry.warnings[index].ignored = true;
    }
  });

  // 移除所有已忽略的警告
  entry.warnings = entry.warnings.filter(w => !w.ignored);
}

/**
 * 忽略同类型警告
 * @param {Array} entries - 所有条目
 * @param {string} warningType - 警告类型
 * @param {Object} ignoredWarnings - 已忽略警告存储对象
 * @returns {number} - 受影响的条目数
 */
export function ignoreSameTypeWarnings(entries, warningType, ignoredWarnings) {
  let affectedCount = 0;

  entries.forEach(entry => {
    if (!entry.warnings) return;

    const typeWarnings = entry.warnings.filter(w => w.type === warningType);
    if (typeWarnings.length > 0) {
      affectedCount++;

      // 标记为已忽略
      entry.warnings = entry.warnings.filter(w => w.type !== warningType);

      // 记录到ignoredWarnings
      if (!ignoredWarnings[warningType]) {
        ignoredWarnings[warningType] = [];
      }
      typeWarnings.forEach(w => {
        if (!ignoredWarnings[warningType].includes(entry.id)) {
          ignoredWarnings[warningType].push(entry.id);
        }
      });
    }
  });

  return affectedCount;
}

/**
 * 撤销忽略某类型警告
 * @param {Array} entries - 所有条目
 * @param {string} warningType - 警告类型
 * @param {Object} ignoredWarnings - 已忽略警告存储对象
 */
export function undoIgnoreWarnings(entries, warningType, ignoredWarnings) {
  // 从ignoredWarnings中移除
  const affectedIds = ignoredWarnings[warningType] || [];
  delete ignoredWarnings[warningType];

  // TODO: 需要重新检测这些条目的警告
  // 这需要存储原始警告信息或重新运行检测
  console.log('撤销忽略:', warningType, '影响条目:', affectedIds);

  return affectedIds.length;
}

/**
 * 获取警告统计信息
 * @param {Array} entries - 所有条目
 * @returns {Object} - 统计信息
 */
export function getWarningStats(entries) {
  const stats = {
    total: 0,
    byType: {}
  };

  Object.keys(WarningTypes).forEach(key => {
    const type = WarningTypes[key];
    stats.byType[type.id] = {
      label: type.label,
      icon: type.icon,
      count: 0,
      entries: []
    };
  });

  entries.forEach(entry => {
    if (!entry.warnings || entry.warnings.length === 0) return;

    stats.total += entry.warnings.length;

    entry.warnings.forEach(warning => {
      if (stats.byType[warning.type]) {
        stats.byType[warning.type].count++;
        stats.byType[warning.type].entries.push(entry.id);
      }
    });
  });

  return stats;
}
