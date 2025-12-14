/**
 * Next.js Loading UI
 * 
 * This component shows a loading state while page components are being loaded.
 * It prevents blank screens during page transitions and initial loads.
 * 
 * More info: https://nextjs.org/docs/app/api-reference/file-conventions/loading
 */
export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-purple-600 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block">
          <div className="w-16 h-16 border-4 border-purple-300 border-t-white rounded-full animate-spin"></div>
        </div>
        <p className="text-white text-xl font-semibold mt-4">Loading EQUA...</p>
      </div>
    </div>
  );
}
