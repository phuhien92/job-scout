import type {
  KeyboardEvent,
  PropsWithChildren,
  ReactNode,
} from "react";

type CommonProps = PropsWithChildren<{ className?: string }>;

export function AgentStatus({ label }: { label?: string }) {
  return <div role="status">{label}</div>;
}

export function Alert({
  title,
  description,
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div role="alert">
      {title ? <strong>{title}</strong> : null}
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function Button({
  href,
  label,
  onClick,
  type,
}: {
  href?: string;
  label?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}) {
  if (href) return <a href={href}>{label}</a>;
  return (
    <button type={type ?? "button"} onClick={onClick}>
      {label}
    </button>
  );
}

export function ChatHeader({ title }: { title: string }) {
  return <h1>{title}</h1>;
}

export function ChatMessage({
  children,
  pending,
  pendingLabel,
}: CommonProps & { pending?: boolean; pendingLabel?: string }) {
  return <div>{pending ? <div role="status">{pendingLabel}</div> : children}</div>;
}

export function ChatThread({
  ariaLabel,
  children,
}: CommonProps & { ariaLabel?: string }) {
  return <div aria-label={ariaLabel}>{children}</div>;
}

export function Composer({
  value,
  onValueChange,
  onSubmit,
  streaming,
  onStop,
  placeholder,
  sendLabel,
  stopLabel,
  aiGlow,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  streaming?: boolean;
  onStop?: () => void;
  placeholder?: string;
  sendLabel?: string;
  stopLabel?: string;
  aiGlow?: boolean;
}) {
  const submit = () => onSubmit?.(value ?? "");
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !streaming) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div data-testid="composer" data-ai-glow={aiGlow ? "true" : "false"}>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onValueChange?.(event.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button type="button" onClick={streaming ? onStop : submit}>
        {streaming ? stopLabel : sendLabel}
      </button>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <section>
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
      {action}
    </section>
  );
}

export function Panel({ children, ...props }: CommonProps & { role?: string }) {
  return <div {...props}>{children}</div>;
}

export function PromptSuggestions({
  suggestions,
  onValueChange,
  ariaLabel,
}: {
  suggestions: Array<{ id: string; label: string }>;
  onValueChange?: (id: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div aria-label={ariaLabel}>
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => onValueChange?.(suggestion.id)}
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

export function Prose({ children }: CommonProps) {
  return <div>{children}</div>;
}
