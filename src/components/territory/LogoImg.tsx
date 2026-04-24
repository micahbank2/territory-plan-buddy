import { useRef, useState } from "react";
import { Building2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLogoUrl } from "@/data/prospects";

export function LogoImg({
  website,
  size = 24,
  customLogo,
  onUpload,
  onRemove,
}: {
  website?: string;
  size?: number;
  customLogo?: string;
  onUpload?: (base64: string) => void;
  onRemove?: () => void;
}) {
  const [err, setErr] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const url = getLogoUrl(website, size >= 32 ? 64 : 32);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpload) return;
    const reader = new FileReader();
    reader.onload = () => onUpload(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    if (!onUpload) return;
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => onUpload(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onUpload) setDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  };

  const dragProps = onUpload
    ? {
        onDrop: handleDrop,
        onDragOver: handleDragOver,
        onDragLeave: handleDragLeave,
      }
    : {};

  if (customLogo) {
    return (
      <div className="relative group shrink-0" style={{ width: size, height: size }} {...dragProps}>
        <img
          src={customLogo}
          alt=""
          className={cn(
            "rounded-md bg-muted object-contain w-full h-full",
            dragging && "ring-2 ring-primary"
          )}
        />
        {onRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
        {dragging && (
          <div className="absolute inset-0 rounded-md bg-primary/30 flex items-center justify-center">
            <Upload className="w-3 h-3 text-primary" />
          </div>
        )}
      </div>
    );
  }

  const showFallback = !website || err || !url;

  if (showFallback) {
    return (
      <div className="relative group shrink-0" style={{ width: size, height: size }} {...dragProps}>
        <div
          className={cn(
            "rounded-md bg-muted flex items-center justify-center w-full h-full",
            dragging && "ring-2 ring-primary"
          )}
        >
          {dragging ? (
            <Upload className="text-primary" style={{ width: size * 0.4, height: size * 0.4 }} />
          ) : (
            <Building2 className="text-muted-foreground" style={{ width: size * 0.5, height: size * 0.5 }} />
          )}
        </div>
        {onUpload && !dragging && (
          <>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileRef.current?.click();
              }}
              className="absolute inset-0 rounded-md bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              title="Upload logo"
            >
              <Upload className="w-3 h-3 text-primary" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="relative group shrink-0" style={{ width: size, height: size }} {...dragProps}>
      <img
        src={url}
        alt=""
        className={cn(
          "rounded-md bg-muted object-contain w-full h-full",
          dragging && "ring-2 ring-primary"
        )}
        onError={() => setErr(true)}
      />
      {onUpload && !dragging && (
        <>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileRef.current?.click();
            }}
            className="absolute inset-0 rounded-md bg-primary/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            title="Upload custom logo"
          >
            <Upload className="w-3 h-3 text-primary" />
          </button>
        </>
      )}
      {dragging && (
        <div className="absolute inset-0 rounded-md bg-primary/30 flex items-center justify-center">
          <Upload className="w-3 h-3 text-primary" />
        </div>
      )}
    </div>
  );
}
