import { z } from "zod";

/**
 * Configuration is validated once, at boot. A missing secret should stop the
 * process immediately, not surface as an authentication bug at 2am.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET must be at least 32 characters"),

  DEVICE_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(365),
  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),

  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  /**
   * Returns login codes in the API response instead of emailing them.
   *
   * This is a testing escape hatch for a deployment with no mail provider
   * wired up yet. It means anyone who knows an email address can sign in as
   * that account, so it must be off before real users exist. Named loudly on
   * purpose.
   */
  UNSAFE_RETURN_LOGIN_CODES: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),

  /**
   * Hosts often expose a sibling service as `host:port` with no scheme —
   * Render's `hostport` property does exactly that — and `fetch` rejects
   * that outright. Normalise it rather than make the deployer notice.
   */
  VOICE_SERVICE_URL: z
    .string()
    .default("http://localhost:8000")
    .transform((v) => (/^https?:\/\//.test(v) ? v : `http://${v}`)),
  /** Below this, an inferred gender is treated as unknown. */
  VOICE_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.9),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  // A bare "Required" in a host's logs does not tell you where to go. Say
  // what is missing and where it is meant to come from.
  throw new Error(
    [
      "Invalid environment configuration:",
      issues,
      "",
      "Set these in your host's environment settings:",
      "  DATABASE_URL  - Postgres connection string",
      "  REDIS_URL     - Redis / Key Value connection string",
      "  JWT_SECRET    - 32+ random characters",
      "  CORS_ORIGIN   - your frontend URL, no trailing slash",
      "",
      "Locally these come from backend/.env (see .env.example).",
    ].join("\n"),
  );
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";

/**
 * A hosted deployment pointing at 127.0.0.1 is the single most common way
 * this goes wrong: the values in .env.example are real and they work
 * locally, so they get pasted into a host's settings, where localhost means
 * "this container" and nothing is listening.
 *
 * Prisma's own error ("Can't reach database server at 127.0.0.1:5434") does
 * not explain that, so catch it here and say what to do instead.
 */
if (isProd) {
  const local = /(localhost|127\.0\.0\.1|::1)/;
  const offenders = (
    [
      ["DATABASE_URL", env.DATABASE_URL],
      ["REDIS_URL", env.REDIS_URL],
    ] as const
  ).filter(([, value]) => local.test(value));

  if (offenders.length > 0) {
    throw new Error(
      [
        `These point at localhost but NODE_ENV is production: ${offenders
          .map(([key]) => key)
          .join(", ")}`,
        "",
        "On a hosting provider, localhost is the container this process runs",
        "in — your database is not there. Use the provider's own connection",
        "string:",
        "",
        "  Render   Postgres / Key Value -> Internal Connection String",
        "  Railway  the service -> Variables -> DATABASE_URL / REDIS_URL",
        "  Fly.io   fly postgres attach",
        "",
        "The values in .env.example are for local Docker only.",
      ].join("\n"),
    );
  }

  if (env.JWT_SECRET.startsWith("replace-me")) {
    throw new Error(
      [
        "JWT_SECRET is still the placeholder from .env.example.",
        "Generate one:",
        "  node -e \"console.log(require('crypto').randomBytes(48).toString('base64url'))\"",
      ].join("\n"),
    );
  }
}
