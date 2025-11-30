import { CONSTANTS, ConfigManager } from './config.js';
import { processEntries, parseMappingRules, parseRawBibtex } from './processor.js';
import { showToast, getTitleWord } from './utils.js'; 
import { toBibTeX } from './formatters/bibtex.js';
import { toMLA } from './formatters/mla.js';
import { toGBT } from './formatters/gbt7714.js';

const FORMATTERS = {
    'bibtex': (entries) => entries.map(toBibTeX).join('\n\n'),
    'mla': (entries) => entries.map(toMLA).join('\n\n'),
    'gbt': (entries) => entries.map((e, i) => toGBT(e, i)).join('\n')
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
    tabs: document.querySelectorAll('.tab-btn'),
    // Settings Drawer
    fieldsContainerPrimary: document.getElementById('fields-primary'),
    fieldsContainerSecondary: document.getElementById('fields-secondary'),
    btnToggleFields: document.getElementById('btn-toggle-fields'),
    idFormat: document.getElementById('id-format'),
    chkKeepOriginal: document.getElementById('chk-keep-original'),
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
    btnCloseModal: document.getElementById('btn-close-modal')
};

function init() {
    renderFields();
    loadValuesToUI();
    setupEventListeners();
    setupAutoConvertListeners(); // 监听设置变化
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
    // 3. 强制重置 Show More 的 UI 状态
    if (dom.btnToggleFields) {
        const icon = dom.btnToggleFields.querySelector('svg');
        const span = dom.btnToggleFields.querySelector('span');
        // 默认收起
        dom.fieldsContainerSecondary.classList.add('hidden');
        span.textContent = 'Show more';
        icon.classList.remove('rotate');
    }
}

function saveValuesFromUI() {
    const checks = [...dom.fieldsContainerPrimary.querySelectorAll('input:checked'), ...dom.fieldsContainerSecondary.querySelectorAll('input:checked')].map(c => c.value);
    ConfigManager.setFields(checks);
    ConfigManager.setFormat(dom.idFormat.value);
    ConfigManager.setMappings(dom.mappingRules.value);
    ConfigManager.setVenueMode([...dom.venueRadios].find(r => r.checked)?.value || 'abbr');
    if(dom.chkKeepOriginal) ConfigManager.setKeepOriginal(dom.chkKeepOriginal.checked);
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
    if(dom.btnSearch) {
        dom.btnSearch.addEventListener('click', performSearch);
        dom.searchInput.addEventListener('keydown', (e) => { if(e.key === 'Enter') performSearch(); });
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
        dom.chkKeepOriginal
    ];
    allChecks.forEach(chk => chk.addEventListener('change', () => dom.btnConvert.click()));

    // 监听 Radio
    dom.venueRadios.forEach(r => r.addEventListener('change', () => dom.btnConvert.click()));

    // 监听输入框 (防抖)
    let timeout;
    const inputs = [dom.idFormat, dom.mappingRules];
    inputs.forEach(input => {
        input.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => dom.btnConvert.click(), 500);
        });
    });
}


// 核心转换逻辑封装
function runConversion() {
    saveValuesFromUI();
    const rawInput = dom.input.value;
    if (!rawInput.trim()) return;

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
async function performSearch() {
    const qRaw = dom.searchInput.value.trim();
    if (!qRaw) return;
    const qNorm = qRaw.toLowerCase().replace(/[^a-z0-9]/g, ''); // 规范化查询

    dom.searchResultsList.innerHTML = '<div class="empty-state">Searching...</div>';
    
    try {
        const res = await fetch(`https://dblp.org/search/publ/api?q=${encodeURIComponent(qRaw)}&format=json&h=30`);
        const data = await res.json();
        const hits = data.result.hits.hit;
        
        if (!hits || !hits.length) {
            dom.searchResultsList.innerHTML = '<div class="empty-state">No results found.</div>';
            return;
        }

        // 排序逻辑
        hits.sort((a, b) => {
            const titleA = (a.info.title || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            const titleB = (b.info.title || "").toLowerCase().replace(/[^a-z0-9]/g, '');
            
            // 1. 完全一致 (规范化后长度相等且内容相等)
            const exactA = titleA === qNorm;
            const exactB = titleB === qNorm;
            if (exactA && !exactB) return -1;
            if (!exactA && exactB) return 1;

            // 2. 多余单词越少越好 (即：总长度越接近查询长度越好)
            // 前提是包含查询词 (DBLP API 已经帮我们过滤了包含关系，这里主要比长度)
            return titleA.length - titleB.length;
        });

        renderSearchResults(hits);
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
            
            // 🚀 关键：保存 DBLP 返回的 venue (例如 "WACV")
            LAST_CLICKED_VENUE_HINT = info.venue; 
            
            await fetchAndFillBibtex(info.key);
        });
        dom.searchResultsList.appendChild(div);
    });
}

// 修改：fetchAndFillBibtex (防止 input 修改时 hint 失效)
async function fetchAndFillBibtex(key) {
    try {
        showToast("Fetching BibTeX...");
        const res = await fetch(`https://dblp.org/rec/${key}.bib`);
        if(!res.ok) throw new Error("Err");

        const bibText = await res.text();
                dom.input.value = bibText;
        
                // ===========================================================
                // 🧠 自动学习逻辑 (Auto-Learn)
                // ===========================================================
                if (LAST_CLICKED_VENUE_HINT) {
                    // 1. 解析刚刚抓取到的 BibTeX，获取其“官方全称”
                    const entries = parseRawBibtex(bibText);
                    if (entries.length > 0) {
                        const entry = entries[0];
                        const fullVenue = entry.fields['booktitle'] || entry.fields['journal'];
                        
                        if (fullVenue) {
                            // 2. 将 "全称" -> "缩写(来自DBLP点击)" 存入本地
                            // 注意：这里我们存的是原始全称 (如 {IEEE} Conf...)，保证下次能全字匹配
                            ConfigManager.addCustomRule(fullVenue, LAST_CLICKED_VENUE_HINT);
                        }
                    }
                }
        
        
        // 自动触发转换
        setTimeout(() => dom.btnConvert.click(), 100);
        showToast("Imported & Rule Learned!"); // 提示用户已学习
    } catch(e) { 
        console.error(e);
        showToast("Failed to fetch"); 
    }
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