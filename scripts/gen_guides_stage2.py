#!/usr/bin/env python3
"""Stage 2 guide content generator for FlyDroneMap.
Writes 16 topics x 4 locales = 64 .mdx files into content/guides/{locale}/{slug}.mdx.
Run once: python3 scripts/gen_guides_stage2.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GUIDES_DIR = os.path.join(ROOT, "content", "guides")
PUBLISHED_AT = "2026-08-26"

# Each topic: slug, category, tags, and per-locale {title, description, body}
TOPICS = []

def add(slug, category, tags, en, ko, ja, es):
    TOPICS.append({
        "slug": slug,
        "category": category,
        "tags": tags,
        "en": en, "ko": ko, "ja": ja, "es": es,
    })

# ---------------------------------------------------------------------------
# CATEGORY 1: weather-safety
# ---------------------------------------------------------------------------

add(
    "wind-gust-checklist-before-drone-flight",
    "weather-safety",
    ["wind", "safety", "preflight"],
    en={
        "title": "Wind & Gust Checklist Before a Drone Flight",
        "description": "A practical checklist for judging whether wind conditions are safe enough to launch your drone.",
        "body": """Wind is the single most common reason a routine drone flight goes wrong. Before you launch, run through this checklist.

## Check the sustained wind speed

Most consumer drones (under 250g to mid-size quads) are rated for sustained winds up to roughly 20-29 km/h (12-18 mph), depending on the model. Above that, expect reduced control authority and faster battery drain as the drone fights to hold position.

## Check the gust spread, not just the average

A 15 km/h average with gusts to 35 km/h is far more dangerous than a steady 20 km/h. Gusts are what cause sudden altitude drops, tilted horizons in footage, and difficulty landing precisely. Look at gust speed specifically, not just the average reading.

## Watch the direction, not only the speed

Wind that changes direction frequently (common near buildings, cliffs, or tree lines) creates turbulence that's harder to predict than steady wind from one direction. If you're flying near structures, assume the wind near the ground can differ significantly from wind at your intended altitude.

## Rules of thumb

- Below ~15 km/h (about 9 mph): generally comfortable for most consumer drones.
- 15-29 km/h (9-18 mph): flyable for many models, but expect visible drift and shortened flight time; beginners should be cautious.
- Above 29 km/h (18 mph): consider postponing unless your drone is explicitly rated for higher wind resistance.

## Before every flight

Check a live wind and gust reading for your exact location immediately before flying — conditions can shift within the hour, and forecasts issued the night before are not a substitute for a current reading.""",
    },
    ko={
        "title": "드론 비행 전 바람/돌풍 체크리스트",
        "description": "이륙 전 바람 상태가 비행하기에 충분히 안전한지 판단하는 실전 체크리스트입니다.",
        "body": """드론 비행 사고의 가장 흔한 원인은 바람입니다. 이륙하기 전 아래 체크리스트를 확인하세요.

## 지속 풍속을 확인하세요

일반적인 소비자용 드론(250g 미만 소형 기체부터 중형 쿼드콥터까지)은 모델에 따라 대략 시속 20~29km까지의 지속 풍속을 견디도록 설계되어 있습니다. 그 이상에서는 기체가 위치를 유지하기 위해 더 많은 출력을 쓰면서 배터리 소모가 빨라지고 조종 여유가 줄어듭니다.

## 평균이 아니라 돌풍의 편차를 보세요

평균 풍속이 시속 15km라도 돌풍이 35km까지 튄다면, 꾸준히 시속 20km로 부는 바람보다 훨씬 위험합니다. 돌풍은 갑작스러운 고도 하강, 촬영 영상의 수평 기울어짐, 정밀 착륙 실패의 주된 원인입니다. 평균값만 보지 말고 돌풍(gust) 수치를 별도로 확인하세요.

## 풍속뿐 아니라 풍향 변화도 확인하세요

건물, 절벽, 나무숲 근처에서는 풍향이 자주 바뀌는 난기류가 발생하기 쉬우며, 이는 한 방향으로 꾸준히 부는 바람보다 예측하기 어렵습니다. 구조물 근처에서 비행한다면 지면 근처 바람과 비행 고도의 바람이 크게 다를 수 있다는 점을 감안하세요.

## 대략적인 기준

- 시속 15km 이하: 대부분의 소비자용 드론에 무난한 조건
- 시속 15~29km: 많은 모델에서 비행 가능하지만 영상에 드리프트가 보이고 비행 시간이 줄어듬 — 초보자는 주의
- 시속 29km 초과: 강풍 대응 인증이 명시된 기체가 아니라면 비행을 미루는 것을 권장

## 비행 직전에 반드시

정확한 위치의 실시간 바람/돌풍 수치를 이륙 직전에 확인하세요. 조건은 한 시간 안에도 바뀔 수 있어서, 전날 밤 예보만으로는 충분하지 않습니다.""",
    },
    ja={
        "title": "ドローン飛行前の風・突風チェックリスト",
        "description": "離陸前に風の状態が安全な飛行に十分かどうかを判断するための実践的なチェックリストです。",
        "body": """風はドローン飛行が予定通りいかなくなる最も一般的な原因です。離陸前に以下のチェックリストを確認しましょう。

## 持続風速を確認する

多くの民生用ドローン(250g未満の小型機から中型クアッドまで)は、機種によって時速20〜29km程度までの持続風に耐えるよう設計されています。それを超えると、機体が位置を保持するためにより多くの出力を使い、バッテリー消費が早まり、操縦の余裕が減ります。

## 平均値ではなく突風の幅を見る

平均風速が時速15kmでも、突風が時速35kmまで吹くなら、一定に時速20kmで吹く風よりもはるかに危険です。突風は急な高度低下、映像の水平の乱れ、精密な着陸の失敗の主な原因です。平均値だけでなく、突風(gust)の数値を別途確認しましょう。

## 風速だけでなく風向の変化も確認する

建物、崖、樹木のそばでは風向が頻繁に変わる乱気流が発生しやすく、一方向から一定に吹く風より予測が難しくなります。構造物の近くで飛行する場合、地面付近の風と飛行高度の風が大きく異なる可能性があることを念頭に置いてください。

## おおよその目安

- 時速15km以下: ほとんどの民生用ドローンに問題ない条件
- 時速15〜29km: 多くの機種で飛行可能だが、映像にドリフトが見え、飛行時間も短くなる — 初心者は注意
- 時速29km超: 強風対応が明記された機体でない限り、飛行を見送ることを推奨

## 飛行直前に必ず

正確な位置のリアルタイムの風・突風数値を離陸直前に確認しましょう。状況は1時間以内でも変わることがあり、前夜の予報だけでは不十分です。""",
    },
    es={
        "title": "Lista de verificación de viento y ráfagas antes de volar un dron",
        "description": "Una lista práctica para juzgar si las condiciones de viento son lo bastante seguras para despegar tu dron.",
        "body": """El viento es la causa más común de que un vuelo rutinario de dron salga mal. Antes de despegar, revisa esta lista.

## Comprueba la velocidad sostenida del viento

La mayoría de los drones de consumo (desde modelos de menos de 250g hasta cuadricópteros medianos) están clasificados para vientos sostenidos de hasta unos 20-29 km/h, según el modelo. Por encima de eso, espera menor autoridad de control y un consumo de batería más rápido mientras el dron lucha por mantener su posición.

## Observa la dispersión de las ráfagas, no solo el promedio

Un promedio de 15 km/h con ráfagas de hasta 35 km/h es mucho más peligroso que un viento constante de 20 km/h. Las ráfagas son las que causan caídas repentinas de altitud, horizontes inclinados en el video y dificultad para aterrizar con precisión. Fíjate específicamente en la velocidad de ráfaga, no solo en el promedio.

## Vigila la dirección, no solo la velocidad

El viento que cambia de dirección con frecuencia (común cerca de edificios, acantilados o líneas de árboles) crea turbulencia más difícil de predecir que un viento constante desde una sola dirección. Si vuelas cerca de estructuras, asume que el viento cerca del suelo puede diferir bastante del viento a tu altitud prevista.

## Reglas prácticas

- Por debajo de ~15 km/h: generalmente cómodo para la mayoría de drones de consumo.
- 15-29 km/h: volable para muchos modelos, pero espera deriva visible y menor tiempo de vuelo; los principiantes deben tener cuidado.
- Por encima de 29 km/h: considera posponer el vuelo salvo que tu dron esté explícitamente clasificado para mayor resistencia al viento.

## Antes de cada vuelo

Consulta una lectura de viento y ráfagas en tiempo real para tu ubicación exacta justo antes de volar — las condiciones pueden cambiar en una hora, y un pronóstico de la noche anterior no sustituye una lectura actual.""",
    },
)

add(
    "why-rain-is-dangerous-for-drone-flights",
    "weather-safety",
    ["rain", "safety", "waterproofing"],
    en={
        "title": "Why Flying a Drone in the Rain Is Dangerous",
        "description": "The real reasons rain and drones don't mix, beyond the obvious 'it's not waterproof' warning.",
        "body": """Most consumer drones are not rated for rain, and the reasons go beyond simple water damage.

## Electronics and moisture

Water intrusion into the flight controller, ESCs, or battery contacts can cause short circuits mid-flight — not just after landing. A drone that suddenly cuts power over water, a road, or a crowd is far more dangerous than one that simply gets wet on the ground.

## Propeller and motor effects

Rain reduces propeller efficiency and adds unpredictable weight distribution as water beads or streams off the blades, which can subtly affect stability, especially in gusty rain.

## Camera and gimbal risk

Even a light drizzle can fog or spot a lens instantly, and gimbals are rarely sealed as well as the main body — moisture reaching gimbal motors is a common cause of expensive repairs.

## Reduced visibility compounds the risk

Rain often arrives with lower visibility and cloud ceilings, which independently increases the risk of losing visual line of sight — a core requirement in most drone regulations.

## What to do instead

Check current precipitation before flying, not just a general forecast — light drizzle can start well before a forecast's stated rain window. If rain starts mid-flight, land immediately rather than trying to finish the shot.""",
    },
    ko={
        "title": "비 오는 날 드론 비행이 위험한 이유",
        "description": "'방수가 안 되니까'라는 뻔한 이유를 넘어, 비와 드론이 어울리지 않는 진짜 이유를 설명합니다.",
        "body": """대부분의 소비자용 드론은 방우 등급이 없으며, 그 이유는 단순한 침수 손상을 넘어섭니다.

## 전자장치와 습기

비행 컨트롤러, ESC, 배터리 접점에 물이 스며들면 착륙 후가 아니라 비행 중에 합선이 일어날 수 있습니다. 도로나 사람이 많은 곳, 물 위를 비행하던 중 갑자기 전원이 끊기는 드론은 단순히 땅에서 젖는 것보다 훨씬 위험합니다.

## 프로펠러와 모터에 미치는 영향

비는 프로펠러 효율을 떨어뜨리고, 날개에 맺히거나 흘러내리는 물방울이 예측하기 어려운 무게 분포를 만들어 안정성에 미묘한 영향을 줄 수 있습니다. 돌풍을 동반한 비라면 더욱 그렇습니다.

## 카메라와 짐벌 리스크

가벼운 이슬비만으로도 렌즈에 즉시 김이 서리거나 물방울 자국이 생길 수 있고, 짐벌은 본체만큼 밀폐되어 있지 않은 경우가 많아 짐벌 모터에 습기가 침투하는 것이 값비싼 수리로 이어지는 흔한 원인입니다.

## 시야 저하가 위험을 더합니다

비는 대개 가시거리 저하와 낮은 구름 고도를 동반하는데, 이는 대부분의 드론 규정에서 핵심 요건인 육안 시야 확보(VLOS)를 놓칠 위험을 별도로 높입니다.

## 대신 이렇게 하세요

일반적인 예보뿐 아니라 현재 강수 상태를 비행 직전에 확인하세요. 가벼운 이슬비는 예보상의 강수 시작 시간보다 훨씬 일찍 시작될 수 있습니다. 비행 중 비가 내리기 시작하면 촬영을 마무리하려 하지 말고 즉시 착륙하세요.""",
    },
    ja={
        "title": "雨の日にドローンを飛ばすのが危険な理由",
        "description": "「防水ではないから」という当たり前の理由を超えて、雨とドローンが相性が悪い本当の理由を説明します。",
        "body": """ほとんどの民生用ドローンは防雨等級を持っておらず、その理由は単純な浸水損傷を超えています。

## 電子機器と湿気

フライトコントローラー、ESC、バッテリー接点に水が浸入すると、着陸後ではなく飛行中にショートが起きることがあります。道路や人混み、水上を飛行中に突然電源が切れるドローンは、地上で単に濡れるよりもはるかに危険です。

## プロペラとモーターへの影響

雨はプロペラの効率を下げ、ブレードに水滴がたまったり流れ落ちたりすることで予測しにくい重量配分が生まれ、安定性にわずかな影響を与えることがあります。突風を伴う雨ならなおさらです。

## カメラとジンバルのリスク

軽い霧雨でもレンズがすぐに曇ったり水滴の跡がついたりし、ジンバルは本体ほど密閉されていないことが多いため、ジンバルモーターへの湿気の侵入は高額な修理の一般的な原因です。

## 視界の低下がリスクを増大させる

雨はしばしば視程の低下や雲底の低下を伴い、これはほとんどのドローン規定で核心要件である目視外飛行の回避(VLOS)を失うリスクを独立して高めます。

## 代わりにすべきこと

一般的な予報だけでなく、飛行直前に現在の降水状況を確認しましょう。小雨は予報上の降雨開始時刻よりずっと早く始まることがあります。飛行中に雨が降り始めたら、撮影を終わらせようとせずすぐに着陸してください。""",
    },
    es={
        "title": "Por qué es peligroso volar un dron bajo la lluvia",
        "description": "Las razones reales por las que la lluvia y los drones no combinan, más allá de la advertencia obvia de 'no es resistente al agua'.",
        "body": """La mayoría de los drones de consumo no están clasificados para la lluvia, y las razones van más allá del simple daño por agua.

## Electrónica y humedad

La entrada de agua en el controlador de vuelo, los ESC o los contactos de la batería puede causar cortocircuitos en pleno vuelo, no solo después de aterrizar. Un dron que pierde potencia de repente sobre agua, una carretera o una multitud es mucho más peligroso que uno que simplemente se moja en el suelo.

## Efectos en las hélices y motores

La lluvia reduce la eficiencia de las hélices y añade una distribución de peso impredecible mientras el agua forma gotas o escurre de las palas, lo que puede afectar sutilmente la estabilidad, especialmente con lluvia y ráfagas.

## Riesgo para la cámara y el gimbal

Incluso una llovizna ligera puede empañar o manchar una lente al instante, y los gimbals rara vez están tan sellados como el cuerpo principal — la humedad que llega a los motores del gimbal es una causa común de reparaciones costosas.

## La visibilidad reducida agrava el riesgo

La lluvia suele llegar con menor visibilidad y techos de nubes más bajos, lo que aumenta de forma independiente el riesgo de perder la línea de visión visual, un requisito central en la mayoría de las normativas de drones.

## Qué hacer en su lugar

Revisa la precipitación actual antes de volar, no solo un pronóstico general — una llovizna ligera puede empezar bastante antes de la ventana de lluvia indicada en el pronóstico. Si empieza a llover durante el vuelo, aterriza de inmediato en lugar de intentar terminar la toma.""",
    },
)

