#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
푸시 후 IndexNow 자동 알림 (2026-10-30 추가)

이번에 push 하는 커밋들에서 추가·수정된 파일을 보고, 공개 주소가 바뀐 페이지만
IndexNow(Bing·Naver·Yandex 등)에 알린다. 같은 폴더의 indexnow-submit.py 설정(사이트 주소·키·언어)을 그대로 쓴다.

주소로 바뀌는 파일
  content/guides/<언어>/<슬러그>.mdx   -> /<언어>/guides/<슬러그>
  content/blog/<언어>/<슬러그>.mdx     -> /<언어>/blog/<슬러그>   (블로그가 있는 사이트만)
  src/app/[locale]/<경로>/page.tsx     -> /<언어>/<경로>  (동적 [..] 경로·api 제외, 언어마다 시도)
  src/app/[locale]/page.tsx            -> /<언어>
그 밖의 파일(컴포넌트·스타일·번역·설정)은 주소가 정해지지 않아 알리지 않는다.

안전장치
  - 같은 주소는 24시간 안에 다시 보내지 않는다(IndexNow 권고). 기록: ~/Library/Logs/<사이트>-indexnow-sent.json
  - 새로 추가된 페이지가 배포되어 열릴 때까지(최대 20분) 기다린 뒤, 실제로 200 으로 열리는 주소만 보낸다.
    (한국어 전용 페이지처럼 언어마다 없는 주소는 404 이므로 자동 제외)
  - 어떤 오류가 나도 push 결과에는 영향이 없다(종료코드로 push 를 막지 않는다).

사용법
  python3 automation/indexnow-push-hook.py --range <시작커밋>..HEAD [--detach] [--no-wait] [--dry-run] [--map-only]
  (보통은 automation/push-and-notify.sh 가 자동으로 호출한다)
