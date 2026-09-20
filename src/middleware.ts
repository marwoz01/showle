import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/opengraph-image(.*)",
  "/credits",
  "/privacy",
  "/terms",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/play(.*)",
  "/recommend(.*)",
  "/api/movies(.*)",
  "/api/game/state",
  "/api/game/complete",
  "/api/higher-lower",
  "/api/duel(.*)",
  "/api/recommend(.*)",
  "/api/health",
  "/api/maintenance",
  "/api/webhooks/clerk",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
