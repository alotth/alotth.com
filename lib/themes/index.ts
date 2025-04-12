export type Theme = {
  id: string;
  styles: {
    container: string;
    heading: string;
    heading1: string;
    heading2: string;
    heading3: string;
    heading4: string;
    paragraph: string;
    list: string;
    orderedList: string;
    link: string;
    code: string;
    blockquote: string;
    table: string;
  };
};

export const themes: Record<string, Theme> = {
  default: {
    id: "default",
    styles: {
      container: "max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md",
      heading: "font-bold text-gray-800 mb-4",
      heading1: "text-4xl font-bold text-gray-800 mb-6",
      heading2: "text-3xl font-bold text-gray-800 mb-5",
      heading3: "text-2xl font-bold text-gray-800 mb-4",
      heading4: "text-xl font-bold text-gray-800 mb-4",
      paragraph: "text-gray-700 mb-4 leading-relaxed",
      list: "list-disc pl-6 mb-4 text-gray-700",
      orderedList: "list-decimal pl-6 mb-4 text-gray-700",
      link: "text-primary hover:underline",
      code: "bg-gray-100 p-2 rounded font-mono text-sm",
      blockquote: "border-l-4 border-gray-300 pl-4 italic text-gray-600",
      table: "w-full border-collapse border border-gray-300 mb-4",
    },
  },
  gamer: {
    id: "gamer",
    styles: {
      container:
        "max-w-4xl mx-auto p-8 bg-gamers-background backdrop-blur-sm rounded-lg border border-gamers-accent/20 shadow-[0_0_15px_rgba(232,95,95,0.15)]",
      heading:
        "text-5xl font-bold text-gamers-accent mb-6 border-b-2 border-gamers-accent/50 pb-2 flex items-center gap-2 text-shadow-gamers tracking-wider",
      heading1:
        "text-4xl font-bold text-gamers-accent mb-6 border-b-2 border-gamers-accent/50 pb-2 flex items-center gap-2 text-shadow-gamers tracking-wider",
      heading2:
        "text-4xl font-bold text-white mb-5 text-shadow-gamers tracking-wide",
      heading3: "text-3xl font-bold text-gamers-accent mb-4 tracking-wide",
      heading4: "text-2xl font-bold text-gamers-accent mb-4 tracking-wide",
      paragraph: "text-gray-300 mb-4 leading-relaxed",
      list: "list-disc pl-6 mb-4 text-gray-300 marker:text-gamers-accent space-y-2",
      orderedList:
        "list-none pl-0 mb-4 text-gray-300 space-y-4 [counter-reset:step] [&>li]:relative [&>li]:pl-12 [&>li:before]:absolute [&>li:before]:left-0 [&>li:before]:text-gamers-accent [&>li:before]:content-[counter(step)] [&>li:before]:[counter-increment:step] [&>li:before]:font-bold [&>li:before]:flex [&>li:before]:items-center [&>li:before]:justify-center [&>li:before]:w-6 [&>li:before]:text-2xl",
      link: "text-gamers-accent hover:text-gamers-hover transition-colors duration-200 border-b border-gamers-accent/30 hover:border-gamers-accent",
      code: "bg-[#151515] p-3 rounded font-mono text-sm text-gamers-accent border border-gamers-accent/20 shadow-[0_0_10px_rgba(232,95,95,0.1)]",
      blockquote:
        "border-l-4 border-gamers-accent pl-4 italic text-gray-300 bg-[#151515] p-4 rounded-r shadow-[0_0_15px_rgba(0,0,0,0.2)]",
      table:
        "w-full border-collapse mb-4 text-gray-300 [&_td]:border [&_td]:border-gamers-accent/20 [&_td]:p-3 [&_tr:nth-child(even)]:bg-[#151515] rounded-lg overflow-hidden [&_tr:first-child]:bg-gamers-accent/10 [&_tr:first-child]:text-white",
    },
  },
  business: {
    id: "business",
    styles: {
      container: "max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md",
      heading: "font-bold text-blue-800 mb-4",
      heading1: "text-4xl font-bold text-blue-800 mb-6",
      heading2: "text-3xl font-bold text-blue-800 mb-5",
      heading3: "text-2xl font-bold text-blue-800 mb-4",
      heading4: "text-xl font-bold text-blue-800 mb-4",
      paragraph: "text-gray-700 mb-4 leading-relaxed",
      list: "list-disc pl-6 mb-4 text-gray-700",
      orderedList: "list-decimal pl-6 mb-4 text-gray-700",
      link: "text-blue-600 hover:underline",
      code: "bg-gray-100 p-2 rounded font-mono text-sm",
      blockquote: "border-l-4 border-blue-300 pl-4 italic text-gray-600",
      table: "w-full border-collapse border border-gray-300 mb-4",
    },
  },
  fun: {
    id: "fun",
    styles: {
      container: "max-w-4xl mx-auto p-6 bg-yellow-50 rounded-lg shadow-md",
      heading: "font-bold text-orange-600 mb-4",
      heading1: "text-4xl font-bold text-orange-600 mb-6",
      heading2: "text-3xl font-bold text-orange-600 mb-5",
      heading3: "text-2xl font-bold text-orange-600 mb-4",
      heading4: "text-xl font-bold text-orange-600 mb-4",
      paragraph: "text-gray-700 mb-4 leading-relaxed",
      list: "list-disc pl-6 mb-4 text-gray-700",
      orderedList: "list-decimal pl-6 mb-4 text-gray-700",
      link: "text-orange-500 hover:underline",
      code: "bg-yellow-100 p-2 rounded font-mono text-sm",
      blockquote: "border-l-4 border-yellow-300 pl-4 italic text-gray-600",
      table: "w-full border-collapse border border-yellow-300 mb-4",
    },
  },
};

export const getThemeById = (id: string): Theme => {
  return themes[id] || themes.default;
};
