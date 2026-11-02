# Player Ratings (3D) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Contextual per-player match ratings (1.0–10.0) computed inside the 3D simulator from events and tactical samples, shown on the result screen and stored per fixture.

**Architecture:** Two classic scripts under `simulador3d/js/ratings/`: `notas_config.js` (data only) and `notas_motor.js` (pure logic, no THREE/DOM, also `require`-able from Node tests). The engine is fed by (a) the existing `Eventos.aoRegistar` listener (goals, shots, saves, fouls, cards, penalties), (b) a few thin hooks for tackles/interceptions/passes/duels/substitutions, (c) a tactical sampler every ~5 game-seconds. `Ponte.resultado()` ships notes + details to the manager.

**Tech Stack:** Plain JS (classic scripts, `"type": "commonjs"`), `node --test`, headless harness `tools/headless/harness.js`, manager in TS/React (`types.ts`, `GameContext.tsx`).

Spec: `docs/superpowers/specs/2026-11-02-player-ratings-design.md`

## Global Constraints

- Scale 1.0–10.0, one decimal; neutral reference 6.0.
- Component weights: tático 35%, técnico 30%, participação 25%, disciplina 10% (positions may override).
- Final rating = `1 + 9 × (weighted score / 100)`, clamped to 1.0–10.0.
- Initial event impacts from the spec table (gol +0.80, assistência +0.50, passe decisivo +0.12, remate no gol +0.08, remate fora −0.03, grande chance perdida −0.20, desarme +0.10, interceptação +0.08, erro→remate −0.20, erro→gol −0.60, amarelo −0.15, vermelho −0.80, pênalti cometido −0.40).
- Do NOT change player movement/positioning/simulation logic; hooks only read state and call `typeof Notas... !== 'undefined'`-guarded functions (house style, see `stats.js`).
- No heavy per-frame work: sampler every ~5 game-seconds, reuse already computed data.
- Keep `fixture.playerRatings: Record<id, number>`; new fields optional (old saves valid).
- Text simulator (`calculateMatchRatings`) is out of scope.
- Code comments in Portuguese, matching the codebase.
- All paths below are relative to `Football Manager/3dMatch/simulador3d/` unless prefixed with `manager:` (= `Football Manager/`).
- Run tests from `Football Manager/3dMatch/simulador3d/` with `node --test tests/<file>`.

## File Structure

- Create `js/ratings/notas_config.js` — all tunable data.
- Create `js/ratings/notas_motor.js` — engine (`NotasMotor`).
- Create `js/ratings/notas_ligacao.js` — glue: subscribes to `Eventos`, exposes hook helpers (`Notas.tackle(p)` etc.), tactical sampler. Reads `Match`.
- Create `tests/notas_motor.test.js`, `tests/notas_calibracao.test.js`, `tests/notas_ligacao.test.js`.
- Create `tools/scratch/notas_lote.js` — batch calibration script.
- Modify `index.html` (script tags), `tools/headless/harness.js` (FICHEIROS list), `js/fsm.js`, `js/match/match_physics.js`, `js/stats.js` (hooks), `js/match/match_loop.js` (sampler tick), `js/match/match_substituicoes.js` (enter/leave), `js/narracao/ponte.js` (result + live), `js/main.js` (+ `index.html`, `css/styles.css`) result table.
- Modify `manager:types.ts`, `manager:context/GameContext.tsx`.

---

### Task 1: Config + engine core (events → rating)

**Files:**
- Create: `js/ratings/notas_config.js`, `js/ratings/notas_motor.js`
- Test: `tests/notas_motor.test.js`

**Interfaces:**
- Produces: `NotasConfig` (global const + `module.exports`); `NotasMotor` with `reset()`, `entrar(id, {equipa, pos, estilo, minuto})`, `evento(id, tipo, {evId, minuto})`, `nota(id, minuto)` → number (1 decimal), `detalhes(id, minuto)` → `{nota, tatico, tecnico, participacao, disciplina, minutos}` (each component = score 0–100, rounded to integer).

- [ ] **Step 1: Write the failing test**

```js
// tests/notas_motor.test.js
const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/ratings/notas_motor.js');

function novo(pos = 'CM', estilo = null) {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos, estilo, minuto: 0 });
    return M;
}

test('sem eventos a nota e a neutra 6.0', () => {
    novo();
    assert.strictEqual(M.nota('a', 90), 6.0);
});

test('golo sobe a nota, vermelho desce, sempre entre 1 e 10', () => {
    novo('ST');
    M.evento('a', 'GOLO', { evId: 'g1', minuto: 10 });
    const n1 = M.nota('a', 90);
    assert.ok(n1 > 6.5 && n1 < 8, `golo: ${n1}`);
    novo('CB');
    M.evento('a', 'VERMELHO', { evId: 'v1', minuto: 10 });
    const n2 = M.nota('a', 90);
    assert.ok(n2 < 5.5 && n2 >= 1, `vermelho: ${n2}`);
});

test('muitos golos saturam: nunca passa de 10', () => {
    novo('ST');
    for (let i = 0; i < 40; i++) M.evento('a', 'GOLO', { evId: 'g' + i, minuto: 10 });
    assert.ok(M.nota('a', 90) <= 10);
});

test('mesmo evId nao conta duas vezes', () => {
    novo('ST');
    M.evento('a', 'GOLO', { evId: 'g1', minuto: 10 });
    const n1 = M.nota('a', 90);
    M.evento('a', 'GOLO', { evId: 'g1', minuto: 10 });
    assert.strictEqual(M.nota('a', 90), n1);
});

test('mesmo evId com outro tipo substitui o efeito anterior', () => {
    novo('CM');
    M.evento('a', 'PASSE_ERRADO', { evId: 'p1', minuto: 20 });
    M.evento('a', 'ERRO_GOLO', { evId: 'p1', minuto: 20 });
    const n = M.nota('a', 90);
    novo('CM');
    M.evento('a', 'ERRO_GOLO', { evId: 'x', minuto: 20 });
    assert.strictEqual(n, M.nota('a', 90));
});

test('detalhes tem os 4 componentes', () => {
    novo('ST');
    M.evento('a', 'GOLO', { evId: 'g1', minuto: 10 });
    const d = M.detalhes('a', 90);
    for (const k of ['nota', 'tatico', 'tecnico', 'participacao', 'disciplina', 'minutos']) assert.ok(k in d, k);
    assert.ok(d.tecnico > d.disciplina);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/notas_motor.test.js`
Expected: FAIL — `Cannot find module '../js/ratings/notas_motor.js'`.

- [ ] **Step 3: Write config and engine**

`js/ratings/notas_config.js`:

