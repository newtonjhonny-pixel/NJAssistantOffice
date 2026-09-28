# NJ Assistant Office — Deploy na VPS (homologação e produção)

Fluxo: **Claude Code → GitHub → homologação (VPS) → produção (VPS)**.
Mesmo padrão do GestãoDP: o GitHub Actions envia o source do commit por SSH e
um script versionado (`scripts/deploy-*.sh`) faz build, migrations, troca do
container e healthcheck **na VPS**. Nenhum secret passa pelo Git.

## Estrutura

| | Homologação | Produção |
|---|---|---|
| Branch / gatilho | push em `homolog` (ou manual em qualquer branch) | **manual**, só da `main`, digitando `deploy` |
| Workflow | `.github/workflows/deploy-homolog.yml` | `.github/workflows/deploy-prod.yml` |
| Script na VPS | `scripts/deploy-homolog.sh` | `scripts/deploy-prod.sh` |
| Compose | `docker-compose.homolog.yml` | `docker-compose.prod.yml` |
| Projeto Compose (`name:`) | `njassistantoffice-homolog` | `njassistantoffice` |
| Diretório | `/opt/njsistemas/apps/njassistantoffice-homolog` | `/opt/njsistemas/apps/njassistantoffice` |
| Source publicado | `…/njassistantoffice-homolog/source` | `…/njassistantoffice/source` |
| `.env` real (fora do Git) | `…/njassistantoffice-homolog/.env.homolog` (gerado no 1º deploy) | o `.env` que a produção já usa (localizado automaticamente) |
| Container app | `njassistantoffice-app-homolog` | `njassistantoffice-app` (alias de rede `njassistantoffice`) |
| Imagem | `njassistantoffice-homolog:latest` | `njassistantoffice:prod` |
| Banco | container próprio `njassistantoffice-homolog-db` (Postgres 16), DB `njassistantoffice_homolog` | `njsistemas-postgres` compartilhado, DB `njassistantoffice_prod` |
| Volumes | `njassistantoffice_homolog_pgdata`, `njassistantoffice_homolog_uploads` | `njassistantoffice_prod_uploads` (externo) |
| Redes | `njsistemas_internal` (externa) + `njassistantoffice_homolog_db` (interna da stack) | `njassistantoffice_network` + `njsistemas_internal` (externas) |
| Domínio | **a definir** (variável `NJAO_HOMOLOG_URL`) | `https://assistant.nevion.com.br` |
| Backups | — (dados de teste) | `/opt/njsistemas/backups/njassistantoffice/github_actions_<data>` |
| Commit implantado | `…/njassistantoffice-homolog/DEPLOYED_COMMIT` | `…/njassistantoffice/DEPLOYED_COMMIT` |

Todos os comandos Compose usam `-p <projeto>` + `name:` explícitos: não há
como uma stack adotar/recriar containers da outra ou de outro sistema.

## GitHub (Settings → Secrets and variables → Actions)

Secrets (os mesmos valores já usados no GestãoDP, se for o mesmo usuário SSH):

| Secret | Obrigatório | Conteúdo |
|---|---|---|
| `SSH_HOST` | sim | IP/host da VPS |
| `SSH_USER` | sim | usuário SSH com acesso ao `docker` |
| `SSH_PRIVATE_KEY` | sim | chave privada de deploy |
| `SSH_PORT` | não | porta (padrão 22) |
| `SSH_KNOWN_HOSTS` | recomendado | saída de `ssh-keyscan -H <host>` (fixa a host key) |

Variable (não secreta): `NJAO_HOMOLOG_URL` = URL pública da homologação
(`https://…`). Obrigatória no primeiro deploy de homologação.

Environment `production`: recomendado configurar *required reviewers*.

> ⚠️ O repositório está **público**: logs do Actions são públicos. Os scripts
> não imprimem secrets, `.env`, `DATABASE_URL` nem nomes de outros containers,
> e mascaram URLs de banco/chaves nos logs do app — mas o ideal é tornar o
> repositório privado.

## Primeiro deploy

