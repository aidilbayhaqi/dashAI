"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  FileText,
  ImageIcon,
  Loader2,
  TriangleAlert,
} from "lucide-react";

import {
  createAuthenticatedFileObjectUrl,
  downloadAuthenticatedFile,
  getFilenameFromUrl,
  isPreviewableImage,
  normalizeFileUrl,
  revokeAuthenticatedFileObjectUrl,
} from "@/lib/file-access";

type PreviewStatus = "idle" | "loading" | "ready" | "error";

export type AuthenticatedFilePreviewProps = {
  src?: string | null;
  alt?: string;
  filename?: string;
  className?: string;
  iconClassName?: string;
  showDownload?: boolean;
  downloadLabel?: string;
  onError?: (error: Error) => void;
};

function toError(error: unknown): Error {
  if (error instanceof Error) return error;

  return new Error("Gagal memuat file.");
}

export function AuthenticatedFilePreview({
  src,
  alt = "File preview",
  filename,
  className = "h-full w-full object-cover",
  iconClassName = "text-slate-400",
  showDownload = false,
  downloadLabel = "Download",
  onError,
}: AuthenticatedFilePreviewProps) {
  const normalizedSource = useMemo(
    () => normalizeFileUrl(src),
    [src]
  );

  const [resolvedSource, setResolvedSource] = useState("");
  const [status, setStatus] = useState<PreviewStatus>("idle");
  const [downloadPending, setDownloadPending] = useState(false);

  const previewableImage = isPreviewableImage(normalizedSource);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    setResolvedSource("");

    if (!normalizedSource) {
      setStatus("idle");
      return () => {
        active = false;
      };
    }

    if (!previewableImage) {
      setStatus("ready");
      return () => {
        active = false;
      };
    }

    setStatus("loading");

    void createAuthenticatedFileObjectUrl(normalizedSource)
      .then((url) => {
        if (!active) {
          revokeAuthenticatedFileObjectUrl(url);
          return;
        }

        objectUrl = url;
        setResolvedSource(url);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;

        const normalizedError = toError(error);
        setStatus("error");
        onError?.(normalizedError);
      });

    return () => {
      active = false;

      if (objectUrl) {
        revokeAuthenticatedFileObjectUrl(objectUrl);
      }
    };
  }, [normalizedSource, onError, previewableImage]);

  async function handleDownload() {
    if (!normalizedSource || downloadPending) return;

    try {
      setDownloadPending(true);

      await downloadAuthenticatedFile(
        normalizedSource,
        filename || getFilenameFromUrl(normalizedSource)
      );
    } catch (error: unknown) {
      const normalizedError = toError(error);
      onError?.(normalizedError);
      console.error(normalizedError);
    } finally {
      setDownloadPending(false);
    }
  }

  if (!normalizedSource) {
    return <ImageIcon size={30} className={iconClassName} />;
  }

  if (status === "loading") {
    return (
      <Loader2
        size={28}
        className={`${iconClassName} animate-spin`}
        aria-label="Memuat file"
      />
    );
  }

  if (status === "error") {
    return (
      <TriangleAlert
        size={28}
        className="text-amber-500"
        aria-label="File gagal dimuat"
      />
    );
  }

  if (previewableImage && resolvedSource) {
    return (
      <>
        <img
          src={resolvedSource}
          alt={alt}
          className={className}
          onError={() => {
            const error = new Error("Preview gambar gagal dimuat.");
            setStatus("error");
            onError?.(error);
          }}
        />

        {showDownload ? (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloadPending}
            className="absolute bottom-2 right-2 inline-flex h-9 items-center gap-2 rounded-xl bg-slate-950/80 px-3 text-xs font-black text-white backdrop-blur transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloadPending ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {downloadLabel}
          </button>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center">
      <FileText size={30} className={iconClassName} />

      {showDownload ? (
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloadPending}
          className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#0f2a5f] px-3 text-xs font-black text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloadPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Download size={14} />
          )}
          {downloadLabel}
        </button>
      ) : null}
    </div>
  );
}

export default AuthenticatedFilePreview;