```js
/*
=============================================================================
NOTAS DOS JOGADORES — CONFIGURACAO (so dados; calibra-se aqui, sem tocar na logica)
=============================================================================
Cada evento afecta um ou mais COMPONENTES com um valor em "unidades de nota" (o valor da tabela da
especificacao). O motor satura cada componente (tanh) para a nota nunca ser uma soma ilimitada.
=============================================================================
*/
const NotasConfig = {
    neutra: 6.0,
    pesos: { tatico: 0.35, tecnico: 0.30, participacao: 0.25, disciplina: 0.10 },
    amostrasPlenas: 120,      // amostras taticas (1 a cada ~5 s de jogo) para a componente tatica valer por inteiro (~10 min)
    ampTatica: 0.9,           // efeito maximo da qualidade tatica media (unidades de nota)
    janelaErroSeg: 8,         // uma perda de bola ate N s antes de um remate/golo adversario vira "erro que gera ..."
    minutosMoc: 30,           // minimo de minutos para ser Man of the Match
    eventos: {
        GOLO:                  [['tecnico', 0.50], ['participacao', 0.30]],
        ASSISTENCIA:           [['tecnico', 0.30], ['participacao', 0.20]],
        PASSE_DECISIVO:        [['tecnico', 0.08], ['participacao', 0.04]],
        REMATE_NO_GOL:         [['tecnico', 0.08]],
        REMATE_FORA:           [['tecnico', -0.03]],
        GRANDE_CHANCE_PERDIDA: [['tecnico', -0.20]],
        DESARME:               [['tecnico', 0.07], ['participacao', 0.03]],
        INTERCEPTACAO:         [['tecnico', 0.05], ['participacao', 0.03]],
        CORTE:                 [['tecnico', 0.05], ['participacao', 0.02]],
        DUELO_AEREO:           [['tecnico', 0.04]],
        DEFESA:                [['tecnico', 0.10], ['participacao', 0.04]],
        DEFESA_DIFICIL:        [['tecnico', 0.25], ['participacao', 0.10]],
        PASSE_PROGRESSIVO:     [['tecnico', 0.03], ['participacao', 0.02]],
        CRUZAMENTO_CERTO:      [['tecnico', 0.05], ['participacao', 0.02]],
        DRIBLE:                [['tecnico', 0.06], ['participacao', 0.02]],
        PASSE_ERRADO:          [['disciplina', -0.02]],
        ERRO_REMATE:           [['disciplina', -0.20], ['tecnico', -0.10]],
        ERRO_GOLO:             [['disciplina', -0.60], ['tecnico', -0.30]],
        FALTA:                 [['disciplina', -0.03]],
        AMARELO:               [['disciplina', -0.15]],
        VERMELHO:              [['disciplina', -0.80]],
        PENALTI_COMETIDO:      [['disciplina', -0.40]]
    },
    // Tipos defensivos (desempate do Man of the Match).
    defensivos: ['DESARME', 'INTERCEPTACAO', 'CORTE', 'DUELO_AEREO', 'DEFESA', 'DEFESA_DIFICIL'],
    // Posicao do motor -> grupo.
    grupos: { GK: 'GK', CB: 'CB', LB: 'FB', RB: 'FB', LWB: 'FB', RWB: 'FB', DM: 'DM', CM: 'CM', AM: 'CM', LM: 'W', RM: 'W', LW: 'W', RW: 'W', ST: 'ST', CF: 'ST' },
    /*
    Perfil por grupo: `mult` multiplica o valor dos eventos (1 se ausente); `pesos` (opcional) substitui os pesos dos
    componentes (renormalizados); `tatico` multiplica o efeito da qualidade tatica.
    */
    perfis: {
        GK: { pesos: { tatico: 0.20, tecnico: 0.45, participacao: 0.15, disciplina: 0.20 }, mult: { DEFESA: 1.2, DEFESA_DIFICIL: 1.3, ERRO_GOLO: 1.2 }, tatico: 0.8 },
        CB: { mult: { DESARME: 1.2, INTERCEPTACAO: 1.2, CORTE: 1.4, DUELO_AEREO: 1.4, GOLO: 1.1, ERRO_GOLO: 1.15 }, tatico: 1.1 },
        FB: { mult: { DESARME: 1.1, INTERCEPTACAO: 1.1, CRUZAMENTO_CERTO: 1.4, PASSE_PROGRESSIVO: 1.1 }, tatico: 1.0 },
        DM: { mult: { DESARME: 1.3, INTERCEPTACAO: 1.4, CORTE: 1.2, PASSE_PROGRESSIVO: 1.2, GOLO: 1.1 }, tatico: 1.15 },
        CM: { mult: { PASSE_DECISIVO: 1.5, PASSE_PROGRESSIVO: 1.4, ASSISTENCIA: 1.1, DESARME: 0.9 }, tatico: 1.0 },
        W:  { mult: { DRIBLE: 1.5, CRUZAMENTO_CERTO: 1.5, PASSE_DECISIVO: 1.3, DESARME: 0.7 }, tatico: 0.9 },
        ST: { mult: { GOLO: 1.0, REMATE_NO_GOL: 1.2, GRANDE_CHANCE_PERDIDA: 1.1, DESARME: 0.6, INTERCEPTACAO: 0.6, CORTE: 0.5 }, tatico: 0.8 }
    },
    /*
    Playing Styles (chave = nome normalizado: minusculas, espacos/hifens -> '_'). So se aplicam em `posicoes`
    compativeis; fora delas manda o perfil da posicao. `liberdade` (0..1) alarga a tolerancia tatica.
    */
    estilos: {
        box_to_box_midfielder:  { posicoes: ['CM', 'DM'], mult: { DESARME: 1.1, PASSE_DECISIVO: 1.1, GOLO: 1.2 }, liberdade: 0.9 },
        anchor_man:             { posicoes: ['DM'], mult: { INTERCEPTACAO: 1.2, CORTE: 1.2 }, liberdade: 0.2 },
        deep_lying_playmaker:   { posicoes: ['DM', 'CM'], mult: { PASSE_PROGRESSIVO: 1.3, PASSE_DECISIVO: 1.2, DESARME: 0.8 }, liberdade: 0.5 },
        poacher:                { posicoes: ['ST'], mult: { GOLO: 1.0, REMATE_NO_GOL: 1.2, GRANDE_CHANCE_PERDIDA: 1.2 }, liberdade: 0.4 },
        ball_playing_defender:  { posicoes: ['CB'], mult: { PASSE_PROGRESSIVO: 1.5, PASSE_DECISIVO: 1.3 }, liberdade: 0.3 }
    },
    liberdadePadrao: 0.4
};
if (typeof module !== 'undefined') module.exports = NotasConfig;
```

`js/ratings/notas_motor.js`:

