import { CONSTANTS, ConfigManager } from './config.js';
import { processEntries, parseMappingRules, parseRawBibtex } from './processor.js';
import { showToast, getTitleWord } from './utils.js';
import { toBibTeX } from './formatters/bibtex.js';
import { toMLA } from './formatters/mla.js';
import { toGBT } from './formatters/gbt7714.js';
import { initBatchMode, checkShouldSwitchToBatchMode, showModeSwitchDialog, processBatchEntries, reprocessAllEntries, BatchModeState, switchToBatchMode } from './batch-mode.js';
import { detectWarnings } from './warning-system.js';
import { detectAIGenerated } from './ai-detector.js';
import { initVerificationMode } from './verification-mode.js';

// 测试模式，push时需要注释
// import { initSyncScroll } from './sync-scroll.js';

const FORMATTERS = {
    'bibtex': (entries) => entries.map(toBibTeX).join('\n\n'),
    'mla': (entries) => entries.map(toMLA).join('\n\n'),
    'gbt': (entries) => {
        const fullNameMode = ConfigManager.getFullAuthorName();
        const showAllAuthors = ConfigManager.getShowAllAuthors();
        return entries.map((e, i) => toGBT(e, i, fullNameMode, showAllAuthors)).join('\n');
    }
};

let CURRENT_DATA = [];
let CURRENT_TAB = 'bibtex';
let AUTO_GENERATED_VENUE_WARNING = false; // 标记是否触发了自动提取
// 新增：全局变量，用于存储用户刚才点击的搜索结果中的会议名
let LAST_CLICKED_VENUE_HINT = null;
// 新增：保存当前的警告列表，供弹窗使用
let CURRENT_WARNINGS = [];

