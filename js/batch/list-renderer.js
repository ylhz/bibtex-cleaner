/**
 * 条目列表渲染与 DBLP 缓存恢复
 */

export function createListRenderer(dom, state, deps) {
  const {
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
    getShowValidationDetails
  } = deps;

  function renderEntriesList() {
    if (!dom.entriesList) return;

    if (state.shouldResort) {
      sortEntries(state.entries);
      state.shouldResort = false;
    }

    const dblpResultsCache = {};
    document.querySelectorAll('.entry-dblp-result').forEach(el => {
      const id = el.id;
      if (id) {
        dblpResultsCache[id] = el.innerHTML;
      }
    });

    dom.entriesList.innerHTML = '';

    const filteredEntries = filterEntries(state.entries, state.currentFilter);

    if (filteredEntries.length === 0) {
      dom.entriesList.innerHTML = '<div class="empty-state"><p>没有符合条件的条目</p></div>';
      return;
    }

    const actionDeps = {
      BatchModeState: state,
      updateStats,
      renderEntriesList,
      saveIgnoredWarnings,
      exitBatchMode,
      showToast
    };

    const showValidationDetails = getShowValidationDetails ? getShowValidationDetails() : (() => {});

    filteredEntries.forEach((entry, index) => {
      const card = createEntryCard(entry, index, {
        renderFieldsEditor,
        bindFieldEditEvents,
        showValidationDetails,
        handleEntryAction: (action, _idx, targetEntry) => handleEntryAction(action, targetEntry.index, targetEntry, actionDeps),
        fieldEditDeps: { reconstructBibtex, recheckEntry, showToast }
      });
      dom.entriesList.appendChild(card);
    });

    Object.keys(dblpResultsCache).forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = dblpResultsCache[id];
        bindDblpActionButtons(el);
      }
    });

    filteredEntries.forEach(entry => {
      const container = document.getElementById(`dblp-result-${entry.index}`);
      if (!container || !entry.dblpHtml) return;

      const fieldsList = container.querySelector('.dblp-fields-list');
      const confidenceEl = container.querySelector('.match-confidence');
      if (!fieldsList || !confidenceEl) return;

      const cacheId = `dblp-result-${entry.index}`;
      if (!dblpResultsCache[cacheId]) {
        fieldsList.innerHTML = entry.dblpHtml;
        if (entry.dblpMatchConfidenceHtml) {
          confidenceEl.innerHTML = entry.dblpMatchConfidenceHtml;
        }
        if (entry.dblpConfidenceClass) {
          confidenceEl.className = entry.dblpConfidenceClass;
        }
        bindDblpActionButtons(container);
      }
    });
  }

  return { renderEntriesList };
}
