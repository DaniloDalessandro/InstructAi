import { jwtDecode } from 'jwt-decode';
import { API_URL } from '../config/config';

interface JWTPayload {exp: number}
let refreshing: Promise<string> | null = null;

function cookie(name: string): string | null {
  const value = document.cookie.split('; ').find(item => item.startsWith(`${name}=`))?.slice(name.length + 1);
  return value ? decodeURIComponent(value) : null;
}

function clearSession(expectedAccess?: string | null, expectedRefresh?: string | null) {
  if (expectedAccess !== undefined && cookie('access') !== expectedAccess) return;
  if (expectedRefresh !== undefined && cookie('refresh') !== expectedRefresh) return;
  for (const name of ['access', 'refresh', 'user', 'access_token', 'refresh_token', 'user_id', 'user_email', 'user_name']) {
    localStorage.removeItem(name);
    document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
  }
  window.location.href = '/login';
}

function validFor(token: string | null, seconds: number): boolean {
  if (!token) return false;
  try {return jwtDecode<JWTPayload>(token).exp > Date.now()/1000 + seconds;} catch {return false;}
}

async function refreshAccess(): Promise<string> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refresh = cookie('refresh');
    if (!refresh) {clearSession(); throw new Error('Sua sessão expirou. Entre novamente.');}
    const response = await fetch(`${API_URL}/api/v1/accounts/token/refresh/`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({refresh}),
    });
    if (!response.ok) {
      const currentAccess = cookie('access');
      if (cookie('refresh') !== refresh && validFor(currentAccess,0)) return currentAccess!;
      if (response.status === 401 || response.status === 400) clearSession(undefined,refresh);
      throw new Error('Não foi possível renovar a sessão. Tente novamente.');
    }
    const data = await response.json();
    if (!validFor(data.access,0)) {clearSession(undefined,refresh); throw new Error('Sessão inválida. Entre novamente.');}
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `access=${encodeURIComponent(data.access)}; path=/; max-age=3600; SameSite=Lax${secure}`;
    return data.access;
  })();
  try {return await refreshing;} finally {refreshing = null;}
}

export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let access = cookie('access');
  if (!validFor(access,60)) {
    if (cookie('refresh')) {
      try {access = await refreshAccess();}
      catch (error) {if (!validFor(access,0)) throw error;}
    } else if (!validFor(access,0)) {
      clearSession(access,null); throw new Error('Sua sessão expirou. Entre novamente.');
    }
  }
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${access}`);
  if (options.body instanceof FormData) headers.delete('Content-Type');
  else if (!headers.has('Content-Type')) headers.set('Content-Type','application/json');
  let response = await fetch(url,{...options,headers});
  if (response.status === 401 && cookie('refresh')) {
    const token = await refreshAccess();
    access = token;
    headers.set('Authorization',`Bearer ${token}`);
    response = await fetch(url,{...options,headers});
  }
  if (response.status === 401) {
    clearSession(access,cookie('refresh')); throw new Error('Sua sessão expirou. Entre novamente.');
  }
  return response;
}
