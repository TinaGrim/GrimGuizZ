import { useState, useEffect } from "react";
import { X, Play } from "lucide-react";

interface TrollVideoModalProps {
  onClose: () => void;
  videoUrl?: string | null;
}

export default function TrollVideoModal({ onClose, videoUrl }: TrollVideoModalProps) {
  const [playing, setPlaying] = useState(Boolean(videoUrl));
  const [countdown, setCountdown] = useState<number | null>(null);
  const [canSkip, setCanSkip] = useState(false);

  const hasVideo = Boolean(videoUrl);

  useEffect(() => {
    if (playing) {
      setCountdown(5);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(interval);
            setCanSkip(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [playing]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(28, 15, 0, 0.88)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative w-full max-w-lg animate-pop-in"
        style={{
          background: "#1C0F00",
          border: "3px solid var(--color-amber)",
          boxShadow: "8px 8px 0 var(--color-amber)",
        }}
      >
        {/* Memphis decoration strip */}
        <div
          className="h-2 w-full"
          style={{
            background:
              "repeating-linear-gradient(90deg, #D94F1E 0px, #D94F1E 20px, #F0A500 20px, #F0A500 40px, #0D6E6E 40px, #0D6E6E 60px)",
          }}
        />

        <div className="p-6">
          {/* Header — playful but no scolding "Three Strikes!" */}
          <div className="flex items-center justify-end mb-4">
            {(canSkip || (hasVideo && playing)) && (
              <button
                onClick={onClose}
                className="flex items-center gap-1 text-sm px-3 py-1.5"
                style={{
                  color: "var(--color-ink)",
                  background: "var(--color-amber)",
                  border: "2px solid var(--color-amber)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <X size={14} />
                Skip &amp; continue
              </button>
            )}
          </div>

          {/* Video area — a real uploaded video autoplays on open */}
          {hasVideo ? (
            <div
              className="relative flex items-center justify-center overflow-hidden"
              style={{
                background: "#0a0500",
                aspectRatio: "16/9",
                border: "2px solid rgba(240,165,0,0.3)",
              }}
            >
              <video
                src={videoUrl!}
                autoPlay
                muted
                playsInline
                controls
                className="w-full h-full object-contain"
                style={{ display: "block" }}
              />
            </div>
          ) : !playing ? (
            <div
              className="relative flex flex-col items-center justify-center cursor-pointer"
              style={{
                background: "#2A1800",
                aspectRatio: "16/9",
                border: "2px solid rgba(240,165,0,0.3)",
              }}
              onClick={() => setPlaying(true)}
            >
              {/* Fake thumbnail — a fun "gotcha" visual */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "url(https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&h=450&fit=crop&auto=format)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.5,
                }}
              />
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 72,
                    height: 72,
                    background: "var(--color-ember)",
                    border: "3px solid #fff",
                  }}
                >
                  <Play size={32} fill="#fff" color="#fff" style={{ marginLeft: 4 }} />
                </div>
              </div>
            </div>
          ) : (
            <div
              className="relative flex flex-col items-center justify-center overflow-hidden"
              style={{
                background: "#0a0500",
                aspectRatio: "16/9",
                border: "2px solid rgba(240,165,0,0.3)",
              }}
            >
              {/* Animated troll screen */}
              <div className="flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div
                  className="text-7xl animate-ticker"
                  style={{ animation: "tickerTick 0.4s ease-in-out infinite" }}
                >
                  🎵
                </div>
                <p
                  className="text-2xl font-900"
                  style={{
                    fontFamily: "var(--font-display)",
                    color: "var(--color-amber)",
                    lineHeight: 1.2,
                  }}
                >
                  We&apos;re no strangers to wrong answers…
                </p>
                <p
                  className="text-sm"
                  style={{ color: "rgba(255,255,255,0.5)", fontFamily: "var(--font-body)" }}
                >
                  Your teacher would upload a real video here. For now — you know the song.
                </p>
              </div>

              {/* Skip countdown */}
              {!canSkip && countdown !== null && (
                <div
                  className="absolute top-3 right-3 flex items-center justify-center rounded-full text-sm font-600"
                  style={{
                    width: 36,
                    height: 36,
                    background: "rgba(0,0,0,0.6)",
                    color: "rgba(255,255,255,0.5)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {countdown}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}