import React, { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcw, Home } from "lucide-react";
import tccLogo from "../../assets/tcc-logo.png";

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);

        const msg = String(error?.message || "").toLowerCase();
        const isChunkError =
            msg.includes("dynamically imported module") ||
            msg.includes("failed to fetch") ||
            msg.includes("importing a module script failed") ||
            error?.name === "ChunkLoadError";

        if (isChunkError && typeof window !== "undefined") {
            const lastReload = Number(sessionStorage.getItem("tcc-eb-reload-ts") || "0");
            const now = Date.now();
            if (now - lastReload > 8000) {
                sessionStorage.setItem("tcc-eb-reload-ts", String(now));
                sessionStorage.removeItem("tcc-chunk-reload-ts");
                sessionStorage.removeItem("tcc-chunk-reload-retry");
                sessionStorage.removeItem("tcc-chunk-reload-occurred");
                window.location.reload();
            }
        }
    }

    private handleReload = () => {
        if (typeof window !== "undefined") {
            sessionStorage.removeItem("tcc-eb-reload-ts");
            sessionStorage.removeItem("tcc-chunk-reload-ts");
            sessionStorage.removeItem("tcc-chunk-reload-retry");
            sessionStorage.removeItem("tcc-chunk-reload-occurred");
            window.location.reload();
        }
    };

    private handleGoHome = () => {
        this.setState({ hasError: false, error: null });
        if (typeof window !== "undefined") {
            sessionStorage.removeItem("tcc-eb-reload-ts");
            sessionStorage.removeItem("tcc-chunk-reload-ts");
            sessionStorage.removeItem("tcc-chunk-reload-retry");
            sessionStorage.removeItem("tcc-chunk-reload-occurred");
            window.location.href = "/dashboard";
        }
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="flex min-h-[60vh] w-full items-center justify-center p-6">
                    <style>{`
                        @keyframes tccFloat {
                            0%, 100% { transform: translateY(0px) scale(1); }
                            50% { transform: translateY(-6px) scale(1.02); }
                        }
                        @keyframes tccGlow {
                            0%, 100% { opacity: 0.35; transform: scale(0.95); }
                            50% { opacity: 0.75; transform: scale(1.08); }
                        }
                        .animate-tcc-float {
                            animation: tccFloat 3s ease-in-out infinite;
                        }
                        .animate-tcc-glow {
                            animation: tccGlow 2.5s ease-in-out infinite;
                        }
                    `}</style>
                    <div className="w-full max-w-md rounded-2xl border border-[#e8dfd4] bg-white p-7 text-center shadow-lg dark:border-[#382f25] dark:bg-[#251f19] animate-in fade-in zoom-in-95 duration-300">
                        {/* Animated TCC Logo Container */}
                        <div className="relative mx-auto mb-5 flex h-24 w-24 items-center justify-center">
                            {/* Ambient Glow */}
                            <div className="absolute -inset-2 rounded-full bg-gradient-to-tr from-[#70091f]/30 via-amber-500/20 to-[#70091f]/30 blur-md animate-tcc-glow" />

                            {/* Ping Ring */}
                            <div className="absolute -inset-1 rounded-full border border-[#70091f]/30 animate-ping opacity-30" />

                            {/* Logo Frame with Floating Animation */}
                            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl border border-[#e8dfd4] bg-white p-2 shadow-md dark:border-[#4e4234] dark:bg-[#211c17] animate-tcc-float">
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
                                    className="h-16 w-16 rounded-full object-contain drop-shadow"
                                />
                            </div>
                        </div>

                        <h2 className="text-xl font-bold tracking-tight text-[#3d3329] dark:text-[#f4ecdf]">
                            Something went wrong
                        </h2>

                        <p className="mt-2 text-sm text-[#887d70] dark:text-stone-400">
                            The requested module could not be displayed properly. This may be due to a temporary connection issue or a system update.
                        </p>

                        {this.state.error?.message && (
                            <details className="mt-4 text-left text-xs text-[#a99d8f] dark:text-stone-500">
                                <summary className="cursor-pointer hover:underline text-center">
                                    Show Technical Details
                                </summary>
                                <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-[#fcfaf6] p-2 font-mono text-[11px] text-red-600 dark:bg-[#1a1612] dark:text-red-400">
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}

                        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={this.handleReload}
                                className="group inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[#70091f] px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#70091f]/20 transition-all duration-200 hover:bg-[#5b0719] hover:shadow-lg hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#70091f] cursor-pointer"
                            >
                                <RotateCcw size={16} className="transition-transform duration-500 group-hover:-rotate-180" />
                                Reload Page
                            </button>

                            <button
                                type="button"
                                onClick={this.handleGoHome}
                                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[#e8dfd4] bg-[#fcfaf6] px-5 py-2.5 text-sm font-semibold text-[#5a4d3f] shadow-xs transition-all duration-200 hover:bg-[#f3ebd9] hover:scale-[1.02] active:scale-95 dark:border-[#382f25] dark:bg-[#1a1612] dark:text-stone-300 dark:hover:bg-[#2a241e] cursor-pointer"
                            >
                                <Home size={16} />
                                Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

