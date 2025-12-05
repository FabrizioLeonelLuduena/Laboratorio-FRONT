#!/usr/bin/env bash
# Release de PRUEBA: construye y (opcional) publica imágenes desde cualquier rama.
# No crea tags/pr/release. Acepta versiones “libres” (ej.: 2.0.6-test, 2.0.6-rc1).
set -Eeuo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
# shellcheck source=lib.sh
source "$SCRIPT_DIR/lib.sh"

trap 'echo -e "${RED:-}ERROR${NC:-}: Falló en línea $LINENO. Revisá logs." >&2' ERR

require_env() { [ -n "${!1:-}" ] || die "Falta variable $1"; }
log_debug(){ [ "${VERBOSE:-false}" = "true" ] && echo -e "${BLUE:-}[dbg]${NC:-} $*"; }

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
ensure_docker(){ require_cmd docker; docker info >/dev/null 2>&1 || die "Docker daemon no está corriendo. Iniciá Docker Desktop/daemon."; }
ensure_push_auth(){
  [ "$PUSH" = "true" ] || return 0
  if [ -n "${GITHUB_TOKEN:-}" ] && [ -n "${GITHUB_ACTOR:-}" ]; then
    printf '%s' "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin >/dev/null \
      || die "Login a ghcr.io falló. Verificá permisos write:packages."
  else
    die "PUSH=true pero faltan credenciales. Ejecutá: docker login ghcr.io o seteá GITHUB_ACTOR/GITHUB_TOKEN"
  fi
}

usage(){
  cat <<'EOF'
Uso: ./scripts/test-release.sh <version> [opciones]

Construye imágenes Docker del frontend y proxy desde cualquier rama.
No crea tags/pr/releases. Publica si PUSH=true.

Argumentos:
  <version>                  Tag de versión libre (permitidos: [A-Za-z0-9_.-]+)

Opciones (flags; precedencia más baja que .env/entorno):
  --dry-run                  Muestra acciones sin ejecutarlas
  --verbose                  Logs de depuración
  --no-push                  Fuerza PUSH=false (si .env/entorno dicen true, prevalecen)
  --image-prefix <valor>     Prefijo de imágenes (default: ghcr.io/${GITHUB_REPOSITORY})
  -h, --help                 Muestra esta ayuda

Precedencia: .env > variables de entorno > flags > defaults
EOF
}

if [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then usage; exit 0; fi
[ $# -ge 1 ] || { usage; exit 1; }
VERSION="$1"; shift

# Validación de versión “libre” por caracteres permitidos (tag Docker)
printf '%s' "$VERSION" | grep -Eq '^[A-Za-z0-9_.-]+$' || die "Versión inválida. Usá solo [A-Za-z0-9_.-]."

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
  ensure_push_auth
else
  log_warn "--dry-run: se omiten prechecks de Docker/login"
fi

branch="$(current_branch)"; sha="$(short_sha)"; ref="$(sanitize_branch "$branch")"
repo="$(repo_slug_lc)"
[ -n "${IMAGE_PREFIX:-}" ] || IMAGE_PREFIX="ghcr.io/${repo}"

banner "Iniciando release de prueba"
log_info "Versión:        $VERSION"
log_info "Rama actual:    $branch"
log_info "Commit:         $sha"
log_info "Repositorio:    $repo"
echo -e "${BLUE}$(hr)${NC}"

DF_FRONT="$(resolve_dockerfile "$DOCKERFILE_FRONT" "Dockerfile")"
DF_PROXY="$(resolve_dockerfile "$DOCKERFILE_PROXY" "proxy-server/Dockerfile")"

# Build args comunes
banner "Construyendo imágenes Docker"
PROGRESS_ARGS=()
if [ "${VERBOSE}" = "true" ]; then
  export DOCKER_BUILDKIT=1
  PROGRESS_ARGS=( --progress=plain )
fi
BUILD_LABELS=( $(oci_labels "$repo" "$ref" "$sha" "$VERSION" "$FRONTEND_NAME" "Build-$FRONTEND_NAME") )
BUILD_ARGS=( --build-arg "VERSION=$VERSION" --build-arg "COMMIT_SHA=$sha" --build-arg "BRANCH=$branch" )

# Frontend
log_info "Building $FRONTEND_NAME"
CMD_FRONT=( docker build "${PROGRESS_ARGS[@]}" -f "$DF_FRONT" -t "${IMAGE_PREFIX}/${FRONTEND_NAME}:${VERSION}" -t "${IMAGE_PREFIX}/${FRONTEND_NAME}:${ref}-latest" )
CMD_FRONT+=( "${BUILD_LABELS[@]}" "${BUILD_ARGS[@]}" "." )
if [ "$DRY_RUN" = "true" ]; then
  printf '%q ' "${CMD_FRONT[@]}"; echo
else
  if [ "${VERBOSE}" = "true" ]; then printf '%q ' "${CMD_FRONT[@]}"; echo; fi
  "${CMD_FRONT[@]}"
  log_ok "Frontend build completado"
fi

# Proxy (labels se recalculan con título adecuado)
BUILD_LABELS_PROXY=( $(oci_labels "$repo" "$ref" "$sha" "$VERSION" "$PROXY_NAME" "Build-$PROXY_NAME") )
log_info "Building $PROXY_NAME"
CMD_PROXY=( docker build "${PROGRESS_ARGS[@]}" -f "$DF_PROXY" -t "${IMAGE_PREFIX}/${PROXY_NAME}:${VERSION}" -t "${IMAGE_PREFIX}/${PROXY_NAME}:${ref}-latest" )
CMD_PROXY+=( "${BUILD_LABELS_PROXY[@]}" "${BUILD_ARGS[@]}" "proxy-server" )
if [ "$DRY_RUN" = "true" ]; then
  printf '%q ' "${CMD_PROXY[@]}"; echo
else
  if [ "${VERBOSE}" = "true" ]; then printf '%q ' "${CMD_PROXY[@]}"; echo; fi
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
fi

success "Release de PRUEBA COMPLETADO"
log_info "Imágenes generadas:"
echo "  ${IMAGE_PREFIX}/${FRONTEND_NAME}:${VERSION}"
echo "  ${IMAGE_PREFIX}/${FRONTEND_NAME}:${ref}-latest"
echo "  ${IMAGE_PREFIX}/${PROXY_NAME}:${VERSION}"
echo "  ${IMAGE_PREFIX}/${PROXY_NAME}:${ref}-latest"
exit 0
