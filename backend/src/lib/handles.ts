const ADJECTIVES = [
  "Calm", "Swift", "Bright", "Quiet", "Idle", "Loud", "Kind", "Brave",
  "Sharp", "Gentle", "Lucky", "Odd", "Warm", "Bold", "Still", "Keen",
];

const ANIMALS = [
  "Panda", "Falcon", "Otter", "Heron", "Marten", "Crane", "Lynx", "Ibis",
  "Tapir", "Gecko", "Raven", "Bison", "Moth", "Shrew", "Perch", "Quail",
];

/**
 * A stable two-word handle for a guest.
 *
 * The naming is load-bearing: the call history screen tells users that
 * "two-word names are guests, a real first name means a verified account",
 * so an account holder must never be given one of these.
 */
export function guestHandle(deviceId: string): string {
  let hash = 0;
  for (let i = 0; i < deviceId.length; i++) {
    hash = (hash * 31 + deviceId.charCodeAt(i)) >>> 0;
  }
  const a = ADJECTIVES[hash % ADJECTIVES.length]!;
  const b = ANIMALS[Math.floor(hash / ADJECTIVES.length) % ANIMALS.length]!;
  return `${a} ${b}`;
}

export function ageFrom(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const before =
    now.getMonth() < dateOfBirth.getMonth() ||
    (now.getMonth() === dateOfBirth.getMonth() &&
      now.getDate() < dateOfBirth.getDate());
  if (before) age -= 1;
  return age;
}
