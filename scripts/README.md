# Scripts de Release

Scripts para releases de prueba y oficiales del proyecto. Compatibles con Linux/macOS/WSL/Git Bash.

## test-release.sh (prueba)
- Construye imágenes desde cualquier rama y opcionalmente publica a GHCR.
- No toca Git (sin tags, sin Releases, sin PRs).

Ejemplos:
```
./scripts/test-release.sh 2.0.6-test
PUSH=false ./scripts/test-release.sh 2.0.6-beta --dry-run --verbose
IMAGE_PREFIX=ghcr.io/owner/repo ./scripts/test-release.sh feature-nueva
```

## manual-release.sh (oficial)
- Solo desde ramas `release/*` y versión `X.Y.Z` (SemVer estricto).
- Crea tag `vX.Y.Z`, GitHub Release y PR de backport a `develop` (si `PUSH=true`).

Ejemplos:
```
git checkout -b release/2.0.6 && ./scripts/manual-release.sh 2.0.6
./scripts/manual-release.sh 2.0.6 --no-push --verbose
```

## Variables de entorno y flags
- Precedencia: `.env` > entorno > flags > defaults.

Requeridas:
- `GITHUB_TOKEN` (write:packages; y `repo` para gh release)
- `GITHUB_ACTOR` (usuario GitHub)
- `GITHUB_REPOSITORY` (ej.: `2025-P4-FE/2025-PIV-TPI-LCC-FE`)

Opcionales (defaults):
- `IMAGE_PREFIX` (`ghcr.io/${GITHUB_REPOSITORY}`)
- `DOCKERFILE_FRONT` (`Dockerfile.frontend` con fallback a `Dockerfile`)
- `DOCKERFILE_PROXY` (`proxy-server/Dockerfile`)
- `FRONTEND_NAME` (`frontend`), `PROXY_NAME` (`api-proxy`)
- `PUSH` (`true`), `DRY_RUN` (`false`), `VERBOSE` (`false`)

Flags: `--dry-run`, `--verbose`, `--no-push`, `--image-prefix <valor>`, `-h|--help`.

## Troubleshooting
- denied: permission_denied → verificá PAT con write:packages y `docker login ghcr.io`.
- repository does not exist → revisá `GITHUB_REPOSITORY` y permisos.
- Docker daemon not running → iniciá Docker Desktop/servicio.
- gh no autenticado → `gh auth login` y `gh auth status`.

## QA Checklist (comandos exactos)
- Positivos: ver que compile, etiquete {version} y {branch}-latest y suba si corresponde.
  - `./scripts/test-release.sh 2.0.6-test`
  - `PUSH=false ./scripts/test-release.sh 2.0.6-beta --dry-run --verbose`
  - `git checkout -b release/2.0.6 && ./scripts/manual-release.sh 2.0.6`
  - `./scripts/manual-release.sh 2.0.6 --no-push --verbose`
- Negativos: deben fallar con mensaje claro y exit ≠ 0.
  - Daemon apagado: detener Docker y ejecutar cualquiera.
  - Token inválido: `export GITHUB_TOKEN=x`; ejecutar con `PUSH=true`.
  - Rama inválida manual: ejecutar fuera de `release/*`.
  - SemVer inválido manual: `./scripts/manual-release.sh 2.0.6-rc1`.

