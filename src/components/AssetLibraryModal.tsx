import type { Asset } from "../api/client";
import { ImageIcon, Video, X } from "lucide-react";

// Reusable picker for choosing an existing image OR video from the asset
// library. Used by the quiz question-add overlay and the Questions page.
export function AssetLibraryModal({
  open,
  onClose,
  assets,
  kind,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  assets: Asset[];
  kind: "image" | "video";
  onSelect: (url: string) => void;
}) {
  if (!open) return null;
  const list = assets.filter((a) => a.type === kind);
  const label = kind === "image" ? "image" : "video";

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto"
      style={{
        background: "rgba(28, 15, 0, 0.7)",
        backdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl my-8 animate-pop-in"
        style={{
          background: "white",
          border: "3px solid var(--color-ink)",
          boxShadow: "8px 8px 0 var(--color-amber)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-start justify-between p-5 border-b"
          style={{ borderColor: "var(--color-cream-dark)" }}
        >
          <div>
            <h3
              className="text-lg font-700 flex items-center gap-2"
              style={{ fontFamily: "var(--font-display)", color: "var(--color-ink)" }}
            >
              {kind === "image" ? <ImageIcon size={17} /> : <Video size={17} />}
              Choose {kind} from library
            </h3>
            <p
              className="text-xs mt-0.5"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
            >
              {list.length} {label}
              {list.length !== 1 ? "s" : ""} — click one to attach it
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-ink-muted)",
            }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
          {list.length === 0 && (
            <p
              className="col-span-full text-sm text-center py-8"
              style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
            >
              No {label}s yet — upload one from the Asset Library page first.
            </p>
          )}
          {list.map((a) => (
            <button
              key={a.id}
              onClick={() => {
                onSelect(a.url);
                onClose();
              }}
              className="text-left overflow-hidden"
              style={{
                background: "var(--color-cream)",
                border: "2px solid var(--color-cream-dark)",
                cursor: "pointer",
                padding: 0,
              }}
            >
              <div
                style={{
                  aspectRatio: "16/9",
                  overflow: "hidden",
                  background: "var(--color-cream-dark)",
                }}
              >
                {kind === "video" ? (
                  <video
                    src={a.url}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full h-full object-contain"
                    style={{ display: "block", background: "#0a0500" }}
                  />
                ) : (
                  <img
                    src={a.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="p-2">
                {a.usedIn.length > 0 ? (
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-teal-dark)", fontFamily: "var(--font-body)" }}
                  >
                    Used by {a.usedIn.length} question
                    {a.usedIn.length !== 1 ? "s" : ""}
                  </p>
                ) : (
                  <p
                    className="text-xs"
                    style={{ color: "var(--color-ink-muted)", fontFamily: "var(--font-body)" }}
                  >
                    Not used yet
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}