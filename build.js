const fs = require('fs');

// 1. 读取原始数据
const rawText = fs.readFileSync('data.txt', 'utf-8');
const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);

if (lines.length === 0) {
    console.log('数据文件为空');
    process.exit(0);
}

// 2. 提取头部信息 (例如："5月6日游戏圈日报，共 9 篇昨日头条")
const headerLine = lines[0];
const dateMatch = headerLine.match(/(.*?)游戏圈日报/);
const countMatch = headerLine.match(/共\s*(\d+)\s*篇/);
const reportDate = dateMatch ? dateMatch[1] : '今日';
const reportCount = countMatch ? countMatch[1] : '若干';

// 3. 按文章序号拆分数据块
const contentText = rawText.substring(rawText.indexOf('\n')).trim();
const rawBlocks = contentText.split(/(?=\n\d+\.\s)/).map(b => b.trim()).filter(b => b);

let cardsHtml = '';

// 4. 解析每个内容块并生成 HTML
rawBlocks.forEach(block => {
    // 解析标题和重点标记
    const titleMatch = block.match(/\d+\.\s(.*?)(?=\n|$)/);
    const titleRaw = titleMatch ? titleMatch[1].trim() : '未知标题';
    const isFeatured = titleRaw.includes('⭐ 重点推荐');
    const cleanTitle = titleRaw.replace('⭐ 重点推荐', '').trim();

    // 解析元数据
    const mpMatch = block.match(/公众号：(.*?)(?=\s|　|分类：|$)/);
    const categoryMatch = block.match(/分类：(.*?)(?=\n|$)/);
    const summaryMatch = block.match(/摘要：(.*?)(?=\n|$)/);
    const timeMatch = block.match(/发布时间：(.*?)(?=\n|$)/);
    const linkMatch = block.match(/原文链接：(.*?)(?=\n|$)/);

    const mp = mpMatch ? mpMatch[1].trim() : '';
    const category = categoryMatch ? categoryMatch[1].trim() : '';
    const summary = summaryMatch ? summaryMatch[1].trim() : '';
    const link = linkMatch ? linkMatch[1].trim() : '#';
    
    // 格式化时间 (例如 2026/05/06 22:14 -> 05-06 22:14)
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

    // 匹配颜色标签
    let tagClass = 'hangye';
    if (category === '出海') tagClass = 'chuhai';
    else if (category === 'AI技术') tagClass = 'ai';
    else if (category === '小游戏') tagClass = 'xiaoyouxi';

    // 拼接单张卡片
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

// 5. 替换模板变量并输出最终的 index.html
let template = fs.readFileSync('template.html', 'utf-8');
template = template.replace(/\{\{DATE\}\}/g, reportDate);
template = template.replace(/\{\{COUNT\}\}/g, reportCount);
template = template.replace('<!-- CARDS_CONTENT_HERE -->', cardsHtml);

fs.writeFileSync('index.html', template);
console.log('HTML 页面生成完毕！');