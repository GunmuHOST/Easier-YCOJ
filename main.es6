// ==UserScript==
// @name		Easier YCOJ
// @version		0.2.0
// @description 让 YCOJ 用起来更加顺手
// @author		zhizhi_c
// @match		*://10.1.143.118/*
// @namespace	10.1.143.118
// @require     https://cdn.jsdelivr.net/npm/turndown@7/dist/turndown.min.js
// ==/UserScript==

'use strict';

const turndownServer = new TurndownService();

function InitTurndown() {
	// 规则1：行内公式（用 $...$ 包裹）
	turndownServer.addRule('inline-math', {
		filter: node => { return node.matches('span.mjpage') && /^MathJax-SVG-\d+-Title$/.test(node.querySelector('title')?.id ?? ''); },
		replacement: (content, node) => { return '$' + node.querySelector('title').textContent.trim() + '$'; }
	});
	// 规则2：块级公式（用 $$...$$ 包裹，独立成行）
	turndownServer.addRule('block-math', {
		filter: node => { return node.matches('span.mjpage__block') && /^MathJax-SVG-\d+-Title$/.test(node.querySelector('title')?.id ?? ''); },
		replacement: (content, node) => { return '\n\n$$\n' + node.textContent.trim() + '\n$$\n\n'; }// 块级公式前后加换行，且用 $$ 包裹
	});
	turndownServer.addRule('block-code', {
		filter: node => { return node.nodeName === 'PRE' && node.querySelector('code'); }, // 匹配 pre > code
		replacement: function (content, node) {
			const code = node.querySelector('code'); // 获取内部的 code 元素
			if (!code) return ''; // 使用 textContent 获取纯文本，并去除首尾多余换行/空格
			let codeText = code.textContent;
			// 去除每行开头多余的缩进（如果整个块缩进过多，可以整体 trim）
			// 方法：按行分割，计算最小缩进，然后统一去除
			const lines = codeText.split('\n');
			// 去除空行或仅空白行
			const nonEmptyLines = lines.filter(line => line.trim() !== '');
			if (nonEmptyLines.length === 0) return '```\n\n```';
			// 计算最小缩进（空格数）
			const minIndent = Math.min(...nonEmptyLines.map(line => line.match(/^ */)[0].length));
			// 去除每行的缩进
			const dedentedLines = lines.map(line => {
				if (line.trim() === '') return '';
				return line.slice(minIndent);
			});
			const cleanedCode = dedentedLines.join('\n').trim();
			// 返回围栏代码块
			return '\n```\n' + cleanedCode + '\n```\n';
		}
	});
}

/*
async function initHTML2MarkDown() {
	OJBetter.common.turndownService = new TurndownService({ bulletListMarker: '-' });

	// 保留原始
	OJBetter.common.turndownService.keep(['del']);

	OJBetter.common.turndownService.addRule('removeByClass', {
		filter: function (node) {
			return node.classList.contains('html2md-panel') ||
				node.classList.contains('mdViewContent') ||
				node.classList.contains('translateDiv') ||
				node.classList.contains('OJBetter_MiniTranslateButton') ||
				node.classList.contains('OJBetter_taskStatementTranslationAnchor') ||
				node.classList.contains('div-btn-copy') ||
				node.classList.contains('btn-copy') ||
				node.classList.contains('ojb-overlay') ||
				node.classList.contains('monaco-editor') ||
				node.classList.contains('text-hidden') ||
				node.nodeName === 'SCRIPT' ||
				node.nodeName === 'STYLE';
		},
		replacement: function () {
			return '';
		}
	});

	// inline math
	OJBetter.common.turndownService.addRule('inline-math', {
		filter: function (node, options) {
			return node.tagName.toLowerCase() == "span" && node.className == "katex";
		},
		replacement: function (content, node) {
			var latex = $(node).find('annotation').text();
			// 替换防止 < >
			latex = latex.replace(/</g, "&lt;").replace(/>/g, "&gt;");
			return "$" + latex + "$";
		}
	});

	// block math
	OJBetter.common.turndownService.addRule('block-math', {
		filter: function (node, options) {
			return node.tagName.toLowerCase() == "span" && node.className == "katex-display";
		},
		replacement: function (content, node) {
			var latex = $(node).find('annotation').text();
			latex = latex.replace(/</g, "&lt;").replace(/>/g, "&gt;");
			return "\n$$\n" + latex + "\n$$\n";
		}
	});

	// pre
	OJBetter.common.turndownService.addRule('pre', {
		filter: function (node, options) {
			return node.tagName.toLowerCase() == "pre";
		},
		replacement: function (content, node) {
			const toFencedCode = code => "```\n" + String(code).replace(/\n?$/, "\n") + "```\n";
			// AtCoder 会同时保留高亮代码块和隐藏的原始复制块，只转换后者以避免重复且保留换行。
			if (node.classList.contains('prettyprint')) {
				const sourceCode = $(node).nextAll('pre').first().filter('.source-code-for-copy');
				if (sourceCode.length > 0) return "";
				const code = OJB_getCodeFromPre(node) || node.textContent;
				return toFencedCode(code);
			}
			if (node.classList.contains('source-code-for-copy')) {
				return toFencedCode(node.textContent);
			}
			return toFencedCode(content);
		}
	});

	// bordertable
	OJBetter.common.turndownService.addRule('bordertable', {
		filter: 'table',
		replacement: function (content, node) {
			if (node.classList.contains('table')) {
				var output = [],
					thead = '',
					trs = node.querySelectorAll('tr');
				if (trs.length > 0) {
					var ths = trs[0].querySelectorAll('th, td');
					if (ths.length > 0) {
						thead = '| ' + Array.from(ths).map(th => OJBetter.common.turndownService.turndown(th.innerHTML.trim())).join(' | ') + ' |\n'
						thead += '| ' + Array.from(ths).map(() => ' --- ').join('|') + ' |\n';
					}
				}
				var rows = node.querySelectorAll('tr');
				Array.from(rows).forEach(function (row, i) {
					if (i > 0) {
						var cells = row.querySelectorAll('td,th');
						var trow = '| ' + Array.from(cells).map(cell => OJBetter.common.turndownService.turndown(cell.innerHTML.trim())).join(' | ') + ' |';
						output.push(trow);
					}
				});
				return thead + output.join('\n');
			} else {
				return content;
			}
		}
	});
};
*/

