/**
 * Utilitários para verificação de permissões.
 *
 * A fonte de verdade é o campo `user_permissions` retornado pela API
 * (calculado no backend com base em owner, shared_admins e is_staff).
 */

export interface UserPermissions {
  can_edit: boolean;
  can_delete: boolean;
  can_manage_access: boolean;
}

export interface PermissibleResource {
  user_permissions?: UserPermissions;
}

const DENY: UserPermissions = {
  can_edit: false,
  can_delete: false,
  can_manage_access: false,
};

function getPerms(resource: PermissibleResource | null | undefined): UserPermissions {
  return resource?.user_permissions ?? DENY;
}

/**
 * O usuário pode editar ou excluir o recurso?
 * Mantido por compatibilidade — prefira `canEdit` ou `canDelete` diretamente.
 */
export function canEditOrDelete(
  resource: PermissibleResource | null | undefined,
  _userEmail?: string | null,
): boolean {
  return getPerms(resource).can_edit;
}

/** O usuário pode editar o recurso? */
export function canEdit(resource: PermissibleResource | null | undefined): boolean {
  return getPerms(resource).can_edit;
}

/** O usuário pode excluir o recurso? */
export function canDelete(resource: PermissibleResource | null | undefined): boolean {
  return getPerms(resource).can_delete;
}

/** O usuário pode gerenciar quem tem acesso (shared_admins)? */
export function canManageAccess(resource: PermissibleResource | null | undefined): boolean {
  return getPerms(resource).can_manage_access;
}

/**
 * @deprecated Use `canEdit` em vez desta função.
 */
export function isOwner(
  resource: PermissibleResource | null | undefined,
  _userEmail?: string | null,
): boolean {
  return getPerms(resource).can_edit;
}
