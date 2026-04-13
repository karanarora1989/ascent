// Admin email configuration
const ADMIN_EMAIL = 'karanarora1989@gmail.com';

/**
 * Check if a user email is an admin
 */
export function isAdmin(userEmail: string | null | undefined): boolean {
  if (!userEmail) return false;
  return userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

/**
 * Get admin email (for reference)
 */
export function getAdminEmail(): string {
  return ADMIN_EMAIL;
}
