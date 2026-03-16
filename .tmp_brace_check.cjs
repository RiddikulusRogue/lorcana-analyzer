const fs = require('fs');
const s = fs.readFileSync('src/App.jsx','utf8');
let stack=[];
let state='code';
for (let i=0;i<s.length;i++) {
  const c=s[i], n=s[i+1];
  if (state==='code') {
    if (c==='"') { state='dquote'; continue; }
    if (c==="'") { state='squote'; continue; }
    if (c==='`') { state='template'; continue; }
    if (c==='/' && n==='/') { state='line'; i++; continue; }
    if (c==='/' && n==='*') { state='block'; i++; continue; }
    if (c==='{'||c==='('||c==='[') stack.push({c,i});
    else if (c==='}'||c===')'||c===']') {
      const map={'}':'{',')':'(',']':'['};
      const last=stack.pop();
      if (!last || last.c!==map[c]) { console.log('Mismatch at',i,'got',c,'stackTop',last); process.exit(0);}    }
  } else if (state==='line') {
    if (c==='\n') state='code';
  } else if (state==='block') {
    if (c==='*' && n=== '/') { state='code'; i++; }
  } else if (state==='squote') {
    if (c==='\\') { i++; continue; }
    if (c==="'") state='code';
  } else if (state==='dquote') {
    if (c==='\\') { i++; continue; }
    if (c==='"') state='code';
  } else if (state==='template') {
    if (c==='\\') { i++; continue; }
    if (c==='`') state='code';
  }
}
console.log('State:',state,'Stack size:',stack.length);
if (stack.length) console.log('Last open:', stack[stack.length-1]);
