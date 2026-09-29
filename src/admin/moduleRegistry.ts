import type { LucideIcon } from "lucide-react";
import { Activity, BarChart3, Bell, BookOpen, Boxes, CalendarDays, FileArchive, FileClock, FileImage, Gauge, Globe2, Heart, HelpCircle, LayoutDashboard, Link2, Palette, Rocket, Settings2, ShieldCheck, Sparkles, Trash2, UserCog, Megaphone, Users, ClipboardCheck } from "lucide-react";

export type PermissionAction = "view" | "create" | "edit" | "delete" | "publish" | "manage";
export type AdminRole = "administrator" | "editor" | "moderator" | "view_only" | "custom";
export interface AdminModule { id:string; number:number; label:string; description:string; icon:LucideIcon; group:"wedding"|"insights"|"management"|"system"; actions:PermissionAction[]; status?:"active"|"planned"; children:{id:string;label:string;description?:string}[]; }

const children=(items:string[])=>items.map(id=>({id,label:id.replaceAll("-"," ")}));
const all:PermissionAction[]=["view","create","edit","delete","publish","manage"];

export const ADMIN_MODULES:AdminModule[]=[
{id:"dashboard",number:2,label:"Dashboard",description:"Website status, pending actions, system health, recent activity, current session and quick actions.",icon:LayoutDashboard,group:"wedding",actions:["view","manage"],children:children(["website-status","pending-actions","system-health","recent-activity","current-session","quick-actions"])},
{id:"website",number:3,label:"Website",description:"Homepage section manager, section ordering and editable public wedding website content.",icon:Globe2,group:"wedding",actions:all,children:children(["section-manager","intro","navigation","home","couple","events-story-memory","gallery-highlights","rsvp","guestbook","footer"])},
{id:"styling",number:4,label:"Styling",description:"Appearance, theme, colours, typography, animations, responsive layouts and loading screen controls.",icon:Palette,group:"wedding",actions:["view","edit","publish","manage"],children:children(["theme","colours","typography","animations","responsive","loading-screen"])},
{id:"alerts",number:5,label:"Alerts",description:"Maintenance and announcement status, scheduling, messages and page targeting.",icon:Megaphone,group:"wedding",actions:all,children:children(["maintenance-status","maintenance-message","maintenance-apply-to","announcement-status","announcement-message","announcement-apply-to"])},
{id:"notifications",number:6,label:"Notification / Actions",description:"Notification list and pending, completed and failed administrative actions.",icon:Bell,group:"insights",actions:["view","create","edit","delete","manage"],children:children(["notification-list","action-list"])},
{id:"analytics",number:7,label:"Analytics",description:"Website, visitor, page, RSVP and gallery analytics with CSV/PDF export.",icon:BarChart3,group:"insights",actions:["view","manage"],children:children(["overview","visitor-analytics","page-analytics","rsvp-analytics","gallery-analytics","export"])},
{id:"events",number:8,label:"Events / Story Memory",description:"Event list, ordering, visibility, duplication, event details, schedule, location and event security.",icon:CalendarDays,group:"wedding",actions:all,children:children(["event-list","event-details"])},
{id:"rsvp",number:9,label:"RSVP",description:"RSVP overview, guest management and configurable RSVP form fields.",icon:ClipboardCheck,group:"wedding",actions:all,children:children(["rsvp-overview","guest-list","rsvp-form"])},
{id:"guestbook",number:10,label:"Guestbook",description:"Guestbook message moderation, guest details and moderation settings.",icon:BookOpen,group:"wedding",actions:["view","edit","delete","manage"],children:children(["guestbook-messages","guestbook-settings"])},
{id:"social",number:11,label:"Social & Contact",description:"Social links, icon visibility and public contact information.",icon:Link2,group:"wedding",actions:["view","edit","publish","manage"],children:children(["social-links","contact-information"])},
{id:"media",number:12,label:"Media",description:"Google Drive media source, gallery and QR links, photo/video listing, performance, delivery, guest uploads and privacy.",icon:FileImage,group:"wedding",actions:all,children:children(["media-source","gallery-qr-links","photo-video-listing","image-performance","media-delivery","guest-uploads","media-privacy","private-media-delivery"])},
{id:"interactions",number:13,label:"Interactions",description:"Event unlock, unlock sessions, code storage, protection, guestbook and analytics interaction, favorites, QR and guest uploads.",icon:Heart,group:"wedding",actions:["view","edit","delete","manage"],children:children(["event-unlock","unlock-session","event-code-storage","unlock-protection","guestbook-interaction","analytics-interaction","favorites","qr-interaction","guest-photo-upload"])},
{id:"access",number:14,label:"Access Management",description:"Users, roles and granular permissions.",icon:Users,group:"management",actions:all,children:children(["user-list","roles-permissions","permissions"])},
{id:"administration",number:15,label:"Administration",description:"Website information and administrator dashboard preferences.",icon:UserCog,group:"management",actions:all,children:children(["website-information","admin-preferences"])},
{id:"security",number:16,label:"Security",description:"Account security, security alerts and event security center.",icon:ShieldCheck,group:"management",actions:["view","edit","manage"],children:children(["security-settings","alert-settings","event-security"])},
{id:"audit",number:17,label:"Audit Logs",description:"Searchable administrative activity history with filters, details and export.",icon:FileClock,group:"management",actions:["view","manage"],children:children(["activity-logs"])},
{id:"publishing",number:18,label:"Publishing",description:"Current publishing status, preview, publish actions, scheduling, unpublish and version history.",icon:Rocket,group:"system",actions:all,children:children(["publishing-status","publishing-actions","versions"])},
{id:"diagnostics",number:19,label:"Testing & Diagnostics",description:"Website tests, performance, automated testing, application cache, code splitting and diagnostic logs.",icon:Activity,group:"system",actions:["view","manage"],children:children(["website-test","performance","automated-testing","application-cache","code-splitting","diagnostics"])},
{id:"integrations",number:20,label:"Integrations",description:"Supabase, Google Drive, GitHub, Vercel and other service integrations.",icon:Boxes,group:"system",actions:all,children:children(["supabase","google-drive","github","vercel","environment-configuration","api-services","other-integrations"])},
{id:"system",number:21,label:"System",description:"System information and service status for website, database, storage, email, API and cache.",icon:Gauge,group:"system",actions:["view","manage"],children:children(["system-information","system-services"])},
{id:"backup",number:22,label:"Backup & Restore",description:"Create backups, view history and restore database/content snapshots.",icon:FileArchive,group:"system",actions:["view","create","delete","manage"],children:children(["create-backup","backup-history","restore-backup"])},
{id:"settings",number:23,label:"Settings",description:"General wedding, date/time, language, notification, website and advanced settings.",icon:Settings2,group:"system",actions:["view","edit","manage"],children:children(["general","notification-settings","privacy-settings"])},
{id:"trash",number:24,label:"Trash & Recovery",description:"Deleted items, recovery settings, restore and permanent deletion.",icon:Trash2,group:"system",actions:["view","delete","manage"],children:children(["deleted-items","recovery-settings"])},
{id:"help",number:25,label:"Help & Support",description:"Documentation, support actions and application information.",icon:HelpCircle,group:"system",actions:["view"],children:children(["documentation","support-actions","application-information"])}
];

