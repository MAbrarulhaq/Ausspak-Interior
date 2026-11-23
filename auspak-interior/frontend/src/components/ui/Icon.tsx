import {
  AlertCircle, Bell, ClipboardList, Heart, Image as ImageIcon, Inbox, LogOut, Pencil, Plus, RefreshCw, Search, Send, Trash2, Upload, Users, ArrowLeftRight, ArrowRight, ArrowUpRight, BadgeCheck, Building, Building2, CalendarDays, Camera,
  Check, CheckCheck, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ClipboardCheck, Clock, Cog, Cpu,
  ExternalLink, FilePen, FileText, Grid3x3, HardHat, Hammer, Home, Info, Layers, LayoutDashboard, LifeBuoy, Lock,
  MapPin, MapPinned, Maximize, Maximize2, Menu, MessageCircle, MoveRight, PencilRuler, Phone, Ruler, SearchX,
  ShieldCheck, SlidersHorizontal, Smartphone, Star, Tag, Truck, User, UserPlus, PlusCircle, Wrench, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type LucideLike = LucideIcon;

// Maps the Material Symbols names used in the Stitch design to Lucide icons.
const MAP: Record<string, LucideLike> = {
  apartment: Building2, architecture: Ruler, arrow_forward: ArrowRight, arrow_outward: ArrowUpRight,
  calendar_month: CalendarDays, call: Phone, carpenter: Hammer, chat: MessageCircle, check: Check,
  check_circle: CheckCircle2, close: X, compare_arrows: ArrowLeftRight, contact_support: LifeBuoy,
  corporate_fare: Building, dashboard_customize: LayoutDashboard, design_services: PencilRuler, developer_mode: Cpu,
  done_all: CheckCheck, edit_note: FilePen, engineering: HardHat, expand_more: ChevronDown, fact_check: ClipboardCheck,
  fit_screen: Maximize, fullscreen: Maximize2, handyman: Wrench, home: Home, home_repair_service: Wrench, info: Info,
  layers: Layers, local_shipping: Truck, location_on: MapPin, lock: Lock, north_east: ArrowUpRight,
  open_in_new: ExternalLink, phone_iphone: Smartphone, photo_camera: Camera, picture_as_pdf: FileText,
  pin_drop: MapPinned, precision_manufacturing: Cog, roofing: Home, schedule: Clock, search_off: SearchX,
  star: Star, straighten: Ruler, tag: Tag, texture: Grid3x3, trending_flat: MoveRight, tune: SlidersHorizontal,
  verified: BadgeCheck, verified_user: ShieldCheck, chevron_left: ChevronLeft, chevron_right: ChevronRight,
  menu: Menu, person: User, error: AlertCircle, favorite: Heart, add: Plus, delete: Trash2, edit: Pencil, search: Search, logout: LogOut,
  person_add: UserPlus, add_circle: PlusCircle,
  group: Users, inbox: Inbox, bell: Bell, image: ImageIcon, upload: Upload, refresh: RefreshCw, receipt: ClipboardList, send: Send,
};

interface IconProps { name: string; className?: string; filled?: boolean }

/** Material-symbol style icon API on top of Lucide. Size comes from the `text-[Npx]` class (default 24px). */
export default function Icon({ name, className = '', filled = false }: IconProps) {
  const Cmp = MAP[name] ?? Info;
  const px = /text-\[(\d+)px\]/.exec(className)?.[1];
  const size = px ? `${px}px` : '24px';
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center leading-none ${className}`}
      style={{ width: size, height: size }}
    >
      <Cmp className="h-full w-full" strokeWidth={1.75} fill={filled ? 'currentColor' : 'none'} aria-hidden />
    </span>
  );
}
