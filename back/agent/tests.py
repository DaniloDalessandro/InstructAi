import json
from django.test import SimpleTestCase, override_settings
from .services.alice_agent import _build_agent, _agent_cache, stream_alice


class AliceConfigurationTests(SimpleTestCase):
    @override_settings(OPENAI_API_KEY='')
    def test_missing_key_returns_actionable_error(self):
        events=list(stream_alice('Olá'))
        self.assertEqual(len(events),1)
        event=json.loads(events[0].removeprefix('data: ').strip())
        self.assertEqual(event['type'],'error')
        self.assertIn('administrador',event['message'])

    @override_settings(OPENAI_API_KEY='test-placeholder-no-network')
    def test_agent_can_be_constructed_with_installed_tool_calling_contract(self):
        _agent_cache.clear()
        try:
            agent=_build_agent()
            self.assertEqual(len(agent.tools),9)
        finally:
            _agent_cache.clear()
