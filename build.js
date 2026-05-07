const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

// 确保目录存在
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log('Waiting for data files...');
    process.exit(0);
}

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.txt')).sort().reverse();
if (files.length === 0) { console.log('No data found in data/ folder.'); process.exit(0); }

let historyListHtml = '';
const articleTemplate = fs.readFileSync('template.html', 'utf-8');

files.forEach(file => {
    const rawText = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    const dateKey = file.replace('.txt', ''); 
    const headerLine = lines[0];
    const reportDate = (headerLine.match(/(.*?)游戏圈日报/) || [null, dateKey])[1];
    const reportCount = (headerLine.match(/共\s*(\d+)\s*篇/) || [null, '0'])[1];

    const contentText = rawText.substring(rawText.indexOf('\n')).trim();
    const rawBlocks = contentText.split(/(?=\n\d+\.\s)/).map(b => b.trim()).filter(b => b);

    let cardsHtml = '';
    rawBlocks.forEach(block => {
        const titleMatch = block.match(/\d+\.\s(.*?)(?=\n|$)/);
        const titleRaw = titleMatch ? titleMatch[1].trim() : '未知标题';
        const isFeatured = titleRaw.includes('⭐ 重点推荐');
        const cleanTitle = titleRaw.replace('⭐ 重点推荐', '').trim();

        const mp = (block.match(/公众号：(.*?)(?=\s|　|分类：|$)/) || ['', ''])[1].trim();
        const category = (block.match(/分类：(.*?)(?=\n|$)/) || ['', ''])[1].trim();
        const summary = (block.match(/摘要：(.*?)(?=\n|$)/) || ['', ''])[1].trim();
        const link = (block.match(/原文链接：(.*?)(?=\n|$)/) || ['', '#'])[1].trim();
        const timeMatch = block.match(/发布时间：(.*?)(?=\n|$)/);
        let timeStr = timeMatch ? timeMatch[1].trim().split(' ').pop() : '';

        cardsHtml += `
            <div class="card ${isFeatured ? 'featured' : ''}">
                <h2 class="title"><a href="${link}" target="_blank">${cleanTitle}</a></h2>
                ${summary && summary !== '暂无摘要' ? `<div class="summary">${summary}</div>` : ''}
                <div class="meta">
                    ${isFeatured ? '<span class="tag featured-tag">⭐ 重点</span>' : ''}
                    <span class="tag">${category}</span>
                    <span class="source">${mp}</span>
                    <span class="time">${timeStr}</span>
                </div>
            </div>\n`;
    });

    const htmlFileName = `${dateKey}.html`;
    let pageHtml = articleTemplate
        .replace(/\{\{DATE\}\}/g, reportDate)
        .replace(/\{\{COUNT\}\}/g, reportCount);

    // 双重保险替换逻辑
    if (//.test(pageHtml)) {
        pageHtml = pageHtml.replace(//, cardsHtml);
    } else {
        pageHtml = pageHtml.replace('<div class="article-list">', '<div class="article-list">\n' + cardsHtml);
    }
    
    fs.writeFileSync(htmlFileName, pageHtml);

    historyListHtml += `
        <a href="${htmlFileName}" class="history-item">
            <div class="history-date">${dateKey.slice(5)}</div>
            <div class="history-info">
                <span class="history-title">${reportDate}日报</span>
                <span class="history-count">共 ${reportCount} 篇</span>
            </div>
            <div class="history-arrow">→</div>
        </a>\n`;
});

let indexTpl = fs.readFileSync('index_template.html', 'utf-8');
if (//.test(indexTpl)) {
    indexTpl = indexTpl.replace(//, historyListHtml);
} else {
    indexTpl = indexTpl.replace('<div class="history-list">', '<div class="history-list">\n' + historyListHtml);
}
fs.writeFileSync('index.html', indexTpl);
console.log('Build Success!');
