import { useEffect, useState } from 'react';
import { adminApi } from '../../services/api';

/** Shows a private enquiry image. The file needs a logged-in staff token, so it is fetched as a blob instead of an <img src>. */
export default function AuthImage({ enquiryId, attachmentId, alt }: { enquiryId: string; attachmentId: string; alt: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let objectUrl: string | null = null; let cancelled = false;
    adminApi.attachmentBlob(enquiryId, attachmentId).then((b) => { if (!cancelled) { objectUrl = URL.createObjectURL(b); setUrl(objectUrl); } }).catch(() => !cancelled && setFailed(true));
    return () => { cancelled = true; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [enquiryId, attachmentId]);
  if (failed) return <div className="h-40 flex items-center justify-center bg-surface-container-high rounded text-error font-body-sm">Could not load image</div>;
  if (!url) return <div className="h-40 bg-surface-container-high rounded animate-pulse" />;
  return <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt={alt} className="h-40 w-full object-cover rounded" data-testid="attachment-image" /></a>;
}
