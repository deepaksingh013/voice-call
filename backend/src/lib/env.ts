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

  VOICE_SERVICE_URL: z.string().default("http://localhost:8000"),
  /** Below this, an inferred gender is treated as unknown. */
  VOICE_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.9),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === "production";
