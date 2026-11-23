import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { apiErrorMessage, customerApi } from '../../services/api';

interface Props { designId: string; initial: boolean; onChange?: (fav: boolean) => void; className?: string }

/** Heart button. Logged-out visitors are sent to the login page; staff/admin accounts cannot save favourites. */
export default function FavouriteButton({ designId, initial, onChange, className = '' }: Props) {
  const { user } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (user && user.role !== 'customer') return null;

  const toggle = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { nav(`/login?next=${encodeURIComponent(loc.pathname + loc.search)}&reason=favourite`); return; }
    if (busy) return;
    setBusy(true); setErr(null);
    const next = !fav;
    setFav(next);
    try {
      if (next) await customerApi.addFavourite(designId); else await customerApi.removeFavourite(designId);
      onChange?.(next);
    } catch (error) { setFav(!next); setErr(apiErrorMessage(error)); } finally { setBusy(false); }
  };

  return (
    <button type="button" onClick={toggle} disabled={busy} title={err ?? (fav ? 'Remove from favourites' : 'Save to favourites')}
      aria-label={fav ? 'Remove from favourites' : 'Save to favourites'} aria-pressed={fav} data-testid="favourite-button"
      className={`w-10 h-10 rounded-full bg-surface/90 backdrop-blur flex items-center justify-center shadow-md hover:scale-105 transition-transform ${fav ? 'text-error' : 'text-primary'} ${className}`}>
      <Icon name="favorite" filled={fav} className="text-[20px]" />
    </button>
  );
}
