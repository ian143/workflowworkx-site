/**
 * Founder Access Configuration
 *
 * Founders get full access without Stripe subscription.
 * Add founder emails here to grant permanent active status.
 */

const FOUNDER_EMAILS = [
  "ian@workflowworkx.com",
];

export function isFounder(email: string): boolean {
  return FOUNDER_EMAILS.includes(email.toLowerCase());
}
