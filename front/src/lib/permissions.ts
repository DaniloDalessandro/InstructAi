/**
 * Utilitários para verificação de permissões
 */

export interface PermissibleResource {
  created_by?: string;
}

/**
 * Verifica se o usuário atual pode editar/deletar um recurso
 *
 * @param resource - Recurso com campo created_by
 * @param userEmail - Email do usuário atual
 * @returns true se o usuário pode editar/deletar
 */
export function canEditOrDelete(
  resource: PermissibleResource | null | undefined,
  userEmail: string | null | undefined
): boolean {
  if (!resource || !userEmail) {
    return false;
  }

  // Se o recurso não tem created_by, não permitir
  if (!resource.created_by) {
    return false;
  }

  // Verificar se o email do usuário corresponde ao criador
  return resource.created_by === userEmail;
}

/**
 * Verifica se o usuário atual é o criador do recurso
 *
 * @param resource - Recurso com campo created_by
 * @param userEmail - Email do usuário atual
 * @returns true se o usuário é o criador
 */
export function isOwner(
  resource: PermissibleResource | null | undefined,
  userEmail: string | null | undefined
): boolean {
  return canEditOrDelete(resource, userEmail);
}
