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


        // --- ID 生成逻辑 ---
        // ⚠️ 修复点：优先检查 keepOriginal，如果开启且存在原始key，直接使用
        if (keepOriginal && entry.key) {
            newEntry.id = entry.key;
        } else {
            let authors = (newEntry.fields['author'] || "Unknown").split(/\s+and\s+/);
            let firstAuth = authors[0].trim();
            let authLast = firstAuth.includes(',') ? firstAuth.split(',')[0] : firstAuth.split(/\s+/).pop();
            // 修复：生成 ID 前先清理姓氏中的非字符符号
            authLast = authLast.replace(/[\{\}\W]+/g, ""); 
            
            let year = newEntry.fields['year'] || "0000";
            // 修复：防止 year 里混入括号
            year = year.replace(/[\{\}\W]+/g, "");

            let titleWord = getTitleWord(newEntry.fields['title']);

            newEntry.id = idFormat
                .replace("[Auth]", authLast)
                .replace("[Year]", year)
                .replace("[Title]", titleWord)
                .replace("[Venue]", venueAbbrForId)
                .toLowerCase()
                // 🚀 核心修改：允许下划线(_)和连字符(-)通过，不被清洗掉
                .replace(/[^a-z0-9_\-]/g, '');
        }

        return newEntry;
    }).sort((a, b) => a.id.localeCompare(b.id));
}

// 辅助函数：解析 BibTeX
function parseRawBibtex(input) {
    const entries = [];
    const entryRegex = /@(\w+)\s*\{([^,]*),([\s\S]*?)(?=@\w+|\s*$)/g;
    let match;
    while ((match = entryRegex.exec(input))) {
        const type = match[1].toLowerCase();
        const rawType = match[1]; 
        const key = match[2].trim(); 
        
        // 🚀 核心修复：在解析字段前，先剥离掉 Entry 末尾的关闭大括号
        let content = match[3];
        const lastBraceIndex = content.lastIndexOf('}');
        if (lastBraceIndex !== -1) {
            content = content.substring(0, lastBraceIndex);
        }

        const fields = {};
        // 匹配 key = {val} 或 key = "val" 或 key = 123
        const fieldRegex = /(\w+)\s*=\s*(?:\{([\s\S]*?)\}|"([\s\S]*?)")(?=\s*,|\s*$)|(\w+)\s*=\s*(\d+)/g;
        
        let fMatch;
        while ((fMatch = fieldRegex.exec(content))) {
            const k = (fMatch[1]||fMatch[4]).toLowerCase();
            // fMatch[2]是花括号内容, fMatch[3]是引号内容, fMatch[5]是数字
            let v = (fMatch[2]||fMatch[3]||fMatch[5]);
            if (v) {
                // 再次清洗值，移除多余空白
                v = v.replace(/\s+/g, ' ').trim();
            }
            fields[k] = v;
        }
        entries.push({ type, rawType, key, fields });
    }
    return entries;
}
