/**
 * 筛选与复制控制逻辑
 */

export function createControls(dom, state, deps) {
  const { renderEntriesList, renderPreviewList, copyToClipboard, escapeHtml, showToast } = deps;

  function renderPreviewListWrapper() {
    renderPreviewList(dom.previewList, state, copyToClipboard, escapeHtml, showToast);
  }

  function handleFilterChange(filter) {
    state.currentFilter = filter;
    state.shouldResort = true;

    dom.filterChips?.forEach(chip => {
      if (chip.dataset.filter === filter) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    renderEntriesList();
    renderPreviewListWrapper();
  }

  function bindFilterChips() {
    dom.filterChips?.forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter || 'all';
        handleFilterChange(filter);
      });
    });
  }

  function copyAllEntries() {
    const allBibtex = state.entries
      .map(e => e.convertedBibtex || e.rawBibtex)
      .filter(b => b)
      .join('\n\n');

    copyToClipboard(allBibtex);
    showToast(`已复制 ${state.entries.length} 个条目`);
  }

  function copyCleanEntries() {
    const cleanEntries = state.entries.filter(e => !e.warnings || e.warnings.length === 0);

    const cleanBibtex = cleanEntries
      .map(e => e.convertedBibtex || e.rawBibtex)
      .filter(b => b)
      .join('\n\n');

    copyToClipboard(cleanBibtex);
    showToast(`已复制 ${cleanEntries.length} 个无警告条目`);
  }

  return {
    handleFilterChange,
    bindFilterChips,
    copyAllEntries,
    copyCleanEntries
  };
}