```js
/*
=============================================================================
NOTAS DOS JOGADORES — O MOTOR (logica pura: sem THREE, sem DOM)
=============================================================================
Cada jogador acumula valores brutos por componente (unidades de nota). A pontuacao de cada componente (0-100) vem de
uma saturacao tanh centrada na base que da a nota neutra, e a nota e `1 + 9 * ponderada / 100`.
Um evId, um efeito por jogador: repetir o mesmo evId com o mesmo tipo e ignorado; com outro tipo SUBSTITUI o anterior
(e assim que uma perda de bola vira "erro que gera golo" sem contar duas vezes).
=============================================================================
*/
const _NCfg = (typeof NotasConfig !== 'undefined') ? NotasConfig : require('./notas_config.js');
const COMPONENTES = ['tatico', 'tecnico', 'participacao', 'disciplina'];

const NotasMotor = {
    cfg: _NCfg,
    jogadores: {},
    _ultimaPerda: { TeamA: null, TeamB: null },

    reset() { this.jogadores = {}; this._ultimaPerda = { TeamA: null, TeamB: null }; },

    normalizarEstilo(e) { return e ? String(e).toLowerCase().replace(/[\s-]+/g, '_') : null; },
    grupoDe(pos) { return this.cfg.grupos[pos] || 'CM'; },
    _estiloAtivo(j) {
        const e = this.cfg.estilos[j.estilo];
        return (e && e.posicoes.indexOf(j.pos) >= 0) ? e : null;
    },

    entrar(id, d) {
        const pos = d.pos || 'CM';
        this.jogadores[id] = {
            id: id, equipa: d.equipa, pos: pos, grupo: this.grupoDe(pos), estilo: this.normalizarEstilo(d.estilo),
            entrou: d.minuto || 0, saiu: null,
            raw: { tatico: 0, tecnico: 0, participacao: 0, disciplina: 0 },
            aplicado: {}, nDef: 0, nEventos: 0, qSoma: 0, qN: 0
        };
        return this.jogadores[id];
    },
    sair(id, minuto) { const j = this.jogadores[id]; if (j && j.saiu === null) j.saiu = minuto; },

    _mult(j, tipo) {
        const p = this.cfg.perfis[j.grupo] || {};
        const e = this._estiloAtivo(j);
        return ((p.mult && p.mult[tipo]) || 1) * ((e && e.mult && e.mult[tipo]) || 1);
    },
    _contribs(j, tipo) {
        const base = this.cfg.eventos[tipo];
        if (!base) return null;
        const m = this._mult(j, tipo);
        return base.map(([c, v]) => [c, v * m]);
    },
    _somar(j, contribs, sinal) { for (const [c, v] of contribs) j.raw[c] += sinal * v; },

    evento(id, tipo, d) {
        const j = this.jogadores[id];
        if (!j) return false;
        const contribs = this._contribs(j, tipo);
        if (!contribs) return false;
        const evId = (d && d.evId) || (tipo + ':' + j.nEventos);
        const ant = j.aplicado[evId];
        if (ant) {
            if (ant.tipo === tipo) return false;
            this._somar(j, ant.contribs, -1);
            if (this.cfg.defensivos.indexOf(ant.tipo) >= 0) j.nDef--;
        }
        this._somar(j, contribs, +1);
        j.aplicado[evId] = { tipo: tipo, contribs: contribs };
        if (this.cfg.defensivos.indexOf(tipo) >= 0) j.nDef++;
        if (!ant) j.nEventos++;
        return true;
    },

    _min(j, agora) { return Math.max(0, (j.saiu !== null ? j.saiu : agora) - j.entrou); },
    _pesos(j) {
        const p = (this.cfg.perfis[j.grupo] || {}).pesos || this.cfg.pesos;
        const soma = COMPONENTES.reduce((s, c) => s + p[c], 0);
        const o = {}; for (const c of COMPONENTES) o[c] = p[c] / soma;
        return o;
    },
    _base() { return 100 * (this.cfg.neutra - 1) / 9; },
    // raw (unidades de nota) -> pontuacao 0..100. Escala 4*peso: pequenos valores dao ~ o mesmo delta de nota.
    _pontuacao(raw, peso) {
        const B = this._base(), t = Math.tanh(raw / (4 * peso));
        return t >= 0 ? B + (100 - B) * t : B * (1 + t);
    },
    _rawTatico(j) {
        if (!j.qN) return 0;
        const perfil = (this.cfg.perfis[j.grupo] || {}).tatico || 1;
        return (j.qSoma / j.qN) * this.cfg.ampTatica * perfil * Math.min(1, j.qN / this.cfg.amostrasPlenas);
    },

    detalhes(id, agora) {
        const j = this.jogadores[id];
        if (!j) return null;
        const pesos = this._pesos(j);
        const raw = Object.assign({}, j.raw, { tatico: j.raw.tatico + this._rawTatico(j) });
        const sc = {}; let pond = 0;
        for (const c of COMPONENTES) { sc[c] = this._pontuacao(raw[c], pesos[c]); pond += pesos[c] * sc[c]; }
        const nota = Math.min(10, Math.max(1, 1 + 9 * pond / 100));
        const r = {}; for (const c of COMPONENTES) r[c] = Math.round(sc[c]);
        return Object.assign({ nota: Math.round(nota * 10) / 10, minutos: Math.round(this._min(j, agora)) }, r);
    },
    nota(id, agora) { const d = this.detalhes(id, agora); return d ? d.nota : null; }
};
if (typeof module !== 'undefined') module.exports = NotasMotor;
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/notas_motor.test.js`
Expected: PASS (6 tests). If a band assertion fails by a small margin, adjust the *config value* (calibration), not the assertion, unless the assertion is implausible.

- [ ] **Step 5: Commit**

```bash
git add js/ratings tests/notas_motor.test.js
git commit -m "feat(notas): config e motor de notas (eventos -> nota)"
```

---

### Task 2: Position profiles, Playing Styles, minutes/substitutions

**Files:**
- Modify: `js/ratings/notas_motor.js` (already supports; this task adds tests + `sair`/reserve behavior verification)
- Test: `tests/notas_motor.test.js` (append)

**Interfaces:**
- Consumes: Task 1 (`entrar`, `sair`, `evento`, `nota`).
- Produces: verified behavior — compatible style applies only in compatible position; substituted player keeps rating; reserve starts at 6.0.

- [ ] **Step 1: Append failing tests**

```js
test('desarme vale mais para volante que para atacante', () => {
    M.reset();
    M.entrar('dm', { equipa: 'TeamA', pos: 'DM', minuto: 0 });
    M.entrar('st', { equipa: 'TeamA', pos: 'ST', minuto: 0 });
    for (let i = 0; i < 6; i++) { M.evento('dm', 'DESARME', { evId: 'd' + i }); M.evento('st', 'DESARME', { evId: 'd' + i }); }
    assert.ok(M.nota('dm', 90) > M.nota('st', 90));
});

test('playing style so conta em posicao compativel', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CB', estilo: 'Anchor Man', minuto: 0 });   // Anchor Man e de DM
    M.entrar('b', { equipa: 'TeamA', pos: 'CB', minuto: 0 });
    for (let i = 0; i < 5; i++) { M.evento('a', 'INTERCEPTACAO', { evId: 'i' + i }); M.evento('b', 'INTERCEPTACAO', { evId: 'i' + i }); }
    assert.strictEqual(M.nota('a', 90), M.nota('b', 90));
    M.entrar('c', { equipa: 'TeamA', pos: 'DM', estilo: 'Anchor Man', minuto: 0 });
    M.entrar('d', { equipa: 'TeamA', pos: 'DM', minuto: 0 });
    for (let i = 0; i < 5; i++) { M.evento('c', 'INTERCEPTACAO', { evId: 'i' + i }); M.evento('d', 'INTERCEPTACAO', { evId: 'i' + i }); }
    assert.ok(M.nota('c', 90) > M.nota('d', 90));
});

test('substituido mantem a nota; reserva entra a 6.0', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'ST', minuto: 0 });
    M.evento('a', 'GOLO', { evId: 'g1', minuto: 30 });
    M.sair('a', 60);
    const n = M.nota('a', 60);
    assert.strictEqual(M.nota('a', 90), n);
    M.entrar('r', { equipa: 'TeamA', pos: 'ST', minuto: 60 });
    assert.strictEqual(M.nota('r', 61), 6.0);
    assert.strictEqual(M.detalhes('r', 75).minutos, 15);
});
```

- [ ] **Step 2: Run** — `node --test tests/notas_motor.test.js`. Expected: PASS already (behavior is in Task 1). If any fails, fix `notas_motor.js` accordingly (do not weaken the test).
- [ ] **Step 3: Commit** — `git add tests/notas_motor.test.js js/ratings && git commit -m "test(notas): perfis por posicao, estilos e substituicoes"`

---

### Task 3: Tactical quality + sampling

**Files:**
- Modify: `js/ratings/notas_motor.js`
- Test: `tests/notas_motor.test.js` (append)

**Interfaces:**
- Produces: `NotasMotor.qualidadeTatica(ctx)` → number in [-1, 1], with `ctx = { fase: 'ataque'|'defesa'|'transicao', dEsperada: metros ate ao posto esperado, bolaPerto: bool, ofereceLinha: bool, fechaLinha: bool, pressiona: bool }`; `NotasMotor.amostrar(id, ctx)` adds one sample.

- [ ] **Step 1: Append failing tests**

