#!/usr/bin/env bash
# Publish approved content from `main` and reindex brain search.
#
#   system/scripts/publish.sh
#
# 1. Exports `main` with git archive (never the working tree, so unmerged edits are never searchable).
# 2. Runs check.mjs on that export. If it fails, nothing changes.
# 3. Sorts files by status into $BRAIN_HOME/published/:
#      default/    status: current records in content folders     -> collection `brain` (searched by default)
#      history/    status: superseded                             -> `brain-history` (opt in)
#      archive/    archive/** and status: archived                -> `brain-archive` (opt in)
#      bootstrap/  AGENTS.md, system/routing.md, context/*.md     -> `brain-bootstrap` (read with `get`)
#    inbox/, drafts, unpopulated records, READMEs, and system/ are never published.
# 4. Points the four QMD collections at those folders and reindexes.
#
# Settings (environment variables, all optional):
#   BRAIN_HOME  where the published copy lives   (default: ~/.local/share/ai-brain)
#   QMD_INDEX   QMD index name                   (default: brain)
#   QMD         command that runs QMD            (default: qmd)
set -euo pipefail

die() { echo "publish: $*" >&2; exit 1; }

BRAIN_HOME="${BRAIN_HOME:-$HOME/.local/share/ai-brain}"
QMD_INDEX="${QMD_INDEX:-brain}"
read -r -a QMD_CMD <<< "${QMD:-qmd}"
qmd() { "${QMD_CMD[@]}" --index "$QMD_INDEX" "$@"; }

root=$(git rev-parse --show-toplevel) || die "run this inside the brain repo"
sha=$(git -C "$root" rev-parse --verify -q "refs/heads/main^{commit}") || die "no local main branch"
command -v "${QMD_CMD[0]}" >/dev/null || die "QMD not found (${QMD_CMD[0]}). See setup/README.md"

dest="$BRAIN_HOME/published"
if [ -e "$dest" ] && [ ! -f "$dest/COMMIT" ] && [ -n "$(ls -A "$dest")" ]; then
  die "$dest exists but wasn't made by this script; refusing to replace it"
fi

mkdir -p "$BRAIN_HOME"
stage=$(mktemp -d "$BRAIN_HOME/.publish.XXXXXX")
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/src" "$stage/out/default" "$stage/out/history" "$stage/out/archive" "$stage/out/bootstrap"

git -C "$root" archive --format=tar "$sha" | tar -x -C "$stage/src" || die "git archive of main failed"
[ -z "$(cd "$stage/src" && find . -type l)" ] || die "main contains symlinks; nothing published"
node "$stage/src/system/scripts/check.mjs" --root "$stage/src" >/dev/null \
  || die "check.mjs fails on main; nothing published. Run: node system/scripts/check.mjs"

status_of() {  # print the frontmatter status of a file, or nothing
  awk 'NR == 1 { if ($0 != "---") exit; next } $0 == "---" { exit }
       /^status:/ { v = $0; sub(/^status:[ ]*/, "", v); sub(/[ ]+#.*$/, "", v); print v; exit }' "$1"
}
place() { mkdir -p "$stage/out/$1/$(dirname "$2")"; cp "$stage/src/$2" "$stage/out/$1/$2"; }

content='^(profile|goals|writing|education|work|ventures|projects|crm|life|knowledge|history)/'
n_default=0; n_history=0; n_archive=0; n_bootstrap=0
while IFS= read -r rel; do
  case "$rel" in
    */README.md|README.md) continue ;;
    AGENTS.md|system/routing.md|context/*.md) place bootstrap "$rel"; n_bootstrap=$((n_bootstrap + 1)); continue ;;
  esac
  st=$(status_of "$stage/src/$rel")
  if [[ "$rel" == archive/* ]]; then
    case "$st" in current|superseded|archived) place archive "$rel"; n_archive=$((n_archive + 1)) ;; esac
  elif [[ "$rel" =~ $content ]]; then
    case "$st" in
      current)    place default "$rel"; n_default=$((n_default + 1)) ;;
      superseded) place history "$rel"; n_history=$((n_history + 1)) ;;
      archived)   place archive "$rel"; n_archive=$((n_archive + 1)) ;;
    esac
  fi
done < <(cd "$stage/src" && find . -type f -name '*.md' | sed 's|^\./||' | LC_ALL=C sort)

echo "$sha" > "$stage/out/COMMIT"
rm -rf "$dest.prev"
[ -e "$dest" ] && mv "$dest" "$dest.prev"
mv "$stage/out" "$dest"
echo "publish: main@${sha:0:12} -> $dest (default=$n_default history=$n_history archive=$n_archive bootstrap=$n_bootstrap)"

ensure_collection() {  # ensure_collection <name> <dir> <include|exclude>
  local name=$1 dir=$2 mode=$3 shown path
  if shown=$(qmd collection show "$name" 2>/dev/null); then
    path=$(printf '%s\n' "$shown" | awk '/^  Path:/ { sub(/^  Path:[ ]*/, ""); print; exit }')
    [ "$path" = "$dir" ] || die "collection $name in index $QMD_INDEX points at '$path', not '$dir'. Use another QMD_INDEX, or remove it: qmd --index $QMD_INDEX collection remove $name"
  else
    qmd collection add "$dir" --name "$name" --mask '**/*.md' >/dev/null || die "cannot create collection $name"
  fi
  qmd collection "$mode" "$name" >/dev/null || die "cannot $mode $name"
}
ensure_collection brain           "$dest/default"   include
ensure_collection brain-history   "$dest/history"   exclude
ensure_collection brain-archive   "$dest/archive"   exclude
ensure_collection brain-bootstrap "$dest/bootstrap" exclude

qmd update >/dev/null || die "qmd update failed"
qmd embed >/dev/null 2>&1 || die "qmd embed failed"
qmd cleanup >/dev/null 2>&1 || true
echo "publish: search index '$QMD_INDEX' updated"
