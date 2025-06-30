import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Debounce utilitário
export function debounce<T extends (...args: any[]) => void>(fn: T, delay: number) {
  let timeout: ReturnType<typeof setTimeout>;
  
  const debouncedFn = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
  
  debouncedFn.cancel = () => {
    clearTimeout(timeout);
  };
  
  return debouncedFn;
}

/**
 * Converts standalone URLs in text to markdown link format
 * Only converts URLs that are not already in markdown format (excluding image URLs)
 */
export function convertUrlsToMarkdown(content: string): string {
  // Regex to match URLs that are not already in markdown format
  // Negative lookbehind to avoid URLs that are already in [text](url) or ![text](url) format
  const urlRegex = /(?<!\]\()\b(https?:\/\/[^\s\)\]]+)/gi;
  
  return content.replace(urlRegex, (url) => {
    // Check if this URL is already part of a markdown link by looking at surrounding context
    const beforeUrl = content.substring(0, content.indexOf(url));
    const afterUrl = content.substring(content.indexOf(url) + url.length);
    
    // Check if URL is preceded by ]( (markdown link) or ![]( (markdown image)
    if (beforeUrl.endsWith('](') || beforeUrl.endsWith('![](')) {
      return url; // Don't convert, already in markdown format
    }
    
    // Check if URL is followed by ) and preceded by some text in brackets
    const markdownLinkPattern = /\[[^\]]*\]\(\s*$/;
    const markdownImagePattern = /!\[[^\]]*\]\(\s*$/;
    if ((markdownLinkPattern.test(beforeUrl) || markdownImagePattern.test(beforeUrl)) && afterUrl.startsWith(')')) {
      return url; // Don't convert, already in markdown format
    }
    
    // Convert to markdown link format
    // Extract domain name for the link text
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname.replace('www.', '');
      return `[${domain}](${url})`;
    } catch {
      // If URL parsing fails, use the full URL as both text and link
      return `[${url}](${url})`;
    }
  });
}

/**
 * Extracts URLs from content (both markdown links and plain URLs, excluding image URLs)
 */
export function extractUrlsFromContent(content: string): string[] {
  const urls: string[] = [];
  
  // Extract URLs from markdown links [text](url) - but not images ![text](url)
  const markdownLinkRegex = /(?<!\!)\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = markdownLinkRegex.exec(content)) !== null) {
    urls.push(match[2]);
  }
  
  // Extract standalone URLs (not already in markdown format)
  const lines = content.split('\n');
  for (const line of lines) {
    const standaloneUrlRegex = /(?<!\]\()\b(https?:\/\/[^\s\)\]]+)/gi;
    let urlMatch;
    while ((urlMatch = standaloneUrlRegex.exec(line)) !== null) {
      const url = urlMatch[1];
      const beforeUrl = line.substring(0, line.indexOf(url));
      
      // Skip if it's part of a markdown image or link
      if (beforeUrl.endsWith('](') || beforeUrl.endsWith('![](')) {
        continue;
      }
      
      // Check if URL is in a markdown image pattern
      const markdownImagePattern = /!\[[^\]]*\]\(\s*$/;
      const markdownLinkPattern = /\[[^\]]*\]\(\s*$/;
      if (markdownImagePattern.test(beforeUrl) || markdownLinkPattern.test(beforeUrl)) {
        continue;
      }
      
      urls.push(url);
    }
  }
  
  return Array.from(new Set(urls)); // Remove duplicates
}


