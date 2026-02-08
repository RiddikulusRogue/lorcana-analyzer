import CurveComparison from './CurveComparison';

export default function ArchetypeCard({ comparison, curves, colors, recommendations, winRate }) {
  if (!comparison || !comparison.archetype) {
    return <div>No comparison data available</div>;
  }

  const { archetype, missing, different, matching, extra } = comparison;

  return (
    <div style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>{archetype.name}</h3>
        <div style={{ display: 'flex', gap: '1rem', fontSize: '14px', color: '#666' }}>
          <span>Colors: {archetype.colors.join(', ')}</span>
          <span>Meta Share: {archetype.metaShare}%</span>
          <span>Avg Curve: {archetype.avgCurve}</span>
          <span style={{ 
            fontWeight: 'bold', 
            color: winRate >= 55 ? '#28a745' : winRate >= 45 ? '#ffc107' : '#dc3545' 
          }}>
            Est. Win Rate: {winRate}%
          </span>
        </div>
      </div>

      {/* Curve comparison chart */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Mana Curve Comparison</h4>
        <CurveComparison curves={curves} />
      </div>

      {/* Color distribution */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>Color Distribution</h4>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div>
            <strong>Your Colors:</strong> {Object.keys(colors.userColors).join(', ') || 'Unknown'}
          </div>
          <div>
            <strong>Meta Colors:</strong> {colors.metaColors.join(', ')}
          </div>
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
          <h4 style={{ marginTop: 0 }}>Recommendations</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {recommendations.map((rec, idx) => {
              const severityColors = {
                critical: '#dc3545',
                high: '#fd7e14',
                medium: '#ffc107',
                low: '#6c757d'
              };
              
              return (
                <div key={idx} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  fontSize: '14px'
                }}>
                  <span style={{ 
                    fontWeight: 'bold', 
                    color: severityColors[rec.severity],
                    minWidth: '80px'
                  }}>
                    {rec.severity.toUpperCase()}
                  </span>
                  <span>{rec.message}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Card comparison sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Missing cards */}
        <div style={{ padding: '1rem', backgroundColor: '#fff5f5', borderRadius: '4px' }}>
          <h4 style={{ marginTop: 0, color: '#dc3545' }}>
            ❌ Missing Cards ({missing.length})
          </h4>
          {missing.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#666' }}>You have all key meta cards!</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              {missing.map((card, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  {card.copies}x <strong>{card.name}</strong>
                  <span style={{ 
                    marginLeft: '8px', 
                    fontSize: '12px',
                    padding: '2px 6px',
                    backgroundColor: card.priority === 'essential' ? '#dc3545' : '#fd7e14',
                    color: 'white',
                    borderRadius: '3px'
                  }}>
                    {card.priority}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Different quantities */}
        <div style={{ padding: '1rem', backgroundColor: '#fff8e1', borderRadius: '4px' }}>
          <h4 style={{ marginTop: 0, color: '#ff9800' }}>
            ⚠️ Different Quantities ({different.length})
          </h4>
          {different.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#666' }}>All counts match!</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              {different.map((card, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  <strong>{card.name}</strong>: You have {card.userCopies}, meta runs {card.metaCopies}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Matching cards */}
        <div style={{ padding: '1rem', backgroundColor: '#f0f8f0', borderRadius: '4px' }}>
          <h4 style={{ marginTop: 0, color: '#28a745' }}>
            ✅ Matching Cards ({matching.length})
          </h4>
          {matching.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#666' }}>No exact matches</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              {matching.slice(0, 10).map((card, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  {card.copies}x {card.name}
                </li>
              ))}
              {matching.length > 10 && (
                <li style={{ color: '#666', fontStyle: 'italic' }}>
                  ... and {matching.length - 10} more
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Extra cards */}
        <div style={{ padding: '1rem', backgroundColor: '#e8f4fd', borderRadius: '4px' }}>
          <h4 style={{ marginTop: 0, color: '#007bff' }}>
            ➕ Your Tech Cards ({extra.length})
          </h4>
          {extra.length === 0 ? (
            <p style={{ fontSize: '14px', color: '#666' }}>Playing pure meta!</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
              {extra.slice(0, 10).map((card, idx) => (
                <li key={idx} style={{ marginBottom: '4px' }}>
                  {card.copies}x {card.name}
                </li>
              ))}
              {extra.length > 10 && (
                <li style={{ color: '#666', fontStyle: 'italic' }}>
                  ... and {extra.length - 10} more
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
