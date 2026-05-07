const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');

if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
    console.log("Create empty data dir.");
    process.exit(0);
}

const files = fs.readdirSync(dataDir).filter(function(f) {
    return f.indexOf('.txt') !== -1;
}).sort().reverse();

if (files.length === 0) {
    console.log("No data files.");
    process.exit(0);
}

let historyListHtml = "";
const articleTemplate = fs.readFileSync('template.html', 'utf-8');

files.forEach(function(file) {
    const rawText = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const rawLines = rawText.split('\n');
    const lines = [];
    for (let i = 0; i < rawLines.length; i++) {
        if (rawLines[i].trim()) lines.push(rawLines[i].trim());
    }

    if (lines.length === 0) return;

    const dateKey = file.replace('.txt', '');
    const headerLine = lines[0];

    let reportDate = dateKey;
    const dateMatch = headerLine.match(/(.*?)游戏圈日报/);
    if (dateMatch) {
        reportDate = dateMatch[1];
    }

    let reportCount = "0";
    const countMatch = headerLine.match(/共\s*(\d+)\s*篇/);
    if (countMatch) {
        reportCount = countMatch[1];
    }

    const contentText = rawText.substring(rawText.indexOf('\n')).trim();
    const rawBlocksRaw = contentText.split(/(?=\n\d+\.\s)/);
    const rawBlocks = [];
    for (let i = 0; i < rawBlocksRaw.length; i++) {
        if (rawBlocksRaw[i].trim()) rawBlocks.push(rawBlocksRaw[i].trim());
    }

    let cardsHtml = "";

    rawBlocks.forEach(function(block) {
        const titleMatch = block.match(/\d+\.\s(.*?)(?=\n|$)/);
        const titleRaw = titleMatch ? titleMatch[1].trim() : "未知标题";
        const isFeatured = titleRaw.indexOf("⭐ 重点推荐") !== -1;
        const cleanTitle = titleRaw.replace("⭐ 重点推荐", "").trim();

        const mpMatch = block.match(/公众号：(.*?)(?=\s|　|分类：|$)/);
        const categoryMatch = block.match(/分类：(.*?)(?=\n|$)/);
        const summaryMatch = block.match(/摘要：(.*?)(?=\n|$)/);
        const timeMatch = block.match(/发布时间：(.*?)(?=\n|$)/);
        const linkMatch = block.match(/原文链接：(.*?)(?=\n|$)/);

        const mp = mpMatch ? mpMatch[1].trim() : "";
        const category = categoryMatch ? categoryMatch[1].trim() : "";
        const summary = summaryMatch ? summaryMatch[1].trim() : "";
        const link = linkMatch ? linkMatch[1].trim() : "#";

        let timeStr = "";
        if (timeMatch) {
            const t = timeMatch[1].trim();
            const parts = t.split(" ");
            if (parts.length === 2 && parts[0].indexOf("/") !== -1) {
                const dateParts = parts[0].split("/");
                timeStr = dateParts[1] + "-" + dateParts[2] + " " + parts[1];
            } else {
                timeStr = t;
            }
        }

        let tagClass = "hangye";
        if (category === "出海") tagClass = "chuhai";
        else if (category === "AI技术") tagClass = "ai";
        else if (category === "小游戏") tagClass = "xiaoyouxi";

        let summaryHtml = "";
        if (summary && summary !== "暂无摘要") {
            summaryHtml = '<div class="summary">' + summary + '</div>';
        }

        let featuredHtml = isFeatured ? '<span class="tag featured-tag">⭐ 重点</span>' : '';
        let categoryHtml = category ? '<span class="tag ' + tagClass + '">' + category + '</span>' : '';
        let mpHtml = mp ? '<span class="source">' + mp + '</span>' : '';
        let cardClass = isFeatured ? 'card featured' : 'card';

        cardsHtml += '<div class="' + cardClass + '">\n';
        cardsHtml += '    <h2 class="title"><a href="' + link + '" target="_blank">' + cleanTitle + '</a></h2>\n';
        cardsHtml += '    ' + summaryHtml + '\n';
        cardsHtml += '    <div class="meta">\n';
        cardsHtml += '        ' + featuredHtml + '\n';
        cardsHtml += '        ' + categoryHtml + '\n';
        cardsHtml += '        ' + mpHtml + '\n';
        cardsHtml += '        <span class="time">' + timeStr + '</span>\n';
        cardsHtml += '    </div>\n';
        cardsHtml += '</div>\n';
    });

    const htmlFileName = dateKey + ".html";

    let pageHtml = articleTemplate;
    pageHtml = pageHtml.replace(/\{\{DATE\}\}/g, reportDate);
    pageHtml = pageHtml.replace(/\{\{COUNT\}\}/g, reportCount);
    pageHtml = pageHtml.replace(//, function() { return cardsHtml; });

    fs.writeFileSync(htmlFileName, pageHtml);
    console.log("Success: " + htmlFileName);

    historyListHtml += '<a href="' + htmlFileName + '" class="history-item">\n';
    historyListHtml += '    <div class="history-date">' + dateKey + '</div>\n';
    historyListHtml += '    <div class="history-info">\n';
    historyListHtml += '        <span class="history-title">' + reportDate + '日报</span>\n';
    historyListHtml += '        <span class="history-count">共 ' + reportCount + ' 篇</span>\n';
    historyListHtml += '    </div>\n';
    historyListHtml += '    <div class="history-arrow">→</div>\n';
    historyListHtml += '</a>\n';
});

let indexTpl = fs.readFileSync('index_template.html', 'utf-8');
indexTpl = indexTpl.replace(//, function() { return historyListHtml; });
fs.writeFileSync('index.html', indexTpl);

console.log("All done!");
