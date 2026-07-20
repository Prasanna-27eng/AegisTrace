/**
 * Central icon registry — Phosphor Duotone mapped to Lucide names.
 * Import icons from here instead of lucide-react or @phosphor-icons/react directly.
 * All icons default to weight="duotone". Override with weight prop if needed.
 */
import React from 'react';
import {
  Heartbeat        as _Activity,
  WarningCircle    as _AlertCircle,
  Warning          as _AlertTriangle,
  ArrowLeft        as _ArrowLeft,
  ArrowRight       as _ArrowRight,
  ArrowUpRight     as _ArrowUpRight,
  Prohibit         as _Ban,
  Robot            as _Bot,
  Brain            as _Brain,
  SpeakerHigh      as _SpeakerHigh,
  SpeakerSlash     as _SpeakerSlash,
  Calendar         as _Calendar,
  Check            as _Check,
  CheckCircle      as _CheckCircle,
  CheckSquare      as _CheckSquare,
  CaretDown        as _ChevronDown,
  CaretLeft        as _ChevronLeft,
  CaretRight       as _ChevronRight,
  CaretUp          as _ChevronUp,
  Circle           as _Circle,
  Clock            as _Clock,
  Code             as _Code,
  Code             as _Code2,
  Copy             as _Copy,
  Database         as _Database,
  DownloadSimple   as _Download,
  PencilSimple     as _Edit,
  ArrowSquareOut   as _ExternalLink,
  Eye              as _Eye,
  EyeSlash         as _EyeOff,
  File             as _File,
  FileCode         as _FileCode,
  FileText         as _FileText,
  Funnel           as _Filter,
  FolderOpen       as _FolderOpen,
  GitBranch        as _GitBranch,
  GitMerge         as _GitMerge,
  GithubLogo       as _Github,
  Globe            as _Globe,
  GridNine         as _Grid3X3,
  Hash             as _Hash,
  ClockCounterClockwise as _History,
  Info             as _Info,
  Key              as _Key,
  Stack            as _Layers,
  Link             as _Link,
  CircleNotch      as _Loader2,
  Lock             as _Lock,
  EnvelopeSimple   as _Mail,
  ChatText         as _MessageSquare,
  Network          as _Network,
  Pause            as _Pause,
  PushPin          as _Pin,
  Play             as _Play,
  Plug             as _Plug,
  Plus             as _Plus,
  ArrowsClockwise  as _RefreshCw,
  FloppyDisk       as _Save,
  MagnifyingGlass  as _Search,
  PaperPlaneTilt   as _Send,
  ShareNetwork     as _Share2,
  Shield           as _Shield,
  ShieldWarning    as _ShieldAlert,
  Sparkle          as _Sparkles,
  Square           as _Square,
  Trash            as _Trash2,
  TrendUp          as _TrendingUp,
  UploadSimple     as _Upload,
  User             as _User,
  Wrench           as _Wrench,
  X                as _X,
  XCircle          as _XCircle,
  Lightning        as _Zap,
  // Extra icons used in specific pages/components
  Terminal         as _Terminal,
  HardDrives       as _Server,
  Cpu              as _Cpu,
  Monitor          as _Monitor,
  Package          as _Package,
  Gear             as _Settings,
  House            as _Home,
  SignOut          as _LogOut,
  ChartBar         as _BarChart2,
  TrendDown        as _TrendingDown,
  ArrowsOut        as _Maximize,
  Question         as _HelpCircle,
  MapPin           as _MapPin,
  Tag              as _Tag,
  Bell             as _Bell,
  Star             as _Star,
  Bookmark         as _Bookmark,
  Knife            as _Slash,
  Rows             as _Rows,
  Columns          as _Columns,
  ListBullets      as _List,
  LayoutTemplate   as _Layout,
  Sidebar          as _SidebarIcon,
  UserPlus         as _UserPlus,
  UsersThree       as _Users,
  ChartPieSlice    as _PieChart,
  Flag             as _Flag,
  Target           as _Target,
  MagnifyingGlassPlus  as _ZoomIn,
  MagnifyingGlassMinus as _ZoomOut,
  ArrowCounterClockwise as _RotateCcw,
  ArrowClockwise   as _RotateCw,
  Sliders          as _Sliders,
  Microphone       as _Mic,
  Power            as _Power,
  IdentificationCard as _CreditCard,
  CurrencyDollar   as _DollarSign,
  ChartLineUp      as _LineChart,
  // AppShell sidebar + dock icons
  SquaresFour      as _LayoutDashboard,
  Broadcast        as _Radio,
  ChartBar         as _BarChart3,
  Crosshair        as _Crosshair,
  Rss              as _Rss,
  Target           as _Radar,
  Detective        as _ScanEye,
  BookOpen         as _BookOpen,
  Flask            as _FlaskConical,
  SlidersHorizontal as _Settings2,
  Scroll           as _ScrollText,
  ClipboardText    as _ClipboardList,
  Command          as _Command,
  KeyReturn        as _KeyRound,
  AppleLogo        as _Apple,
  Bug              as _Bug,
  ArrowsDownUp     as _ChevronsUpDown,
  FileMagnifyingGlass as _FileSearch,
  Fingerprint      as _Fingerprint,
  HardDrive        as _HardDrive,
  Keyboard         as _Keyboard,
  Lightbulb        as _Lightbulb,
  List             as _Menu,
  Scan             as _ScanLine,
  ShieldCheck      as _ShieldCheck,
  ShieldSlash      as _ShieldOff,
  SlidersHorizontal as _SlidersHorizontal,
  DeviceMobile     as _Smartphone,
  LockOpen         as _Unlock,
  UserCheck        as _UserCheck,
  UserMinus        as _UserX,
  Plugs            as _Webhook,
  WifiHigh         as _Wifi,
  WifiSlash        as _WifiOff,
  TreeStructure    as _Workflow,
} from '@phosphor-icons/react';

