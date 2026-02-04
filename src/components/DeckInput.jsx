import React, { useState } from 'react'

export default function DeckInput({ onAnalyze }) {
  const [text, setText] = useState('')

  return (
    <div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        style={{ width: '100%', fontFamily: 'inherit' }}
        placeholder="Paste deck list (e.g. `4x Elsa - Spirit of Winter`)"
      />
      <div style={{ marginTop: 8 }}>
        <button onClick={() => onAnalyze && onAnalyze(text)}>Analyze</button>
        <button onClick={() => setText('')} style={{ marginLeft: 8 }}>Clear</button>
      </div>
    </div>
  )
}