add(
    "temperature-and-drone-battery-performance",
    "weather-safety",
    ["battery", "cold-weather", "temperature"],
    en={
        "title": "How Temperature Affects Drone Battery Performance",
        "description": "Why cold weather drains drone batteries faster, and how to fly safely in low temperatures.",
        "body": """Lithium-polymer (LiPo) batteries, used in nearly all consumer drones, are chemically sensitive to temperature — and cold is the more common problem pilots underestimate.

## Why cold hurts LiPo batteries

Below roughly 10°C (50°F), the internal chemical reactions that produce current slow down, increasing internal resistance. This shows up as reduced available capacity, a voltage sag under load, and sometimes an early low-battery warning that doesn't match a fully charged battery's usual runtime.

## What this looks like in flight

A battery that shows 100% at takeoff in cold weather can trigger a critical low-battery return-to-home far earlier than expected, because voltage — not just percentage — drives most drones' safety cutoffs. Sudden altitude loss in the final minute of a cold-weather flight is a known symptom.

## Practical steps for cold weather

- Keep spare batteries insulated (an inner jacket pocket works) until just before flight.
- Take off with a battery that's been near room temperature, not one that's been sitting in a cold car or bag.
- Plan for meaningfully shorter flight times than the manufacturer's stated maximum — 20-30% less is a reasonable starting assumption below 0°C (32°F).
- Land with more margin than usual; don't rely on the last 10% of indicated battery in cold conditions.

## Heat matters too

At the other extreme, batteries charged or flown in direct sun above roughly 40°C (104°F) face accelerated degradation and, in rare cases, swelling. Store and charge batteries in shade whenever possible.""",
    },
    ko={
        "title": "기온이 드론 배터리 성능에 미치는 영향",
        "description": "추운 날씨에서 드론 배터리가 더 빨리 소모되는 이유와 저온에서 안전하게 비행하는 방법을 설명합니다.",
        "body": """거의 모든 소비자용 드론에 쓰이는 리튬폴리머(LiPo) 배터리는 온도에 화학적으로 민감하며, 조종자들이 자주 과소평가하는 문제는 저온입니다.

## 추위가 LiPo 배터리에 나쁜 이유

대략 섭씨 10도 이하에서는 전류를 만드는 내부 화학 반응이 느려지면서 내부 저항이 커집니다. 이는 사용 가능한 용량 감소, 부하가 걸릴 때 전압 강하, 그리고 완충된 배터리치고는 이르게 뜨는 저전압 경고로 나타나기도 합니다.

## 실제 비행에서 나타나는 현상

추운 날씨에서 이륙 시 100%로 표시된 배터리가 예상보다 훨씬 일찍 위급 저전압 자동복귀(RTH)를 유발할 수 있습니다. 대부분의 드론 안전 컷오프는 퍼센트 표시가 아니라 전압을 기준으로 작동하기 때문입니다. 저온 비행 마지막 순간의 갑작스러운 고도 하강은 잘 알려진 증상입니다.

## 저온 비행을 위한 실천 방법

- 예비 배터리는 비행 직전까지 몸에 가까운 안쪽 주머니 등에 넣어 보온하세요.
- 실온에 가까운 배터리로 이륙하고, 추운 차 안이나 가방에 방치된 배터리는 피하세요.
- 제조사가 명시한 최대 비행 시간보다 실질적으로 짧게 계획하세요. 섭씨 0도 이하에서는 20~30% 짧게 잡는 것이 합리적인 출발점입니다.
- 평소보다 여유를 두고 착륙하세요. 저온 조건에서는 표시된 배터리의 마지막 10%를 믿지 마세요.

## 고온도 문제입니다

반대로 섭씨 40도를 넘는 직사광선 아래에서 충전하거나 비행하면 배터리 열화가 가속되고, 드물게는 팽창이 발생할 수 있습니다. 가능하면 그늘에서 배터리를 보관하고 충전하세요.""",
    },
    ja={
        "title": "気温がドローンのバッテリー性能に与える影響",
        "description": "寒い天気でドローンのバッテリーがより早く消耗する理由と、低温下で安全に飛行する方法を説明します。",
        "body": """ほぼすべての民生用ドローンに使われるリチウムポリマー(LiPo)電池は温度に化学的に敏感で、パイロットが過小評価しがちな問題は低温です。

## 寒さがLiPo電池に悪い理由

おおよそ摂氏10度以下では、電流を生み出す内部の化学反応が遅くなり、内部抵抗が増加します。これは使用可能な容量の低下、負荷時の電圧降下、そして満充電のバッテリーにしては早く出る低電圧警告として現れることがあります。

## 実際の飛行での現れ方

寒い天気で離陸時に100%と表示されたバッテリーが、予想よりずっと早く緊急低電圧の自動帰還(RTH)を引き起こすことがあります。ほとんどのドローンの安全カットオフはパーセント表示ではなく電圧に基づいて作動するためです。低温飛行の最終盤での急な高度低下はよく知られた症状です。

## 低温飛行のための実践方法

- 予備バッテリーは飛行直前まで体に近い内ポケットなどで保温しましょう。
- 室温に近いバッテリーで離陸し、寒い車内やバッグに放置されたバッテリーは避けましょう。
- メーカーが示す最大飛行時間より実質的に短く計画しましょう。摂氏0度以下では20〜30%短く見積もるのが妥当な出発点です。
- いつもより余裕を持って着陸しましょう。低温条件では表示されたバッテリーの残り10%を信用しないでください。

## 高温も問題です

逆に摂氏40度を超える直射日光下で充電や飛行を行うと、バッテリーの劣化が加速し、まれに膨張が起きることもあります。可能な限り日陰でバッテリーを保管・充電しましょう。""",
    },
    es={
        "title": "Cómo afecta la temperatura al rendimiento de la batería del dron",
        "description": "Por qué el frío agota más rápido las baterías de los drones y cómo volar de forma segura a bajas temperaturas.",
        "body": """Las baterías de polímero de litio (LiPo), usadas en casi todos los drones de consumo, son químicamente sensibles a la temperatura — y el frío es el problema más común que los pilotos subestiman.

## Por qué el frío perjudica a las baterías LiPo

Por debajo de aproximadamente 10°C, las reacciones químicas internas que producen corriente se ralentizan, aumentando la resistencia interna. Esto se traduce en menor capacidad disponible, una caída de voltaje bajo carga y, a veces, una advertencia temprana de batería baja que no coincide con la autonomía habitual de una batería completamente cargada.

## Cómo se manifiesta en vuelo

Una batería que muestra 100% al despegar en clima frío puede activar un retorno a casa por batería crítica mucho antes de lo esperado, porque el voltaje —no solo el porcentaje— es lo que activa la mayoría de los cortes de seguridad de los drones. Una pérdida repentina de altitud en el último minuto de un vuelo con frío es un síntoma conocido.

## Pasos prácticos para clima frío

- Mantén las baterías de repuesto aisladas (un bolsillo interior de la chaqueta funciona) hasta justo antes de volar.
- Despega con una batería que haya estado cerca de la temperatura ambiente, no una que haya estado en un coche frío o una bolsa.
- Planea tiempos de vuelo notablemente más cortos que el máximo indicado por el fabricante — un 20-30% menos es un supuesto inicial razonable por debajo de 0°C.
- Aterriza con más margen del habitual; no confíes en el último 10% de batería indicado en condiciones de frío.

## El calor también importa

En el otro extremo, las baterías cargadas o usadas en vuelo bajo sol directo por encima de unos 40°C sufren una degradación acelerada y, en casos raros, hinchazón. Almacena y carga las baterías a la sombra siempre que sea posible.""",
    },
)

add(
    "visibility-and-safe-drone-flight-standards",
    "weather-safety",
    ["visibility", "vlos", "safety"],
    en={
        "title": "Visibility and Safe Drone Flight Standards",
        "description": "Why visibility distance matters as much as wind or rain, and what minimum visibility most regulations expect.",
        "body": """Visual line of sight (VLOS) is a foundational requirement in nearly every country's drone regulations, and visibility distance is what determines whether it's actually achievable.

## What "visibility" means for flying

Meteorological visibility is the distance at which a large object can still be clearly distinguished from the background. Haze, fog, smoke, heavy rain, and even bright low-sun glare can all reduce it well below what a forecast's "clear" label implies.

## Typical regulatory expectations

Many national frameworks (including the FAA's Part 107 in the U.S.) require at least 3 statute miles (about 4.8 km) of visibility for the operating area, alongside minimum cloud-clearance distances. Even where a specific number isn't mandated, the underlying principle — you and any required observer must be able to see the drone and surrounding air traffic — is close to universal.

## Why this matters beyond compliance

Reduced visibility doesn't just risk a violation; it directly increases collision risk with manned aircraft, especially near airports, and makes it easy to lose orientation of a small drone against a hazy sky.

## Practical guidance

Check current visibility, not just cloud cover, before flying — a day can look clear from indoors while haze near the horizon limits practical VLOS. If visibility drops noticeably during a flight (common at dusk or as fog rolls in), bring the drone back well before you'd actually lose sight of it.""",
    },
    ko={
        "title": "가시거리와 안전한 드론 비행 기준",
        "description": "가시거리가 바람이나 비 못지않게 중요한 이유와, 대부분의 규정이 요구하는 최소 가시거리를 설명합니다.",
        "body": """육안 시야 확보(VLOS)는 거의 모든 국가의 드론 규정에서 기본이 되는 요건이며, 가시거리는 이것이 실제로 가능한지를 결정합니다.

## 비행에서 '가시거리'가 의미하는 것

기상학적 가시거리란 큰 물체가 배경과 뚜렷이 구분되는 거리를 말합니다. 안개, 연무, 연기, 강한 비, 심지어 낮게 뜬 태양의 강한 역광까지도 예보의 '맑음' 표시가 암시하는 것보다 가시거리를 훨씬 낮출 수 있습니다.

## 일반적인 규정상의 기준

미국 FAA Part 107을 포함한 많은 국가의 규정은 비행 구역에서 최소 약 4.8km(3 statute mile)의 가시거리와 함께 최소 구름 이격 거리를 요구합니다. 구체적인 수치가 명시되지 않은 경우에도, 조종자와 필요한 관찰자가 드론과 주변 항공 교통을 볼 수 있어야 한다는 원칙은 거의 보편적입니다.

## 단순한 규정 준수를 넘어서는 이유

가시거리 저하는 단순히 규정 위반의 위험만이 아니라, 특히 공항 근처에서 유인 항공기와의 충돌 위험을 직접적으로 높이며, 흐릿한 하늘을 배경으로 작은 드론의 방향을 놓치기 쉽게 만듭니다.

## 실전 가이드

비행 전 구름량뿐 아니라 실제 가시거리를 확인하세요. 실내에서 보기엔 맑은 날이라도 지평선 근처의 연무가 실질적인 VLOS를 제한할 수 있습니다. 비행 중 가시거리가 눈에 띄게 떨어진다면(해질녘이나 안개가 밀려올 때 흔함) 실제로 시야를 놓치기 훨씬 전에 드론을 미리 복귀시키세요.""",
    },
    ja={
        "title": "視程と安全なドローン飛行基準",
        "description": "視程距離が風や雨と同じくらい重要な理由と、ほとんどの規制が求める最低視程について説明します。",
        "body": """目視外飛行の回避(VLOS)は、ほぼすべての国のドローン規制における基本要件であり、視程距離はそれが実際に可能かどうかを左右します。

## 飛行における「視程」の意味

気象学的な視程とは、大きな物体が背景からはっきりと識別できる距離を指します。もや、煙霧、煙、強い雨、さらには低い太陽の強い逆光まで、予報の「晴れ」表示が示唆するよりもはるかに視程を下げることがあります。

## 一般的な規制上の目安

米国のFAA Part 107を含む多くの国の規制は、飛行区域で最低約4.8km(3statute mile)の視程と、最低限の雲からの距離を要求しています。具体的な数値が定められていない場合でも、パイロットや必要な監視者がドローンと周辺の航空交通を視認できなければならないという原則はほぼ普遍的です。

## 単なる法令順守を超える理由

視程の低下は単に規制違反のリスクだけでなく、特に空港近くで有人航空機との衝突リスクを直接高め、もやのかかった空を背景に小さなドローンの向きを見失いやすくします。

## 実践的なガイダンス

飛行前に雲量だけでなく実際の視程を確認しましょう。室内から見ると晴れた日でも、地平線付近のもやが実質的なVLOSを制限することがあります。飛行中に視程が目に見えて低下した場合(夕暮れや霧が迫るときによくある)、実際に見失うよりずっと前にドローンを呼び戻しましょう。""",
    },
    es={
        "title": "Visibilidad y estándares de vuelo seguro para drones",
        "description": "Por qué la distancia de visibilidad importa tanto como el viento o la lluvia, y qué visibilidad mínima exigen la mayoría de las normativas.",
        "body": """La línea de visión visual (VLOS) es un requisito fundamental en casi todas las normativas de drones del mundo, y la distancia de visibilidad determina si realmente es alcanzable.

## Qué significa "visibilidad" para volar

La visibilidad meteorológica es la distancia a la que un objeto grande todavía puede distinguirse claramente del fondo. La neblina, la niebla, el humo, la lluvia intensa e incluso el resplandor de un sol bajo pueden reducirla muy por debajo de lo que sugiere la etiqueta "despejado" de un pronóstico.

## Expectativas regulatorias típicas

Muchos marcos nacionales (incluida la Parte 107 de la FAA en EE. UU.) exigen al menos 3 millas terrestres (unos 4.8 km) de visibilidad en la zona de operación, junto con distancias mínimas de separación de nubes. Incluso donde no se exige una cifra específica, el principio subyacente —que tú y cualquier observador requerido deben poder ver el dron y el tráfico aéreo circundante— es casi universal.

## Por qué esto importa más allá del cumplimiento normativo

La visibilidad reducida no solo supone el riesgo de una infracción; aumenta directamente el riesgo de colisión con aeronaves tripuladas, especialmente cerca de aeropuertos, y facilita perder la orientación de un dron pequeño contra un cielo con neblina.

## Consejo práctico

Comprueba la visibilidad actual, no solo la cobertura de nubes, antes de volar — un día puede parecer despejado desde el interior mientras la neblina cerca del horizonte limita la VLOS práctica. Si la visibilidad baja notablemente durante un vuelo (algo común al atardecer o cuando llega la niebla), haz regresar el dron mucho antes de perderlo realmente de vista.""",
    },
)

# ---------------------------------------------------------------------------
# CATEGORY 2: space-weather-gps
# ---------------------------------------------------------------------------

