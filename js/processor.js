import { getTitleWord } from './utils.js';

// 1. 解析规则：现在支持提取 Full Name
export function parseMappingRules(text) {
    return text.split('\n')
        .filter(l => l.trim() && !l.startsWith('#'))
        .map(l => {
            // 先按 => 分割正则和目标
            const parts = l.split('=>');
            if (parts.length < 2) return null;

            let regexStr = parts[0].trim();
            const targetStr = parts[1].trim();

            // ============================================================
            // 🛠 核心修复：自动添加单词边界 \b
            // 防止 "RAL" 匹配到 "Neural"，或 "AI" 匹配到 "Chain"
            // ============================================================
            
            // 只有当用户没有自己写边界符(^, $, \b)时，我们才自动包裹
            // 我们使用 (?:...) 非捕获组来包裹用户的正则，确保 | (OR) 逻辑正确
            if (!regexStr.startsWith('^') && !regexStr.startsWith('\\b') && !regexStr.includes('\\b')) {
                // 解释：\b 是单词边界。
                // 如果 regexStr 是 "RAL|Robotics"，处理后变成 "\b(?:RAL|Robotics)\b"
                regexStr = '\\b(?:' + regexStr + ')\\b';
            }

            // 再按 || 分割 缩写和全称
            const targetParts = targetStr.split('||');
            const abbr = targetParts[0].trim();
            // 如果没写全称，默认全称 = 缩写
            const full = (targetParts[1] || abbr).trim();

            try {
                return { regex: new RegExp(regexStr, 'i'), abbr, full };
            } catch (e) {
                console.error("Invalid Regex Rule:", parts[0]);
                return null;
            }
        })
        .filter(x => x);
}

