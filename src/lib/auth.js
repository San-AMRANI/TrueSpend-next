// src/lib/auth.js
const VALID_USER = 'SanSpend';
const VALID_PASS = '!4ZwqYFBHX*r@f';

function verifyBasicAuth(authHeader) {
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;
  const b64 = authHeader.slice(6);
  const decoded = Buffer.from(b64, 'base64').toString('utf-8');
  const [user, ...rest] = decoded.split(':');
  const pass = rest.join(':');
  return user === VALID_USER && pass === VALID_PASS;
}

function verifyCookieToken(cookieHeader) {
  if (!cookieHeader) return false;
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => c.trim().split('=').map(decodeURIComponent))
  );
  return cookies['auth_token'] === 'TrueSpend_Authorized';
}

function verifyApiAuth(request) {
  const authHeader = request.headers.get('authorization') || '';
  return verifyBasicAuth(authHeader);
}

module.exports = { verifyApiAuth, verifyCookieToken, VALID_USER, VALID_PASS };
