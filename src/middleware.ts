
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// Define the routes that should be publicly accessible
const isPublicRoute = createRouteMatcher([
  '/',
  '/login(.*)',
  '/signup(.*)',
  '/forgot-password(.*)',
  '/about',
  '/contact',
  '/terms',
  '/pricing',
  '/gallery',
  '/profile/(.*)',
  '/collections/(.*)',
  '/api/auth',
]);

export default clerkMiddleware((auth, req) => {
  // Protect all routes that are not public
  if (!isPublicRoute(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ['/((?!.*\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
