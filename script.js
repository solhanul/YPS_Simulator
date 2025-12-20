/* 화면 전환 */

const introScreen = document.getElementById("screen-intro");
const creationScreen = document.getElementById("screen-creation");

const $ = (s) => document.querySelector(s);

// Timing configuration (ms) — 시스템 내부 고정 속도
const VISUAL_STEP_MS = 600;       // 로그 시각화 간격 (고정)
const TICK_RELATION_DELAY = 650;  // 각 관계 처리 후 대기 (고정)
const TICK_PLAYER_DELAY = 900;    // 각 플레이어 처리(이벤트 포함) 후 대기 (고정)

let showAllLogs = false;

document.getElementById("btn-start").onclick = () => {
  introScreen.classList.remove("active");
  creationScreen.classList.add("active");
};

/* 캐릭터 기본 데이터 */

const characters = [];

function createCharacter({ name, career, position, personality, married }) {
  return {
    id: crypto.randomUUID(),
    name,
    career,
    position,
    personality,
    married,
    mental: 60,
    energy: 100,
    relations: {},
    careerRank: getCareerRank(career),
    active: true
  };
}

/* 태그 생성 */

const CAREER_OPTIONS = {
  rookie: "신인",
  midLevel: "중참",
  experienced: "중고참",
  veteran: "베테랑"
}

const POSITION_OPTIONS = {
  pitcher: "투수",
  catcher: "포수",
  infielder: "내야수",
  outfielder: "외야수"
};

const PERSONALITY_OPTIONS = {
  calm: "차분함",
  leader: "리더형",
  dependent: "의존적",
  social: "사교적",
  sensitive: "신경적",
  kind: "다정함"
};

const SOCIAL_EVENTS = {
  rivial: [
    ["{a}: 네 실책 때문에 우리가 졌어", "{b}: 남 탓하지마"],
    ["{a}:", "{b}:"]
  ],
  comfort: {
    junior: [
      ["{a}:", "{b}:"],
      ["{a}:", "{b}:"]

    ],
    senior: [
      ["{a}:", "{b}:"],
      ["{a}:", "{b}:"]
    ],
    mate: [
      ["{a}:", "{b}:"],
      ["{a}:", "{b}:"]
    ]  
  },
  love: {
    junior: [
      ["{a}: 이거 마시고 해요", "{b}: …고마워. 진짜."],
      ["{a}:", "{b}:"]
    ],
    senior: [
      ["{a}:", "{b}:"],
      ["{a}:", "{b}:"]
    ],
    mate: [
      ["{a}:", "{b}:"],
      ["{a}:", "{b}:"]
    ]
  },
  
  forbidden: {
    junior: {
      marriedA:[
        ["{a}: 아내 분은요...?", "{b}: 굳이 얘기할 필요는 없는 것 같은데."],
        ["{a}:", "{b}:"]
      ],
      marriedB:[
        ["{a}:", "{b}:"],
        ["{a}:", "{b}:"]

      ]
    },
    senior: {
      merridA:[
        ["{a}:", "{b}:"],
        ["{a}:", "{b}:"]
      ],
      merridB:[
        ["{a}:", "{b}:"],
        ["{a}:", "{b}:"]
      ]
    },
    mate: {
      merridA:[
        ["{a}:", "{b}:"],
        ["{a}:", "{b}:"]
      ],
      merridB:[
        ["{a}:", "{b}:"],
        ["{a}:", "{b}:"]
      ]
    }
  },
    
};


/* 캐릭터 등록 (커리어,포지션,성격 버튼) */

const careerContainer = document.getElementById("career-tags");

function getCareerRank(career) {
  const ranks = { rookie: 1, midLevel: 2, experienced: 3, veteran: 4 };
  if (!career) return 4;
  if (ranks[career]) return ranks[career];
  for (const [key, label] of Object.entries(CAREER_OPTIONS)) {
    if (label === career) return ranks[key] || 4;
  }
  return 4;
}

Object.entries(CAREER_OPTIONS).forEach(([key, label]) => {
  const btn = document.createElement("button");
  btn.className = "tag-btn";
  btn.textContent = label;
  btn.dataset.key = key;
  btn.onclick = () => {
    careerContainer.querySelectorAll(".tag-btn")
      .forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  };
  careerContainer.appendChild(btn);
});

function getSelectedCareer() {
  const btn = careerContainer.querySelector(".tag-btn.selected");
  return btn ? btn.textContent : null;
}


const positionContainer = document.getElementById("position-tags");

Object.entries(POSITION_OPTIONS).forEach(([key, label]) => {
  const btn = document.createElement("button");
  btn.className = "tag-btn";
  btn.textContent = label;
  btn.dataset.key = key;
  btn.onclick = () => {
    positionContainer.querySelectorAll(".tag-btn")
      .forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  };
  positionContainer.appendChild(btn);
});

function getSelectedPosition() {
  const btn = positionContainer.querySelector(".tag-btn.selected");
  return btn ? btn.textContent : null;
}


const personalityContainer = document.getElementById("personality-tags");

Object.entries(PERSONALITY_OPTIONS).forEach(([key, label]) => {
  const btn = document.createElement("button");
  btn.className = "tag-btn";
  btn.textContent = label;
  btn.dataset.key = key;
  btn.onclick = () => {
    personalityContainer.querySelectorAll(".tag-btn")
      .forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  };
  personalityContainer.appendChild(btn);
});

function getSelectedPersonality() {
  const btn = personalityContainer.querySelector(".tag-btn.selected");
  return btn ? btn.dataset.key : null;
}


/* 성격 보정값 */

function personalityBias(player) {
  const p = player && player.personality ? player.personality : null;
  switch (p) {
    case 'calm': return { mental: 20, tension: -1 };
    case 'leader': return { mental: 30, affection: 3, tension: 1 };
    case 'dependent': return { mental: -10, jealousy: 3, dependence: 5 };
    case 'social': return { mental: 20, affection: 4 };
    case 'sensitive': return { mental: -10, tension: 2 };
    case 'kind': return { affection: 5 };
    default: return {};
  }
}

/* 캐릭터 생성 */

document.getElementById("btn-add-char").onclick = () => {
  const name = document.getElementById("input-name").value.trim();
  const career = getSelectedCareer();
  const position = getSelectedPosition();
  const married = document.getElementById("input-married").checked;
  const personality = getSelectedPersonality();

  if (!name || !career || !position || !personality) {
    alert("모든 항목을 입력하세요.");
    return;
  }

  characters.push(createCharacter({
    name,
    career,
    position,
    personality,
    married
  }));

  renderCharacterList();
  refreshRelationSelectors();
  renderRelationTable();
  clearInputs();
};

/* 캐릭터 리스트 */
const listGrid = document.getElementById("char-list");

