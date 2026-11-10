/**
 * 밀도고도(Density Altitude) 계산 (순수 함수, 국제표준대기 ISA 기준, 습도는 반영하지 않음).
 *
 * 1) 기압고도 PA = 지표 고도 + 145366.45 × (1 − (QNH/1013.25)^0.190284)   [ft]
 * 2) 그 고도의 정압 p = 1013.25 × (1 − 6.8755856e-6 × PA)^5.2558797      [hPa]
 * 3) 공기 밀도 ρ = p / (R × T), R = 287.058 J/(kg·K)
 * 4) 밀도비 σ = ρ / 1.225,  밀도고도 DA = (1 − σ^(1/4.2558797)) / 6.8755856e-6  [ft]
 * 호버링 소요 동력은 운동량 이론상 1/√σ 에 비례(대략적인 추정).
 */

const SEA_LEVEL_HPA = 1013.25;
const SEA_LEVEL_DENSITY = 1.225;
const R_AIR = 287.058;

export const FT_PER_M = 3.280839895;
export const HPA_PER_INHG = 33.8638866667;

export function cToF(c: number): number {
  return (c * 9) / 5 + 32;
}
export function fToC(f: number): number {
  return ((f - 32) * 5) / 9;
}

export function pressureAltitudeFt(elevationFt: number, qnhHpa: number): number {
  return elevationFt + 145366.45 * (1 - Math.pow(qnhHpa / SEA_LEVEL_HPA, 0.190284));
}

export function isaTemperatureC(altitudeFt: number): number {
  return 15 - 0.0019812 * altitudeFt;
}

export type DensityResult = {
  pressureAltitudeFt: number;
  isaTempC: number;
  /** ISA 대비 기온 차이(°C) */
  isaDeviationC: number;
  densityRatio: number;
  densityAltitudeFt: number;
  /** 같은 무게로 호버링할 때 표준 해수면 대비 소요 동력 배율(1/√σ) */
  hoverPowerFactor: number;
};

export function densityAltitude(elevationFt: number, tempC: number, qnhHpa: number): DensityResult {
  const pa = pressureAltitudeFt(elevationFt, qnhHpa);
  const station = SEA_LEVEL_HPA * Math.pow(1 - 6.8755856e-6 * pa, 5.2558797);
  const rho = (station * 100) / (R_AIR * (tempC + 273.15));
  const sigma = rho / SEA_LEVEL_DENSITY;
  const da = (1 - Math.pow(sigma, 1 / 4.2558797)) / 6.8755856e-6;
  const isa = isaTemperatureC(pa);
  return {
    pressureAltitudeFt: pa,
    isaTempC: isa,
    isaDeviationC: tempC - isa,
    densityRatio: sigma,
    densityAltitudeFt: da,
    hoverPowerFactor: 1 / Math.sqrt(sigma),
  };
}
