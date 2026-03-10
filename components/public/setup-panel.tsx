interface SetupPanelProps {
  title?: string;
  description: string;
  details?: string[];
}

export function SetupPanel({
  title = "تعذر تحميل التطبيق",
  description,
  details = [],
}: SetupPanelProps) {
  return (
    <div className="glass-card mx-auto flex w-full max-w-xl flex-col gap-4 text-right">
      <div className="tag-pill w-fit">حالة التطبيق</div>
      <h2 className="text-2xl font-bold text-[var(--sand-strong)]">{title}</h2>
      <p className="text-sm leading-8 text-[var(--sand-muted)]">{description}</p>
      {details.length > 0 ? (
        <div className="rounded-2xl border border-[rgba(201,149,106,0.22)] bg-[rgba(201,149,106,0.06)] p-4 text-sm leading-8 text-[var(--sand-muted)]">
          {details.map((detail) => (
            <div key={detail}>{detail}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
