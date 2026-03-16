const fs = require('fs');
const code = fs.readFileSync('c:/Users/pocha/OneDrive/Documents/GitHub/lorcana-analyzer/src/App.jsx', 'utf8');
let depth = 0;
let inStr = false;
let strChar = '';
let inComment = false;
let inLineComment = false;
const closes = [];
for (let i = 0; i < code.length; i++) {
  const c = code[i];
  const prev = i > 0 ? code[i-1] : '';
  if (inLineComment) { if (c === '\n') inLineComment = false; continue; }
  if (inComment) { if (c === '/' && prev === '*') inComment = false; continue; }
  if (inStr) { if (c === strChar && prev !== '\\') inStr = false; continue; }
  if (c === '/' && code[i+1] === '/') { inLineComment = true; continue; }
  if (c === '/' && code[i+1] === '*') { inComment = true; continue; }
  if (c === '"' || c === "'" || c === '`') { inStr = true; strChar = c; continue; }
  if (c === '{') depth++;
  if (c === '}') {
    depth--;
    const line = code.substring(0, i).split('\n').length;
    if (depth <= 1) closes.push('depth=' + depth + ' at line=' + line);
  }
}
console.log('Final depth:', depth);
console.log('Last closes at depth<=1:', closes.slice(-10));
