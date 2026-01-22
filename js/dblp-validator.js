/**
 * DBLP 验证模块
 * 用于验证 BibTeX 条目是否在 DBLP 中真实存在
 */

/**
 * 验证单个条目是否在 DBLP 中存在
 * @param {Object} entry - BibTeX 条目
 * @returns {Promise<Object>} - 验证结果
 */
export async function validateEntryInDBLP(entry) {
  const title = entry.parsedEntry?.fields?.title || entry.title || '';
  const author = entry.parsedEntry?.fields?.author || entry.author || '';
  const year = entry.parsedEntry?.fields?.year || entry.year || '';

  if (!title) {
    return {
      verified: false,
      matched: false,
      error: '缺少标题，无法验证',
      confidence: 0
    };
  }

  try {
    // 搜索 DBLP
    const searchResults = await searchDBLP(title);

    if (!searchResults || searchResults.length === 0) {
      return {
        verified: true,
        matched: false,
        reason: '在 DBLP 中未找到匹配条目',
        confidence: 0
      };
    }

    // 尝试找到最佳匹配
    const bestMatch = findBestMatch(
      { title, author, year },
      searchResults
    );

    if (!bestMatch) {
      return {
        verified: true,
        matched: false,
        reason: '找到搜索结果但无匹配项',
        confidence: 0,
        searchResultsCount: searchResults.length
      };
    }

    return {
      verified: true,
      matched: bestMatch.confidence > 0.7, // 相似度阈值 70%
      confidence: bestMatch.confidence,
      matchedEntry: bestMatch.entry,
      reason: bestMatch.confidence > 0.7
        ? `找到匹配（相似度: ${Math.round(bestMatch.confidence * 100)}%）`
        : `相似度过低（${Math.round(bestMatch.confidence * 100)}%）`
    };

  } catch (error) {
    console.error('DBLP 验证失败:', error);
    return {
      verified: false,
      matched: false,
      error: error.message || '验证过程出错',
      confidence: 0
    };
  }
}

/**
 * 在 DBLP 中搜索论文
 * @param {string} title - 论文标题
 * @returns {Promise<Array>} - 搜索结果
 */