// Wrap every icon to default weight="duotone" while allowing override
const duo = (Icon) => {
  const Wrapped = ({ weight = 'duotone', ...props }) => React.createElement(Icon, { weight, ...props });
  Wrapped.displayName = Icon.displayName || Icon.name;
  return Wrapped;
};

export const Activity      = duo(_Activity);
export const AlertCircle   = duo(_AlertCircle);
export const AlertTriangle = duo(_AlertTriangle);
export const ArrowLeft     = duo(_ArrowLeft);
export const ArrowRight    = duo(_ArrowRight);
export const ArrowUpRight  = duo(_ArrowUpRight);
export const Ban           = duo(_Ban);
export const Bot           = duo(_Bot);
export const Brain         = duo(_Brain);
export const Calendar      = duo(_Calendar);
export const Check         = duo(_Check);
export const CheckCircle   = duo(_CheckCircle);
export const CheckSquare   = duo(_CheckSquare);
export const ChevronDown   = duo(_ChevronDown);
export const ChevronLeft   = duo(_ChevronLeft);
export const ChevronRight  = duo(_ChevronRight);
export const ChevronUp     = duo(_ChevronUp);
export const Circle        = duo(_Circle);
export const Clock         = duo(_Clock);
export const Code          = duo(_Code);
export const Code2         = duo(_Code2);
export const Copy          = duo(_Copy);
export const Database      = duo(_Database);
export const Download      = duo(_Download);
export const Edit          = duo(_Edit);
export const ExternalLink  = duo(_ExternalLink);
export const Eye           = duo(_Eye);
export const EyeOff        = duo(_EyeOff);
export const File          = duo(_File);
export const FileCode      = duo(_FileCode);
export const FileText      = duo(_FileText);
export const Filter        = duo(_Filter);
export const FolderOpen    = duo(_FolderOpen);
export const GitBranch     = duo(_GitBranch);
export const GitMerge      = duo(_GitMerge);
export const Github        = duo(_Github);
export const Globe         = duo(_Globe);
export const Grid3X3       = duo(_Grid3X3);
export const Hash          = duo(_Hash);
export const History       = duo(_History);
export const Info          = duo(_Info);
export const Key           = duo(_Key);
export const Layers        = duo(_Layers);
export const Link          = duo(_Link);
export const Loader2       = duo(_Loader2);
export const Lock          = duo(_Lock);
export const Mail          = duo(_Mail);
export const MessageSquare = duo(_MessageSquare);
export const Network       = duo(_Network);
export const Pause         = duo(_Pause);
export const Pin           = duo(_Pin);
export const Play          = duo(_Play);
export const Plug          = duo(_Plug);
export const Plus          = duo(_Plus);
export const RefreshCw     = duo(_RefreshCw);
export const Save          = duo(_Save);
export const Search        = duo(_Search);
export const Send          = duo(_Send);
export const Share2        = duo(_Share2);
export const Shield        = duo(_Shield);
export const ShieldAlert   = duo(_ShieldAlert);
export const Sparkles      = duo(_Sparkles);
export const Square        = duo(_Square);
export const Trash2        = duo(_Trash2);
export const TrendingUp    = duo(_TrendingUp);
export const Upload        = duo(_Upload);
export const User          = duo(_User);
export const Wrench        = duo(_Wrench);
export const X             = duo(_X);
export const XCircle       = duo(_XCircle);
export const Zap           = duo(_Zap);

