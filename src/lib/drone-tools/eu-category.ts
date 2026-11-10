/**
 * EU 드론 오픈 카테고리(Open category) 하위 범주 자가 점검 (순수 함수).
 *
 * 근거: EASA FAQ(오픈 카테고리·교육 요건, 2024년 갱신분), 독일 연방항공청 C등급 안내,
 * 스페인 AESA 안내(2026년 4월 수정본)를 교차 확인한 2026년 11월 기준 내용.
 * 규정은 바뀔 수 있고 연령·보험·등록 방식은 국가마다 다르므로 화면에 확인 시점과
 * 공식 자료 링크를 함께 표시한다.
 */

export type DroneClass = "C0" | "C1" | "C2" | "C3" | "C4" | "legacy" | "private" | "C5C6";
export type Subcategory = "A1" | "A2" | "A3";
export type Training = "manual" | "a1a3" | "a2" | "none";

export type EuCategoryInput = {
  droneClass: DroneClass;
  /** 이륙 중량(MTOM, g) — 'legacy'·'private'일 때만 사용 */
  mtomGrams?: number;
  /** 카메라·센서가 있는가(장난감 제외) — 등록 안내에 사용 */
  hasCamera: boolean;
};

export type EuCategoryResult =
  | { kind: "open"; subcategories: Subcategory[]; training: Training; registration: "yes" | "ifCamera"; directRemoteId: boolean; maxMassKg: number }
  | { kind: "specific" }
  | { kind: "tooHeavy" }
  | { kind: "invalid" };

export const OPEN_MAX_KG = 25;

export function checkEuCategory(i: EuCategoryInput): EuCategoryResult {
  switch (i.droneClass) {
    case "C0":
      return { kind: "open", subcategories: ["A1", "A3"], training: "manual", registration: "ifCamera", directRemoteId: false, maxMassKg: 0.25 };
    case "C1":
      return { kind: "open", subcategories: ["A1", "A3"], training: "a1a3", registration: "yes", directRemoteId: true, maxMassKg: 0.9 };
    case "C2":
      return { kind: "open", subcategories: ["A2", "A3"], training: "a2", registration: "yes", directRemoteId: true, maxMassKg: 4 };
    case "C3":
      return { kind: "open", subcategories: ["A3"], training: "a1a3", registration: "yes", directRemoteId: true, maxMassKg: 25 };
    case "C4":
      return { kind: "open", subcategories: ["A3"], training: "a1a3", registration: "yes", directRemoteId: false, maxMassKg: 25 };
    case "C5C6":
      return { kind: "specific" };
    case "legacy":
    case "private": {
      const g = i.mtomGrams;
      if (g === undefined || !Number.isFinite(g) || g <= 0) return { kind: "invalid" };
      if (g < 250) {
        return { kind: "open", subcategories: ["A1", "A3"], training: "none", registration: "ifCamera", directRemoteId: false, maxMassKg: 0.25 };
      }
      if (g < OPEN_MAX_KG * 1000) {
        return { kind: "open", subcategories: ["A3"], training: "a1a3", registration: "yes", directRemoteId: false, maxMassKg: 25 };
      }
      return { kind: "tooHeavy" };
    }
  }
}