add(
    "what-is-the-kp-index",
    "space-weather-gps",
    ["kp-index", "space-weather", "basics"],
    en={
        "title": "What Is the Kp Index? A Beginner's Guide to Geomagnetic Storms",
        "description": "A plain-language explanation of the planetary Kp index and what its scale actually measures.",
        "body": """The Kp index is a number from 0 to 9 that measures how disturbed Earth's magnetic field is at a given time, published by space weather agencies including NOAA's Space Weather Prediction Center.

## Where it comes from

Kp is derived from measurements at a global network of ground-based magnetometers. Every 3 hours, those readings are combined into a single planetary value — hence "planetary Kp index" — that reflects geomagnetic activity worldwide rather than at one specific location.

## What the scale means

- Kp 0-3: Quiet to unsettled. Normal background geomagnetic activity.
- Kp 4: Active. Minor disturbance, generally no operational impact for most users.
- Kp 5-6: Minor to moderate geomagnetic storm (G1-G2 on NOAA's storm scale).
- Kp 7-9: Strong to extreme geomagnetic storm (G3-G5), associated with major solar events.

## Why it's published in real time

Kp is driven by solar activity — coronal mass ejections and high-speed solar wind streams interacting with Earth's magnetosphere — which can spike within hours. NOAA updates the planetary Kp index roughly every few minutes to an hour depending on the product, giving anyone affected by geomagnetic conditions a near-current picture rather than yesterday's forecast.

## Who tracks it and why

Beyond aurora chasers, Kp is monitored by satellite operators, power grid operators, HF radio users, and — relevant here — drone pilots, because elevated geomagnetic activity can degrade GPS positioning accuracy exactly when precise navigation matters most.""",
    },
    ko={
        "title": "KP지수란 무엇인가: 지자기 폭풍 초보자 가이드",
        "description": "행성 KP지수가 실제로 무엇을 측정하는지 쉬운 말로 설명합니다.",
        "body": """KP지수는 특정 시점에 지구 자기장이 얼마나 교란되었는지를 나타내는 0부터 9까지의 수치로, 미국 NOAA 우주기상센터를 비롯한 우주기상 기관들이 발표합니다.

## KP지수는 어디서 나오는가

KP지수는 전 세계에 분포한 지상 자력계 네트워크의 측정값에서 도출됩니다. 3시간마다 이 값들을 합쳐 하나의 '행성' 값으로 만드는데, 이 때문에 '행성 KP지수'라 부르며 특정 한 지점이 아니라 전 세계적인 지자기 활동을 반영합니다.

## 척도가 의미하는 것

- KP 0~3: 평온~약간 불안정. 정상적인 배경 지자기 활동
- KP 4: 활성. 경미한 교란이며 대부분의 사용자에게 실질적 영향은 없음
- KP 5~6: 소~중규모 지자기 폭풍 (NOAA 폭풍 등급 G1~G2)
- KP 7~9: 강~극단 지자기 폭풍 (G3~G5), 대규모 태양 현상과 관련

## 왜 실시간으로 발표되는가

KP지수는 코로나물질방출(CME)이나 고속 태양풍이 지구 자기권과 상호작용하는 태양 활동에 따라 움직이며, 몇 시간 안에 급등할 수 있습니다. NOAA는 제품에 따라 몇 분에서 한 시간 간격으로 행성 KP지수를 갱신하여, 지자기 상태의 영향을 받는 사람들에게 어제의 예보가 아닌 거의 실시간에 가까운 그림을 제공합니다.

## 누가, 왜 이를 추적하는가

오로라를 쫓는 사람들 외에도 위성 운영자, 전력망 운영자, 단파 무선 사용자, 그리고 여기서 다루는 드론 조종자들이 KP지수를 주시합니다. 지자기 활동이 높아지면 정밀한 항법이 가장 중요한 순간에 하필 GPS 위치 정확도가 떨어질 수 있기 때문입니다.""",
    },
    ja={
        "title": "KP指数とは何か:地磁気嵐の初心者ガイド",
        "description": "惑星KP指数が実際に何を測定しているのかを平易な言葉で説明します。",
        "body": """KP指数は、ある時点で地球の磁場がどれだけ乱れているかを示す0から9までの数値で、NOAAの宇宙天気予報センターなどの宇宙天気機関が発表しています。

## KP指数はどこから来るのか

KP指数は、世界中に分布する地上磁力計ネットワークの測定値から導き出されます。3時間ごとにこれらの値をまとめて1つの「惑星」値にするため、「惑星KP指数」と呼ばれ、特定の1地点ではなく世界的な地磁気活動を反映します。

## 尺度が意味すること

- KP 0〜3: 静穏〜やや不安定。通常の背景地磁気活動
- KP 4: 活発。軽微な擾乱で、ほとんどのユーザーへの実質的な影響はなし
- KP 5〜6: 小〜中規模の地磁気嵐(NOAA嵐等級G1〜G2)
- KP 7〜9: 強〜極端な地磁気嵐(G3〜G5)、大規模な太陽現象に関連

## なぜリアルタイムで発表されるのか

KP指数はコロナ質量放出(CME)や高速太陽風が地球の磁気圏と相互作用する太陽活動によって動き、数時間で急上昇することがあります。NOAAは製品によって数分から1時間間隔で惑星KP指数を更新し、地磁気の状態に影響を受ける人々に昨日の予報ではなくほぼリアルタイムの状況を提供します。

## 誰が、なぜ追跡しているのか

オーロラを追いかける人々だけでなく、衛星運用者、送電網運用者、短波無線利用者、そしてここで扱うドローンパイロットもKP指数を注視しています。地磁気活動が高まると、精密なナビゲーションが最も重要な瞬間に、まさにGPS測位精度が低下することがあるためです。""",
    },
    es={
        "title": "¿Qué es el índice Kp? Guía para principiantes sobre tormentas geomagnéticas",
        "description": "Una explicación en lenguaje sencillo del índice Kp planetario y lo que realmente mide su escala.",
        "body": """El índice Kp es un número de 0 a 9 que mide cuán perturbado está el campo magnético de la Tierra en un momento dado, publicado por agencias de clima espacial como el Centro de Predicción del Clima Espacial de la NOAA.

## De dónde proviene

Kp se deriva de mediciones de una red mundial de magnetómetros terrestres. Cada 3 horas, esas lecturas se combinan en un único valor planetario —de ahí "índice Kp planetario"— que refleja la actividad geomagnética a nivel mundial en lugar de en un lugar específico.

## Qué significa la escala

- Kp 0-3: Tranquilo a inquieto. Actividad geomagnética de fondo normal.
- Kp 4: Activo. Perturbación menor, generalmente sin impacto operativo para la mayoría de los usuarios.
- Kp 5-6: Tormenta geomagnética menor a moderada (G1-G2 en la escala de tormentas de la NOAA).
- Kp 7-9: Tormenta geomagnética fuerte a extrema (G3-G5), asociada a grandes eventos solares.

## Por qué se publica en tiempo real

Kp está impulsado por la actividad solar —eyecciones de masa coronal y corrientes de viento solar de alta velocidad que interactúan con la magnetosfera terrestre— que puede dispararse en cuestión de horas. La NOAA actualiza el índice Kp planetario aproximadamente cada pocos minutos a una hora según el producto, ofreciendo a cualquiera afectado por las condiciones geomagnéticas una imagen casi actual en lugar del pronóstico de ayer.

## Quién lo rastrea y por qué

Además de los cazadores de auroras, el Kp lo monitorean operadores de satélites, operadores de redes eléctricas, usuarios de radio HF y, lo relevante aquí, pilotos de drones, porque una actividad geomagnética elevada puede degradar la precisión del posicionamiento GPS justo cuando la navegación precisa importa más.""",
    },
)

add(
    "kp-index-effect-on-gps-compass-reliability",
    "space-weather-gps",
    ["kp-index", "gps", "compass"],
    en={
        "title": "How the Kp Index Affects GPS and Compass Reliability",
        "description": "The physical link between geomagnetic activity and reduced GPS/compass accuracy for drones.",
        "body": """Drones rely on GPS for position-holding and a magnetometer (electronic compass) for heading. Both can be affected when geomagnetic activity rises.

## Why GPS degrades during geomagnetic storms

Geomagnetic storms disturb the ionosphere, the charged layer of the upper atmosphere that GPS signals pass through on their way from satellites to your drone. Increased ionospheric disturbance introduces extra signal delay and scintillation (rapid signal fluctuation), which reduces position-fix accuracy and, in more severe cases, can cause temporary loss of GPS lock.

## Why the compass is affected separately

A drone's magnetometer measures the local magnetic field directly to determine heading. A disturbed geomagnetic field is, by definition, a less stable reference — this is the same physical phenomenon the Kp index quantifies. A compass reading during a storm can drift or "yaw" unexpectedly even when the drone hasn't physically rotated.

## What this looks like to a pilot

Symptoms reported during elevated Kp include: the drone's position drifting slightly in GPS mode without stick input, "toilet bowl" circling behavior on return-to-home, or a compass calibration warning that wasn't present the day before in the same location.

## Practical takeaway

At Kp 5 and above, treat GPS-assisted flight modes with extra caution — fly at lower altitude, keep the drone closer, and be ready to switch to manual/attitude mode if position-hold becomes unreliable. This is exactly why checking a live Kp reading before flying, not just wind and rain, is part of a complete preflight check.""",
    },
    ko={
        "title": "KP지수가 GPS와 나침반 신뢰도에 미치는 영향",
        "description": "지자기 활동과 드론의 GPS/나침반 정확도 저하 사이의 물리적 연관성을 설명합니다.",
        "body": """드론은 위치 유지를 위해 GPS를, 방위 측정을 위해 자력계(전자 나침반)를 사용합니다. 지자기 활동이 높아지면 둘 다 영향을 받을 수 있습니다.

## 지자기 폭풍 중 GPS가 저하되는 이유

지자기 폭풍은 GPS 신호가 위성에서 드론까지 이동하는 경로 상의 전리층(상층 대기의 하전 입자층)을 교란합니다. 전리층 교란이 커지면 신호 지연과 신틸레이션(빠른 신호 요동)이 추가되어 위치 산출 정확도가 떨어지고, 심한 경우 일시적으로 GPS 고정을 잃을 수도 있습니다.

## 나침반이 별도로 영향받는 이유

드론의 자력계는 현지 자기장을 직접 측정해 방위를 결정합니다. 교란된 지자기장은 정의상 덜 안정적인 기준이 되는데, 이는 바로 KP지수가 수치화하는 물리 현상과 동일합니다. 폭풍 중에는 드론이 물리적으로 회전하지 않았는데도 나침반 값이 예기치 않게 흔들리거나 '요잉(yaw)'할 수 있습니다.

## 조종자에게 실제로 나타나는 현상

KP지수가 높을 때 보고되는 증상으로는: 스틱 조작 없이도 GPS 모드에서 위치가 살짝 드리프트하는 것, 자동복귀(RTH) 중 '변기물' 회전 현상, 전날 같은 장소에서는 없던 나침반 보정 경고 등이 있습니다.

## 실전 요령

KP 5 이상에서는 GPS 보조 비행 모드를 더 조심해서 다루세요 — 고도를 낮추고, 드론을 더 가까이 두고, 위치 유지가 불안정해지면 수동/자세 모드로 전환할 준비를 하세요. 바람과 비뿐 아니라 실시간 KP지수를 비행 전에 확인하는 것이 완전한 사전 점검의 일부인 이유가 바로 여기에 있습니다.""",
    },
    ja={
        "title": "KP指数がGPSとコンパスの信頼性に与える影響",
        "description": "地磁気活動とドローンのGPS・コンパス精度低下との物理的な関連を説明します。",
        "body": """ドローンは位置保持のためにGPSを、方位のために磁力計(電子コンパス)を使用します。地磁気活動が高まると、両方が影響を受ける可能性があります。

## 地磁気嵐でGPSが低下する理由

地磁気嵐は、GPS信号が衛星からドローンまで届く経路上にある電離層(上層大気の帯電した層)を乱します。電離層の擾乱が大きくなると、信号の遅延やシンチレーション(急速な信号変動)が加わり、測位精度が低下し、深刻な場合は一時的にGPSロックを失うこともあります。

## コンパスが別途影響を受ける理由

ドローンの磁力計は現地の磁場を直接測定して方位を決定します。乱れた地磁気は定義上より不安定な基準となり、これはまさにKP指数が数値化する物理現象と同じです。嵐の間は、ドローンが物理的に回転していなくても、コンパスの値が予想外に揺れたり「ヨー」したりすることがあります。

## パイロットに実際に現れる現象

KP指数が高いときに報告される症状には、スティック操作なしにGPSモードで位置がわずかにドリフトする、自動帰還(RTH)中の「便器状」旋回、前日は同じ場所でなかったコンパスキャリブレーション警告などがあります。

## 実践的な結論

KP5以上では、GPS支援飛行モードをより慎重に扱いましょう。高度を下げ、ドローンを近くに保ち、位置保持が不安定になったら手動・姿勢モードに切り替える準備をしてください。風や雨だけでなく、飛行前にリアルタイムのKP指数を確認することが、完全な事前点検の一部である理由がここにあります。""",
    },
    es={
        "title": "Cómo afecta el índice Kp a la fiabilidad del GPS y la brújula",
        "description": "El vínculo físico entre la actividad geomagnética y la menor precisión del GPS/brújula en los drones.",
        "body": """Los drones dependen del GPS para mantener la posición y de un magnetómetro (brújula electrónica) para el rumbo. Ambos pueden verse afectados cuando aumenta la actividad geomagnética.

## Por qué el GPS empeora durante las tormentas geomagnéticas

Las tormentas geomagnéticas perturban la ionosfera, la capa cargada de la atmósfera superior que atraviesan las señales GPS en su camino desde los satélites hasta tu dron. Una mayor perturbación ionosférica introduce retraso adicional de la señal y centelleo (fluctuación rápida de la señal), lo que reduce la precisión de la posición y, en casos más graves, puede causar la pérdida temporal de la señal GPS.

## Por qué la brújula se ve afectada por separado

El magnetómetro de un dron mide directamente el campo magnético local para determinar el rumbo. Un campo geomagnético perturbado es, por definición, una referencia menos estable — este es exactamente el fenómeno físico que cuantifica el índice Kp. Una lectura de la brújula durante una tormenta puede desviarse o "guiñar" de forma inesperada aunque el dron no haya girado físicamente.

## Cómo se manifiesta esto para un piloto

Entre los síntomas reportados durante un Kp elevado están: la posición del dron desviándose ligeramente en modo GPS sin entrada de los mandos, un comportamiento de giro en círculo ("toilet bowl") durante el retorno a casa, o una advertencia de calibración de la brújula que no aparecía el día anterior en el mismo lugar.

## Conclusión práctica

Con Kp 5 o superior, trata los modos de vuelo asistidos por GPS con precaución adicional: vuela a menor altitud, mantén el dron más cerca y prepárate para cambiar a modo manual/de actitud si el mantenimiento de posición se vuelve poco fiable. Por esto, comprobar una lectura de Kp en tiempo real antes de volar —no solo el viento y la lluvia— forma parte de una revisión previa al vuelo completa.""",
    },
)

