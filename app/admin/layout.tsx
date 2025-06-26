import AuthGuard from "@/components/auth/AuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="h-full overflow-consistent">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 overflow-consistent">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