```js
test('qualidadeTatica: no posto > longe do posto; contexto justifica o desvio', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CM', minuto: 0 });
    const noPosto = M.qualidadeTatica('a', { fase: 'defesa', dEsperada: 2, bolaPerto: false, ofereceLinha: false, fechaLinha: true, pressiona: false });
    const longe = M.qualidadeTatica('a', { fase: 'defesa', dEsperada: 25, bolaPerto: false, ofereceLinha: false, fechaLinha: false, pressiona: false });
    const longeJustificado = M.qualidadeTatica('a', { fase: 'defesa', dEsperada: 25, bolaPerto: true, ofereceLinha: false, fechaLinha: true, pressiona: true });
    assert.ok(noPosto > longe);
    assert.ok(longeJustificado > longe);
    assert.ok(noPosto <= 1 && longe >= -1);
});

test('jogador que cumpre a funcao (so amostras boas) passa de 6.0 sem estatisticas', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'DM', minuto: 0 });
    for (let i = 0; i < 200; i++) M.amostrar('a', { fase: i % 2 ? 'defesa' : 'ataque', dEsperada: 3, bolaPerto: false, ofereceLinha: true, fechaLinha: true, pressiona: false });
    const n = M.nota('a', 90);
    assert.ok(n > 6.3 && n < 7.6, 'nota ' + n);
});

test('poucas amostras (pouco tempo em campo) nao penalizam', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CM', minuto: 80 });
    for (let i = 0; i < 6; i++) M.amostrar('a', { fase: 'defesa', dEsperada: 30, bolaPerto: false, ofereceLinha: false, fechaLinha: false, pressiona: false });
    assert.ok(M.nota('a', 85) >= 5.8);
});
```

- [ ] **Step 2: Run to verify fail** — `node --test tests/notas_motor.test.js` → FAIL `M.qualidadeTatica is not a function`.

- [ ] **Step 3: Implement** — add inside `NotasMotor` (before `detalhes`):

```js
    /*
    Qualidade tatica de UM instante, de -1 a 1. Nao e so a distancia ao posto: o estilo alarga a tolerancia (`liberdade`),
    a bola perto justifica sair do posto, e ha bonus por fazer o que a fase pede (oferecer linha de passe a atacar,
    fechar linha/pressionar a defender).
    */
    qualidadeTatica(id, ctx) {
        const j = this.jogadores[id];
        if (!j) return 0;
        const e = this._estiloAtivo(j);
        const liberdade = e ? e.liberdade : this.cfg.liberdadePadrao;
        const tolerancia = 6 + 10 * liberdade + (ctx.bolaPerto ? 6 : 0);
        const excesso = Math.max(0, ctx.dEsperada - tolerancia);
        let q = 0.75 * (1 - 2 * Math.min(1, excesso / 20));
        if (ctx.fase === 'ataque' && ctx.ofereceLinha) q += 0.25;
        if (ctx.fase === 'defesa' && ctx.fechaLinha) q += 0.25;
        if (ctx.fase === 'defesa' && ctx.pressiona) q += 0.10;
        return Math.max(-1, Math.min(1, q));
    },
    amostrar(id, ctx) {
        const j = this.jogadores[id];
        if (!j) return;
        j.qSoma += this.qualidadeTatica(id, ctx);
        j.qN++;
    },
```

- [ ] **Step 4: Run** — expect PASS. Calibrate `ampTatica`/tolerances in config if band fails.
- [ ] **Step 5: Commit** — `git commit -am "feat(notas): qualidade tatica e amostragem"` (after `git add`).

---

### Task 4: Retroactive error attribution (loss → shot/goal)

**Files:**
- Modify: `js/ratings/notas_motor.js`
- Test: `tests/notas_motor.test.js` (append)

**Interfaces:**
- Produces: `NotasMotor.perda(id, equipa, tSeg, evId)` registers a possession loss (applies `PASSE_ERRADO`); `NotasMotor.remateAdversario(equipaQueRematou, tSeg, foiGolo)` promotes the last loss of the *other* team within `cfg.janelaErroSeg` to `ERRO_REMATE` or `ERRO_GOLO` (same evId, so replaces).

- [ ] **Step 1: Append failing test**

```js
test('perda de bola que gera golo vira ERRO_GOLO, sem contar duas vezes', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CM', minuto: 0 });
    M.perda('a', 'TeamA', 100, 'p1');
    const antes = M.nota('a', 90);
    M.remateAdversario('TeamB', 104, true);
    const depois = M.nota('a', 90);
    assert.ok(depois < antes - 0.5, `${antes} -> ${depois}`);
    M.remateAdversario('TeamB', 105, true);                  // outro evento nao re-promove a mesma perda
    assert.strictEqual(M.nota('a', 90), depois);
});

test('perda fora da janela nao e promovida', () => {
    M.reset();
    M.entrar('a', { equipa: 'TeamA', pos: 'CM', minuto: 0 });
    M.perda('a', 'TeamA', 100, 'p1');
    const antes = M.nota('a', 90);
    M.remateAdversario('TeamB', 140, true);
    assert.strictEqual(M.nota('a', 90), antes);
});
```

- [ ] **Step 2: Run** — FAIL (`M.perda is not a function`).
- [ ] **Step 3: Implement** — add inside `NotasMotor`:

```js
    perda(id, equipa, tSeg, evId) {
        this.evento(id, 'PASSE_ERRADO', { evId: evId });
        this._ultimaPerda[equipa] = { id: id, t: tSeg, evId: evId, promovida: false };
    },
    remateAdversario(equipaQueRematou, tSeg, foiGolo) {
        const equipaDoErro = equipaQueRematou === 'TeamA' ? 'TeamB' : 'TeamA';
        const p = this._ultimaPerda[equipaDoErro];
        if (!p || p.promovida || tSeg - p.t > this.cfg.janelaErroSeg || tSeg < p.t) return false;
        p.promovida = true;
        return this.evento(p.id, foiGolo ? 'ERRO_GOLO' : 'ERRO_REMATE', { evId: p.evId });
    },
```

Note: a loss promoted to `ERRO_REMATE` by a shot and then a goal from the same sequence would be blocked by `promovida`; to let a goal upgrade a shot error, set `p.promovida = !foiGolo ? 'remate' : true` and allow the upgrade only when `p.promovida === 'remate' && foiGolo`. Implement exactly that (condition: `if (!p || p.promovida === true || (p.promovida === 'remate' && !foiGolo) ...)`) and add a test `ERRO_REMATE` then goal ⇒ final equals a direct `ERRO_GOLO`.

- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** — `git commit -am "feat(notas): erro que gera remate/golo atribuido retroativamente"`

---

### Task 5: Man of the Match + 8 calibration scenarios

**Files:**
- Modify: `js/ratings/notas_motor.js`
- Test: `tests/notas_calibracao.test.js`

**Interfaces:**
- Produces: `NotasMotor.melhor(equipa|null, agora)` → player id or `null`. Candidates: minutes ≥ `cfg.minutosMoc` and (`nEventos + qN` > 0). Order: nota desc, then `nDef` desc.

- [ ] **Step 1: Write failing test** (`tests/notas_calibracao.test.js`)

