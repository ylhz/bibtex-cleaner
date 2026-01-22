import { VENUE_MAPPING_DATA } from './venue_data.js';


export const CONSTANTS = {
    DEFAULT_FIELDS: ['author', 'title', 'booktitle', 'journal', 'venue', 'year', 'pages'],
    ALL_FIELDS: ['author', 'title', 'booktitle', 'journal', 'venue', 'year', 'pages', 'volume', 'number', 'doi', 'url', 'eprint', 'publisher', 'editor', 'month'],
    DEFAULT_FORMAT: "[Auth][Year][Title]_[Venue]",
    DEFAULT_MAPPINGS: VENUE_MAPPING_DATA,
    DEFAULT_KEEP_ORIGINAL: true, // 7. 默认配置改为 true
    DEFAULT_SEARCH_MODE: 'simple', // 🚀 新增默认值：简版
    DEFAULT_FULL_AUTHOR_NAME: false, // 默认使用缩写作者名
    DEFAULT_SHOW_ALL_AUTHORS: false // 默认只显示前3个作者
};


export const ConfigManager = {
    // 检查是否有本地缓存，没有则返回默认值
    get(key, defaultVal) {
        const stored = localStorage.getItem(key);
        if (stored === null) return defaultVal;
        try { return JSON.parse(stored); } catch(e) { return stored; }
    },
    
    set(key, val) {
        if (typeof val === 'object') val = JSON.stringify(val);
        localStorage.setItem(key, val);
    },

    getFields() { return this.get('bib-fields', CONSTANTS.DEFAULT_FIELDS); },
    setFields(v) { this.set('bib-fields', v); },

    getFormat() { return this.get('bib-format', CONSTANTS.DEFAULT_FORMAT); },
    setFormat(v) { this.set('bib-format', v); },

    getMappings() { return this.get('bib-mappings', CONSTANTS.DEFAULT_MAPPINGS); },
    setMappings(v) { this.set('bib-mappings', v); },

    // 7. 默认值为 true
    getKeepOriginal() { 
        const val = localStorage.getItem('bib-keep-original');
        return val === null ? CONSTANTS.DEFAULT_KEEP_ORIGINAL : val === 'true';
    },
    setKeepOriginal(v) { localStorage.setItem('bib-keep-original', v); },

    getVenueMode() { return this.get('bib-venue-mode', 'abbr'); },
    setVenueMode(v) { this.set('bib-venue-mode', v); },

    // 🚀 新增：自定义规则管理
    // 结构: { "Full Conference Name": "ABBR", "Another Journal": "JRNL" }
    getCustomRules() { return this.get('bib-custom-rules', {}); },
    
    addCustomRule(fullName, abbr) {
        if (!fullName || !abbr) return;
        const rules = this.getCustomRules();
        // 只有当该全称不存在，或者缩写不同的时候才更新
        if (rules[fullName] !== abbr) {
            rules[fullName] = abbr;
            this.set('bib-custom-rules', rules);
            console.log(`[Auto-Learn] Learned: "${fullName}" => "${abbr}"`);
        }
    },

    // 🚀 新增：搜索模式 (simple | detailed)
    getSearchMode() { return this.get('bib-search-mode', CONSTANTS.DEFAULT_SEARCH_MODE); },
    setSearchMode(v) { this.set('bib-search-mode', v); },

    // 作者名输出模式 (完整名 | 缩写)
    getFullAuthorName() {
        const val = localStorage.getItem('bib-full-author-name');
        return val === null ? CONSTANTS.DEFAULT_FULL_AUTHOR_NAME : val === 'true';
    },
    setFullAuthorName(v) { localStorage.setItem('bib-full-author-name', v); },

    // 是否显示所有作者 (GB/T格式)
    getShowAllAuthors() {
        const val = localStorage.getItem('bib-show-all-authors');
        return val === null ? CONSTANTS.DEFAULT_SHOW_ALL_AUTHORS : val === 'true';
    },
    setShowAllAuthors(v) { localStorage.setItem('bib-show-all-authors', v); },

    reset() { localStorage.clear(); }
};