function renderCharacterList() {
  listGrid.innerHTML = "";

  characters.forEach(c => {
    const card = document.createElement("div");
    card.className = "mini-card";
    card.innerHTML = `
      <strong>${c.name}</strong><br>
      연차: ${c.career}<br>
      포지션: ${c.position}<br>
      성격: ${PERSONALITY_OPTIONS[c.personality] || c.personality}<br>
      ${c.married ? "기혼" : "미혼"}
      <button class="btn-delete">×</button>
    `;
    card.querySelector(".btn-delete").onclick = () => {
      removeCharacterById(c.id);
      renderCharacterList();
      refreshRelationSelectors();
      renderRelationTable();
    };

    listGrid.appendChild(card);
  });
}

function clearInputs() {
  document.getElementById("input-name").value = "";
  document.getElementById("input-married").checked = false;
  document.querySelectorAll(".tag-btn.selected")
    .forEach(b => b.classList.remove("selected"));
}

// 관계 설정
const EMOTION_PRESETS = {
  neutral:   { affection: 10, tension: 10 },
  interest:  { affection: 40, tension: 20 },
  dislike:   { affection: -20, tension: 0 },
  obsession: { affection: 60, tension: 40, dependence: 30 }
};



function determineContext(from, to) {
  const fromAffection = from.relations && from.relations[to.id] && from.relations[to.id].stats && typeof from.relations[to.id].stats.affection === 'number'
    ? from.relations[to.id].stats.affection
    : 0;

  const toAffection = to.relations && to.relations[from.id] && to.relations[from.id].stats && typeof to.relations[from.id].stats.affection === 'number'
    ? to.relations[from.id].stats.affection
    : 0;

  return {
    seniorJunior: from.careerRank > to.careerRank ? "senior" :
                  from.careerRank < to.careerRank ? "junior" : "mate",
    rival: (from.position === to.position) && (fromAffection < 0) && (toAffection < 0) && (
      (from.career && to.career && from.career === to.career) || (from.careerRank && to.careerRank && from.careerRank === to.careerRank)
    ),
    forbidden: false
  };
}

const selectFrom = document.getElementById("select-from");
const selectTo   = document.getElementById("select-to");

function refreshRelationSelectors() {
  selectFrom.innerHTML = "";
  selectTo.innerHTML   = "";

  characters.forEach(c => {
    const opt1 = document.createElement("option");
    opt1.value = c.id;
    opt1.textContent = c.name;

    const opt2 = opt1.cloneNode(true);

    selectFrom.appendChild(opt1);
    selectTo.appendChild(opt2);
  });
}

let selectedEmotion = null;

document.querySelectorAll(".emotion-btn").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".emotion-btn")
            .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    selectedEmotion = btn.dataset.emotion;
  };
});

document.getElementById("btn-set-relation").onclick = () => {
  const fromId = selectFrom.value;
  const toId = selectTo.value;

  if (!fromId || !toId) {
    alert("주체와 대상을 선택하세요.");
    return;
  }

  if (fromId === toId) {
    alert("자기 자신과의 관계는 설정할 수 없습니다.");
    return;
  }

  if (!selectedEmotion) {
    alert("감정을 선택하세요.");
    return;
  }

  const from = characters.find(c => c.id === fromId);
  const to = characters.find(c => c.id === toId);

  if (!from || !to) {
    alert("관계 설정할 캐릭터를 먼저 선택하세요.");
    return;
  }

  if (!from.relations || typeof from.relations !== "object") {
    from.relations = {};
  }

  try {
    const relation = createRelation(from, to, selectedEmotion);
    from.relations[to.id] = relation;

    const label = translateEmotion(relation.emotion) || "관계";
    writeGameLog({
      day: currentDay,
      text: `${from.name} -> ${to.name} 관계가 '${label}'(으)로 설정되었습니다.`
    });

    renderRelationTable();

    if (typeof renderLogs === "function") {
      renderLogs();
    } else {
      console.warn("renderLogs 함수가 아직 정의되지 않았습니다. 새로고침 후 다시 시도하세요.");
    }

    console.log("관계 등록:", { from: from.name, to: to.name, emotion: selectedEmotion });
  } catch (err) {
    console.error("관계 등록 중 오류:", err);
    alert("관계를 등록하는 동안 오류가 발생했습니다. 콘솔을 확인하세요.");
  }
};

function createRelation(from, to, emotion) {
  const context = determineContext(from, to);
  const preset  = EMOTION_PRESETS[emotion];

  const relation = {
    emotion,
    context,
    stats: {
      affection: preset.affection || 0,
      tension:   preset.tension || 0,
      jealousy:  0,
      dependence: preset.dependence || 0
    },
    logCount: 0
  };

  if (from.married && ["interest", "obsession"].includes(emotion)) {
    relation.context.forbidden = true;
    relation.stats.tension += 20;
  }

  return relation;
}


/* 관계 테이블 */
const relationTable = document.getElementById("relation-table");

