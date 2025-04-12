import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Alotth.com</h1>
        <p className="text-xl mb-8">Sistema em construção</p>
        <Link
          href="/admin"
          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
        >
          Área Administrativa
        </Link>
      </div>
    </div>
  );
}