function GetMarkdown() {
	headers.forEach(function (header) {
		// ---- 创建按钮（毛玻璃 + 标准 Markdown 图标） ----
		let button = document.createElement("button");
		button.type = "button";
		button.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 6px 14px;
            cursor: pointer;
            font-size: 13px;
            white-space: nowrap;
            flex-shrink: 0;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 10px;
            box-shadow: 0 6px 24px #d79df4;
            transition: all 0.25s ease;
            color: #222;
            font-weight: 500;
            position: relative;
            overflow: hidden;
            vertical-align: middle;`;
		button.addEventListener("click", function (e) {
			e.stopPropagation();
			this.classList.toggle("pressed");
			const layer = this.querySelector(".custom-glass-layer");
			if (layer) layer.style.opacity = this.classList.contains("pressed") ? "1" : "0";
			output.value = md;
			output.style.display = output.style.display === "none" ? "block" : "none";
		});

		button.insertAdjacentHTML('beforeend', `<svg viewBox="0 0 640 512" width="40" height="32"><defs><radialGradient id="metalArt" cx="30%" cy="30%" r="70%" fx="30%" fy="30%"><stop offset="0%" stop-color="#B8B8B8"></stop><stop offset="40%" stop-color="#909090"></stop><stop offset="75%" stop-color="#707070"></stop><stop offset="100%" stop-color="#585858"></stop></radialGradient></defs><path d="M338.5 360.6l-61.5 0 0-120-61.5 76.9-61.5-76.9 0 120-61.7 0 0-209.2 61.5 0 61.5 76.9 61.5-76.9 61.5 0 0 209.2 .2 0zm135.3 3.1l-92.3-107.7 61.5 0 0-104.6 61.5 0 0 104.6 61.5 0-92.2 107.7z" fill="url(#metalArt)" stroke="#ffffff" stroke-width="0.5" stroke-linecap="round" stroke-linejoin="round"></path><svg>`);
		header.appendChild(button);

		// ---- 按钮点击事件（转换 + 视觉切换） ----


		// ---- 动态样式 ----
		const styleId = "custom-md-glass-style";
		if (!document.getElementById(styleId)) {
			const style = document.createElement("style");
			style.id = styleId;
			style.textContent = `
                button.pressed {
                    box-shadow: inset 0 4px 10px rgba(0,0,0,0.15);
                    background: rgba(255,255,255,0.35);
                    transform: scale(0.96);
                }
                button.pressed .custom-md-icon {
                    transform: translateY(2px);
                }
                button:not(.pressed):hover {
                    box-shadow: 0 8px 32px rgba(0,0,0,0.15);
                    transform: translateY(-1px);
                }
            `;
			document.head.appendChild(style);
		}
	});
}

//----main----

InitTurndown();

if (window.location.pathname.match("problem/[0-9]")) {
	const headers = document.querySelectorAll("h4.ui.top.attached.block.header");
	let statement = "";
	for (let header of headers) {
		let description = header.nextElementSibling;
		if (!description) continue;
		let md = turndownServer.turndown(description.cloneNode(true));
		statement += md;
		header.style = `display: flex; justify-content: space-between; align-items: center`;
	}
	$('.ui.orange.button').after($('<a class="ui olive button" href=https://cpret.online/?lang=zh&q=' + encodeURIComponent(statement) + ' target="_blank"> 查询原题</a>'));
}