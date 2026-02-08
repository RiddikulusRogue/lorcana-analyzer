import { useState, useEffect } from "react";
import { analyzeDeck } from "./logic/deckAnalyzer";
import { generateCoaching } from "./logic/coachingGenerator";
import Header from "./components/Header";
import DeckInput from "./components/DeckInput";
import ControlPanel from "./components/ControlPanel";
import AnalysisResults from "./components/AnalysisResults";
import CoachingReport from "./components/CoachingReport";
import SavedDecks from "./components/SavedDecks";
import Toast from "./components/Toast";
import Loading from "./components/Loading";

export default function App() {
  const [deckText, setDeckText] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [saved, setSaved] = useState([]);
  const [serverEnabled, setServerEnabled] = useState(false);
  const [aiCoaching, setAiCoaching] = useState('');
  const [playStyle, setPlayStyle] = useState('balanced');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("lorcana_saved_decks") || "[]");
      setSaved(s);
    } catch (e) {
      setSaved([]);
    }
    if (serverEnabled) {
      fetch((import.meta.env.VITE_API_URL || 'http://localhost:4000') + '/api/decks')
        .then(r=>r.json())
        .then(d=>setSaved(d))
        .catch(()=>{});
    }
  }, [serverEnabled]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };

  const handleAnalyze = () => {
    if (!deckText.trim()) {
      showToast('Please enter a deck list first', 'warning');
      return;
    }
    
    setIsAnalyzing(true);
    setTimeout(() => {
      const result = analyzeDeck(deckText);
      setAnalysis(result);
      setIsAnalyzing(false);
      
      if (result.error) {
        showToast('Analysis completed with errors', 'error');
      } else {
        showToast('Deck analyzed successfully!', 'success');
      }
    }, 500);
  };

  const handleSave = () => {
    const name = prompt("Save name:", "My Deck") || "My Deck";
    const item = { 
      id: Date.now(), 
      name, 
      deckText, 
      analysis, 
      createdAt: new Date().toISOString() 
    };
    
    if (serverEnabled) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      fetch(`${apiUrl}/api/decks`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          name: item.name, 
          deckText: item.deckText, 
          analysis: item.analysis 
        }) 
      })
        .then(r=>r.json())
        .then(savedItem=>{ 
          setSaved(prev=>[savedItem, ...prev]); 
          showToast('Deck saved to server!', 'success');
        })
        .catch(()=>showToast('Server save failed', 'error'));
      return;
    }
    
    const next = [item, ...saved];
    localStorage.setItem("lorcana_saved_decks", JSON.stringify(next));
    setSaved(next);
    showToast('Deck saved locally!', 'success');
  };

  const handleLoad = (item) => {
    setDeckText(item.deckText || "");
    setAnalysis(item.analysis || null);
    showToast(`Loaded deck: ${item.name}`, 'success');
  };

  const handleDelete = (id) => {
    if (serverEnabled) {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      fetch(`${apiUrl}/api/decks`)
        .then(r=>r.json())
        .then(d=>{ 
          const next = d.filter(x=>x.id!==id); 
          setSaved(next);
          showToast('Deck deleted from server', 'success');
        })
        .catch(()=>showToast('Server delete failed', 'error'));
      return;
    }
    
    const next = saved.filter(s => s.id !== id);
    localStorage.setItem("lorcana_saved_decks", JSON.stringify(next));
    setSaved(next);
    showToast('Deck deleted', 'success');
  };

  const handleDownload = () => {
    const data = { deckText, analysis };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lorcana-analysis.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('Analysis downloaded!', 'success');
  };

  const handleGetCoaching = () => {
    if (!analysis) {
      showToast('Please analyze a deck first', 'warning');
      return;
    }
    
    const coaching = generateCoaching(analysis, playStyle);
    setAiCoaching(coaching);
    showToast('AI Coaching generated!', 'success');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <DeckInput value={deckText} onChange={setDeckText} />
          
          <ControlPanel
            onAnalyze={handleAnalyze}
            onSave={handleSave}
            onDownload={handleDownload}
            onGetCoaching={handleGetCoaching}
            analysisExists={!!analysis}
            playStyle={playStyle}
            onPlayStyleChange={setPlayStyle}
            serverEnabled={serverEnabled}
            onServerToggle={setServerEnabled}
            isAnalyzing={isAnalyzing}
          />
          
          {isAnalyzing && <Loading message="Analyzing your deck..." />}
          
          {!isAnalyzing && analysis && <AnalysisResults analysis={analysis} />}
          
          {aiCoaching && <CoachingReport coaching={aiCoaching} />}
          
          <SavedDecks 
            decks={saved} 
            onLoad={handleLoad} 
            onDelete={handleDelete} 
          />
        </div>
      </main>
      
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}
    </div>
  );
}
