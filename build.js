const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log('Waiting for data files...');
    process.exit(0);
}

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.txt')).sort().reverse();

if (files.length === 0) { 
    console.log('No data found in data/ folder.'); 
    process.exit(0); 
}

let historyListHtml = '';
const articleTemplate = fs.readFileSync('template.html', 'utf-8');

files.forEach(file => {
    const rawText = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const dateKey = file.replace('.txt', ''); 
    const headerLine = lines[0];
    
    let reportDate = dateKey;
    const dateMatch = headerLine.match(/(.*?)游戏圈日报/);
    if (dateMatch) reportDate = dateMatch[1];
    
    let reportCount = '0';
    const countMatch = headerLine.match(/共\s*(\d+)\s*篇/);
    if (countMatch) reportCount = countMatch[1];

    const contentText = rawText.substring(rawText.indexOf('\n')).trim();
    const rawBlocks = contentText.split(/(?=\n\d+\.\s)/).map(b => b.trim()).filter(b => b.length > 0);

    let cardsHtml = '';
    rawBlocks.forEach(block => {
        const titleMatch = block.match(/\d+\.\s(.*?)(?=\n|$)/);
        const titleRaw = titleMatch ? titleMatch[1].trim() : '未知标题';
        const isFeatured = titleRaw.includes('⭐ 重点推荐');
        const cleanTitle = titleRaw.replace('⭐ 重点推荐', '').trim();

        const mpMatch = block.match(/公众号：(.*?)(?=\s|　|分类：|$)/);
        const mp = mpMatch ? mpMatch[1].trim() : '';

        const catMatch = block.match(/分类：(.*?)(?=\n|$)/);
        const category = catMatch ? catMatch[1].trim() : '';

        const sumMatch = block.match(/摘要：(.*?)(?=\n|$)/);
        const summary = sumMatch ? sumMatch[1].trim() : '';

        const linkMatch = block.match(/原文链接：(.*?)(?=\n|$)/);
        const link = linkMatch ? linkMatch[1].trim() : '#';

        const timeMatch = block.match(/发布时间：(.*?)(?=\n|$)/);
        let timeStr = '';
        if (timeMatch) {
            const parts = timeMatch[1].trim().split(' ');
            timeStr = parts[parts.length - 1];
        }
        
        let tagClass = 'hangye';
        if (category === '出海') tagClass = 'chuhai';
        if (category === 'AI技术') tagClass = 'ai';
        if (category === '小游戏') tagClass = 'xiaoyouxi';

        cardsHtml += '<div class="card ' + (isFeatured ? 'featured' : '') + '">\n';
        cardsHtml += '    <h2 class="title"><a href="' + link + '" target="_blank">' + cleanTitle + '</a></h2>\n';
        if (summary && summary !== '暂无摘要') cardsHtml += '    <div class="summary">' + summary + '</div>\n';
        cardsHtml += '    <div class="meta">\n';
        if (isFeatured) cardsHtml += '        <span class="tag featured-tag">⭐ 重点</span>\n';
        if (category) cardsHtml += '        <span class="tag ' + tagClass + '">' + category + '</span>\n';
        if (mp) cardsHtml += '        <span class="source">' + mp + '</span>\n';
        cardsHtml += '        <span class="time">' + timeStr + '</span>\n';
        cardsHtml += '    </div>\n';
        cardsHtml += '</div>\n';
    });

    const htmlFileName = dateKey + '.html';
    let pageHtml = articleTemplate.replace(/\{\{DATE\}\}/g, reportDate).replace(/\{\{COUNT\}\}/g, reportCount);

    const hasPlaceholder = pageHtml.includes('CARDS_CONTENT_HERE');
    if (hasPlaceholder) {
        pageHtml = pageHtml.replace(//, cardsHtml);
    }
    if (!hasPlaceholder) {
        pageHtml = pageHtml.replace('<div class="article-list">', '<div class="article-list">\n' + cardsHtml);
    }
    
    fs.writeFileSync(htmlFileName, pageHtml);

    historyListHtml += '<a href="' + htmlFileName + '" class="history-item">\n';
    historyListHtml += '    <div class="history-date">' + dateKey.slice(5) + '</div>\n';
    historyListHtml += '    <div class="history-info">\n';
    historyListHtml += '        <span class="history-title">' + reportDate + '日报</span>\n';
    historyListHtml += '        <span class="history-count">共 ' + reportCount + ' 篇</span>\n';
    historyListHtml += '    </div>\n';
    historyListHtml += '    <div class="history-arrow">→</div>\n';
    historyListHtml += '</a>\n';
});

let indexTpl = fs.readFileSync('index_template.html', 'utf-8');

const hasHistoryPlaceholder = indexTpl.includes('HISTORY_LIST_HERE');
if (hasHistoryPlaceholder) {
    indexTpl = indexTpl.replace(//, historyListHtml);
}
if (!hasHistoryPlaceholder) {
    indexTpl = indexTpl.replace('<div class="history-list">', '<div class="history-list">\n' + historyListHtml);
}

fs.writeFileSync('index.html', indexTpl);
console.log('Build Success!');