const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

// 首次运行如果没 data 文件夹则创建
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log('创建了空的 data 目录。');
    process.exit(0);
}

// 获取所有 txt 文件，按文件名（日期）倒序排列
const files = fs.readdirSync(dataDir)
                .filter(f => f.endsWith('.txt'))
                .sort().reverse();

if (files.length === 0) {
    console.log('没有找到任何数据文件');
    process.exit(0);
}

let historyListHtml = '';
const articleTemplate = fs.readFileSync('template.html', 'utf-8');

files.forEach(file => {
    const rawText = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    const dateKey = file.replace('.txt', ''); 

    const headerLine = lines[0];
    const dateMatch = headerLine.match(/(.*?)游戏圈日报/);
    const countMatch = headerLine.match(/共\s*(\d+)\s*篇/);
    const reportDate = dateMatch ? dateMatch[1] : dateKey;
    const reportCount = countMatch ? countMatch[1] : '0';

    const contentText = rawText.substring(rawText.indexOf('\n')).trim();
    const rawBlocks = contentText.split(/(?=\n\d+\.\s)/).map(b => b.trim()).filter(b => b);

    let cardsHtml = '';
    rawBlocks.forEach(block => {
        const titleMatch = block.match(/\d+\.\s(.*?)(?=\n|$)/);
        const titleRaw = titleMatch ? titleMatch[1].trim() : '未知标题';
        const isFeatured = titleRaw.includes('⭐ 重点推荐');
        const cleanTitle = titleRaw.replace('⭐ 重点推荐', '').trim();

        const mpMatch = block.match(/公众号：(.*?)(?=\s|　|分类：|$)/);
        const categoryMatch = block.match(/分类：(.*?)(?=\n|$)/);
        const summaryMatch = block.match(/摘要：(.*?)(?=\n|$)/);
        const timeMatch = block.match(/发布时间：(.*?)(?=\n|$)/);
        const linkMatch = block.match(/原文链接：(.*?)(?=\n|$)/);

        const mp = mpMatch ? mpMatch[1].trim() : '';
        const category = categoryMatch ? categoryMatch[1].trim() : '';
        const summary = summaryMatch ? summaryMatch[1].trim() : '';
        const link = linkMatch ? linkMatch[1].trim() : '#';
        
        let timeStr = '';
        if (timeMatch) {
            const t = timeMatch[1].trim();
            const parts = t.split(' ');
            if (parts.length === 2 && parts[0].includes('/')) {
                const dateParts = parts[0].split('/');
                timeStr = `${dateParts[1]}-${dateParts[2]} ${parts[1]}`;
            } else {
                timeStr = t;
            }
        }

        let tagClass = 'hangye';
        if (category === '出海') tagClass = 'chuhai';
        else if (category === 'AI技术') tagClass = 'ai';
        else if (category === '小游戏') tagClass = 'xiaoyouxi';

        // 将复杂的条件判断抽离，避免模板嵌套报错
        let summaryHtml = '';
        if (summary && summary !== '暂无摘要') {
            summaryHtml = '<div class="summary">' + summary + '</div>';
        }
        
        let featuredHtml = isFeatured ? '<span class="tag featured-tag">⭐ 重点</span>' : '';
        let categoryHtml = category ? '<span class="tag ' + tagClass + '">' + category + '</span>' : '';
        let mpHtml = mp ? '<span class="source">' + mp + '</span>' : '';
        let cardClass = isFeatured ? 'card featured' : 'card';

        cardsHtml += `
            <div class="${cardClass}">
                <h2 class="title"><a href="${link}" target="_blank">${cleanTitle}</a></h2>
                ${summaryHtml}
                <div class="meta">
                    ${featuredHtml}
                    ${categoryHtml}
                    ${mpHtml}
                    <span class="time">${timeStr}</span>
                </div>
            </div>\n`;
    });

    const htmlFileName = `${dateKey}.html`;
    
    // 采用逐行赋值替换，杜绝链式调用导致的括号丢失风险
    let pageHtml = articleTemplate;
    pageHtml = pageHtml.replace(/\{\{DATE\}\}/g, reportDate);
    pageHtml = pageHtml.replace(/\{\{COUNT\}\}/g, reportCount);
    pageHtml = pageHtml.replace(//, function() { return cardsHtml; });
    
    fs.writeFileSync(htmlFileName, pageHtml);
    
    console.log('[成功] 生成文件 ' + htmlFileName + '，写入文章 ' + rawBlocks.length + ' 篇。');

    historyListHtml += `
        <a href="${htmlFileName}" class="history-item">
            <div class="history-date">${dateKey}</div>
            <div class="history-info">
                <span class="history-title">${reportDate}日报</span>
                <span class="history-count">共 ${reportCount} 篇</span>
            </div>
            <div class="history-arrow">→</div>
        </a>\n`;
});

// 主页替换逻辑
let indexTpl = fs.readFileSync('index_template.html', 'utf-8');
indexTpl = indexTpl.replace(//, function() { return historyListHtml; });
fs.writeFileSync('index.html', indexTpl);

console.log('所有静态页面生成完毕！');