async function searchDBLP(title) {
  const query = encodeURIComponent(title.trim());
  const url = `https://dblp.org/search/publ/api?q=${query}&format=json&h=10`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`DBLP API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  const hits = data?.result?.hits?.hit || [];

  // 调试输出：查看 DBLP 原始返回数据
  console.log('[DBLP] 搜索返回原始数据', { title, hits });

  // 保留 DBLP 返回的原始字段，不做额外转换（仅 authors 规范为数组便于后续展示）
  return hits.map(hit => {
    const info = hit.info || {};
    return {
      ...info,
      authors: info.authors?.author || info.authors || []
    };
  });
}

/**
 * 找到最佳匹配的条目
 * @param {Object} target - 目标条目 { title, author, year }
 * @param {Array} candidates - 候选条目列表
 * @returns {Object|null} - 最佳匹配 { entry, confidence }
 */
function findBestMatch(target, candidates) {
  let bestMatch = null;
  let bestConfidence = 0;

  for (const candidate of candidates) {
    const confidence = calculateMatchConfidence(target, candidate);

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = {
        entry: candidate,
        confidence: confidence
      };
    }
  }

  return bestMatch;
}

/**
 * 计算匹配置信度
 * @param {Object} target - 目标条目
 * @param {Object} candidate - 候选条目
 * @returns {number} - 置信度 (0-1)
 */
function calculateMatchConfidence(target, candidate) {
  let score = 0;
  let weights = 0;

  // 1. 标题相似度（权重: 60%）
  const titleSimilarity = calculateTitleSimilarity(
    target.title,
    candidate.title
  );
  score += titleSimilarity * 0.6;
  weights += 0.6;

  // 2. 年份匹配（权重: 20%）
  if (target.year && candidate.year) {
    const yearMatch = target.year === candidate.year ? 1 : 0;
    score += yearMatch * 0.2;
    weights += 0.2;
  }

  // 3. 作者匹配（权重: 20%）
  if (target.author && candidate.authors) {
    const authorSimilarity = calculateAuthorSimilarity(
      target.author,
      candidate.authors
    );
    score += authorSimilarity * 0.2;
    weights += 0.2;
  }

  // 归一化分数
  return weights > 0 ? score / weights : 0;
}

/**
 * 计算标题相似度
 * @param {string} title1 - 标题1
 * @param {string} title2 - 标题2
 * @returns {number} - 相似度 (0-1)
 */
function calculateTitleSimilarity(title1, title2) {
  // 规范化标题
  const norm1 = normalizeTitle(title1);
  const norm2 = normalizeTitle(title2);

  if (!norm1 || !norm2) return 0;

  // 完全匹配
  if (norm1 === norm2) return 1.0;

  // 使用 Jaccard 相似度（基于单词集合）
  const words1 = new Set(norm1.split(/\s+/));
  const words2 = new Set(norm2.split(/\s+/));

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  const jaccardSimilarity = intersection.size / union.size;

  // 同时考虑编辑距离（用于捕捉拼写错误）
  const editDistance = levenshteinDistance(norm1, norm2);
  const maxLen = Math.max(norm1.length, norm2.length);
  const editSimilarity = 1 - (editDistance / maxLen);

  // 综合两种相似度（Jaccard 更重要）
  return jaccardSimilarity * 0.7 + editSimilarity * 0.3;
}

/**
 * 规范化标题（去除标点、转小写、去除停用词）
 * @param {string} title - 原始标题
 * @returns {string} - 规范化后的标题
 */
function normalizeTitle(title) {
  if (!title) return '';

  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // 移除标点符号
    .replace(/\s+/g, ' ')      // 多个空格合并
    .trim()
    .split(/\s+/)
    .filter(word => !isStopWord(word)) // 移除停用词
    .join(' ');
}

/**
 * 判断是否为停用词
 * @param {string} word - 单词
 * @returns {boolean}
 */
function isStopWord(word) {
  const stopWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'should', 'could', 'may', 'might', 'can'
  ]);
  return stopWords.has(word.toLowerCase());
}

/**
 * 计算 Levenshtein 编辑距离
 * @param {string} str1 - 字符串1
 * @param {string} str2 - 字符串2
 * @returns {number} - 编辑距离
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;

  // 创建 DP 表
  const dp = Array(len1 + 1)
    .fill(null)
    .map(() => Array(len2 + 1).fill(0));

  // 初始化边界
  for (let i = 0; i <= len1; i++) dp[i][0] = i;
  for (let j = 0; j <= len2; j++) dp[0][j] = j;

  // 填充 DP 表
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // 删除
        dp[i][j - 1] + 1,      // 插入
        dp[i - 1][j - 1] + cost // 替换
      );
    }
  }

  return dp[len1][len2];
}

/**
 * 计算作者相似度
 * @param {string} authorStr - 作者字符串（逗号分隔）
 * @param {Array|string} candidateAuthors - DBLP 返回的作者列表或字符串
 * @returns {number} - 相似度 (0-1)
 */
function calculateAuthorSimilarity(authorStr, candidateAuthors) {
  // 规范化目标作者列表
  const targetAuthors = authorStr
    .split(/\s+and\s+/)
    .map(a => normalizeAuthorName(a));

  // 规范化候选作者列表
  let candidateAuthorList = [];
  if (Array.isArray(candidateAuthors)) {
    candidateAuthorList = candidateAuthors.map(a => {
      if (typeof a === 'string') {
        return normalizeAuthorName(a);
      } else if (a.text) {
        return normalizeAuthorName(a.text);
      }
      return '';
    });
  } else if (typeof candidateAuthors === 'string') {
    candidateAuthorList = candidateAuthors
      .split(/\s+and\s+/)
      .map(a => normalizeAuthorName(a));
  }

  if (targetAuthors.length === 0 || candidateAuthorList.length === 0) {
    return 0;
  }

  // 计算匹配的作者数量
  let matchCount = 0;
  for (const targetAuthor of targetAuthors) {
    for (const candidateAuthor of candidateAuthorList) {
      if (isAuthorMatch(targetAuthor, candidateAuthor)) {
        matchCount++;
        break;
      }
    }
  }

  // 相似度 = 匹配数量 / 目标作者数量
  return matchCount / targetAuthors.length;
}

/**
 * 规范化作者名
 * @param {string} name - 作者名
 * @returns {string} - 规范化后的名字
 */
function normalizeAuthorName(name) {
  if (!name) return '';

  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // 移除标点
    .replace(/\s+/g, ' ')      // 合并空格
    .replace(/\b\w\b/g, '')    // 移除单字母（首字母缩写）
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * 判断两个作者名是否匹配
 * @param {string} name1 - 作者名1
 * @param {string} name2 - 作者名2
 * @returns {boolean}
 */
function isAuthorMatch(name1, name2) {
  if (!name1 || !name2) return false;

  // 完全匹配
  if (name1 === name2) return true;

  // 检查是否有共同的姓氏（最后一个单词）
  const words1 = name1.split(/\s+/);
  const words2 = name2.split(/\s+/);

  const lastName1 = words1[words1.length - 1];
  const lastName2 = words2[words2.length - 1];

  // 姓氏匹配即认为是同一作者（允许名字缩写不同）
  return lastName1 === lastName2 && lastName1.length > 2;
}

/**
 * 批量验证条目
 * @param {Array} entries - 条目数组
 * @param {Function} onProgress - 进度回调 (current, total)
 * @param {Function} onComplete - 完成回调 (results)
 */
export async function validateEntriesBatch(entries, onProgress, onComplete) {
  const results = [];
  const total = entries.length;

  for (let i = 0; i < total; i++) {
    const entry = entries[i];

    try {
      // 验证单个条目
      const result = await validateEntryInDBLP(entry);

      results.push({
        entry: entry,
        validation: result
      });

      // 更新进度
      if (onProgress) {
        onProgress(i + 1, total);
      }

      // 添加延迟以避免 API 限流（每个请求间隔 500ms）
      if (i < total - 1) {
        await sleep(500);
      }

    } catch (error) {
      console.error(`验证条目 ${i} 失败:`, error);
      results.push({
        entry: entry,
        validation: {
          verified: false,
          matched: false,
          error: error.message
        }
      });

      // 即使失败也更新进度
      if (onProgress) {
        onProgress(i + 1, total);
      }
    }
  }

  // 完成回调
  if (onComplete) {
    onComplete(results);
  }

  return results;
}

/**
 * 延迟函数
 * @param {number} ms - 毫秒数
 * @returns {Promise}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 获取验证统计信息
 * @param {Array} validationResults - 验证结果数组
 * @returns {Object} - 统计信息
 */
export function getValidationStats(validationResults) {
  const stats = {
    total: validationResults.length,
    verified: 0,
    matched: 0,
    notMatched: 0,
    errors: 0
  };

  validationResults.forEach(result => {
    const validation = result.validation;

    if (validation.verified) {
      stats.verified++;

      if (validation.matched) {
        stats.matched++;
      } else {
        stats.notMatched++;
      }
    } else {
      stats.errors++;
    }
  });

  return stats;
}
