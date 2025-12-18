/* 화면 전환 */

const introScreen = document.getElementById("screen-intro");
const creationScreen = document.getElementById("screen-creation");

document.getElementById("btn-start").onclick = () => {
  introScreen.classList.remove("active");
  creationScreen.classList.add("active");
};

/* 캐릭터 데이터 */

const characters = [];

function createCharacter({ name, age, career, personality, married }) {
  return {
    id: crypto.randomUUID(),
    name,
    age,
    career,
    personality,
    married,
    mental: 100,
    status: "active",
    relations: {}
  };
}

/* 성격 태그 생성 */

const PERSONALITY_OPTIONS = [
  "차분함",
  "리더형",
  "의존적",
  "공격적",
  "냉소적",
  "헌신적"
];

const personalityContainer = document.getElementById("personality-tags");

PERSONALITY_OPTIONS.forEach(tag => {
  const btn = document.createElement("button");
  btn.className = "tag-btn";
  btn.textContent = tag;
  btn.onclick = () => {
    document.querySelectorAll(".tag-btn")
      .forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
  };
  personalityContainer.appendChild(btn);
});

function getSelectedPersonality() {
  const btn = document.querySelector(".tag-btn.selected");
  return btn ? btn.textContent : null;
}

/* 성격 보정 */

function personalityBias(player) {
  switch (player.personality) {
    case "차분함": return { tension: -1 };
    case "공격적": return { tension: +1 };
    case "헌신적": return { affection: +1 };
    case "냉소적": return { affection: -1 };
    case "의존적": return { dependence: +1 };
    default: return {};
  }
}

/* 캐릭터 생성 */

document.getElementById("btn-add-char").onclick = () => {
  const name = document.getElementById("input-name").value.trim();
  const age = parseInt(document.getElementById("input-age").value, 10);
  const career = parseInt(document.getElementById("input-career").value, 10);
  const married = document.getElementById("input-married").checked;
  const personality = getSelectedPersonality();

  if (!name || isNaN(age) || isNaN(career) || !personality) {
    alert("모든 항목을 입력하세요.");
    return;
  }

  characters.push(createCharacter({
    name, age, career, personality, married
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
      ${c.age}세 / ${c.career}년차<br>
      성격: ${c.personality}<br>
      ${c.married ? "기혼" : "미혼"}
      <button class="btn-delete">×</button>
    `;
    card.querySelector(".btn-delete").onclick = () => { 
      const idx = characters.findIndex(x => x.id === c.id); 
      characters.splice(idx, 1); 
      renderCharacterList(); 
    };

    listGrid.appendChild(card);
  });
}

function clearInputs() {
  document.getElementById("input-name").value = "";
  document.getElementById("input-age").value = "";
  document.getElementById("input-career").value = "";
  document.getElementById("input-married").checked = false;
  document.querySelectorAll(".tag-btn.selected")
    .forEach(b => b.classList.remove("selected"));
}

// 관계 설정
const EMOTION_PRESETS = {
  neutral:   { affection: 10, tension: 10 },
  interest:  { affection: 40, tension: 20 },
  dislike:   { affection: -20, tension: 50 },
  obsession: { affection: 60, tension: 40, dependence: 30 }
};

function determineContext(from, to) {
  return {
    teammate: true,
    seniorJunior: from.career > to.career ? "senior" :
                  from.career < to.career ? "junior" : null,
    rival: from.position && from.position === to.position,
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
    gameLogs.push({
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

  if (from.married && ["interest", "obsession", "unstable"].includes(emotion)) {
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
    headRow.innerHTML = `<th>From \\ To</th>`;

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

function dayTick() {
  console.log("=== dayTick 시작 ===", "currentDay=", currentDay);

  const dayForThisTick = currentDay;

  characters.forEach(player => {
    const entries = player.relations && typeof player.relations === "object"
      ? Object.entries(player.relations)
      : [];

    entries.forEach(([tid, relation]) => {
      try {
        if (!relation || typeof relation !== "object") return;

        relation.stats = relation.stats || { affection: 0, tension: 0, jealousy: 0, dependence: 0 };
        relation.logCount = relation.logCount || 0;

        const target = characters.find(c => c.id === tid) || { name: "알 수 없음" };

        let log = null;
        try { log = generateRelationLog(player, target, relation); }
        catch (innerErr) {
          console.error("generateRelationLog 예외:", innerErr, { player: player.name, targetId: tid });
          log = null;
        }

        if (log) {
          relation.logCount++;
          gameLogs.push({ day: dayForThisTick, text: log });
        } else {
          const fallback = subtleChangeLogs(player);
          gameLogs.push({ day: dayForThisTick, text: fallback });
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
    });
  });

  if (typeof renderTodayHeader === "function") {
    try { renderTodayHeader(dayForThisTick); }
    catch (e) { console.error("renderTodayHeader 오류:", e); }
  }

  currentDay++;

  console.log("=== dayTick 종료 ===", "nextDay=", currentDay);
}

/* 로그 생성 */

function generateRelationLog(player, target, relation) {
  const { emotion, stats, context } = relation;
  const intensity = stats.affection + stats.tension;

  // 금기 로그
  if (context.forbidden && stats.tension > 50 && Math.random() < 0.5) {
    return forbiddenHintLogs(player);
  }

  if (emotion === "unstable") return unstableLogs(player, target);
  if (emotion === "obsession") return obsessionLogs(player);
  if (emotion === "dislike" && stats.tension > 40) return dislikeLogs(player);
  if (emotion === "interest") return interestLogs(player, target, relation);
  if (intensity > 60 && Math.random() < 0.4) return generateNoiseLog(player); 

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
  gameLogs.forEach(entry => {
    const div = document.createElement("div");
    div.textContent = `[DAY ${entry.day}] ${entry.text}`;
    div.className = "log-entry";
    logContainer.appendChild(div);
  });
  logContainer.scrollTop = logContainer.scrollHeight;
}

const btnNextDayEl = document.getElementById("btn-next-day");
if (btnNextDayEl) {
  btnNextDayEl.addEventListener("click", () => {
    if (window.__dayTickLocked) {
      console.warn("dayTick 이미 실행 중 — 중복 호출 무시");
      return;
    }
    window.__dayTickLocked = true;

    try {
      try { dayTick(); } catch (e) { console.error("dayTick 오류:", e); }

      const dayEl = document.getElementById("day-display");
      if (dayEl) dayEl.textContent = "DAY " + currentDay;

      if (typeof checkForEvent === "function") {
        try {
          const ev = checkForEvent();
          if (ev && typeof triggerEvent === "function") {
            try { triggerEvent(ev); } catch (e) { console.error("triggerEvent 오류:", e); }
          }
        } catch (e) { console.error("checkForEvent 오류:", e); }
      }

      if (typeof renderLogs === "function") {
        try { renderLogs(); } catch (e) { console.error("renderLogs 오류:", e); }
      }
    } finally {
      setTimeout(() => { window.__dayTickLocked = false; }, 50);
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
