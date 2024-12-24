import Link from "next/link";

export default async function NotFound() {
    return (
        <div className="w-full max-w-md mx-auto p-3 md:mt-32 text-center">
            <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-gray-600 mb-4">
                Page Not Found
            </h2>
            <p className="text-gray-500 mb-8">
                Oops! The page you're looking for doesn't exist.
            </p>
        </div>
    );
}
