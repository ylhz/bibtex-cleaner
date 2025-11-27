import { getTitleWord } from './utils.js';

// 1. 解析规则：现在支持提取 Full Name
export function parseMappingRules(text) {
    return text.split('\n')
        .filter(l => l.trim() && !l.startsWith('#'))
        .map(l => {
            // 先按 => 分割正则和目标
            const parts = l.split('=>');
            if (parts.length < 2) return null;

            const regexStr = parts[0].trim();
            const targetStr = parts[1].trim();

            // 再按 || 分割 缩写和全称
            const targetParts = targetStr.split('||');
            const abbr = targetParts[0].trim();
            // 如果没写全称，默认全称 = 缩写
            const full = (targetParts[1] || abbr).trim();

            return { regex: new RegExp(regexStr, 'i'), abbr, full };
        })
        .filter(x => x);
}

// 2. 主处理管道：增加了 venueMode 参数
export function processEntries(inputText, mappingRules, idFormat, keepFields, venueMode = 'abbr', keepOriginal = false) {
    const rawEntries = parseRawBibtex(inputText); // 这里的 parseRawBibtex 保持原样即可，不用改
    
    return rawEntries.map(entry => {
        const newEntry = { 
            type: entry.rawType, 
            fields: { ...entry.fields },
            keepFields: keepFields
        };

        // --- 会议/期刊名映射逻辑 ---
        let venueFull = newEntry.fields['booktitle'] || newEntry.fields['journal'] || "";
        let venueAbbrForId = "CONF"; // ID 生成永远使用缩写
        let targetVenueName = venueFull; // 最终显示的名称
        let found = false;

        if (venueFull) {
            for (let rule of mappingRules) {
                if (rule.regex.test(venueFull)) {
                    // 1. 确定 ID 用的缩写
                    venueAbbrForId = rule.abbr;
                    
                    // 2. 确定显示的名称 (根据用户选择：abbr 还是 full)
                    targetVenueName = (venueMode === 'full') ? rule.full : rule.abbr;
                    
                    found = true;
                    break;
                }
            }
            if (!found) {
                // 没匹配到规则，做简单的清洗作为 ID
                let simple = venueFull.replace(/[^{}\w\s]/g, "");
                venueAbbrForId = simple.split(/\s+/)[0] || "CONF";
                // 没匹配到规则，显示名称保持原样
                targetVenueName = venueFull;
            }
        }
        
        // 更新字段 (使用清洗后的名称)
        if (newEntry.fields['booktitle']) newEntry.fields['booktitle'] = targetVenueName;
        if (newEntry.fields['journal']) newEntry.fields['journal'] = targetVenueName;

        // --- 生成 ID (逻辑不变，始终使用 Abbr) ---
        // ⚠️ 修复点：优先检查 keepOriginal，如果开启且存在原始key，直接使用
        if (keepOriginal && entry.key) {
            newEntry.id = entry.key;
        } else {
            // 否则才执行自动生成逻辑
            let authors = (newEntry.fields['author'] || "Unknown").split(/\s+and\s+/);
            let firstAuth = authors[0].trim();
            let authLast = firstAuth.includes(',') ? firstAuth.split(',')[0] : firstAuth.split(/\s+/).pop();
            authLast = authLast.replace(/\W+/g, "");
            
            let year = newEntry.fields['year'] || "0000";
            let titleWord = getTitleWord(newEntry.fields['title']);

            newEntry.id = idFormat
                .replace("[Auth]", authLast)
                .replace("[Year]", year)
                .replace("[Title]", titleWord)
                .replace("[Venue]", venueAbbrForId);  // 注意：ID 永远用缩写，不受 Full Name 模式影响
        }


        return newEntry;
    }).sort((a, b) => a.id.localeCompare(b.id));
}

// 辅助函数 (保持在同一个文件或者 import 进来)
function parseRawBibtex(input) {
    // ... (保持你之前的 parseRawBibtex 代码不变) ...
    const entries = [];
    const entryRegex = /@(\w+)\s*\{([^,]*),([\s\S]*?)(?=@\w+|\s*$)/g;
    let match;
    while ((match = entryRegex.exec(input))) {
        const type = match[1].toLowerCase();
        const rawType = match[1]; 
        const key = match[2].trim();

        const fields = {};
        const fieldRegex = /(\w+)\s*=\s*[\{"]([\s\S]*?)[\}"](?=\s*,|\s*$)|(\w+)\s*=\s*(\d+)/g;
        let fMatch;
        while ((fMatch = fieldRegex.exec(match[3]))) {
            const k = (fMatch[1]||fMatch[3]).toLowerCase();
            fields[k] = (fMatch[2]||fMatch[4]).replace(/\s+/g, ' ').trim();
        }
        entries.push({ type, rawType, key, fields });
    }
    return entries;
}