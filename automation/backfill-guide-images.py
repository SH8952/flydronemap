#!/usr/bin/env python3
"""
디스커버 최적화: 이미 발행된 가이드 아티클(대표 이미지 없음)에 대해
attach_guide_image 로직을 일괄 적용하는 1회성 백필 스크립트.

(ExifLens 프로젝트에서 이미 사용한 동일 스크립트를 FlyDroneMap에 이식 - 로직
변경 없음. 2026-09-03)

- content/guides/en/*.mdx 를 훑어 image 필드가 없는 slug만 처리
- 실패한 개별 글은 건너뛰고 계속 진행 (요청 한도 등으로 일부만 성공해도 무방)
- git add/commit/push는 이 스크립트가 하지 않음 - 호출부(.command)가
  한 번의 커밋으로 모아서 처리 (일일 자동 발행처럼 매번 커밋하면 배포가
  과도하게 잦아지는 문제 방지)

사용법: python3 backfill-guide-images.py <repo_경로>
"""
import glob
import os
import re
import sys
import time

# attach-guide-image.py는 파일명에 하이픈이 있어 일반 import가 안 되므로 경로로 직접 로드
import importlib.util
_spec = importlib.util.spec_from_file_location(
    "attach_guide_image", os.path.join(os.path.dirname(os.path.abspath(__file__)), "attach-guide-image.py")
)
attach = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(attach)


def main():
    if len(sys.argv) != 2:
        sys.stderr.write("사용법: backfill-guide-images.py <repo>\n")
        return
    repo = sys.argv[1]
    en_dir = os.path.join(repo, "content", "guides", "en")
    mdx_files = sorted(glob.glob(os.path.join(en_dir, "*.mdx")))

    done, skipped, failed = [], [], []

    for path in mdx_files:
        slug = os.path.basename(path)[:-4]
        text = open(path, encoding="utf-8").read()
        fm = text.split("---", 2)[1] if text.count("---") >= 2 else ""
        if re.search(r"^image:", fm, re.MULTILINE):
            skipped.append(slug)
            continue

        print(f"--- {slug} ---")
        try:
            image_data = attach.fetch_image(repo, slug, path)
        except Exception as e:
            print(f"  실패: {e}")
            failed.append(slug)
            continue

        if not image_data:
            print("  이미지를 찾지 못함 - 건너뜀")
            failed.append(slug)
            continue

        attach.inject_frontmatter(repo, slug, image_data)
        print(f"  완료: {image_data['image']} (by {image_data['imageCredit']})")
        done.append(slug)

        time.sleep(1.5)  # Unsplash API에 대한 예의상 간격

    print("")
    print(f"=== 백필 완료: 성공 {len(done)} / 이미 있음(건너뜀) {len(skipped)} / 실패 {len(failed)} ===")
    if failed:
        print("실패한 글:", ", ".join(failed))


if __name__ == "__main__":
    main()
