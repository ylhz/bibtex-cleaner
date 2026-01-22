/**
 * 验证相关的 UI 与状态更新
 */

export function createVerificationUI(dom, state, deps) {
  const {
    enterVerificationMode,
    getValidationStats,
    updateStats,
    renderEntriesList,
    handleFilterChange,
    showToast,
    escapeHtml
  } = deps;

  function updateVerifyButton(buttonState, current = 0, total = 0) {
    const btn = dom.btnVerifyAll;
    if (!btn) return;

    const textContent = btn.querySelector('.btn-text-content');
    const progressBar = btn.querySelector('.btn-progress-bar');
    if (!textContent || !progressBar) return;

    switch (buttonState) {
      case 'idle':
        btn.dataset.state = 'idle';
        textContent.textContent = '🔍 验证全部';
        progressBar.style.width = '0%';
        break;
      case 'verifying': {
        const percentage = total > 0 ? (current / total) * 100 : 0;
        btn.dataset.state = 'verifying';
        textContent.textContent = `验证中 (${current}/${total})`;
        progressBar.style.width = `${percentage}%`;
        break;
      }
      case 'completed':
        btn.dataset.state = 'completed';
        textContent.textContent = '✓ 验证完成';
        progressBar.style.width = '100%';
        setTimeout(() => updateVerifyButton('idle'), 3000);
        break;
      default:
        break;
    }
  }

  function handleVerifyAll() {
    if (state.entries.length === 0) {
      showToast('没有可验证的条目');
      return;
    }

    state.verificationCancelled = false;

    if (handleFilterChange) {
      // 确保验证时渲染全部条目，避免过滤导致的卡片缺失
      handleFilterChange('all');
    } else {
      renderEntriesList();
    }

    requestAnimationFrame(() => {
      enterVerificationMode(state.entries);
    });
  }

  function showVerificationModal() {
    if (dom.verificationModal) {
      dom.verificationModal.classList.add('show');
    }
    updateVerificationProgress(0, state.entries.length);
  }

  function hideVerificationModal() {
    dom.verificationModal?.classList.remove('show');
  }

  function updateVerificationProgress(current, total) {
    if (dom.verifyProgressText) {
      dom.verifyProgressText.textContent = `${current} / ${total}`;
    }
    if (dom.verifyProgressBar) {
      const percentage = total > 0 ? (current / total) * 100 : 0;
      dom.verifyProgressBar.style.width = `${percentage}%`;
    }
  }

  function onVerificationProgress(current, total) {
    if (state.verificationCancelled) {
      throw new Error('验证已取消');
    }

    updateVerifyButton('verifying', current, total);
    state.verificationProgress.current = current;
    state.verificationProgress.total = total;
  }

  function onVerificationComplete(results) {
    results.forEach((result, index) => {
      const entry = state.entries[index];
      if (!entry) return;

      entry.dblpVerified = result.validation.verified;
      entry.dblpMatched = result.validation.matched;
      entry.dblpConfidence = result.validation.confidence;
      entry.dblpReason = result.validation.reason;
      entry.dblpError = result.validation.error;

      if (result.validation.matchDetails) {
        entry.dblpMatchDetails = result.validation.matchDetails;
      }
      if (result.dblpEntry) {
        entry.dblpEntry = result.dblpEntry;
      }

      if (!result.validation.matched || result.validation.error) {
        entry.isAISuspected = true;
        entry.aiSignals = entry.aiSignals || [];
        entry.aiSignals.push({
          type: 'dblp_not_found',
          message: result.validation.reason || result.validation.error || 'DBLP 验证未通过',
          severity: 'high'
        });
      }
    });

    const stats = getValidationStats(results);
    updateStats();
    renderEntriesList();
    updateVerifyButton('completed');
    state.isVerifying = false;

    const notMatchedCount = stats.notMatched + stats.errors;
    showToast(`验证完成：${stats.matched} 个匹配，${notMatchedCount} 个未匹配或出错`);

    if (notMatchedCount > 0) {
      setTimeout(() => handleFilterChange('warnings'), 500);
    }
  }

  function handleCancelVerification() {
    state.verificationCancelled = true;
    state.isVerifying = false;
    hideVerificationModal();
    showToast('验证已取消');
  }

  function showValidationPane() {
    dom.batchMainGrid?.classList.remove('hide-validation-pane');
  }

  function hideValidationPane() {
    dom.batchMainGrid?.classList.add('hide-validation-pane');
    document.querySelectorAll('.entry-card').forEach(card => card.classList.remove('active'));
  }

  function showValidationDetails(entry, index) {
    if (!dom.validationContent) return;
    showValidationPane();
    document.querySelectorAll('.entry-card').forEach(card => card.classList.remove('active'));
    const currentCard = document.querySelector(`.entry-card[data-entry-index="${index}"]`);
    if (currentCard) {
      currentCard.classList.add('active');
    }
    dom.validationContent.innerHTML = renderValidationDetails(entry, index);
  }

  function renderValidationDetails(entry, index) {
    const entryId = entry.id || `entry-${index}`;
    const hasValidation = entry.dblpVerified !== undefined;

    if (!hasValidation) {
      return `
        <div class="empty-state">
          <p>此条目尚未进行DBLP验证</p>
          <p style="font-size: 0.85rem; color: var(--md-sys-color-on-surface-variant); margin-top: 8px;">
            点击上方"🔍 验证全部"按钮开始验证
          </p>
        </div>
      `;
    }

    const isMatched = entry.dblpMatched;
    const confidence = entry.dblpConfidence || 0;
    const reason = entry.dblpReason || '';
    const error = entry.dblpError || '';

    let statusBadgeClass = 'not-matched';
    let statusText = '未匹配';
    if (error) {
      statusBadgeClass = 'error';
      statusText = '验证出错';
    } else if (isMatched) {
      statusBadgeClass = 'matched';
      statusText = '匹配成功';
    }

    let scoresHtml = '';
    if (entry.dblpMatchDetails) {
      const details = entry.dblpMatchDetails;
      scoresHtml = `
        <div class="validation-card">
          <div class="validation-card-header">
            <span class="validation-card-title">匹配度评分</span>
          </div>
          <div class="match-scores">
            ${renderScoreItem('标题', details.titleScore || 0)}
            ${renderScoreItem('作者', details.authorScore || 0)}
            ${renderScoreItem('年份', details.yearScore || 0)}
          </div>
        </div>
      `;
    }

    let dblpInfoHtml = '';
    if (entry.dblpEntry) {
      const dblpEntry = entry.dblpEntry;
      dblpInfoHtml = `
        <div class="validation-card">
          <div class="validation-card-header">
            <span class="validation-card-title">DBLP匹配条目</span>
          </div>
          <div class="dblp-entry-info">
            ${dblpEntry.title ? `
              <div class="dblp-entry-field">
                <span class="dblp-field-label">标题：</span>
                <span class="dblp-field-value">${escapeHtml(dblpEntry.title)}</span>
              </div>
            ` : ''}
            ${dblpEntry.authors ? `
              <div class="dblp-entry-field">
                <span class="dblp-field-label">作者：</span>
                <span class="dblp-field-value">${escapeHtml(dblpEntry.authors)}</span>
              </div>
            ` : ''}
            ${dblpEntry.year ? `
              <div class="dblp-entry-field">
                <span class="dblp-field-label">年份：</span>
                <span class="dblp-field-value">${escapeHtml(dblpEntry.year)}</span>
              </div>
            ` : ''}
            ${dblpEntry.venue ? `
              <div class="dblp-entry-field">
                <span class="dblp-field-label">会议/期刊：</span>
                <span class="dblp-field-value">${escapeHtml(dblpEntry.venue)}</span>
              </div>
            ` : ''}
            ${dblpEntry.url ? `
              <div class="dblp-entry-field">
                <span class="dblp-field-label">链接：</span>
                <span class="dblp-field-value">
                  <a href="${escapeHtml(dblpEntry.url)}" target="_blank" style="color: var(--md-sys-color-primary);">
                    在DBLP中查看
                  </a>
                </span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    }

    let messageHtml = '';
    if (error) {
      messageHtml = `
        <div class="validation-card">
          <div class="validation-card-header">
            <span class="validation-card-title">错误信息</span>
          </div>
          <p style="font-size: 0.875rem; color: var(--md-sys-color-error); margin: 0;">
            ${escapeHtml(error)}
          </p>
        </div>
      `;
    } else if (reason) {
      messageHtml = `
        <div class="validation-card">
          <div class="validation-card-header">
            <span class="validation-card-title">验证说明</span>
          </div>
          <p style="font-size: 0.875rem; color: var(--md-sys-color-on-surface-variant); margin: 0;">
            ${escapeHtml(reason)}
          </p>
        </div>
      `;
    }

    return `
      <div class="validation-card">
        <div class="validation-card-header">
          <span class="validation-card-title">${escapeHtml(entryId)}</span>
          <span class="validation-status-badge ${statusBadgeClass}">${statusText}</span>
        </div>
        <p style="font-size: 0.875rem; color: var(--md-sys-color-on-surface-variant); margin: 8px 0 0 0;">
          置信度：${(confidence * 100).toFixed(0)}%
        </p>
      </div>
      ${scoresHtml}
      ${dblpInfoHtml}
      ${messageHtml}
    `;
  }

  function renderScoreItem(label, score) {
    const percentage = Math.round(score * 100);
    let barClass = 'low';
    if (score >= 0.7) {
      barClass = 'high';
    } else if (score >= 0.4) {
      barClass = 'medium';
    }

    return `
      <div class="score-item">
        <span class="score-label">${label}</span>
        <div class="score-bar-container">
          <div class="score-bar ${barClass}" style="width: ${percentage}%"></div>
        </div>
        <span class="score-value">${percentage}%</span>
      </div>
    `;
  }

  return {
    handleVerifyAll,
    handleCancelVerification,
    showVerificationModal,
    hideVerificationModal,
    updateVerificationProgress,
    onVerificationProgress,
    onVerificationComplete,
    showValidationPane,
    hideValidationPane,
    showValidationDetails,
    updateVerifyButton
  };
}
