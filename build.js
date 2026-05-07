const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

// 1. 检查并初始化目录
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log('初始化 data 目录完成');
    process.exit(0);
}

// 2. 读取所有 txt 文件
const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.txt')).sort().reverse();
if (files.length === 0) {
    console.log('未找到任何数据文件');
    process.exit(0);
}

let historyListHtml = '';
const articleTemplate = fs.readFileSync('template.html', 'utf-8');

// 3. 遍历生成每一天的日报
files.forEach(file => {
    const rawText = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
    if (lines.length === 0) return;

    const dateKey = file.replace('.txt', ''); 
    const headerLine = lines[0];
    
    // 解析标题和数量
    const dateMatch = headerLine.match(/(.*?)游戏圈日报/);
    const countMatch = headerLine.match(/共\s*(\d+)\s*篇/);
    const reportDate = dateMatch ? dateMatch[1] : dateKey;
    const reportCount = countMatch ? countMatch[1] : '0';

    // 解析文章区块
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

        // 拼接卡片 HTML
        cardsHtml += `
            <div class="card ${isFeatured ? 'featured' : ''}">
                <h2 class="title"><a href="${link}" target="_blank">${cleanTitle}</a></h2>
                ${summary && summary !== '暂无摘要' ? `<div class="summary">${summary}</div>` : ''}
                <div class="meta">
                    ${isFeatured ? '<span class="tag featured-tag">⭐ 重点</span>' : ''}
                    ${category ? `<span class="tag ${tagClass}">${category}</span>` : ''}
                    ${mp ? `<span class="source">${mp}</span>` : ''}
                    <span class="time">${timeStr}</span>
                </div>
            </div>\n`;
    });

    // 4. 替换模板变量 (兼容所有空格格式)
    const htmlFileName = `${dateKey}.html`;
    let pageHtml = articleTemplate
        .replace(/\{\{DATE\}\}/g, reportDate)
        .replace(/\{\{COUNT\}\}/g, reportCount);

    // 采用原生 split+join 替换文章内容，100% 不会因为特殊字符报错
    if (pageHtml.includes('')) {
        pageHtml = pageHtml.split('').join(cardsHtml);
    } else if (pageHtml.includes('')) {
        pageHtml = pageHtml.split('').join(cardsHtml);
    } else {
        pageHtml = pageHtml.replace(//, () => cardsHtml);
    }
    
    fs.writeFileSync(htmlFileName, pageHtml);
    console.log(`✅ 成功生成页面: ${htmlFileName}`);

    // 收集主页历史记录
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

// 5. 生成主页 index.html
let indexTpl = fs.readFileSync('index_template.html', 'utf-8');

if (indexTpl.includes('')) {
    indexTpl = indexTpl.split('').join(historyListHtml);
} else if (indexTpl.includes('')) {
    indexTpl = indexTpl.split('').join(historyListHtml);
} else {
    indexTpl = indexTpl.replace(//, () => historyListHtml);
}

fs.writeFileSync('index.html', indexTpl);
console.log('🎉 所有页面编译打包完成！');
