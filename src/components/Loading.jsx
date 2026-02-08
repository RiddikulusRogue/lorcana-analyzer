export default function Loading({ message = 'Analyzing deck...' }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-primary-200 dark:border-primary-800 rounded-full"></div>
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
        <p className="text-gray-700 dark:text-gray-300 font-medium">{message}</p>
      </div>
    </div>
  );
}