const dom = {
    input: document.getElementById('input'),
    output: document.getElementById('output'),
    btnConvert: document.getElementById('btn-convert'),
    btnCopy: document.getElementById('btn-copy'),
    btnInlineSwitchBatch: document.getElementById('btn-inline-switch-batch'),
    tabs: document.querySelectorAll('.tab-btn'),
    // Settings Drawer
    fieldsContainerPrimary: document.getElementById('fields-primary'),
    fieldsContainerSecondary: document.getElementById('fields-secondary'),
    btnToggleFields: document.getElementById('btn-toggle-fields'),
    idFormat: document.getElementById('id-format'),
    chkKeepOriginal: document.getElementById('chk-keep-original'),
    chkFullAuthorName: document.getElementById('chk-full-author-name'),
    chkShowAllAuthors: document.getElementById('chk-show-all-authors'),
    mappingRules: document.getElementById('mapping-rules'),
    // 🚀 新增导出按钮
    btnExportRules: document.getElementById('btn-export-rules'),
    btnExpandEditor: document.getElementById('btn-expand-editor'),
    editorWrapper: document.getElementById('editor-wrapper'),
    venueRadios: document.getElementsByName('venue-mode'),
    btnReset: document.getElementById('btn-reset'),
    // Drawer Control
    btnOpenSettings: document.getElementById('btn-open-settings'),
    btnCloseSettings: document.getElementById('btn-close-settings'),
    settingsDrawer: document.getElementById('settings-drawer'),
    drawerOverlay: document.getElementById('drawer-overlay'),
    // Search
    searchInput: document.getElementById('search-input'),
    btnSearch: document.getElementById('btn-search'),
    searchResultsList: document.getElementById('search-results-list'),
    // 🚀 新增 Modal 相关 DOM
    warningMsg: document.getElementById('venue-warning-msg'),
    warningModal: document.getElementById('warning-modal'),
    warningList: document.getElementById('warning-list-content'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    // 搜索模式，简单-完整
    searchRadios: document.getElementsByName('search-mode'), // 🚀 新增
};

function init() {
    renderFields();
    loadValuesToUI();
    setupEventListeners();
    setupAutoConvertListeners(); // 监听设置变化

    // 初始化批量模式
    initBatchMode();

    // 初始化验证模式
    initVerificationMode();

    // 初始化同步滚动
    const entriesPane = document.getElementById('batch-entries-pane');
    const previewPane = document.getElementById('batch-preview-pane');
    if (entriesPane && previewPane) {
        initSyncScroll(entriesPane, previewPane);
    }

    // 初始化开发者测试模式

    updateBatchInlineToggle();
}

function renderFields() {
    dom.fieldsContainerPrimary.innerHTML = ''; dom.fieldsContainerSecondary.innerHTML = '';
    CONSTANTS.ALL_FIELDS.forEach((f, i) => {
        const label = document.createElement('label');
        label.className = 'checkbox-row';
        label.innerHTML = `
            <input type="checkbox" name="keep_fields" id="chk-field-${f}" value="${f}"> 
            <span>${f}</span>
        `;
        (i < 6 ? dom.fieldsContainerPrimary : dom.fieldsContainerSecondary).appendChild(label);
    });
}

function loadValuesToUI() {
    const saved = ConfigManager.getFields();
    [...dom.fieldsContainerPrimary.querySelectorAll('input'), ...dom.fieldsContainerSecondary.querySelectorAll('input')]
        .forEach(c => c.checked = saved.includes(c.value));
    dom.idFormat.value = ConfigManager.getFormat();
    dom.mappingRules.value = ConfigManager.getMappings();
    dom.venueRadios.forEach(r => { if(r.value === ConfigManager.getVenueMode()) r.checked = true; });
    if(dom.chkKeepOriginal) {
        dom.chkKeepOriginal.checked = ConfigManager.getKeepOriginal();
        updateIdFormatState();
    }
    if(dom.chkFullAuthorName) {
        dom.chkFullAuthorName.checked = ConfigManager.getFullAuthorName();
    }
    if(dom.chkShowAllAuthors) {
        dom.chkShowAllAuthors.checked = ConfigManager.getShowAllAuthors();
    }
    // 3. 强制重置 Show More 的 UI 状态
    if (dom.btnToggleFields) {
        const icon = dom.btnToggleFields.querySelector('svg');
        const span = dom.btnToggleFields.querySelector('span');
        // 默认收起
        dom.fieldsContainerSecondary.classList.add('hidden');
        span.textContent = 'Show more';
        icon.classList.remove('rotate');
    }

    // 🚀 加载搜索模式设置
    const searchMode = ConfigManager.getSearchMode();
    dom.searchRadios.forEach(r => { 
        if(r.value === searchMode) r.checked = true; 
    });
}

function saveValuesFromUI() {
    const checks = [...dom.fieldsContainerPrimary.querySelectorAll('input:checked'), ...dom.fieldsContainerSecondary.querySelectorAll('input:checked')].map(c => c.value);
    ConfigManager.setFields(checks);
    ConfigManager.setFormat(dom.idFormat.value);
    ConfigManager.setMappings(dom.mappingRules.value);
    ConfigManager.setVenueMode([...dom.venueRadios].find(r => r.checked)?.value || 'abbr');
    if(dom.chkKeepOriginal) ConfigManager.setKeepOriginal(dom.chkKeepOriginal.checked);
    if(dom.chkFullAuthorName) ConfigManager.setFullAuthorName(dom.chkFullAuthorName.checked);
    if(dom.chkShowAllAuthors) ConfigManager.setShowAllAuthors(dom.chkShowAllAuthors.checked);
    // 🚀 保存搜索模式
    ConfigManager.setSearchMode([...dom.searchRadios].find(r => r.checked)?.value || 'simple');
}

function updateIdFormatState() {
    if(dom.chkKeepOriginal) {
        dom.idFormat.disabled = dom.chkKeepOriginal.checked;
        dom.idFormat.style.opacity = dom.chkKeepOriginal.checked ? '0.5' : '1';
    }
}

function setupEventListeners() {
    // 1. 转换按钮
    if (dom.btnConvert) {
        dom.btnConvert.addEventListener('click', runConversion); // 抽离出 runConversion 函数
    }
    
    // 🚀 新增：监听搜索模式切换 (Fast vs Precise)
    // 一旦用户切换选项，立即保存到 LocalStorage
    if (dom.searchRadios) {
        dom.searchRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                saveValuesFromUI();
                // 可选：给个小提示告诉用户设置已保存
                showToast("Search mode saved"); 
            });
        });
    }

    // // 2. 复制按钮
    // if (dom.btnCopy) {
    //     dom.btnCopy.addEventListener('click', () => {
    //         dom.output.select();
    //         document.execCommand('copy');
    //         showToast("Copied to clipboard");
    //     });
    // }

    // // 3. 设置抽屉开关 (确保 ID 存在)
    // if (dom.btnOpenSettings && dom.settingsDrawer) {
    //     dom.btnOpenSettings.addEventListener('click', () => {
    //         dom.settingsDrawer.classList.add('open');
    //         dom.drawerOverlay.classList.add('open');
    //     });
    // }

    // // 关闭抽屉
    // const closeDrawer = () => {
    //     dom.settingsDrawer.classList.remove('open');
    //     dom.drawerOverlay.classList.remove('open');
    // };
    // if (dom.btnCloseSettings) dom.btnCloseSettings.addEventListener('click', closeDrawer);
    // if (dom.drawerOverlay) dom.drawerOverlay.addEventListener('click', closeDrawer);

    // // 4. Show More 切换
    // if (dom.btnToggleFields) {
    //     dom.btnToggleFields.addEventListener('click', () => {
    //         // 切换 hidden 类
    //         const isHidden = dom.fieldsContainerSecondary.classList.toggle('hidden');
            
    //         // 更新按钮文字
    //         const span = dom.btnToggleFields.querySelector('span');
    //         if (span) span.textContent = isHidden ? 'Show more' : 'Show less';
            
    //         // 旋转图标
    //         const icon = dom.btnToggleFields.querySelector('svg');
    //         if (icon) icon.classList.toggle('rotate', !isHidden);
    //     });
    // }


    
    dom.btnCopy.addEventListener('click', () => { dom.output.select(); document.execCommand('copy'); showToast("Copied!"); });
    dom.btnReset.addEventListener('click', () => { if(confirm("Reset to default?")) { ConfigManager.reset(); loadValuesToUI(); } });
    dom.tabs.forEach(btn => btn.addEventListener('click', (e) => {
        dom.tabs.forEach(b => b.classList.remove('active')); e.target.classList.add('active');
        CURRENT_TAB = e.target.dataset.type; renderOutput();
    }));
    if(dom.chkKeepOriginal) dom.chkKeepOriginal.addEventListener('change', updateIdFormatState);
    if(dom.btnToggleFields) dom.btnToggleFields.addEventListener('click', () => {
        const hidden = dom.fieldsContainerSecondary.classList.toggle('hidden');
        dom.btnToggleFields.querySelector('span').textContent = hidden ? 'Show more' : 'Show less';
        dom.btnToggleFields.querySelector('svg').classList.toggle('rotate');
    });
    if(dom.btnExpandEditor) dom.btnExpandEditor.addEventListener('click', () => {
        dom.editorWrapper.classList.toggle('fullscreen');
    });

    // Drawer
    const toggleDrawer = (open) => {
        dom.settingsDrawer.classList.toggle('open', open);
        dom.drawerOverlay.classList.toggle('open', open);
    };
    if(dom.btnOpenSettings) dom.btnOpenSettings.addEventListener('click', () => toggleDrawer(true));
    if(dom.btnCloseSettings) dom.btnCloseSettings.addEventListener('click', () => toggleDrawer(false));
    if(dom.drawerOverlay) dom.drawerOverlay.addEventListener('click', () => toggleDrawer(false));
    // Search
    // 🚀 修复搜索按钮和回车键的监听逻辑
    if (dom.btnSearch) {
        // 修改前：dom.btnSearch.addEventListener('click', performSearch);
        // 修改后：使用匿名函数包裹，确保不传 Event 对象
        dom.btnSearch.addEventListener('click', () => performSearch(false));
        
        dom.searchInput.addEventListener('keydown', (e) => { 
            if(e.key === 'Enter') {
                performSearch(false); // 明确传入 false
            }
        });
    }
    // 🚀 新增：点击警告文字，打开弹窗
    if (dom.warningMsg) {
        dom.warningMsg.style.cursor = 'pointer';
        dom.warningMsg.addEventListener('click', openWarningModal);
    }
    // 🚀 新增：关闭弹窗
    if (dom.btnCloseModal) {
        dom.btnCloseModal.addEventListener('click', closeWarningModal);
    }
    if (dom.warningModal) {
        dom.warningModal.addEventListener('click', (e) => {
            if (e.target === dom.warningModal) closeWarningModal();
        });
    }
    // 🚀 导出按钮监听
    if (dom.btnExportRules) {
        dom.btnExportRules.addEventListener('click', exportCustomRules);
    }
    
}