### Homologação
1. Criar o proxy host no Nginx Proxy Manager: domínio de homologação →
   `http://njassistantoffice-app-homolog:3000` (SSL Let's Encrypt). Recomendado:
   Access List (o app não tem login).
2. Cadastrar secrets/variable acima.
3. Criar a branch `homolog` a partir da `main` e dar push (ou rodar o workflow
   manualmente). O script cria diretórios, gera `.env.homolog` com senha/segredo
   aleatórios **na VPS**, sobe o Postgres de homologação, aplica todas as
   migrations e sobe o app.

### Produção
Pré-requisitos (verificar com os comandos somente-leitura do fim deste doc):
- `_prisma_migrations` existe no banco de produção (baseline). Se a migration
  `…_initial` aparecer pendente, o deploy aborta sem tocar em nada.
- O NPM aponta para o **nome do container** (`njassistantoffice` ou
  `njassistantoffice-app`), não para `IP:3010`. Se o container legado publica
  porta no host, o deploy aborta sem tocar em nada.

Execução: Actions → *Deploy produção (VPS)* → Run workflow (branch `main`) →
digitar `deploy`. O script:
1. localiza o `.env` atual (pelo `working_dir` do container em execução ou em
   `/opt/njsistemas/apps/njassistantoffice/.env`) e o liga por symlink em
   `source/.env.production` — nunca edita;
2. **backup obrigatório**: `pg_dump -Fc`, `.env`, compose antigo, `docker
   inspect`, source anterior e tag `njassistantoffice:rollback_<data>`;
3. build da imagem; `migrate status`; **auditoria** das pendentes (reprova
   DROP/TRUNCATE/DELETE/ALTER COLUMN TYPE|NOT NULL) e só então `migrate deploy`;
4. copia (não move) uploads do container legado para o volume;
5. container legado criado fora desta stack é **parado e renomeado**
   (`<nome>_legacy_<data>`), nunca apagado;
6. sobe `njassistantoffice-app`, espera `healthy`, smoke tests; falhou → rollback.

## Healthcheck

- `GET /api/health` → `200 {"status":"ok"}` (sem banco). Usado pelo
  `HEALTHCHECK` do compose (`node fetch`, a cada 30s, 60s de carência).
- Smoke do deploy (de dentro do container): `/api/health`, `/` e `/api/tasks`
  (este consulta o banco). URL pública é verificada; sem resposta de dentro da
  VPS (hairpin/DNS) vira aviso, resposta diferente de 200 é falha.

Manual:
```bash
docker inspect --format '{{.State.Health.Status}}' njassistantoffice-app
docker exec njassistantoffice-app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"
```

## Rollback

Automático em falha de build/health/smoke (imagem, source e container legado
voltam). Manual (produção):
```bash
cd /opt/njsistemas/apps/njassistantoffice/source
docker images 'njassistantoffice' --format '{{.Tag}}'          # escolha rollback_<data>
docker tag njassistantoffice:rollback_<data> njassistantoffice:prod
docker compose -p njassistantoffice -f docker-compose.prod.yml up -d --no-deps app
```
Voltar ao container legado (enquanto ele existir):
```bash
docker rm -f njassistantoffice-app
docker rename njassistantoffice-app_legacy_<data> njassistantoffice-app   # ou njassistantoffice_legacy_<data>
docker start njassistantoffice-app
```
Banco (só em último caso, decisão humana — sobrescreve dados posteriores ao backup):
```bash
B=/opt/njsistemas/backups/njassistantoffice/github_actions_<data>
docker exec -i njsistemas-postgres pg_restore -U postgres -d njassistantoffice_prod --clean --if-exists --no-owner < $B/database.dump
```
Migrations não são revertidas automaticamente — por isso a auditoria só deixa
passar migrations aditivas.

## Baseline de migrations (se o deploy abortar com "migration inicial PENDENTE")

Significa que o banco de produção foi criado sem `prisma migrate` (ex.: `db
push`). **Decisão humana**, com backup feito, e só depois de conferir que o
banco já corresponde às migrations:
```bash
cd /opt/njsistemas/apps/njassistantoffice/source
# 1) diferença banco -> migrations (deve sair vazia ou só com diferenças entendidas)
docker compose -p njassistantoffice -f docker-compose.prod.yml --profile migrate run --rm -T migrate \
  migrate diff --from-schema-datasource ./prisma/schema.prisma --to-migrations ./prisma/migrations \
  --shadow-database-url "<URL de um banco vazio temporário>" --script
# 2) marcar como aplicadas (não executa SQL), uma por migration já refletida no banco
docker compose -p njassistantoffice -f docker-compose.prod.yml --profile migrate run --rm -T migrate \
  migrate resolve --applied <nome_da_migration> --schema=./prisma/schema.prisma
```
Valide o procedimento antes em homologação (restaurando lá uma cópia do dump).

## Regras

- Nunca `prisma db push`, `migrate reset`, `--accept-data-loss`,
  `docker system prune`, `docker compose down -v`.
  O `schema.production.prisma` **diverge** das migrations (as migrations criam
  tabelas como `Risk`, `Control`, `AuditRecord` que o schema não modela); um
  `db push` as apagaria.
- Mudança de schema = nova pasta em `prisma/migrations/` (aditiva), validada
  primeiro em homologação.
- Arquivos legados (`docker-compose.yml`, `scripts/vps/*`) são do deploy manual
  antigo e não são usados pelos workflows.

## Comandos somente-leitura para diagnóstico na VPS

```bash
docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' | grep -i -E 'njassist|npm|proxy|postgres'
for c in njassistantoffice njassistantoffice-app; do docker inspect "$c" --format '{{.Name}} project={{index .Config.Labels "com.docker.compose.project"}} service={{index .Config.Labels "com.docker.compose.service"}} dir={{index .Config.Labels "com.docker.compose.project.working_dir"}} ports={{json .HostConfig.PortBindings}} nets={{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}} mounts={{range .Mounts}}{{.Name}}{{.Source}}->{{.Destination}} {{end}}' 2>/dev/null; done
docker network ls --format '{{.Name}}' | grep -E 'njassistantoffice|njsistemas|nevion'
docker volume ls --format '{{.Name}}' | grep -i njassist
ls -la /opt/njsistemas/apps/ /opt/njsistemas/apps/njassistantoffice/
docker exec njsistemas-postgres psql -U postgres -d njassistantoffice_prod -c 'SELECT migration_name, finished_at IS NOT NULL AS ok, rolled_back_at FROM _prisma_migrations ORDER BY started_at'
```
