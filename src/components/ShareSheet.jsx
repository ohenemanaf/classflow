import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Share } from 'lucide-react';
import { buildShareUrl } from '../lib/sync.js';
import Sheet from './Sheet.jsx';
import { Button } from './ui.jsx';

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API needs HTTPS and permission; older phones still support execCommand.
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  }
}

export default function ShareSheet({ profile, classes, onToast, onClose }) {
  const url = useMemo(
    () => buildShareUrl(`${window.location.origin}${window.location.pathname}`, profile.name, classes),
    [profile.name, classes],
  );
  // undefined while generating, null when the timetable is too big for one QR code.
  const [qr, setQr] = useState(undefined);

  useEffect(() => {
    let live = true;
    QRCode.toDataURL(url, { errorCorrectionLevel: 'L', margin: 1, width: 560, color: { dark: '#1d1d1f', light: '#ffffff' } })
      .then((data) => live && setQr(data))
      .catch(() => live && setQr(null));
    return () => {
      live = false;
    };
  }, [url]);

  const copy = async () => {
    const ok = await copyText(url);
    if (ok) onToast('Link copied', 'Send it to a coursemate.');
    else onToast('Copy failed', 'Your browser blocked copying the link.');
  };

  const share = async () => {
    try {
      await navigator.share({
        title: 'Import my schedule',
        text: 'Open this link to import my class schedule on ClassFlow:',
        url,
      });
    } catch {
      // Closing the share menu rejects the promise; that isn't an error.
    }
  };

  return (
    <Sheet title="Share Schedule" onClose={onClose} cancelLabel="Done">
      <div className="mx-auto mt-2 grid aspect-square w-full max-w-64 place-items-center rounded-[1.75rem] bg-white p-4 shadow-[0_10px_30px_rgba(0,0,0,0.08)]">
        {qr && <img src={qr} alt="QR code linking to your schedule" className="size-full" />}
        {qr === null && (
          <p className="text-center text-[0.9375rem] text-secondary">Too many classes for a QR code. Share the link instead.</p>
        )}
      </div>
      <p className="mt-3 text-center text-[0.9375rem] text-secondary">
        Scan to copy {classes.length} {classes.length === 1 ? 'class' : 'classes'}
      </p>
      <div className="mt-5 flex gap-2">
        <Button variant="plain" onClick={copy} className="flex-1">
          <Copy size={18} /> Copy link
        </Button>
        {'share' in navigator && (
          <Button onClick={share} className="flex-1">
            <Share size={18} /> Share
          </Button>
        )}
      </div>
    </Sheet>
  );
}