// 新增：监听设置变化，立即触发转换
function setupAutoConvertListeners() {
    // 监听复选框
    const allChecks = [
        ...dom.fieldsContainerPrimary.querySelectorAll('input'),
        ...dom.fieldsContainerSecondary.querySelectorAll('input'),
        dom.chkKeepOriginal,
        dom.chkFullAuthorName,
        dom.chkShowAllAuthors
    ];

    // 触发转换的函数 - 根据当前模式决定调用哪个转换函数
    const triggerConversion = () => {
        if (BatchModeState.isActive) {
            // 批量模式：重新处理所有条目
            reprocessAllEntries();
        } else {
            // 单条模式：点击转换按钮
            dom.btnConvert.click();
        }
    };

    allChecks.forEach(chk => chk.addEventListener('change', triggerConversion));

    // 监听 Radio
    dom.venueRadios.forEach(r => r.addEventListener('change', triggerConversion));

    // 监听输入框 (防抖)
    let timeout;
    const inputs = [dom.idFormat, dom.mappingRules];
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(triggerConversion, 500);
        });
    });

    // 输入变化时更新批量模式提示按钮
    let batchHintTimer;
    dom.input?.addEventListener('input', () => {
        clearTimeout(batchHintTimer);
        batchHintTimer = setTimeout(updateBatchInlineToggle, 250);
    });

    dom.btnInlineSwitchBatch?.addEventListener('click', () => {
        // 直接切换到批量模式，switchToBatchMode 会复制当前输入
        switchToBatchMode();
    });
}


