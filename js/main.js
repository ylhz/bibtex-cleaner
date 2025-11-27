import { CONSTANTS, ConfigManager } from './config.js';
import { processEntries, parseMappingRules } from './processor.js';
import { showToast } from './utils.js';

// 导入策略
import { toBibTeX } from './formatters/bibtex.js';
import { toMLA } from './formatters/mla.js';
import { toGBT } from './formatters/gbt7714.js';

// 策略映射
const FORMATTERS = {
    'bibtex': (entries) => entries.map(toBibTeX).join('\n\n'),
    'mla': (entries) => entries.map(toMLA).join('\n\n'),
    'gbt': (entries) => entries.map((e, i) => toGBT(e, i)).join('\n')
};

// 全局状态
let CURRENT_DATA = [];
let CURRENT_TAB = 'bibtex';

// DOM 元素引用
const dom = {
    input: document.getElementById('input'),
    output: document.getElementById('output'),
    fieldsContainer: document.getElementById('fields-container'),
    idFormat: document.getElementById('id-format'),
    mappingRules: document.getElementById('mapping-rules'),
    btnConvert: document.getElementById('btn-convert'),
    btnCopy: document.getElementById('btn-copy'),
    btnReset: document.getElementById('btn-reset'),
    tabs: document.querySelectorAll('.tab-btn'),
    venueRadios: document.getElementsByName('venue-mode'),
    // ⬇️⬇️⬇️ 之前漏掉了这一行，导致脚本崩溃 ⬇️⬇️⬇️
    chkKeepOriginal: document.getElementById('chk-keep-original') ,
    fieldsContainerPrimary: document.getElementById('fields-primary'),   // 新增
    fieldsContainerSecondary: document.getElementById('fields-secondary'), // 新增
    btnToggleFields: document.getElementById('btn-toggle-fields'),         // 新增
    btnExpandEditor: document.getElementById('btn-expand-editor'),         // 新增
    editorWrapper: document.getElementById('editor-wrapper'),
};





// ================= 初始化 =================
function init() {
    renderFields();
    loadValuesToUI();
    setupEventListeners();
}

// function renderFields() {
//     dom.fieldsContainer.innerHTML = '';
//     CONSTANTS.ALL_FIELDS.forEach(f => {
//         const label = document.createElement('label');
//         label.className = 'checkbox-label'; // 修正类名以匹配 CSS
//         label.innerHTML = `<input type="checkbox" value="${f}"> <span>${f}</span>`;
//         dom.fieldsContainer.appendChild(label);
//     });
// }

// 1. 修改 renderFields：前6个放上面，剩下的放下面
function renderFields() {
    dom.fieldsContainerPrimary.innerHTML = '';
    dom.fieldsContainerSecondary.innerHTML = '';
    
    CONSTANTS.ALL_FIELDS.forEach((f, index) => {
        const label = document.createElement('label');
        label.className = 'checkbox-row';
        label.innerHTML = `<input type="checkbox" value="${f}"> <span>${f}</span>`;
        
        // 逻辑：前 6 个放 Primary，后面的放 Secondary
        if (index < 6) {
            dom.fieldsContainerPrimary.appendChild(label);
        } else {
            dom.fieldsContainerSecondary.appendChild(label);
        }
    });
}

function loadValuesToUI() {
    // Checkbox 加载
    const savedFields = ConfigManager.getFields();

    // 合并查找两个容器里的 input
    const allChecks = [
        ...dom.fieldsContainerPrimary.querySelectorAll('input'),
        ...dom.fieldsContainerSecondary.querySelectorAll('input')
    ];
    
    allChecks.forEach(c => c.checked = savedFields.includes(c.value));
    

    // Inputs 加载
    dom.idFormat.value = ConfigManager.getFormat();
    dom.mappingRules.value = ConfigManager.getMappings();

    // Venue Mode 加载
    const mode = ConfigManager.getVenueMode();
    dom.venueRadios.forEach(r => {
        if(r.value === mode) r.checked = true;
    });

    // 加载 Keep Original 状态
    const keepOriginal = ConfigManager.getKeepOriginal();
    // 如果 dom.chkKeepOriginal 没获取到，这里就会报错停止
    if (dom.chkKeepOriginal) {
        dom.chkKeepOriginal.checked = keepOriginal;
        updateIdFormatState(); // 更新输入框禁用状态
    }
}

