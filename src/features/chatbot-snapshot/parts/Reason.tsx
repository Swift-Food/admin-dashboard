interface ReasonProps {
  children: string;
}

export function Reason({ children }: ReasonProps) {
  return <span className="reason">— {children}</span>;
}
