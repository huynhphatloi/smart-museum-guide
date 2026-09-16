import { z } from 'zod';

/**
 * Environment schema. The application refuses to boot with an invalid or
 * incomplete environment instead of failing later at request time.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  JWT_SECRET: z.string().min(8, 'JWT_SECRET must be at least 8 characters'),
  JWT_EXPIRES_IN: z.string().default('12h'),

  PORT: z.coerce.number().int().positive().default(3001),
  PUBLIC_BASE_URL: z.string().url().default('http://localhost:3001'),
  /// Base URL of the Visitor Web app - used to build the QR payload for a zone.
  VISITOR_WEB_URL: z.string().url().default('http://localhost:4173'),

  UPLOAD_DIR: z.string().default('uploads'),
  MAX_UPLOAD_SIZE_MB: z.coerce.number().int().positive().default(25),

  DEFAULT_LANGUAGE: z.string().min(2).default('vi'),
  SUPPORTED_LANGUAGES: z
    .string()
    .default('vi,en,ja,ko,zh,zh-hant,th,id,ms,km,lo,fil,fr,de,es,ru,it,pt,nl,pl,cs,sv,ar,hi,tr,uk'),

  CORS_ORIGINS: z.string().default('http://localhost:4000,http://localhost:4173'),

  SEED_ADMIN_EMAIL: z.string().email().default('admin@museum.local'),
  SEED_ADMIN_PASSWORD: z.string().min(6).default('Admin@12345'),

  /** Optional. When unset, exhibit save still works; auto-translate + TTS is skipped. */
  OPENAI_API_KEY: z.string().optional(),
});

export type RawEnv = z.infer<typeof envSchema>;

export interface AppConfig {
  nodeEnv: RawEnv['NODE_ENV'];
  databaseUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
  port: number;
  publicBaseUrl: string;
  visitorWebUrl: string;
  uploadDir: string;
  maxUploadSizeBytes: number;
  defaultLanguage: string;
  supportedLanguages: string[];
  corsOrigins: string[];
  seedAdminEmail: string;
  seedAdminPassword: string;
  openaiApiKey?: string;
}

const splitList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

/**
 * Parses `process.env` into a strongly typed configuration object.
 * Throws a readable error listing every invalid variable.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  const value = parsed.data;
  const defaultLanguage = value.DEFAULT_LANGUAGE.toLowerCase();
  const supportedLanguages = splitList(value.SUPPORTED_LANGUAGES).map((code) => code.toLowerCase());

  if (!supportedLanguages.includes(defaultLanguage)) {
    supportedLanguages.unshift(defaultLanguage);
  }

  return {
    nodeEnv: value.NODE_ENV,
    databaseUrl: value.DATABASE_URL,
    jwtSecret: value.JWT_SECRET,
    jwtExpiresIn: value.JWT_EXPIRES_IN,
    port: value.PORT,
    publicBaseUrl: value.PUBLIC_BASE_URL.replace(/\/$/, ''),
    visitorWebUrl: value.VISITOR_WEB_URL.replace(/\/$/, ''),
    uploadDir: value.UPLOAD_DIR,
    maxUploadSizeBytes: value.MAX_UPLOAD_SIZE_MB * 1024 * 1024,
    defaultLanguage,
    supportedLanguages,
    corsOrigins: splitList(value.CORS_ORIGINS),
    seedAdminEmail: value.SEED_ADMIN_EMAIL,
    seedAdminPassword: value.SEED_ADMIN_PASSWORD,
    openaiApiKey: value.OPENAI_API_KEY?.trim() || undefined,
  };
}

export const APP_CONFIG = 'APP_CONFIG';
