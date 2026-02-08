export default function DeckInput({ value, onChange }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <label htmlFor="deck-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Enter Your Deck List
      </label>
      <textarea
        id="deck-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-y transition-colors"
        placeholder="Paste your decklist here... (e.g., '4x Elsa - Spirit of Winter')"
      />
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Enter your deck list with card quantities (e.g., "3x Card Name" or "Card Name x3")
      </p>
    </div>
  );
}
