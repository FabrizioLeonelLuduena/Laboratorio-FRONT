#!/usr/bin/env bash
# Release OFICIAL: solo desde ramas release/* y versión SemVer X.Y.Z
# Crea tag vX.Y.Z, GitHub Release y PR de backport a develop (si PUSH=true).
set -Eeuo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

trap 'echo -e "${RED:-}ERROR${NC:-}: Falló en línea $LINENO. Revisá logs." >&2' ERR

require_env() { [ -n "${!1:-}" ] || die "Falta variable $1"; }
log_debug(){ [ "${VERBOSE:-false}" = "true" ] && echo -e "${BLUE:-}[dbg]${NC:-} $*"; }
is_semver(){ printf '%s' "$1" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$'; }

# ========== Config (.env > entorno > flags > defaults) ==========
load_env_if_present

PUSH="${PUSH:-true}"
DRY_RUN="${DRY_RUN:-false}"
VERBOSE="${VERBOSE:-false}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-}"
GITHUB_ACTOR="${GITHUB_ACTOR:-}"
IMAGE_PREFIX="${IMAGE_PREFIX:-}"

DOCKERFILE_FRONT="${DOCKERFILE_FRONT:-Dockerfile.frontend}"
DOCKERFILE_PROXY="${DOCKERFILE_PROXY:-proxy-server/Dockerfile}"
FRONTEND_NAME="${FRONTEND_NAME:-frontend}"
PROXY_NAME="${PROXY_NAME:-api-proxy}"

current_branch(){ git rev-parse --abbrev-ref HEAD; }
sanitize_branch(){ printf '%s' "$1" | sed 's#/#-#g' | sed 's/[^a-zA-Z0-9._-]/-/g'; }
short_sha(){ git rev-parse --short HEAD; }
repo_slug_lc(){
  if [ -n "${GITHUB_REPOSITORY:-}" ]; then printf '%s\n' "$GITHUB_REPOSITORY" | tr '[:upper:]' '[:lower:]'; return; fi
  local url; url="$(git config --get remote.origin.url || true)"
  [ -z "$url" ] && die "No se pudo resolver remote.origin.url; seteá GITHUB_REPOSITORY"
  printf '%s\n' "$url" | sed -E 's#.*github\.com[:/](.+)\.git#\1#' | tr '[:upper:]' '[:lower:]'
}
resolve_dockerfile(){
  local candidate="$1" fallback="$2"
  if [ -f "$candidate" ]; then echo "$candidate"; elif [ -f "$fallback" ]; then echo "$fallback"; else echo "$candidate"; fi
}
ensure_docker(){ require_cmd docker; docker info >/dev/null 2>&1 || die "Docker daemon no está corriendo."; }
ensure_gh(){ require_cmd gh; gh auth status >/dev/null 2>&1 || die "gh no autenticado. Ejecutá: gh auth login"; }
ensure_push_auth(){
  [ "$PUSH" = "true" ] || return 0
  require_env GITHUB_ACTOR
  require_env GITHUB_TOKEN
  printf '%s' "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin >/dev/null \
    || die "Login a ghcr.io falló. Verificá permisos write:packages."
}

usage(){
  cat <<'EOF'
Uso: ./scripts/manual-release.sh <X.Y.Z> [opciones]

Crea un release OFICIAL desde rama release/*: tag vX.Y.Z, GitHub Release y PR de backport.
Publica imágenes si PUSH=true.

Argumentos:
  <X.Y.Z>                    Versión SemVer estricta (ej.: 2.0.6)

Opciones (flags; precedencia más baja que .env/entorno):
  --dry-run                  Muestra acciones sin ejecutarlas
  --verbose                  Logs de depuración
  --no-push                  Fuerza PUSH=false
  --image-prefix <valor>     Prefijo de imágenes (default: ghcr.io/${GITHUB_REPOSITORY})
  -h, --help                 Muestra esta ayuda

Precedencia: .env > variables de entorno > flags > defaults
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then usage; exit 0; fi
[ $# -ge 1 ] || { usage; exit 1; }
VERSION="$1"; shift
is_semver "$VERSION" || die "Versión inválida. Requiere SemVer X.Y.Z (sin sufijos)."

while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) [ "${DRY_RUN:-}" = "false" ] && DRY_RUN="true" ;;
    --verbose) [ "${VERBOSE:-}" = "false" ] && VERBOSE="true" ;;
    --no-push) [ "${PUSH:-}" = "true" ] && PUSH="false" ;;
    --image-prefix) [ -z "${IMAGE_PREFIX:-}" ] && IMAGE_PREFIX="$2"; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Opción desconocida: $1" ;;
  esac; shift
done

require_cmd git
if [ "$DRY_RUN" != "true" ]; then
  ensure_docker
  ensure_gh
  ensure_push_auth
else
  log_warn "--dry-run: se omiten prechecks de Docker/GH/login"
fi

branch="$(current_branch)"; echo "$branch" | grep -Eq '^release/.+' || die "Rama inválida: '$branch'. Usá release/X.Y.Z"
repo="$(repo_slug_lc)"; sha="$(short_sha)"; ref="$(sanitize_branch "$branch")"
[ -n "${IMAGE_PREFIX:-}" ] || IMAGE_PREFIX="ghcr.io/${repo}"

banner "Iniciando release oficial"
log_info "Versión:        $VERSION"
log_info "Rama actual:    $branch"
log_info "Commit:         $sha"
log_info "Repositorio:    $repo"
echo -e "${BLUE}$(hr)${NC}"

DF_FRONT="$(resolve_dockerfile "$DOCKERFILE_FRONT" "Dockerfile")"
DF_PROXY="$(resolve_dockerfile "$DOCKERFILE_PROXY" "proxy-server/Dockerfile")"

# Tag vX.Y.Z
banner "Creando tag Git v${VERSION}"
if git rev-parse -q --verify "refs/tags/v${VERSION}" >/dev/null; then
  log_warn "Tag v${VERSION} ya existe"
else
  if [ "$DRY_RUN" = "true" ]; then
    echo "git tag v${VERSION}"; [ "$PUSH" = "true" ] && echo "git push origin v${VERSION}"
  else
    git tag "v${VERSION}"; [ "$PUSH" = "true" ] && git push origin "v${VERSION}"
  fi
  log_ok "Tag v${VERSION} creado"
fi

# GitHub Release
banner "Creando GitHub Release v${VERSION}"
if [ "$DRY_RUN" = "true" ]; then
  echo "gh release view v${VERSION} || gh release create v${VERSION} --title 'Release v${VERSION}' --notes 'Release v${VERSION}'"
else
  if ! gh release view "v${VERSION}" >/dev/null 2>&1; then
    gh release create "v${VERSION}" --title "Release v${VERSION}" --notes "Release v${VERSION}"
    log_ok "GitHub Release v${VERSION} creado"
  else
    log_warn "GitHub Release v${VERSION} ya existe"
  fi
fi

# Build & Push
banner "Construyendo imágenes Docker"
PROGRESS_ARGS=()
if [ "${VERBOSE}" = "true" ]; then
  export DOCKER_BUILDKIT=1
  PROGRESS_ARGS=( --progress=plain )
fi
BUILD_ARGS=( --build-arg "VERSION=$VERSION" --build-arg "COMMIT_SHA=$sha" --build-arg "BRANCH=$branch" )
BUILD_LABELS_FRONT=( $(oci_labels "$repo" "$ref" "$sha" "$VERSION" "$FRONTEND_NAME" "Build-$FRONTEND_NAME") )
BUILD_LABELS_PROXY=( $(oci_labels "$repo" "$ref" "$sha" "$VERSION" "$PROXY_NAME" "Build-$PROXY_NAME") )

log_info "Building $FRONTEND_NAME"
CMD_FRONT=( docker build "${PROGRESS_ARGS[@]}" -f "$DF_FRONT" -t "${IMAGE_PREFIX}/${FRONTEND_NAME}:${VERSION}" -t "${IMAGE_PREFIX}/${FRONTEND_NAME}:${ref}-latest" )
CMD_FRONT+=( "${BUILD_LABELS_FRONT[@]}" "${BUILD_ARGS[@]}" "." )
if [ "$DRY_RUN" = "true" ]; then
  printf '%q ' "${CMD_FRONT[@]}"; echo
else
  "${CMD_FRONT[@]}"
  log_ok "Frontend build completado"
fi

log_info "Building $PROXY_NAME"
CMD_PROXY=( docker build "${PROGRESS_ARGS[@]}" -f "$DF_PROXY" -t "${IMAGE_PREFIX}/${PROXY_NAME}:${VERSION}" -t "${IMAGE_PREFIX}/${PROXY_NAME}:${ref}-latest" )
CMD_PROXY+=( "${BUILD_LABELS_PROXY[@]}" "${BUILD_ARGS[@]}" "proxy-server" )
if [ "$DRY_RUN" = "true" ]; then
  printf '%q ' "${CMD_PROXY[@]}"; echo
else
  "${CMD_PROXY[@]}"
  log_ok "Api-proxy build completado"
fi

if [ "$PUSH" = "true" ]; then
  banner "Publicando imágenes a GHCR"
  for t in "${VERSION}" "${ref}-latest"; do
    for svc in "$FRONTEND_NAME" "$PROXY_NAME"; do
      PCMD=( docker push "${IMAGE_PREFIX}/${svc}:${t}" )
      if [ "$DRY_RUN" = "true" ]; then printf '%q ' "${PCMD[@]}"; echo; else "${PCMD[@]}"; fi
    done
  done
else
  log_warn "PUSH=false: build sin publicación (simulación si --dry-run)"
fi

# PR de backport a develop
banner "Creando PR de backport a develop"
if [ "$DRY_RUN" = "true" ]; then
  echo "git fetch origin"; echo "git checkout main && git pull origin main"
  echo "git branch -D backport/v${VERSION} || true"; echo "git checkout -b backport/v${VERSION}"
  [ "$PUSH" = "true" ] && echo "git push --force origin backport/v${VERSION}"
  [ "$PUSH" = "true" ] && echo "gh pr create --base develop --head backport/v${VERSION} --title 'Backport v${VERSION} to develop' --body 'Backport automático v${VERSION}'"
else
  git fetch origin
  git checkout main && git pull origin main
  git branch -D "backport/v${VERSION}" >/dev/null 2>&1 || true
  git checkout -b "backport/v${VERSION}"
  if [ "$PUSH" = "true" ]; then
    git push --force origin "backport/v${VERSION}"
    gh pr create --base develop --head "backport/v${VERSION}" \
      --title "Backport v${VERSION} to develop" \
      --body "Backport automático de v${VERSION} desde release a develop."
  else
    log_warn "PUSH=false: se omitió creación de PR y push de rama"
  fi
fi

success "Release OFICIAL COMPLETADO"
log_info "Imágenes publicadas:"
echo "  ${IMAGE_PREFIX}/${FRONTEND_NAME}:${VERSION}"
echo "  ${IMAGE_PREFIX}/${FRONTEND_NAME}:${ref}-latest"
echo "  ${IMAGE_PREFIX}/${PROXY_NAME}:${VERSION}"
echo "  ${IMAGE_PREFIX}/${PROXY_NAME}:${ref}-latest"
exit 0
