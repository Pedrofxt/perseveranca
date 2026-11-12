# CEI Perseverança — site e sistema

Site do Centro de Educação Infantil Perseverança (Paranaguá-PR), com área das famílias e área da equipe ligadas ao Supabase.

| Página | Para quem | O que tem |
|---|---|---|
| `index.html` | Público | Apresentação, forma de educar, trilha das turmas com vagas, avisos e agenda, contato, onde estamos |
| `responsavel.html` | Pais e responsáveis | Pedido de matrícula com acompanhamento, diário do dia da criança, avisos da turma, frequência, agenda |
| `equipe.html` | Equipe (acesso restrito) | Ponto, diário da turma, chamada, matrículas, crianças, turmas e vagas, avisos, agenda, mensagens, convites, permissões e relatório de ponto |
| `conta.html` | Qualquer pessoa conectada | Foto ou avatar, nome, telefone, e-mail, senha e exclusão da conta |

Efeitos sonoros são gerados pelo próprio navegador (sem arquivos de áudio) e podem ser desligados no botão de alto-falante. O modo claro/escuro fica no botão de sol/lua.

## Perfis

| Perfil | Pode fazer |
|---|---|
| Responsável | Pedir matrícula, cancelar pedido em andamento, ler o diário, ver avisos e frequência dos próprios filhos |
| Funcionário | Bater ponto, ver avisos internos |
| Professora | + escrever o diário e fazer a chamada |
| Secretaria | + analisar e aprovar matrículas, cadastrar crianças, ajustar vagas, publicar avisos e eventos, ler mensagens, convidar equipe |
| Direção | + mudar perfis, bloquear e excluir contas, ver e ajustar o ponto de todos |

As regras ficam no banco (RLS). Mesmo que alguém altere o código no navegador, o Supabase recusa o que estiver fora do perfil. O horário do ponto é sempre o do servidor.

## Como funciona a matrícula

1. A família cria a conta em **Área do Responsável** e envia o pedido de vaga.
2. A secretaria vê o pedido em **Matrículas** e muda a situação: *em análise*, *lista de espera*, *recusada* ou **Aprovar**.
3. Ao aprovar, a criança entra na turma escolhida e aparece automaticamente para a família, com diário, frequência e avisos da turma.

Crianças que já estudam no CEI: a secretaria cadastra em **Crianças** e usa **Vincular conta** com o e-mail que a família usou.

## Primeiro acesso

1. Abra `equipe.html` → **Criar conta**. A primeira conta criada ali vira Direção.
2. Em **Convites de acesso**, cadastre os e-mails da equipe com o perfil de cada um.

## Publicação (GitHub Pages)

O site é estático. A ligação com o Supabase está em `assets/config.js`. Depois de publicar, no Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://pedrofxt.github.io/perseveranca/`
- **Redirect URLs**: `https://pedrofxt.github.io/perseveranca/**`

Nunca coloque a chave `service_role` em nenhum arquivo do site.

## Modo demonstração

Se `assets/config.js` estiver vazio ou o Supabase estiver fora do ar, o site abre em modo demonstração com dados de exemplo e botões "Entrar como…".

## Banco de dados

`supabase/schema.sql` tem o esquema completo (tabelas, regras de acesso, funções e dados iniciais das turmas).
