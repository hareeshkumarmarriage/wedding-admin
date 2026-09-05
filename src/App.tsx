import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import GlobalFullscreenButton from "./components/wedding/GlobalFullscreenButton";
import PageAvailabilityGate from "./components/PageAvailabilityGate";
import PageLoadingOverlay from "./components/wedding/PageLoadingOverlay";

const DriveGallery = lazy(() => import("./pages/DriveGallery.tsx"));
const DriveVideos = lazy(() => import("./pages/DriveVideos.tsx"));
const AdminPlatform = lazy(() => import("./pages/AdminPlatform.tsx"));
const AdminLegacy = lazy(() => import("./pages/Admin.tsx"));
const GuestUpload = lazy(() => import("./pages/GuestUpload.tsx"));

const RouteFallback = () => (
  <main className="grid min-h-screen place-items-center bg-wedding-cream">
    <div className="flex items-center gap-3 text-sm text-muted-foreground">
      <Loader2 className="animate-spin" size={20} /> Loading…
    </div>
  </main>
);

const App = () => (
  <TooltipProvider>
    <Toaster />
    <Sonner />
    <GlobalFullscreenButton />
    <BrowserRouter>
      <PageLoadingOverlay />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/gallery" element={<PageAvailabilityGate page="gallery"><DriveGallery /></PageAvailabilityGate>} />
          <Route path="/videos" element={<PageAvailabilityGate page="videos"><DriveVideos /></PageAvailabilityGate>} />
          <Route path="/admin" element={<AdminLegacy />} />
          <Route path="/admin/platform" element={<AdminPlatform />} />
          <Route path="/admin/legacy" element={<AdminLegacy />} />
          <Route path="/upload" element={<PageAvailabilityGate page="upload"><GuestUpload /></PageAvailabilityGate>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </TooltipProvider>
);

export default App;
