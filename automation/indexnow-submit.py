#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
IndexNow 알림 스크립트 (flydronemap)  — 2026-10-07 추가

새로 발행한 가이드(또는 지정한 주소)를 IndexNow로 알려 Bing·Naver·Yandex 등이
빨리 발견하도록 돕는다. (Google은 IndexNow에 참여하지 않으므로 대상이 아님)

사용법
  python3 indexnow-submit.py --slugs <슬러그> [<슬러그> ...]   # 새 가이드 + 가이드 목록 페이지
  python3 indexnow-submit.py --urls /ko/tools/xxx https://...   # 지정한 주소만
  옵션: --dry-run(전송 안 하고 확인만) --detach(백그라운드 실행) --no-index(목록 페이지 제외)

동작 요약
  1) 배포가 끝나 새 글이 사이트맵에 나타날 때까지 기다림(최대 20분, 30초 간격)
  2) 키 파일(/<키>.txt)과 각 글 주소가 실제로 열리는지(200) 확인
  3) 확인된 주소만 https://api.indexnow.org/indexnow 로 전송 (한 번 전송하면 참여 엔진 전체에 공유됨)
기록은 ~/Library/Logs/flydronemap-indexnow.log 에 남는다. 이 스크립트가 실패해도 발행 자체에는 영향이 없다.
키는 공개되는 값이다(사이트 루트의 /<키>.txt 파일로 누구나 볼 수 있음). 비밀 정보가 아니다.
"""
import argparse
import html
import json
import os
import re
import signal
import subprocess
import sys
import time
import urllib.error
import urllib.request
from urllib.parse import urlparse

SITE_NAME = "flydronemap"
SITE_BASE = "https://flydronemap.com"
INDEXNOW_KEY = "89a83668fe5141598df24f562a173e3a"
LOCALES = ["en","es","ja","ko","de"]          # 첫 번째 언어(en)가 "새 글이 배포됐는지" 판단 기준
ENDPOINT = "https://api.indexnow.org/indexnow"
WAIT_SECONDS = 20 * 60
POLL_INTERVAL = 30
LOG_PATH = os.path.expanduser("~/Library/Logs/%s-indexnow.log" % SITE_NAME)
UA = "Mozilla/5.0 (compatible; IndexNowSubmitter/1.0; owner-tool)"

DETACHED = False
_HOST_NOTE_LOGGED = False


def log(msg):
    line = time.strftime("%Y-%m-%d %H:%M:%S") + " " + msg
    try:
        os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except OSError:
        pass
    if not DETACHED:
        print(line, flush=True)


def notify(text):
    if sys.platform != "darwin":
        return
    safe = re.sub(r"[^0-9A-Za-z가-힣 ,.()/_:-]", "", text)
    try:
        subprocess.run(
            ["osascript", "-e",
             'display notification "%s" with title "IndexNow (%s)"' % (safe, SITE_NAME)],
            timeout=10, capture_output=True)
    except Exception:
        pass


def http_get(url, timeout=25):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status, r.read(5 * 1024 * 1024).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception:
        return 0, ""


def sitemap_locs(base):
    """사이트맵의 <loc> 주소를 {경로: 전체주소} 로 반환 (사이트맵 인덱스면 한 단계 따라감)."""
    status, body = http_get(base + "/sitemap.xml")
    if status != 200:
        return None
    locs = [html.unescape(u) for u in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", body)]
    expanded = []
    for u in locs:
        if u.lower().endswith(".xml"):
            s2, b2 = http_get(u)
            if s2 == 200:
                expanded += [html.unescape(x) for x in re.findall(r"<loc>\s*([^<\s]+)\s*</loc>", b2)]
        else:
            expanded.append(u)
    # 사이트맵에 적힌 호스트(www 여부 등)가 기준 주소와 달라도, 항상 기준 주소(SITE_BASE)의
    # 호스트로 맞춰서 보낸다. (IndexNow는 키 파일과 같은 호스트의 주소만 받는다)
    global _HOST_NOTE_LOGGED
    bp = urlparse(base)
    origin = "%s://%s" % (bp.scheme, bp.netloc)
    out = {}
    for u in expanded:
        p = urlparse(u)
        if p.netloc and p.netloc != bp.netloc and not _HOST_NOTE_LOGGED:
            log("참고: 사이트맵 주소의 호스트(%s)가 기준 주소(%s)와 달라 기준 주소로 맞춰 전송합니다." % (p.netloc, bp.netloc))
            _HOST_NOTE_LOGGED = True
        fixed = origin + p.path + (("?" + p.query) if p.query else "")
        out[p.path.rstrip("/") or "/"] = fixed
    return out


def key_ok(origin):
    status, body = http_get("%s/%s.txt" % (origin, INDEXNOW_KEY))
    return status == 200 and body.strip() == INDEXNOW_KEY


def post_indexnow(endpoint, host, scheme, urls, dry_run):
    payload = {
        "host": host,
        "key": INDEXNOW_KEY,
        "keyLocation": "%s://%s/%s.txt" % (scheme, host, INDEXNOW_KEY),
        "urlList": urls,
    }
    if dry_run:
        log("[dry-run] 전송 생략. 전송했을 내용: " + json.dumps(payload, ensure_ascii=False))
        return True
    data = json.dumps(payload).encode("utf-8")
    for attempt in (1, 2):
        req = urllib.request.Request(
            endpoint, data=data, method="POST",
            headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                code, body = r.status, r.read(2000).decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            code, body = e.code, e.read(2000).decode("utf-8", "replace")
        except Exception as e:
            code, body = 0, str(e)
        if code in (200, 202):
            log("전송 성공 (HTTP %d): %s 의 %d개 주소" % (code, host, len(urls)))
            return True
        log("전송 실패 (HTTP %d) %s" % (code, body[:200]))
        if code in (400, 403, 422):   # 형식·키·주소 문제는 재시도해도 같음
            return False
        if attempt == 1:
            time.sleep(60)
    return False


def detach():
    global DETACHED
    if os.name != "posix":
        return
    if os.fork() > 0:
        os._exit(0)
    os.setsid()
    signal.signal(signal.SIGHUP, signal.SIG_IGN)
    if os.fork() > 0:
        os._exit(0)
    sys.stdout.flush()
    sys.stderr.flush()
    devnull = os.open(os.devnull, os.O_RDWR)
    for fd in (0, 1, 2):
        os.dup2(devnull, fd)
    DETACHED = True


def main():
    ap = argparse.ArgumentParser(description="IndexNow 알림 (%s)" % SITE_NAME)
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--slugs", nargs="+", help="새로 발행한 가이드 슬러그")
    g.add_argument("--urls", nargs="+", help="알릴 주소(경로 또는 전체 주소)")
    ap.add_argument("--no-index", action="store_true", help="가이드 목록 페이지는 제외")
    ap.add_argument("--dry-run", action="store_true", help="전송하지 않고 확인만")
    ap.add_argument("--detach", action="store_true", help="백그라운드로 분리해 실행")
    ap.add_argument("--no-wait", action="store_true", help="배포 대기 없이 1회만 확인")
    ap.add_argument("--site-base", default=SITE_BASE, help=argparse.SUPPRESS)   # 시험용
    ap.add_argument("--endpoint", default=ENDPOINT, help=argparse.SUPPRESS)     # 시험용
    args = ap.parse_args()

    if args.detach:
        detach()

    base = args.site_base.rstrip("/")
    log("시작: %s (%s)" % (SITE_NAME, " ".join(args.slugs or args.urls)))

    candidates = []   # (경로 또는 전체주소, 필수 여부)
    if args.slugs:
        primary = LOCALES[0]
        for s in args.slugs:
            for loc in LOCALES:
                candidates.append(("/%s/guides/%s" % (loc, s), loc == primary))
        if not args.no_index:
            for loc in LOCALES:
                candidates.append(("/%s/guides" % loc, False))
        # 배포 완료 대기: 새 글(기본 언어)이 사이트맵에 나타날 때까지
        required = [p for p, req in candidates if req]
        deadline = time.time() + (0 if args.no_wait else WAIT_SECONDS)
        locs = None
        while True:
            locs = sitemap_locs(base)
            missing = required if locs is None else [p for p in required if p not in locs]
            if not missing:
                break
            if time.time() >= deadline:
                log("대기 시간 종료: 사이트맵에서 찾지 못한 글 %s" % ", ".join(missing))
                break
            log("배포 대기 중... 사이트맵에 아직 없는 글 %d건" % len(missing))
            time.sleep(POLL_INTERVAL)
        if locs is None:
            log("실패: 사이트맵을 열 수 없습니다.")
            notify("사이트맵을 열 수 없어 전송하지 못했습니다")
            return 1
        found = [p for p, _ in candidates if p in locs]
        if not any(p in locs for p in required):
            log("실패: 새 글이 아직 배포되지 않아 전송하지 않았습니다. 나중에 --slugs 로 다시 실행하세요.")
            notify("새 글이 배포되지 않아 전송하지 못했습니다")
            return 1
        urls = [locs[p] for p in found]
    else:
        urls = []
        for u in args.urls:
            urls.append(u if u.startswith("http") else base + (u if u.startswith("/") else "/" + u))

    # 실제로 열리는 주소만 (가이드 상세/직접 지정 주소는 200 확인, 목록 페이지는 사이트맵에 있으므로 생략)
    checked = []
    for u in urls:
        path = urlparse(u).path.rstrip("/")
        if args.slugs and path.endswith("/guides"):
            checked.append(u)
            continue
        status, _ = http_get(u)
        if status == 200:
            checked.append(u)
        else:
            log("제외(HTTP %d): %s" % (status, u))
    if not checked:
        log("보낼 주소가 없습니다.")
        return 1

    # 호스트별로 묶어 전송 (IndexNow는 한 요청에 한 호스트만 허용)
    by_host = {}
    for u in checked:
        p = urlparse(u)
        by_host.setdefault((p.scheme, p.netloc), []).append(u)

    ok_all = True
    for (scheme, host), lst in by_host.items():
        origin = "%s://%s" % (scheme, host)
        good = False
        for _ in range(3):
            if key_ok(origin):
                good = True
                break
            time.sleep(20)
        if not good:
            log("실패: 키 파일을 확인하지 못했습니다 (%s/%s.txt)" % (origin, INDEXNOW_KEY))
            ok_all = False
            continue
        ok_all = post_indexnow(args.endpoint, host, scheme, lst, args.dry_run) and ok_all

    if ok_all:
        log("완료: 총 %d개 주소" % len(checked))
        if not args.dry_run:
            notify("알림 완료 %d개 주소" % len(checked))
        return 0
    notify("일부 전송에 실패했습니다. 로그를 확인하세요")
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        sys.exit(130)
    except Exception as exc:   # 어떤 오류든 발행에 영향 주지 않도록 기록만
        log("예기치 못한 오류: %r" % (exc,))
        sys.exit(1)
