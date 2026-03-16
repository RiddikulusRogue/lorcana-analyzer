const fs = require('fs');
const code = fs.readFileSync('c:/Users/pocha/OneDrive/Documents/GitHub/lorcana-analyzer/src/App.jsx', 'utf8');
const lines = code.split('\n');
let depth = 0;
let inStr = false;
let strChar = '';
let inComment = false;
let inLineComment = false;

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  const lineNum = lineIdx + 1;
  const depthBefore = depth;
  
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const prev = i > 0 ? line[i-1] : '';
    if (inLineComment) break;
    if (inComment) { if (c === '/' && prev === '*') inComment = false; continue; }
    if (inStr) { if (c === strChar && prev !== '\\') inStr = false; continue; }
    if (c === '/' && line[i+1] === '/') { inLineComment = true; break; }
    if (c === '/' && line[i+1] === '*') { inComment = true; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; strChar = c; continue; }
    if (c === '{') depth++;
    if (c === '}') depth--;
  }
  inLineComment = false;
  
  // Show lines where depth transitions between 1 and 2 (or stays at 2 with const)
  if (lineNum >= 556 && lineNum <= 600) {
    console.log(`Line ${lineNum} (d:${depthBefore}→${depth}): ${line.substring(0,80)}`);
  }
}