// 核心转换逻辑封装
function runConversion() {
    saveValuesFromUI();
    const rawInput = dom.input.value;
    if (!rawInput.trim()) return;

    updateBatchInlineToggle();

    // 先解析条目，检查是否应该切换到批量模式
    const parsedEntries = parseRawBibtex(rawInput);

    // 检查是否应该切换到批量模式（≥3个条目）
    if (checkShouldSwitchToBatchMode(parsedEntries)) {
        showModeSwitchDialog(parsedEntries.length);
        return; // 等待用户选择
    }

    // 解析规则
    const rules = parseMappingRules(dom.mappingRules.value);

    // 执行处理 (传入新的回调函数用于检测未知会议)
    // 调用 processor，传入 LAST_CLICKED_VENUE_HINT
    const resultObj = processEntries(
        rawInput,
        rules,
        dom.idFormat.value,
        ConfigManager.getFields(),
        ConfigManager.getVenueMode(),
        ConfigManager.getKeepOriginal(),
        LAST_CLICKED_VENUE_HINT, // 传入 DBLP 提示
        ConfigManager.getCustomRules() // 传入本地学习到的规则
    );

    CURRENT_DATA = resultObj.data;
    CURRENT_WARNINGS = resultObj.warnings; // 保存警告

    // 渲染结果
    renderOutput();
    handleWarnings(CURRENT_WARNINGS);
}

function updateBatchInlineToggle() {
        if (!dom.btnInlineSwitchBatch) return;
        const rawInput = dom.input?.value || '';
        if (!rawInput.trim()) {
            dom.btnInlineSwitchBatch.classList.add('hidden');
            return;
        }
        try {
            const parsed = parseRawBibtex(rawInput) || [];
            if (parsed.length >= 3) {
                dom.btnInlineSwitchBatch.classList.remove('hidden');
            } else {
                dom.btnInlineSwitchBatch.classList.add('hidden');
            }
        } catch (e) {
            dom.btnInlineSwitchBatch.classList.add('hidden');
        }
}



// 5. 智能提取缩写算法
function extractAbbrSmartly(fullName) {
    if (!fullName) return "CONF";
    // 简单策略：提取大写字母
    // 排除一些常见虚词的首字母干扰 (如 "The", "Of", "International", "Conference" 等其实通常保留)
    // 这里做一个简单的提取：取所有大写字母，如果少于2个，取前4个字符
    const matches = fullName.match(/[A-Z]/g);
    if (matches && matches.length >= 2) {
        return matches.join('');
    }
    // Fallback
    return fullName.split(/\s+/)[0].toUpperCase().replace(/[^A-Z]/g, '');
}

