import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-16">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Page Not Found</h2>
      <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 text-center">
        Sorry, the page you are looking for could not be found.
      </p>
      <div className="flex space-x-4">
        <Link href="/">
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Return Home
          </button>
        </Link>
        <Link href="/dashboard">
          <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-100 dark:hover:bg-gray-600">
            Go to Dashboard
          </button>
        </Link>
      </div>
    </div>
  );
} 