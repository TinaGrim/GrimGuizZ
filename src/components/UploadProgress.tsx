type UploadProgressProps = {
  percent: number;
  label?: string;
};

export default function UploadProgress({ percent, label = "Uploading…" }: UploadProgressProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <div
        className="flex items-center justify-between text-xs font-600"
        style={{
          color: "var(--color-ink-muted)",
          fontFamily: "var(--font-body)",
        }}
      >
        <span>{label}</span>
        <span style={{ fontFamily: "var(--font-mono)" }}>{Math.round(percent)}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden"
        style={{ background: "var(--color-cream-dark)" }}
      >
        <div
          className="h-full"
          style={{
            width: `${Math.max(1, Math.min(100, percent))}%`,
            background: "var(--color-ember)",
            transition: "width 0.15s linear",
          }}
        />
      </div>
    </div>
  );
}