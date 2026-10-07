import { useRef, useState } from 'react';
import { ImageIcon, Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useContent } from './ContentContext';
import { useTheme } from '@/hooks/useTheme';

interface EditableImageProps {
  /** Dot path to the image URL string, e.g. "about.portrait". */
  path: string;
  /** Dot path to the alt-text string (optional). */
  altPath?: string;
  alt?: string;
  className?: string;
  /** Class for the wrapper element added in admin mode. */
  wrapperClassName?: string;
  /** Dot path to an optional dark-theme variant, shown when the site is dark. */
  darkPath?: string;
}

/**
 * An <img> whose source (and optional alt text) is editable in admin mode.
 * Clicking the image opens a popover to paste a URL/path or upload a file that
 * gets committed to the repo. A locally-uploaded image previews immediately.
 */
export function EditableImage({ path, altPath, alt, className, wrapperClassName, darkPath }: EditableImageProps) {
  const { content, isAdmin, setText, uploadAsset } = useContent();
  const { resolvedTheme } = useTheme();
  const lightSrc = String(resolveValue(content, path) ?? '');
  const darkSrc = darkPath ? String(resolveValue(content, darkPath) ?? '') : '';
  // The dark variant stands in only while the site is dark; editing below
  // always targets the light image, the one every theme falls back to.
  const src = resolvedTheme === 'dark' && darkSrc ? darkSrc : lightSrc;
  const resolvedAlt = altPath ? String(resolveValue(content, altPath) ?? '') : (alt ?? '');
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!isAdmin) {
    return <img src={src} alt={resolvedAlt} className={className} />;
  }

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    setPreview(URL.createObjectURL(file));
    try {
      const newPath = await uploadAsset(file);
      setText(path, newPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={cn('relative group/img', wrapperClassName)}>
      <img src={preview ?? src} alt={resolvedAlt} className={className} />
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="absolute top-2 right-2 z-10 inline-flex items-center gap-1.5 rounded-lg bg-background/90 px-2.5 py-1.5 text-xs font-medium shadow-lg ring-1 ring-border backdrop-blur hover:bg-background"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
            Edit image
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Image URL or path</label>
            <Input
              value={lightSrc}
              onChange={(e) => {
                setPreview(null);
                setText(path, e.target.value);
              }}
              placeholder="/uploads/photo.jpg or https://…"
              spellCheck={false}
              className="h-9 text-xs"
            />
          </div>

          {darkPath && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Dark-theme image (optional)</label>
              <Input
                value={darkSrc}
                onChange={(e) => {
                  setPreview(null);
                  setText(darkPath, e.target.value);
                }}
                placeholder="/uploads/photo-dark.webp"
                spellCheck={false}
                className="h-9 text-xs"
              />
            </div>
          )}

          {altPath && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Alt text</label>
              <Input
                value={resolvedAlt}
                onChange={(e) => setText(altPath, e.target.value)}
                placeholder="Describe the image"
                className="h-9 text-xs"
              />
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Upload file
            </Button>
            <span className="text-[11px] text-muted-foreground">Commits to the repo.</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onPickFile}
          />

          {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function resolveValue(content: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc == null || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, content);
}
