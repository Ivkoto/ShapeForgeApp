import { Plus } from "lucide-react";
import type { ReactNode } from "react";

interface PanelTitleProps {
  icon: ReactNode;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function PanelTitle({ icon, title, actionLabel, onAction }: PanelTitleProps) {
  return (
    <div className="panel-title">
      <h2>
        {icon}
        {title}
      </h2>
      {actionLabel && onAction ? (
        <button type="button" className="secondary-button" onClick={onAction}>
          <Plus size={16} />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
