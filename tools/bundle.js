// Builds a single self-contained HTML file (dist/paper-planes.html) from index.html + css/ + js/.
// That single file is what gets published as the Claude artifact.
// Usage: node tools/bundle.js
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'css', 'style.css'), 'utf8');
const jsFiles = fs.readdirSync(path.join(root, 'js')).filter(f => f.endsWith('.js')).sort();
const js = jsFiles.map(f => fs.readFileSync(path.join(root, 'js', f), 'utf8')).join('\n');
const title = (html.match(/<title>(.*?)<\/title>/) || [])[1] || 'Paper Planes';
const fonts = (html.match(/<link rel="preconnect"[\s\S]*?<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">/) || [''])[0];
const body = html.split('<body>')[1].split('<script src="https://cdnjs')[0].trim();
const three = (html.match(/<script src="https:\/\/cdnjs\.cloudflare\.com[^"]*three[^"]*"><\/script>/) || [])[0];
const out = `<title>${title}</title>\n${fonts}\n<style>\n${css}</style>\n\n${body}\n\n${three}\n<script>\n(() => {\n${js}\n})();\n</script>\n`;
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'paper-planes.html'), out);
console.log('wrote dist/paper-planes.html (' + Math.round(out.length / 1024) + ' KB, ' + jsFiles.length + ' scripts)');
