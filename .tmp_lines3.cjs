const fs = require('fs');
const code = fs.readFileSync('c:/Users/pocha/OneDrive/Documents/GitHub/lorcana-analyzer/src/App.jsx', 'utf8');
const lines = code.split('\n');
let depth = 0;
let inStr = false;
let strChar = '';
let inComment = false;
let inLineComment = false;

let lastDepth1Line = 0;
let firstStuck2Line = 0;

for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
  const line = lines[lineIdx];
  const lineNum = lineIdx + 1;
  
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
  
  if (lineNum >= 148) { // after App() opens
    if (depth === 1) lastDepth1Line = lineNum;
    if (depth === 2 && firstStuck2Line === 0 && lineNum > lastDepth1Line + 1) {
      // This might be where depth gets stuck at 2
    }
  }
}

// Now do another pass to find when depth goes to 2 and stays there
depth = 0; inStr = false; inComment = false; inLineComment = false;
let minDepthSinceFirst = 999;
let firstPermanent2 = 0;

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
  
  // After line 147, track the last line where depth was 1 before going to 2 permanently
  if (lineNum >= 148 && lineNum <= 2862) {
    if (depth === 1) {
      lastDepth1Line = lineNum;
      console.log(`Line ${lineNum}: depth=1, line="${line.trim().substring(0,60)}"`);
    }
  }
}
console.log('\nLast line at depth=1 before 2862:', lastDepth1Line);
