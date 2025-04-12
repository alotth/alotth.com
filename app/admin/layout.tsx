import AuthGuard from "@/components/auth/AuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen admin-section">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-800">
              Alotth.com - Admin
            </h1>
            <nav>
              <ul className="flex space-x-4">
                <li>
                  <a
                    href="/admin"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Dashboard
                  </a>
                </li>
                <li>
                  <a
                    href="/admin/proposals"
                    className="text-gray-600 hover:text-gray-900"
                  >
                    Propostas
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
