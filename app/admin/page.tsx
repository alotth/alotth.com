import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <header className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard Administrativo</h1>
      </header>

      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Propostas</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base">
            Gerencie suas propostas em markdown
          </p>
          <div className="flex items-center">
            <Link
              href="/admin/proposals"
              className="text-primary hover:underline text-sm sm:text-base font-medium"
            >
              Gerenciar Propostas →
            </Link>
          </div>
        </div>

        <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Mindmap</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-3 sm:mb-4 text-sm sm:text-base">
            Mindmap para organizar suas ideias
          </p>
          <div className="flex items-center">
            <Link
              href="/admin/project"
              className="text-primary hover:underline text-sm sm:text-base font-medium"
            >
              Gerenciar Mindmap →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
