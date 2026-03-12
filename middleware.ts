
import { clerkMiddleware } from "@clerk/nextjs/server";

const publicRoutes = ['/', '/gallery', '/pricing', '/login(.*)', '/signup(.*)', '/api/users(.*)'];

export default clerkMiddleware({ publicRoutes });

export const config = {
  matcher: ['/((?!.*\\..*|_next).)*', '/', '/(api|trpc)(.*)'],
};
