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
    venueRadios: document.getElementsByName('venue-mode')
};

// ================= 初始化 =================
function init() {
    renderFields();
    loadValuesToUI();
    setupEventListeners();
}

function renderFields() {
    dom.fieldsContainer.innerHTML = '';
    CONSTANTS.ALL_FIELDS.forEach(f => {
        const label = document.createElement('label');
        label.className = 'checkbox-label';
        label.innerHTML = `<input type="checkbox" value="${f}"> ${f}`;
        dom.fieldsContainer.appendChild(label);
    });
}

function loadValuesToUI() {
    // Checkbox 加载
    const savedFields = ConfigManager.getFields();
    const checks = dom.fieldsContainer.querySelectorAll('input');
    checks.forEach(c => c.checked = savedFields.includes(c.value));

    // Inputs 加载
    dom.idFormat.value = ConfigManager.getFormat();
    dom.mappingRules.value = ConfigManager.getMappings();

    // Venue Mode 加载
    const mode = ConfigManager.getVenueMode();
    dom.venueRadios.forEach(r => {
        if(r.value === mode) r.checked = true;
    });
}

function saveValuesFromUI() {
    const checks = Array.from(dom.fieldsContainer.querySelectorAll('input:checked')).map(c => c.value);
    ConfigManager.setFields(checks);
    ConfigManager.setFormat(dom.idFormat.value);
    ConfigManager.setMappings(dom.mappingRules.value);
    
    // 保存 Venue Mode
    const selectedMode = Array.from(dom.venueRadios).find(r => r.checked)?.value || 'abbr';
    ConfigManager.setVenueMode(selectedMode);
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

        // 处理数据
        CURRENT_DATA = processEntries(rawInput, rules, format, keepFields, venueMode);
        
        renderOutput();
    });

    // 复制按钮
    dom.btnCopy.addEventListener('click', () => {
        dom.output.select();
        document.execCommand('copy');
        showToast("Copied to clipboard"); // 英文提示
    });

    // 重置按钮
    dom.btnReset.addEventListener('click', () => {
        if(confirm("Reset to default settings? This will clear your custom rules.")) { // 英文弹窗
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