function saveValuesFromUI() {
    const allChecks = [
        ...dom.fieldsContainerPrimary.querySelectorAll('input:checked'),
        ...dom.fieldsContainerSecondary.querySelectorAll('input:checked')
    ];
    const checks = allChecks.map(c => c.value);

    ConfigManager.setFields(checks);
    ConfigManager.setFormat(dom.idFormat.value);
    ConfigManager.setMappings(dom.mappingRules.value);
    
    // 保存 Venue Mode
    const selectedMode = Array.from(dom.venueRadios).find(r => r.checked)?.value || 'abbr';
    ConfigManager.setVenueMode(selectedMode);

    if (dom.chkKeepOriginal) {
        ConfigManager.setKeepOriginal(dom.chkKeepOriginal.checked);
    }
}

// 辅助：控制 ID 输入框是否禁用
function updateIdFormatState() {
    if (!dom.chkKeepOriginal) return;
    
    if (dom.chkKeepOriginal.checked) {
        dom.idFormat.disabled = true;
        dom.idFormat.style.opacity = '0.5';
    } else {
        dom.idFormat.disabled = false;
        dom.idFormat.style.opacity = '1';
    }
}

// ================= 事件处理 =================
function setupEventListeners() {
    // 转换按钮
    dom.btnConvert.addEventListener('click', () => {
        saveValuesFromUI();
        const rawInput = dom.input.value;
        if (!rawInput.trim()) return;

        const rules = parseMappingRules(dom.mappingRules.value);
        const format = dom.idFormat.value;
        const keepFields = ConfigManager.getFields();
        const venueMode = ConfigManager.getVenueMode();
        const keepOriginal = ConfigManager.getKeepOriginal();

        // 处理数据
        CURRENT_DATA = processEntries(rawInput, rules, format, keepFields, venueMode, keepOriginal);
        
        renderOutput();
    });

    // 复制按钮
    dom.btnCopy.addEventListener('click', () => {
        dom.output.select();
        document.execCommand('copy');
        showToast("Copied to clipboard");
    });

    // 重置按钮
    dom.btnReset.addEventListener('click', () => {
        if(confirm("Reset to default settings? This will clear your custom rules.")) {
            ConfigManager.reset();
            loadValuesToUI();
        }
    });

    // Tab 切换
    dom.tabs.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // UI 切换
            dom.tabs.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // 逻辑切换
            CURRENT_TAB = e.target.dataset.type;
            renderOutput();
        });
    });

    // 监听 Keep Original 变化
    if (dom.chkKeepOriginal) {
        dom.chkKeepOriginal.addEventListener('change', () => {
            updateIdFormatState();
        });
    }

    // --- 新增：展开/收起更多字段 ---
    dom.btnToggleFields.addEventListener('click', () => {
        const isHidden = dom.fieldsContainerSecondary.classList.contains('hidden');
        const icon = dom.btnToggleFields.querySelector('svg');
        const span = dom.btnToggleFields.querySelector('span');

        if (isHidden) {
            dom.fieldsContainerSecondary.classList.remove('hidden');
            span.textContent = 'Show less';
            icon.classList.add('rotate'); // 箭头旋转
        } else {
            dom.fieldsContainerSecondary.classList.add('hidden');
            span.textContent = 'Show more';
            icon.classList.remove('rotate');
        }
    });

    // --- 新增：编辑器全屏切换 ---
    dom.btnExpandEditor.addEventListener('click', () => {
        dom.editorWrapper.classList.toggle('fullscreen');
        
        // 切换图标 (放大 <-> 缩小)
        const isFullscreen = dom.editorWrapper.classList.contains('fullscreen');
        const path = dom.btnExpandEditor.querySelector('path');
        if (isFullscreen) {
            // 缩小图标
            path.setAttribute('d', 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z');
        } else {
            // 放大图标
            path.setAttribute('d', 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z');
        }
    });

}

// ================= 渲染输出 =================
function renderOutput() {
    if (!CURRENT_DATA || CURRENT_DATA.length === 0) return;
    
    const formatter = FORMATTERS[CURRENT_TAB];
    if (formatter) {
        dom.output.value = formatter(CURRENT_DATA);
    }
}

// 启动
init();