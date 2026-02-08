export default function AnalysisResults({ analysis }) {
  if (!analysis) return null;

  if (analysis.error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
        <p className="text-red-800 dark:text-red-200 font-medium">{analysis.error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
        <span className="text-2xl">📊</span>
        Analysis Results
      </h2>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 p-4 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm text-blue-600 dark:text-blue-300 font-medium">Total Cards</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-1">
            {analysis.total}
            <span className="text-base font-normal text-blue-600 dark:text-blue-400 ml-1">/60</span>
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
          <p className="text-sm text-purple-600 dark:text-purple-300 font-medium">Unique Cards</p>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-1">{analysis.uniqueCount}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 p-4 rounded-lg border border-green-200 dark:border-green-700">
          <p className="text-sm text-green-600 dark:text-green-300 font-medium">Average Cost</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-1">
            {parseFloat(analysis.avgCost).toFixed(1)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/30 p-4 rounded-lg border border-orange-200 dark:border-orange-700">
          <p className="text-sm text-orange-600 dark:text-orange-300 font-medium">Archetype</p>
          <p className="text-lg font-bold text-orange-900 dark:text-orange-100 mt-1 capitalize">
            {analysis.archetype}
          </p>
        </div>
      </div>

      {/* Notes Section */}
      {analysis.notes && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-gray-700 dark:text-gray-300">{analysis.notes}</p>
        </div>
      )}

      {/* Ink Colors */}
      {analysis.inkColors && Object.keys(analysis.inkColors).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Ink Distribution</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(analysis.inkColors).map(([color, count]) => (
              <div
                key={color}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-full border border-gray-300 dark:border-gray-600"
              >
                <span className="font-medium text-gray-900 dark:text-white">{color}:</span>
                <span className="ml-2 text-gray-600 dark:text-gray-300">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card Breakdown */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Card Breakdown</h3>
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <ul className="space-y-2">
            {Object.entries(analysis.cards).map(([name, count]) => (
              <li
                key={name}
                className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
              >
                <span className="text-gray-900 dark:text-gray-100">{name}</span>
                <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/50 text-primary-800 dark:text-primary-200 font-semibold rounded-full text-sm">
                  {count}x
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
