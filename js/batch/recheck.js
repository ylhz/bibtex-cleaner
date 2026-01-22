/**
 * 条目重检逻辑（独立模块）
 */

export function createRechecker(state, deps) {
  const {
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
    updateBatchInput
  } = deps;

  return function recheckEntry(entryIndex) {
    const entry = state.entries.find(e => e.index === entryIndex);
    if (!entry) {
      console.error('未找到条目，entryIndex:', entryIndex);
      return;
    }

    const bibtexText = entry.rawBibtex;
    if (!bibtexText || !bibtexText.trim()) {
      console.error('条目内容为空');
      return;
    }

    try {
      const parsed = parseRawBibtex(bibtexText);
      if (!parsed || parsed.length === 0) {
        console.error('解析失败');
        return;
      }

      const parsedEntry = parsed[0];
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

      const converted = resultObj.data && resultObj.data.length > 0 ? resultObj.data[0] : null;
      const convertedBibtex = converted ? toBibTeX(converted) : bibtexText;

      const flatEntry = {
        type: parsedEntry.type,
        id: parsedEntry.key,
        ...(parsedEntry.fields || {})
      };

      const warnings = detectWarnings(flatEntry, resultObj);
      const venueWarnings = (resultObj.entryWarnings && resultObj.entryWarnings[0]) || [];
      const mergedWarnings = warnings.concat(venueWarnings.map(msg => ({
        type: 'venue_mapping',
        field: 'booktitle',
        message: msg
      })));
      const aiDetection = detectAIGenerated(flatEntry);

      entry.rawBibtex = bibtexText;
      entry.parsedEntry = parsedEntry;
      entry.convertedEntry = converted;
      entry.convertedBibtex = convertedBibtex;
      entry.warnings = mergedWarnings;
      entry.isAISuspected = aiDetection.isAISuspected;
      entry.aiSignals = aiDetection.signals;
      entry.aiConfidence = aiDetection.confidence;
      entry.changeCount = calculateChanges(bibtexText, convertedBibtex);

      if (entry.isIgnored && mergedWarnings.length === 0) {
        entry.isIgnored = false;
      }

      if (typeof updateBatchInput === 'function') {
        updateBatchInput();
      }

      const card = document.querySelector(`.entry-card[data-entry-index="${entryIndex}"]`);
      if (card) {
        const previewContent = card.querySelector('.entry-preview-content');
        if (previewContent) {
          previewContent.textContent = convertedBibtex;
        }
        updateCardWarnings(card, entry);

        card.classList.remove('warning', 'confirmed', 'ignored', 'unprocessed');
        const hasWarnings = mergedWarnings && mergedWarnings.length > 0;
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

      updateStats();
    } catch (err) {
      console.error('重新检查失败:', err);
    }
  };
}