add(
    "solar-wind-and-drone-communication-interference",
    "space-weather-gps",
    ["solar-wind", "radio", "interference"],
    en={
        "title": "Solar Wind and Drone Communication Interference",
        "description": "How solar activity can affect the radio link between a drone and its controller, and what to watch for.",
        "body": """A drone's control link and video downlink rely on radio frequencies that travel through the same upper atmosphere that geomagnetic activity disturbs.

## The chain of cause and effect

Solar wind — a continuous stream of charged particles from the sun — intensifies during solar storms and compresses and disturbs Earth's magnetosphere. That disturbance couples down into the ionosphere, altering how radio signals refract and propagate. Most consumer drones operate in the 2.4 GHz or 5.8 GHz bands, which are less sensitive to ionospheric effects than long-range HF radio, but are not entirely immune, especially at the fringes of a drone's control range.

## What pilots actually notice

The more commonly reported issue isn't a dropped link outright, but increased signal instability at marginal range — more frequent brief video stutters, or a control link that briefly warns of interference in conditions where it normally wouldn't, during periods of elevated geomagnetic activity.

## Don't over-attribute every glitch to space weather

Most control-link interruptions have far more mundane causes: Wi-Fi congestion, physical obstructions, or antenna orientation. Solar-driven interference is a real but comparatively rare contributor, worth knowing about but not the first thing to suspect.

## Practical guidance

Fly closer to your maximum comfortable range (not the drone's absolute maximum) during periods of elevated Kp, and treat any unusual link warning as a cue to bring the drone closer rather than push further away.""",
    },
    ko={
        "title": "태양풍과 드론 통신 장애의 관계",
        "description": "태양 활동이 드론과 조종기 사이의 무선 링크에 어떻게 영향을 줄 수 있는지, 무엇을 주의해야 하는지 설명합니다.",
        "body": """드론의 조종 링크와 영상 다운링크는 지자기 활동이 교란시키는 것과 동일한 상층 대기를 통과하는 전파 주파수에 의존합니다.

## 원인과 결과의 연쇄

태양풍(태양에서 나오는 하전 입자의 지속적인 흐름)은 태양 폭풍 중에 강해지며 지구 자기권을 압축하고 교란시킵니다. 이 교란은 전리층까지 이어져 전파가 굴절하고 전파되는 방식을 바꿉니다. 대부분의 소비자용 드론은 2.4GHz 또는 5.8GHz 대역을 사용하는데, 이는 장거리 단파(HF) 무선보다는 전리층 영향에 덜 민감하지만 완전히 자유롭지는 않으며, 특히 드론 조종 거리의 한계 지점에서 그렇습니다.

## 조종자가 실제로 체감하는 것

더 흔히 보고되는 문제는 링크가 완전히 끊기는 것이 아니라, 한계 거리에서 신호 불안정성이 커지는 것입니다 — 영상이 짧게 끊기는 빈도가 늘거나, 평소라면 문제없던 조건에서 조종 링크가 잠깐 간섭 경고를 띄우는 경우가 지자기 활동이 높은 시기에 나타날 수 있습니다.

## 모든 문제를 우주기상 탓으로 돌리지 마세요

대부분의 조종 링크 중단은 훨씬 평범한 원인, 즉 와이파이 혼잡, 물리적 장애물, 안테나 방향 등에서 비롯됩니다. 태양 활동으로 인한 간섭은 실재하지만 상대적으로 드문 요인으로, 알아두면 좋지만 가장 먼저 의심할 것은 아닙니다.

## 실전 가이드

KP지수가 높은 시기에는 드론의 절대 최대 거리가 아니라 평소 편안하게 느끼는 최대 거리 안쪽에서 비행하세요. 평소와 다른 링크 경고가 뜨면 더 멀리 밀어붙이기보다 드론을 가까이 불러들이는 신호로 받아들이세요.""",
    },
    ja={
        "title": "太陽風とドローン通信への干渉",
        "description": "太陽活動がドローンとコントローラー間の無線リンクにどう影響しうるか、何に注意すべきかを説明します。",
        "body": """ドローンの操縦リンクと映像ダウンリンクは、地磁気活動が乱すのと同じ上層大気を通過する無線周波数に依存しています。

## 原因と結果の連鎖

太陽風(太陽から出る帯電粒子の継続的な流れ)は太陽嵐の間に強まり、地球の磁気圏を圧縮し乱します。この乱れは電離層にまで及び、電波が屈折・伝搬する方式を変化させます。ほとんどの民生用ドローンは2.4GHzまたは5.8GHz帯を使用しており、これは長距離短波(HF)無線よりは電離層の影響を受けにくいものの、完全に無縁というわけではなく、特にドローンの操縦距離の限界付近ではその影響が出やすくなります。

## パイロットが実際に気づくこと

より一般的に報告される問題は、リンクが完全に切れることではなく、限界距離での信号不安定性の増加です — 映像が短く途切れる頻度が増えたり、普段なら問題ないはずの条件で操縦リンクが一時的に干渉警告を出したりすることが、地磁気活動が高まった時期に起こることがあります。

## すべての不具合を宇宙天気のせいにしない

ほとんどの操縦リンクの中断は、Wi-Fiの混雑、物理的な障害物、アンテナの向きといった、はるかにありふれた原因によるものです。太陽活動による干渉は実在しますが比較的まれな要因であり、知っておく価値はありますが、最初に疑うべきものではありません。

## 実践的なガイダンス

KP指数が高い時期には、ドローンの絶対最大距離ではなく、普段快適に感じる最大距離の内側で飛行しましょう。普段と違うリンク警告が出たら、さらに遠くへ押し進めるのではなく、ドローンを近くに呼び戻す合図として受け止めましょう。""",
    },
    es={
        "title": "El viento solar y la interferencia en las comunicaciones del dron",
        "description": "Cómo la actividad solar puede afectar el enlace de radio entre un dron y su mando, y qué señales observar.",
        "body": """El enlace de control y la transmisión de video de un dron dependen de frecuencias de radio que atraviesan la misma atmósfera superior que la actividad geomagnética perturba.

## La cadena de causa y efecto

El viento solar —un flujo continuo de partículas cargadas del sol— se intensifica durante las tormentas solares y comprime y perturba la magnetosfera terrestre. Esa perturbación se transmite hasta la ionosfera, alterando cómo se refractan y propagan las señales de radio. La mayoría de los drones de consumo operan en las bandas de 2.4 GHz o 5.8 GHz, que son menos sensibles a los efectos ionosféricos que la radio HF de largo alcance, pero no son totalmente inmunes, especialmente en los límites del alcance de control de un dron.

## Qué notan realmente los pilotos

El problema más comúnmente reportado no es una pérdida total del enlace, sino una mayor inestabilidad de la señal en el alcance marginal: tartamudeos de video breves más frecuentes, o un enlace de control que avisa brevemente de interferencia en condiciones donde normalmente no lo haría, durante periodos de actividad geomagnética elevada.

## No atribuyas cada fallo al clima espacial

La mayoría de las interrupciones del enlace de control tienen causas mucho más mundanas: congestión de Wi-Fi, obstrucciones físicas u orientación de la antena. La interferencia de origen solar es un factor real pero comparativamente raro, que vale la pena conocer pero no es lo primero que hay que sospechar.

## Consejo práctico

Vuela más cerca de tu alcance máximo cómodo (no el máximo absoluto del dron) durante periodos de Kp elevado, y trata cualquier advertencia inusual del enlace como una señal para acercar el dron en lugar de alejarlo más.""",
    },
)

add(
    "avoid-flying-during-geomagnetic-storms",
    "space-weather-gps",
    ["geomagnetic-storm", "safety", "kp-index"],
    en={
        "title": "Why You Should Avoid Flying During Geomagnetic Storms",
        "description": "Putting the GPS, compass, and communication effects together into one practical pre-flight rule.",
        "body": """Individually, each effect of a geomagnetic storm on a drone — GPS drift, compass instability, and marginal communication interference — is manageable. Combined, and especially at higher Kp levels, they compound into a genuinely elevated risk.

## Why the effects stack

A drone relying on GPS for position-hold and a compass for heading, during a storm that degrades both simultaneously, loses two of its primary stabilization references at once — precisely when a pilot most needs the automation to work correctly. Add marginal-range communication instability and a "close call" scenario becomes more plausible than any single factor alone would suggest.

## A simple rule of thumb by Kp level

- Kp 0-4: Normal precautions apply; fly as you normally would.
- Kp 5 (G1 storm): Fly conservatively — closer range, lower altitude, be ready to switch to manual mode.
- Kp 6 (G2 storm): Consider postponing non-essential flights, especially in GPS-heavy modes like automated waypoint missions.
- Kp 7+ (G3-G5 storm): Postpone flying if possible; these events are associated with widespread GPS degradation and are rare enough that waiting a few hours to a day is usually practical.

## Where to check current conditions

NOAA's Space Weather Prediction Center publishes the planetary Kp index continuously and is the authoritative public source most drone weather tools, including this one, draw from.

## The bottom line

Treat the Kp index the same way you'd treat a wind or rain forecast: a routine, five-second check before every flight, not an afterthought reserved for aurora season.""",
    },
    ko={
        "title": "지자기 폭풍 시기에 드론 비행을 피해야 하는 이유",
        "description": "GPS, 나침반, 통신에 미치는 영향을 하나로 묶어 실전에서 쓸 수 있는 비행 전 규칙으로 정리합니다.",
        "body": """지자기 폭풍이 드론에 미치는 각각의 영향 — GPS 드리프트, 나침반 불안정, 한계 거리에서의 통신 간섭 — 은 개별적으로는 관리 가능한 수준입니다. 하지만 이것들이 결합되면, 특히 KP지수가 높아질수록 진짜로 위험도가 높아지는 결과로 이어집니다.

## 영향이 겹치는 이유

GPS로 위치를 유지하고 나침반으로 방위를 잡는 드론이 폭풍 중에 두 기준 모두가 동시에 저하되면, 조종자가 자동화 기능이 정확히 작동해주길 가장 필요로 하는 바로 그 순간에 두 개의 핵심 안정화 기준을 한꺼번에 잃게 됩니다. 여기에 한계 거리에서의 통신 불안정까지 더해지면, 어느 한 요인만으로 예상하는 것보다 '아찔한 순간'이 발생할 가능성이 더 커집니다.

## KP지수별 간단한 기준

- KP 0~4: 평소와 같은 주의사항 적용, 평소처럼 비행
- KP 5 (G1 폭풍): 보수적으로 비행 — 더 가까운 거리, 더 낮은 고도, 수동 모드 전환 준비
- KP 6 (G2 폭풍): 자동 웨이포인트 미션처럼 GPS 의존이 큰 모드는 특히, 필수적이지 않은 비행은 미루는 것을 고려
- KP 7 이상 (G3~G5 폭풍): 가능하면 비행을 미루세요. 이런 사건은 광범위한 GPS 저하와 연관되며, 몇 시간에서 하루 정도 기다리는 것이 대체로 현실적일 만큼 드물게 발생합니다.

## 현재 상태 확인 방법

NOAA 우주기상센터는 행성 KP지수를 지속적으로 발표하며, 이 서비스를 포함한 대부분의 드론 날씨 도구가 참조하는 공신력 있는 공개 출처입니다.

## 결론

KP지수를 바람이나 강수 예보와 똑같이 대하세요 — 오로라 시즌에만 신경 쓰는 부수적인 항목이 아니라, 매 비행 전 5초면 끝나는 일상적인 확인 절차로 삼으세요.""",
    },
    ja={
        "title": "地磁気嵐の間はドローン飛行を避けるべき理由",
        "description": "GPS、コンパス、通信への影響を1つにまとめ、実践的な飛行前ルールとして整理します。",
        "body": """地磁気嵐がドローンに与える個々の影響 — GPSドリフト、コンパスの不安定さ、限界距離での通信干渉 — は、単独では管理可能な範囲です。しかし組み合わさると、特にKP指数が高くなるほど、実質的にリスクが高まる結果につながります。

## 影響が重なる理由

GPSで位置を保持し、コンパスで方位を決めるドローンが、嵐によって両方が同時に低下すると、パイロットが自動化機能に最も正確に働いてほしいまさにその瞬間に、2つの主要な安定化基準を同時に失うことになります。そこに限界距離での通信不安定さが加わると、単一要因だけで予想されるよりも「ヒヤリハット」の状況が起こりやすくなります。

## KP指数別の簡単な目安

- KP 0〜4: 通常の注意事項を適用し、普段通り飛行
- KP 5(G1嵐): 保守的に飛行 — より近い距離、より低い高度、手動モードへの切り替えに備える
- KP 6(G2嵐): 自動ウェイポイントミッションのようなGPS依存度の高いモードは特に、必須でない飛行は延期を検討
- KP 7以上(G3〜G5嵐): 可能であれば飛行を延期。こうした事象は広範なGPS低下と関連しており、数時間から1日待つのが現実的な程度にはまれです。

## 現在の状況を確認する場所

NOAAの宇宙天気予報センターは惑星KP指数を継続的に発表しており、本サービスを含む多くのドローン気象ツールが参照する信頼できる公開情報源です。

## 結論

KP指数は風や降水予報と同じように扱いましょう — オーロラシーズンだけ気にする後回しの項目ではなく、毎回の飛行前に行う5秒の日常的な確認手順としてください。""",
    },
    es={
        "title": "Por qué debes evitar volar durante tormentas geomagnéticas",
        "description": "Reunir los efectos sobre el GPS, la brújula y la comunicación en una sola regla práctica antes de volar.",
        "body": """Por separado, cada efecto de una tormenta geomagnética sobre un dron —deriva del GPS, inestabilidad de la brújula e interferencia marginal en las comunicaciones— es manejable. Combinados, y especialmente con niveles de Kp más altos, se acumulan hasta convertirse en un riesgo genuinamente elevado.

## Por qué los efectos se acumulan

Un dron que depende del GPS para mantener la posición y de una brújula para el rumbo, durante una tormenta que degrada ambos simultáneamente, pierde dos de sus referencias de estabilización principales a la vez, precisamente cuando el piloto más necesita que la automatización funcione correctamente. Si se suma la inestabilidad de comunicación en el alcance marginal, un escenario de "casi accidente" se vuelve más plausible de lo que sugeriría cualquier factor por sí solo.

## Una regla simple según el nivel de Kp

- Kp 0-4: Se aplican las precauciones normales; vuela como lo harías habitualmente.
- Kp 5 (tormenta G1): Vuela de forma conservadora: alcance más corto, altitud más baja, listo para cambiar a modo manual.
- Kp 6 (tormenta G2): Considera posponer vuelos no esenciales, especialmente en modos muy dependientes del GPS como las misiones automáticas por waypoints.
- Kp 7+ (tormenta G3-G5): Pospón el vuelo si es posible; estos eventos se asocian con una degradación generalizada del GPS y son lo bastante raros como para que esperar unas horas o un día suela ser práctico.

## Dónde consultar las condiciones actuales

El Centro de Predicción del Clima Espacial de la NOAA publica el índice Kp planetario de forma continua y es la fuente pública autorizada de la que se nutren la mayoría de las herramientas de clima para drones, incluida esta.

## En resumen

Trata el índice Kp igual que un pronóstico de viento o lluvia: una comprobación rutinaria de cinco segundos antes de cada vuelo, no algo secundario reservado para la temporada de auroras.""",
    },
)

# ---------------------------------------------------------------------------
# CATEGORY 3: us-airspace-regulations
# ---------------------------------------------------------------------------

