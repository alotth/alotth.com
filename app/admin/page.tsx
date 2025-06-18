import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
      </header>

      <div className="flex flex-col gap-6">
        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">Propostas</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
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

        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Mindmap</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Mindmap para organizar suas ideias
          </p>
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/project"
              className="text-primary hover:underline"
            >
              Gerenciar Mindmap →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
