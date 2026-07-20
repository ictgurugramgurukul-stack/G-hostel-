// Mirrors src/hooks/use-auth.tsx, but as plain module-level state backed by
// localStorage instead of a React context.
const TOKEN_KEY = "gurukul_access_token";
export function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}
export function isLoggedIn() {
    return !!getToken();
}
