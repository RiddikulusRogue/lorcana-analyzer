import { ChartIcon, SaveIcon, DownloadIcon, SparklesIcon } from './Icons';

export default function ControlPanel({
  onAnalyze,
  onSave,
  onDownload,
  onGetCoaching,
  analysisExists,
  playStyle,
  onPlayStyleChange,
  serverEnabled,
  onServerToggle,
  isAnalyzing,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="space-y-4">
        {/* Main Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <ChartIcon />
            {isAnalyzing ? 'Analyzing...' : 'Analyze Deck'}
          </button>

          <button
            onClick={onSave}
            disabled={!analysisExists}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <SaveIcon />
            Save Deck
          </button>

          <button
            onClick={onDownload}
            disabled={!analysisExists}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <DownloadIcon />
            Download
          </button>

          <button
            onClick={onGetCoaching}
            disabled={!analysisExists}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            <SparklesIcon />
            AI Coaching
          </button>
        </div>

        {/* Options Row */}
        <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex-1">
            <label htmlFor="playstyle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Playstyle
            </label>
            <select
              id="playstyle"
              value={playStyle}
              onChange={(e) => onPlayStyleChange(e.target.value)}
              disabled={!analysisExists}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              <option value="aggro">Aggro (Fast Win)</option>
              <option value="midrange">Midrange (Balanced)</option>
              <option value="control">Control (Late Game)</option>
              <option value="balanced">Balanced Analysis</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
              <input
                type="checkbox"
                checked={serverEnabled}
                onChange={(e) => onServerToggle(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Use Server Storage
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}
