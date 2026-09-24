#!/bin/bash

# Verifies that R8 kept every UniFFI-generated Kotlin class in a release APK.
#
# Why this exists: release APKs are minified, and every test lane builds
# debug, which is not. A missing `-keep` rule is therefore invisible until
# somebody installs a published APK by hand. That happened once already:
# `-keep class uniffi.zingo.**` covers that package and its subpackages only,
# so the sibling `uniffi.zingo_nym_proxy_ffi` went unprotected, R8 stripped 55
# of its 112 classes, and every call into the shim died with a
# NoClassDefFoundError that surfaced as "the nym proxy shim is unavailable".
# Mixnet Mode was dead in every published beta while every debug build worked.
#
# The generated bindings are the source of truth: whatever uniffi-bindgen
# declared must still be in the APK's dex. Runs on grep alone, so it needs
# nothing installed beyond unzip.
#
# Usage: verify_uniffi_kept_by_r8.sh <apk> [<apk> ...]

set -euo pipefail

gbd=$(git rev-parse --show-toplevel)
generated_root="${gbd}/android/app/build/generated/source/uniffi"

if [[ $# -eq 0 ]]; then
  echo "usage: $(basename "$0") <apk> [<apk> ...]" >&2
  exit 2
fi

# Every uniffi/<pkg>/<pkg>.kt uniffi-bindgen produced, one per package: a
# local tree carries both the debug and the release variant of the same
# generated source, and checking either twice says nothing new. CI only ever
# downloads the release one.
declare -A seen_pkg=()
bindings=()
while IFS= read -r kt; do
  pkg=$(basename "$(dirname "${kt}")")
  [[ -n "${seen_pkg[${pkg}]:-}" ]] && continue
  seen_pkg[${pkg}]=1
  bindings+=("${kt}")
done < <(find "${generated_root}" -type f -path '*/java/uniffi/*' -name '*.kt' | sort -u)

if [[ ${#bindings[@]} -eq 0 ]]; then
  echo "no generated uniffi bindings under ${generated_root}" >&2
  echo "run the uniffi generation step before this check" >&2
  exit 1
fi

workdir=$(mktemp -d)
trap 'rm -rf "${workdir}"' EXIT

failed=0

for apk in "$@"; do
  if [[ ! -f "${apk}" ]]; then
    echo "missing APK: ${apk}" >&2
    exit 1
  fi

  dexdir="${workdir}/$(basename "${apk}").dex"
  mkdir -p "${dexdir}"
  unzip -o -q "${apk}" 'classes*.dex' -d "${dexdir}"

  for kt in "${bindings[@]}"; do
    pkg=$(basename "$(dirname "${kt}")")

    # Top-level declarations only: a nested class rides on its outer one, and
    # anchoring to column 0 keeps locals and doc samples out of the list.
    declared=$(grep -oE '^(internal |public |private )?(open |data |sealed |abstract )?(class|interface|object) [A-Za-z0-9_]+' "${kt}" \
      | awk '{print $NF}' | sort -u)

    # Class descriptors the dex actually carries, outer names only, so a
    # kept-but-renested class does not read as missing.
    present=$(grep -haoE "Luniffi/${pkg}/[A-Za-z0-9_\$]+;" "${dexdir}"/classes*.dex \
      | sed -E 's|.*/||; s|;$||; s|\$.*||' | sort -u)

    missing=$(comm -23 <(echo "${declared}") <(echo "${present}"))

    if [[ -n "${missing}" ]]; then
      failed=1
      echo "R8 stripped uniffi.${pkg} classes from $(basename "${apk}"):" >&2
      echo "${missing}" | sed 's/^/  - /' >&2
      echo "  add a -keep rule covering uniffi.${pkg} to android/app/proguard-rules.pro" >&2
    else
      echo "ok: $(basename "${apk}") keeps all $(echo "${declared}" | wc -l) uniffi.${pkg} classes"
    fi
  done
done

exit "${failed}"
