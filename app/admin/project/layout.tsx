import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mindmap - Admin",
  description: "Mindmap editor for administrators",
};

export default function MindmapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-full">
      {/* <h1 className="text-2xl font-bold mb-6">Mindmap</h1> */}
      <div className="h-[calc(100vh-10rem)]">{children}</div>
    </div>
  );
}
