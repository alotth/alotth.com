import ReactMarkdown from "react-markdown";
import { Theme } from "@/lib/themes";

interface MarkdownRendererProps {
  content: string;
  theme: Theme;
}

export default function MarkdownRenderer({
  content,
  theme,
}: MarkdownRendererProps) {
  const { styles } = theme;
  console.log(1, theme);
  return (
    <div className={styles.container}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => <h1 className={styles.heading1}>{children}</h1>,
          h2: ({ children }) => <h2 className={styles.heading2}>{children}</h2>,
          h3: ({ children }) => <h3 className={styles.heading3}>{children}</h3>,
          h4: ({ children }) => <h4 className={styles.heading4}>{children}</h4>,
          p: ({ children }) => <p className={styles.paragraph}>{children}</p>,
          ul: ({ children }) => <ul className={styles.list}>{children}</ul>,
          ol: ({ children }) => (
            <ol className={styles.orderedList}>{children}</ol>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className={styles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className={styles.code}>{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className={styles.blockquote}>{children}</blockquote>
          ),
          table: ({ children }) => (
            <table className={styles.table}>{children}</table>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
