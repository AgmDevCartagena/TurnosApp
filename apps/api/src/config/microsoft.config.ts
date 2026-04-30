import { registerAs } from '@nestjs/config';

export default registerAs('microsoft', () => ({
  tenantId: process.env.MICROSOFT_TENANT_ID,
  clientId: process.env.MICROSOFT_CLIENT_ID,
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3000/auth/callback',
  allowedDomains: process.env.MICROSOFT_ALLOWED_DOMAINS?.split(',').map(d => d.trim().toLowerCase()) || [],
  autoProvision: process.env.MICROSOFT_AUTO_PROVISION === 'true',
  defaultRole: process.env.MICROSOFT_DEFAULT_ROLE || 'solicitante',
}));
