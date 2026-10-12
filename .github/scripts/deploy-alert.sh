#!/usr/bin/env bash
# Keeps ONE issue, labelled site-deploy-failed, in step with Cloudflare's
# production build of `main`. Workers Builds deploys every merge to production.
# Cloudflare marks each build red or green on its commit, but nothing notified
# anyone: every build of main failed from 2026-07-31 (850ec47) to 2026-10-12,
# and the live site stayed on 2026-07-05's version.
#
#   main's head commit has a successful production build -> close every open alert
#   it has a failed build and no successful one          -> open the alert, assigned
#                                                           to $ASSIGNEE (GitHub
#                                                           emails them), or refresh it
#   no result yet                                        -> nothing, unless the
#                                                           WAIT_MINUTES wait ran
#                                                           out: then alert that
#                                                           Cloudflare reported none
# A refresh that changes the issue's title also comments, so a new situation
# emails again; one that keeps the title is silent.
#
# Builds, not check runs. Cloudflare posts a start run that stays in progress
# forever and a separate result run; both carry the build id as external_id.
# A branch pushed at main's head commit gets a PREVIEW build of the same commit,
# reported in the same place: a successful preview differs only by the
# "Preview URL" line in its summary, and a failed one not at all. So one
# successful production build of the commit counts as deployed (a later failed
# build of the same commit cannot undo it), and successful previews are ignored.
# Known limit: with preview URLs switched off in Cloudflare, a successful preview
# loses that line and would count as deployed.
#
# Every run re-reads main and the issues instead of trusting the event that
# started it, so runs that arrive out of order, or that GitHub drops from the
# queue, still end in the right state. Only issues carrying $MARKER are touched.
#
# Env: REPO              owner/name
#      GH_TOKEN          token for gh (the workflow passes github.token)
#      ASSIGNEE          GitHub login to assign, and so notify
#      WAIT_MINUTES      wait up to this long for a result (the push run uses 20)
#      SIMULATE_FAILURE  true|false: act as if the build had failed and write a
#                        TEST issue; ignored while main really is failing, and
#                        never touches an open real alert
#      DRY_RUN           true|false: print every write instead of sending it
#      REF               commit to check instead of main; dry runs only
# Local dry run with your own gh login (it only reads):
#   REPO=Fulus-Fintech/fulus-site ASSIGNEE=<login> DRY_RUN=true bash .github/scripts/deploy-alert.sh
set -euo pipefail

: "${REPO:?set REPO, e.g. Fulus-Fintech/fulus-site}"
: "${ASSIGNEE:?set ASSIGNEE to the GitHub login to notify}"
SIMULATE_FAILURE="${SIMULATE_FAILURE:-false}"
DRY_RUN="${DRY_RUN:-false}"
WAIT_MINUTES="${WAIT_MINUTES:-0}"
REF="${REF:-main}"
for flag in SIMULATE_FAILURE DRY_RUN; do
  case "${!flag}" in
    true | false) ;;
    *) echo "$flag must be true or false, got '${!flag}'" >&2; exit 2 ;;
  esac
done
case "$WAIT_MINUTES" in
  '' | *[!0-9]*) echo "WAIT_MINUTES must be a whole number, got '$WAIT_MINUTES'" >&2; exit 2 ;;
esac
if [ "$REF" != main ] && [ "$DRY_RUN" != true ]; then
  echo "REF is for dry runs only; the alert always follows main" >&2
  exit 2
fi

LABEL=site-deploy-failed
MARKER='<!-- site-deploy-alert -->'
# The "Cloudflare Workers and Pages" GitHub App. Its check runs for this Worker
# are named "Workers Builds: fulus-site" (matched exactly in the jq below).
CLOUDFLARE_APP_ID=85455
SEP=$'\x1f' # jq output field separator; unlike a tab, read never merges two in a row

# Reads are retried: one 5xx must not cost an alert. Writes are not, so a write
# that timed out can never land twice; if this script fails, the workflow's last
# step opens a minimal issue instead.
read_api() {
  local attempt out
  for attempt in 1 2 3; do
    if out=$(gh api "$@"); then
      printf '%s\n' "$out"
      return 0
    fi
    if [ "$attempt" -lt 3 ]; then sleep $((attempt * 5)); fi
  done
  return 1
}

# Every write goes through here; a dry run prints the call instead.
write() {
  if [ "$DRY_RUN" = true ]; then
    printf 'DRY RUN, not sent: gh api' >&2
    printf ' %q' "$@" >&2
    printf '\n' >&2
    return 0
  fi
  gh api "$@"
}

