export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
          OpenGym
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Automated membership management for small community gyms.
          Signup, payments, and access control — all in one place.
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/admin/register"
            className="rounded-lg bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Register Your Gym
          </a>
          <a
            href="/admin/login"
            className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 font-semibold hover:bg-gray-100 transition-colors"
          >
            Admin Login
          </a>
        </div>
      </div>
    </main>
  );
}
