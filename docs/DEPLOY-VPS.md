# NJ Assistant Office — Deploy na VPS (produção)

Fluxo: **Claude Code → GitHub (`main`) → produção na VPS**.
Mesmo padrão do GestãoDP: o GitHub Actions envia o source do commit por SSH e
o script versionado `scripts/deploy-prod.sh` faz backup, build, migrations,
troca do container e healthcheck **na VPS**. Nenhum secret passa pelo Git.

Não há ambiente de homologação: toda alteração vai direto para a base oficial.
Por isso as travas abaixo (backup obrigatório, auditoria de migrations,
rollback automático) são o que protege os dados.

## Estrutura

| Item | Valor |
|---|---|
| Gatilho | **manual**, só da `main`, digitando `deploy` (Actions → *Deploy produção (VPS)*) |
| Workflow | `.github/workflows/deploy-prod.yml` |
| Script na VPS | `scripts/deploy-prod.sh` |
| Compose | `docker-compose.prod.yml` (projeto explícito `name: njassistantoffice`) |
| Diretório | `/opt/njsistemas/apps/njassistantoffice` (source em `…/source`) |
| `.env` real (fora do Git) | o que a produção já usa — localizado automaticamente, nunca editado |
| Container | `njassistantoffice-app` (alias de rede `njassistantoffice`) |
| Imagem | `njassistantoffice:prod` (+ `njassistantoffice:rollback_<data>`, 3 últimas) |
| Banco | `njsistemas-postgres` / `njassistantoffice_prod` |
| Volume | `njassistantoffice_prod_uploads` (externo) |
| Redes | `njassistantoffice_network` + `njsistemas_internal` (externas) |
| Domínio | `https://assistant.nevion.com.br` |
| Backups | `/opt/njsistemas/backups/njassistantoffice/github_actions_<data>` |
| Commit implantado | `/opt/njsistemas/apps/njassistantoffice/DEPLOYED_COMMIT` |

## GitHub (Settings → Secrets and variables → Actions)

| Secret | Obrigatório | Conteúdo |
|---|---|---|
| `SSH_HOST` | sim | IP/host da VPS |
| `SSH_USER` | sim | usuário SSH com acesso ao `docker` |
| `SSH_PRIVATE_KEY` | sim | chave privada de deploy |
| `SSH_PORT` | não | porta (padrão 22) |
| `SSH_KNOWN_HOSTS` | recomendado | saída de `ssh-keyscan -H <host>` (fixa a host key) |

Environment `production`: recomendado configurar *required reviewers*.

> ⚠️ O repositório está **público**: logs do Actions são públicos. O script
> não imprime secrets, `.env`, `DATABASE_URL` nem outros containers da VPS, e
> mascara URLs de banco/chaves nos logs do app — mas o ideal é torná-lo privado.

## O que cada deploy faz

1. Sanidade: espaço em disco, redes externas, container `njsistemas-postgres`.
2. Localiza o `.env` atual (pelo `working_dir` do container em execução ou em
   `/opt/njsistemas/apps/njassistantoffice/.env`) e o liga por symlink em
   `source/.env.production` — nunca edita nem imprime.
3. **Backup obrigatório** (falhou → aborta sem alterar nada): `pg_dump -Fc`,
   `.env`, compose antigo, `docker inspect`, source anterior, tag de rollback.
4. Build da nova imagem (o container atual continua no ar).
5. `migrate status` → **auditoria** das pendentes (reprova DROP, TRUNCATE,
   DELETE FROM, ALTER COLUMN TYPE/SET NOT NULL) → só então `migrate deploy`.
6. Uploads: na primeira vez, copia (não move) os arquivos do container antigo
   para o volume `njassistantoffice_prod_uploads`.
7. Container antigo criado fora desta stack é **parado e renomeado**
   (`<nome>_legacy_<data>`), nunca apagado.
8. Sobe `njassistantoffice-app`, espera `healthy`, smoke tests
   (`/api/health`, `/`, `/api/tasks`). Falhou → **rollback automático**.

Aborta **antes de alterar qualquer coisa** se: o container antigo publica porta
no host (ex.: 3010 — o NPM pode estar apontando para `IP:porta`); a migration
`…_initial` aparece pendente (banco sem baseline); há migration no banco que
não existe no commit; uma migration pendente é destrutiva.

## Primeiro deploy