```js
const test = require('node:test');
const assert = require('node:assert');
const M = require('../js/ratings/notas_motor.js');

const bom = (fase) => ({ fase, dEsperada: 3, bolaPerto: false, ofereceLinha: true, fechaLinha: true, pressiona: false });
const mau = (fase) => ({ fase, dEsperada: 30, bolaPerto: false, ofereceLinha: false, fechaLinha: false, pressiona: false });
const neutro = (fase) => ({ fase, dEsperada: 8, bolaPerto: false, ofereceLinha: false, fechaLinha: false, pressiona: false });
function jog(id, pos, estilo) { M.entrar(id, { equipa: 'TeamA', pos, estilo, minuto: 0 }); }
function amostras(id, n, f) { for (let i = 0; i < n; i++) M.amostrar(id, f(i % 2 ? 'defesa' : 'ataque')); }
function ev(id, tipo, n) { for (let i = 0; i < n; i++) M.evento(id, tipo, { evId: tipo + i }); }
const faixa = (n, lo, hi, msg) => assert.ok(n >= lo && n <= hi, `${msg}: ${n} fora de ${lo}-${hi}`);

test('1. atacante com 2 golos e pouco mais', () => {
    M.reset(); jog('a', 'ST'); ev('a', 'GOLO', 2); ev('a', 'REMATE_FORA', 3); amostras('a', 120, neutro);
    faixa(M.nota('a', 90), 7.0, 8.5, 'ST 2 golos');
});
test('2. volante dominante sem golos', () => {
    M.reset(); jog('a', 'DM'); ev('a', 'DESARME', 6); ev('a', 'INTERCEPTACAO', 6); ev('a', 'PASSE_PROGRESSIVO', 8); amostras('a', 200, bom);
    faixa(M.nota('a', 90), 7.0, 8.4, 'DM dominante');
});
test('3. zagueiro perfeito', () => {
    M.reset(); jog('a', 'CB'); ev('a', 'DESARME', 4); ev('a', 'INTERCEPTACAO', 5); ev('a', 'CORTE', 8); ev('a', 'DUELO_AEREO', 6); amostras('a', 200, bom);
    faixa(M.nota('a', 90), 7.0, 8.6, 'CB perfeito');
});
test('4. goleiro com varias defesas dificeis', () => {
    M.reset(); jog('a', 'GK'); ev('a', 'DEFESA', 3); ev('a', 'DEFESA_DIFICIL', 4); amostras('a', 200, bom);
    faixa(M.nota('a', 90), 7.2, 9.0, 'GK defesas dificeis');
});
test('5. meio-campista que organiza a construcao', () => {
    M.reset(); jog('a', 'CM'); ev('a', 'PASSE_PROGRESSIVO', 12); ev('a', 'PASSE_DECISIVO', 3); amostras('a', 200, bom);
    faixa(M.nota('a', 90), 7.0, 8.6, 'CM organizador');
});
test('6. ponta que cria muito sem marcar', () => {
    M.reset(); jog('a', 'LW'); ev('a', 'DRIBLE', 6); ev('a', 'CRUZAMENTO_CERTO', 4); ev('a', 'PASSE_DECISIVO', 4); amostras('a', 150, neutro);
    faixa(M.nota('a', 90), 6.8, 8.2, 'W criador');
});
test('7. erro grave que gera golo adversario', () => {
    M.reset(); jog('a', 'CB'); M.perda('a', 'TeamA', 100, 'p1'); M.remateAdversario('TeamB', 104, true); amostras('a', 200, neutro);
    faixa(M.nota('a', 90), 4.2, 5.6, 'erro gera golo');
});
test('8. cumpre a funcao com poucas estatisticas', () => {
    M.reset(); jog('a', 'CM'); amostras('a', 200, bom);
    faixa(M.nota('a', 90), 6.4, 7.5, 'funcao cumprida');
});
test('jogador que ignora a funcao fica abaixo do neutro', () => {
    M.reset(); jog('a', 'DM'); amostras('a', 200, mau);
    assert.ok(M.nota('a', 90) < 6.0);
});
test('Man of the Match: volante pode ganhar do atacante com golo; minimo de minutos', () => {
    M.reset(); jog('dm', 'DM'); jog('st', 'ST'); jog('sub', 'ST');
    M.jogadores.sub.entrou = 85;
    ev('dm', 'DESARME', 8); ev('dm', 'INTERCEPTACAO', 8); ev('dm', 'PASSE_PROGRESSIVO', 10); amostras('dm', 200, bom);
    ev('st', 'GOLO', 1); amostras('st', 200, neutro);
    ev('sub', 'GOLO', 3);
    assert.strictEqual(M.melhor('TeamA', 90), 'dm');
    assert.strictEqual(M.melhor('TeamB', 90), null);
});
```

- [ ] **Step 2: Run** — FAIL (`M.melhor is not a function`; bands may also fail).
- [ ] **Step 3: Implement** `melhor` in `NotasMotor`:

```js
    melhor(equipa, agora) {
        let best = null, bn = -1, bd = -1;
        for (const id in this.jogadores) {
            const j = this.jogadores[id];
            if (equipa && j.equipa !== equipa) continue;
            if (this._min(j, agora) < this.cfg.minutosMoc || (j.nEventos + j.qN) === 0) continue;
            const n = this.nota(id, agora);
            if (n > bn || (n === bn && j.nDef > bd)) { best = id; bn = n; bd = j.nDef; }
        }
        return best;
    },
```

- [ ] **Step 4: Calibrate.** Run `node --test tests/notas_calibracao.test.js`. For each band failure, tune `notas_config.js` (`ampTatica`, multipliers, event values, `perfis.*.pesos`), never the bands, unless a band contradicts the spec's intent. Re-run `tests/notas_motor.test.js` after each change. Record the final tuned values in the commit message.
- [ ] **Step 5: Commit** — `git add -A js/ratings tests && git commit -m "feat(notas): Man of the Match e calibracao dos 8 perfis"`

---

### Task 6: Glue — register scripts, `Eventos` listener, player registration

**Files:**
- Create: `js/ratings/notas_ligacao.js`
- Modify: `index.html` (add after `<script src="js/stats.js"></script>`, line ~570), `tools/headless/harness.js` (FICHEIROS: after `'js/stats.js',`)
- Test: `tests/notas_ligacao.test.js`

**Interfaces:**
- Consumes: `NotasMotor` (Tasks 1–5), `Eventos` (`js/narracao/eventos.js`: events `REMATE{jogador,desfecho,xg,n}`, `GOLO{jogador,assistente,proprioGolo}`, `DEFESA{jogador,rematador}`, `FALTA{jogador,vitima,cartao}`, `CARTAO`, `PENALTI`; `jogador` = `{id, nome, pos, equipa, numero}` from `Eventos._jog`, `id` = manager player id), `Match.players` (each has `.team`, `.skills.id`, `.pos`, `.skills.estilo`?).
- Produces: global `Notas` with `iniciar()` (reset + register all `Match.players` + subscribe once), `jogadorId(p)`, `tackle(p)`, `intercecao(p)`, `corte(p)`, `passeProgressivo(p)`, `duelo(p, aereo)`, `cruzamento(p)`, `drible(p)`, `perda(p)`, `minutoAtual()`, `resultado()` → `{ [id]: {nota, tatico, tecnico, participacao, disciplina, minutos, moc, pos, equipa} }`.

