#!/usr/bin/env bash

# Shared helpers for release scripts
set -Eeuo pipefail

# Colors
if [[ -t 1 ]]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  BLUE='\033[0;34m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  BLUE=''
  NC=''
fi

trap 'echo -e "${RED}ERROR${NC}: fallo en línea $LINENO. Revisá los logs." >&2' ERR

# Full-line colored logs
log_info()   { echo -e "${BLUE}$*${NC}"; }
log_warn()   { echo -e "${YELLOW}$*${NC}"; }
log_ok()     { echo -e "${GREEN}$*${NC}"; }
log_error()  { echo -e "${RED}$*${NC}" >&2; }
die()        { log_error "$*"; exit 1; }

# Sections and helpers
hr()        { printf '━%.0s' {1..70}; echo; }
banner()    { echo; echo -e "${BLUE}$*${NC}"; echo -e "${BLUE}$(hr)${NC}"; }
success()   { echo; echo -e "${GREEN}$*${NC}"; echo -e "${GREEN}$(hr)${NC}"; }
warning()   { echo; echo -e "${YELLOW}$*${NC}"; echo -e "${YELLOW}$(hr)${NC}"; }

require_cmd() { command -v "$1" >/dev/null 2>&1 || die "Missing required tool: $1"; }

load_env_if_present() {
  local env_file=".env"
  if [[ -f "$env_file" ]]; then
    # shellcheck disable=SC2046
    set -a; source "$env_file"; set +a
    log_info "Loaded environment from .env"
  fi
}

is_semver() {
  local v="$1"
  [[ "$v" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]
}

current_branch() {
  git rev-parse --abbrev-ref HEAD
}

sanitize_branch() {
  echo "$1" | sed 's/\//-/g' | sed 's/[^a-zA-Z0-9._-]/-/g'
}

short_sha() {
  git rev-parse --short HEAD
}

repo_slug_lc() {
  if [[ -n "${GITHUB_REPOSITORY:-}" ]]; then
    echo "$GITHUB_REPOSITORY" | tr '[:upper:]' '[:lower:]'
    return
  fi
  local url
  url=$(git config --get remote.origin.url || true)
  [[ -z "$url" ]] && die "Cannot resolve remote.origin.url; set GITHUB_REPOSITORY"
  echo "$url" | sed -E 's#.*github\.com[:/](.+)\.git#\1#' | tr '[:upper:]' '[:lower:]'
}

docker_daemon_up() {
  docker info >/dev/null 2>&1
}

ensure_docker() {
  require_cmd docker
  docker_daemon_up || die "Docker daemon not running. Start Docker Desktop/daemon."
}

ensure_git_clean_or_warn() {
  if ! git diff-index --quiet HEAD --; then
    log_warn "Uncommitted changes detected. Proceeding may bake local state."
  fi
}

gh_authenticated() {
  command -v gh >/dev/null 2>&1 || return 1
  gh auth status >/dev/null 2>&1
}

ensure_gh_for_manual() {
  require_cmd gh
  gh auth status >/dev/null 2>&1 || die "gh not authenticated. Run: gh auth login"
}

ensure_ghcr_login() {
  local registry="${REGISTRY:-ghcr.io}"
  if docker logout "$registry" >/dev/null 2>&1; then
    # Re-login if token provided; otherwise warn to login manually
    if [[ -n "${GITHUB_TOKEN:-}" && -n "${GITHUB_ACTOR:-}" ]]; then
      echo "$GITHUB_TOKEN" | docker login "$registry" -u "$GITHUB_ACTOR" --password-stdin >/dev/null
      log_ok "Login exitoso en $registry como $GITHUB_ACTOR"
    else
      log_warn "Sin GITHUB_TOKEN/ACTOR. Asegurate de tener 'docker login $registry' activo."
    fi
  fi
}

build_time_rfc3339() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

oci_labels() {
  local repo="$1"; local ref="$2"; local rev="$3"; local ver="$4"; local title="$5"; local desc="$6"
  echo \
    "--label org.opencontainers.image.source=https://github.com/$repo" \
    "--label org.opencontainers.image.revision=$rev" \
    "--label org.opencontainers.image.version=$ver" \
    "--label org.opencontainers.image.created=$(build_time_rfc3339)" \
    "--label org.opencontainers.image.title=$title" \
    "--label org.opencontainers.image.description=$desc" \
    "--label org.opencontainers.image.ref.name=$ref"
}

# Build and optionally push
# Args: service_name context_dir tag1 tag2 ...
build_and_maybe_push() {
  local service="$1"; shift
  local context="$1"; shift
  local tags=("$@")

  local repo
  repo=$(repo_slug_lc)
  local prefix="${IMAGE_PREFIX:-${REGISTRY:-ghcr.io}/$repo}"
  local branch
  branch=$(current_branch)
  local ref
  ref=$(sanitize_branch "$branch")
  local sha
  sha=$(short_sha)
  local ver="${VERSION:-unknown}"

  local label_args
  label_args=( $(oci_labels "$repo" "$ref" "$sha" "$ver" "$service" "Build for $service") )

  local build_args=(
    --build-arg "VERSION=$ver"
    --build-arg "COMMIT_SHA=$sha"
    --build-arg "BRANCH=$branch"
  )

  log_info "Building $service image"
  local tag_args=()
  for t in "${tags[@]}"; do
    tag_args+=( -t "$prefix/$service:$t" )
  done

  if [[ "${DRY_RUN:-false}" == "true" ]]; then
    echo docker build "${tag_args[@]}" "${label_args[@]}" "${build_args[@]}" "$context"
  else
    docker build "${tag_args[@]}" "${label_args[@]}" "${build_args[@]}" "$context"
  fi

  if [[ "${PUSH_IMAGES:-false}" == "true" ]]; then
    for t in "${tags[@]}"; do
      if [[ "${DRY_RUN:-false}" == "true" ]]; then
        echo docker push "$prefix/$service:$t"
      else
        docker push "$prefix/$service:$t"
      fi
    done
  fi
}
