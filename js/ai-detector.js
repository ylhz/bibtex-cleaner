/**
 * AI生成条目检测系统
 */

/**
 * 检测条目是否可能由AI生成
 * @param {Object} entry - BibTeX条目
 * @returns {Object} - 检测结果 { isAISuspected, signals, confidence }
 */
export function detectAIGenerated(entry) {
  const signals = [];

  // 规则1: 作者名只有 "et al."
  if (checkAuthorEtAlOnly(entry)) {
    signals.push({
      type: 'author_et_al_only',
      message: '作者格式异常（仅 et al.）',
      severity: 'high'
    });
  }

  // 规则2: 缺少验证字段组合
  if (checkMissingVerificationFields(entry)) {
    signals.push({
      type: 'missing_verification_fields',
      message: '缺少可验证字段（DOI/URL/页码）',
      severity: 'medium'
    });
  }

  // 规则3: 标题过于通用
  if (checkGenericTitle(entry)) {
    signals.push({
      type: 'generic_title',
      message: '标题格式过于通用',
      severity: 'low'
    });
  }

  // 规则4: 年份异常
  const yearIssue = checkAbnormalYear(entry);
  if (yearIssue) {
    signals.push({
      type: 'abnormal_year',
      message: yearIssue,
      severity: 'high'
    });
  }

  // 规则5: 期刊论文缺少页码
  if (checkMissingPages(entry)) {
    signals.push({
      type: 'missing_pages',
      message: '期刊论文缺少页码',
      severity: 'medium'
    });
  }

  // 规则6: 作者名格式异常（全部大写或全部小写）
  if (checkAbnormalAuthorCase(entry)) {
    signals.push({
      type: 'abnormal_author_case',
      message: '作者名大小写格式异常',
      severity: 'medium'
    });
  }

  // 规则7: 出版商/会议名称过于简短或模糊
  if (checkVagueVenue(entry)) {
    signals.push({
      type: 'vague_venue',
      message: '会议/期刊名称过于简短或模糊',
      severity: 'medium'
    });
  }

  // 计算置信度
  const confidence = calculateConfidence(signals);

  // 判断是否疑似AI生成（满足2个以上特征）
  const isAISuspected = signals.length >= 2;

  return {
    isAISuspected,
    signals,
    confidence,
    signalCount: signals.length
  };
}

/**
 * 规则1: 检查作者名是否只有 "et al."
 */
function checkAuthorEtAlOnly(entry) {
  if (!entry.author) return false;

  const authorStr = String(entry.author).toLowerCase().trim();

  // 检查是否包含 "et al." 但不包含 "and"
  return authorStr.includes('et al') && !authorStr.includes('and');
}

/**
 * 规则2: 检查是否缺少验证字段
 */
function checkMissingVerificationFields(entry) {
  // 如果同时缺少 DOI、URL、页码，则可疑
  return !entry.doi && !entry.url && !entry.pages;
}

/**
 * 规则3: 检查标题是否过于通用
 */
function checkGenericTitle(entry) {
  if (!entry.title) return false;

  const titleStr = String(entry.title);

  // 匹配通用模式
  const genericPatterns = [
    /^(A|An|The)\s+(Study|Analysis|Survey|Review)\s+(of|on)\s+/i,
    /^Introduction\s+to\s+/i,
    /^Overview\s+of\s+/i,
    /^Research\s+on\s+/i
  ];

  return genericPatterns.some(pattern => pattern.test(titleStr));
}

/**
 * 规则4: 检查年份是否异常
 */
function checkAbnormalYear(entry) {
  if (!entry.year) return null;

  const yearNum = parseInt(entry.year, 10);
  const currentYear = new Date().getFullYear();

  // 未来年份
  if (yearNum > currentYear) {
    return `年份异常（${yearNum}，未来年份）`;
  }

  // 过于久远（1900年以前）
  if (yearNum < 1900) {
    return `年份异常（${yearNum}，过于久远）`;
  }

  // 无效年份
  if (isNaN(yearNum)) {
    return `年份格式异常（${entry.year}）`;
  }

  return null;
}

