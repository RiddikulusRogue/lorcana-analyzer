export default function CurveComparison({ curves }) {
  if (!curves || !curves.userCurve) {
    return <div>No curve data available</div>;
  }

  const { userCurve, userAvgCurve, metaAvgCurve, curveDelta } = curves;

  // Get all cost values (0-10+)
  const maxCost = Math.max(
    ...Object.keys(userCurve).map(Number),
    10
  );
  
  const costs = Array.from({ length: maxCost + 1 }, (_, i) => i);

  // Calculate max count for scaling
  const maxCount = Math.max(
    ...costs.map(cost => userCurve[cost] || 0),
    1
  );

  return (
    <div>
      <div style={{ marginBottom: '1rem', fontSize: '14px', color: '#666' }}>
        <strong>Your Avg:</strong> {userAvgCurve} | <strong>Meta Avg:</strong> {metaAvgCurve} | 
        <strong style={{ color: Math.abs(curveDelta) > 0.5 ? '#dc3545' : '#28a745' }}>
          {' '}Delta: {curveDelta > 0 ? '+' : ''}{curveDelta}
        </strong>
      </div>

      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        gap: '8px', 
        height: '150px',
        borderBottom: '2px solid #333',
        paddingBottom: '4px'
      }}>
        {costs.map(cost => {
          const count = userCurve[cost] || 0;
          const heightPercent = maxCount > 0 ? (count / maxCount) * 100 : 0;
          
          return (
            <div
              key={cost}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                minWidth: '30px'
              }}
            >
              <div style={{
                width: '100%',
                height: `${heightPercent}%`,
                backgroundColor: '#007bff',
                borderRadius: '4px 4px 0 0',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '4px',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold',
                minHeight: count > 0 ? '20px' : '0'
              }}>
                {count > 0 ? count : ''}
              </div>
              <div style={{
                marginTop: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                color: '#333'
              }}>
                {cost}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#666', textAlign: 'center' }}>
        Mana Cost →
      </div>

      {/* Recommendations based on curve */}
      {Math.abs(curveDelta) > 0.5 && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.5rem', 
          backgroundColor: '#fff3cd', 
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          {curveDelta > 0.5 ? (
            <>
              <strong>⚠️ Your curve is too high.</strong> Consider adding more 1-2 cost cards to improve early game consistency.
            </>
          ) : (
            <>
              <strong>⚠️ Your curve is lower than meta.</strong> Consider adding some higher-cost finishers for late game power.
            </>
          )}
        </div>
      )}

      {Math.abs(curveDelta) <= 0.3 && (
        <div style={{ 
          marginTop: '1rem', 
          padding: '0.5rem', 
          backgroundColor: '#d4edda', 
          borderRadius: '4px',
          fontSize: '14px'
        }}>
          <strong>✅ Your curve looks good!</strong> It's well-aligned with the meta archetype.
        </div>
      )}
    </div>
  );
}
