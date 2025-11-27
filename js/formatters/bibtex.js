export function toBibTeX(entry) {
    let str = `@${entry.type}{${entry.id},\n`;
    // 仅输出 keepFields 中包含的字段
    entry.keepFields.forEach(k => {
        if (entry.fields[k]) {
            str += `  ${k.padEnd(12)} = {${entry.fields[k]}},\n`;
        }
    });
    str = str.replace(/,\n$/, "\n");
    str += `}`;
    return str;
}