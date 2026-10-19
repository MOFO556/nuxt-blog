if (process.env.APP_JWT_SECRET == undefined) {
	console.log("cant work without APP_JWT_SECRET in env");
	process.exit(1);
}

export const AUTH_JWT_ALG = 'HS256';
export const AUTH_JWT_SECRET = process.env.APP_JWT_SECRET;
