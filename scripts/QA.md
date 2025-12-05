# QA de Scripts de Release

## Objetivo

Validar que test-release.sh y manual-release.sh cumplan: mensajes claros, prechecks, flags, etiquetas de imágenes,
SemVer/ramas, y creación de artefactos (tag/Release/PR) en el flujo oficial.

## Pre-requisitos

- Docker Desktop/daemon activo y docker en PATH.
- Git configurado con remoto origin.
- GitHub CLI (gh) autenticado para releases/PRs: gh auth login.
- PAT con permisos: write:packages (GHCR) y repo (para Release/PR).
- Variables mínimas exportadas o en .env:
  - GITHUB_TOKEN
  - GITHUB_ACTOR
  - GITHUB_REPOSITORY (ej.: 2025-P4-FE/2025-PIV-TPI-LCC-FE)

Tip: Podés hacer “ensayo” sin Docker/gh con --dry-run (prechecks omitidos).

## Paso a paso (QA guiado)

1. Ensayo de logs y comandos (sin Docker ni credenciales)

- ./scripts/test-release.sh 2.0.6-test --dry-run --verbose
- Esperado: Mensajes [info]/[warn], comandos docker build con doble tag {version} y {branch-sanitized}-latest, labels
  OCI (source, revision, version, ref.name, created). Prechecks omitidos por dry-run.
- git checkout -b release/2.0.6 && ./scripts/manual-release.sh 2.0.6 --dry-run --verbose
- Esperado: Comandos git tag, gh release create, docker build y docker push impresos, y comandos para PR de backport
  (sin ejecutarlos).

2. Prueba positiva: test-release con publicación simulada

- PUSH=false ./scripts/test-release.sh 2.0.6-beta
- Esperado: Build real de imágenes (requiere Docker). No hace push. Resumen final con 4 tags.

3. Prueba positiva: test-release publicando a GHCR

- Exportá GITHUB_TOKEN, GITHUB_ACTOR, GITHUB_REPOSITORY.
- ./scripts/test-release.sh 2.0.6-rc1
- Esperado: Login a GHCR, build y push de:
  - ghcr.io/<repo>/frontend:2.0.6-rc1
  - ghcr.io/<repo>/frontend:<branch>-latest
  - ghcr.io/<repo>/api-proxy:2.0.6-rc1
  - ghcr.io/<repo>/api-proxy:<branch>-latest

4. Prueba positiva: manual-release completo

- git checkout -b release/2.0.7
- ./scripts/manual-release.sh 2.0.7
- Esperado:
  - Tag v2.0.7 creado (idempotente si ya existe).
  - GitHub Release v2.0.7 creado (o warning si ya existe).
  - Builds y push de ambas imágenes con doble tag.
  - Rama backport/v2.0.7 push y PR a develop con título y body descriptivos.

5. Verificaciones manuales

- Tags: git tag -l v2.0.7
- Release: gh release view v2.0.7
- Imágenes: docker pull ghcr.io/<repo>/frontend:2.0.7 y docker image inspect ghcr.io/<repo>/frontend:2.0.7 | jq '.
  [0].Config.Labels'
- PR: gh pr list --state open --search "Backport v2.0.7"

## Casos negativos (deben fallar con mensaje claro y exit ≠ 0)

- Daemon off: detener Docker y ejecutar ./scripts/test-release.sh 2.0.6-test → “Docker daemon no está corriendo.”
- Token inválido: export GITHUB_TOKEN=x; ./scripts/test-release.sh 2.0.6-test → “Login a ghcr.io falló…”
- Repo inválido: export GITHUB_REPOSITORY=owner/noexiste; ./scripts/test-release.sh 2.0.6-test → error de push/logín
  claro.
- Rama inválida manual: en feature/x, ./scripts/manual-release.sh 2.0.6 → “Rama inválida: 'feature/x'. Usá release/
  X.Y.Z”
- SemVer inválido manual: ./scripts/manual-release.sh 2.0.6-rc1 → “Versión inválida. Requiere SemVer X.Y.Z”
- Versión libre inválida (test): ./scripts/test-release.sh "bad tag!" → “Versión inválida…”

## Variables y flags (referencia rápida)

- Precedencia: .env > entorno > flags > defaults

| Clave | Default | Tipo | Descripción |
  |---|---|---|---|
| GITHUB_TOKEN | — | requerida | PAT con write:packages (y repo para Release/PR) |
| GITHUB_ACTOR | — | requerida | Usuario GitHub (login GHCR) |
| GITHUB_REPOSITORY | — | requerida | owner/repo (minúsculas) |
| IMAGE_PREFIX | ghcr.io/${GITHUB_REPOSITORY} | opcional | Prefijo de imágenes |
| DOCKERFILE_FRONT | Dockerfile.frontend | opcional | Fallback a Dockerfile |
| DOCKERFILE_PROXY | proxy-server/Dockerfile | opcional | Dockerfile proxy |
| FRONTEND_NAME | frontend | opcional | Nombre imagen frontend |
| PROXY_NAME | api-proxy | opcional | Nombre imagen proxy |
| PUSH | true | opcional | Publicar imágenes (–-no-push fuerza false) |
| DRY_RUN | false | opcional | Simular comandos |
| VERBOSE | false | opcional | Logs de depuración |

Flags:

- --dry-run, --verbose, --no-push, --image-prefix <valor>, -h|--help

## Diferenciación “test” vs “real”

- test-release.sh: cualquier rama; nunca crea tags ni Releases ni PRs. Solo build/push con {version} y
  {branch}-latest.
- manual-release.sh: exige rama release/* y SemVer X.Y.Z; crea tag vX.Y.Z, Release y PR de backport a develop.

## Troubleshooting

- "denied: permission_denied": PAT sin write:packages. Solución: renovar PAT y docker login ghcr.io.
- "repository does not exist": chequear GITHUB_REPOSITORY y permisos de escritura en el repo.
- "Docker daemon not running": iniciar Docker Desktop/daemon.
- "gh no autenticado": gh auth login y validar con gh auth status.
