import numpy as np
import matplotlib.pyplot as plt
import pandas as pd

# 상수 
G = 6.67430e-11       # 중력 상수 (m^3 kg^-1 s^-2)
M_center = 2e30       # 중심 잔해 질량 (예: 중성자별, kg)
E_total = 1e44        # 전체 폭발 에너지 (J)
softening = 1e10      # 중심 중력 연화 계수 (특이점 방지용)

# 시뮬레이션 파라미터 
dt = 1e4              # 시간 간격 (s)
t_total = 5e7         # 총 시뮬레이션 시간 (s)
n_steps = int(t_total / dt)

# 외부 입력 
count_per_element = 300       # 원소별 입자 개수 (외부에서 지정 가능)
datafile = "data.xlsx"        # 원소 데이터 파일

# 열 순서: element, r_min, r_max, mass
df = pd.read_excel(datafile, header=None, names=["element", "r_min", "r_max", "mass"])

# 입자 생성
particles = []
for _, row in df.iterrows():
    element = row["element"]
    r_min, r_max = row["r_min"], row["r_max"]
    mass = row["mass"]

    # 거리 기반 분배
    for i in range(count_per_element):
        r = np.random.uniform(r_min, r_max)
        pos = r
        init_radius = abs(pos)
        particles.append({
            "element": element,
            "mass": mass,
            "pos": pos,
            "vel": 0.0,
            "init_radius": init_radius
        })

# 최대 반지름 계산
R_max = max(p["init_radius"] for p in particles)

# 초기 속도 할당 거리 기반
for p in particles:
    r = p["init_radius"]
    if r == 0:
        r = 1e-6  # 중심에서 무한대 방지
    energy_fraction = 1 - (r / R_max)**1.3
    energy_fraction /= max((R_max / p["init_radius"])**1.3 for p in particles)
    energy = E_total * energy_fraction / len(particles)
    p["vel"] = np.sign(p["pos"]) * np.sqrt(2 * energy / p["mass"])

# 시뮬레이션 (중심 중력만 고려) 
for step in range(n_steps):
    for p in particles:
        r = p["pos"]
        a_gravity = -G * M_center / (r**2 + softening**2) * np.sign(r)

        # 속도, 위치 업데이트
        p["vel"] += a_gravity * dt
        p["pos"] += p["vel"] * dt

        # 중심 붕괴 방지
        if abs(p["pos"]) < 1e3:
            p["pos"] = np.sign(p["pos"]) * 1e3
            p["vel"] *= -0.5

# --- 시각화 ---
positions = [p["pos"] for p in particles]
elements = [p["element"] for p in particles]

bin_count = 500
bins = np.linspace(min(positions), max(positions), bin_count)

# 색상 자동 지정
unique_elements = df["element"].unique()
colors = plt.cm.tab10(np.linspace(0, 1, len(unique_elements)))
element_colors = {el: colors[i] for i, el in enumerate(unique_elements)}

plt.figure(figsize=(12, 6))
for element in unique_elements:
    element_positions = [p["pos"] for p in particles if p["element"] == element]
    plt.hist(element_positions, bins=bins, alpha=0.5, label=element, color=element_colors[element])

plt.xlabel("위치 (m)")
plt.ylabel("입자 개수")
plt.title("초신성 폭발 후 원소 분포 (1D, 입자간 중력 없음)")
plt.legend()
plt.grid(True)
plt.tight_layout()
plt.show()
