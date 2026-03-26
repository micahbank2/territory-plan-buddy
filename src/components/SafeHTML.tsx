import DOMPurify from "dompurify";

interface SafeHTMLProps {
  html: string;
  className?: string;
}

export function SafeHTML({ html, className }: SafeHTMLProps) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["p", "br", "strong", "em", "u", "s", "ul", "ol", "li", "a", "h1", "h2", "h3"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
