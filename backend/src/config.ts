import 'dotenv/config'

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback
  if (v === undefined || v === '') throw new Error(`Missing env ${name}`)
  return v
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  db: {
    host: req('DATABASE_HOST', '127.0.0.1'),
    port: Number(process.env.DATABASE_PORT ?? 3306),
    database: req('DATABASE_NAME', 'it_department'),
    user: req('DATABASE_USER', 'it_department_app'),
    password: req('DATABASE_PASSWORD', 'changeme'),
  },
  jwt: {
    secret: req('JWT_SECRET', 'dev-secret-change-in-production'),
    accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
}
