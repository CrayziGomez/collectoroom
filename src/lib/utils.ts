import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Resolves a user's display name from available sources.
 * Priority: DB username > Clerk username > Clerk firstName > Clerk fullName > email prefix > 'User'
 */
export function resolveDisplayName(
  dbUsername: string | null | undefined,
  clerkUser?: { username?: string | null; firstName?: string | null; fullName?: string | null; emailAddresses?: { emailAddress: string }[] } | null
): string {
  if (dbUsername) return dbUsername;
  if (clerkUser?.username) return clerkUser.username;
  if (clerkUser?.firstName) return clerkUser.firstName;
  if (clerkUser?.fullName) return clerkUser.fullName;
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
  if (email) return email.split('@')[0];
  return 'User';
}