1. Rodar os comandos somente-leitura do fim deste doc e confirmar:
   `_prisma_migrations` existe; o NPM aponta para `njassistantoffice` ou
   `njassistantoffice-app` (nome do container), não para `IP:3010`.
2. Cadastrar os secrets.
3. Merge na `main` → Actions → *Deploy produção (VPS)* → Run workflow →
   digitar `deploy`.
4. Validar no navegador; depois remover manualmente o container
   `*_legacy_<data>` (o script nunca apaga).

## Healthcheck

- `GET /api/health` → `200 {"status":"ok"}`. Usado pelo `HEALTHCHECK` do
  compose (`node fetch`, a cada 30s, 60s de carência).
- Manual:
```bash
docker inspect --format '{{.State.Health.Status}}' njassistantoffice-app
docker exec njassistantoffice-app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>r.text()).then(console.log)"
```

## Rollback

Automático em falha de build/health/smoke. Manual:
```bash
cd /opt/njsistemas/apps/njassistantoffice/source
docker images njassistantoffice --format '{{.Tag}}'          # escolha rollback_<data>
docker tag njassistantoffice:rollback_<data> njassistantoffice:prod
docker compose -p njassistantoffice -f docker-compose.prod.yml up -d --no-deps app
```
Voltar ao container antigo (enquanto ele existir):
```bash
docker rm -f njassistantoffice-app
docker rename njassistantoffice-app_legacy_<data> njassistantoffice-app   # ou njassistantoffice_legacy_<data>
docker start njassistantoffice-app
```
Banco (último caso, decisão humana — descarta dados posteriores ao backup):
```bash
B=/opt/njsistemas/backups/njassistantoffice/github_actions_<data>
docker exec -i njsistemas-postgres pg_restore -U postgres -d njassistantoffice_prod --clean --if-exists --no-owner < $B/database.dump
```

## Baseline de migrations (se abortar com "migration inicial PENDENTE")

O banco foi criado sem `prisma migrate` (ex.: `db push`). **Decisão humana**,
com backup feito, e só depois de conferir que o banco corresponde às migrations:
```bash
cd /opt/njsistemas/apps/njassistantoffice/source
docker compose -p njassistantoffice -f docker-compose.prod.yml --profile migrate run --rm -T migrate \
  migrate diff --from-schema-datasource ./prisma/schema.prisma --to-migrations ./prisma/migrations \
  --shadow-database-url "<URL de um banco vazio temporário>" --script
docker compose -p njassistantoffice -f docker-compose.prod.yml --profile migrate run --rm -T migrate \
  migrate resolve --applied <nome_da_migration> --schema=./prisma/schema.prisma
```

## Regras

- Nunca `prisma db push`, `migrate reset`, `--accept-data-loss`,
  `docker system prune`, `docker compose down -v`. O `schema.production.prisma`
  **diverge** das migrations (elas criam tabelas como `Risk`, `Control`,
  `AuditRecord` que o schema não modela); um `db push` as apagaria.
- Mudança de schema = nova pasta em `prisma/migrations/`, só aditiva.
- `docker-compose.yml` e `scripts/vps/*` são do deploy manual antigo e não são
  usados pelo workflow.

## Comandos somente-leitura para diagnóstico na VPS

```bash
docker ps -a --format '{{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' | grep -iE 'njassist|npm|proxy|postgres'
for c in njassistantoffice njassistantoffice-app; do docker inspect "$c" --format '{{.Name}} project={{index .Config.Labels "com.docker.compose.project"}} service={{index .Config.Labels "com.docker.compose.service"}} dir={{index .Config.Labels "com.docker.compose.project.working_dir"}} ports={{json .HostConfig.PortBindings}} nets={{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null; done
docker network ls --format '{{.Name}}' | grep -E 'njassistantoffice|njsistemas|nevion'
docker volume ls --format '{{.Name}}' | grep -i njassist
ls -la /opt/njsistemas/apps/ /opt/njsistemas/apps/njassistantoffice/
docker exec njsistemas-postgres psql -U postgres -d njassistantoffice_prod -c 'SELECT migration_name, finished_at IS NOT NULL AS ok, rolled_back_at FROM _prisma_migrations ORDER BY started_at'
docker exec njsistemas-nginx-proxy-manager sh -c 'grep -l assistant /data/nginx/proxy_host/*.conf | xargs grep -hE "server_name|set \$server|set \$port"'
```
