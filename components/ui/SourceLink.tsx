interface SourceLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function SourceLink({ href, children, className = "" }: SourceLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`text-color-text-muted underline hover:text-color-text decoration-color-rule hover:decoration-color-text transition-colors ${className}`}
    >
      {children}
    </a>
  );
}
