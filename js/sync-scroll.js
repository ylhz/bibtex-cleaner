/**
 * 同步滚动工具
 * 负责中间栏和右侧栏的滚动同步
 */

let scrollObserver = null;
let isScrolling = false;
let scrollTimeout = null;

/**
 * 初始化同步滚动
 * @param {HTMLElement} entriesPane - 中间栏（条目列表）
 * @param {HTMLElement} previewPane - 右侧栏（预览列表）
 */
export function initSyncScroll(entriesPane, previewPane) {
  if (!entriesPane || !previewPane) {
    console.warn('同步滚动初始化失败：找不到必需的元素');
    return;
  }

  // 清理之前的observer
  if (scrollObserver) {
    scrollObserver.disconnect();
  }

  // 方案1: 使用 Intersection Observer 实现同步（推荐）
  setupIntersectionObserver(entriesPane, previewPane);

  // 方案2备选: 使用滚动事件（备用）
  // setupScrollListener(entriesPane, previewPane);

  console.log('同步滚动已初始化');
}

/**
 * 方案1: 使用 Intersection Observer 实现同步
 * 监听中间栏卡片进入视口，自动滚动右侧栏到对应位置
 */
function setupIntersectionObserver(entriesPane, previewPane) {
  // 创建 Intersection Observer
  scrollObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        // 当卡片进入视口中央区域时
        if (entry.isIntersecting && entry.intersectionRatio > 0.3) {
          const index = entry.target.dataset.entryIndex;
          if (index !== undefined) {
            // 滚动右侧预览到对应位置
            scrollToPreviewCard(previewPane, index);
          }
        }
      });
    },
    {
      root: entriesPane,
      threshold: [0, 0.3, 0.5, 0.7, 1.0], // 多个阈值，确保精确触发
      rootMargin: '-30% 0px -30% 0px' // 中央30%区域触发
    }
  );

  // 观察所有条目卡片
  observeEntryCards(entriesPane);
}

/**
 * 观察所有条目卡片
 */
function observeEntryCards(entriesPane) {
  if (!scrollObserver) return;

  // 先断开所有观察
  scrollObserver.disconnect();

  // 观察新的卡片
  const cards = entriesPane.querySelectorAll('.entry-card[data-entry-index]');
  cards.forEach(card => {
    scrollObserver.observe(card);
  });
}

/**
 * 滚动右侧预览到指定卡片
 * @param {HTMLElement} previewPane - 预览栏
 * @param {number|string} index - 卡片索引
 */
function scrollToPreviewCard(previewPane, index) {
  if (isScrolling) return; // 防止循环滚动

  const previewCard = previewPane.querySelector(
    `.preview-card[data-entry-index="${index}"]`
  );

  if (!previewCard) return;

  isScrolling = true;

  // 平滑滚动到卡片位置
  previewCard.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest'
  });

  // 100ms后允许下一次滚动
  setTimeout(() => {
    isScrolling = false;
  }, 100);
}

/**
 * 方案2: 使用滚动事件实现同步（备用方案）
 * 按滚动比例同步两侧
 */
function setupScrollListener(entriesPane, previewPane) {
  let syncLock = false;

  entriesPane.addEventListener('scroll', () => {
    if (syncLock) return;

    syncLock = true;

    // 防抖：100ms后才允许下次同步
    if (scrollTimeout) {
      clearTimeout(scrollTimeout);
    }

    scrollTimeout = setTimeout(() => {
      syncLock = false;
    }, 100);

    // 计算滚动比例
    const scrollRatio =
      entriesPane.scrollTop /
      (entriesPane.scrollHeight - entriesPane.clientHeight);

    // 同步右侧栏
    previewPane.scrollTop =
      scrollRatio * (previewPane.scrollHeight - previewPane.clientHeight);
  });
}

/**
 * 销毁同步滚动
 */
export function destroySyncScroll() {
  if (scrollObserver) {
    scrollObserver.disconnect();
    scrollObserver = null;
  }

  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
    scrollTimeout = null;
  }

  isScrolling = false;

  console.log('同步滚动已销毁');
}

/**
 * 重新初始化同步滚动（当列表更新时调用）
 */
export function refreshSyncScroll() {
  const entriesPane = document.getElementById('batch-entries-pane');
  const previewPane = document.getElementById('batch-preview-pane');

  if (entriesPane && previewPane) {
    // 重新观察卡片
    observeEntryCards(entriesPane);
  }
}

/**
 * 手动滚动到指定条目
 * @param {number} index - 条目索引
 */
export function scrollToEntry(index) {
  const entriesPane = document.getElementById('batch-entries-pane');
  const previewPane = document.getElementById('batch-preview-pane');

  if (!entriesPane || !previewPane) return;

  // 滚动中间栏
  const entryCard = entriesPane.querySelector(
    `.entry-card[data-entry-index="${index}"]`
  );

  if (entryCard) {
    entryCard.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }

  // 滚动右侧栏
  const previewCard = previewPane.querySelector(
    `.preview-card[data-entry-index="${index}"]`
  );

  if (previewCard) {
    previewCard.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
}

/**
 * 跳转到下一个警告条目
 */
export function scrollToNextWarning() {
  const entriesPane = document.getElementById('batch-entries-pane');
  if (!entriesPane) return;

  const warningCards = entriesPane.querySelectorAll('.entry-card.warning');
  if (warningCards.length === 0) return;

  // 找到当前可见的卡片
  const currentScrollTop = entriesPane.scrollTop;
  let targetCard = null;

  for (let card of warningCards) {
    if (card.offsetTop > currentScrollTop + 50) {
      targetCard = card;
      break;
    }
  }

  // 如果没找到，跳到第一个
  if (!targetCard) {
    targetCard = warningCards[0];
  }

  if (targetCard) {
    const index = targetCard.dataset.entryIndex;
    scrollToEntry(index);
  }
}

/**
 * 跳转到上一个警告条目
 */
export function scrollToPrevWarning() {
  const entriesPane = document.getElementById('batch-entries-pane');
  if (!entriesPane) return;

  const warningCards = Array.from(
    entriesPane.querySelectorAll('.entry-card.warning')
  ).reverse();

  if (warningCards.length === 0) return;

  // 找到当前可见的卡片
  const currentScrollTop = entriesPane.scrollTop;
  let targetCard = null;

  for (let card of warningCards) {
    if (card.offsetTop < currentScrollTop - 50) {
      targetCard = card;
      break;
    }
  }

  // 如果没找到，跳到最后一个
  if (!targetCard) {
    targetCard = warningCards[0];
  }

  if (targetCard) {
    const index = targetCard.dataset.entryIndex;
    scrollToEntry(index);
  }
}
