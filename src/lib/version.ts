// lib/version.ts
export const VERSION = parseInt(process.env.NEXT_PUBLIC_VERSION || '1');

export const featureFlags = {
  socialsEnabled: VERSION >= 3, // Keep socials disabled for v2
  servicesEnabled: VERSION >= 2,
  // add other flags here as needed
};
