import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
    Menu,
    X,
    Bell,
    Trash2,
    ChevronDown,
    LogOut,
    Settings,
    User as UserIcon,
    Sun,
    Moon,
    Activity,
    Stethoscope,
    Users,
    Pill,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import tccLogo from "../../assets/tcc-logo.png";
import api from "../../services/api";
import { invalidateRecordCache } from "../../services/recordCache";
import {
    type ClinicNotification,
    clearAllClinicNotifications,
    deleteClinicNotification,
    getStoredNotifications,
    markAllNotificationsAsRead,
} from "../../services/notifications";
import { useTheme } from "../../utils/theme";
import { Avatar } from "../dashboard/DashboardWidgets";
import { ConfirmationModal } from "../student-management/FieldsAndModals";

interface HeaderProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
    sidebarCollapsed?: boolean;
    onToggleSidebar?: () => void;
}

function useOutsideClick(
    ref: React.RefObject<HTMLElement | null>,
    handler: () => void,
    active: boolean
) {
    useEffect(() => {
        if (!active) return;
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler();
        };
        document.addEventListener("mousedown", listener);
        document.addEventListener("touchstart", listener);
        return () => {
            document.removeEventListener("mousedown", listener);
            document.removeEventListener("touchstart", listener);
        };
    }, [ref, handler, active]);
}

function formatRelative(dateStr?: string) {
    if (!dateStr) return "Just now";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatRole(role?: string) {
    if (!role) return "Clinic Staff";
    return role;
}

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
    "/dashboard": {
        title: "Dashboard",
        subtitle: "Overview & Clinic Analytics",
    },
    "/students": {
        title: "Patient Management",
        subtitle: "Students, Faculty & Staff Health Records",
    },
    "/clinic-visits": {
        title: "Clinic Visits",
        subtitle: "Consultations, Triage & Health Logs",
    },
    "/medicine": {
        title: "Medicine Inventory",
        subtitle: "Pharmaceutical Stocks & Dispensation",
    },
    "/reports": {
        title: "Reports & Analytics",
        subtitle: "Institutional Health Data & Summaries",
    },
    "/organization": {
        title: "Organizational Chart",
        subtitle: "Healthcare Staff & Administration",
    },
    "/staff": {
        title: "Organizational Chart",
        subtitle: "Healthcare Staff & Administration",
    },
    "/settings": {
        title: "Settings",
        subtitle: "Account Preferences & Configuration",
    },
    "/profile": {
        title: "My Profile",
        subtitle: "Personal Details & Account Activity",
    },
};

