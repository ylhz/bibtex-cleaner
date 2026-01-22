/**
 * 批量模式的排序与筛选逻辑
 */

/**
 * 排序条目（就地排序）
 * 优先级：警告 → 未确认 → 已忽略 → 已确认
 */
export function sortEntries(entries) {
  entries.sort((a, b) => {
    const priority = (entry) => {
      const hasWarnings = entry.warnings?.length > 0;
      if (hasWarnings && !entry.isIgnored) return 1;
      if (!entry.isConfirmed && !hasWarnings && !entry.isIgnored) return 2;
      if (entry.isIgnored) return 3;
      if (entry.isConfirmed) return 4;
      return 2;
    };

    const priorityA = priority(a);
    const priorityB = priority(b);

    if (priorityA !== priorityB) return priorityA - priorityB;
    if (priorityA === 4 && priorityB === 4) {
      return (b.confirmedAt || 0) - (a.confirmedAt || 0);
    }
    return a.index - b.index;
  });
}

/**
 * 按当前筛选模式过滤条目
 */
export function filterEntries(entries, currentFilter) {
  switch (currentFilter) {
    case 'warnings':
      return entries.filter(e => e.warnings && e.warnings.length > 0 && !e.isIgnored);
    case 'ignored':
      return entries.filter(e => e.isIgnored === true);
    case 'confirmed':
      return entries.filter(e => e.isConfirmed === true);
    default:
      return entries;
  }
}