- [ ] **Step 1: Find the real fields.** Read `js/narracao/adaptador_manager.js:140-160` and `js/match/match_setup.js` to confirm: manager player id is `p.skills.id`, position `p.pos`, style at `p.skills.estilo` (string, e.g. "Anchor Man"; verify key spelling vs `NotasConfig.estilos` after `normalizarEstilo` — fix the config keys if the real names differ, e.g. via `grep -n "Anchor\|Box-to-Box\|Poacher\|Deep-Lying\|Ball-Playing" js/*.js data/*.js`).
- [ ] **Step 2: Write failing test** (`tests/notas_ligacao.test.js`) using the harness: `require('../tools/headless/harness.js')`; build a match like `tests/autogolo`-style headless tests do (see `tests/estilo_da_equipa.test.js`), call `Notas.iniciar()`, then `Eventos.registar('GOLO', {...})` with a synthetic `jogador` whose `id` matches a registered player and assert `Notas.resultado()[id].nota > 6`. Also assert `Eventos.registar('REMATE')` then `Eventos.fecharRemate('defesa')` gives the shooter `REMATE_NO_GOL` once, and `fecharRemate('fora')` → `REMATE_FORA`, `golo` → no `REMATE_NO_GOL` (anti double-count: GOLO uses evId `g<n>`; a shot's own effect only on `defesa`/`fora`).
- [ ] **Step 3: Run** → FAIL (`Notas` undefined).
- [ ] **Step 4: Implement `notas_ligacao.js`:**

```js
/*
=============================================================================
NOTAS DOS JOGADORES — LIGACAO AO MOTOR 3D
=============================================================================
Nao decide nada no jogo: ouve o registo de eventos (Eventos.aoRegistar) e recebe chamadas pontuais dos ganchos
(`typeof Notas !== 'undefined'`). O calculo esta em notas_motor.js.
=============================================================================
*/
const Notas = {
    _ligado: false,
    ativo: true,

    minutoAtual() { return (typeof Match !== 'undefined' && typeof Match.tempoDeJogo === 'number') ? Match.tempoDeJogo / 60 : 0; },
    segAtual() { return (typeof Match !== 'undefined' && typeof Match.tempoDeJogo === 'number') ? Match.tempoDeJogo : 0; },
    jogadorId(p) { return (p && p.skills && p.skills.id !== undefined && p.skills.id !== null) ? String(p.skills.id) : null; },
    _id(j) { return (j && j.id !== undefined && j.id !== null) ? String(j.id) : null; },

    registarJogador(p, minuto) {
        const id = this.jogadorId(p);
        if (id === null || (NotasMotor.jogadores[id] && NotasMotor.jogadores[id].saiu === null)) return;
        NotasMotor.entrar(id, { equipa: p.team, pos: p.pos, estilo: p.skills && p.skills.estilo, minuto: minuto || 0 });
    },
    iniciar() {
        NotasMotor.reset();
        if (typeof Match !== 'undefined' && Match.players) for (const p of Match.players) if (!p.suplente) this.registarJogador(p, 0);
        if (!this._ligado && typeof Eventos !== 'undefined') { Eventos.aoRegistar(ev => this._aoEvento(ev)); this._ligado = true; }
    },

    _ev(j, tipo, evId) { const id = this._id(j); if (id !== null && this.ativo) NotasMotor.evento(id, tipo, { evId: evId, minuto: this.minutoAtual() }); },

    _aoEvento(ev) {
        if (!this.ativo) return;
        switch (ev.tipo) {
            case 'REMATE':
                if (ev.desfecho === 'defesa') this._ev(ev.jogador, 'REMATE_NO_GOL', 'r' + ev.n);
                else if (ev.desfecho === 'fora') this._ev(ev.jogador, 'REMATE_FORA', 'r' + ev.n);
                else if (ev.desfecho === 'golo') { /* conta como GOLO, nao como remate */ }
                if (ev.desfecho && ev.equipa) NotasMotor.remateAdversario(ev.equipa, this.segAtual(), ev.desfecho === 'golo');
                break;
            case 'GOLO':
                if (!ev.proprioGolo) { this._ev(ev.jogador, 'GOLO', 'g' + ev.n); if (ev.assistente) this._ev(ev.assistente, 'ASSISTENCIA', 'a' + ev.n); }
                break;
            case 'DEFESA': {
                const dificil = ev.rematador && ev.xg !== undefined ? ev.xg >= 0.25 : false;
                this._ev(ev.jogador, dificil ? 'DEFESA_DIFICIL' : 'DEFESA', 'd' + ev.n);
                break;
            }
            case 'FALTA':
                this._ev(ev.jogador, 'FALTA', 'f' + ev.n);
                break;
            case 'CARTAO':
                this._ev(ev.jogador, ev.cor === 'vermelho' ? 'VERMELHO' : 'AMARELO', 'c' + ev.n);
                break;
            case 'PENALTI_COMETIDO':
                this._ev(ev.jogador, 'PENALTI_COMETIDO', 'pc' + ev.n);
                break;
        }
    },

    // ---- ganchos pontuais (um por acontecimento; o `evId` impede a dupla contagem) ------------------------------
    _n: 0,
    _gancho(p, tipo) { const id = this.jogadorId(p); if (id !== null && this.ativo) NotasMotor.evento(id, tipo, { evId: tipo + ':' + (++this._n), minuto: this.minutoAtual() }); },
    tackle(p) { this._gancho(p, 'DESARME'); },
    intercecao(p) { this._gancho(p, 'INTERCEPTACAO'); },
    corte(p) { this._gancho(p, 'CORTE'); },
    duelo(p, aereo) { if (aereo) this._gancho(p, 'DUELO_AEREO'); },
    passeProgressivo(p) { this._gancho(p, 'PASSE_PROGRESSIVO'); },
    passeDecisivo(p) { this._gancho(p, 'PASSE_DECISIVO'); },
    cruzamento(p) { this._gancho(p, 'CRUZAMENTO_CERTO'); },
    drible(p) { this._gancho(p, 'DRIBLE'); },
    perda(p) { const id = this.jogadorId(p); if (id !== null && this.ativo) NotasMotor.perda(id, p.team, this.segAtual(), 'pp:' + (++this._n)); },

    resultado() {
        const o = {}, agora = this.minutoAtual();
        const mocA = NotasMotor.melhor('TeamA', agora), mocB = NotasMotor.melhor('TeamB', agora);
        for (const id in NotasMotor.jogadores) {
            const j = NotasMotor.jogadores[id], d = NotasMotor.detalhes(id, agora);
            o[id] = Object.assign({ pos: j.pos, equipa: j.equipa, moc: id === mocA || id === mocB }, d);
        }
        return o;
    }
};
if (typeof module !== 'undefined') module.exports = Notas;
```

Adjust field names to what Step 1 found (e.g. DEFESA events do not carry `xg`; use the preceding `Eventos.ultimoRemate.xg` when the `DEFESA` is recorded, and note that `DEFESA`'s `jogador` is the keeper). Keep `iniciar()` idempotent.

- [ ] **Step 5: Register scripts.** In `index.html` add, right after the `stats.js` tag: `<script src="js/ratings/notas_config.js"></script>`, `<script src="js/ratings/notas_motor.js"></script>`, `<script src="js/ratings/notas_ligacao.js"></script>`. In `tools/headless/harness.js` add `'js/ratings/notas_config.js', 'js/ratings/notas_motor.js', 'js/ratings/notas_ligacao.js',` after `'js/stats.js',`. Call `Notas.iniciar()` where `MatchStats.reset()` is called at match start (`stats.js:215` `reset` and `Match.init`/`prepararPartida`; grep `MatchStats.reset(` for the call sites and add `if (typeof Notas !== 'undefined') Notas.iniciar();` after each, once players exist).
- [ ] **Step 6: Run** — `node --test tests/notas_ligacao.test.js tests/notas_motor.test.js tests/notas_calibracao.test.js` → PASS.
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat(notas): ligacao ao registo de eventos do 3D"`

---

### Task 7: Per-player hooks (tackle, interception, pass, duel, loss, sub)

**Files:**
- Modify: `js/fsm.js` (~3032), `js/match/match_physics.js` (~981, ~1100), `js/stats.js` (`registarRecepcao` ~852), `js/match/match_loop.js` (~1582), `js/match/match_substituicoes.js`
- Test: `tests/notas_ligacao.test.js` (append)

**Interfaces:**
- Consumes: `Notas.tackle/intercecao/corte/duelo/passeProgressivo/perda/registarJogador` (Task 6), `NotasMotor.sair`.

- [ ] **Step 1: Append failing test** that fakes two players (`{team, skills:{id}, pos}`) and asserts `Notas.tackle(p)` raises the player's rating relative to neutral, `Notas.perda(p)` followed by `Eventos.registar('REMATE', …)` + `Eventos.fecharRemate('defesa')` from the *other* team lowers the loser's rating (uses Task 4 path), and that calling `Notas.registarJogador(sub, 60)` after `NotasMotor.sair(id, 60)` of another player keeps the first rating frozen.
- [ ] **Step 2: Run** → FAIL on the new tests only if hooks glue is wrong; fix glue, not tests.
- [ ] **Step 3: Add hooks (read-only, guarded):**
  - `js/fsm.js` right after `MatchStats[p.team].desarmes.sucesso++;` (~line 3032): `if (typeof Notas !== 'undefined') Notas.tackle(p);`
  - `js/match/match_physics.js` inside the `PI` block, in the branch where the interceptor *keeps* the ball (the `Math.random() >= p` is the failure branch → the success path is the `else`/fall-through that gives `best` the ball; read lines 981–1010 to place it), add `Notas.intercecao(best)`.
  - `js/stats.js` `registarRecepcao`, in the `else` branch where `jogador.team !== equipaPasse` (a pass cut): `if (typeof Notas !== 'undefined') Notas.corte(jogador);` — only when the cutter is a defender (`jogador.role === 'def'`), otherwise `Notas.intercecao(jogador)`.
  - Progressive pass: in `registarRecepcao` where `registarPasseCerto` is called, if the pass moved the ball ≥ 10 m toward goal (`ctxPasse` has `origem/destino/dirZ`: `(ctxPasse.destino.z - ctxPasse.origem.z) * ctxPasse.dirZ >= 10`) call `Notas.passeProgressivo(<passador>)`. The passer: store `MatchStats._pendingPasser = p` next to `_pendingPassTeam` where `registarPasseIniciado` is called in `js/fsm.js:676` (pass `p`), and read/clear it in `registarRecepcao`.
  - Possession loss: in `js/match/match_loop.js` ~1582, the old carrier is `this.lastCarrier`-like; read how `oldPossessionTeam` is derived and, if a previous carrier object exists there, call `Notas.perda(prevCarrier)` when `registarPerda` fires and the loss was not by a tackle/interception already counted (skip if `Match.lastTouchedPlayer` is the opponent via a tackle in the same frame — acceptable approximation: only count when the previous carrier's last action was a pass that was cut, i.e. in the `registarRecepcao` cut branch call `Notas.perda(passerOfCutPass)` instead of in match_loop). Prefer the `registarRecepcao` placement; do not add anything to match_loop for losses.
  - Aerial duels: `js/fsm.js:3135` and `js/player.js:4603/4692` call `registarDuelo`; add `Notas.duelo(winner, true)` where the duel is aerial and the winner object is in scope (read each site; skip if the winner object is not available).
  - Substitutions: in `js/match/match_substituicoes.js`, where a substitution is applied (find the function swapping `sai`/`entra`), add `NotasMotor.sair(Notas.jogadorId(sai), Notas.minutoAtual()); Notas.registarJogador(entra, Notas.minutoAtual());` guarded by `typeof Notas`. Also on a red card, call `NotasMotor.sair(id, minuto)` in the `CARTAO` branch of `_aoEvento` when `ev.cor === 'vermelho'`.
- [ ] **Step 4: Run** all `tests/notas_*.test.js` plus the existing regression tests that touch edited files: `node --test tests/gk_defesa.test.js tests/faltas_cartoes.test.js tests/autogolo.test.js tests/estatistica_por_jogo.test.js tests/ataques_contados.test.js` → all PASS (hooks must not change behavior).
- [ ] **Step 5: Commit** — `git commit -am "feat(notas): ganchos por jogador (desarme, intercecao, passe, perda, substituicoes)"`

---

### Task 8: Tactical sampler (every ~5 game-seconds)

**Files:**
- Modify: `js/ratings/notas_ligacao.js`, `js/match/match_loop.js` (one call per frame)
- Test: `tests/notas_ligacao.test.js` (append)

**Interfaces:**
- Produces: `Notas.tick(dt)` — accumulates game time; every `intervaloAmostra` (5 s of `Match.tempoDeJogo`) samples all on-field players via `NotasMotor.amostrar`.

- [ ] **Step 1: Find the data already computed.** Read `js/bt/team_bt.js` / `js/match/match_loop.js` to identify, per player: tactical slot target (the position the BT already assigns: grep `slotTarget\|posicaoBase\|alvoTatico\|formationTarget`), phase (`Match.possessionTeam` vs player's team; transition = within ~4 s of `possessionTimer` reset), ball position (`Match.ball.position`), and nearby teammates/opponents (use `SpatialGrid` from `js/spatial_grid.js` rather than O(n²) loops). Document the chosen fields in a comment above `_ctxDe`.
- [ ] **Step 2: Write failing test** — fake a minimal `Match` with 2 players, one at its slot and one 30 m away, advance `Notas.tick(1)` six times, and assert the first has a higher rating than the second, and that `Notas.tick` does nothing between intervals (check `NotasMotor.jogadores[id].qN` increments once per 5 s).
- [ ] **Step 3: Implement**

```js
    intervaloAmostra: 5,
    _acum: 0,
    tick(dt) {
        if (!this.ativo || typeof Match === 'undefined' || !Match.players) return;
        this._acum += dt * ((Match.tempoDeJogo !== undefined && Match.simDt) ? 1 : 1);
        if (this._acum < this.intervaloAmostra) return;
        this._acum = 0;
        for (const p of Match.players) {
            if (p.expulso || p.role === 'gk' && false) continue;
            const id = this.jogadorId(p);
            if (id === null || !NotasMotor.jogadores[id] || NotasMotor.jogadores[id].saiu !== null) continue;
            NotasMotor.amostrar(id, this._ctxDe(p));
        }
    },
```

Replace the placeholder `dt` scaling with real game-time: use `Match.tempoDeJogo` deltas (`const t = Match.tempoDeJogo; if (t - this._ultT < this.intervaloAmostra) return; this._ultT = t;`) so the interval is in *game* seconds regardless of `timeScale`. Implement `_ctxDe(p)` using the fields found in Step 1: `fase` (`ataque` if `Match.possessionTeam === p.team`, `transicao` if `Match.possessionTimer < 4`, else `defesa`), `dEsperada` = distance from `p.model.position` to the BT slot target on the XZ plane, `bolaPerto` = ball within 18 m, `ofereceLinha` (attack: no opponent within 4 m of the line carrier→p, via the existing pass-lane helper in `pass_candidates.js` if it exposes one; else false), `fechaLinha`/`pressiona` (defense: p is the nearest teammate to the ball or between ball and own goal within the lateral tolerance). Cost target ≤ 0.2 ms per sample pass (22 players); measure in Task 11.
- [ ] **Step 4: Hook the tick.** In `js/match/match_loop.js`, in the main update where `MatchStats.registarZona`/`Eventos.varrer(dt)` is called (line ~1222), add `if (typeof Notas !== 'undefined') Notas.tick(dt);`. Pause/replay: only tick while the match state is `playing` (same condition as `Eventos.varrer`).
- [ ] **Step 5: Run** all `tests/notas_*.test.js` + `node --test tests/segundo_tempo.test.js tests/sim_amostragem.test.js` → PASS.
- [ ] **Step 6: Commit** — `git commit -am "feat(notas): amostragem tatica periodica"`

---

### Task 9: Result to the manager + history

**Files:**
- Modify: `js/narracao/ponte.js` (`resultado()` ~729, halftime notes message ~54/597), `manager:types.ts` (~856), `manager:context/GameContext.tsx` (~982, ~1050, ~1426)
- Test: `tests/ponte_manager.test.js` style — add `tests/notas_ponte.test.js`

**Interfaces:**
- Consumes: `Notas.resultado()` (Task 6).
- Produces: `resultado().notas` = `Record<id, {nota,tatico,tecnico,participacao,disciplina,minutos,moc,pos,equipa}>`; manager: `Fixture.ratingDetalhes?: Record<string, RatingDetalhe>`, `Fixture.motm?: string`, `Player`-side history `ratingHistorico?: Record<string, {fixtureId:string; nota:number; minutos:number; motm:boolean}[]>` in the game state.

- [ ] **Step 1: Failing test** `tests/notas_ponte.test.js`: with the harness, call `Ponte.resultado()` after seeding `Notas` with a rated player and assert `r.notas[id].nota` is a number in [1,10] and `r.notas[id]` has the 4 components.
- [ ] **Step 2: Implement `ponte.js`:** in `resultado()` add `notas: (typeof Notas !== 'undefined') ? Notas.resultado() : {},` to the returned object.
- [ ] **Step 3: Manager types (`manager:types.ts`)** — next to `playerRatings?` (line 856) add:

```ts
export interface RatingDetalhe { nota: number; tatico: number; tecnico: number; participacao: number; disciplina: number; minutos: number; moc?: boolean; }
// em Fixture:
  ratingDetalhes?: Record<string, RatingDetalhe>; // playerId -> detalhes da nota (jogos 3D)
  motm?: string; // playerId do Man of the Match (jogos 3D)
```

- [ ] **Step 4: GameContext** — find where the 3D result is applied to the fixture (read `GameContext.tsx` around lines 982 and 1426, and where `resultado.golos/cartoes/eventos` from `Ponte` are mapped — grep `resultado3d\|\.relato\|estatisticas3d`). When `resultado.notas` is non-empty: set `playerRatings = Object.fromEntries(Object.entries(notas).map(([id,d]) => [id, d.nota]))`, `ratingDetalhes = notas`, `motm = id with moc`, **instead of** calling `calculateMatchRatings` for that fixture. Keep the `calculateMatchRatings` fallback for text-sim fixtures and for 3D fixtures without `notas`. Players' `ratingHistorico` entries are appended where `playerRatings` currently feed season stats (line ~1058): one `{fixtureId, nota, minutos, motm}` per player (guard against duplicates by `fixtureId`).
- [ ] **Step 5: Type-check and run** — from `Football Manager/`: `npx tsc --noEmit -p .` (expect no new errors) and `node --test 3dMatch/simulador3d/tests/notas_ponte.test.js` → PASS. Also `npm run teste:base` → PASS.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(notas): resultado 3D com notas e historico no manager"`

---

### Task 10: Result screen table (colors, MoM, details)

**Files:**
- Modify: `js/main.js` (~977 `mostrarNotasIntervalo`), `index.html` (`#modal-notas`), `css/styles.css`
- Test: `tests/notas_cores.test.js` (pure color function)

**Interfaces:**
- Consumes: manager message `notas` currently `{ casa:{nome,jogadores:[{nome,nota}]}, fora:{...} }` (halftime/fim) — extend each `jogadores` item with optional `pos, minutos, golos, assistencias, moc, detalhes{tatico,tecnico,participacao,disciplina}, destaque` and the manager side that builds this message (grep `tipo: 'notas'` in `manager:components/MatchDay.tsx` / `3dMatch/`) to fill them from `fixture.ratingDetalhes` + events.

- [ ] **Step 1: Failing test** for the color function, exported for Node (`js/ratings/notas_ligacao.js`): `Notas.corDaNota(n)`:

```js
test('corDaNota segue as faixas da especificacao', () => {
    const N = require('../js/ratings/notas_ligacao.js');
    assert.strictEqual(N.corDaNota(9.4), '#1b8a3a');
    assert.strictEqual(N.corDaNota(8.0), '#37b24d');
    assert.strictEqual(N.corDaNota(7.9), '#82c91e');
    assert.strictEqual(N.corDaNota(6.0), '#fcc419');
    assert.strictEqual(N.corDaNota(5.9), '#fd9a14');
    assert.strictEqual(N.corDaNota(4.0), '#e8590c');
    assert.strictEqual(N.corDaNota(3.9), '#e03131');
});
```

Note `notas_ligacao.js` references `NotasMotor` only inside functions, so `require` works in Node.
- [ ] **Step 2: Implement** `corDaNota(n)` in `Notas`: `n>=9 → '#1b8a3a'; >=8 → '#37b24d'; >=7 → '#82c91e'; >=6 → '#fcc419'; >=5 → '#fd9a14'; >=4 → '#e8590c'; else '#e03131'`.
- [ ] **Step 3: UI** — in `mostrarNotasIntervalo` render a table per team: columns Jogador, Pos, Min, Nota (background `Notas.corDaNota`), ⚽, 🅰, plus stats; row classes: `.moc` (gold border + "MoM"), `.pior` (lowest 2 ratings per team), `.destaque-def` (≥ 6 `nDef`-type events, send `def` count in the message). Row click toggles a sub-row with 4 bars (width = component score %). Keep the existing simple fallback when a player has no details. Style in `css/styles.css` next to `.mn-linha`.
- [ ] **Step 4: Verify in the app** — use the `run` skill to start the 3D simulator, play a quick match to halftime, and check the table renders, colors match bands, MoM badge shows at full time. Report honestly what was/wasn't verified visually.
- [ ] **Step 5: Run** `node --test tests/notas_cores.test.js tests/notas_*.test.js` → PASS.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(notas): tabela de notas no ecra de resultado"`

---

### Task 11: Batch calibration + performance budget

**Files:**
- Create: `tools/scratch/notas_lote.js`
- Test: `tests/notas_lote.test.js` (short smoke: 1 game, headless)

**Interfaces:**
- Consumes: headless harness (see `tools/headless/lote_jogos.js` for how to simulate N full games), `Notas.resultado()`.

- [ ] **Step 1: Write `tools/scratch/notas_lote.js`**: for each of N games (arg, default 10) run the headless match to the end like `lote_jogos.js`, collect all ratings, print: mean/stdev overall and by position group, share of ≥9.0 and ≤4.0, MoM position distribution, and wall time spent in `Notas.tick` (wrap with `performance.now()`), as ms per call and per simulated minute.
- [ ] **Step 2: Run** `node tools/scratch/notas_lote.js 20`. Targets: mean 6.2–6.6; stdev 0.6–1.0; ≥9.0 below 2%; ≤4.0 below 3%; every position group's mean within ±0.4 of the overall mean; MoM not >50% strikers; `Notas.tick` ≤ 0.3 ms per sampling pass.
- [ ] **Step 3: Tune** `notas_config.js` until targets hold; re-run `tests/notas_motor.test.js` and `tests/notas_calibracao.test.js` after every change. Paste final numbers in the commit message.
- [ ] **Step 4: Smoke test** `tests/notas_lote.test.js`: simulate a short match (reuse the pattern from `tests/sim_amostragem.test.js`), assert every rated player has `1 ≤ nota ≤ 10`, at least 11 per team rated, and that a MoM exists.
- [ ] **Step 5: Run the whole suite** `node --test tests/*.test.js` from `simulador3d/` and `npm run teste:base` from the manager; report any pre-existing failures separately (compare against `git stash` baseline if anything fails outside `notas_*`).
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat(notas): calibracao em lote e orcamento de desempenho"`

---

## Self-Review

- **Spec coverage:** scale/color bands (T1, T10); 4 components + weights (T1); technical/participation/discipline events (T1, T6, T7); tactical behavior with context (T3, T8); per-position profiles (T1 config, T2 test); Playing Styles only in compatible positions (T1, T2); event impact table (T1 config); anti double count (T1 `evId`, T6 shot/goal rule, T4); position/context/proportion limits via tanh saturation (T1); performance (T8 interval, T11 budget); final formula and clamp (T1); minutes/substitutions/reserve neutral (T1, T2, T7); Man of the Match with participation threshold (T5); UI table, highlights, category details (T10); history fields (T9); calibration scenarios (T5, T11). Text-sim intentionally untouched.
- **Known open points the implementer must resolve by reading code (flagged in tasks):** exact real field names for style/position/slot target (T6 step 1, T8 step 1); `DEFESA` event lacks xG (T6); exact hook placement lines in `match_physics.js`/`fsm.js` (T7); where the manager builds the `notas` message and applies the 3D result to the fixture (T9, T10). Each task says what to grep and what to preserve.
- **Type consistency:** `NotasMotor.{entrar,sair,evento,amostrar,qualidadeTatica,perda,remateAdversario,detalhes,nota,melhor}`, `Notas.{iniciar,registarJogador,tackle,intercecao,corte,duelo,passeProgressivo,perda,tick,resultado,corDaNota}` and `RatingDetalhe` are used with the same names in all tasks. Note `qualidadeTatica` and `amostrar` take `(id, ctx)` in T3's code and tests, consistent with T8's call.