// Search 排序优化
// 修改 performSearch 函数签名，增加 forceDeep 参数
async function performSearch(forceDeep = false) {
    // 🛡️ 防御性编程：如果传入的不是布尔值（比如是 Event 对象），强制设为 false
    if (typeof forceDeep !== 'boolean') forceDeep = false;

    const qRaw = dom.searchInput.value.trim();
    if (!qRaw) return;
    
    // 规范化查询词 (用于排序比对)
    const qNorm = qRaw.toLowerCase().replace(/[^a-z0-9]/g, '');

    // 只有在第一次搜索时才清空列表显示 Loading
    // 如果是点击"Deep Search"，我们在保留原列表的基础上更新，体验更好
    if (!forceDeep) {
        dom.searchResultsList.innerHTML = '<div class="empty-state">Searching...</div>';
    } else {
        // 给按钮变个状态，提示正在加载
        const btn = document.getElementById('btn-deep-search');
        if (btn) btn.textContent = "Loading 1000 results...";
    }
    
    // 1. 决定搜索深度：默认 100，深度模式 1000 (DBLP API 上限)
    const limit = forceDeep ? 1000 : 100;
    
    try {
        const res = await fetch(`https://dblp.org/search/publ/api?q=${encodeURIComponent(qRaw)}&format=json&h=${limit}`);
        const data = await res.json();
        
        // 2. 获取数据
        const hits = data.result.hits.hit || [];
        const totalMatches = parseInt(data.result.hits['@total'] || 0);
        
        if (hits.length === 0) {
            dom.searchResultsList.innerHTML = '<div class="empty-state">No results found.</div>';
            return;
        }

        // 3. 强力排序 (完全匹配优先 > 长度越短越好)
        hits.sort((a, b) => {
            const titleA = (a.info.title || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            const titleB = (b.info.title || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            
            const exactA = titleA === qNorm;
            const exactB = titleB === qNorm;
            
            if (exactA && !exactB) return -1;
            if (!exactA && exactB) return 1;
            
            // 如果都匹配(或都不匹配)，短的排前面 (原版通常比衍生版标题短)
            return titleA.length - titleB.length;
        });

        // 4. 渲染列表
        renderSearchResults(hits);

        // =========================================================
        // 🚀 核心新增：底部提示与深度搜索按钮
        // =========================================================
        // 触发条件：
        // 1. 当前不是深度模式 (!forceDeep)
        // 2. 返回数量达到了我们设定的限制 (hits.length >= limit)
        // 3. API 告诉我们总结果数其实还有更多 (totalMatches > limit)
        console.log(`搜索结果统计: 当前显示 ${hits.length} 条, 设限 ${limit} 条, 总共 ${totalMatches} 条`);
        if (!forceDeep && hits.length >= limit && totalMatches > limit) {
            const warningDiv = document.createElement('div');
            // 样式美化
            warningDiv.style.padding = '16px';
            warningDiv.style.textAlign = 'center';
            warningDiv.style.fontSize = '0.85rem';
            warningDiv.style.color = '#666';
            warningDiv.style.borderTop = '1px solid #eee';
            warningDiv.style.background = '#f8f9fa';
            warningDiv.style.cursor = 'default';
            
            warningDiv.innerHTML = `
                <p style="margin: 0 0 10px 0; font-weight: 500;">
                    ⚠️ Showing top ${limit} of ${totalMatches} results.
                </p>
                <p style="margin: 0 0 12px 0; font-size: 0.8rem; color: #888;">
                    Target paper missing? It might be buried deeper.
                </p>
                <button id="btn-deep-search" class="btn-outlined" style="width:100%; justify-content:center;">
                    🔍 Deep Search (Check top 1000)
                </button>
            `;
            
            dom.searchResultsList.appendChild(warningDiv);
            
            // 绑定点击事件
            document.getElementById('btn-deep-search').addEventListener('click', (e) => {
                e.stopPropagation(); // 防止冒泡触发 item 点击
                performSearch(true); // 🚀 开启深度搜索模式
            });
        }

    } catch (e) {
        console.error(e);
        dom.searchResultsList.innerHTML = '<div class="empty-state">Error searching DBLP.</div>';
    }
}

// 处理警告 UI
function handleWarnings(warnings) {
    if (!dom.warningMsg) return;

    if (warnings && warnings.length > 0) {
        const count = warnings.length;
        // 显示文本： "⚠️ 3 Warnings (Click to view)"
        dom.warningMsg.textContent = `⚠️ ${count} Warning${count > 1 ? 's' : ''} (Click to view)`;
        dom.warningMsg.style.display = 'block';
        dom.output.style.borderColor = '#D32F2F';
        dom.output.style.boxShadow = '0 0 0 1px #D32F2F';
    } else {
        dom.warningMsg.style.display = 'none';
        dom.output.style.borderColor = ''; 
        dom.output.style.boxShadow = '';
    }
}

// 🚀 弹窗逻辑
function openWarningModal() {
    if (!CURRENT_WARNINGS || CURRENT_WARNINGS.length === 0) return;
    dom.warningList.innerHTML = '';
    
    CURRENT_WARNINGS.forEach(msg => {
        const div = document.createElement('div');
        div.className = 'warning-item';
        div.textContent = msg;
        dom.warningList.appendChild(div);
    });
    
    dom.warningModal.classList.add('show');
}

function closeWarningModal() {
    dom.warningModal.classList.remove('show');
}

// 输出渲染 (处理红色警告)
function renderOutput() {
    if (!CURRENT_DATA || CURRENT_DATA.length === 0) {
        dom.output.value = "";
        return;
    }
    
    let result = FORMATTERS[CURRENT_TAB](CURRENT_DATA);
    
    // 5. 注入红色警告 (仅在 BibTeX 模式下，且确实触发了智能提取)
    if (CURRENT_TAB === 'bibtex' && AUTO_GENERATED_VENUE_WARNING) {
        const warning = "% ⚠️ WARNING: Some venue abbreviations were auto-generated and may not be standard.\n% Please check 'Venue Mappings' settings.\n\n";
        result = warning + result;
        // 注意：textarea 无法渲染红色文字，只能是纯文本提示。
        // 如果要红色高亮，需要把 textarea 换成 div contenteditable，工程量巨大。
        // 这里我们用显眼的 ASCII 装饰。
    }
    
    dom.output.value = result;
}

// 修改：renderSearchResults (点击时保存 hint)
function renderSearchResults(hits) {
    dom.searchResultsList.innerHTML = '';
    hits.forEach(hit => {
        const div = document.createElement('div'); div.className = 'result-item';
        const info = hit.info;
        const authors = info.authors ? (Array.isArray(info.authors.author) ? info.authors.author.map(a=>a.text).join(', ') : info.authors.author.text || info.authors.author) : 'Unknown';
        
        div.innerHTML = `<div class="result-title">${info.title}</div><div class="result-meta">${authors}</div><div class="result-meta" style="color:var(--md-sys-color-primary);margin-top:4px;">${info.venue || 'Unknown'} ${info.year || ''}</div>`;
        
        
        div.addEventListener('click', async () => {
            document.querySelectorAll('.result-item').forEach(el => el.classList.remove('active')); 
            div.classList.add('active');
            
            // 1. 修正 NIPS
            if (info.venue === 'NIPS') {
                info.venue = 'NeurIPS'; // 修改源数据，保证传入 backupData 也是对的
            }

            // 2. 修正 Findings (新增逻辑)
            // 检查 ee (链接) 或 url 是否包含 'findings'
            const eeStr = Array.isArray(info.ee) ? info.ee.join(' ') : (info.ee || "");
            const checkSource = (eeStr + (info.url || "")).toLowerCase();
            
            if (checkSource.includes('findings')) {
                // 如果检测到是 Findings，但 venue 还没写，就加上后缀
                if (info.venue && !info.venue.toLowerCase().includes('findings')) {
                    info.venue = `${info.venue} (Findings)`;
                }
            }

            // 保存 DBLP 返回的 venue (例如 "WACV")
            LAST_CLICKED_VENUE_HINT = info.venue; 

            // 🚀 检查模式：是“极速版”还是“精准版”？
            saveValuesFromUI(); // 确保拿到最新设置
            const mode = ConfigManager.getSearchMode();

            if (mode === 'simple') {
                // ==========================
                // ⚡ 极速模式 (Fast Mode)
                // ==========================
                console.log("⚡ 使用极速模式 (From Metadata)");
                
                // 直接生成 BibTeX
                const generatedBib = generateBibFromJSON(info);
                dom.input.value = generatedBib;
                
                // 自动学习规则
                if (info.venue) {
                    ConfigManager.addCustomRule(info.venue, info.venue);
                }

                // 立即转换
                dom.btnConvert.click();
                showToast("Imported (Fast Mode)!");

            } else {
                // ==========================
                // 🐢 精准模式 (Detailed Mode)
                // ==========================
                // 走老路：API -> Proxy -> HTML 爬虫
                await fetchAndFillBibtex(info.key, info); 
            }
        });
        dom.searchResultsList.appendChild(div);
    });
}
            

// 修改：fetchAndFillBibtex (防止 input 修改时 hint 失效)
async function fetchAndFillBibtex(key, backupData = null) {
    // 1. 优先尝试 Dagstuhl 镜像站的 .bib 接口 (最快，最标准)
    const primaryUrl = `https://dblp.dagstuhl.de/rec/${key}.bib`;
    // 2. 备用：你发现的那个坚不可摧的 .html 网页
    const fallbackHtmlUrl = `https://dblp.org/rec/${key}.html?view=bibtex`;
    
    console.log("🔗 开始请求:", key);

    try {
        showToast("Fetching BibTeX...");
        let rawText = "";

        // =========================================================
        // 阶段 1: 尝试标准 .bib 接口 (带代理回退)
        // =========================================================
        try {
            // 尝试直连镜像站
            const res = await fetch(primaryUrl);
            if (res.status === 429 || res.status === 503) throw new Error("RateLimit");
            if (!res.ok) throw new Error("FetchFail");
            const text = await res.text();
            
            // 检查是否是被封锁的 HTML 页面
            if (text.trim().startsWith("<!DOCTYPE") || text.includes("<html")) {
                throw new Error("GotHtmlError");
            }
            rawText = text;

        } catch (err) {
            console.warn(`标准接口受限 (${err.message})，尝试代理...`);
            
            // 尝试通过代理访问标准接口
            try {
                const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(primaryUrl)}`;
                const res = await fetch(proxyUrl);
                if (!res.ok) throw new Error("ProxyFail");
                rawText = await res.text();
            } catch (proxyErr) {
                console.warn("代理也失败了，准备尝试爬取 HTML 页面...");
                // 代理也挂了？别急，我们还有最后一招...
            }
        }

        // =========================================================
        // 阶段 2: 终极兜底 - 爬取 .html?view=bibtex (你的发现)
        // =========================================================
        if (!rawText || rawText.includes("<!DOCTYPE") || rawText.includes("Error 503")) {
            // 如果上面的 .bib 接口全军覆没，或者返回了错误页面
            // 我们直接请求那个“网页版”链接，因为网页版很难被封
            console.log("🛡️ 启用终极兜底：爬取 HTML 视图");
            
            // 注意：这里也得走代理，因为直接 fetch 跨域的 HTML 会被浏览器拦截 CORS
            const htmlProxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fallbackHtmlUrl)}`;
            const res = await fetch(htmlProxyUrl);
            if (!res.ok) throw new Error("HtmlFetchFail");
            rawText = await res.text();
        }

        // =========================================================
        // 处理数据
        // =========================================================
        // 这里的 rawText 可能是纯 BibTeX，也可能是一大坨 HTML 代码
        // 但没关系，我们的 parseRawBibtex 正则非常强大，它能忽略 HTML 标签，
        // 直接在乱码中定位到 @article{...} 并提取出来！
        
        const entries = parseRawBibtex(rawText);

        if (entries.length === 0) {
            throw new Error("No BibTeX found in response");
        }

        // 🛠️ 修复点：不要调用 toBibTeX，而是手动拼接字符串
        // 因为 toBibTeX 需要 keepFields 属性，而这里的 entries 没有。
        // 我们只需要生成一个合法的 BibTeX 扔进 Input 框，格式丑点没关系，
        // 后面的 dom.btnConvert.click() 会负责把它变漂亮。
        
        const cleanBibtex = entries.map(e => {
            let str = `@${e.type}{${e.key},\n`;
            // 遍历所有字段直接输出
            for (const [k, v] of Object.entries(e.fields)) {
                str += `  ${k} = {${v}},\n`;
            }
            str += `}`;
            return str;
        }).join('\n\n');
        
        dom.input.value = cleanBibtex;

        // 自动学习
        if (LAST_CLICKED_VENUE_HINT) {
            const entry = entries[0];
            const fullVenue = entry.fields['booktitle'] || entry.fields['journal'];
            if (fullVenue) {
                ConfigManager.addCustomRule(fullVenue, LAST_CLICKED_VENUE_HINT);
            }
        }
        
        setTimeout(() => dom.btnConvert.click(), 100);
        showToast("Imported!");

    } catch(e) { 
        console.error("网络请求全军覆没，尝试使用 Search JSON 兜底", e);

        // =========================================================
        // 🛡️ 阶段 3: 本地 JSON 兜底 (零网络请求)
        // =========================================================
        if (backupData) {
            console.log("正在从 Search JSON 生成 BibTeX...");
            const generatedBib = generateBibFromJSON(backupData);
            dom.input.value = generatedBib;
            
            // 自动学习 (记录缩写)
            if (backupData.venue) {
                // 注意：这里学到的是缩写对缩写 (ISCAS => ISCAS)，
                // 虽然不是全称，但至少保证了 ID 生成是正确的。
                ConfigManager.addCustomRule(backupData.venue, backupData.venue);
            }

            setTimeout(() => dom.btnConvert.click(), 100);
            showToast("Generated from metadata (Offline mode)");
            return; // 成功退出
        }

        showToast("Failed to fetch (All methods tried)"); 
    }
}

// 🛠️ 辅助函数：把 DBLP Search JSON 转换成 BibTeX 字符串
function generateBibFromJSON(info) {
    // 1. 确定类型
    let type = 'misc';
    const typeStr = (info.type || "").toLowerCase();
    if (typeStr.includes('conference') || typeStr.includes('workshop') || typeStr.includes('proceedings')) {
        type = 'inproceedings';
    } else if (typeStr.includes('journal') || typeStr.includes('article')) {
        type = 'article';
    } else if (typeStr.includes('book')) {
        type = 'book';
    }

    // 2. 处理作者 (Search API 返回的是数组或单个对象，需要转成 "A and B")
    let authorStr = "Unknown";
    if (info.authors && info.authors.author) {
        const authors = Array.isArray(info.authors.author) 
            ? info.authors.author.map(a => a.text) 
            : [info.authors.author.text || info.authors.author];
        authorStr = authors.join(' and ');
    }

    // 3. 处理会议名称 (Venue)
    let venueName = info.venue || "CONF";

    // Fix A: NIPS -> NeurIPS (之前的逻辑)
    if (venueName === 'NIPS') venueName = 'NeurIPS';

    // =========================================================
    // 🚀 Fix B: 智能识别 Findings (根据 ee 或 url 判断)
    // =========================================================
    // DBLP 的 ee 字段有时是字符串，有时是数组，需要安全处理
    const eeStr = Array.isArray(info.ee) ? info.ee.join(' ') : (info.ee || "");
    // 将 ee 和 url 拼起来检查，只要包含 "findings" 就算
    const checkSource = (eeStr + (info.url || "")).toLowerCase();

    if (checkSource.includes('findings')) {
        // 防止重复添加 (比如 venue 本身已经是 "ACL Findings" 了)
        if (!venueName.toLowerCase().includes('findings')) {
            venueName = `${venueName} (Findings)`;
        }
    }

    // 3. 构建 BibTeX
    // 注意：Search API 的 venue 通常是缩写 (如 ISCAS)，我们暂且填入 booktitle
    return `@${type}{${info.key},
  author    = {${authorStr}},
  title     = {${info.title}},
  ${type === 'article' ? 'journal' : 'booktitle'} = {${venueName}},
  year      = {${info.year}},
  pages     = {${info.pages || ""}},
  doi       = {${info.doi || ""}},
  url       = {${info.url || ""}}
}`;
}

// 🚀 导出功能
function exportCustomRules() {
    const rules = ConfigManager.getCustomRules();
    const keys = Object.keys(rules);
    if (keys.length === 0) {
        alert("No custom rules learned yet.");
        return;
    }

    // 格式化为: ^Full Name$ => ABBR || Full Name
    // 使用 ^$ 锚定，确保是 Strict Match
    const lines = keys.map(full => {
        // 需要转义正则中的特殊字符 (如 +, ., (, ))
        const escapedFull = full.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
        const abbr = rules[full];
        return `^${escapedFull}$ => ${abbr} || ${full}`;
    });

    const text = lines.join('\n');
    
    // 创建一个临时文本框让用户复制，或者直接复制到剪贴板
    navigator.clipboard.writeText(text).then(() => {
        showToast("Rules copied to clipboard!");
    }).catch(() => {
        // Fallback
        console.log(text);
        alert("Check console for rules (Copy failed)");
    });
}


// 补充：监听 Input 变化，如果用户手动修改了 BibTeX，可能之前的 Hint 就不适用了
// 但考虑到用户体验，我们可以选择保留 Hint 或者清空。
// 建议：如果用户清空了 Input，则清空 Hint。
dom.input.addEventListener('input', (e) => {
    if (!e.target.value.trim()) {
        LAST_CLICKED_VENUE_HINT = null;
    }
});


init();