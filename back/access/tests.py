"""
Testes do sistema de permissões do InstructAI.

Cobre todas as regras da hierarquia de acesso:
  1. Dono do conteúdo
  2. Administrador delegado
  3. Administrador do sistema (is_staff / is_superuser)
  4. Usuário comum (leitura apenas)
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

User = get_user_model()


# ─── Helpers ──────────────────────────────────────────────────

def make_user(email, is_staff=False, is_superuser=False):
    u = User.objects.create_user(email=email, password="Test1234!", name=email.split("@")[0])
    u.is_staff = is_staff
    u.is_superuser = is_superuser
    u.save()
    return u


def auth(client, user):
    """Obtém token JWT e configura o client."""
    r = client.post("/api/auth/token/", {"email": user.email, "password": "Test1234!"}, format="json")
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")


# ─── Fixtures comuns ──────────────────────────────────────────

class BasePermissionTest(TestCase):
    """Cria usuários base reutilizados em todos os testes."""

    @classmethod
    def setUpTestData(cls):
        cls.owner = make_user("owner@test.com")
        cls.delegated = make_user("delegated@test.com")
        cls.system_admin = make_user("admin@test.com", is_staff=True)
        cls.regular = make_user("regular@test.com")

        # Sector e Tag necessários pelos models
        from sectors.models import Sector
        from tags.models import Tag
        cls.sector = Sector.objects.create(name="Test Sector")
        cls.tag = Tag.objects.create(name="tag1", color="#000000")

    def setUp(self):
        self.client = APIClient()


# ═══════════════════════════════════════════════════════════════
# TESTES DE MANUAL
# ═══════════════════════════════════════════════════════════════

class ManualPermissionTest(BasePermissionTest):
    """Testes de permissão para a entidade Manual."""

    def _create_manual(self):
        """Cria um manual como owner e retorna o id."""
        auth(self.client, self.owner)
        import tempfile, os
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
            f.write(b"%PDF-1.4 fake")
            tmp_path = f.name
        try:
            with open(tmp_path, "rb") as f:
                r = self.client.post(
                    "/api/manuals/",
                    {"name": "Manual Teste", "sectors": [self.sector.id], "pdf_file": f},
                    format="multipart",
                )
        finally:
            os.unlink(tmp_path)
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        manual_id = r.data["id"]
        # Adicionar delegado
        from manual.models import Manual
        manual = Manual.objects.get(pk=manual_id)
        manual.shared_admins.add(self.delegated)
        return manual_id

    def test_owner_can_edit(self):
        manual_id = self._create_manual()
        auth(self.client, self.owner)
        r = self.client.patch(f"/api/manuals/{manual_id}/", {"name": "Editado"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_delegated_can_edit(self):
        manual_id = self._create_manual()
        auth(self.client, self.delegated)
        r = self.client.patch(f"/api/manuals/{manual_id}/", {"name": "Editado Delegado"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_regular_user_cannot_edit(self):
        manual_id = self._create_manual()
        auth(self.client, self.regular)
        r = self.client.patch(f"/api/manuals/{manual_id}/", {"name": "Proibido"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_system_admin_can_edit(self):
        manual_id = self._create_manual()
        auth(self.client, self.system_admin)
        r = self.client.patch(f"/api/manuals/{manual_id}/", {"name": "Admin Edit"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_owner_can_delete(self):
        manual_id = self._create_manual()
        auth(self.client, self.owner)
        r = self.client.delete(f"/api/manuals/{manual_id}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_delegated_cannot_delete(self):
        manual_id = self._create_manual()
        auth(self.client, self.delegated)
        r = self.client.delete(f"/api/manuals/{manual_id}/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_delete(self):
        manual_id = self._create_manual()
        auth(self.client, self.regular)
        r = self.client.delete(f"/api/manuals/{manual_id}/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_system_admin_can_delete(self):
        manual_id = self._create_manual()
        auth(self.client, self.system_admin)
        r = self.client.delete(f"/api/manuals/{manual_id}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_regular_user_can_read(self):
        manual_id = self._create_manual()
        auth(self.client, self.regular)
        r = self.client.get(f"/api/manuals/{manual_id}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_user_permissions_field_in_response(self):
        manual_id = self._create_manual()
        auth(self.client, self.owner)
        r = self.client.get(f"/api/manuals/{manual_id}/")
        self.assertIn("user_permissions", r.data)
        self.assertTrue(r.data["user_permissions"]["can_edit"])
        self.assertTrue(r.data["user_permissions"]["can_delete"])
        self.assertTrue(r.data["user_permissions"]["can_manage_access"])

    def test_regular_user_permissions_field_denies(self):
        manual_id = self._create_manual()
        auth(self.client, self.regular)
        r = self.client.get(f"/api/manuals/{manual_id}/")
        self.assertIn("user_permissions", r.data)
        self.assertFalse(r.data["user_permissions"]["can_edit"])
        self.assertFalse(r.data["user_permissions"]["can_delete"])
        self.assertFalse(r.data["user_permissions"]["can_manage_access"])

    def test_delegated_cannot_manage_access(self):
        manual_id = self._create_manual()
        auth(self.client, self.delegated)
        r = self.client.post(
            f"/api/manuals/{manual_id}/share/",
            {"add": [self.regular.id]},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_owner_can_manage_access(self):
        manual_id = self._create_manual()
        auth(self.client, self.owner)
        r = self.client.post(
            f"/api/manuals/{manual_id}/share/",
            {"add": [self.regular.id]},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_delegated_does_not_become_owner(self):
        manual_id = self._create_manual()
        from manual.models import Manual
        manual = Manual.objects.get(pk=manual_id)
        self.assertEqual(manual.owner, self.owner)
        # Mesmo depois de editar como delegado, owner não muda
        auth(self.client, self.delegated)
        self.client.patch(f"/api/manuals/{manual_id}/", {"name": "Edit by delegated"}, format="json")
        manual.refresh_from_db()
        self.assertEqual(manual.owner, self.owner)


# ═══════════════════════════════════════════════════════════════
# TESTES DE TUTORIAL
# ═══════════════════════════════════════════════════════════════

class TutorialPermissionTest(BasePermissionTest):
    """Testes de permissão para a entidade Tutorial."""

    def _create_tutorial(self):
        auth(self.client, self.owner)
        r = self.client.post(
            "/api/tutorials/",
            {"title": "Tutorial Teste", "description": "Desc", "sector": self.sector.id, "tags": []},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        tutorial_id = r.data["id"]
        from tutorial.models import Tutorial
        tutorial = Tutorial.objects.get(pk=tutorial_id)
        tutorial.shared_admins.add(self.delegated)
        return tutorial_id

    def test_owner_can_edit(self):
        tid = self._create_tutorial()
        auth(self.client, self.owner)
        r = self.client.patch(f"/api/tutorials/{tid}/", {"title": "Editado"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_delegated_can_edit(self):
        tid = self._create_tutorial()
        auth(self.client, self.delegated)
        r = self.client.patch(f"/api/tutorials/{tid}/", {"title": "Edit Delegado"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_regular_user_cannot_edit(self):
        tid = self._create_tutorial()
        auth(self.client, self.regular)
        r = self.client.patch(f"/api/tutorials/{tid}/", {"title": "Proibido"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_system_admin_can_edit(self):
        tid = self._create_tutorial()
        auth(self.client, self.system_admin)
        r = self.client.patch(f"/api/tutorials/{tid}/", {"title": "Admin Edit"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_owner_can_delete(self):
        tid = self._create_tutorial()
        auth(self.client, self.owner)
        r = self.client.delete(f"/api/tutorials/{tid}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_delegated_cannot_delete(self):
        tid = self._create_tutorial()
        auth(self.client, self.delegated)
        r = self.client.delete(f"/api/tutorials/{tid}/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_delete(self):
        tid = self._create_tutorial()
        auth(self.client, self.regular)
        r = self.client.delete(f"/api/tutorials/{tid}/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_system_admin_can_delete(self):
        tid = self._create_tutorial()
        auth(self.client, self.system_admin)
        r = self.client.delete(f"/api/tutorials/{tid}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_regular_user_can_read(self):
        tid = self._create_tutorial()
        auth(self.client, self.regular)
        r = self.client.get(f"/api/tutorials/{tid}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_user_permissions_field_owner(self):
        tid = self._create_tutorial()
        auth(self.client, self.owner)
        r = self.client.get(f"/api/tutorials/{tid}/")
        self.assertIn("user_permissions", r.data)
        self.assertTrue(r.data["user_permissions"]["can_edit"])
        self.assertTrue(r.data["user_permissions"]["can_delete"])

    def test_user_permissions_field_regular(self):
        tid = self._create_tutorial()
        auth(self.client, self.regular)
        r = self.client.get(f"/api/tutorials/{tid}/")
        self.assertIn("user_permissions", r.data)
        self.assertFalse(r.data["user_permissions"]["can_edit"])
        self.assertFalse(r.data["user_permissions"]["can_delete"])

    def test_user_permissions_field_delegated(self):
        tid = self._create_tutorial()
        auth(self.client, self.delegated)
        r = self.client.get(f"/api/tutorials/{tid}/")
        self.assertTrue(r.data["user_permissions"]["can_edit"])
        self.assertFalse(r.data["user_permissions"]["can_delete"])

    def test_delegated_cannot_manage_access(self):
        tid = self._create_tutorial()
        auth(self.client, self.delegated)
        r = self.client.post(
            f"/api/tutorials/{tid}/share/",
            {"add": [self.regular.id]},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_delegated_does_not_become_owner(self):
        tid = self._create_tutorial()
        from tutorial.models import Tutorial
        tutorial = Tutorial.objects.get(pk=tid)
        original_owner = tutorial.created_by
        auth(self.client, self.delegated)
        self.client.patch(f"/api/tutorials/{tid}/", {"title": "Edit by delegated"}, format="json")
        tutorial.refresh_from_db()
        self.assertEqual(tutorial.created_by, original_owner)


# ═══════════════════════════════════════════════════════════════
# TESTES DE COURSE
# ═══════════════════════════════════════════════════════════════

class CoursePermissionTest(BasePermissionTest):
    """Testes de permissão para a entidade Course."""

    def _create_course(self):
        auth(self.client, self.owner)
        r = self.client.post(
            "/api/courses/",
            {
                "name": "Curso Teste",
                "description": "Desc",
                "sector": self.sector.id,
                "tags": [],
                "has_final_exam": False,
                "passing_score": 70,
                "workload_hours": 4,
                "exam_duration_minutes": 60,
                "is_active": True,
            },
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_201_CREATED, r.data)
        course_id = r.data["id"]
        from courses.models import Course
        course = Course.objects.get(pk=course_id)
        course.shared_admins.add(self.delegated)
        return course_id

    def test_owner_can_edit(self):
        cid = self._create_course()
        auth(self.client, self.owner)
        r = self.client.patch(f"/api/courses/{cid}/", {"name": "Editado"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_delegated_can_edit(self):
        cid = self._create_course()
        auth(self.client, self.delegated)
        r = self.client.patch(f"/api/courses/{cid}/", {"name": "Edit Delegado"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_regular_user_cannot_edit(self):
        cid = self._create_course()
        auth(self.client, self.regular)
        r = self.client.patch(f"/api/courses/{cid}/", {"name": "Proibido"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_system_admin_can_edit(self):
        cid = self._create_course()
        auth(self.client, self.system_admin)
        r = self.client.patch(f"/api/courses/{cid}/", {"name": "Admin Edit"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_owner_can_delete(self):
        cid = self._create_course()
        auth(self.client, self.owner)
        r = self.client.delete(f"/api/courses/{cid}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_delegated_cannot_delete(self):
        cid = self._create_course()
        auth(self.client, self.delegated)
        r = self.client.delete(f"/api/courses/{cid}/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_regular_user_cannot_delete(self):
        cid = self._create_course()
        auth(self.client, self.regular)
        r = self.client.delete(f"/api/courses/{cid}/")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_system_admin_can_delete(self):
        cid = self._create_course()
        auth(self.client, self.system_admin)
        r = self.client.delete(f"/api/courses/{cid}/")
        self.assertEqual(r.status_code, status.HTTP_204_NO_CONTENT)

    def test_regular_user_can_read(self):
        cid = self._create_course()
        auth(self.client, self.regular)
        r = self.client.get(f"/api/courses/{cid}/")
        self.assertEqual(r.status_code, status.HTTP_200_OK)

    def test_user_permissions_field_owner(self):
        cid = self._create_course()
        auth(self.client, self.owner)
        r = self.client.get(f"/api/courses/{cid}/")
        self.assertIn("user_permissions", r.data)
        self.assertTrue(r.data["user_permissions"]["can_edit"])
        self.assertTrue(r.data["user_permissions"]["can_delete"])
        self.assertTrue(r.data["user_permissions"]["can_manage_access"])

    def test_user_permissions_field_regular(self):
        cid = self._create_course()
        auth(self.client, self.regular)
        r = self.client.get(f"/api/courses/{cid}/")
        self.assertIn("user_permissions", r.data)
        self.assertFalse(r.data["user_permissions"]["can_edit"])
        self.assertFalse(r.data["user_permissions"]["can_delete"])

    def test_user_permissions_field_delegated(self):
        cid = self._create_course()
        auth(self.client, self.delegated)
        r = self.client.get(f"/api/courses/{cid}/")
        self.assertTrue(r.data["user_permissions"]["can_edit"])
        self.assertFalse(r.data["user_permissions"]["can_delete"])
        self.assertFalse(r.data["user_permissions"]["can_manage_access"])

    def test_delegated_cannot_manage_access(self):
        cid = self._create_course()
        auth(self.client, self.delegated)
        r = self.client.post(
            f"/api/courses/{cid}/share/",
            {"add": [self.regular.id]},
            format="json",
        )
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)

    def test_delegated_does_not_become_owner(self):
        cid = self._create_course()
        from courses.models import Course
        course = Course.objects.get(pk=cid)
        self.assertEqual(course.owner, self.owner)
        auth(self.client, self.delegated)
        self.client.patch(f"/api/courses/{cid}/", {"name": "Edit by delegated"}, format="json")
        course.refresh_from_db()
        self.assertEqual(course.owner, self.owner)


# ═══════════════════════════════════════════════════════════════
# TESTES DAS FUNÇÕES HELPER DE PERMISSÃO
# ═══════════════════════════════════════════════════════════════

class PermissionHelpersTest(BasePermissionTest):
    """Testa as funções helper do módulo access.permissions."""

    @classmethod
    def setUpTestData(cls):
        super().setUpTestData()
        from manual.models import Manual
        cls.manual = Manual.objects.create(
            name="Manual Helper",
            pdf_file="manuais/fake.pdf",
            owner=cls.owner,
        )
        cls.manual.sectors.add(cls.sector)
        cls.manual.shared_admins.add(cls.delegated)

    def test_get_owner_returns_owner_fk(self):
        from access.permissions import _get_owner
        self.assertEqual(_get_owner(self.manual), self.owner)

    def test_is_owner_true_for_owner(self):
        from access.permissions import _is_owner
        self.assertTrue(_is_owner(self.owner, self.manual))

    def test_is_owner_false_for_others(self):
        from access.permissions import _is_owner
        self.assertFalse(_is_owner(self.regular, self.manual))
        self.assertFalse(_is_owner(self.delegated, self.manual))

    def test_is_delegated_admin_true(self):
        from access.permissions import _is_delegated_admin
        self.assertTrue(_is_delegated_admin(self.delegated, self.manual))

    def test_is_delegated_admin_false_for_regular(self):
        from access.permissions import _is_delegated_admin
        self.assertFalse(_is_delegated_admin(self.regular, self.manual))

    def test_is_system_admin_true(self):
        from access.permissions import _is_system_admin
        self.assertTrue(_is_system_admin(self.system_admin))

    def test_is_system_admin_false_for_regular(self):
        from access.permissions import _is_system_admin
        self.assertFalse(_is_system_admin(self.regular))

    def test_can_write_owner(self):
        from access.permissions import _can_write
        self.assertTrue(_can_write(self.owner, self.manual))

    def test_can_write_delegated(self):
        from access.permissions import _can_write
        self.assertTrue(_can_write(self.delegated, self.manual))

    def test_can_write_system_admin(self):
        from access.permissions import _can_write
        self.assertTrue(_can_write(self.system_admin, self.manual))

    def test_can_write_regular_false(self):
        from access.permissions import _can_write
        self.assertFalse(_can_write(self.regular, self.manual))

    def test_can_delete_only_owner_or_admin(self):
        from access.permissions import _can_delete
        self.assertTrue(_can_delete(self.owner, self.manual))
        self.assertTrue(_can_delete(self.system_admin, self.manual))
        self.assertFalse(_can_delete(self.delegated, self.manual))
        self.assertFalse(_can_delete(self.regular, self.manual))

    def test_get_user_permissions_owner(self):
        from access.permissions import get_user_permissions
        perms = get_user_permissions(self.owner, self.manual)
        self.assertTrue(perms["can_edit"])
        self.assertTrue(perms["can_delete"])
        self.assertTrue(perms["can_manage_access"])

    def test_get_user_permissions_delegated(self):
        from access.permissions import get_user_permissions
        perms = get_user_permissions(self.delegated, self.manual)
        self.assertTrue(perms["can_edit"])
        self.assertFalse(perms["can_delete"])
        self.assertFalse(perms["can_manage_access"])

    def test_get_user_permissions_regular(self):
        from access.permissions import get_user_permissions
        perms = get_user_permissions(self.regular, self.manual)
        self.assertFalse(perms["can_edit"])
        self.assertFalse(perms["can_delete"])
        self.assertFalse(perms["can_manage_access"])

    def test_get_user_permissions_system_admin(self):
        from access.permissions import get_user_permissions
        perms = get_user_permissions(self.system_admin, self.manual)
        self.assertTrue(perms["can_edit"])
        self.assertTrue(perms["can_delete"])
        self.assertTrue(perms["can_manage_access"])


# ═══════════════════════════════════════════════════════════════
# TESTES DE AUDITORIA
# ═══════════════════════════════════════════════════════════════

class AuditLogTest(BasePermissionTest):
    """Verifica que ações de permissão são registradas no AuditLog."""

    def test_share_action_logged(self):
        from access.models import AuditLog
        from manual.models import Manual

        manual = Manual.objects.create(name="Audit Manual", pdf_file="manuais/x.pdf", owner=self.owner)
        manual.sectors.add(self.sector)

        initial_count = AuditLog.objects.filter(action="grant_admin").count()
        auth(self.client, self.owner)
        self.client.post(
            f"/api/manuals/{manual.id}/share/",
            {"add": [self.regular.id]},
            format="json",
        )
        self.assertEqual(
            AuditLog.objects.filter(action="grant_admin").count(),
            initial_count + 1,
        )

    def test_revoke_access_logged(self):
        from access.models import AuditLog
        from manual.models import Manual

        manual = Manual.objects.create(name="Revoke Manual", pdf_file="manuais/y.pdf", owner=self.owner)
        manual.sectors.add(self.sector)
        manual.shared_admins.add(self.regular)

        initial_count = AuditLog.objects.filter(action="revoke_admin").count()
        auth(self.client, self.owner)
        self.client.post(
            f"/api/manuals/{manual.id}/share/",
            {"remove": [self.regular.id]},
            format="json",
        )
        self.assertEqual(
            AuditLog.objects.filter(action="revoke_admin").count(),
            initial_count + 1,
        )

    def test_unauthorized_attempt_returns_403(self):
        from manual.models import Manual
        manual = Manual.objects.create(name="Blocked Manual", pdf_file="manuais/z.pdf", owner=self.owner)
        manual.sectors.add(self.sector)

        auth(self.client, self.regular)
        r = self.client.patch(f"/api/manuals/{manual.id}/", {"name": "hack"}, format="json")
        self.assertEqual(r.status_code, status.HTTP_403_FORBIDDEN)
