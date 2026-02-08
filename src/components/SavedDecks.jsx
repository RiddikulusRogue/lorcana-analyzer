import { TrashIcon } from './Icons';

export default function SavedDecks({ decks, onLoad, onDelete }) {
  if (decks.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">💾</span>
          Saved Decks
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">No saved decks yet.</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Analyze a deck and click "Save Deck" to store it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span className="text-2xl">💾</span>
        Saved Decks
      </h2>

      <div className="space-y-3">
        {decks.map((deck) => (
          <div
            key={deck.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors"
          >
            <div className="flex-1 mb-3 sm:mb-0">
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                {deck.name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {(() => {
                  const date = new Date(deck.createdAt);
                  return `${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
                })()}
              </p>
              {deck.analysis && (
                <div className="flex gap-3 mt-2 text-xs text-gray-600 dark:text-gray-300">
                  <span>📊 {deck.analysis.total} cards</span>
                  {deck.analysis.archetype && (
                    <span className="capitalize">🎯 {deck.analysis.archetype}</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onLoad(deck)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
              >
                Load
              </button>
              <button
                onClick={() => onDelete(deck.id)}
                className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
                aria-label="Delete deck"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
