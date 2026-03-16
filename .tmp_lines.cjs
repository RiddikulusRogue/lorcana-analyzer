const fs = require('fs');
const code = fs.readFileSync('c:/Users/pocha/OneDrive/Documents/GitHub/lorcana-analyzer/src/App.jsx', 'utf8');
const lines = code.split('\n');
let depth = 0;
let inStr = false;
let strChar = '';
let inComment = false;
let inLineComment = false;
let charPos = 0;

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  const lineNum = lineIdx + 1;
  
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    const prev = i > 0 ? line[i-1] : '';
    
    if (inLineComment) break; // rest of line is comment
    if (inComment) {
      if (c === '/' && prev === '*') inComment = false;
      continue;
    }
    if (inStr) {
      if (c === strChar && prev !== '\\') inStr = false;
      continue;
    }
    if (c === '/' && line[i+1] === '/') { inLineComment = true; break; }
    if (c === '/' && line[i+1] === '*') { inComment = true; continue; }
    if (c === '"' || c === "'" || c === '`') { inStr = true; strChar = c; continue; }
    if (c === '{') depth++;
    if (c === '}') depth--;
  }
  inLineComment = false;
  
  if (lineNum >= 3150) {
    console.log(`Line ${lineNum} (depth=${depth}): ${line}`);
  }
}
console.log('\nFinal depth:', depth);