add(
    "faa-part-107-explained",
    "us-airspace-regulations",
    ["faa", "part-107", "regulations"],
    en={
        "title": "FAA Part 107 Explained: The Basics for U.S. Drone Pilots",
        "description": "An introductory overview of the FAA's core commercial small-drone rule and who it applies to.",
        "body": """Part 107 is the FAA regulation that governs most non-recreational small unmanned aircraft (drone) operations in the United States.

## Who needs it

If you fly a drone for anything beyond purely personal enjoyment — for a business, as part of a job, for a client, or to sell photos or footage — Part 107 generally applies. Recreational flyers have a separate, simpler set of rules (still requiring The Recreational UAS Safety Test, TRUST), but the moment flying has any commercial purpose, Part 107 is the relevant framework.

## Core requirements at a glance

- Hold a Remote Pilot Certificate, earned by passing the FAA's Part 107 knowledge test.
- Fly a drone under 55 lbs (25 kg) registered with the FAA.
- Keep the drone within visual line of sight (VLOS) at all times, without visual aids other than corrective lenses.
- Fly at or below 400 feet above ground level in uncontrolled airspace (with specific rules near structures).
- Fly during daylight or civil twilight (with anti-collision lighting).
- Avoid other aircraft and never fly over people or moving vehicles without meeting specific additional conditions.

## Controlled airspace needs authorization

Flying in controlled airspace (near most airports) requires authorization, most commonly obtained instantly through LAANC (covered in a separate guide) rather than a lengthy manual application.

## This is an overview, not legal advice

Part 107 has grown more detailed over time, including waivers for specific operations (night flight, flights over people, beyond visual line of sight). Always check the FAA's current rule text and any Temporary Flight Restrictions (TFRs) for your specific location before flying.""",
    },
    ko={
        "title": "FAA Part 107 완벽 이해하기: 미국 드론 조종사를 위한 기초",
        "description": "FAA의 핵심 상업용 소형 드론 규정 개요와 누구에게 적용되는지 설명합니다.",
        "body": """Part 107은 미국에서 취미 목적을 넘어선 대부분의 소형 무인항공기(드론) 운용을 규율하는 FAA 규정입니다.

## 누구에게 적용되는가

순수한 개인적 즐거움을 넘어서는 목적 — 사업, 업무의 일환, 고객을 위한 촬영, 사진이나 영상 판매 등 — 으로 드론을 비행한다면 일반적으로 Part 107이 적용됩니다. 취미 조종자에게는 별도의 더 단순한 규정(그래도 레크리에이션 UAS 안전 테스트, TRUST는 필요)이 있지만, 비행에 조금이라도 상업적 목적이 생기는 순간 Part 107이 적용되는 규정이 됩니다.

## 핵심 요건 한눈에 보기

- FAA Part 107 지식 시험을 통과해 원격 조종사 자격증(Remote Pilot Certificate)을 취득해야 합니다.
- FAA에 등록된 55파운드(25kg) 미만의 드론을 비행해야 합니다.
- 교정 렌즈 외의 시각 보조 장비 없이 항상 드론을 육안 시야(VLOS) 안에 두어야 합니다.
- 비관제 공역에서는 지상 400피트 이하로 비행해야 합니다(구조물 근처는 별도 규정 있음).
- 주간 또는 시민박명 시간대에 비행해야 합니다(항공등 장착 시).
- 다른 항공기를 피해야 하며, 별도의 추가 조건을 충족하지 않는 한 사람이나 이동 중인 차량 위로 비행해서는 안 됩니다.

## 관제 공역은 별도 승인이 필요

대부분의 공항 근처인 관제 공역에서 비행하려면 승인이 필요하며, 대부분의 경우 장시간이 걸리는 수동 신청보다는 LAANC를 통해 즉시 승인을 받습니다 (별도 가이드에서 다룹니다).

## 이 글은 개요이며 법률 자문이 아닙니다

Part 107은 시간이 지나며 야간 비행, 사람 위 비행, 육안 시야 밖 비행(BVLOS) 등에 대한 예외 승인(waiver)을 포함해 더욱 세분화되었습니다. 비행 전에는 항상 FAA의 최신 규정 원문과 해당 지역의 임시비행제한구역(TFR)을 확인하세요.""",
    },
    ja={
        "title": "FAA Part 107を理解する:米国のドローンパイロットのための基礎",
        "description": "FAAの中核となる商業用小型ドローン規則の概要と、誰に適用されるかを説明します。",
        "body": """Part 107は、米国において純粋な趣味目的を超えるほとんどの小型無人航空機(ドローン)の運用を規律するFAA規則です。

## 誰に適用されるか

純粋に個人的な楽しみを超える目的 — 事業、業務の一環、依頼主のため、写真や映像の販売など — でドローンを飛ばす場合、一般的にPart 107が適用されます。趣味のパイロットには別の、より単純な規則(それでもレクリエーションUAS安全テスト、TRUSTは必要)がありますが、飛行に少しでも商業的目的が生じた瞬間、Part 107が適用される枠組みとなります。

## 主要な要件の概要

- FAAのPart 107知識試験に合格し、リモートパイロット証明書を取得する必要があります。
- FAAに登録された55ポンド(25kg)未満のドローンを飛行させる必要があります。
- 矯正レンズ以外の視覚補助具なしで、常にドローンを目視の範囲(VLOS)内に置く必要があります。
- 非管制空域では地上高400フィート以下で飛行する必要があります(構造物付近は別途規則あり)。
- 昼間または市民薄明の時間帯に飛行する必要があります(衝突防止灯を装備の場合)。
- 他の航空機を避け、追加の特定の条件を満たさない限り、人や移動中の車両の上を飛行してはいけません。

## 管制空域は別途承認が必要

ほとんどの空港付近である管制空域で飛行するには承認が必要で、多くの場合、時間のかかる手動申請ではなくLAANCを通じて即座に承認を得ます(別のガイドで扱います)。

## この記事は概要であり、法的助言ではありません

Part 107は時間とともにより細分化されており、夜間飛行、人の上空飛行、目視外飛行(BVLOS)などに対する例外承認(waiver)も含まれます。飛行前には必ずFAAの最新の規則本文と、該当地域の一時飛行制限区域(TFR)を確認してください。""",
    },
    es={
        "title": "La Parte 107 de la FAA explicada: lo básico para pilotos de drones en EE. UU.",
        "description": "Una visión general introductoria de la norma principal de la FAA para drones comerciales pequeños y a quién se aplica.",
        "body": """La Parte 107 es la normativa de la FAA que regula la mayoría de las operaciones no recreativas con pequeñas aeronaves no tripuladas (drones) en Estados Unidos.

## A quién se aplica

Si vuelas un dron para algo más que el simple disfrute personal —para un negocio, como parte de un trabajo, para un cliente, o para vender fotos o video— generalmente se aplica la Parte 107. Los pilotos recreativos tienen un conjunto de normas separado y más simple (que aún requiere el Examen de Seguridad Recreativa de UAS, TRUST), pero en el momento en que el vuelo tiene cualquier propósito comercial, la Parte 107 es el marco relevante.

## Requisitos principales de un vistazo

- Tener un Certificado de Piloto Remoto, obtenido al aprobar el examen de conocimientos de la Parte 107 de la FAA.
- Volar un dron de menos de 55 libras (25 kg) registrado ante la FAA.
- Mantener el dron dentro de la línea de visión visual (VLOS) en todo momento, sin ayudas visuales que no sean lentes correctivos.
- Volar a 400 pies (o menos) sobre el nivel del suelo en espacio aéreo no controlado (con reglas específicas cerca de estructuras).
- Volar durante el día o el crepúsculo civil (con luces anticolisión).
- Evitar otras aeronaves y nunca volar sobre personas o vehículos en movimiento sin cumplir condiciones adicionales específicas.

## El espacio aéreo controlado requiere autorización

Volar en espacio aéreo controlado (cerca de la mayoría de los aeropuertos) requiere autorización, generalmente obtenida al instante mediante LAANC (cubierto en otra guía) en lugar de una solicitud manual larga.

## Esto es una visión general, no asesoría legal

La Parte 107 se ha vuelto más detallada con el tiempo, incluyendo exenciones para operaciones específicas (vuelo nocturno, vuelos sobre personas, más allá de la línea de visión visual). Consulta siempre el texto normativo vigente de la FAA y cualquier Restricción Temporal de Vuelo (TFR) para tu ubicación específica antes de volar.""",
    },
)

add(
    "understanding-us-airspace-classes",
    "us-airspace-regulations",
    ["airspace", "faa", "regulations"],
    en={
        "title": "Understanding U.S. Airspace Classes (B, C, D, E, G)",
        "description": "A plain-language breakdown of U.S. airspace classification and what it means for drone pilots.",
        "body": """U.S. airspace is divided into classes that determine what authorization, if any, a drone pilot needs before flying.

## Class B — major airport cores

Surrounds the busiest airports (major international hubs). Drone operations require prior air traffic control authorization; this is the most tightly controlled class.

## Class C — mid-size airports

Surrounds airports with an operating control tower and radar approach control. Also requires prior authorization for drone flight, most often obtained through LAANC.

## Class D — smaller towered airports

Surrounds smaller airports with an operating control tower but without the radar services of Class C. Still requires prior authorization for drone flight.

## Class E — controlled airspace without a tower requirement

A broad category that exists in many forms (surface-level E near some airports, or starting at higher altitudes elsewhere). Where Class E extends to the surface, drone authorization is often required; check current sectional charts or an authorization app for your exact location.

## Class G — uncontrolled airspace

The default class where none of the above applies — most rural and many suburban areas fall here. No prior ATC authorization is required for standard Part 107 operations, though all other Part 107 rules (altitude, VLOS, etc.) still apply fully.

## How to check what class you're in

Use the FAA's B4UFLY app or a sectional aeronautical chart, or check within a drone-specific pre-flight app — never assume based on how the area "feels." Airspace boundaries frequently don't align with visible landmarks.""",
    },
    ko={
        "title": "미국 공역 등급(B, C, D, E, G) 이해하기",
        "description": "미국 공역 분류 체계를 쉬운 말로 정리하고, 드론 조종자에게 어떤 의미인지 설명합니다.",
        "body": """미국 공역은 드론 조종자가 비행 전 어떤 승인이 필요한지(필요하다면)를 결정하는 여러 등급으로 나뉩니다.

## B등급 — 주요 공항 핵심 구역

가장 붐비는 공항(대형 국제 허브)을 둘러싼 구역입니다. 드론 운용에는 사전 항공교통관제(ATC) 승인이 필요하며, 가장 엄격하게 통제되는 등급입니다.

## C등급 — 중형 공항

운영 중인 관제탑과 레이더 접근 관제를 갖춘 공항을 둘러싼 구역입니다. 드론 비행에는 마찬가지로 사전 승인이 필요하며, 대개 LAANC를 통해 받습니다.

## D등급 — 소형 관제탑 공항

운영 중인 관제탑은 있지만 C등급 수준의 레이더 서비스는 없는 소형 공항을 둘러싼 구역입니다. 드론 비행에는 여전히 사전 승인이 필요합니다.

## E등급 — 관제탑이 없는 관제 공역

여러 형태로 존재하는 폭넓은 범주입니다(일부 공항 근처는 지표면부터, 다른 곳은 더 높은 고도부터 시작). E등급이 지표면까지 확장된 곳에서는 드론 승인이 필요한 경우가 많으니, 해당 위치의 최신 항공지도(sectional chart)나 승인 앱을 확인하세요.

## G등급 — 비관제 공역

위 어느 것도 해당하지 않는 기본 등급으로, 대부분의 농촌 지역과 많은 교외 지역이 여기에 속합니다. 표준 Part 107 운용에는 사전 ATC 승인이 필요 없지만, 고도 제한, VLOS 등 나머지 Part 107 규정은 여전히 전부 적용됩니다.

## 내가 어느 등급에 있는지 확인하는 법

FAA의 B4UFLY 앱이나 항공지도(sectional chart)를 사용하거나, 드론 전용 사전 점검 앱에서 확인하세요 — 지역의 '느낌'만으로 절대 추측하지 마세요. 공역 경계는 눈에 보이는 지형지물과 일치하지 않는 경우가 흔합니다.""",
    },
    ja={
        "title": "米国の空域クラス(B、C、D、E、G)を理解する",
        "description": "米国の空域分類を平易な言葉で解説し、ドローンパイロットにとって何を意味するかを説明します。",
        "body": """米国の空域は、ドローンパイロットが飛行前にどのような承認が必要か(必要な場合)を決定するクラスに分かれています。

## クラスB — 主要空港の中心部

最も混雑する空港(主要な国際ハブ)を取り囲む区域です。ドローン運用には事前の航空交通管制(ATC)の承認が必要で、最も厳しく管理されるクラスです。

## クラスC — 中規模空港

稼働中の管制塔とレーダー進入管制を備えた空港を取り囲む区域です。ドローン飛行にも同様に事前承認が必要で、多くの場合LAANCを通じて取得します。

## クラスD — 小規模な管制塔付き空港

稼働中の管制塔はあるものの、クラスCほどのレーダーサービスがない小規模空港を取り囲む区域です。ドローン飛行には依然として事前承認が必要です。

## クラスE — 管制塔を必要としない管制空域

さまざまな形で存在する広範なカテゴリーです(一部の空港近くでは地表から、他の場所ではより高い高度から始まる)。クラスEが地表まで及ぶ場所では、ドローンの承認が必要な場合が多いため、該当地域の最新のセクショナルチャートや承認アプリを確認してください。

## クラスG — 非管制空域

上記のいずれにも該当しないデフォルトのクラスで、ほとんどの田園地域と多くの郊外地域がここに該当します。標準的なPart 107運用には事前のATC承認は不要ですが、高度制限やVLOSなど、その他のPart 107規則はすべて引き続き適用されます。

## 自分がどのクラスにいるか確認する方法

FAAのB4UFLYアプリやセクショナルチャートを使うか、ドローン専用の事前点検アプリで確認してください — 地域の「雰囲気」だけで推測しないでください。空域の境界は目に見える地形と一致しないことがよくあります。""",
    },
    es={
        "title": "Cómo entender las clases de espacio aéreo en EE. UU. (B, C, D, E, G)",
        "description": "Un desglose en lenguaje sencillo de la clasificación del espacio aéreo de EE. UU. y qué significa para los pilotos de drones.",
        "body": """El espacio aéreo de EE. UU. se divide en clases que determinan qué autorización, si la hay, necesita un piloto de drones antes de volar.

## Clase B — núcleos de aeropuertos principales

Rodea los aeropuertos más concurridos (grandes centros internacionales). Las operaciones con drones requieren autorización previa del control de tráfico aéreo; es la clase más estrictamente controlada.

## Clase C — aeropuertos medianos

Rodea aeropuertos con torre de control en funcionamiento y control de aproximación por radar. También requiere autorización previa para volar drones, obtenida con mayor frecuencia mediante LAANC.

## Clase D — aeropuertos más pequeños con torre

Rodea aeropuertos más pequeños con torre de control en funcionamiento pero sin los servicios de radar de la Clase C. Aún requiere autorización previa para el vuelo de drones.

## Clase E — espacio aéreo controlado sin requisito de torre

Una categoría amplia que existe en muchas formas (a nivel de superficie cerca de algunos aeropuertos, o comenzando a mayor altitud en otros lugares). Donde la Clase E se extiende hasta la superficie, a menudo se requiere autorización para drones; consulta las cartas seccionales actuales o una aplicación de autorización para tu ubicación exacta.

## Clase G — espacio aéreo no controlado

La clase predeterminada donde no se aplica ninguna de las anteriores; la mayoría de las zonas rurales y muchas suburbanas caen aquí. No se requiere autorización previa del ATC para operaciones estándar de la Parte 107, aunque el resto de las reglas de la Parte 107 (altitud, VLOS, etc.) siguen aplicándose por completo.

## Cómo comprobar en qué clase te encuentras

Usa la app B4UFLY de la FAA o una carta aeronáutica seccional, o consulta una app de verificación previa al vuelo específica para drones — nunca asumas según cómo "se sienta" la zona. Los límites del espacio aéreo con frecuencia no coinciden con puntos de referencia visibles.""",
    },
)

