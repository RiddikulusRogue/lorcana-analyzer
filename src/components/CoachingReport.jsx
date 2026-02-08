export default function CoachingReport({ coaching }) {
  if (!coaching) return null;

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg shadow-lg p-6 border border-purple-200 dark:border-purple-800">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">✨</span>
        AI Coaching Report
      </h2>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-inner border border-gray-200 dark:border-gray-700">
        <pre className="whitespace-pre-wrap font-mono text-sm text-gray-800 dark:text-gray-200 leading-relaxed overflow-x-auto">
          {coaching}
        </pre>
      </div>
      
      <div className="mt-4 p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <p className="text-sm text-indigo-800 dark:text-indigo-200">
          <strong>💡 Tip:</strong> This coaching report is tailored to your deck composition and selected playstyle. 
          Review the mulligan strategy and turn-by-turn guide for optimal gameplay.
        </p>
      </div>
    </div>
  );
}
