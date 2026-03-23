import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <h1 className="text-4xl font-bold text-white/90 mb-2">404</h1>
      <p className="text-white/40 mb-4">Page not found</p>
      <Link href="/" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
        Back to Dashboard
      </Link>
    </div>
  );
}
