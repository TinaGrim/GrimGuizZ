import { useEffect, useState } from "react";
import { Teacher, type Asset } from "../../api/client";
import { useApp } from "../../store/AppContext";
import { useConfirm } from "../../components/ConfirmDialog";
import UploadProgress from "../../components/UploadProgress";
import { Trash2, Upload, ImageIcon, Video, AlertCircle } from "lucide-react";

export default function AdminAssets() {
  const { questions } = useApp();
  const { confirm } = useConfirm();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadName, setUploadName] = useState("");
  const [error, setError] = useState("");

  const refresh = async () => {
    try {
      setAssets(await Teacher.assets());
    } catch (e) {
      setError((e as Error).message);
    }
  };

  useEffect(() => {
    refresh();
  }, [questions.length]); // refresh when questions change so usage count stays current

  const handleUpload = async (file: File) => {
    setUploading(true);
    setProgress(0);
    setUploadName(file.name);
    setError("");
    try {
      await Teacher.uploadAsset(file, setProgress);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "Delete this asset?",
      message:
        "If any question still uses it, deletion will be blocked and you'll see a clear error.",
      confirmLabel: "Delete",
    });
    if (!ok) return;
    setError("");
    try {
      await Teacher.deleteAsset(id);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="px-8 py-8 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1
            className="font-900 text-3xl mb-1"
            style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
          >
            Asset Library
          </h1>
          <p
            className="text-sm"
            style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
          >
            {assets.length} asset{assets.length !== 1 ? "s" : ""} — images (16:9 cropped) and troll videos (short clips)
          </p>
        </div>
        <label
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-600 cursor-pointer"
          style={{
            background: "var(--color-ember)",
            color: "#fff",
            border: "2px solid var(--color-ink)",
            boxShadow: "3px 3px 0 var(--color-ink)",
            fontFamily: "var(--font-body)",
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = "5px 5px 0 var(--color-ink)";
            e.currentTarget.style.transform = "translate(-2px, -2px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = "3px 3px 0 var(--color-ink)";
            e.currentTarget.style.transform = "none";
          }}
        >
          <Upload size={14} />
          {uploading ? "Uploading…" : "Upload"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
        </label>
      </div>

      {uploading && (
        <div className="mb-4 max-w-sm">
          <UploadProgress percent={progress} label={`Uploading ${uploadName}…`} />
        </div>
      )}

      {error && (
        <div
          className="mb-4 p-3 text-sm flex items-start gap-2"
          style={{
            background: "#FDECEA",
            border: "1px solid var(--color-ember)",
            color: "var(--color-ember-dark)",
            fontFamily: "var(--font-body)",
          }}
        >
          <AlertCircle size={14} style={{ marginTop: 2, flexShrink: 0 }} />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.length === 0 && (
          <div
            className="col-span-full flex flex-col items-center justify-center py-16 text-center"
            style={{ border: "2px dashed var(--color-cream-dark)" }}
          >
            <ImageIcon
              size={28}
              style={{ color: "var(--color-cream-dark)", marginBottom: 8 }}
            />
            <p
              className="text-sm"
              style={{
                color: "var(--color-ink-muted)",
                fontFamily: "var(--font-body)",
              }}
            >
              No assets yet — upload one to attach to a question.
            </p>
          </div>
        )}
        {assets.map((a) => (
          <div
            key={a.id}
            style={{
              background: "white",
              border: "2px solid var(--color-cream-dark)",
            }}
          >
            <div
              style={{
                aspectRatio: "16/9",
                background: "var(--color-cream-dark)",
                overflow: "hidden",
              }}
            >
              {a.type === "video" ? (
                <video
                  src={a.url}
                  muted
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain"
                  style={{ display: "block", background: "#0a0500" }}
                />
              ) : (
                <img src={a.url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="p-3 flex flex-col gap-2">
              <p
                className="text-xs uppercase tracking-wide font-600"
                style={{
                  color: a.type === "video" ? "var(--color-ember)" : "var(--color-teal-dark)",
                  fontFamily: "var(--font-body)",
                }}
              >
                <span className="inline-flex items-center gap-1">
                  {a.type === "video" ? <Video size={11} /> : <ImageIcon size={11} />}
                  {a.type === "video" ? "Troll video" : "Image"}
                </span>
              </p>
              <p
                className="text-xs truncate"
                style={{
                  color: "var(--color-ink-muted)",
                  fontFamily: "var(--font-mono)",
                }}
                title={a.url}
              >
                {a.url}
              </p>
              {a.usedIn.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {a.usedIn.map((u) => (
                    <p
                      key={u.questionId}
                      className="text-xs"
                      style={{
                        color: "var(--color-teal-dark)",
                        fontFamily: "var(--font-body)",
                      }}
                    >
                      Used in:{" "}
                      {u.prompt
                        ? u.prompt.length > 60
                          ? `${u.prompt.slice(0, 60)}…`
                          : u.prompt
                        : "a question"}
                      {u.role === "troll video" ? " (troll video)" : ""}
                    </p>
                  ))}
                </div>
              ) : (
                <p
                  className="text-xs"
                  style={{
                    color: "var(--color-ink-muted)",
                    fontFamily: "var(--font-body)",
                  }}
                >
                  Not used yet
                </p>
              )}
              <button
                onClick={() => handleDelete(a.id)}
                className="self-end p-1.5"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--color-ink-muted)",
                  opacity: 0.5,
                }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}