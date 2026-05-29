/**
 * App.tsx — Updated
 *
 * Key changes:
 * 1. Global maintenance & per-page locks now render INSIDE the layout
 *    so Navbar, Sidebar and MobileNav always show → users can navigate elsewhere
 * 2. Per-page lock uses PageLocked component with countdown timer
 * 3. Polling hook for real-time maintenance sync
 */
import { startHeartbeat, getSessionId } from "./hooks/useAnalytics";

import WatchOffline from "./pages/WatchOffline";

import MobileNav from "./components/MobileNav";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Footer from "./components/Footer";
import LenzorahSplash from "./components/Lenzorahsplash";
import ScrollToTopButton from "./components/ScrollToTopButton";

import Home from "./pages/Home";
import Explore from "./pages/Explore";
import Search from "./pages/Search";
import MovieDetails from "./pages/MovieDetails";
import Watch from "./pages/Watch";
import Downloads from "./pages/Downloads";
import Watchlist from "./pages/Watchlist";
import Anime from "./pages/Anime";
import Kdrama from "./pages/Kdrama";
import Genre from "./pages/Genre";
import Trending from "./pages/Trending";
import Actor from "./pages/Actor";
import Collections from "./pages/Collections";
import Sports from "./pages/Sports";
import HistoryPage from "./pages/History";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import DMCA from "./pages/DMCA";
import RunMode from "./pages/RunMode";
import Daratech from "./pages/Daratech";
import Maintenance from "./pages/Maintenance";
import PageLocked from "./pages/PageLocked";

import {
  useMaintenanceStore,
  LOCKABLE_PAGES,
} from "./stores/useMaintenanceStore";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      retry: 2,
    },
  },
});

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppContent() {
  const location = useLocation();
  const isWatchPage = location.pathname.startsWith("/watch");
  const isAdminPage = location.pathname.startsWith("/daratech");

  const { isMaintenanceMode, isBypassed, getPageLock } = useMaintenanceStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const stop = startHeartbeat(getSessionId());
    return stop;
  }, []);

  // ── Real-time maintenance polling (MongoDB sync) ──────────────────────────
  useEffect(() => {
    const stopPolling = useMaintenanceStore.getState().startPolling();
    return stopPolling;
  }, []);

  // ── Same-browser tab sync ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === "rf-maintenance") useMaintenanceStore.persist.rehydrate();
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  // ── Check per-page lock ───────────────────────────────────────────────────
  const pageLock =
    !isBypassed && !isAdminPage ? getPageLock(location.pathname) : null;
  const lockedPage = pageLock
    ? LOCKABLE_PAGES.find(
        (p) =>
          location.pathname === p.path || location.pathname.startsWith(p.path),
      )
    : null;

  const desktopMargin =
    !isWatchPage && !isAdminPage && !isMobile
      ? sidebarOpen
        ? "280px"
        : "72px"
      : "0px";

  // ── Decide what to render in <main> ──────────────────────────────────────
  const renderMainContent = () => {
    // Global maintenance — full page shutdown (admin only can bypass)
    if (isMaintenanceMode && !isBypassed && !isAdminPage) {
      return <Maintenance />;
    }

    // Per-page lock — show locked screen but nav still works
    if (pageLock && lockedPage) {
      return <PageLocked lock={pageLock} pageName={lockedPage.label} />;
    }

    // Normal routes
    return (
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/search" element={<Search />} />
        <Route path="/movie/:slug" element={<MovieDetails />} />
        <Route path="/watch/:slug" element={<Watch />} />
        <Route path="/watch-offline/:id" element={<WatchOffline />} />
        <Route path="/downloads" element={<Downloads />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="/anime" element={<Anime />} />
        <Route path="/kdrama" element={<Kdrama />} />
        <Route path="/sports" element={<Sports />} />
        <Route path="/genre/:name" element={<Genre />} />
        <Route path="/trending" element={<Trending />} />
        <Route path="/actor/:name" element={<Actor />} />
        <Route path="/collections" element={<Collections />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/dmca" element={<DMCA />} />
        <Route path="/run-mode" element={<RunMode />} />
        <Route path="/daratech" element={<Daratech />} />
      </Routes>
    );
  };

  return (
    <div className="min-h-screen flex flex-col text-white antialiased relative overflow-x-hidden bg-[#030305]">
      {/* Ambient Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-[var(--rf-red)]/[0.03] blur-[150px] animate-float-slow" />
        <div className="absolute -bottom-[15%] -right-[15%] w-[65vw] h-[65vw] rounded-full bg-purple-600/[0.03] blur-[160px] animate-float-mid" />
        <div className="absolute top-[35%] right-[-10%] w-[45vw] h-[45vw] rounded-full bg-blue-600/[0.02] blur-[140px] animate-float-slow" />
      </div>

      {/* Toast */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: "#111118",
            color: "#e8e8ed",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
            fontSize: "13px",
            padding: "12px 16px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          },
          success: { iconTheme: { primary: "#e50914", secondary: "#fff" } },
        }}
      />

      {/* Navbar — always visible except admin */}
      {!isAdminPage && (
        <Navbar
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
      )}

      {/* Sidebar — always visible except watch/admin */}
      {!isWatchPage && !isAdminPage && (
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />
      )}

      {/* Mobile Nav — always visible except watch/admin */}
      {!isWatchPage && !isAdminPage && <MobileNav />}

      {/* Content + Footer wrapper */}
      <div
        className="flex flex-col min-h-screen transition-all duration-300 relative z-10"
        style={{ marginLeft: desktopMargin }}
      >
        <main
          className={`flex-1 transition-all duration-300 ${
            isAdminPage
              ? "pt-0 pb-0"
              : isWatchPage
                ? "pt-2 pb-6"
                : "pt-[calc(56px+var(--safe-top))] md:pt-[calc(72px+var(--safe-top))] pb-[calc(80px+var(--safe-bottom))] md:pb-0"
          }`}
        >
          {renderMainContent()}
        </main>

        {/* Footer — always visible except watch/admin */}
        {!isWatchPage && !isAdminPage && <Footer />}
      </div>

      {/* Scroll to top button */}
      <ScrollToTopButton />
    </div>
  );
}

export default function App() {
  const [splashDone, setSplashDone] = useState(
    () => sessionStorage.getItem("lenzorah-splash-shown") === "true",
  );

  const handleSplashComplete = () => {
    sessionStorage.setItem("lenzorah-splash-shown", "true");
    setSplashDone(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      {!splashDone && <LenzorahSplash onComplete={handleSplashComplete} />}
      <BrowserRouter>
        <ScrollToTop />
        <div
          style={{
            opacity: splashDone ? 1 : 0,
            transition: "opacity 0.4s ease",
            pointerEvents: splashDone ? "auto" : "none",
          }}
        >
          <AppContent />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