// 2. 主处理管道：增加了 venueMode 参数
export function processEntries(inputText, mappingRules, idFormat, keepFields, venueMode = 'abbr', keepOriginal = false, hintVenue = null, customRules = {}) {
    const rawEntries = parseRawBibtex(inputText); // 这里的 parseRawBibtex 保持原样即可，不用改

    const warnings = []; // 改名：从 unknowns 改为 warnings，涵盖范围更广
    
    const processedEntries = rawEntries.map(entry => {
        const newEntry = { 
            type: entry.rawType, 
            fields: { ...entry.fields },
            keepFields: keepFields
        };

        // =========================================================
        // 🧼 核心修复：清洗 DBLP 作者名中的消歧义数字
        // =========================================================
        // 正则解释：匹配 "空格+4位数字"，将其替换为空字符串
        if (newEntry.fields['author']) {
            newEntry.fields['author'] = newEntry.fields['author'].replace(/ \d{4}/g, '');
        }
        // 保险起见，editor 字段也洗一下
        if (newEntry.fields['editor']) {
            newEntry.fields['editor'] = newEntry.fields['editor'].replace(/ \d{4}/g, '');
        }
        

        // --- 会议/期刊名映射逻辑 ---
        let venueFull = newEntry.fields['booktitle'] || newEntry.fields['journal'] || "";
        let venueAbbrForId = "";         // ID 用的部分
        let targetVenueName = venueFull; // 默认：原文全称
        let foundRule = false;


        // ========================================================================
        // 🔒 严格逻辑：仅三选一
        // 1. 规则库 (Rule Library)
        // 2. DBLP 提示 (Hint from DBLP)
        // 3. 原文全称 (Original Full Name) - 绝不猜测!
        // ========================================================================

        // =========================================================
        // 🚀 1. 优先检查本地学习到的规则 (Strict Match)
        // =========================================================
        if (venueFull && customRules[venueFull]) {
            const learnedAbbr = customRules[venueFull];
            venueAbbrForId = learnedAbbr;
            // 如果是 Full 模式，且我们没有存 FullName (目前 LocalStorage 只存了 Abbr)，就用原名
            // 如果是 Abbr 模式，直接用学到的缩写
            targetVenueName = (venueMode === 'full') ? venueFull : learnedAbbr;
            foundRule = true;
        }

        // --- 1. 尝试匹配规则库 ---
        if (!foundRule && venueFull) {
            for (let rule of mappingRules) {
                if (rule.regex.test(venueFull)) {
                    venueAbbrForId = rule.abbr;
                    targetVenueName = (venueMode === 'full') ? rule.full : rule.abbr;
                    foundRule = true;
                    break;
                }
            }
        }

        // --- 2. 没找到规则 ---
        if (!foundRule) {
            // 情况 A: 有 DBLP 提示 (且是单条处理，防止批量时误用)
            if (hintVenue && rawEntries.length === 1) {
                venueAbbrForId = hintVenue;
                // 如果用户选了 Full 模式，通常还是保留原文更稳妥；但如果是 Abbr 模式，就用 Hint
                targetVenueName = (venueMode === 'full') ? venueFull : hintVenue;
            } 
            // 情况 B: 既没规则，也没提示 (或批量处理中) -> 严格回退到原文
            else {
                venueAbbrForId = venueFull; // ID 生成也没招了，只能用全名，强迫用户去加规则
                targetVenueName = venueFull; // 保持原样，绝不瞎猜 "IEEE" 或 "IGARSS"
            }

            // 🚨 只要没命中规则，就报警。
            // 提示用户："这个会议不在库里，我现在直接用的原文/DBLP提示，你自己检查对不对"
            if (venueAbbrForId === venueFull) {
                warnings.push(`"${venueFull.substring(0, 30)}..." (Not in Library, keeping original)`);
            } else {
                warnings.push(`"${venueAbbrForId}" (From DBLP, not in Library)`);
            }
        } 
        
        // --- 3. 安全校验 (即使命中规则，也检查是否跟 DBLP 冲突) ---
        else if (hintVenue && rawEntries.length === 1) {
            // 如果生成的会议名跟 DBLP 的提示完全不同，报警
            if (targetVenueName !== hintVenue && venueAbbrForId !== hintVenue) {
                warnings.push(`Mismatch: Output "${targetVenueName}" vs DBLP "${hintVenue}"`);
            }
        }

        // 更新字段
        if (newEntry.fields['booktitle']) newEntry.fields['booktitle'] = targetVenueName;
        if (newEntry.fields['journal']) newEntry.fields['journal'] = targetVenueName;


        // --- ID 生成逻辑 ---
        if (keepOriginal && entry.key) {
            newEntry.id = entry.key;
        } else {
            let authors = (newEntry.fields['author'] || "Unknown").split(/\s+and\s+/);
            let firstAuth = authors[0].trim();
            let authLast = firstAuth.includes(',') ? firstAuth.split(',')[0] : firstAuth.split(/\s+/).pop();
            authLast = authLast.replace(/[\{\}\s]+/g, ""); 
            
            let year = (newEntry.fields['year'] || "0000").replace(/[\{\}\W]+/g, "");
            let titleWord = getTitleWord(newEntry.fields['title']);


            // 🚀 核心修改：ID 中的 Venue 如果太长，进行缩略
            let finalVenueId = venueAbbrForId.toLowerCase().replace(/[^a-z0-9_\-]/g, '');
            if (finalVenueId.length > 20) {
                // 策略：提取每个单词的首字母 (如 "international_conference..." -> "ic")
                const matches = venueAbbrForId.match(/\b[A-Za-z]/g);
                if (matches && matches.length >= 2) {
                    finalVenueId = matches.join('').toLowerCase();
                } else {
                    // 只有一长串字符，直接截断
                    finalVenueId = finalVenueId.substring(0, 10);
                }
            }
            newEntry.id = idFormat
                .replace("[Auth]", authLast)
                .replace("[Year]", year)
                .replace("[Title]", titleWord)
                .replace("[Venue]", finalVenueId) // 使用处理后的短名
                .toLowerCase()
                .replace(/[^a-z0-9_\-]/g, ''); // 清理特殊字符
        }

        return newEntry;
    }); // <--- ❌ 删除了输出排序 .sort((a, b) => a.id.localeCompare(b.id))

    return { data: processedEntries, warnings: warnings };
}

// 🚀 导出 parseRawBibtex 供 main.js 使用
export function parseRawBibtex(input) {
    const entries = [];
    const entryRegex = /@(\w+)\s*\{([^,]*),([\s\S]*?)(?=@\w+\s*\{|\s*$)/g;
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