"""
import argparse
import importlib.util
import json
import os
import re
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)


def load_submit():
    spec = importlib.util.spec_from_file_location("indexnow_submit", os.path.join(HERE, "indexnow-submit.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def git_changes(rng):
    """(상태, 경로) 목록. 삭제는 제외."""
    out = subprocess.run(
        ["git", "-C", REPO, "diff", "--name-status", "--diff-filter=AMR", "-M", rng],
        capture_output=True, text=True)
    rows = []
    for line in out.stdout.splitlines():
        parts = line.split("\t")
        if len(parts) < 2:
            continue
        status = parts[0][0]
        rows.append(("A" if status in ("A", "R") else "M", parts[-1]))
    return rows


def map_paths(rows, locales):
    """변경 파일 -> {주소 경로: 새로 추가됐는지}"""
    urls = {}

    def add(path, is_new):
        urls[path] = urls.get(path, False) or is_new

    for status, f in rows:
        is_new = status == "A"
        m = re.match(r"^content/(guides|blog)/([a-z]{2})/([^/]+)\.mdx$", f)
        if m:
            kind, loc, slug = m.groups()
            if loc in locales:
                add("/%s/%s/%s" % (loc, kind, slug), is_new)
            continue
        m = re.match(r"^src/app/\[locale\]/(.*?)/?page\.(tsx|ts|jsx|js|mdx)$", f)
        if m:
            segs = [s for s in m.group(1).split("/") if s]
            if any("[" in s or s == "api" for s in segs):
                continue
            segs = [s for s in segs if not (s.startswith("(") and s.endswith(")"))]
            for loc in locales:
                add("/" + "/".join([loc] + segs), is_new)
    return urls


def main():
    ap = argparse.ArgumentParser(description="푸시 후 IndexNow 자동 알림")
    ap.add_argument("--range", required=True, help="예: abc123..HEAD")
    ap.add_argument("--detach", action="store_true")
    ap.add_argument("--no-wait", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--map-only", action="store_true", help="네트워크 없이 주소 목록만 출력")
    ap.add_argument("--force", action="store_true", help="24시간 중복 방지 무시")
    args = ap.parse_args()

    sub = load_submit()
    rows = git_changes(args.range)
    mapping = map_paths(rows, sub.LOCALES)
    if args.map_only:
        for p, n in sorted(mapping.items()):
            print(("NEW " if n else "MOD ") + p)
        print("합계 %d개 주소 (변경 파일 %d개)" % (len(mapping), len(rows)))
        return 0
    if args.detach:
        sub.detach()
    sub.log("푸시 후 알림 시작: %s (변경 파일 %d개, 주소 후보 %d개)" % (args.range, len(rows), len(mapping)))
    if not mapping:
        sub.log("알릴 페이지가 없습니다(주소가 바뀌는 파일 변경 없음).")
        return 0

    state_path = os.path.expanduser("~/Library/Logs/%s-indexnow-sent.json" % sub.SITE_NAME)
    try:
        with open(state_path, encoding="utf-8") as fh:
            sent = json.load(fh)
    except Exception:
        sent = {}
    now = time.time()
    sent = {u: t for u, t in sent.items() if now - t < 7 * 86400}

    base = sub.SITE_BASE.rstrip("/")
    wanted = {}
    for p, is_new in mapping.items():
        u = base + p
        if not args.force and now - sent.get(u, 0) < 24 * 3600:
            continue
        wanted[u] = is_new
    if not wanted:
        sub.log("24시간 안에 이미 알린 주소뿐이라 건너뜁니다.")
        return 0

    # 배포 대기: 새로 추가된 주소 중 하나라도 열릴 때까지(없으면 수정만 있는 경우라 짧게 대기)
    new_urls = [u for u, n in wanted.items() if n]
    if not args.no_wait and not args.dry_run:
        if new_urls:
            deadline = time.time() + sub.WAIT_SECONDS
            while time.time() < deadline:
                if any(sub.http_get(u)[0] == 200 for u in new_urls):
                    break
                sub.log("배포 대기 중... 새 페이지가 아직 열리지 않습니다")
                time.sleep(sub.POLL_INTERVAL)
        else:
            sub.log("수정된 페이지만 있어 배포 반영을 위해 4분 대기합니다.")
            time.sleep(240)

    checked = []
    for u in wanted:
        status, _ = sub.http_get(u)
        if status == 200:
            checked.append(u)
        else:
            sub.log("제외(HTTP %d): %s" % (status, u))
    if not checked:
        sub.log("보낼 주소가 없습니다.")
        return 0

    ok_all = True
    by_host = {}
    for u in checked:
        p = sub.urlparse(u)
        by_host.setdefault((p.scheme, p.netloc), []).append(u)
    for (scheme, host), lst in by_host.items():
        origin = "%s://%s" % (scheme, host)
        if not sub.key_ok(origin):
            sub.log("실패: 키 파일을 확인하지 못했습니다 (%s/%s.txt)" % (origin, sub.INDEXNOW_KEY))
            ok_all = False
            continue
        for i in range(0, len(lst), 1000):
            chunk = lst[i:i + 1000]
            if sub.post_indexnow(sub.ENDPOINT, host, scheme, chunk, args.dry_run):
                if not args.dry_run:
                    for u in chunk:
                        sent[u] = time.time()
            else:
                ok_all = False
    if not args.dry_run:
        try:
            os.makedirs(os.path.dirname(state_path), exist_ok=True)
            with open(state_path, "w", encoding="utf-8") as fh:
                json.dump(sent, fh)
        except OSError:
            pass
    sub.log("완료: %d개 주소 알림 %s" % (len(checked), "(성공)" if ok_all else "(일부 실패)"))
    if not args.dry_run:
        sub.notify("푸시 후 알림 %d개 주소" % len(checked))
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as exc:   # push 에 영향 없도록 기록만
        try:
            load_submit().log("예기치 못한 오류: %r" % (exc,))
        except Exception:
            pass
        sys.exit(0)
