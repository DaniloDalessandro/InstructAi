import { jwtDecode } from "jwt-decode"
import { API_URL } from "../config/config"

interface JWTPayload {
  exp: number
}

// Limpa dados de autenticação e redireciona para login
function handleLogout(_reason: string) {
  // Limpar localStorage (dados do usuário)
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  localStorage.removeItem("user_id");
  localStorage.removeItem("user_email");
  localStorage.removeItem("user_name");
  
  // Limpar cookies
  document.cookie = "access=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "refresh=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  
  // Redirecionar para login
  window.location.href = "/login";
}

// Verifica se o token está prestes a expirar
function tokenExpiringSoon(token: string, thresholdSeconds = 60): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token)
    const now = Math.floor(Date.now() / 1000)
    return decoded.exp - now < thresholdSeconds
  } catch {
    return true // Se não conseguir decodificar, considerar como expirado
  }
}

// Verifica se o token é válido
function isTokenValid(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token)
    const now = Math.floor(Date.now() / 1000)
    return decoded.exp > now
  } catch {
    return false
  }
}

// Função para ler cookies
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const access = getCookie("access")
  const refresh = getCookie("refresh")

  // Se não há tokens, fazer logout
  if (!access && !refresh) {
    handleLogout("Nenhum token encontrado")
    return Promise.reject("No tokens available")
  }

  // Se não há access token mas há refresh, tentar renovar
  if (!access && refresh) {
    try {
      const response = await fetch(`${API_URL}/api/v1/accounts/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.access) {
          // NÃO armazenar em localStorage, apenas cookie (8 horas)
          document.cookie = `access=${data.access}; path=/; max-age=${8 * 60 * 60}; secure=${window.location.protocol === 'https:'}; samesite=strict`;
        }
      } else {
        handleLogout("Falha ao renovar token")
        return Promise.reject("Failed to refresh token")
      }
    } catch {
      handleLogout("Erro ao renovar token")
      return Promise.reject("Error refreshing token")
    }
  }

  // Verificar se o access token é válido
  const currentAccess = getCookie("access")
  if (currentAccess && !isTokenValid(currentAccess)) {
    // Token inválido, tentar renovar
    if (refresh) {
      try {
        const response = await fetch(`${API_URL}/api/v1/accounts/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        })

        if (response.ok) {
          const data = await response.json()
          if (data.access) {
            // NÃO armazenar em localStorage, apenas cookie
            document.cookie = `access=${data.access}; path=/; max-age=${15 * 60}; secure=${window.location.protocol === 'https:'}; samesite=strict`;
          }
        } else {
          handleLogout("Token expirado e falha ao renovar")
          return Promise.reject("Token expired and refresh failed")
        }
      } catch {
        handleLogout("Token expirado e erro ao renovar")
        return Promise.reject("Token expired and refresh error")
      }
    } else {
      handleLogout("Token expirado sem refresh token")
      return Promise.reject("Token expired without refresh token")
    }
  }

  // Verifica se o token está para expirar em breve e renova preventivamente
  const finalAccess = getCookie("access")
  if (finalAccess && tokenExpiringSoon(finalAccess) && refresh) {
    try {
      const response = await fetch(`${API_URL}/api/v1/accounts/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.access) {
          // NÃO armazenar em localStorage, apenas cookie (8 horas)
          document.cookie = `access=${data.access}; path=/; max-age=${8 * 60 * 60}; secure=${window.location.protocol === 'https:'}; samesite=strict`;
        }
      }
    } catch {
      // Ignorar erro na renovação preventiva, mas tentar com o token atual
    }
  }

  const updatedAccess = getCookie("access")

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
    Authorization: `Bearer ${updatedAccess}`,
  }
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  // Interceptar 401 — token inválido ou expirado
  if (response.status === 401) {
    handleLogout("Resposta 401 - Token inválido")
    return Promise.reject("Unauthorized - token invalid")
  }

  return response
}