# Sets head_sha, short, commit_url, state (passing|failing|pending), result,
# build_url and detail for main's head commit.
evaluate() {
  local line
  head_sha=$(read_api "repos/$REPO/commits/$REF" --jq .sha)
  short=${head_sha:0:7}
  commit_url="https://github.com/$REPO/commit/$head_sha"
  # $deployed, $failed and $running are jq variables, so single quotes.
  # shellcheck disable=SC2016
  line=$(read_api "repos/$REPO/commits/$head_sha/check-runs?app_id=$CLOUDFLARE_APP_ID&filter=all&per_page=100" --jq '
    [.check_runs[] | select(.name == "Workers Builds: fulus-site")]
    | group_by(.external_id)
    | map((map(select(.status == "completed")) | sort_by(.completed_at) | last) // (sort_by(.id) | last))
    | map({
        kind: (if .status != "completed" then "running"
               elif .conclusion == "success" then
                 (if ((.output.summary // "") | contains("Preview URL")) then "preview" else "deployed" end)
               elif ([.conclusion] | inside(["failure", "timed_out", "action_required", "stale", "startup_failure"])) then "failed"
               else "no-verdict" end),
        result: (.conclusion // .status),
        url: (.details_url // .html_url // ""),
        at: (.completed_at // .started_at // "")
      })
    | sort_by(.at)
    | (map(select(.kind == "deployed")) | last) as $deployed
    | (map(select(.kind == "failed")) | last) as $failed
    | (map(select(.kind == "running")) | length) as $running
    | if $deployed != null then ["passing", $deployed.result, $deployed.url]
      elif $failed != null then ["failing", $failed.result, $failed.url]
      elif $running > 0 then ["pending", "running", ""]
      else ["pending", "none", ""] end
    | join("\u001f")')
  IFS=$SEP read -r state result build_url <<<"$line"
  case "$state" in
    passing) detail="Cloudflare deployed $short" ;;
    failing) detail="Cloudflare's build of $short ended '$result'" ;;
    *)
      if [ "$result" = running ]; then
        detail="Cloudflare is still building $short"
      else
        detail="no Cloudflare build of $short has been reported yet"
      fi
      ;;
  esac
}

deadline=$(($(date +%s) + WAIT_MINUTES * 60))
evaluate
while [ "$state" = pending ] && [ "$(date +%s)" -lt "$deadline" ]; do
  echo "$detail; checking again in 30 seconds."
  sleep 30
  evaluate
done
echo "$detail."

situation=$state # passing | failing | pending, then no-result | simulated
if [ "$state" = pending ] && [ "$WAIT_MINUTES" -gt 0 ]; then
  situation=no-result
  state=failing
fi
if [ "$SIMULATE_FAILURE" = true ]; then
  if [ "$state" = failing ]; then
    echo "::warning::main really is failing, so this run raises the real alert, not a simulation."
  else
    echo "Simulating a failed build (manual run)."
    situation=simulated
    state=failing
  fi
fi

# This script's open alerts, oldest first, one "number<SEP>kind<SEP>title" line
# each. Read from the REST issue list, which is consistent, never from search,
# which lags. ($o is a jq variable, so single quotes.)
# shellcheck disable=SC2016
issues=$(read_api "repos/$REPO/issues?state=open&labels=$LABEL&per_page=100" --jq '
  [.[] | select(.pull_request == null) | select((.body // "") | contains("<!-- site-deploy-alert -->"))]
  | sort_by(.number) | .[] as $o
  | [($o.number | tostring), (if (($o.body // "") | startswith("TEST:")) then "test" else "real" end), $o.title]
  | join("\u001f")')
issue="" kind="" issue_title=""
open_alerts=()
if [ -n "$issues" ]; then
  while IFS=$SEP read -r n k t; do
    open_alerts+=("$n")
    if [ -z "$issue" ]; then issue=$n kind=$k issue_title=$t; fi
  done <<<"$issues"
fi
if [ "${#open_alerts[@]}" -gt 1 ]; then
  echo "::warning::${#open_alerts[@]} open alerts (${open_alerts[*]}); a failing run refreshes #$issue only."
fi

build_line=${build_url:-"(none reported)"}
case "$situation" in
  failing)
    title="fulus.sa is not deploying: Cloudflare's build of main failed"
    body="Cloudflare's build of \`main\` failed, so https://fulus.sa is still serving an older version.

- Commit: [\`$short\`]($commit_url)
- Result: \`$result\`
- Build log: $build_line

Fix it with a PR into \`main\` (merging deploys again), or retry the build from the build log page if it was a one-off. This issue closes itself once Cloudflare deploys \`main\`.

$MARKER"
    ;;
  no-result)
    title="fulus.sa may not be deploying: no result from Cloudflare for main"
    body="Cloudflare reported no finished build of \`main\` at [\`$short\`]($commit_url) within $WAIT_MINUTES minutes of the merge, so https://fulus.sa may still be serving an older version.

Workers Builds may have been disconnected, or Cloudflare may be slow or down. Check Cloudflare: Workers & Pages → fulus-site → Deployments, and Settings → Build. This issue closes itself once Cloudflare deploys \`main\`.

$MARKER"
    ;;
  simulated)
    title="TEST: deploy alert (simulated failure)"
    body="TEST: simulated failure from a manual run; this is not a real failure. Cloudflare's newest build of \`main\` ([\`$short\`]($commit_url)) reads \`$result\`.

To close this, run **deploy alert** again from the Actions tab without the box ticked. It also closes itself after the next deploy of \`main\`.

$MARKER"
    ;;
esac

# GitHub silently drops a label or assignee the token may not set, so check
# both stuck, add back whichever was dropped, and fail loudly if GitHub still
# refuses: an alert nobody is assigned to notifies nobody.
issue_flags() {
  read_api "repos/$REPO/issues/$1" --jq \
    "[any(.labels[]; .name == \"$LABEL\"), any(.assignees[]; .login == \"$ASSIGNEE\")] | map(tostring) | join(\" \")"
}
ensure_label_and_assignee() {
  local n=$1 flags has_label has_assignee
  flags=$(issue_flags "$n")
  read -r has_label has_assignee <<<"$flags"
  [ "$has_label" = true ] || write -X POST "repos/$REPO/issues/$n/labels" -f "labels[]=$LABEL" --silent
  [ "$has_assignee" = true ] || write -X POST "repos/$REPO/issues/$n/assignees" -f "assignees[]=$ASSIGNEE" --silent
  flags=$(issue_flags "$n")
  read -r has_label has_assignee <<<"$flags"
  if [ "$has_label" != true ] || [ "$has_assignee" != true ]; then
    echo "::error::GitHub would not keep the label ($has_label) or the assignee ($has_assignee) on #$n, so nobody was notified."
    exit 2
  fi
}

case "$state" in
  pending)
    echo "Nothing to do."
    ;;
  passing)
    if [ "${#open_alerts[@]}" -eq 0 ]; then
      echo "No open alert; nothing to close."
    fi
    for n in "${open_alerts[@]}"; do
      write -X POST "repos/$REPO/issues/$n/comments" \
        -f body="Cloudflare deployed \`main\` at [\`$short\`]($commit_url). Closing." --silent
      write -X PATCH "repos/$REPO/issues/$n" -f state=closed -f state_reason=completed --silent
      echo "Closed #$n."
    done
    ;;
  failing)
    if [ -z "$issue" ]; then
      if ! gh api "repos/$REPO/labels/$LABEL" --silent 2>/dev/null; then
        write -X POST "repos/$REPO/labels" -f name="$LABEL" -f color=d73a4a \
          -f description="Cloudflare's build of main failed; fulus.sa is not deploying" --silent ||
          echo "::warning::Could not create the $LABEL label; the check below adds it to the issue."
      fi
      # Title, body, label and assignee in ONE request.
      n=$(write -X POST "repos/$REPO/issues" -f title="$title" -f body="$body" \
        -f "labels[]=$LABEL" -f "assignees[]=$ASSIGNEE" --jq .number)
      if [ "$DRY_RUN" != true ]; then
        ensure_label_and_assignee "$n"
      fi
      echo "Opened #${n:-(dry run)}, assigned to $ASSIGNEE."
    elif [ "$situation" = simulated ] && [ "$kind" = real ]; then
      echo "A real alert (#$issue) is open; the simulation leaves it alone."
    else
      write -X PATCH "repos/$REPO/issues/$issue" -f title="$title" -f body="$body" --silent
      if [ "$title" != "$issue_title" ]; then
        # A new situation: comment, so GitHub emails the assignee again.
        if [ "$kind" = test ] && [ "$situation" != simulated ]; then
          note="This is a real alert now, not a test: $detail. Build log: $build_line"
        else
          note="Update: $detail. Build log: $build_line"
        fi
        write -X POST "repos/$REPO/issues/$issue/comments" -f body="$note" --silent
      fi
      if [ "$DRY_RUN" != true ]; then
        ensure_label_and_assignee "$issue"
      fi
      echo "Refreshed #$issue."
    fi
    ;;
esac