// Extended set used by Dock, Sidebar, and other components
export const Terminal      = duo(_Terminal);
export const Server        = duo(_Server);
export const Cpu           = duo(_Cpu);
export const Monitor       = duo(_Monitor);
export const Package       = duo(_Package);
export const Settings      = duo(_Settings);
export const Home          = duo(_Home);
export const LogOut        = duo(_LogOut);
export const BarChart2     = duo(_BarChart2);
export const HelpCircle    = duo(_HelpCircle);
export const MapPin        = duo(_MapPin);
export const Tag           = duo(_Tag);
export const Bell          = duo(_Bell);
export const Star          = duo(_Star);
export const Bookmark      = duo(_Bookmark);
export const List          = duo(_List);
export const UserPlus      = duo(_UserPlus);
export const Users         = duo(_Users);
export const PieChart      = duo(_PieChart);
export const Flag          = duo(_Flag);
export const Target        = duo(_Target);
export const ZoomIn        = duo(_ZoomIn);
export const ZoomOut       = duo(_ZoomOut);
export const RotateCcw     = duo(_RotateCcw);
export const RotateCw      = duo(_RotateCw);
export const Sliders       = duo(_Sliders);
export const Mic           = duo(_Mic);
export const Power         = duo(_Power);
export const DollarSign    = duo(_DollarSign);
export const SpeakerHigh   = duo(_SpeakerHigh);
export const SpeakerSlash  = duo(_SpeakerSlash);

// AppShell sidebar + dock
export const LayoutDashboard = duo(_LayoutDashboard);
export const Radio           = duo(_Radio);
export const BarChart3       = duo(_BarChart3);
export const Crosshair       = duo(_Crosshair);
export const Rss             = duo(_Rss);
export const Radar           = duo(_Radar);
export const ScanEye         = duo(_ScanEye);
export const BookOpen        = duo(_BookOpen);
export const FlaskConical    = duo(_FlaskConical);
export const Settings2       = duo(_Settings2);
export const ScrollText      = duo(_ScrollText);
export const ClipboardList   = duo(_ClipboardList);
export const Command         = duo(_Command);
export const KeyRound        = duo(_KeyRound);
export const Apple           = duo(_Apple);
export const Bug             = duo(_Bug);
export const ChevronsUpDown  = duo(_ChevronsUpDown);
export const FileSearch      = duo(_FileSearch);
export const Fingerprint     = duo(_Fingerprint);
export const HardDrive       = duo(_HardDrive);
export const Keyboard        = duo(_Keyboard);
export const Lightbulb       = duo(_Lightbulb);
export const Menu            = duo(_Menu);
export const ScanLine        = duo(_ScanLine);
export const ShieldCheck     = duo(_ShieldCheck);
export const ShieldOff       = duo(_ShieldOff);
export const SlidersHorizontal = duo(_SlidersHorizontal);
export const Smartphone      = duo(_Smartphone);
export const Unlock          = duo(_Unlock);
export const UserCheck       = duo(_UserCheck);
export const UserX           = duo(_UserX);
export const Webhook         = duo(_Webhook);
export const Wifi            = duo(_Wifi);
export const WifiOff         = duo(_WifiOff);
export const Workflow        = duo(_Workflow);