export const ADMIN_ROLES:Record<AdminRole,{label:string;description:string;permissions:Record<string,PermissionAction[]>}>={
 administrator:{label:"Administrator",description:"Full administrative control.",permissions:Object.fromEntries(ADMIN_MODULES.map(m=>[m.id,m.actions]))},
 editor:{label:"Editor",description:"Manage wedding content without security administration.",permissions:Object.fromEntries(ADMIN_MODULES.filter(m=>!["access","administration","security","audit","integrations","system","backup"].includes(m.id)).map(m=>[m.id,m.actions.filter(a=>["view","create","edit","publish"].includes(a))]))},
 moderator:{label:"Moderator",description:"Moderate guest-facing interactions.",permissions:{guestbook:["view","edit","delete","manage"],interactions:["view","delete","manage"],notifications:["view","manage"],rsvp:["view","edit"],dashboard:["view"]}},
 view_only:{label:"View Only",description:"Read-only access.",permissions:Object.fromEntries(ADMIN_MODULES.map(m=>[m.id,["view"]]))},
 custom:{label:"Custom Role",description:"Explicitly assigned permissions.",permissions:{}}
};

export const GROUP_LABELS={wedding:"WEDDING",insights:"INSIGHT",management:"MANAGEMENT",system:"SYSTEM"} as const;
