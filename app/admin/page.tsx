import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Propostas</h2>
          <p className="text-gray-600 mb-4">
            Gerencie suas propostas em markdown
          </p>
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/proposals"
              className="text-primary hover:underline"
            >
              Gerenciar Propostas →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