add(
    "what-is-laanc-and-why-it-matters",
    "us-airspace-regulations",
    ["laanc", "faa", "authorization"],
    en={
        "title": "What Is LAANC and Why It Matters for Drone Pilots",
        "description": "How the FAA's automated airspace authorization system works and when you need it.",
        "body": """LAANC (Low Altitude Authorization and Notification Capability) is the FAA's system for granting drone pilots near-real-time authorization to fly in controlled airspace.

## The problem it solves

Before LAANC, flying in controlled airspace near an airport meant submitting a manual application and waiting — sometimes days — for a human reviewer at the FAA to respond. LAANC automates that process for pre-approved altitudes and locations, typically returning an authorization within seconds to minutes through an FAA-approved app.

## How it works in practice

LAANC uses UAS Facility Maps — grids overlaid on controlled airspace near airports that specify the maximum altitude a drone can be authorized to fly at each grid cell, based on coordination with the airport and air traffic control. A pilot requests authorization for a specific location and altitude through an approved app; if the request falls within the pre-approved grid ceiling, it's granted automatically.

## When a request isn't automatic

If you need to fly higher than a grid cell's authorized ceiling, LAANC can still submit a further coordination request, but approval isn't instant and isn't guaranteed. Some sensitive airspace is excluded from LAANC entirely and requires a different application process.

## Why this matters even if you rarely fly near airports

Airspace boundaries extend further than many pilots expect, and a location that looks like open countryside can still fall within a Class D or E surface area tied to a nearby small airport. Checking whether you need LAANC authorization — not just assuming you don't — is a standard part of responsible pre-flight planning.

## This dashboard's role

The airspace ceiling data shown on this site's dashboard reflects the same FAA UAS Facility Map data LAANC relies on, for informational reference — always confirm actual authorization through an approved LAANC provider or FAADroneZone before flying in controlled airspace.""",
    },
    ko={
        "title": "LAANC란 무엇이며 드론 조종자에게 왜 중요한가",
        "description": "FAA의 자동화된 공역 승인 시스템이 어떻게 작동하는지, 언제 필요한지 설명합니다.",
        "body": """LAANC(저고도 승인 및 통지 기능, Low Altitude Authorization and Notification Capability)는 드론 조종자에게 관제 공역 비행을 거의 실시간으로 승인해 주는 FAA의 시스템입니다.

## LAANC가 해결하는 문제

LAANC 이전에는 공항 근처 관제 공역에서 비행하려면 수동 신청서를 제출하고 FAA 담당자의 검토를 며칠씩 기다려야 했습니다. LAANC는 사전 승인된 고도와 위치에 대해 이 과정을 자동화하여, FAA 승인 앱을 통해 보통 몇 초에서 몇 분 안에 승인을 받을 수 있게 합니다.

## 실제 작동 방식

LAANC는 공항 근처 관제 공역 위에 그리드를 겹쳐놓은 'UAS 시설 지도(UAS Facility Maps)'를 사용하며, 공항 및 항공교통관제와의 협의를 바탕으로 각 그리드 셀에서 드론이 승인받을 수 있는 최대 고도를 지정합니다. 조종자가 승인된 앱을 통해 특정 위치와 고도로 승인을 요청하면, 요청이 사전 승인된 그리드 상한 이내라면 자동으로 승인됩니다.

## 자동 승인이 되지 않는 경우

그리드 셀의 승인 상한보다 더 높이 비행해야 한다면, LAANC를 통해 추가 협의 요청을 제출할 수는 있지만 즉시 승인되지는 않으며 승인이 보장되지도 않습니다. 일부 민감한 공역은 LAANC 대상에서 완전히 제외되어 다른 신청 절차를 거쳐야 합니다.

## 공항 근처를 자주 비행하지 않아도 중요한 이유

공역 경계는 많은 조종자가 예상하는 것보다 더 넓게 뻗어 있으며, 탁 트인 시골처럼 보이는 곳도 인근 소형 공항에 연결된 D등급이나 E등급 지표면 구역에 속할 수 있습니다. LAANC 승인이 필요한지 확인하는 것 — 필요 없다고 그냥 가정하지 않는 것 — 은 책임 있는 비행 전 계획의 표준 절차입니다.

## 이 대시보드의 역할

이 사이트 대시보드에 표시되는 공역 고도 제한 데이터는 LAANC가 참조하는 것과 동일한 FAA UAS 시설 지도 데이터를 참고용으로 보여주는 것입니다 — 관제 공역에서 비행하기 전에는 반드시 승인된 LAANC 제공업체나 FAADroneZone을 통해 실제 승인을 확인하세요.""",
    },
    ja={
        "title": "LAANCとは何か、ドローンパイロットにとってなぜ重要か",
        "description": "FAAの自動化された空域承認システムがどのように機能し、いつ必要になるかを説明します。",
        "body": """LAANC(低高度承認通知機能、Low Altitude Authorization and Notification Capability)は、ドローンパイロットに管制空域での飛行をほぼリアルタイムで承認するFAAのシステムです。

## LAANCが解決する問題

LAANC以前は、空港近くの管制空域で飛行するには手動の申請書を提出し、FAAの担当者による審査を数日待つ必要がありました。LAANCは事前承認された高度と場所についてこのプロセスを自動化し、FAA承認アプリを通じて通常数秒から数分で承認を得られるようにします。

## 実際の仕組み

LAANCは空港近くの管制空域に重ねられたグリッドである「UAS施設マップ(UAS Facility Maps)」を使用し、空港および航空交通管制との調整に基づいて、各グリッドセルでドローンが承認され得る最大高度を指定します。パイロットが承認済みアプリを通じて特定の場所と高度で承認をリクエストすると、リクエストが事前承認されたグリッドの上限内であれば自動的に承認されます。

## 自動承認されない場合

グリッドセルの承認上限より高く飛行する必要がある場合、LAANCを通じてさらなる調整リクエストを送信することはできますが、承認は即座ではなく保証もされません。一部の機密性の高い空域はLAANCの対象から完全に除外されており、別の申請手続きが必要です。

## 空港近くをめったに飛ばなくても重要な理由

空域の境界は多くのパイロットが想定するよりも広がっており、開けた田園地帯に見える場所でも、近くの小規模空港に紐づくクラスDやEの地表区域に含まれることがあります。LAANC承認が必要かどうかを確認すること — 必要ないと単に仮定しないこと — は責任ある飛行前計画の標準的な部分です。

## このダッシュボードの役割

本サイトのダッシュボードに表示される空域高度制限データは、LAANCが参照するのと同じFAAのUAS施設マップデータを参考情報として示したものです — 管制空域で飛行する前には、必ず承認済みのLAANCプロバイダーまたはFAADroneZoneを通じて実際の承認を確認してください。""",
    },
    es={
        "title": "Qué es LAANC y por qué importa para los pilotos de drones",
        "description": "Cómo funciona el sistema automatizado de autorización de espacio aéreo de la FAA y cuándo lo necesitas.",
        "body": """LAANC (Capacidad de Autorización y Notificación de Baja Altitud) es el sistema de la FAA para conceder a los pilotos de drones una autorización casi en tiempo real para volar en espacio aéreo controlado.

## El problema que resuelve

Antes de LAANC, volar en espacio aéreo controlado cerca de un aeropuerto significaba presentar una solicitud manual y esperar —a veces días— a que un revisor humano de la FAA respondiera. LAANC automatiza ese proceso para altitudes y ubicaciones preaprobadas, devolviendo normalmente una autorización en cuestión de segundos a minutos a través de una app aprobada por la FAA.

## Cómo funciona en la práctica

LAANC utiliza los Mapas de Instalaciones UAS: cuadrículas superpuestas sobre el espacio aéreo controlado cerca de aeropuertos que especifican la altitud máxima a la que un dron puede ser autorizado a volar en cada celda de la cuadrícula, basándose en la coordinación con el aeropuerto y el control de tráfico aéreo. Un piloto solicita autorización para una ubicación y altitud específicas a través de una app aprobada; si la solicitud está dentro del techo de la cuadrícula preaprobada, se concede automáticamente.

## Cuándo una solicitud no es automática

Si necesitas volar más alto que el techo autorizado de una celda, LAANC aún puede enviar una solicitud de coordinación adicional, pero la aprobación no es instantánea ni está garantizada. Parte del espacio aéreo sensible está completamente excluido de LAANC y requiere un proceso de solicitud diferente.

## Por qué esto importa aunque rara vez vueles cerca de aeropuertos

Los límites del espacio aéreo se extienden más de lo que muchos pilotos esperan, y un lugar que parece campo abierto puede seguir estando dentro de una zona de superficie de Clase D o E vinculada a un pequeño aeropuerto cercano. Comprobar si necesitas autorización LAANC —en lugar de simplemente asumir que no— es parte estándar de una planificación previa al vuelo responsable.

## El papel de este panel

Los datos de techo de espacio aéreo mostrados en el panel de este sitio reflejan los mismos datos del Mapa de Instalaciones UAS de la FAA en los que se basa LAANC, con fines informativos — confirma siempre la autorización real a través de un proveedor de LAANC aprobado o de FAADroneZone antes de volar en espacio aéreo controlado.""",
    },
)

add(
    "checks-before-flying-near-an-airport",
    "us-airspace-regulations",
    ["airport", "safety", "faa"],
    en={
        "title": "Checks to Make Before Flying a Drone Near an Airport",
        "description": "A practical pre-flight checklist for operating anywhere close to airport airspace.",
        "body": """Airports are the single highest-stakes location for a drone flight to go wrong, because the consequence of a mistake is a potential conflict with manned aircraft.

## Step 1: Check your actual distance from any airport

"Near an airport" is often further than it looks. Controlled airspace commonly extends several miles laterally from the airport reference point, not just directly overhead the runway. Use the FAA's B4UFLY app or an aeronautical chart, not visual estimation.

## Step 2: Identify the airspace class

Once you know you're near an airport, confirm the airspace class (B, C, D, or a surface-level E) — this determines whether authorization is required at all, and through what process.

## Step 3: Get LAANC authorization if required

For most controlled airspace near towered airports, request authorization through an FAA-approved LAANC app before flying, specifying your intended altitude, not just "as high as allowed."

## Step 4: Check for Temporary Flight Restrictions (TFRs)

Independent of routine airspace class, a TFR can temporarily prohibit or restrict flight in an area — common around VIP travel, wildfires, and major public events. Check the FAA's TFR list for the specific date and location, not just the general airspace class.

## Step 5: Stay alert during the flight, not just before it

Manned aircraft can appear with little warning, especially during approach or departure. Maintain constant visual awareness and be ready to land immediately if an aircraft approaches, regardless of what authorization you hold.

## The bottom line

None of these steps are optional extras — they are the actual mechanism by which drone and manned-aircraft traffic stay safely separated near airports.""",
    },
    ko={
        "title": "공항 근처에서 드론을 날리기 전 확인해야 할 것들",
        "description": "공항 공역 근처 어디에서든 비행하기 전 실전 사전 점검 목록입니다.",
        "body": """공항은 드론 비행이 잘못될 경우 가장 위험 부담이 큰 장소입니다. 실수의 결과가 유인 항공기와의 충돌 가능성으로 이어지기 때문입니다.

## 1단계: 공항까지 실제 거리를 확인하세요

'공항 근처'는 보기보다 훨씬 넓은 범위인 경우가 많습니다. 관제 공역은 흔히 활주로 바로 위뿐 아니라 공항 기준점에서 수 킬로미터 옆으로도 확장됩니다. 눈대중이 아니라 FAA의 B4UFLY 앱이나 항공지도를 사용하세요.

## 2단계: 공역 등급을 확인하세요

공항 근처라는 것을 확인했다면, 공역 등급(B, C, D, 또는 지표면까지 내려온 E등급)을 확인하세요. 이는 승인이 필요한지, 그리고 어떤 절차를 거쳐야 하는지를 결정합니다.

## 3단계: 필요하면 LAANC 승인을 받으세요

관제탑이 있는 공항 근처의 대부분 관제 공역에서는, 비행 전 FAA 승인 LAANC 앱을 통해 승인을 요청하세요. 이때 '허용되는 최대한 높이'가 아니라 실제 비행하려는 고도를 명시해야 합니다.

## 4단계: 임시비행제한구역(TFR)을 확인하세요

일반적인 공역 등급과는 별개로, TFR은 특정 지역의 비행을 일시적으로 금지하거나 제한할 수 있습니다 — VIP 이동, 산불, 대규모 공공 행사 주변에서 흔합니다. 일반적인 공역 등급만 보지 말고, 해당 날짜와 위치의 FAA TFR 목록을 확인하세요.

## 5단계: 비행 전뿐 아니라 비행 중에도 경계를 유지하세요

유인 항공기는 특히 접근 또는 이륙 중에 거의 예고 없이 나타날 수 있습니다. 어떤 승인을 받았든 항상 시각적 경계를 유지하고, 항공기가 다가오면 즉시 착륙할 준비를 하세요.

## 결론

이 단계들은 선택적인 부가 사항이 아니라, 공항 근처에서 드론과 유인 항공기 교통이 안전하게 분리되도록 하는 실제 메커니즘 그 자체입니다.""",
    },
    ja={
        "title": "空港近くでドローンを飛ばす前に確認すべきこと",
        "description": "空港空域近くのどこであれ、飛行前に行うべき実践的なチェックリストです。",
        "body": """空港は、ドローン飛行が失敗した場合に最もリスクの高い場所です。ミスの結果が有人航空機との衝突の可能性につながるためです。

## ステップ1:空港までの実際の距離を確認する

「空港近く」は見た目より広い範囲であることが多いです。管制空域は多くの場合、滑走路の真上だけでなく、空港基準点から数キロ横にも広がっています。目視での推測ではなく、FAAのB4UFLYアプリや航空図を使用してください。

## ステップ2:空域クラスを特定する

空港近くであることが確認できたら、空域クラス(B、C、D、または地表まで及ぶE)を確認してください。これにより承認が必要かどうか、そしてどのプロセスを通すべきかが決まります。

## ステップ3:必要であればLAANC承認を取得する

管制塔のある空港近くのほとんどの管制空域では、飛行前にFAA承認済みのLAANCアプリを通じて承認を要求してください。その際「許可される限り高く」ではなく、実際に飛行する予定の高度を指定してください。

## ステップ4:一時飛行制限区域(TFR)を確認する

通常の空域クラスとは別に、TFRは特定地域での飛行を一時的に禁止または制限することがあります — 要人の移動、山火事、大規模な公共イベントの周辺でよく見られます。一般的な空域クラスだけでなく、その日付と場所のFAAのTFRリストを確認してください。

## ステップ5:飛行前だけでなく飛行中も警戒を続ける

有人航空機は特に進入や離陸の際、ほとんど予告なく現れることがあります。どのような承認を得ていても、常に目視での警戒を維持し、航空機が接近したら直ちに着陸できるよう備えてください。

## 結論

これらの手順はどれもオプションの追加事項ではなく、空港近くでドローンと有人航空機の交通が安全に分離される実際の仕組みそのものです。""",
    },
    es={
        "title": "Comprobaciones antes de volar un dron cerca de un aeropuerto",
        "description": "Una lista de verificación práctica previa al vuelo para operar en cualquier zona cercana al espacio aéreo de un aeropuerto.",
        "body": """Los aeropuertos son el lugar de mayor riesgo para que un vuelo de dron salga mal, porque la consecuencia de un error es un posible conflicto con una aeronave tripulada.

## Paso 1: comprueba tu distancia real a cualquier aeropuerto

"Cerca de un aeropuerto" suele ser más lejos de lo que parece. El espacio aéreo controlado a menudo se extiende varias millas lateralmente desde el punto de referencia del aeropuerto, no solo directamente sobre la pista. Usa la app B4UFLY de la FAA o una carta aeronáutica, no una estimación visual.

## Paso 2: identifica la clase de espacio aéreo

Una vez que sepas que estás cerca de un aeropuerto, confirma la clase de espacio aéreo (B, C, D o una E a nivel de superficie): esto determina si se requiere autorización y a través de qué proceso.

## Paso 3: obtén autorización LAANC si es necesaria

Para la mayoría del espacio aéreo controlado cerca de aeropuertos con torre, solicita autorización a través de una app LAANC aprobada por la FAA antes de volar, especificando tu altitud prevista, no solo "lo más alto permitido".

## Paso 4: comprueba las Restricciones Temporales de Vuelo (TFR)

Independientemente de la clase de espacio aéreo habitual, una TFR puede prohibir o restringir temporalmente el vuelo en una zona — algo común en torno a desplazamientos de VIP, incendios forestales y grandes eventos públicos. Consulta la lista de TFR de la FAA para la fecha y ubicación específicas, no solo la clase de espacio aéreo general.

## Paso 5: mantente alerta durante el vuelo, no solo antes

Las aeronaves tripuladas pueden aparecer con poco aviso, especialmente durante la aproximación o la salida. Mantén una conciencia visual constante y prepárate para aterrizar de inmediato si se acerca una aeronave, sin importar qué autorización tengas.

## En resumen

Ninguno de estos pasos es un extra opcional: son el mecanismo real por el cual el tráfico de drones y de aeronaves tripuladas se mantiene separado de forma segura cerca de los aeropuertos.""",
    },
)

# ---------------------------------------------------------------------------
# CATEGORY 4: gear-flight-tips
# ---------------------------------------------------------------------------

