import { AUTH_SESSION_LIFETIME_MS } from '~~/shared/auth';

if (process.env.APP_JWT_SECRET == undefined) {
	console.log("cant work without APP_JWT_SECRET in env");
	process.exit(1);
}

export const AUTH_JWT_ALG = 'HS256';
export const AUTH_JWT_SECRET = process.env.APP_JWT_SECRET;
export const AUTH_JWT_LIFETIME = AUTH_SESSION_LIFETIME_MS;
