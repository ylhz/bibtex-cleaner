const IGNORE_TITLE_WORDS = new Set(['the', 'a', 'an', 'on', 'in', 'of', 'for', 'and', 'with', 'via', 'to', 'from']);

export function getTitleWord(title) {
    if (!title) return "Untitled";
    let clean = title.replace(/[\{\}]/g, "").replace(/[^\w\s]/g, "");
    let words = clean.split(/\s+/);
    for (let w of words) {
        if (!IGNORE_TITLE_WORDS.has(w.toLowerCase())) {
            return w.charAt(0).toUpperCase() + w.slice(1);
        }
    }
    return words[0] ? (words[0].charAt(0).toUpperCase() + words[0].slice(1)) : "Untitled";
}

export function parseName(rawName) {
    rawName = rawName.trim();
    if (rawName.includes(',')) {
        let parts = rawName.split(',');
        return { last: parts[0].trim(), first: parts[1].trim() };
    } else {
        let parts = rawName.split(' ');
        let last = parts.pop();
        let first = parts.join(' ');
        return { last, first };
    }
}

// 简单的 Toast 提示工具 (默认文本改为英文)
export function showToast(msg = "Copied") {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2000);
}