export function Header({
    sidebarOpen,
    setSidebarOpen,
    sidebarCollapsed = false,
    onToggleSidebar,
}: HeaderProps): React.JSX.Element {
    const location = useLocation();
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();

    const bellRef = useRef<HTMLDivElement>(null);
    const profileMenuRef = useRef<HTMLDivElement>(null);

    const [bellOpen, setBellOpen] = useState(false);
    const [profileMenuOpen, setProfileMenuOpen] = useState(false);
    const [confirmClearNotifications, setConfirmClearNotifications] = useState(false);
    const [notifications, setNotifications] = useState<ClinicNotification[]>(() =>
        getStoredNotifications()
    );

    const [user, setUser] = useState<any>(() => {
        try {
            const raw = localStorage.getItem("user");
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    // Listen to user changes (e.g. Profile updates)
    useEffect(() => {
        const handleStorage = () => {
            try {
                const raw = localStorage.getItem("user");
                setUser(raw ? JSON.parse(raw) : null);
            } catch {
                // ignore
            }
        };
        window.addEventListener("storage", handleStorage);
        window.addEventListener("tcc-user-updated", handleStorage);
        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("tcc-user-updated", handleStorage);
        };
    }, []);

    // Listen to notifications update events
    useEffect(() => {
        const handleNotifUpdate = () => {
            setNotifications(getStoredNotifications());
        };
        window.addEventListener("tcc-notifications-updated", handleNotifUpdate);
        window.addEventListener("storage", handleNotifUpdate);
        return () => {
            window.removeEventListener("tcc-notifications-updated", handleNotifUpdate);
            window.removeEventListener("storage", handleNotifUpdate);
        };
    }, []);

    useOutsideClick(bellRef, () => setBellOpen(false), bellOpen);
    useOutsideClick(profileMenuRef, () => setProfileMenuOpen(false), profileMenuOpen);

    const unreadCount = useMemo(() => {
        return notifications.filter((n) => !n.read).length;
    }, [notifications]);

    const currentMeta = useMemo(() => {
        const path = location.pathname.toLowerCase();
        for (const key of Object.keys(PAGE_META)) {
            if (path === key || path.startsWith(`${key}/`)) {
                return PAGE_META[key];
            }
        }
        return {
            title: "TCC Clinic",
            subtitle: "Health Services & Clinic Management",
        };
    }, [location.pathname]);

    const handleClearAll = () => {
        clearAllClinicNotifications();
        setNotifications([]);
    };

    const handleDeleteOne = (idOrKey: string) => {
        deleteClinicNotification(idOrKey);
        setNotifications((prev) => prev.filter((n) => n.id !== idOrKey && n.key !== idOrKey));
    };

    const handleLogout = async () => {
        try {
            api.post("/logout", {}, { timeout: 3000 }).catch(() => {});
        } catch {
            // ignore
        }
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("tcc-dashboard-cache");
        try {
            invalidateRecordCache();
        } catch {
            // ignore
        }
        navigate("/login", { replace: true });
    };

    const getNotificationIcon = (category?: string, type?: string) => {
        if (category === "patient") return <Users size={15} />;
        if (category === "visit") return <Stethoscope size={15} />;
        if (category === "medicine") return <Pill size={15} />;
        if (type === "add") return <CheckCircle2 size={15} />;
        if (type === "delete") return <AlertCircle size={15} />;
        return <Activity size={15} />;
    };

    return (
        <header className="sticky top-0 z-30 flex h-[68px] sm:h-[72px] w-full items-center justify-between border-b border-[#eee7de] bg-white/95 px-4 sm:px-6 lg:px-8 backdrop-blur shadow-xs transition-colors duration-200 dark:border-stone-800 dark:bg-[#16120e]/95">
            {/* Left side: Hamburger toggle + Dynamic Page Title & Subtitle */}
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <button
                    type="button"
                    onClick={() => setSidebarOpen((prev) => !prev)}
                    className="flex lg:hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[#70091f] transition duration-200 hover:bg-[#fcebe7] active:scale-95 dark:text-[#f8a598] dark:hover:bg-stone-800 cursor-pointer"
                    aria-label="Toggle Navigation Sidebar"
                    title="Open Navigation Menu"
                    aria-expanded={sidebarOpen}
                >
                    <Menu size={22} />
                </button>

                {/* Mobile Logo display */}
                <div className="flex items-center gap-2 lg:hidden">
                    <img
                        src={tccLogo}
                        alt="TCC Logo"
                        onError={(e) => {
                            const target = e.currentTarget;
                            if (!target.dataset.fallback) {
                                target.dataset.fallback = "1";
                                target.src = "/tcc-logo.png";
                            } else if (target.dataset.fallback === "1") {
                                target.dataset.fallback = "2";
                                target.src = "/tcc-logo.jpg";
                            }
                        }}
                        className="h-8 w-8 rounded-full object-contain ring-1 ring-[#70091f]/20"
                    />
                </div>

                {/* Dynamic Page Title & Subtitle */}
                <div className="min-w-0 text-left">
                    <h1 className="truncate text-base sm:text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">
                        {currentMeta.title}
                    </h1>
                    <p className="hidden text-xs text-[#887d70] sm:block dark:text-stone-400">
                        {currentMeta.subtitle}
                    </p>
                </div>
            </div>

            {/* Right side: Notifications Bell & Profile Dropdown */}
            <div className="ml-auto flex items-center gap-2 sm:gap-4 shrink-0">
                {/* Notifications Bell */}
                <div ref={bellRef} className="relative">
                    <button
                        type="button"
                        onClick={() => {
                            setBellOpen((prev) => {
                                const next = !prev;
                                if (next) {
                                    markAllNotificationsAsRead();
                                    setNotifications((items) =>
                                        items.map((n) => ({ ...n, read: true }))
                                    );
                                }
                                return next;
                            });
                        }}
                        aria-label="Notifications"
                        aria-expanded={bellOpen}
                        className="relative flex h-10 w-10 items-center justify-center rounded-full text-[#766959] transition duration-200 hover:bg-[#fcebe7] hover:text-[#70091f] focus:outline-none dark:text-stone-300 dark:hover:bg-stone-800 dark:hover:text-[#f8a598]"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#70091f] ring-2 ring-white dark:ring-stone-900 animate-pulse" />
                        )}
                    </button>

                    {bellOpen && (
                        <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-[#e8dfd4] bg-white shadow-2xl dark:border-stone-800 dark:bg-[#1f1914] animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between border-b border-[#eee7de] px-4 py-3 dark:border-stone-800">
                                <div>
                                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                                        Notifications
                                    </p>
                                    <p className="text-[11px] text-[#887d70] dark:text-stone-400">
                                        {notifications.length} recent system event{notifications.length === 1 ? "" : "s"}
                                    </p>
                                </div>
                                {notifications.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setConfirmClearNotifications(true)}
                                        className="text-xs font-semibold text-[#70091f] hover:underline dark:text-[#f8a598] cursor-pointer"
                                    >
                                        Clear all
                                    </button>
                                )}
                            </div>

                            {notifications.length ? (
                                <ul className="max-h-80 overflow-y-auto divide-y divide-[#eee7de] dark:divide-stone-800/80">
                                    {notifications.map((item) => (
                                        <li
                                            key={item.id || item.key}
                                            className="group flex items-start gap-3 px-4 py-3 transition hover:bg-stone-50 dark:hover:bg-stone-800/40"
                                        >
                                            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fcebe7] text-[#70091f] dark:bg-[#70091f]/30 dark:text-[#f8a598]">
                                                {getNotificationIcon(item.category, item.type)}
                                            </div>

                                            <div className="min-w-0 flex-1 text-left">
                                                <p className="truncate text-xs font-bold text-stone-900 dark:text-stone-100">
                                                    {item.title}
                                                </p>
                                                <p className="line-clamp-2 text-[11px] text-[#887d70] dark:text-stone-400">
                                                    {item.description}
                                                </p>
                                                <span className="mt-1 inline-block text-[10px] text-[#a99d8f] dark:text-stone-500">
                                                    {formatRelative(item.date)}
                                                </span>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteOne(item.id || item.key);
                                                }}
                                                title="Delete notification"
                                                className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-stone-400 opacity-60 transition hover:bg-rose-50 hover:text-rose-600 hover:opacity-100 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="px-4 py-8 text-center text-xs text-[#a99d8f] dark:text-stone-500">
                                    You're all caught up! No new notifications.
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className="h-7 w-px bg-[#eee7de] dark:bg-stone-800" />

                {/* Profile Avatar & Interactive Dropdown Menu */}
                <div ref={profileMenuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setProfileMenuOpen((prev) => !prev)}
                        aria-expanded={profileMenuOpen}
                        aria-haspopup="true"
                        aria-label="User profile menu"
                        className="flex items-center gap-2 rounded-xl p-1 transition hover:bg-stone-100 sm:gap-2.5 sm:px-2.5 sm:py-1.5 dark:hover:bg-stone-800/60 focus:outline-none"
                    >
                        <Avatar user={user} size={38} iconSize={20} />

                        <div className="hidden text-left sm:block">
                            <p className="text-sm font-semibold leading-tight text-stone-800 dark:text-stone-200">
                                {user?.name || "Clinic Staff"}
                            </p>
                            <p className="text-xs text-[#887d70] leading-tight dark:text-stone-400">
                                {formatRole(user?.role)}
                            </p>
                        </div>

                        <ChevronDown
                            size={14}
                            className={`hidden text-stone-400 transition-transform duration-200 sm:block ${
                                profileMenuOpen ? "rotate-180" : ""
                            }`}
                        />
                    </button>

                    {profileMenuOpen && (
                        <div className="absolute right-0 top-12 z-50 w-72 max-w-[calc(100vw-2rem)] rounded-2xl border border-[#e8dfd4] bg-white p-2 shadow-2xl dark:border-stone-800 dark:bg-[#1f1914] animate-in fade-in zoom-in-95 duration-150">
                            {/* User Info Header */}
                            <div className="flex items-center gap-3 border-b border-[#eee7de] px-3 py-3 dark:border-stone-800">
                                <Avatar user={user} size={42} iconSize={22} />
                                <div className="min-w-0 flex-1 text-left">
                                    <p className="truncate text-sm font-bold text-stone-900 dark:text-stone-100">
                                        {user?.name || "Clinic Staff"}
                                    </p>
                                    <p className="truncate text-xs text-[#887d70] dark:text-stone-400">
                                        {user?.email || "admin.clinic.edu@gmail.com"}
                                    </p>
                                    <span className="mt-1.5 inline-block rounded-full bg-[#70091f]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#70091f] dark:bg-[#70091f]/30 dark:text-[#f8a598]">
                                        {formatRole(user?.role)}
                                    </span>
                                </div>
                            </div>

                            {/* Dark Mode / Light Mode Switcher Row */}
                            <div className="border-b border-[#eee7de] p-1.5 dark:border-stone-800">
                                <button
                                    type="button"
                                    onClick={toggleTheme}
                                    role="switch"
                                    aria-checked={isDark}
                                    aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                                    className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 transition hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
                                            {isDark ? <Moon size={15} /> : <Sun size={15} />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                                                {isDark ? "Dark Mode" : "Light Mode"}
                                            </p>
                                            <p className="text-[10px] text-[#887d70] dark:text-stone-400">
                                                Tap to switch theme
                                            </p>
                                        </div>
                                    </div>
                                    <div
                                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors duration-200 ${
                                            isDark ? "bg-[#70091f]" : "bg-stone-300 dark:bg-stone-600"
                                        }`}
                                    >
                                        <span
                                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                                isDark ? "translate-x-4" : "translate-x-1"
                                            }`}
                                        />
                                    </div>
                                </button>
                            </div>

                            {/* Navigation Links */}
                            <div className="p-1 space-y-0.5">
                                <Link
                                    to="/profile"
                                    onClick={() => setProfileMenuOpen(false)}
                                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-[#fcebe7]/60 hover:text-[#70091f] dark:text-stone-300 dark:hover:bg-stone-800/60 dark:hover:text-[#f8a598]"
                                >
                                    <UserIcon size={15} className="text-[#70091f] dark:text-[#f8a598]" />
                                    <span>My Profile</span>
                                </Link>
                                <Link
                                    to="/settings"
                                    onClick={() => setProfileMenuOpen(false)}
                                    className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 transition hover:bg-[#fcebe7]/60 hover:text-[#70091f] dark:text-stone-300 dark:hover:bg-stone-800/60 dark:hover:text-[#f8a598]"
                                >
                                    <Settings size={15} className="text-[#70091f] dark:text-[#f8a598]" />
                                    <span>Settings</span>
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => {
                                        setProfileMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 cursor-pointer text-left"
                                >
                                    <LogOut size={15} />
                                    <span>Log Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal for Clear All Notifications */}
            <ConfirmationModal
                open={confirmClearNotifications}
                title="Clear All Notifications"
                message="Are you sure you want to clear all notifications? This action cannot be undone."
                confirmText="Yes, Clear All"
                cancelText="Cancel"
                danger={true}
                onConfirm={() => {
                    handleClearAll();
                    setConfirmClearNotifications(false);
                }}
                onClose={() => setConfirmClearNotifications(false)}
            />
        </header>
    );
}

export default Header;
