import AuthGuard from "@/components/auth/AuthGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="h-full">
        <main className="h-full pt-4 px-4 sm:px-6 lg:px-8 overflow-hidden">
          {children}
        </main>
      </div>
    </AuthGuard>
  );
}