add(
    "beginner-drone-preflight-checklist",
    "gear-flight-tips",
    ["preflight", "beginner", "checklist"],
    en={
        "title": "A Beginner's Drone Pre-Flight Checklist",
        "description": "A simple, repeatable checklist to run through before every flight, especially as a new pilot.",
        "body": """Experienced pilots run through pre-flight checks almost automatically. As a beginner, a written checklist prevents the small mistakes that cause most early incidents.

## Before you leave home

- Charge batteries fully and confirm you're bringing enough for the flight you're planning.
- Check current and forecast weather (wind, rain, visibility) for your destination.
- Confirm the location isn't inside restricted or controlled airspace requiring authorization you haven't obtained.

## At the flight location

- Inspect propellers for cracks, chips, or looseness — a damaged propeller is one of the most common causes of in-flight loss of control.
- Confirm firmware on the drone and controller is up to date; some safety features ship in firmware updates.
- Check that the gimbal moves freely and the camera lens is clean.
- Power on the controller before the drone, and wait for a full GPS lock (shown in the app) before takeoff.
- Calibrate the compass if the app suggests it, or if you've traveled a significant distance since the last flight.

## Just before takeoff

- Confirm return-to-home altitude is set higher than any obstacles between the drone and your position.
- Do a low hover (a few seconds a meter or two off the ground) to confirm stable behavior before committing to full altitude.
- Identify your planned flight path and any people, vehicles, or structures to avoid.

## After landing

- Power off the drone before the controller, and log anything unusual for review before the next flight.

Running this same sequence every time builds the habit that keeps flights routine rather than eventful.""",
    },
    ko={
        "title": "초보자를 위한 드론 사전 비행 점검 리스트",
        "description": "특히 신규 조종자라면 매 비행 전에 거쳐야 할 간단하고 반복 가능한 점검 목록입니다.",
        "body": """숙련된 조종자는 사전 점검을 거의 자동으로 수행합니다. 초보자라면 문서화된 체크리스트가 초기 사고의 대부분을 유발하는 작은 실수를 막아줍니다.

## 집을 나서기 전에

- 배터리를 완충하고, 계획한 비행에 충분한 여분을 챙겼는지 확인하세요.
- 목적지의 현재 및 예보 날씨(바람, 비, 가시거리)를 확인하세요.
- 해당 위치가 아직 받지 않은 승인이 필요한 제한 공역이나 관제 공역 안에 있지 않은지 확인하세요.

## 비행 장소에 도착해서

- 프로펠러에 균열, 깨짐, 헐거워짐이 없는지 점검하세요 — 손상된 프로펠러는 비행 중 제어 상실의 가장 흔한 원인 중 하나입니다.
- 드론과 조종기의 펌웨어가 최신인지 확인하세요. 일부 안전 기능은 펌웨어 업데이트로 제공됩니다.
- 짐벌이 자유롭게 움직이는지, 카메라 렌즈가 깨끗한지 확인하세요.
- 드론보다 조종기를 먼저 켜고, 이륙 전 앱에 GPS가 완전히 고정되었는지 확인하세요.
- 앱이 권장하거나 지난 비행 이후 상당한 거리를 이동했다면 나침반을 보정하세요.

## 이륙 직전에

- 자동복귀(RTH) 고도가 드론과 조종자 사이의 어떤 장애물보다도 높게 설정되어 있는지 확인하세요.
- 완전한 고도로 올리기 전에 지상에서 1~2미터 정도의 낮은 정지 비행으로 안정적인 작동을 확인하세요.
- 계획한 비행 경로와 피해야 할 사람, 차량, 구조물을 미리 파악하세요.

## 착륙 후

- 조종기보다 먼저 드론의 전원을 끄고, 다음 비행 전 검토를 위해 특이사항을 기록해 두세요.

매번 같은 순서를 반복하는 것이 비행을 극적인 사건이 아니라 일상적인 일로 만들어주는 습관이 됩니다.""",
    },
    ja={
        "title": "初心者のためのドローン飛行前チェックリスト",
        "description": "特に新人パイロットにとって、毎回の飛行前に行うべきシンプルで繰り返し可能なチェックリストです。",
        "body": """経験豊富なパイロットはほぼ自動的に飛行前点検を行います。初心者にとっては、書面化されたチェックリストが初期の事故の大半を引き起こす小さなミスを防いでくれます。

## 家を出る前に

- バッテリーを満充電にし、予定している飛行に十分な予備を持っているか確認しましょう。
- 目的地の現在と予報の天気(風、雨、視程)を確認しましょう。
- その場所が、まだ取得していない承認を必要とする制限空域や管制空域内でないか確認しましょう。

## 飛行場所に到着したら

- プロペラにひび割れ、欠け、緩みがないか点検しましょう — 損傷したプロペラは飛行中の制御喪失の最も一般的な原因の1つです。
- ドローンとコントローラーのファームウェアが最新か確認しましょう。一部の安全機能はファームウェアアップデートで提供されます。
- ジンバルが自由に動くか、カメラレンズがきれいか確認しましょう。
- ドローンより先にコントローラーの電源を入れ、離陸前にアプリでGPSが完全にロックされたことを確認しましょう。
- アプリが提案する場合や、前回の飛行からかなりの距離を移動した場合はコンパスをキャリブレーションしましょう。

## 離陸直前に

- 自動帰還(RTH)高度が、ドローンと自分の位置の間にあるどの障害物よりも高く設定されているか確認しましょう。
- 完全な高度に上げる前に、地上1〜2メートルほどの低いホバリングで安定した動作を確認しましょう。
- 計画した飛行経路と、避けるべき人、車両、構造物を事前に把握しておきましょう。

## 着陸後

- コントローラーより先にドローンの電源を切り、次回の飛行前の確認のために異常があれば記録しておきましょう。

毎回同じ手順を繰り返すことが、飛行を波乱ではなく日常的なものにする習慣を作ります。""",
    },
    es={
        "title": "Lista de verificación previa al vuelo para principiantes con drones",
        "description": "Una lista sencilla y repetible para revisar antes de cada vuelo, especialmente como piloto nuevo.",
        "body": """Los pilotos experimentados realizan las comprobaciones previas al vuelo casi automáticamente. Como principiante, una lista de verificación escrita evita los pequeños errores que causan la mayoría de los incidentes iniciales.

## Antes de salir de casa

- Carga las baterías por completo y confirma que llevas suficientes para el vuelo que planeas.
- Comprueba el tiempo actual y el pronóstico (viento, lluvia, visibilidad) para tu destino.
- Confirma que la ubicación no está dentro de un espacio aéreo restringido o controlado que requiera una autorización que aún no tienes.

## En el lugar de vuelo

- Inspecciona las hélices en busca de grietas, astillas o holgura — una hélice dañada es una de las causas más comunes de pérdida de control en pleno vuelo.
- Confirma que el firmware del dron y del mando estén actualizados; algunas funciones de seguridad se incluyen en las actualizaciones de firmware.
- Comprueba que el gimbal se mueve libremente y que el objetivo de la cámara está limpio.
- Enciende el mando antes que el dron y espera a que se obtenga un bloqueo GPS completo (mostrado en la app) antes de despegar.
- Calibra la brújula si la app lo sugiere, o si has viajado una distancia significativa desde el último vuelo.

## Justo antes de despegar

- Confirma que la altitud de retorno a casa esté configurada más alta que cualquier obstáculo entre el dron y tu posición.
- Realiza un vuelo estacionario bajo (unos segundos a uno o dos metros del suelo) para confirmar un comportamiento estable antes de subir a la altitud completa.
- Identifica tu ruta de vuelo planeada y cualquier persona, vehículo o estructura que debas evitar.

## Después de aterrizar

- Apaga el dron antes que el mando, y anota cualquier cosa inusual para revisarla antes del próximo vuelo.

Repetir esta misma secuencia cada vez crea el hábito que mantiene los vuelos rutinarios en lugar de accidentados.""",
    },
)

add(
    "drone-battery-care-and-lifespan-tips",
    "gear-flight-tips",
    ["battery", "maintenance", "lipo"],
    en={
        "title": "Drone Battery Care: Tips to Extend Battery Lifespan",
        "description": "Practical LiPo battery care habits that meaningfully extend usable battery life.",
        "body": """LiPo batteries degrade with every charge cycle, but how you store, charge, and use them significantly affects how many usable cycles you actually get.

## Storage charge, not full charge

For any battery that won't be flown within a day or two, store it at roughly 50-60% charge (often labeled "storage mode" in a drone's app) rather than fully charged. Storing at 100% for extended periods accelerates capacity loss.

## Avoid extreme temperatures, both directions

Don't store or charge batteries in a hot car, direct sun, or freezing conditions. Room temperature storage, out of direct sunlight, is the safe default.

## Don't fly a battery down to zero

Discharging a LiPo far below its recommended cutoff voltage stresses the cells and can cause permanent capacity loss or, in rare cases, dangerous swelling. Land with a reasonable safety margin (many pilots treat 20-30% as their personal reserve, not the drone's absolute low-battery warning).

## Let batteries cool before charging

Charging a battery that's still warm from a recent flight increases stress on the cells. Give it 15-20 minutes to reach room temperature first.

## Inspect regularly

Check for swelling, punctures, or a battery that no longer holds a full charge. A swollen LiPo should be retired, not "used carefully" — the failure mode for a damaged LiPo can be sudden and severe.

## Cycle batteries evenly

If you own several batteries, rotate their use rather than always reaching for the same one — this keeps wear roughly even across your set instead of prematurely retiring your most-used battery.""",
    },
    ko={
        "title": "드론 배터리 관리: 수명을 늘리는 실전 팁",
        "description": "실질적으로 사용 가능한 배터리 수명을 늘려주는 LiPo 배터리 관리 습관을 소개합니다.",
        "body": """LiPo 배터리는 충전할 때마다 열화되지만, 보관·충전·사용 방식에 따라 실제로 사용할 수 있는 충전 사이클 수가 크게 달라집니다.

## 완충이 아니라 보관용 충전을 하세요

하루나 이틀 안에 비행하지 않을 배터리라면 완전히 충전하는 대신 대략 50~60% 정도(드론 앱에서 흔히 '보관 모드'로 표시)로 충전해 두세요. 100%로 장기간 보관하면 용량 손실이 가속화됩니다.

## 극단적인 온도를 피하세요

더운 차 안, 직사광선, 영하의 환경에서 배터리를 보관하거나 충전하지 마세요. 직사광선을 피한 실온 보관이 안전한 기본 원칙입니다.

## 배터리를 완전히 방전시키지 마세요

권장 컷오프 전압보다 훨씬 낮게 LiPo를 방전시키면 셀에 스트레스가 가해져 영구적인 용량 손실이나, 드물게는 위험한 팽창을 일으킬 수 있습니다. 합리적인 안전 여유를 두고 착륙하세요(많은 조종자가 드론의 절대적 저전압 경고가 아니라 20~30%를 개인적인 여유분으로 삼습니다).

## 충전 전에 배터리를 식히세요

비행 직후 아직 따뜻한 배터리를 바로 충전하면 셀에 가해지는 스트레스가 커집니다. 먼저 15~20분 정도 실온에 도달하도록 두세요.

## 정기적으로 점검하세요

팽창, 파손, 또는 더 이상 완전히 충전되지 않는 배터리가 있는지 확인하세요. 부풀어 오른 LiPo는 '조심해서 사용'할 것이 아니라 폐기해야 합니다 — 손상된 LiPo의 고장 양상은 갑작스럽고 심각할 수 있습니다.

## 배터리를 고르게 순환시키세요

배터리를 여러 개 보유하고 있다면 항상 같은 것만 쓰지 말고 돌려가며 사용하세요 — 이렇게 하면 가장 많이 쓰는 배터리 하나만 조기에 소모되지 않고 세트 전체에 걸쳐 마모가 고르게 유지됩니다.""",
    },
    ja={
        "title": "ドローンバッテリーのケア:寿命を延ばす実践的なヒント",
        "description": "実際に使用可能なバッテリー寿命を大きく延ばすLiPoバッテリーのケア習慣を紹介します。",
        "body": """LiPo電池は充電するたびに劣化しますが、保管・充電・使用の方法によって実際に使用できる充電サイクル数は大きく変わります。

## 満充電ではなく保管用充電を

1〜2日以内に飛行しないバッテリーは、完全に充電するのではなく、およそ50〜60%程度(ドローンアプリでよく「保管モード」と表示される)に充電しておきましょう。100%で長期間保管すると容量の低下が加速します。

## 極端な温度を避ける

暑い車内、直射日光下、氷点下の環境でバッテリーを保管したり充電したりしないでください。直射日光を避けた室温での保管が安全なデフォルトです。

## バッテリーをゼロまで使い切らない

推奨のカットオフ電圧をはるかに下回るまでLiPoを放電させると、セルにストレスがかかり、永久的な容量低下や、まれに危険な膨張を引き起こすことがあります。妥当な安全マージンを残して着陸しましょう(多くのパイロットは、ドローンの絶対的な低電圧警告ではなく、20〜30%を自分自身の予備として扱っています)。

## 充電前にバッテリーを冷ます

飛行直後のまだ温かいバッテリーをすぐに充電すると、セルへのストレスが増します。まず15〜20分ほど室温に達するのを待ちましょう。

## 定期的に点検する

膨張、穴、または完全に充電できなくなったバッテリーがないか確認しましょう。膨張したLiPoは「慎重に使う」のではなく引退させるべきです — 損傷したLiPoの故障モードは突然かつ深刻になり得ます。

## バッテリーを均等にローテーションする

複数のバッテリーを所有している場合は、常に同じものに手を伸ばすのではなく使用をローテーションさせましょう — こうすることで、最もよく使うバッテリー1本だけが早期に劣化するのを防ぎ、セット全体で摩耗をほぼ均等に保てます。""",
    },
    es={
        "title": "Cuidado de la batería del dron: consejos para prolongar su vida útil",
        "description": "Hábitos prácticos de cuidado de baterías LiPo que prolongan de forma significativa su vida útil.",
        "body": """Las baterías LiPo se degradan con cada ciclo de carga, pero cómo las almacenas, cargas y usas afecta de forma significativa a cuántos ciclos utilizables realmente obtienes.

## Carga de almacenamiento, no carga completa

Para cualquier batería que no vayas a volar en uno o dos días, guárdala con aproximadamente un 50-60% de carga (a menudo etiquetado como "modo de almacenamiento" en la app del dron) en lugar de cargarla al completo. Almacenarla al 100% durante periodos prolongados acelera la pérdida de capacidad.

## Evita temperaturas extremas, en ambos sentidos

No guardes ni cargues baterías en un coche caliente, bajo sol directo o en condiciones de congelación. El almacenamiento a temperatura ambiente, fuera de la luz solar directa, es la opción segura por defecto.

## No descargues una batería hasta cero

Descargar una LiPo muy por debajo de su voltaje de corte recomendado estresa las celdas y puede causar una pérdida permanente de capacidad o, en casos raros, una hinchazón peligrosa. Aterriza con un margen de seguridad razonable (muchos pilotos tratan el 20-30% como su reserva personal, no la advertencia absoluta de batería baja del dron).

## Deja que las baterías se enfríen antes de cargarlas

Cargar una batería que aún está tibia por un vuelo reciente aumenta el estrés en las celdas. Dale de 15 a 20 minutos para que alcance la temperatura ambiente primero.

## Inspecciona regularmente

Comprueba si hay hinchazón, perforaciones o una batería que ya no mantiene una carga completa. Una LiPo hinchada debe retirarse, no "usarse con cuidado" — el modo de fallo de una LiPo dañada puede ser repentino y grave.

## Rota las baterías de forma uniforme

Si tienes varias baterías, alterna su uso en lugar de recurrir siempre a la misma — esto mantiene el desgaste relativamente uniforme en todo tu conjunto en lugar de retirar prematuramente tu batería más usada.""",
    },
)

