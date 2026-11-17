# QA local do InstructAI — 17/11/2026

## Resultado

Aplicação em execução em http://localhost:3001, API em http://localhost:8002. Alterações locais na branch `codex/qa-interface`, sem commit, push ou deploy de produção. As alterações anteriores do projeto foram preservadas. Os arquivos alterados nesta revisão têm cópias anteriores na pasta de evidências `instructai-qa/baseline` da sessão Codex.

## Empresa emissora e certificados

- Cadastro administrativo único em `/empresa-emissora`: razão social obrigatória; CNPJ, responsável, cargo e texto adicional opcionais; auditoria de criação e atualização.
- Empresa, texto e assinatura nominal aparecem no PDF de uma página. Os dados da empresa ficam registrados no certificado emitido, preservando o histórico após alterações cadastrais.
- Emissão exige empresa cadastrada. Cursos com prova exigem aprovação; cursos sem prova permitem obter o certificado após conclusão.
- Validação pública em `/validar-certificado`, por UUID ou QR Code. Exibe participante, curso, empresa, carga horária e emissão, sem expor e-mail, CPF ou link do PDF.
- Download real e atualização de PDF testados na interface. O exemplo final foi regenerado com o endereço local correto, renderizado e inspecionado visualmente.
- Empresa usada na revisão: **Empresa QA InstructAI (teste local)**, com responsável fictício. Substituir pelos dados reais no cadastro antes do uso operacional. A assinatura é nominal no documento; não é assinatura criptográfica com certificado digital.

## Fluxos exercitados na interface

| Área | Verificações realizadas |
| --- | --- |
| Autenticação | Login de administrador e aluno, logout, restauração de sessão, perfil e solicitação de recuperação de senha |
| Usuários | Cadastro manual fictício, convite fictício e reenvio; listagem e filtro de convites expirados |
| Tags e setores | Cadastro, edição, filtros, inativação e reativação da tag de QA |
| Tutoriais | Criação e edição com etapas, imagem, vídeo YouTube, anotações e exportação PDF; acesso delegado de teste mantido |
| Manuais | Upload PDF, edição sem substituir arquivo, datas de disponibilidade e filtros |
| Cursos | Cadastro e edição, questões de duas alternativas, conclusão das aulas, reprovação e nova tentativa com aprovação, curso sem prova |
| Participantes | Progresso concluído, busca por participante e exportação CSV filtrada, com conteúdo do arquivo conferido |
| Certificados | Emissão para administrador e aluno, atualização, download, empresa no texto e assinatura e validação pública de código válido/inválido/inexistente |
| Alice | Interface e mensagem de configuração ausente; respostas reais dependem da chave OpenAI |

## Principais correções

Mídias de novos tutoriais eram descartadas; vídeos YouTube não usavam o endereço de incorporação; anotações exportavam controles de seleção; filtros comparavam IDs de tipos diferentes; listas de cursos e certificados paravam na primeira página. Foram corrigidos esses casos, os questionários com duas alternativas, permissões de participação de alunos, conclusão de curso sem prova, persistência das datas locais, renovação concorrente da sessão e classificação dos convites expirados.

A busca da tela de participantes filtrava também o curso pai e retornava 404 para nomes de alunos. O filtro foi isolado da consulta do curso, mantendo as permissões; foi adicionado teste de regressão e confirmado o download CSV pela interface.

## Verificação automatizada final

- Backend: **86 testes aprovados**, incluindo empresa única/auditoria, privacidade da validação pública, PDF de uma página, preservação do emissor, participação de aluno, permissões, busca de participantes, convite, recuperação de senha e reativação de tag.
- Frontend: **12 testes aprovados**, cobrindo renovação de sessão, concorrência, multipart, resposta 401, datas locais e URLs de vídeo.
- Build de produção padrão com Turbopack e verificação TypeScript: **aprovado**, em container isolado com `.next` temporário vazio.
- Django system check: sem problemas. `makemigrations --check --dry-run`: nenhuma alteração pendente.
- O Next.js emite aviso de depreciação da convenção `middleware`; não impede a compilação.

## Limites e dados mantidos

Não foi possível validar respostas reais e indexação semântica da IA sem a chave OpenAI. O e-mail local está no backend de console; entrega SMTP externa não foi validada. A entrada de nova senha pela interface não foi executada, por exigir participação do usuário; tokens e redefinição estão cobertos pelos testes do backend. Não há comprovação de layout mobile nesta revisão. Exclusões definitivas não foram exercitadas.

Contas, cursos, tutoriais e convite fictícios de QA foram mantidos para revisão. O acesso delegado de `qa-aluno-instructai@example.test` ao tutorial de QA permanece conforme escolha expressa do usuário; a revisão automática havia bloqueado a remoção desse acesso. Nenhuma remoção foi repetida.