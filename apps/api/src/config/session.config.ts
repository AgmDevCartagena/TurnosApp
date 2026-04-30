import { registerAs } from '@nestjs/config';

export default registerAs('session', () => ({
  ttl: parseInt(process.env.SESSION_TTL || '86400', 10),
  cookieName: process.env.SESSION_COOKIE_NAME || 'session_id',
}));