add(
    "camera-settings-for-flying-in-strong-wind",
    "gear-flight-tips",
    ["camera", "wind", "footage"],
    en={
        "title": "Camera Settings for Flying and Filming in Strong Wind",
        "description": "How to adjust your drone's camera settings to compensate for shake and drift in windy conditions.",
        "body": """Wind doesn't just challenge flight stability — it directly affects footage quality unless camera settings are adjusted to compensate.

## Raise shutter speed to reduce visible shake

The standard "180-degree rule" (shutter speed roughly double your frame rate) still applies, but in gusty conditions, a slightly faster shutter than usual can help reduce the appearance of micro-jitters transmitted from the airframe to the gimbal, at a small cost to motion blur smoothness.

## Use a higher ND filter than you'd expect

Wind often accompanies bright, clear conditions. A higher-strength ND filter lets you maintain your target shutter speed and lower ISO without overexposing, rather than being forced into a much faster shutter that exaggerates jitter.

## Enable stronger gimbal stabilization settings

Most drones offer adjustable gimbal responsiveness or stabilization strength. In wind, favor settings that prioritize smoothness over responsiveness — you're less likely to need fast reframing in windy conditions than to need shake reduction.

## Shoot at a slightly lower altitude when practical

Wind speed generally increases with altitude near the ground due to reduced surface friction. Flying somewhat lower (while still respecting obstacle clearance and any local altitude rules) can mean calmer air and steadier footage.

## Expect to crop or stabilize in post

Even with all of the above, footage shot in wind often benefits from digital stabilization in post-production. Shoot with a slightly wider frame than your final crop to leave room for stabilization to work without introducing black edges.""",
    },
    ko={
        "title": "강풍 속 드론 촬영을 위한 카메라 설정",
        "description": "바람이 강한 조건에서 흔들림과 드리프트를 보정하기 위해 드론 카메라 설정을 조정하는 방법을 안내합니다.",
        "body": """바람은 비행 안정성만 시험하는 것이 아니라, 카메라 설정을 보정하지 않으면 영상 품질에도 직접적인 영향을 줍니다.

## 셔터스피드를 올려 눈에 띄는 흔들림을 줄이세요

프레임레이트의 약 두 배로 셔터스피드를 맞추는 표준 '180도 규칙'은 여전히 유효하지만, 돌풍이 있는 조건에서는 평소보다 살짝 빠른 셔터스피드가 기체에서 짐벌로 전달되는 미세 떨림을 줄이는 데 도움이 될 수 있습니다. 다만 모션블러의 부드러움은 약간 희생됩니다.

## 예상보다 강한 ND필터를 사용하세요

바람은 흔히 밝고 맑은 날씨와 함께 찾아옵니다. 강도가 높은 ND필터를 사용하면 목표 셔터스피드와 낮은 ISO를 유지하면서 과다노출을 피할 수 있어, 떨림을 과장시키는 훨씬 빠른 셔터스피드로 강제로 몰리는 것을 막을 수 있습니다.

## 짐벌 안정화 설정을 더 강하게 하세요

대부분의 드론은 짐벌의 반응성이나 안정화 강도를 조정할 수 있습니다. 바람 속에서는 반응성보다 부드러움을 우선하는 설정을 선택하세요 — 바람이 강한 조건에서는 빠른 재구도보다 흔들림 감소가 더 필요할 가능성이 큽니다.

## 가능하면 고도를 조금 낮춰 촬영하세요

지표면 근처에서는 지면 마찰이 줄어들면서 고도가 높아질수록 대체로 풍속이 강해집니다. 장애물 이격 거리와 현지 고도 규정을 지키면서 다소 낮게 비행하면 더 잔잔한 공기와 안정된 영상을 얻을 수 있습니다.

## 후반 작업에서 크롭이나 안정화를 예상하세요

위 방법을 모두 적용해도, 바람 속에서 촬영한 영상은 후반 작업의 디지털 안정화에서 도움을 받는 경우가 많습니다. 최종 크롭보다 살짝 넓게 촬영해 안정화 작업이 검은 테두리 없이 작동할 여유를 남겨두세요.""",
    },
    ja={
        "title": "強風の中でドローン撮影をするためのカメラ設定",
        "description": "風の強い状況で揺れやドリフトを補正するために、ドローンのカメラ設定を調整する方法を説明します。",
        "body": """風は飛行の安定性を試すだけでなく、カメラ設定を補正しない限り映像品質にも直接影響します。

## シャッタースピードを上げて目に見える揺れを減らす

フレームレートのおよそ2倍にシャッタースピードを合わせる標準的な「180度ルール」は依然として有効ですが、突風のある状況では、通常よりやや速いシャッターが機体からジンバルに伝わる微細な揺れの見え方を減らすのに役立つことがあります。ただしモーションブラーの滑らかさは多少犠牲になります。

## 予想より強めのNDフィルターを使う

風はしばしば明るく晴れた条件を伴います。強度の高いNDフィルターを使えば、目標のシャッタースピードと低いISOを維持しながら露出オーバーを避けられ、揺れを誇張してしまうずっと速いシャッターへ強制的に追い込まれずに済みます。

## ジンバルの安定化設定をより強くする

ほとんどのドローンは、ジンバルの応答性や安定化の強さを調整できます。風の中では応答性より滑らかさを優先する設定を選びましょう — 風の強い状況では素早い構図変更より揺れの低減がより必要になる可能性が高いです。

## 可能であれば少し低い高度で撮影する

地表付近では地面摩擦が減るため、一般に高度が上がるほど風速は強くなります。障害物との間隔や現地の高度規則を守りながらやや低く飛行することで、より穏やかな空気と安定した映像が得られることがあります。

## 後処理でのクロップや安定化を見込んでおく

上記すべてを実践しても、風の中で撮影した映像は後処理でのデジタル安定化の恩恵を受けることが多いです。最終的なクロップよりやや広めのフレームで撮影し、黒縁が入らずに安定化処理が機能する余地を残しておきましょう。""",
    },
    es={
        "title": "Ajustes de cámara para volar y filmar con viento fuerte",
        "description": "Cómo ajustar los parámetros de la cámara de tu dron para compensar el temblor y la deriva en condiciones de viento.",
        "body": """El viento no solo pone a prueba la estabilidad del vuelo: afecta directamente a la calidad del video a menos que ajustes los parámetros de la cámara para compensarlo.

## Aumenta la velocidad de obturación para reducir el temblor visible

La "regla de los 180 grados" estándar (velocidad de obturación aproximadamente el doble de tu framerate) sigue aplicándose, pero en condiciones de ráfagas, una velocidad ligeramente más rápida de lo habitual puede ayudar a reducir la apariencia de microvibraciones transmitidas desde el chasis al gimbal, a un pequeño costo en la suavidad del desenfoque de movimiento.

## Usa un filtro ND más fuerte de lo esperado

El viento suele acompañar condiciones brillantes y despejadas. Un filtro ND de mayor intensidad te permite mantener tu velocidad de obturación objetivo e ISO más bajo sin sobreexponer, en lugar de verte forzado a una velocidad mucho más rápida que exagera el temblor.

## Activa ajustes de estabilización de gimbal más fuertes

La mayoría de los drones ofrecen capacidad de respuesta o fuerza de estabilización del gimbal ajustables. Con viento, favorece los ajustes que priorizan la suavidad sobre la capacidad de respuesta: es menos probable que necesites reencuadres rápidos con viento que necesitar reducción de temblor.

## Filma a una altitud algo más baja cuando sea práctico

La velocidad del viento generalmente aumenta con la altitud cerca del suelo debido a la menor fricción superficial. Volar algo más bajo (respetando siempre la separación de obstáculos y cualquier normativa local de altitud) puede significar aire más calmado y un video más estable.

## Espera tener que recortar o estabilizar en la posproducción

Incluso con todo lo anterior, el video filmado con viento suele beneficiarse de la estabilización digital en posproducción. Filma con un encuadre ligeramente más amplio que tu recorte final para dejar margen a la estabilización sin introducir bordes negros.""",
    },
)

add(
    "what-to-do-when-drone-gps-signal-is-weak",
    "gear-flight-tips",
    ["gps", "troubleshooting", "safety"],
    en={
        "title": "What to Do When Your Drone's GPS Signal Is Weak",
        "description": "How to recognize a weak GPS lock and the safest way to respond mid-flight.",
        "body": """A weak or unstable GPS signal changes how your drone behaves, and knowing the warning signs before you're mid-flight matters.

## Recognize the warning signs

Most flight apps show a satellite count and signal strength indicator before takeoff — treat a low satellite count (commonly fewer than about 7-10, though thresholds vary by drone) or an on-screen GPS warning as a reason to wait, not a reason to take off anyway. In flight, unexpected drift while hovering, or the drone failing to hold position in wind it normally would, are signs the GPS lock has weakened.

## Common causes beyond geomagnetic activity

Flying near tall buildings, dense tree cover, bridges, or metal structures can all cause GPS multipath interference or signal blockage — this is a far more common cause of weak GPS than space weather, and worth ruling out first.

## What to do if it happens mid-flight

Switch to an attitude or manual flight mode if your drone supports it, which relies on the accelerometer and barometer rather than GPS for stabilization and is less affected by a degraded satellite lock. Reduce speed, gain a little altitude if it's safe to do so (open sky generally means a stronger signal than close to obstructions), and land at the nearest safe, open location rather than attempting to return to your exact takeoff point in automated mode.

## Don't rely solely on return-to-home during a GPS problem

Return-to-home is a GPS-dependent feature — during a genuine GPS problem, it may not function reliably. Retain manual control awareness at all times rather than assuming automation will resolve a GPS-related emergency.

## After landing

If a weak signal recurs at the same location on different days, treat that as a site-specific issue (likely structural interference) rather than a one-off and plan around it in the future.""",
    },
    ko={
        "title": "드론 GPS 신호가 약할 때 대처법",
        "description": "GPS 신호가 약해졌음을 알아채는 방법과 비행 중 가장 안전하게 대응하는 방법을 설명합니다.",
        "body": """약하거나 불안정한 GPS 신호는 드론의 동작 방식을 바꾸며, 비행 도중이 아니라 미리 경고 신호를 아는 것이 중요합니다.

## 경고 신호를 알아채세요

대부분의 비행 앱은 이륙 전 위성 개수와 신호 세기 표시를 보여줍니다 — 위성 개수가 적거나(대체로 7~10개 미만, 다만 드론마다 기준은 다름) 화면에 GPS 경고가 뜬다면 그대로 이륙할 이유가 아니라 기다려야 할 이유로 받아들이세요. 비행 중에는 정지 비행 상태에서 예상치 못한 드리프트, 평소라면 문제없을 바람 속에서 위치 유지에 실패하는 것이 GPS 고정이 약해졌다는 신호입니다.

## 지자기 활동 외의 흔한 원인

높은 건물, 울창한 나무숲, 다리, 금속 구조물 근처를 비행하면 모두 GPS 멀티패스 간섭이나 신호 차단을 일으킬 수 있습니다 — 이는 우주기상보다 훨씬 흔한 GPS 저하 원인이므로 먼저 배제해봐야 합니다.

## 비행 중 발생했을 때 해야 할 일

드론이 지원한다면 자세(attitude) 모드나 수동 비행 모드로 전환하세요. 이 모드는 안정화를 위해 GPS가 아니라 가속도계와 기압계에 의존하므로 저하된 위성 고정의 영향을 덜 받습니다. 속도를 줄이고, 안전하다면 고도를 약간 높이세요(장애물 근처보다 탁 트인 하늘에서 대체로 신호가 더 강함). 자동 모드로 정확한 이륙 지점까지 복귀를 시도하기보다 가장 가깝고 안전하며 탁 트인 지점에 착륙하세요.

## GPS 문제 중 자동복귀에만 의존하지 마세요

자동복귀(RTH)는 GPS에 의존하는 기능입니다 — 실제 GPS 문제가 발생했을 때는 안정적으로 작동하지 않을 수 있습니다. 자동화가 GPS 관련 비상 상황을 알아서 해결해줄 것이라 가정하지 말고, 항상 수동 조작에 대한 인식을 유지하세요.

## 착륙 후

같은 장소에서 날짜를 달리해도 약한 신호가 반복된다면, 일회성이 아니라 (구조물 간섭 가능성이 큰) 그 장소 고유의 문제로 간주하고 앞으로의 비행 계획에 반영하세요.""",
    },
    ja={
        "title": "ドローンのGPS信号が弱いときの対処法",
        "description": "GPSロックが弱いことを認識する方法と、飛行中に最も安全に対応する方法を説明します。",
        "body": """弱い、または不安定なGPS信号はドローンの挙動を変えるため、飛行中ではなく事前に警告サインを知っておくことが重要です。

## 警告サインを認識する

ほとんどの飛行アプリは離陸前に衛星数と信号強度の表示を示します — 衛星数が少ない場合(一般的におよそ7〜10未満、ただし機種により基準は異なる)や画面上のGPS警告は、そのまま離陸する理由ではなく、待つべき理由として受け止めましょう。飛行中は、ホバリング中の予期しないドリフトや、普段なら問題ない風の中で位置を保持できないことが、GPSロックが弱まっているサインです。

## 地磁気活動以外のよくある原因

高層ビル、密集した樹木、橋、金属構造物の近くを飛行すると、いずれもGPSマルチパス干渉や信号遮断を引き起こす可能性があります — これは宇宙天気よりもはるかによくあるGPS低下の原因であり、まず除外して検討すべきです。

## 飛行中に発生した場合の対処

ドローンが対応していれば、姿勢(アティチュード)モードや手動飛行モードに切り替えましょう。このモードは安定化にGPSではなく加速度計と気圧計を使うため、劣化した衛星ロックの影響を受けにくくなります。速度を落とし、安全であれば高度を少し上げ(障害物の近くより開けた空の方が一般に信号が強い)、自動モードで正確な離陸地点への帰還を試みるのではなく、最も近い安全で開けた場所に着陸してください。

## GPS問題の間、自動帰還だけに頼らない

自動帰還(RTH)はGPSに依存する機能です — 実際にGPSの問題が発生している間は、確実に機能しない可能性があります。自動化がGPS関連の緊急事態を解決してくれると想定せず、常に手動操作への意識を保ちましょう。

## 着陸後

同じ場所で日を変えても弱い信号が繰り返される場合、単発の出来事ではなく(構造物による干渉の可能性が高い)その場所固有の問題として扱い、今後の飛行計画に反映させましょう。""",
    },
    es={
        "title": "Qué hacer cuando la señal GPS de tu dron es débil",
        "description": "Cómo reconocer un bloqueo GPS débil y la forma más segura de reaccionar en pleno vuelo.",
        "body": """Una señal GPS débil o inestable cambia el comportamiento de tu dron, y conocer las señales de advertencia antes de estar en pleno vuelo es importante.

## Reconoce las señales de advertencia

La mayoría de las apps de vuelo muestran un recuento de satélites y un indicador de intensidad de señal antes de despegar: trata un recuento bajo de satélites (por lo general menos de unos 7-10, aunque los umbrales varían según el dron) o una advertencia de GPS en pantalla como un motivo para esperar, no para despegar de todos modos. En vuelo, una deriva inesperada mientras se mantiene estacionario, o que el dron no logre mantener la posición con un viento que normalmente sí podría, son señales de que el bloqueo GPS se ha debilitado.

## Causas comunes más allá de la actividad geomagnética

Volar cerca de edificios altos, arbolado denso, puentes o estructuras metálicas puede causar interferencia por multitrayecto GPS o bloqueo de señal — esta es una causa mucho más común de GPS débil que el clima espacial, y vale la pena descartarla primero.

## Qué hacer si ocurre en pleno vuelo

Cambia a un modo de vuelo de actitud o manual si tu dron lo admite, ya que este depende del acelerómetro y el barómetro en lugar del GPS para la estabilización y se ve menos afectado por un bloqueo satelital degradado. Reduce la velocidad, gana algo de altitud si es seguro hacerlo (el cielo abierto generalmente significa una señal más fuerte que cerca de obstrucciones), y aterriza en el lugar seguro y abierto más cercano en lugar de intentar regresar a tu punto exacto de despegue en modo automático.

## No dependas solo del retorno a casa durante un problema de GPS

El retorno a casa es una función que depende del GPS: durante un problema real de GPS, puede que no funcione de forma fiable. Mantén siempre conciencia del control manual en lugar de asumir que la automatización resolverá una emergencia relacionada con el GPS.

## Después de aterrizar

Si una señal débil se repite en el mismo lugar en días diferentes, trátalo como un problema específico del sitio (probablemente interferencia estructural) en lugar de algo puntual, y planifica en consecuencia para el futuro.""",
    },
)

# ---------------------------------------------------------------------------
# Write everything
# ---------------------------------------------------------------------------

def frontmatter(t, locale_data, category, tags):
    lines = ["---"]
    lines.append(f'title: "{locale_data["title"]}"')
    lines.append(f'description: "{locale_data["description"]}"')
    lines.append(f'publishedAt: "{PUBLISHED_AT}"')
    tag_str = ", ".join(f'"{tg}"' for tg in tags)
    lines.append(f"tags: [{tag_str}]")
    lines.append(f'category: "{category}"')
    lines.append("---")
    return "\n".join(lines)

count = 0
for topic in TOPICS:
    for locale in ("en", "ko", "ja", "es"):
        data = topic[locale]
        fm = frontmatter(topic["slug"], data, topic["category"], topic["tags"])
        content = f'{fm}\n\n{data["body"]}\n'
        out_dir = os.path.join(GUIDES_DIR, locale)
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f'{topic["slug"]}.mdx')
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(content)
        count += 1

print(f"Wrote {count} guide files across {len(TOPICS)} topics x 4 locales.")
