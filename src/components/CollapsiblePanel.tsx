import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface CollapsiblePanelProps {
  icon: ReactNode;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  action?: ReactNode;
  children: ReactNode;
}

export function CollapsiblePanel({
  icon,
  title,
  isOpen,
  onToggle,
  action,
  children,
}: CollapsiblePanelProps) {
  return (
    <section className={`panel collapsible-panel ${isOpen ? "open" : ""}`}>
      <button className="collapsible-header" onClick={onToggle} type="button">
        <span>
          {icon}
          {title}
        </span>
        <ChevronDown className="collapse-chevron" size={18} />
      </button>
      {action ? (
        <div
          className="collapsible-action"
          onClick={(e) => e.stopPropagation()}
        >
          {action}
        </div>
      ) : null}
      {isOpen ? <div className="collapsible-body">{children}</div> : null}
    </section>
  );
}