function renderRelationTable() {
  try {
    relationTable.innerHTML = "";

    const validChars = characters.filter(c => c && typeof c === "object" && c.id && c.name);

    // 헤더
    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    headRow.innerHTML = `<th>주체 \\ 대상</th>`;

    validChars.forEach(c => {
      const th = document.createElement("th");
      th.textContent = c.name;
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    relationTable.appendChild(thead);

    // 바디
    const tbody = document.createElement("tbody");

    validChars.forEach(from => {
      const row = document.createElement("tr");
      const nameCell = document.createElement("th");
      nameCell.textContent = from.name;
      row.appendChild(nameCell);

      validChars.forEach(to => {
        const cell = document.createElement("td");

        if (from.id === to.id) {
          cell.textContent = "—";
          cell.className = "self-cell";
        } else {
          const rel = from.relations && typeof from.relations === "object" ? from.relations[to.id] : undefined;

          if (!rel) {
            cell.textContent = "";
          } else {
            const label = translateEmotion(rel.emotion);
            if (!label) {
              cell.textContent = "";
            } else {
              cell.textContent = label;
              cell.classList.add(`emotion-${rel.emotion}`);
            }
          }
        }

        row.appendChild(cell);
      });

      tbody.appendChild(row);
    });

    relationTable.appendChild(tbody);
  } catch (err) {
    console.error("renderRelationTable error:", err);
    relationTable.innerHTML = `<tbody><tr><td colspan="100">표를 렌더링하는 중 오류가 발생했습니다. 개발자 도구 콘솔을 확인하세요.</td></tr></tbody>`;
  }
}


/* 로그 시스템 */
let currentDay = 1;
const gameLogs = [];

async function dayTick() {
  console.log("=== dayTick 시작 ===", "currentDay=", currentDay);

  const dayForThisTick = currentDay;

  for (const player of characters) {
    if (!player || player.active === false) continue;
    const entries = player.relations && typeof player.relations === "object"
      ? Object.entries(player.relations)
      : [];

    for (const [tid, relation] of entries) {
      try {
        if (!relation || typeof relation !== "object") continue;

        relation.stats = relation.stats || { affection: 0, tension: 0, jealousy: 0, dependence: 0 };
        relation.logCount = relation.logCount || 0;

        const target = characters.find(c => c.id === tid);
        if (!target) {
          // 대상 캐릭터가 삭제되었으면 관계 정리
          if (player.relations && typeof player.relations === 'object') delete player.relations[tid];
          continue;
        }

        let log = null;
        try { log = generateRelationLog(player, target, relation); }
        catch (innerErr) {
          console.error("generateRelationLog 예외:", innerErr, { player: player.name, targetId: tid });
          log = null;
        }

        if (log) {
          relation.logCount++;
          await writeGameLog({ day: dayForThisTick, text: log });
        } else {
          // 일정 확률로 SOCIAL_EVENTS에서 무작위 대사를 시도
          const socialChance = 0.35;
          if (Math.random() < socialChance) {
            const soc = trySocialEvent(player, target, relation);
            if (soc) {
              await writeGameLog({ day: dayForThisTick, text: soc });
            } else {
              const fallbackText = `${player.name}의 하루가 흘렀습니다.`;
              await writeGameLog({ day: dayForThisTick, text: fallbackText });
            }
          } else {
            const fallbackText = `${player.name}의 하루가 흘렀습니다.`;
            await writeGameLog({ day: dayForThisTick, text: fallbackText });
          }
        }

        try {
          applyDailyDrift(player, relation);
          checkEmotionEvolution(relation);
        } catch (e) {
          console.error("수치 변화/진화 검사 중 오류:", e, { player: player.name, targetId: tid });
        }
      } catch (err) {
        console.error("dayTick 관계 처리 중 예외:", err, { player: player.name, targetId: tid });
      }
        // 각 관계 처리 후 느리게 진행
        await sleep(TICK_RELATION_DELAY);
    }

    // 플레이어 단위 일일 이벤트(예: SNS) — 비동기로 대기
    try {
      await eventSNS(player);
      
      // 포지션별 수비/상황 이벤트
      await eventInfielderError(player);
      await eventOutfielderError(player);
      await eventCatcherSChoice(player);
      await eventbasesloadedInfilder(player);
      await eventbasesloadedOutfilder(player);
      
      // 이전에 만드신 투수 이벤트가 있다면 추가
      if (typeof eventHardHitBall === "function") {
        await eventHardHitBall(player);
      }
    } catch (e) {
      console.error(`${player.name} 이벤트 처리 중 오류:`, e);
    }
    // 플레이어 단위 지연
    await sleep(TICK_PLAYER_DELAY);
  }

  // dayTick는 현재의 `currentDay`를 기준으로 로그를 생성/저장만 합니다.
  // 일차 증가는 외부(버튼 클릭 등)에서 제어하도록 변경했습니다.
  console.log("=== dayTick 종료 ===", "processedDay=", dayForThisTick);
}

/* 로그 생성 */

function generateRelationLog(player, target, relation) {
  const { emotion, stats, context } = relation;
  const intensity = stats.affection + stats.tension;

  // 우선 감정 기반 로그
  if (context.forbidden && stats.tension > 50 && Math.random() < 0.5) {
    applyMental(player, -6);
    return forbiddenHintLogs(player);
  }

  if (emotion === "unstable") return unstableLogs(player, target);
  if (emotion === "obsession") return obsessionLogs(player);
  if (emotion === "dislike" && stats.tension > 40) return dislikeLogs(player);
  if (emotion === "interest") return interestLogs(player, target, relation);

  // 기본 로그가 없으면 null 반환
  return null;
}

// SOCIAL_EVENTS에서 상황에 맞는 대사를 선택하고, 필요시 수치 변경을 applyMental/applyEnergy를 통해 수행
function trySocialEvent(player, target, relation) {
  if (!relation || !relation.context) return null;
  const ctx = relation.context;

  // 라이벌 상황 우선
  if (ctx.rival) {
    const pool = SOCIAL_EVENTS.rivial || [];
    if (pool.length) {
      const tpl = randomFrom(pool);
      const parts = Array.isArray(tpl) ? tpl : [tpl];
      const line = parts.map(s => s.replace('{a}', player.name).replace('{b}', target.name)).join(' ');
      applyMental(player, -4);
      applyMental(target, -2);
      return line;
    }
  }

  const role = ctx.seniorJunior || 'mate';

  // comfort
  if (SOCIAL_EVENTS.comfort && SOCIAL_EVENTS.comfort[role]) {
    const pool = SOCIAL_EVENTS.comfort[role];
    if (Array.isArray(pool) && pool.length) {
      const tpl = randomFrom(pool);
      const parts = Array.isArray(tpl) ? tpl : [tpl];
      const line = parts.map(s => s.replace('{a}', player.name).replace('{b}', target.name)).join(' ');
      applyMental(target, +3);
      return line;
    }
  }

  // love
  if (SOCIAL_EVENTS.love && SOCIAL_EVENTS.love[role]) {
    const pool = SOCIAL_EVENTS.love[role];
    if (Array.isArray(pool) && pool.length) {
      const tpl = randomFrom(pool);
      const parts = Array.isArray(tpl) ? tpl : [tpl];
      const line = parts.map(s => s.replace('{a}', player.name).replace('{b}', target.name)).join(' ');
      applyMental(player, +2);
      applyEnergy(player, -2);
      return line;
    }
  }

  // forbidden (하위 키가 있는 경우 랜덤 선택)
  if (SOCIAL_EVENTS.forbidden && SOCIAL_EVENTS.forbidden[role]) {
    const sub = SOCIAL_EVENTS.forbidden[role];
    const keys = Object.keys(sub || {});
    if (keys.length) {
      const key = randomFrom(keys);
      const pool = sub[key] || [];
      if (Array.isArray(pool) && pool.length) {
        const tpl = randomFrom(pool);
        const parts = Array.isArray(tpl) ? tpl : [tpl];
        const line = parts.map(s => s.replace('{a}', player.name).replace('{b}', target.name)).join(' ');
        applyMental(player, -8);
        applyEnergy(player, -5);
        return line;
      }
    }
  }

  return null;
}

/* 로그 */
function obsessionLogs(player) { 
    const pool = [ 
        `${player.name}은(는) 무의식적으로 같은 방향을 바라보고 있었다.`, 
        `${player.name}은(는) 오늘 유독 주변을 자주 살폈다.`, 
        `${player.name}의 시선은 자꾸 한곳에 머물렀다.`, 
    ]; 
    return randomFrom(pool); 
}

function dislikeLogs(player) { 
    const pool = [ 
        `${player.name}은(는) 짧은 말로 대화를 끝냈다.`, 
        `${player.name}은(는) 굳이 말을 잇지 않았다.`, 
        `${player.name}은(는) 피곤함을 핑계로 자리를 떴다.`, 
    ]; 
    return randomFrom(pool); 
}

function interestLogs(player, target, relation) { 
    const stage = relation.logCount; 
    const pools = { 
        early: [ 
            `${player.name}은(는) 괜히 시선을 피했다.`, 
            `${player.name}은(는) 사소한 말에도 귀를 기울였다.`, 
            `${player.name}은(는) 평소보다 오래 머물렀다.`, 
            `${player.name}은(는) 괜히 같은 타이밍에 고개를 들었다.`, 
            `${player.name}은(는) 별 의미 없는 말을 오래 곱씹었다.`, 
            `${player.name}은(는) 웃을 이유가 없었는데 웃고 있었다.`, 
            `${player.name}은(는) 누군가의 이름을 한 번 더 확인했다.`, 
            `${player.name}은(는) 오늘 하루가 유난히 빨리 지나간 느낌이 들었다.`, 
        ], 
        mid: [ 
            `${player.name}은(는) ${target.name}의 말이 계속 남았다.`, 
            `${player.name}은(는) ${target.name}의 반응을 기다렸다.`, 
            `${player.name}은(는) ${target.name} 쪽을 잠깐 바라봤다.`, 
        ], 
        late: [ 
            `${player.name}은(는) ${target.name}의 표정을 지나치게 신경 썼다.`, 
            `${player.name}은(는) ${target.name}의 이름을 입안에서 굴렸다.`, 
        ] 
    }; 
    if (stage < 3) return randomFrom(pools.early); 
    if (stage < 6) return randomFrom(pools.mid); 
    return randomFrom(pools.late); 
}

function forbiddenHintLogs(player, target) { 
    const pool = [ 
        `${player.name}은(는) 생각을 멈추려 했지만 쉽지 않았다.`,
        `${player.name}은(는) 스스로에게 변명을 늘어놓았다.`,
        `${player.name}은(는) 오늘따라 마음이 편치 않았다.`,
    ]; 
    return randomFrom(pool); 
}

function unstableLogs(player, target) {
 const pool = [
    `${player.name}은(는) ${target.name}의 말에 즉각 반응하지 못했다.`, 
    `${player.name}은(는) ${target.name}의 말이 마음에 걸렸다.`,
    `${player.name}은(는) 예전처럼 쉽게 등을 돌리지 못했다.`,
    `${player.name}은(는) 괜히 잠들기까지 시간이 걸렸다.`,
  ];
   return randomFrom(pool);
}

/* 감정 진화 */

function checkEmotionEvolution(relation) {
  if (relation.emotion === "dislike" && 
      relation.logCount >= 4 &&
      relation.stats.tension < 40 && 
      relation.stats.affection > -10
    ) {
    relation.emotion = "unstable";
  }
  if (relation.emotion === "unstable" && 
      relation.logCount >= 7 && 
      relation.stats.affection > 15
  ) {
    relation.emotion = "interest";
  }
}

/* 수치 변화 */

function applyDailyDrift(player, relation) {
  const bias = personalityBias(player);
  Object.keys(bias).forEach(k => {
    relation.stats[k] += bias[k];
  });
  clampStats(relation.stats);
}

function clampStats(stats) {
  Object.keys(stats).forEach(k => {
    stats[k] = Math.max(-50, Math.min(100, stats[k]));
  });
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function translateEmotion(key) {
  const map = {
    interest: "호감",
    dislike: "혐오",
    obsession: "집착",
    neutral: "무관심"
  };
  return Object.prototype.hasOwnProperty.call(map, key) ? map[key] : "";
}
/* 로그 실행 */
const logContainer = document.getElementById("log-area");
const btnNextDay  = document.getElementById("btn-next-day");

function renderLogs() {
  logContainer.innerHTML = "";
  // showAllLogs가 true일 때만 모든 로그를 보여주고, 아니면 현재(또는 마지막) 일자의 로그만 보여줍니다.
  const visibleDay = showAllLogs ? null : (lastDay !== null ? lastDay : currentDay);
  gameLogs.forEach(entry => {
    if (visibleDay === null || entry.day === visibleDay || entry.day === currentDay) {
      const div = document.createElement("div");
      div.textContent = `[DAY ${entry.day}] ${entry.text}`;
      div.className = "log-entry";
      logContainer.appendChild(div);
    }
  });
  logContainer.scrollTop = logContainer.scrollHeight;
}

const btnNextDayEl = document.getElementById("btn-next-day");

if (btnNextDayEl) {
  btnNextDayEl.addEventListener("click", async () => {
    // 1. 중복 클릭 방지 (락)
    if (window.__dayTickLocked) {
      console.warn("dayTick 이미 실행 중 — 중복 호출 무시");
      return;
    }
    window.__dayTickLocked = true;

    try {
      // 2. 날짜 증가 및 헤더 갱신
      currentDay++;
      if (typeof renderTodayHeader === "function") {
        renderTodayHeader(currentDay);
      }

      // 3. 메인 로직 실행 (비동기)
      await dayTick();

      // 4. 전체 로그 렌더링 갱신
      if (typeof renderLogs === "function") {
        renderLogs();
      }

      // 5. 돌발 이벤트 체크
      if (typeof checkForEvent === "function") {
        const ev = checkForEvent();
        if (ev && typeof triggerEvent === "function") {
          await triggerEvent(ev); // 이벤트도 비동기일 수 있으므로 await 권장
        }
      }
    } catch (error) {
      // 바깥쪽 try에 대한 catch 블록 추가 (에러 해결 핵심)
      console.error("실행 중 전체 오류 발생:", error);
    } finally {
      // 6. 실행 완료 후 락 해제 (무조건 실행)
      setTimeout(() => {
        window.__dayTickLocked = false;
      }, 50);
    }
  });
}

let lastDay = null;                   
const dayRevealCounts = {};            

function renderTodayHeader(day) {
  const dayBtn = document.getElementById("day-display");
  const todayArea = document.getElementById("today-log-area");
  if (dayBtn) dayBtn.textContent = "DAY " + day;
  if (todayArea) {
    todayArea.innerHTML = `<div class="hint">DAY ${day} — 클릭해서 로그를 하나씩 열어보세요</div>`;
  }
  dayRevealCounts[day] = 0;
  lastDay = day;
  // 메인 로그는 해당 일자만 표시하도록 설정
  showAllLogs = false;
  const area = document.getElementById("log-area");
  if (area) area.innerHTML = ""; // 이전 내용 제거

  // 시각 큐에서 현재/마지막 일자만 유지하여 불필요한 스킵을 방지
  purgeVisualQueue(day);
}

function purgeVisualQueue(visibleDay) {
  if (!Array.isArray(_visualQueue) || _visualQueue.length === 0) return;
  const keep = [];
  for (const e of _visualQueue) {
    if (!e || typeof e.day !== 'number') continue;
    if (e.day === visibleDay || e.day === currentDay) keep.push(e);
  }
  _visualQueue = keep;
}

function revealNextLogForDay(day) {
  const todayArea = document.getElementById("today-log-area");
  const logsForDay = gameLogs.filter(l => l.day === day);
  const revealed = dayRevealCounts[day] || 0;

  if (revealed >= logsForDay.length) {
    if (todayArea) {
      const doneFlag = todayArea.querySelector(".done-flag");
      if (!doneFlag) {
        const d = document.createElement("div");
        d.className = "done-flag";
        d.textContent = "(해당 일차의 모든 로그를 표시했습니다)";
        d.style.fontSize = "12px";
        d.style.color = "#666";
        todayArea.appendChild(d);
      }
    }
    return;
  }

  const nextLog = logsForDay[revealed];
  if (nextLog) {
    dayRevealCounts[day] = revealed + 1;
    if (todayArea) {
      const div = document.createElement("div");
      div.className = "log-entry";
      div.textContent = `[DAY ${nextLog.day}] ${nextLog.text}`;
      todayArea.appendChild(div);
      todayArea.scrollTop = todayArea.scrollHeight;
    }
  }
}

const btnShowAll = document.getElementById("btn-show-all-logs");
if (btnShowAll) {
  btnShowAll.addEventListener("click", () => {
    showAllLogs = true;
    if (typeof renderLogs === "function") {
      renderLogs();
      const area = document.getElementById("log-area");
      if (area) area.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

const dayDisplayBtn = document.getElementById("day-display");
if (dayDisplayBtn) {
  dayDisplayBtn.addEventListener("click", () => {
    if (lastDay == null) return;
    revealNextLogForDay(lastDay);
  });
}
/* 필수 함수 */
function chance(p) { return Math.random() < p; }

async function applyMental(c, delta) {
  const bias = personalityBias(c);
  const mult = bias?.mental ? 1 + bias.mental / 100 : 1;

  const d = Math.round(delta * mult);

  c.mental = Math.max(0, Math.min(100, c.mental + d));
  await logLine("",`${c.name}의 멘탈이 ${d}만큼 ${delta > 0 ? "증가" : "감소"}`, "info", 0.4);
}


async function applyEnergy(c, delta) {
  if (!c) return;

  c.energy = Math.max(0, Math.min(100, c.energy + delta));

  await logLine("",`${c.name}의 에너지가 ${delta}만큼 ${delta > 0 ? "증가" : "감소"}`,"info", 0.4);
}



async function logEmphasizedLine(prefix, text, style = "highlight") {
  const logBox = $("#console-log");
  if (!logBox) return;
  const cursor = logBox.querySelector(".log-cursor");

  const p = document.createElement("p");
  p.className = `log bright`; 
  p.innerHTML = `${emphasizeText(prefix)} ${emphasizeText(text, style)}`;

  if (cursor) logBox.insertBefore(p, cursor);
  else logBox.appendChild(p);

  logBox.scrollTop = logBox.scrollHeight;
  await sleep(90);
}


// --- 중앙 로그 및 비동기 표시 큐 ---
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

let _visualQueue = [];
let _visualProcessing = false;

async function _processVisualQueue() {
  if (_visualProcessing) return;
  _visualProcessing = true;
  const area = document.getElementById("log-area");
  while (_visualQueue.length) {
    const entry = _visualQueue.shift();
    try {
      // showAllLogs 모드일 때는 개별 항목을 추가하지 않습니다 (renderLogs 사용)
      if (showAllLogs) {
        // append with pacing
        if (area) {
          const div = document.createElement("div");
          div.className = "log-entry";
          div.textContent = `[DAY ${entry.day}] ${entry.text}`;
          area.appendChild(div);
          area.scrollTop = area.scrollHeight;
        }
        await sleep(VISUAL_STEP_MS);
      } else {
        // 메인 로그는 현재/마지막 일차 항목만 표시
        const visibleDay = (lastDay !== null) ? lastDay : currentDay;
        if (entry.day === visibleDay || entry.day === currentDay) {
          if (area) {
            const div = document.createElement("div");
            div.className = "log-entry";
            div.textContent = `[DAY ${entry.day}] ${entry.text}`;
            area.appendChild(div);
            area.scrollTop = area.scrollHeight;
          }
          // only pace when we actually displayed something
          await sleep(VISUAL_STEP_MS);
        } else {
          // skip old-day entries quickly without waiting to speed up day-splitting
          continue;
        }
      }
    } catch (e) {
      console.error("visual log append error:", e);
    }
  }
  _visualProcessing = false;
}

async function writeGameLog(entry) {
  try {
    // 저장소에 추가
    gameLogs.push(entry);
    // UI 즉시 전체 재렌더는 제거 — 시각 큐가 순차적으로 표시합니다.
    _visualQueue.push(entry);
    _processVisualQueue();
  } catch (e) {
    console.error("writeGameLog error:", e);
  }
}

async function logLine(prefix, text, style = "system", delay = 0.6) {
  const entry = { day: currentDay, text: `${prefix} ${text}` };
  // 영구 로그에 저장하고 시각 큐로 표시되도록 writeGameLog 사용
  await writeGameLog(entry);
  await sleep(Math.round(delay * 1000));
  const logArea = document.getElementById("log-area");
  logArea.scrollTop = logArea.scrollHeight;
}

function askChoice(opts) {
  return new Promise(resolve => {
    const existing = document.getElementById("askChoice-modal");
    if (existing) existing.remove();

    const wrap = document.createElement("div");
    wrap.id = "askChoice-modal";
    wrap.style = "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:9999;";

    const bg = document.createElement("div");
    bg.style = "position:absolute;inset:0;background:rgba(0,0,0,0.45);";
    wrap.appendChild(bg);

    const box = document.createElement("div");
    box.style = "background:#fff;padding:18px;border-radius:8px;min-width:300px;max-width:90%;z-index:1;";

    const t = document.createElement("div");
    t.style = "font-weight:700;margin-bottom:8px;";
    t.textContent = opts.title || "선택";
    box.appendChild(t);

    const b = document.createElement("div");
    b.style = "margin-bottom:12px;";
    b.textContent = opts.body || "";
    box.appendChild(b);

    const btnRow = document.createElement("div");
    btnRow.style = "display:flex;gap:8px;justify-content:flex-end;";

    (opts.options || []).forEach(o => {
      const btn = document.createElement("button");
      btn.textContent = o.label || o.value;
      btn.onclick = () => { wrap.remove(); resolve(o.value); };
      btnRow.appendChild(btn);
    });

    const cancel = document.createElement("button");
    cancel.textContent = "취소";
    cancel.onclick = () => { wrap.remove(); resolve(null); };
    btnRow.appendChild(cancel);

    box.appendChild(btnRow);
    wrap.appendChild(box);
    document.body.appendChild(wrap);
  });
}


/* 일일이벤트*/
async function eventSNS(c) {
  if (!chance(0.10)) return;

  try {
    await logLine(">>", ` ${c.name}에게 SNS 디엠이 왔다`, "warning", 0.55);

    const ans = await askChoice({
      title: "[CHOICE]",
      body: ` ${c.name}, 디엠에 답을 하시겠습니까?`,
      options: [
        { label: "대답한다", value: "enter" },
        { label: "무시한다", value: "ignore" },
      ],
    });

    if (ans === "ignore") {
      applyMental(c, -5);
      await logLine(">>", `[SYSTEM] ${c.name}은(는) 디엠에 답을 하지 않았다.`, "warning", 0.75);
      if (c.mental <= 0) {
        c.mental = 0;
        await logLine(">>", `[SYSTEM] ${c.name}은(는) 더 버티지 못하고 2군으로 내려갔습니다`, "warning", 0.85);
        return;
      }
      return;
    }
    else if (!chance(0.60)) {
      await logLine(">>", ` ${c.name}이 한 아이의 디엠을 받았습니다`, "warning", 0.75);
      await logLine(">>", `아이에게 보낸 디엠이 퍼져 미담으로 번졌습니다`, "warning", 0.85);
      applyMental(c, +10)
    } 
    else {
      await logLine(">>", `화난 팬의 디엠을 받았습니다`, "warning", 0.75);
      await logLine(">>", ` ${c.name}의 디엠의 답이 논란이 되어 부정적인 여론이 돕니다.`, "warning", 0.85);
      applyMental(c, -15);
      applyEnergy(c, -15)
    }
  } catch (e) {
    console.error("eventSNS 오류:", e);
  }
}

async function eventHardHitBall(c) {      
  if (c.position !== '투수') return;
  if (!chance(0.10)) return;

  try {
    await logLine(">>", ` ${c.name}에게 강습타구가 날라온다`, "warning", 0.55);

    const ans = await askChoice({
      title: "[CHOICE]",
      body: ` ${c.name}, 강습타구를 잡으시겠습니까?`,
      options: [
        { label: "잡는다", value: "catch" },
        { label: "피한다", value: "ignore" },
      ],
    });

    if (ans === "ignore") {

      applyMental(c, -5);
      await logLine(">>", `[SYSTEM] ${c.name}은(는) 점수를 주고 말았다.`, "warning",  0.75);
      if (c.mental <= 0) {
        c.mental = 0;
        await logLine(">>", `[SYSTEM] ${c.name}은(는) 더 버티지 못하고 시합 후 2군으로 내려갔습니다`, "warning", 0.85);
        return;
      }
      return;
    }
    else if (!chance(0.10)) {
      await logLine(">>", `강습타구를 제대로 잡아 1루로 송구하였습니다`, "warning", 0.75);
      await logLine(">>", `병살을 잡아 이닝이 종료되었습니다`, "warning", 0.85);
      applyMental(c, +10)
    } 
    else {
      await logLine(">>", ` ${c.name}이(가) 강습타구에 맞았습니다`, "warning", 0.75);
      await logLine(">>", `부상으로 다음 등판이 밀리게 되었습니다.`, "warning", 0.85);
      applyMental(c, -10);
      applyEnergy(c, -20)
    }
  } catch (e) {
    console.error("eventHardHitBall 오류:", e);
  }
}

async function eventInfielderError(c) {
  if (c.position !== '내야수') return;
  if (!chance(0.10)) return;

  try {
    await logLine(">>", `옆 수비수와 ${c.name} 사이에 공이 굴러온다`, "warning", 0.55);

    const ans = await askChoice({
      title: "[CHOICE]",
      body: ` ${c.name}, 공을 잡으시겠습니까?`,
      options: [
        { label: "잡는다", value: "catch" },
        { label: "피한다", value: "ignore" },
      ],
    });

    if (ans === "ignore") {
      if (!chance(0.30)) {
        applyMental(c, -5);
        await logLine(">>", `[SYSTEM] ${c.name}은(는) 점수를 주고 말았다.`, "warning", 0.75);
        if (c.mental <= 0) {
          c.mental = 0;
          await logLine(">>", `[SYSTEM] ${c.name}은(는) 더 버티지 못하고 시합 후 2군으로 내려갔습니다`, "warning", 0.85);
          return;}
      }
      else {
        await logLine(">>", `옆 수비수가 공을 잡아 주자를 잡았습니다.`, "warning", 0.75);
        applyMental(c, +3);
      }
      return;
    }
    else if (!chance(0.50)) {
      await logLine(">>", ` ${c.name}이(가) 공을 제대로 잡아 2루로 송구했다`, "warning", 0.75);
      await logLine(">>", `병살을 잡아 이닝이 종료되었습니다`, "warning", 0.85);
      applyMental(c, +10)
    } 
    else {
      await logLine(">>", ` ${c.name}와(과) 옆 수비수와 겹쳐 둘 다 공을 놓쳤다`, "warning", 0.75);
      await logLine(">>", `그 사이 주자가 홈으로 들어왔습니다.`, "warning", 0.85);
      applyMental(c, -10);
    }
  } catch (e) {
    console.error("eventInfielderError 오류:", e);
  }
}

async function eventOutfielderError(c) {
  if (c.position !== '외야수') return;
  if (!chance(0.10)) return;

  try {
    await logLine(">>", `옆 수비수와 ${c.name} 사이에 공이 날라온다`, "warning", 0.55);

    const ans = await askChoice({
      title: "[CHOICE]",
      body: ` ${c.name}, 공을 잡으시겠습니까?`,
      options: [
        { label: "잡는다", value: "catch" },
        { label: "피한다", value: "ignore" },
      ],
    });

    if (ans === "ignore") {
      if (!chance(0.30)) {
        applyMental(c, -5);
        await logLine(">>", `[SYSTEM] ${c.name}은(는) 점수를 주고 말았다.`, "warning", 0.75);
        if (c.mental <= 0) {
          c.mental = 0;
          await logLine(">>", `[SYSTEM] ${c.name}은(는) 더 버티지 못하고 시합 후 2군으로 내려갔습니다`, "warning", 0.85);
          return;}
      }
      else {
        await logLine(">>", `옆 수비수가 공을 잡아 뜬공 처리를 했습니다.`, "warning", 0.75);
        applyMental(c, +3);
      }
      return;
    }
    else if (!chance(0.50)) {
      await logLine(">>", ` ${c.name}이(가) 공을 제대로 잡아 1루로 송구했다`, "warning", 0.75);
      await logLine(">>", `병살을 잡아 이닝이 종료되었습니다`, "warning", 0.85);
      applyMental(c, +10)
    } 
    else {
      await logLine(">>", ` ${c.name}와(과) 옆 수비수와 겹쳐 둘 다 공을 놓쳤다`, "warning", 0.75);
      await logLine(">>", `그 사이 주자가 홈으로 들어왔습니다.`, "warning", 0.85);
      applyMental(c, -10);
    }
  } catch (e) {
    console.error("eventInfielderError 오류:", e);
  }
}

async function eventCatcherSChoice(c) {
  if (c.position !== '포수') return;
  if (!chance(0.10)) return;

  try {
    await logLine(">>", ` ${c.name}이(가) 번트 타구를 잡았다`, "warning", 0.55);

    const ans = await askChoice({
      title: "[CHOICE]",
      body: ` ${c.name}, 어디로 던지겠습니까?`,
      options: [
        { label: "1루", value: "onebase" },
        { label: "3루", value: "threebase" },
      ],
    });

    if (ans === "threebase") {
      if (!chance(0.30)) {
        applyMental(c, -5);
        await logLine(">>", `[SYSTEM] ${c.name}은(는) 주자를 전부 살려 버렸다.`, "warning", 0.75);
        if (c.mental <= 0) {
          c.mental = 0;
          await logLine(">>", `[SYSTEM] ${c.name}은(는) 더 버티지 못하고 시합 후 2군으로 내려갔습니다`, "warning", 0.85);
          return;}
      }
      else {
        await logLine(">>", `3루로 가던 주자를 아웃시켰다.`, "warning", 0.75);
        applyMental(c, +5);
      }
      return;
    }
    else if (!chance(0.50)) {
      await logLine(">>", ` ${c.name}은(는) 공을 제대로 잡아 1루로 송구했다`, "warning", 0.75);
      await logLine(">>", `1루 주자를 아웃시켰습니다. 3루는 세이프`, "warning", 0.85);
      applyMental(c, +3)
    } 
    else {
      await logLine(">>", `1루에 송구 미스가 났다`, "warning", 0.75);
      await logLine(">>", `그 사이 주자가 홈으로 들어왔습니다.`, "warning", 0.85);
      applyMental(c, -10);
    }
  } catch (e) {
    console.error("eventCatcherSChoice 오류:", e);
  }
}

async function eventbasesloadedInfilder(c) {
  if (c.position !== '내야수') return;
  if (!chance(0.10)) return;

  try {
    await logLine(">>", `만루 상황에 공이 ${c.name} 앞으로 굴러온다`, "warning", 0.55);

    const ans = await askChoice({
      title: "[CHOICE]",
      body: ` ${c.name}, 공을 어디로 던지시겠습니까?`,
      options: [
        { label: "2루", value: "twobase" },
        { label: "홈", value: "home" },
      ],
    });

    if (ans === "home") {
      if (!chance(0.30)) {
        applyMental(c, -10);
        await logLine(">>", `[SYSTEM] 송구 미스로 ${c.name}은(는) 점수를 주고 말았다. 2실점`, "warning", 0.75);
        if (c.mental <= 0) {
          c.mental = 0;
          await logLine(">>", `[SYSTEM] ${c.name}은(는) 더 버티지 못하고 시합 후 2군으로 내려갔습니다`, "warning", 0.85);
          return;}
      }
      else {
        await logLine(">>", `홈승부가 성공해 실점없이 아웃카운트를 잡았다.`, "warning", 0.75);
        applyMental(c, +3);
      }
      return;
    }
    else if (!chance(0.50)) {
      await logLine(">>", ` ${c.name}은(는) 공을 제대로 잡아 2루로 송구했다`, "warning", 0.75);
      await logLine(">>", `병살을 잡아 이닝이 종료되었습니다`, "warning", 0.85);
      applyMental(c, +10)
    } 
    else {
      await logLine(">>", ` ${c.name}은(는) 2루 주자만 아웃시켰다`, "warning", 0.75);
      await logLine(">>", `그 사이 주자가 홈으로 들어왔습니다.`, "warning", 0.85);
      applyMental(c, -3);
    }
  } catch (e) {
    console.error("eventbasesloadedInfilder 오류:", e);
  }
}

async function eventbasesloadedOutfilder(c) {
  if (c.position !== '외야수') return;
  if (!chance(0.10)) return;

  try {
    await logLine(">>", `만루 상황에 공이 ${c.name} 앞으로 날라온다`, "warning", 0.55);

    const ans = await askChoice({
      title: "[CHOICE]",
      body: ` ${c.name}, 공을 어디로 던지시겠습니까?`,
      options: [
        { label: "3루", value: "threebase" },
        { label: "홈", value: "home" },
      ],
    });

    if (ans === "home") {
      if (!chance(0.30)) {
        applyMental(c, -10);
        await logLine(">>", `[SYSTEM] 송구 미스로 주자가 한 베이스씩 더 이동했다. 2실점`, "warning", 0.75);
        if (c.mental <= 0) {
          c.mental = 0;
          await logLine(">>", `[SYSTEM] ${c.name}은(는) 더 버티지 못하고 시합 후 2군으로 내려갔습니다`, "warning", 0.85);
          return;}
      }
      else {
        await logLine(">>", `홈승부가 성공해 실점없이 아웃카운트 두개를 잡았다.`, "warning", 0.75);
        applyMental(c, +10);
      }
      return;
    }
    else if (!chance(0.50)) {
      await logLine(">>", ` ${c.name}은(는) 공을 제대로 잡아 3루로 송구했다`, "warning", 0.75);
      await logLine(">>", `주자들이 진루하는 것을 막았습니다`, "warning", 0.85);
      applyMental(c, +5)
    } 
    else {
      await logLine(">>", `3루로 간 공이 빠졌다`, "warning", 0.75);
      await logLine(">>", `그 사이 주자가 한명 더 홈으로 들어왔습니다. 2실점`, "warning", 0.85);
      applyMental(c, -5);
    }
  } catch (e) {
    console.error("eventbasesloadedInfilder 오류:", e);
  }
}

function removeCharacterById(id) {
  if (!id) return;
  characters.forEach(ch => {
    if (ch.relations && typeof ch.relations === 'object' && ch.relations[id]) {
      delete ch.relations[id];
    }
  });

  const idx = characters.findIndex(x => x.id === id);
  if (idx >= 0) characters.splice(idx, 1);
}

/* 캐릭터 상태 표시 */
// 1. 함수 정의 (파일 맨 끝에 추가)
function renderStatusPanel() {
    const list = document.getElementById("character-status-list");
    if (!list) return;
    list.innerHTML = ""; 

    characters.forEach(c => {
        const div = document.createElement("div");
        div.className = "status-card";
        div.onclick = () => openRelationModal(c.id); // 팝업 함수 호출
        
        div.innerHTML = `
            <div style="font-weight:bold; font-size:1.1em;">${c.name}</div>
            <div style="font-size:0.8em; color:#666; margin-bottom:8px;">${c.position}</div>
            
            <div style="font-size:0.8em;">멘탈 (${c.mental}%)</div>
            <div class="bar-container"><div class="bar-fill" style="width:${c.mental}%; background:#4a90e2;"></div></div>
            
            <div style="font-size:0.8em;">에너지 (${c.energy}%)</div>
            <div class="bar-container"><div class="bar-fill" style="width:${c.energy}%; background:#f5a623;"></div></div>
        `;
        list.appendChild(div);
    });
}

// 2. 버튼 이벤트 연결 (기존 btn-to-game.onclick 찾아서 수정)
document.getElementById('btn-to-game').onclick = () => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-game').classList.add('active');
    
    // 화면이 그려진 직후에 상태창 데이터 채우기
    setTimeout(renderStatusPanel, 50); 
};
// 예시: applyMental 함수 수정
async function applyMental(c, delta) {
  const bias = personalityBias(c);
  const mult = bias?.mental ? 1 + bias.mental / 100 : 1;
  const d = Math.round(delta * mult);

  c.mental = Math.max(0, Math.min(100, c.mental + d));
  await logLine("", `${c.name}의 멘탈이 ${d}만큼 ${delta > 0 ? "증가" : "감소"}`, "info", 0.4);
  
  renderStatusPanel(); // 상태창 즉시 갱신
}

document.getElementById('btn-to-game').onclick = () => {
    document.getElementById('screen-relation').classList.remove('active');
    document.getElementById('screen-game').classList.add('active');
    
    renderStatusPanel(); 
};

// 팝업 열기 함수
function openRelationModal(charId) {
    const char = characters.find(c => c.id === charId);
    if (!char) return;

    document.getElementById("modal-player-name").innerText = `${char.name}의 관계도`;
    const listContainer = document.getElementById("modal-relation-list");
    listContainer.innerHTML = "";

    // 다른 선수들과의 관계 확인
    characters.forEach(other => {
        if (char.id === other.id) return; // 자기 자신 제외

        const rel = char.relations[other.id] || { emotion: "none", stats: { affection: 0, tension: 0, dependence: 0 } };
        
        const relDiv = document.createElement("div");
        relDiv.className = "rel-item";
        relDiv.innerHTML = `
            <div style="font-weight:bold;">vs ${other.name} (${translateEmotion(rel.emotion)})</div>
            <div class="rel-stats-row">
                <span class="stat-badge">❤️ 호감: ${rel.stats.affection}</span>
                <span class="stat-badge">⚡ 긴장: ${rel.stats.tension}</span>
                <span class="stat-badge">🔗 집착: ${rel.stats.dependence}</span>
            </div>
        `;
        listContainer.appendChild(relDiv);
    });

    document.getElementById("relation-modal").style.display = "flex";
}

// 팝업 닫기 이벤트
document.getElementById("btn-close-modal").onclick = () => {
    document.getElementById("relation-modal").style.display = "none";
};

function renderStatusPanel() {
    const container = document.getElementById("character-status-list");
    if (!container) return;
    container.innerHTML = "";

    characters.forEach(c => {
        const card = document.createElement("div");
        card.className = "status-card";
        card.onclick = () => openRelationModal(c.id);

        card.innerHTML = `
            <div style="font-weight:bold; margin-bottom:5px;">${c.name} <span style="font-size:0.8em; color:#888;">${c.position}</span></div>
            <div style="font-size:0.85em;">멘탈: ${c.mental}</div>
            <div class="status-bar-bg"><div class="status-bar-fill" style="width:${c.mental}%; background:#4a90e2;"></div></div>
            <div style="font-size:0.85em;">에너지: ${c.energy}</div>
            <div class="status-bar-bg"><div class="status-bar-fill" style="width:${c.energy}%; background:#f5a623;"></div></div>
        `;
        container.appendChild(card);
    });
}
// [추가] 선수들의 정보를 화면에 생성하는 함수
function renderStatusPanel() {
    const container = document.getElementById("character-status-list");
    if (!container) return;
    container.innerHTML = ""; // 기존 내용 비우기

    characters.forEach(c => {
        const card = document.createElement("div");
        card.className = "status-card";
        // 클릭하면 팝업 열기 (팝업 함수는 이전 안내 참고)
        card.onclick = () => typeof openRelationModal === 'function' && openRelationModal(c.id);

        card.innerHTML = `
            <div style="font-weight:bold; margin-bottom:5px; border-bottom:1px solid #eee;">${c.name}</div>
            <div style="font-size:12px; color:#666;">멘탈: ${c.mental}%</div>
            <div style="background:#eee; height:5px; border-radius:3px; margin-bottom:5px;">
                <div style="background:#4a90e2; width:${c.mental}%; height:100%; border-radius:3px;"></div>
            </div>
            <div style="font-size:12px; color:#666;">에너지: ${c.energy}%</div>
            <div style="background:#eee; height:5px; border-radius:3px;">
                <div style="background:#f5a623; width:${c.energy}%; height:100%; border-radius:3px;"></div>
            </div>
        `;
        container.appendChild(card);
    });
}

// 1. 탭 전환 함수: 모바일에서 로그와 상태창을 완전히 교체
function switchTab(tabName) {
    const logSection = document.getElementById('log-section');
    const statusSection = document.getElementById('status-section');
    const logTab = document.getElementById('tab-log');
    const statusTab = document.getElementById('tab-status');

    if (tabName === 'log') {
        logSection.classList.add('active');
        statusSection.classList.remove('active');
        logTab.classList.add('active');
        statusTab.classList.remove('active');
    } else {
        logSection.classList.remove('active');
        statusSection.classList.add('active');
        logTab.classList.remove('active');
        statusTab.classList.add('active');
        renderStatusPanel(); // 상태창으로 갈 때 최신 데이터로 다시 그림
    }
    
    // 전환 시 스크롤을 맨 위로 초기화 (선택 사항)
    logSection.scrollTop = 0;
    statusSection.scrollTop = 0;
}

// 2. 초기 로드 시 모든 화면 끄고 인트로만 켜기
window.onload = () => {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-intro').classList.add('active');
};

// 3. 게임 시작 버튼 클릭 시 렌더링 호출 확인
document.getElementById('btn-to-game').onclick = () => {
    document.getElementById('screen-relation').classList.remove('active');
    document.getElementById('screen-game').classList.add('active');
    renderStatusPanel();
};