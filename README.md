# CEI Perseverança — site e sistema

Site do Centro de Educação Infantil Perseverança (Paranaguá-PR), com área das famílias e área da equipe ligadas ao Supabase.

| Página | Para quem | O que tem |
|---|---|---|
| `index.html` | Público | Apresentação, forma de educar, trilha das turmas com vagas, avisos e agenda, contato, onde estamos |
| `responsavel.html` | Pais e responsáveis | Matrícula com acompanhamento, diário, fotos (individuais e da turma), cardápio, avisos, frequência, agenda e pedidos de alteração de dados |
| `equipe.html` | Equipe (acesso restrito) | Ponto, diário da turma, chamada, matrículas, crianças, turmas e vagas, avisos, agenda, mensagens, convites, permissões e relatório de ponto |
| `conta.html` | Qualquer pessoa conectada | Foto ou avatar, nome, telefone, e-mail, senha e exclusão da conta |
| `privacidade.html` | Todos | Política de Uso e Privacidade (LGPD) e cookies |

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

## Regras de acesso

- **Família:** cada criança pode ter até 2 responsáveis com acesso, pelos e-mails da matrícula. Quem cria a conta com um desses e-mails já entra ligado à criança.
- **Equipe:** só e-mails liberados pela Direção (em *Liberar e-mails da equipe*) conseguem criar conta na Área da Equipe.
- Uma conta da equipe também pode ser responsável de uma criança. Uma conta de responsável nunca vira conta da equipe.
- **Ponto:** a Direção pode pedir ou exigir a localização ao bater o ponto e definir o local do CEI em *Relatório de ponto*.
- **Imagens da página inicial:** trocadas pela Direção em *Imagens do site*.

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

Rode no SQL Editor do Supabase, nesta ordem: `supabase/schema.sql` e depois `supabase/02_atualizacao.sql`. O segundo pode ser rodado mais de uma vez sem problema.

Para não enviar e-mail de confirmação no cadastro: *Authentication → Sign In / Providers → Email* → desligue **Confirm email**. (O banco já confirma as contas sozinho, então o login funciona de qualquer jeito.)