/**
 * 规则5: 检查期刊论文是否缺少页码
 */
function checkMissingPages(entry) {
  const entryType = (entry.type || '').toLowerCase();

  // 只检查期刊论文
  if (entryType === 'article' && !entry.pages) {
    return true;
  }

  return false;
}

/**
 * 规则6: 检查作者名大小写是否异常
 */
function checkAbnormalAuthorCase(entry) {
  if (!entry.author) return false;

  const authorStr = String(entry.author);

  // 检查是否全部大写（长度>10才检查，避免误伤缩写）
  if (authorStr.length > 10 && authorStr === authorStr.toUpperCase()) {
    return true;
  }

  // 检查是否全部小写（长度>10才检查）
  if (authorStr.length > 10 && authorStr === authorStr.toLowerCase()) {
    return true;
  }

  return false;
}

/**
 * 规则7: 检查会议/期刊名称是否过于模糊
 */
function checkVagueVenue(entry) {
  const venue = entry.booktitle || entry.journal;
  if (!venue) return false;

  const venueStr = String(venue).trim();

  // 名称过短（少于3个字符）
  if (venueStr.length < 3) {
    return true;
  }

  // 常见的模糊名称
  const vaguePatterns = [
    /^conference$/i,
    /^journal$/i,
    /^proceedings$/i,
    /^workshop$/i,
    /^symposium$/i
  ];

  return vaguePatterns.some(pattern => pattern.test(venueStr));
}

/**
 * 计算AI生成置信度
 * @param {Array} signals - 检测信号
 * @returns {number} - 置信度 (0-100)
 */
function calculateConfidence(signals) {
  if (signals.length === 0) return 0;

  // 根据信号严重程度加权
  const weights = {
    high: 30,
    medium: 20,
    low: 10
  };

  let totalWeight = 0;
  signals.forEach(signal => {
    totalWeight += weights[signal.severity] || 10;
  });

  // 最高100%
  return Math.min(100, totalWeight);
}

/**
 * 批量检测条目
 * @param {Array} entries - 条目数组
 * @returns {Array} - 带有AI检测结果的条目数组
 */
export function detectAIGeneratedBatch(entries) {
  return entries.map(entry => {
    const detection = detectAIGenerated(entry);
    return {
      ...entry,
      isAISuspected: detection.isAISuspected,
      aiSignals: detection.signals,
      aiConfidence: detection.confidence
    };
  });
}

/**
 * 获取AI检测统计
 * @param {Array} entries - 条目数组
 * @returns {Object} - 统计信息
 */
export function getAIDetectionStats(entries) {
  const stats = {
    total: entries.length,
    suspected: 0,
    bySignalType: {},
    averageConfidence: 0
  };

  let totalConfidence = 0;

  entries.forEach(entry => {
    if (entry.isAISuspected) {
      stats.suspected++;
      totalConfidence += entry.aiConfidence || 0;

      // 统计信号类型
      if (entry.aiSignals) {
        entry.aiSignals.forEach(signal => {
          if (!stats.bySignalType[signal.type]) {
            stats.bySignalType[signal.type] = {
              count: 0,
              message: signal.message
            };
          }
          stats.bySignalType[signal.type].count++;
        });
      }
    }
  });

  // 计算平均置信度
  if (stats.suspected > 0) {
    stats.averageConfidence = Math.round(totalConfidence / stats.suspected);
  }

  return stats;
}

/**
 * 验证条目（跳转到验证页面）
 * @param {Object} entry - 条目
 * @param {string} source - 验证来源 ('dblp' | 'scholar')
 */
export function verifyEntry(entry, source = 'dblp') {
  const title = entry.title || '';

  let url = '';

  if (source === 'dblp') {
    // DBLP搜索
    const query = encodeURIComponent(title);
    url = `https://dblp.org/search?q=${query}`;
  } else if (source === 'scholar') {
    // Google Scholar搜索
    const query = encodeURIComponent(title);
    url = `https://scholar.google.com/scholar?q=${query}`;
  }

  if (url) {
    window.open(url, '_blank');
  }
}
