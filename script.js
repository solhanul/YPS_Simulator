/* 설정 및 상수 */
const CONSTANTS = {
    VISUAL_STEP_MS: 600,
    TICK_RELATION_DELAY: 650,
    TICK_PLAYER_DELAY: 900
};

const OPTIONS = {
    CAREER: { rookie: "신인", midLevel: "중참", experienced: "중고참", veteran: "베테랑" },
    POSITION: { pitcher: "투수", catcher: "포수", infielder: "내야수", outfielder: "외야수" },
    PERSONALITY: { calm: "차분함", leader: "리더형", dependent: "의존적", social: "사교적", sensitive: "신경적", kind: "다정함" }
};

const EMOTION_PRESETS = {
    neutral: { affection: 10, tension: 10 },
    interest: { affection: 40, tension: 20 },
    dislike: { affection: -20, tension: 0 },
    obsession: { affection: 60, tension: 40, dependence: 30 }
};

// 이벤트 대사 데이터
const SOCIAL_EVENTS = {
  rival: [
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

/* 전역 상태 */
const state = {
    characters: [],
    gameLogs: [],
    currentDay: 1,
    visualQueue: [],
    visualProcessing: false,
    showAllLogs: false,
    lastDay: null,
    dayTickLocked: false
};

// DOM 요소 캐싱
const DOM = {
    introScreen: document.getElementById("screen-intro"),
    creationScreen: document.getElementById("screen-creation"),
    relationScreen: document.getElementById("screen-relation"),
    gameScreen: document.getElementById("screen-game"),
    logArea: document.getElementById("log-area"),
    statusList: document.getElementById("character-status-list"),
    relationTable: document.getElementById("relation-table")
};

/* 유틸리티 함수 */
const Utils = {
    sleep: ms => new Promise(r => setTimeout(r, ms)),
    chance: p => Math.random() < p,
    randomFrom: arr => arr[Math.floor(Math.random() * arr.length)],
    
    // 성격에 따른 보정값 반환
    getPersonalityBias: (personality) => {
        switch (personality) {
            case 'calm': return { mental: 20, tension: -1 };
            case 'leader': return { mental: 30, affection: 3, tension: 1 };
            case 'dependent': return { mental: -10, jealousy: 3, dependence: 5 };
            case 'social': return { mental: 20, affection: 4 };
            case 'sensitive': return { mental: -10, tension: 2 };
            case 'kind': return { affection: 5 };
            default: return {};
        }
    },

    getCareerRank: (career) => {
        const ranks = { rookie: 1, midLevel: 2, experienced: 3, veteran: 4 };
        for (const [k, v] of Object.entries(OPTIONS.CAREER)) {
            if (v === career) return ranks[k];
        }
        return ranks[career] || 4;
    },

    translateEmotion: (key) => {
        const map = { interest: "호감", dislike: "혐오", obsession: "집착", neutral: "무관심" };
        return map[key] || "";
    },
    
    // 수치 제한
    clamp: (val, min, max) => Math.max(min, Math.min(max, val))
};

/* 데이터 조작 및 로직 */
const GameLogic = {
    createCharacter: ({ name, career, position, personality, married }) => {
        const char = {
            id: crypto.randomUUID(),
            name, career, position, personality, married,
            mental: 60,
            energy: 100,
            relations: {},
            careerRank: Utils.getCareerRank(career),
            active: true
        };

        // 생성 시 성격 보정치 즉시 적용 (초기 스탯 보정)
        const bias = Utils.getPersonalityBias(personality);
        if (bias.mental) char.mental = Utils.clamp(char.mental + bias.mental, 0, 100);

        return char;
    },

    removeCharacter: (id) => {
        state.characters.forEach(c => {
            if (c.relations[id]) delete c.relations[id];
        });
        const idx = state.characters.findIndex(c => c.id === id);
        if (idx >= 0) state.characters.splice(idx, 1);
    },

    // 관계 생성
    createRelation: (from, to, emotion) => {
        // 컨텍스트(선후배, 라이벌 등) 판별
        const fromAff = from.relations[to.id]?.stats?.affection || 0;
        const toAff = to.relations[from.id]?.stats?.affection || 0;
        
        const context = {
            seniorJunior: from.careerRank > to.careerRank ? "senior" : from.careerRank < to.careerRank ? "junior" : "mate",
            rival: (from.position === to.position && from.careerRank === to.careerRank && fromAff <= -10 && toAff <= -10),
            forbidden: false
        };

        const preset = EMOTION_PRESETS[emotion];
        const relation = {
            emotion,
            context,
            stats: { ...preset, jealousy: 0 },
            type: 'normal',
            logCount: 0
        };

        // 기혼자 금지된 관계 로직
        if (from.married && ["interest", "obsession"].includes(emotion)) {
            relation.context.forbidden = true;
            relation.stats.tension += 20;
        }
        return relation;
    },

    // 수치 조절 (멘탈)
    
    applyMental: async (char, delta) => {
        const bias = Utils.getPersonalityBias(char.personality);
        const resistance = (bias.mental || 0) / 100;

        let finalDelta = delta;
        if (delta < 0 && resistance > 0) finalDelta = delta * (1 - resistance * 0.5);
        if (delta > 0 && resistance > 0) finalDelta = delta * (1 + resistance * 0.5);

        // 정수화
        finalDelta = Math.round(finalDelta);
        char.mental = Utils.clamp(char.mental + finalDelta, 0, 100);

        if(finalDelta !== 0) {
            await GameLogger.logLine("", `${char.name}의 멘탈 ${Math.abs(finalDelta)} ${finalDelta > 0 ? "증가" : "감소"}`, "info", 0.4);
        }
        UIManager.renderStatusPanel();
    },

    applyEnergy: async (char, delta) => {
        delta = Math.round(delta);
        char.energy = Utils.clamp(char.energy + delta, 0, 100);
        UIManager.renderStatusPanel();
    },

    applyAffection: async (player, target, delta) => {
        if (!player || !target) return;

        if (!player.relations[target.id]) {
            player.relations[target.id] = GameLogic.createRelation(player, target, 'neutral');
        }

        const rel = player.relations[target.id];
        const prev = rel.stats.affection;

        // 정수화
        rel.stats.affection = Math.round(Utils.clamp(rel.stats.affection + delta, -50, 100));
        const change = rel.stats.affection - prev;

        // 쌍방향 데이터 보장 (상대방도 나에 대한 관계 엔트리 생성)
        if (!target.relations[player.id]) {
            target.relations[player.id] = GameLogic.createRelation(target, player, 'neutral');
        }

        await GameLogic.updateRelationType(player, target);
        UIManager.refreshUIIfOpen(player.id);
    },

    applyTension: async (player, target, delta) => {
        if (!player.relations[target.id]) return;
        const rel = player.relations[target.id];
        rel.stats.tension = Math.round(Utils.clamp(rel.stats.tension + delta, -50, 100));
        UIManager.refreshUIIfOpen(player.id);
    },

    applyObsession: async (player, target, delta) => {
        if (!player.relations[target.id]) return;
        const rel = player.relations[target.id];
        rel.stats.dependence = Math.round(Utils.clamp((rel.stats.dependence || 0) + delta, -50, 100));
        UIManager.refreshUIIfOpen(player.id);
    },

    // 관계 타입(연인 등) 판정
    updateRelationType: async (char1, char2) => {
        const rel1 = char1.relations[char2.id];
        const rel2 = char2.relations[char1.id];
        if (!rel1 || !rel2) return;

        const aff1 = rel1.stats.affection;
        const aff2 = rel2.stats.affection;

        // 연인 달성 (60이상)
        if (aff1 >= 60 && aff2 >= 60 && rel1.type !== 'lover') {
            rel1.type = 'lover'; rel2.type = 'lover';
            await GameLogger.logLine("❤️", `${char1.name}와 ${char2.name}가 연인이 되었습니다!`, "info", 1.0);
        }
        // 이별 (연인인데 40미만)
        else if (rel1.type === 'lover' && (aff1 < 40 || aff2 < 40)) {
            rel1.type = 'ex-lover'; rel2.type = 'ex-lover';
            await GameLogger.logLine("💔", `${char1.name}와 ${char2.name}가 헤어졌습니다.`, "warning", 1.0);
        }
        // 집착
        else if ((rel1.stats.dependence || 0) > 60 && rel1.type !== 'lover') {
            rel1.type = 'obsessed';
        }
    },

    // 일일 자연 감소/증가
    applyDailyDrift: (player) => {
        const bias = Utils.getPersonalityBias(player.personality);
        // 성격에 따라 매일 멘탈/수치 조금씩 변화
        if (bias.mental) {
            const drift = bias.mental > 0 ? 1 : -1;
            player.mental = Utils.clamp(player.mental + drift, 0, 100);
        }
        // 관계 수치 미세 조정은 여기서 제외하고 개별 관계 루프에서 처리
    }
};

/* 로그 시스템 */
const GameLogger = {
    // 로그 데이터 추가 및 시각 큐 처리
    write: async (entry) => {
        state.gameLogs.push(entry);
        state.visualQueue.push(entry);
        GameLogger.processQueue();
    },

    logLine: async (prefix, text, style = "system", delay = 0.6) => {
        await GameLogger.write({ day: state.currentDay, text: `${prefix} ${text}` });
        await Utils.sleep(Math.round(delay * 1000));
        DOM.logArea.scrollTop = DOM.logArea.scrollHeight;
    },

    // 큐에 쌓인 로그를 화면에 하나씩 출력
    processQueue: async () => {
        if (state.visualProcessing) return;
        state.visualProcessing = true;

        const area = DOM.logArea;
        while (state.visualQueue.length) {
            const entry = state.visualQueue.shift();
            
            const visibleDay = state.showAllLogs ? null : (state.lastDay !== null ? state.lastDay : state.currentDay);
            const shouldShow = state.showAllLogs || (entry.day === visibleDay || entry.day === state.currentDay);

            if (shouldShow && area) {
                const div = document.createElement("div");
                div.className = "log-entry";
                div.textContent = `[DAY ${entry.day}] ${entry.text}`;
                area.appendChild(div);
                area.scrollTop = area.scrollHeight;
                await Utils.sleep(CONSTANTS.VISUAL_STEP_MS);
            }
        }
        state.visualProcessing = false;
    }
};

/* 화면 렌더링 */
const UIManager = {
    // 버튼 태그 생성기
    createTags: (containerId, options, onClick) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.innerHTML = "";
        
        Object.entries(options).forEach(([key, label]) => {
            const btn = document.createElement("button");
            btn.className = "tag-btn";
            btn.textContent = label;
            btn.dataset.key = key;
            btn.onclick = () => {
                container.querySelectorAll(".tag-btn").forEach(b => b.classList.remove("selected"));
                btn.classList.add("selected");
                if (onClick) onClick(key);
            };
            container.appendChild(btn);
        });
    },

    getSelectedTag: (containerId) => {
        const btn = document.querySelector(`#${containerId} .tag-btn.selected`);
        return btn ? (btn.dataset.key || btn.textContent) : null; // dataset.key 우선
    },

    // 캐릭터 생성 리스트
    renderCharacterList: () => {
        const list = document.getElementById("char-list");
        list.innerHTML = "";
        state.characters.forEach(c => {
            const card = document.createElement("div");
            card.className = "mini-card";
            card.innerHTML = `
                <strong>${c.name}</strong> (${c.married ? '기혼' : '미혼'})<br>
                ${OPTIONS.CAREER[c.career]} / ${OPTIONS.POSITION[c.position]} / ${OPTIONS.PERSONALITY[c.personality]}
                <button class="btn-delete">×</button>
            `;
            card.querySelector(".btn-delete").onclick = () => {
                GameLogic.removeCharacter(c.id);
                UIManager.refreshAll();
            };
            list.appendChild(card);
        });
    },

    // 관계 설정 드롭다운 갱신
    refreshRelationSelectors: () => {
        const from = document.getElementById("select-from");
        const to = document.getElementById("select-to");
        from.innerHTML = ""; to.innerHTML = "";

        state.characters.forEach(c => {
            from.add(new Option(c.name, c.id));
            to.add(new Option(c.name, c.id));
        });
    },

    // 관계 테이블 렌더링
    renderRelationTable: () => {
        const table = DOM.relationTable;
        table.innerHTML = "";
        if (state.characters.length === 0) return;

        // Header
        const thead = table.createTHead();
        const row = thead.insertRow();
        row.insertCell().textContent = "주체 \\ 대상";
        state.characters.forEach(c => row.insertCell().textContent = c.name);

        // Body
        const tbody = table.createTBody();
        state.characters.forEach(from => {
            const tr = tbody.insertRow();
            const th = document.createElement("th");
            th.textContent = from.name;
            tr.appendChild(th);

            state.characters.forEach(to => {
                const td = tr.insertCell();
                if (from.id === to.id) {
                    td.className = "self-cell";
                    td.textContent = "—";
                } else {
                    const rel = from.relations[to.id];
                    if (rel) {
                        td.textContent = Utils.translateEmotion(rel.emotion);
                        td.className = `emotion-${rel.emotion}`;
                    }
                }
            });
        });
    },

    // 게임 화면: 선수 상태창
    renderStatusPanel: () => {
        const list = DOM.statusList;
        if (!list) return;
        list.innerHTML = "";

        state.characters.forEach(c => {
            const div = document.createElement("div");
            div.className = "status-card";
            div.style.cursor = "pointer";
            div.onclick = () => UIManager.openRelationModal(c.id);

            div.innerHTML = `
                <div style="font-weight:bold; font-size:1.1em; margin-bottom:4px;">${c.name}</div>
                <div style="font-size:0.8em; color:#666; margin-bottom:8px;">
                   ${c.position} / ${c.career} ${c.married ? '(기혼)' : ''}
                </div>
                <div style="font-size:0.8em;">멘탈 (${c.mental}%)</div>
                <div class="bar-container"><div class="bar-fill" style="width:${c.mental}%; background:#4a90e2;"></div></div>
                <div style="font-size:0.8em;">에너지 (${c.energy}%)</div>
                <div class="bar-container"><div class="bar-fill" style="width:${c.energy}%; background:#f5a623;"></div></div>
            `;
            list.appendChild(div);
        });
    },

    // 게임 화면: 로그 전체보기
    renderLogs: () => {
        DOM.logArea.innerHTML = "";
        // showAllLogs에 따라 필터링
        const visibleDay = state.showAllLogs ? null : (state.lastDay ?? state.currentDay);
        
        state.gameLogs.forEach(entry => {
            if (visibleDay === null || entry.day === visibleDay || entry.day === state.currentDay) {
                const div = document.createElement("div");
                div.className = "log-entry";
                div.textContent = `[DAY ${entry.day}] ${entry.text}`;
                DOM.logArea.appendChild(div);
            }
        });
        DOM.logArea.scrollTop = DOM.logArea.scrollHeight;
    },

    // 팝업 모달
    openRelationModal: (charId) => {
        const char = state.characters.find(c => c.id === charId);
        if (!char) return;

        const modal = document.getElementById("relation-modal");
        const list = document.getElementById("modal-relation-list");
        document.getElementById("modal-player-name").innerText = `${char.name}의 관계도`;
        list.innerHTML = "";

        Object.entries(char.relations).forEach(([targetId, rel]) => {
            const target = state.characters.find(c => c.id === targetId);
            if (!target) return;

            let typeIcon = "👥", typeLabel = "일반", labelClass = "";
            if (rel.type === 'lover') { typeIcon = "❤️"; typeLabel = "연인"; labelClass = "label-lover"; }
            else if (rel.type === 'ex-lover') { typeIcon = "🥀"; typeLabel = "전 연인"; }
            else if ((rel.stats.dependence || 0) > 50) { typeIcon = "⛓️"; typeLabel = "집착"; }

            const item = document.createElement("div");
            item.className = "rel-item";
            item.innerHTML = `
                <div style="font-weight:bold; display:flex; align-items:center; gap:5px;">
                    <span>${typeIcon}</span> <span>vs ${target.name}</span>
                    <span class="type-tag ${labelClass}">${typeLabel}</span>
                </div>
                <div class="rel-stats-row">
                    <span class="stat-badge">❤️ 애정 ${rel.stats.affection}</span>
                    <span class="stat-badge">⚡ 긴장 ${rel.stats.tension}</span>
                    <span class="stat-badge">⛓️ 집착 ${rel.stats.dependence || 0}</span>
                </div>
            `;
            list.appendChild(item);
        });
        modal.style.display = "flex";
    },

    // 탭 전환 (모바일)
    switchTab: (tabName) => {
        const isLog = tabName === 'log';
        document.getElementById('log-section').classList.toggle('active', isLog);
        document.getElementById('status-section').classList.toggle('active', !isLog);
        document.getElementById('tab-log').classList.toggle('active', isLog);
        document.getElementById('tab-status').classList.toggle('active', !isLog);
        if (!isLog) UIManager.renderStatusPanel();
    },

    // 헬퍼: 데이터 변경 시 전체 UI 갱신
    refreshAll: () => {
        UIManager.renderCharacterList();
        UIManager.refreshRelationSelectors();
        UIManager.renderRelationTable();
        UIManager.renderStatusPanel();
    },

    refreshUIIfOpen: (playerId) => {
        UIManager.renderStatusPanel();
        // 모달 갱신 로직 생략 (필요시 추가)
    },
    
    // 선택지 모달 (Promise 기반)
    askChoice: (opts) => {
        return new Promise(resolve => {
            const existing = document.getElementById("askChoice-modal");
            if (existing) existing.remove();

            const wrap = document.createElement("div");
            wrap.id = "askChoice-modal";
            Object.assign(wrap.style, { position:"fixed", inset:0, display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 });

            const bg = document.createElement("div");
            Object.assign(bg.style, { position:"absolute", inset:0, background:"rgba(0,0,0,0.45)" });
            
            const box = document.createElement("div");
            Object.assign(box.style, { background:"#fff", padding:"18px", borderRadius:"8px", minWidth:"300px", maxWidth:"90%", zIndex:1 });
            box.innerHTML = `<div style="font-weight:700;margin-bottom:8px;">${opts.title || "선택"}</div><div style="margin-bottom:12px;">${opts.body || ""}</div>`;

            const btnRow = document.createElement("div");
            btnRow.style.cssText = "display:flex;gap:8px;justify-content:flex-end;";

            (opts.options || []).forEach(o => {
                const btn = document.createElement("button");
                btn.textContent = o.label || o.value;
                btn.onclick = () => { wrap.remove(); resolve(o.value); };
                btnRow.appendChild(btn);
            });

            box.appendChild(btnRow);
            wrap.appendChild(bg);
            wrap.appendChild(box);
            document.body.appendChild(wrap);
        });
    }
};

/* 이벤트 */
const GameEvents = {
    // 소셜 이벤트 (대화 등)
    trySocialEvent: async (player, target, relation) => {
        if (!relation || !relation.context) return null;
        
        const hierarchy = relation.context.seniorJunior || "mate"; 
        
        let pool = [];

        // 1. 기혼자 금지된 사랑 (forbidden)
        // 조건: 둘 중 하나라도 기혼자이면서 호감이 높거나 'obsession' 상태일 때
        const isForbidden = (player.married || target.married) && 
                            (relation.stats.affection > 30 || relation.type === 'obsessed');
        
        if (isForbidden && SOCIAL_EVENTS.forbidden) {
            const contextEvents = SOCIAL_EVENTS.forbidden[hierarchy]; // junior, senior, mate
            if (contextEvents) {
                // 주체가 기혼이면 marriedA, 타겟이 기혼이면 marriedB
                // 둘 다 기혼이면 marriedA 우선 (임의 설정)
                if (player.married && contextEvents.marriedA) {
                    pool = contextEvents.marriedA;
                } else if (target.married && contextEvents.marriedB) {
                    pool = contextEvents.marriedB;
                }
            }
        }
        
        // 2. 연인 (love)
        if (pool.length === 0 && relation.type === 'lover' && SOCIAL_EVENTS.love) {
            pool = SOCIAL_EVENTS.love[hierarchy];
        }

        // 3. 라이벌 (rival) - 라이벌 관계이고 사이가 나쁠 때
        if (pool.length === 0 && relation.context.rival && relation.stats.affection < 0) {
             pool = SOCIAL_EVENTS.rival;
        }

        // 4. 일반/호감 (comfort) - 기본적으로 대화 시도
        if (pool.length === 0 && SOCIAL_EVENTS.comfort) {
            pool = SOCIAL_EVENTS.comfort[hierarchy];
        }

        // 풀이 비어있으면 종료
        if (!pool || pool.length === 0) return null;

        // 대화 선택 및 변환
        const tpl = Utils.randomFrom(pool);
        if (!tpl) return null;

        // {a}, {b} 치환
        const line = tpl.map(s => s.replace('{a}', player.name).replace('{b}', target.name)).join('<br>');
        
        // 대화 효과 적용 (간단하게)
        if (isForbidden) await GameLogic.applyTension(player, target, 10);
        else if (relation.type === 'lover') await GameLogic.applyAffection(player, target, 5);

        return null; 
    },

    // SNS 이벤트
    eventSNS: async (c) => {
        if (!Utils.chance(0.10)) return;
        try {
            await GameLogger.logLine(">>", `${c.name}에게 SNS 디엠이 왔다`, "warning", 0.55);
            const ans = await UIManager.askChoice({
                title: "[SNS]",
                body: `${c.name}, 디엠에 답을 하시겠습니까?`,
                options: [{ label: "대답한다", value: "enter" }, { label: "무시한다", value: "ignore" }]
            });

            if (ans === "ignore") {
                await GameLogger.logLine(">>", `[SYSTEM] ${c.name}은(는) 디엠에 답을 하지 않았다.`, "warning", 0.75);
                await GameLogic.applyMental(c, -5);
            } else {
                // 성공/실패 랜덤
                if (Utils.chance(0.5)) {
                    await GameLogger.logLine(">>", ` ${c.name}이 한 아이의 디엠을 받았습니다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `아이에게 보낸 디엠이 퍼져 미담으로 번졌습니다`, "warning", 0.85);
                    await GameLogic.applyMental(c, 10);
                } else {
                    await GameLogger.logLine(">>", `화난 팬의 디엠을 받았습니다`, "warning", 0.75);
                    await GameLogger.logLine(">>", ` ${c.name}의 디엠의 답이 논란이 되어 부정적인 여론이 돕니다.`, "warning", 0.85);
                    await GameLogic.applyMental(c, -15);
                    await GameLogic.applyEnergy(c, -15);
                }
            }
        } catch (e) { console.error(e); }
    },

    // 투수 강습타구
    eventHardHitBall: async(c) => {      
        if (c.position !== '투수') return;
        if (!chance(0.10)) return;

        try {
            await GameLogger.logLine("⚾", ` ${c.name}에게 강습타구가 날라온다`, "warning", 0.55);

            const ans = await UIManager.askChoice({
              title: "[CHOICE]",
              body: ` ${c.name}, 강습타구를 잡으시겠습니까?`,
              options: [{ label: "잡는다", value: "catch" },{ label: "피한다", value: "ignore" },]
            });

            if (ans === "ignore") {
              await GameLogger.logLine(">>", `[SYSTEM] ${c.name}은(는) 점수를 주고 말았다.`, "warning",  0.75);
              await GameLogic.applyMental(c, -5);
            } else {
                // 성공/실패 랜덤
                if (!chance(0.50)) {
                    await GameLogger.logLine(">>", `강습타구를 제대로 잡아 1루로 송구하였습니다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `병살을 잡아 이닝이 종료되었습니다`, "warning", 0.85);
                    await GameLogic.applyMental(c, +10);
              } else {
                    await GameLogger.logLine(">>", ` ${c.name}이(가) 강습타구에 맞았습니다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `부상으로 다음 등판이 밀리게 되었습니다.`, "warning", 0.85);
                    await GameLogic.applyMental(c, -10);
                    await GameLogic.applyEnergy(c, -20);
                }
            }
        } catch (e) { console.error(e); }
    },

    // 내야수 실책
    eventInfielderError: async(c) => {      
        if (c.position !== '내야수') return;
        if (!chance(0.10)) return;

        try {
            await GameLogger.logLine("⚾", `옆 수비수와 ${c.name} 사이에 공이 굴러온다`, "warning", 0.55);

            const ans = await UIManager.askChoice({
              title: "[CHOICE]",
              body: ` ${c.name}, 공을 잡으시겠습니까?`,
              options: [{ label: "잡는다", value: "catch" },{ label: "피한다", value: "ignore" },]
            });

            if (ans === "ignore") {
                // 성공/실패 랜덤
                if (!chance(0.50)) {
                    await GameLogger.logLine(">>", `[SYSTEM] ${c.name}은(는) 점수를 주고 말았다.`, "warning", 0.75);       
                    await GameLogic.applyMental(c, -5);

              } else {
                    await GameLogger.logLine(">>", `옆 수비수가 공을 잡아 주자를 잡았습니다`, "warning", 0.75);
                    await GameLogic.applyMental(c, +3);
                }
            } else {
                // 성공/실패 랜덤
                if (!chance(0.50)) {
                    await GameLogger.logLine(">>", `${c.name}이(가) 공을 제대로 잡아 2루로 송구했다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `병살을 잡아 이닝이 종료되었습니다`, "warning", 0.85);
                    await GameLogic.applyMental(c, +10);
              } else {
                    await GameLogger.logLine(">>", `${c.name}와(과) 옆 수비수와 겹쳐 둘 다 공을 놓쳤다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `그 사이 주자가 홈으로 들어왔습니다.`, "warning", 0.85);
                    await GameLogic.applyMental(c, -10);
                }
            }
        } catch (e) { console.error(e); }
    },
    
    // 외야수 실책
    eventOutfielderError: async(c) => {      
        if (c.position !== '외야수') return;
        if (!chance(0.10)) return;

        try {
            await GameLogger.logLine("⚾", `옆 수비수와 ${c.name} 사이에 공이 날라온다`, "warning", 0.55);

            const ans = await UIManager.askChoice({
              title: "[CHOICE]",
              body: ` ${c.name}, 공을 잡으시겠습니까?`,
              options: [{ label: "잡는다", value: "catch" },{ label: "피한다", value: "ignore" },]
            });

            if (ans === "ignore") {
                // 성공/실패 랜덤
                if (!chance(0.50)) {
                    await GameLogger.logLine(">>", `[SYSTEM] ${c.name}은(는) 점수를 주고 말았다.`, "warning", 0.75);       
                    await GameLogic.applyMental(c, -5);

              } else {
                    await GameLogger.logLine(">>", `옆 수비수가 공을 잡아 뜬공 처리를 했습니다`, "warning", 0.75);
                    await GameLogic.applyMental(c, +3);
                }
            } else {
                // 성공/실패 랜덤
                if (!chance(0.50)) {
                    await GameLogger.logLine(">>", `${c.name}이(가) 공을 제대로 잡아 1루로 송구했다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `병살을 잡아 이닝이 종료되었습니다`, "warning", 0.85);
                    await GameLogic.applyMental(c, +10);
              } else {
                    await GameLogger.logLine(">>", `${c.name}와(과) 옆 수비수와 겹쳐 둘 다 공을 놓쳤다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `그 사이 주자가 홈으로 들어왔습니다.`, "warning", 0.85);
                    await GameLogic.applyMental(c, -10);
                }
            }
        } catch (e) { console.error(e); }
    },

    // 포수: 주자선택
    eventCatcherSChoice: async(c) => {      
        if (c.position !== '포수') return;
        if (!chance(0.10)) return;

        try {
            await GameLogger.logLine("⚾", `${c.name}이(가) 번트 타구를 잡았다`, "warning", 0.55);

            const ans = await UIManager.askChoice({
              title: "[CHOICE]",
              body: ` ${c.name}, 어디로 던지겠습니까?`,
              options: [{ label: "1루", value: "onebase" },{ label: "3루", value: "threebase" },]
            });

            if (ans === "threebase") {
                // 성공/실패 랜덤
                if (!chance(0.30)) {
                    await GameLogger.logLine(">>", `[SYSTEM] ${c.name}은(는) 주자를 전부 살려 버렸다.`, "warning", 0.75);       
                    await GameLogic.applyMental(c, -5);

              } else {
                    await GameLogger.logLine(">>", `3루로 가던 주자를 아웃시켰다.`, "warning", 0.75);
                    await GameLogic.applyMental(c, +5);
                }
            } else {
                // 성공/실패 랜덤
                if (!chance(0.50)) {
                    await GameLogger.logLine(">>", `${c.name}은(는) 공을 제대로 잡아 1루로 송구했다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `1루 주자를 아웃시켰습니다. 3루는 세이프`, "warning", 0.85);
                    await GameLogic.applyMental(c, +3);
              } else {
                    await GameLogger.logLine(">>", `1루에 송구 미스가 났다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `그 사이 주자가 홈으로 들어왔습니다.`, "warning", 0.85);
                    await GameLogic.applyMental(c, -10);
                }
            }
        } catch (e) { console.error(e); }
    },

    // 내야수: 만루 선택
    eventInfielderSChoice: async(c) => {      
        if (c.position !== '내야수') return;
        if (!chance(0.10)) return;

        try {
            await GameLogger.logLine("⚾", `만루 상황에 공이 ${c.name} 앞으로 굴러온다`, "warning", 0.55);

            const ans = await UIManager.askChoice({
              title: "[CHOICE]",
              body: ` ${c.name}, 어디로 던지겠습니까?`,
              options: [{ label: "2루", value: "twobase" }, { label: "홈", value: "home" },]
            });

            if (ans === "home") {
                // 성공/실패 랜덤
                if (!chance(0.30)) {
                    await GameLogger.logLine(">>", `[SYSTEM] 송구 미스로 ${c.name}은(는) 점수를 주고 말았다.`, "warning", 0.75);       
                    await GameLogic.applyMental(c, -10);

              } else {
                    await GameLogger.logLine(">>", `홈승부가 성공해 실점없이 아웃카운트를 잡았다.`, "warning", 0.75);
                    await GameLogic.applyMental(c, +8);
                }
            } else {
                // 성공/실패 랜덤
                if (!chance(0.50)) {
                    await GameLogger.logLine(">>", `${c.name}은(는) 공을 제대로 잡아 2루로 송구했다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `병살을 잡아 이닝이 종료되었습니다`, "warning", 0.85);
                    await GameLogic.applyMental(c, +10);
              } else {
                    await GameLogger.logLine(">>", `${c.name}은(는) 2루 주자만 아웃시켰다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `그 사이 주자가 홈으로 들어왔습니다.`, "warning", 0.85);
                    await GameLogic.applyMental(c, -3);
                }
            }
        } catch (e) { console.error(e); }
    },

    // 외야수: 만루 선택
    eventOutfielderSChoice: async(c) => {      
        if (c.position !== '외야수') return;
        if (!chance(0.10)) return;

        try {
            await GameLogger.logLine("⚾", `만루 상황에 공이 ${c.name} 앞으로 날라온다`, "warning", 0.55);

            const ans = await UIManager.askChoice({
              title: "[CHOICE]",
              body: ` ${c.name}, 어디로 던지겠습니까?`,
              options: [{ label: "3루", value: "threebase" }, { label: "홈", value: "home" },]
            });

            if (ans === "home") {
                // 성공/실패 랜덤
                if (!chance(0.30)) {
                    await GameLogger.logLine(">>", `[SYSTEM] 송구 미스로 ${c.name}은(는) 2점을 주고 말았다.`, "warning", 0.75);       
                    await GameLogic.applyMental(c, -10);

              } else {
                    await GameLogger.logLine(">>", `홈승부가 성공해 실점없이 아웃카운트 두개를 잡았다.`, "warning", 0.75);
                    await GameLogic.applyMental(c, +10);
                }
            } else {
                // 성공/실패 랜덤
                if (!chance(0.50)) {
                    await GameLogger.logLine(">>", `${c.name}은(는) 공을 제대로 잡아 3루로 송구했다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `타자 아웃 후 3루 주자가 득점에 성공했지만 추간 진루는 막았습니다`, "warning", 0.85);
                    await GameLogic.applyMental(c, +3);
              } else {
                    await GameLogger.logLine(">>", `3루로 간 공이 빠졌다`, "warning", 0.75);
                    await GameLogger.logLine(">>", `그 사이 주자 두 명이 홈으로 들어왔습니다.`, "warning", 0.85);
                    await GameLogic.applyMental(c, -5);
                }
            }
        } catch (e) { console.error(e); }
    },

    eventConfessionMoment: async (c) => {
        const candidates = characters.filter(target =>
            c.id !== target.id && (c.relations[target.id]?.stats.affection >= 60)
        );
        if (candidates.length === 0 || !chance(0.15)) return;

        const target = randomFrom(candidates);

        try {
            await GameLogger.logLine("💌", `${c.name}의 심장이 평소보다 빠르게 뜁니다. ${target.name}에게 할 말이 있는 것 같습니다.`, "info", 0.7);

            const ans = await UIManager.askChoice({
                title: "[개인 이벤트: 고백]",
                body: `${target.name}에게 오늘 밤 만나자고 할까요?`,
                options: [
                    { label: "직진! 고백한다", value: "propose" },
                    { label: "아직은 때가 아니다", value: "wait" },
                ],
            });

            if (ans === "propose") {
                const targetAff = target.relations[c.id]?.stats.affection || 0;

                if (targetAff >= 50 && !chance(0.5)) {
                    await GameLogger.logLine("❤️", `[SUCCESS] ${target.name}이 고개를 끄덕였다`, "info", 1.0);
                    await GameLogic.applyAffection(c, target, 30);
                    await GameLogic.applyAffection(target, c, 30);
                } else {
                    await GameLogger.logLine("💔", `[FAIL] ${target.name}은 조용히 거절했다`, "warning", 1.0);
                    await GameLogic.applyAffection(c, target, -10);
                    await GameLogic.applyMental(c, -10);
                }
            } else {
                await GameLogger.logLine("...", `${c.name}은 말을 삼켰다`, "default", 0.5);
                await GameLogic.applyTension(c, target, 5);
            }
        } catch (e) { console.error(e); }
    },


    eventCafe: async (c) => {
        const candidates = characters.filter(target =>
            c.id !== target.id && (c.relations[target.id]?.stats.affection >= 0)
        );
        if (candidates.length === 0 || !chance(0.15)) return;

        const target = randomFrom(candidates);

        try {
            await GameLogger.logLine(
                "☕",
                `${c.name}이 ${target.name}을 힐끔 본다`,
                "info",
                0.7
            );

            const ans = await UIManager.askChoice({
                title: "[개인 이벤트: 데이트]",
                body: `${target.name}에게 경기 후 카페에 가자고 할까요?`,
                options: [
                    { label: "카페에 가자", value: "propose" },
                    { label: "그만둔다", value: "wait" },
                ],
            });

            if (ans === "propose" && !chance(0.4)) {
                await GameLogger.logLine("❤️", `${target.name}이 고개를 끄덕였다`, "info", 1.0);
                await GameLogic.applyAffection(c, target, 20);
                await GameLogic.applyAffection(target, c, 20);
            } else if (ans === "propose") {
                await GameLogger.logLine("💔", `${target.name}이 난처한 표정을 지었다`, "warning", 1.0);
                await GameLogic.applyAffection(c, target, -5);
                await GameLogic.applyMental(c, -5);
            } else {
                await GameLogger.logLine("...", `${c.name}은 아무 말도 하지 않았다`, "default", 0.5);
                await GameLogic.applyTension(c, target, 5);
            }
        } catch (e) { console.error(e); }
    },

    eventJealousyClash: async (c) => {
        const jealousChar = characters.find(other =>
            other.id !== c.id &&
            (other.relations[c.id]?.type === "lover" ||
            other.relations[c.id]?.stats.affection >= 50)
        );
        if (!jealousChar || !chance(0.2)) return;

        try {
            await GameLogger.logLine(
                "👁️",
                `${jealousChar.name}이 차가운 눈빛으로 ${c.name}을 바라본다`,
                "warning",
                0.7
            );

            const ans = await UIManager.askChoice({
                title: "[개인 이벤트: 질투]",
                body: `${jealousChar.name}: "아까 누구랑 있었어?"`,
                options: [
                    { label: "달래준다", value: "soothe" },
                    { label: "무시한다", value: "ignore" },
                ],
            });

            if (ans === "soothe") {
                await GameLogger.logLine(">>", `${jealousChar.name}의 표정이 조금 누그러졌다`, "info", 0.6);
                await GameLogic.applyAffection(jealousChar, c, 5);
                await GameLogic.applyTension(jealousChar, c, -15);
            } else {
                await GameLogger.logLine(">>", `공기가 싸늘해졌다`, "warning", 0.8);
                await GameLogic.applyAffection(jealousChar, c, -10);
                await GameLogic.applyTension(jealousChar, c, 15);
            }
        } catch (e) { console.error(e); }
    },


};

/* 메인 루프 */
async function dayTick() {
    console.log(`=== DAY ${state.currentDay} START ===`);
    const day = state.currentDay;

    for (const player of state.characters) {
        if (!player.active) continue;

        // 1. 개인별 일일 자연 변화 (한 번만 실행)
        GameLogic.applyDailyDrift(player);

        // 2. 관계 상호작용
        for (const [tid, relation] of Object.entries(player.relations)) {
            const target = state.characters.find(c => c.id === tid);
            if (!target) continue;

            // 대화 이벤트 발생 (확률 40%)
            if (Utils.chance(0.40)) {
                const talkLine = await GameEvents.trySocialEvent(player, target, relation);
                if (talkLine) {
                    await GameLogger.write({ day, text: talkLine });
                }
            }

            // 미세 감정 변화 (정수화)
            const drift = Math.round(Math.random() * 2 - 1); 
            if(drift !== 0) {
                 relation.stats.affection = Utils.clamp(relation.stats.affection + drift, -50, 100);
            }
            await Utils.sleep(CONSTANTS.TICK_RELATION_DELAY);
        }

        // 3. 개인 이벤트 (SNS, 야구 이벤트 등)
        await GameEvents.eventConfessionMoment(player);
        await GameEvents.eventSNS(player);
        await GameEvents.eventCafe(player);
        await GameEvents.eventJealousyClash(player);
        await GameEvents.eventHardHitBall(player);
        await GameEvents.eventCatcherSChoice(player);
        await GameEvents.eventOutfielderError(player);
        await GameEvents.eventInfielderError(player);
        await GameEvents.eventInfielderSChoice(player);
        await GameEvents.eventOutfielderSChoice(player);

        await Utils.sleep(CONSTANTS.TICK_PLAYER_DELAY);
    }
    
    console.log(`=== DAY ${day} END ===`);
}


/* 초기화 및 이벤트 리스너 */
function setupEventListeners() {
    // 1. 화면 전환
    document.getElementById("btn-start").onclick = () => {
        DOM.introScreen.classList.remove("active");
        DOM.creationScreen.classList.add("active");
    };
    
    document.getElementById("btn-to-relation").onclick = () => {
        DOM.creationScreen.classList.remove("active");
        DOM.relationScreen.classList.add("active");
        UIManager.refreshRelationSelectors();
    };

    document.getElementById("btn-to-game").onclick = () => {
        DOM.relationScreen.classList.remove("active");
        DOM.gameScreen.classList.add("active");
        UIManager.renderStatusPanel();
    };

    // 2. 캐릭터 생성 화면
    UIManager.createTags("career-tags", OPTIONS.CAREER);
    UIManager.createTags("position-tags", OPTIONS.POSITION);
    UIManager.createTags("personality-tags", OPTIONS.PERSONALITY);

    document.getElementById("btn-add-char").onclick = () => {
        const name = document.getElementById("input-name").value.trim();
        const career = UIManager.getSelectedTag("career-tags"); // 텍스트 반환됨 (예: "신인")
        const position = UIManager.getSelectedTag("position-tags");
        const personality = UIManager.getSelectedTag("personality-tags"); // 키 반환됨 (예: "calm")
        const married = document.getElementById("input-married").checked;

        if (!name || !career || !position || !personality) return alert("모든 항목을 입력하세요.");

        state.characters.push(GameLogic.createCharacter({ name, career, position, personality, married }));
        
        // 입력 초기화 및 UI 갱신
        document.getElementById("input-name").value = "";
        UIManager.refreshAll();
    };

    // 3. 관계 설정 화면
    let selectedEmotion = null;
    document.querySelectorAll(".emotion-btn").forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll(".emotion-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            selectedEmotion = btn.dataset.emotion;
        };
    });

    document.getElementById("btn-set-relation").onclick = () => {
        const fromId = document.getElementById("select-from").value;
        const toId = document.getElementById("select-to").value;
        if (!fromId || !toId || fromId === toId || !selectedEmotion) return alert("설정 오류");

        const from = state.characters.find(c => c.id === fromId);
        const to = state.characters.find(c => c.id === toId);
        
        from.relations[toId] = GameLogic.createRelation(from, to, selectedEmotion);
        GameLogger.write({ day: state.currentDay, text: `${from.name} -> ${to.name} 관계 설정됨.` });
        UIManager.renderRelationTable();
    };

    // 4. 게임 화면
    document.getElementById("btn-next-day").onclick = async () => {
        if (state.dayTickLocked) return;
        state.dayTickLocked = true;
        
        try {
            state.currentDay++;
            state.lastDay = state.currentDay;
            document.getElementById("day-display-static").textContent = "DAY " + state.currentDay;
            
            // 새 날짜 헤더 표시
            const logArea = DOM.logArea;
            logArea.innerHTML = ""; // 데일리 뷰라면 초기화
            
            await dayTick();
        } catch (e) { console.error(e); }
        finally { state.dayTickLocked = false; }
    };

    document.getElementById("btn-show-all-logs").onclick = () => {
        state.showAllLogs = !state.showAllLogs;
        UIManager.renderLogs();
    };

    // 탭 전환 등 기타
    document.getElementById("btn-close-modal").onclick = () => document.getElementById("relation-modal").style.display = "none";
    
    // 전역 함수 연결 (HTML onclick 대응)
    window.switchTab = UIManager.switchTab;
    window.exportLogsAsTXT = () => { /* 원본 유지 */ };
}

// 실행
window.onload = () => {
    // 모든 스크린 숨기고 인트로만
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    DOM.introScreen.classList.add("active");
    setupEventListeners();
};