export const AUTH_TOKEN_KEY = 'idea_token';
export const AUTH_USER_KEY = 'idea_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function setStoredUser(user: unknown) {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(AUTH_USER_KEY);
}

export function clearAuthStorage() {
  clearToken();
  clearStoredUser();
}
