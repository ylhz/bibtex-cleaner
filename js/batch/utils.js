/**
 * 批量模式通用工具
 */

/**
 * 防抖封装
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * 复制文本
 */
export function copyToClipboard(text) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('复制失败:', err);
      fallbackCopy(text);
    });
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
  } catch (err) {
    console.error('降级复制失败:', err);
  }
  document.body.removeChild(textarea);
}

/**
 * HTML 转义
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 将解析结果重组为 BibTeX 文本
 */
export function reconstructBibtex(entry) {
  const type = entry.rawType || entry.type || 'article';
  const id = entry.key || entry.id || 'unknown';

  let bibtex = `@${type}{${id},\n`;
  const fields = entry.fields || entry;

  Object.keys(fields).forEach(key => {
    if (fields[key]) {
      bibtex += `  ${key} = {${fields[key]}},\n`;
    }
  });

  bibtex += '}\n';
  return bibtex;
}

/**
 * 计算修改行数（粗略估计）
 */
export function calculateChanges(original, converted) {
  if (!original || !converted) return 0;

  const originalLines = original.split('\n').filter(l => l.trim());
  const convertedLines = converted.split('\n').filter(l => l.trim());

  let changes = 0;
  const maxLen = Math.max(originalLines.length, convertedLines.length);

  for (let i = 0; i < maxLen; i++) {
    const origLine = (originalLines[i] || '').trim();
    const convLine = (convertedLines[i] || '').trim();
    if (origLine !== convLine) {
      changes++;
    }
  }

  return changes;
}
