import { useState, useEffect } from 'react';
import ArchetypeCard from './ArchetypeCard';
import {
  compareToArchetype,
  compareCurves,
  compareColors,
  generateRecommendations,
  estimateWinRate,
  getAllArchetypes,
  exportComparisonAsText
} from '../logic/comparisonEngine';

export default function ComparisonMode({ userDeck, onClose }) {
  const [archetypes, setArchetypes] = useState([]);
  const [selectedArchetype, setSelectedArchetype] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);

  useEffect(() => {
    const allArchetypes = getAllArchetypes();
    setArchetypes(allArchetypes);
    
    // Auto-select the first archetype
    if (allArchetypes.length > 0) {
      setSelectedArchetype(allArchetypes[0].id);
    }
  }, []);

  useEffect(() => {
    if (selectedArchetype && userDeck) {
      const comparison = compareToArchetype(userDeck, selectedArchetype);
      const curves = compareCurves(userDeck, selectedArchetype);
      const colors = compareColors(userDeck, selectedArchetype);
      const recommendations = generateRecommendations(comparison, curves);
      const winRate = estimateWinRate(userDeck, selectedArchetype);

      setComparisonData({
        comparison,
        curves,
        colors,
        recommendations,
        winRate
      });
    }
  }, [selectedArchetype, userDeck]);

  const handleExport = () => {
    if (!comparisonData) return;
    
    const text = exportComparisonAsText(
      comparisonData.comparison,
      comparisonData.curves,
      comparisonData.recommendations
    );
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-${selectedArchetype}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      overflowY: 'auto',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        maxWidth: '1200px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        padding: '2rem',
        position: 'relative'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Compare to Meta Archetypes</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={handleExport} disabled={!comparisonData}>
              Export Comparison
            </button>
            <button onClick={onClose}>Close</button>
          </div>
        </div>

        {/* Archetype selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
            Select Meta Archetype:
          </label>
          <select
            value={selectedArchetype || ''}
            onChange={(e) => setSelectedArchetype(e.target.value)}
            style={{ padding: '8px', fontSize: '14px', width: '100%', maxWidth: '400px' }}
          >
            {archetypes.map(arch => (
              <option key={arch.id} value={arch.id}>
                {arch.name} ({arch.metaShare}% meta share)
              </option>
            ))}
          </select>
        </div>

        {/* Comparison display */}
        {comparisonData && (
          <ArchetypeCard
            comparison={comparisonData.comparison}
            curves={comparisonData.curves}
            colors={comparisonData.colors}
            recommendations={comparisonData.recommendations}
            winRate={comparisonData.winRate}
          />
        )}

        {/* Quick overview of all archetypes */}
        <div style={{ marginTop: '2rem' }}>
          <h3>Quick Matchup Overview</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {archetypes.map(arch => {
              const winRate = estimateWinRate(userDeck, arch.id);
              const bgColor = winRate >= 55 ? '#d4edda' : winRate >= 45 ? '#fff3cd' : '#f8d7da';
              const textColor = winRate >= 55 ? '#155724' : winRate >= 45 ? '#856404' : '#721c24';
              
              return (
                <div
                  key={arch.id}
                  onClick={() => setSelectedArchetype(arch.id)}
                  style={{
                    padding: '1rem',
                    border: selectedArchetype === arch.id ? '2px solid #007bff' : '1px solid #ddd',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    backgroundColor: bgColor,
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '4px' }}>
                    {arch.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                    {arch.metaShare}% of meta
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: textColor }}>
                    {winRate}% win rate
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
