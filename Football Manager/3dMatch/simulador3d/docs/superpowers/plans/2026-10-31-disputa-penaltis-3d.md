# Disputa de pênaltis em 3D — plano de implementação

> **Para agentes:** SUB-SKILL OBRIGATÓRIA: usar superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para implementar este plano tarefa a tarefa. Os passos usam caixas `- [ ]`.

**Objetivo:** Quando um jogo de copa visto em 3D termina empatado (aos 90' mais o acréscimo), o 3D encena a disputa de pênaltis completa (técnicos, meia-lua, sorteio, ordem dos batedores, cobranças pela física real) e devolve `pens` à app.

**Arquitetura:** Um módulo novo (`js/disputa_penaltis.js`) conduz um estado `DISPUTA` do `Match` e reaproveita o motor do pênalti em jogo para a cobrança. A geometria vive num módulo puro (`js/config/disputa.js`) testável sem THREE. A app (`MatchDay`) é a única árbitra das regras (`textSim/penaltyShootout.ts`); o 3D reporta cada cobrança e a app responde com o próximo batedor ou o fim.

**Stack:** JS clássico sem build no 3D (testes `node`, harness jsdom em `tools/headless/harness.js`), TypeScript/React no manager (testes `tsx --test`).

Spec: `docs/superpowers/specs/2026-10-31-disputa-penaltis-3d-design.md`.

## Mudanças em relação à spec (descobertas ao ler o código)

1. **O técnico já existe no 3D**: `Bancos.bancos[i].treinador` (`js/bancos.js`), de fato e gravata, com a cor do fato escolhida pelo clube. O plano **reaproveita esse técnico** em vez de criar outro. O aspeto do `ManagerAvatar` não é aplicado (fica fora do escopo). Se `Bancos` estiver desligado, a meia-lua forma em volta de um ponto vazio.
2. **Os dois bancos ficam do mesmo lado (+X)**, então os dois técnicos ficam em x = +30, em z de cada banco.
3. **Não existe `executarPenalti`**; o chute é `baterPenalti` (`js/player.js:2184`), que no contato troca o estado para `PLAY`. O plano chama `Match.iniciarPenaltiDaDisputa` (novo), sem `setupSetPiece`, porque este teletransporta os 20 outros jogadores para a fila da área.
4. **O resultado da disputa chega à app antes de o jogo ser gravado nas copas.** A app guarda `pens` numa referência e grava em `comps` quando `disputaPendente` aparecer para esse jogo (a fixture `fix-cup-<matchId>` liga o jogo à copa).
5. **Goleiro expulso: troca obrigatória (Tarefa 6).** Hoje o goleiro expulso só sai da lista e o jogo segue sem goleiro. Passa a valer a regra pedida: o técnico tira um jogador de linha e põe um goleiro reserva. Time do usuário: o jogo pausa, abre o MATCH TACTICS com aviso e só segue com a troca (ou, passados 20 s de jogo parado, o 3D escolhe sozinho). CPU: troca automática. Sem goleiro reserva no banco, ou com as 5 substituições já usadas: o jogador de linha com melhor nota de goleiro assume o gol com o uniforme de goleiro, sem gastar substituição. Assim todo time chega à disputa com goleiro em campo; `podeIniciar` mantém a checagem só como rede de segurança.

## Restrições globais

- Eixos do campo: x lateral de −34 a +34 (`CAMPO_LARG` 68), z de −53 a +53 (`CAMPO_COMP` 106). `Match.players` = TeamA = casa; `Match.opponents` = TeamB = fora.
- Técnicos 4 m para dentro da linha lateral; meia-lua em duas fileiras de raios 5 m e 7 m; goleiro que espera a 5 m da linha de fundo, entre a pequena e a grande área; bandeirinha sobre a linha de fundo em cima da linha da grande área.
- Só os jogadores em campo no fim (`Match.players` e `Match.opponents` já excluem expulsos e substituídos) podem bater.
- Resultado de cada cobrança vindo da física real: `gol`, `defesa`, `trave` ou `fora`.
- Regras da disputa só em `textSim/penaltyShootout.ts`. Sem cópia em JS.
- Goleiro expulso: troca obrigatória por um goleiro reserva (um jogador de linha sai); sem reserva ou com 5 trocas feitas, um jogador de linha vai ao gol. Máximo de 5 substituições por time.
- Sem 3D embutido (`window.parent === window`) ou sem `decisao` no `iniciar`: nada muda (vai direto a `FIM_DE_JOGO`).
- Sem resposta da app em 30 s: a disputa é abortada e o jogo termina como hoje.
- ESC durante a REUNIÃO, o PREPARO ou a TROCA leva todos às posições; nunca salta cobranças.
- Comentários e nomes no estilo do repo: português, sem acentos nos identificadores.
- Testes do 3D: `node --test --test-force-exit 3dMatch/simulador3d/tests/<nome>.test.js`. Testes do manager: `npx tsx --test tests/<nome>.test.ts`.

## Estrutura de ficheiros

| Ficheiro | Ação | Responsabilidade |
|---|---|---|
| `3dMatch/simulador3d/js/config/disputa.js` | criar | `DisputaModel`: constantes e geometria pura (meia-lua, fila central, posições) |
| `3dMatch/simulador3d/js/disputa_penaltis.js` | criar | `DisputaPenaltis`: fases, movimento, cobrança, mensagens |
| `3dMatch/simulador3d/js/match/match_setpieces.js` | alterar | `Match.iniciarPenaltiDaDisputa` |
| `3dMatch/simulador3d/js/match/match_loop.js` | alterar | `encerrarJogo`, intercepto do fim, ramo `DISPUTA`, relógio e trocas parados |
| `3dMatch/simulador3d/js/match/match_physics.js` | alterar | gol, bola fora e trave durante a disputa |
| `3dMatch/simulador3d/js/match/match_ui.js` | alterar | câmera da disputa |
| `3dMatch/simulador3d/js/player.js` | alterar | `disputaOrdem` (o jogador é movido pela disputa) |
| `3dMatch/simulador3d/js/officials.js` | alterar | oficiais movidos pela disputa |
| `3dMatch/simulador3d/js/bancos.js` | alterar | o técnico deixa de passear durante a disputa |
| `3dMatch/simulador3d/js/narracao/ponte.js` | alterar | `decisao`, mensagens `disputa_*`, ESC |
| `3dMatch/simulador3d/index.html` | alterar | `<script>` dos dois ficheiros novos |
| `3dMatch/simulador3d/tools/headless/harness.js` | alterar | os dois ficheiros novos na lista |
| `3dMatch/simulador3d/tests/disputa_posicoes.test.js` | criar | geometria |
| `3dMatch/simulador3d/tests/disputa_cobranca.test.js` | criar | cobrança real, resultado e relógio |
| `3dMatch/simulador3d/tests/disputa_fluxo.test.js` | criar | fluxo completo com ponte falsa |
| `textSim/competitions.ts` | alterar | `decisaoDoConfronto` |
| `3dMatch/disputa3d.ts` | criar | funções puras da app: ids, ordens, próxima cobrança |
| `tests/disputa3d.test.ts` | criar | testes das duas peças acima |
| `context/GameContext.tsx` | alterar | `pens3d`, mensagens, `decisao` |
| `components/MatchDay.tsx` | alterar | modal da ordem por cima do iframe, placar dos pênaltis |
| `3dMatch/Simulador3DView.tsx` | alterar | passa `decisao` ao `iniciar` |
| `3dMatch/simulador3d/js/match/match_substituicoes.js` | alterar | goleiro expulso: `goleiroExpulso`, espera, troca urgente, jogador de linha ao gol |
| `3dMatch/simulador3d/js/treinador_cpu.js` | alterar | `saidaParaGoleiro` |
| `3dMatch/simulador3d/tests/goleiro_expulso.test.js` | criar | troca obrigatória do goleiro expulso |
| `3dMatch/simulador3d/docs/filesSummary3d.md` | alterar | documentação |

---

### Tarefa 1: Geometria pura (`DisputaModel`)

**Arquivos:**
- Criar: `3dMatch/simulador3d/js/config/disputa.js`
- Criar: `3dMatch/simulador3d/tests/disputa_posicoes.test.js`
- Alterar: `3dMatch/simulador3d/index.html` (depois de `js/config/tunel.js`), `3dMatch/simulador3d/tools/headless/harness.js` (depois de `'js/config/tunel.js'`)

**Interfaces:**
- Produz (todas puras, sem THREE):
  - `DisputaModel.posTecnico(ladoBanco, zBanco) -> {x, z}`
  - `DisputaModel.meiaLua(centro, n, ladoBanco, rnd) -> [{x, z}]` (n pontos, duas fileiras)
  - `DisputaModel.filaCentral(nCasa, nFora) -> { casa: [{x, z}], fora: [{x, z}] }`
  - `DisputaModel.posMarca(sinalZ) -> {x, z}`
  - `DisputaModel.posEsperaBatedor(sinalZ) -> {x, z}`
  - `DisputaModel.posGoleiroEspera(sinalZ, ladoX) -> {x, z}`
  - `DisputaModel.posBandeirinha(sinalZ, ladoX) -> {x, z}`
  - `DisputaModel.posJuiz(sinalZ) -> {x, z}`
  - `DisputaModel.posGol(sinalZ) -> {x, z}` (centro da linha de fundo)

- [ ] **Passo 1: Escrever o teste que falha**

```js
/*
A DISPUTA DE PENALTIS, a geometria (js/config/disputa.js): a meia-lua em volta do tecnico, a fila do meio-campo e os postos junto da baliza.
Medidas pedidas: tecnico 4 m para dentro da linha lateral; goleiro que espera a 5 m da linha de fundo entre a pequena e a grande area; bandeirinha sobre a
linha de fundo em cima da linha da grande area. Corre com: node --test tests/disputa_posicoes.test.js
*/
const fs = require('fs');
const path = require('path');
const assert = require('assert');
const test = require('node:test');

const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
const semCR = s => s.split(CR + LF).join(LF);
const src = semCR(fs.readFileSync(path.join(__dirname, '..', 'js', 'config', 'disputa.js'), 'utf8'));
const ini = src.indexOf('const DisputaModel = {');
const fim = src.indexOf(LF + '};', ini);
const DM = new Function(`${src.slice(ini, fim + 3)}; return DisputaModel;`)();

// Gerador pseudo-aleatorio determinista (mulberry32).
const semente = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

test('o tecnico fica 4 m para dentro da linha lateral, do lado do banco', () => {
    const t = DM.posTecnico(1, -8);
    assert.strictEqual(t.x, 30);
    assert.strictEqual(t.z, -8);
    assert.strictEqual(DM.posTecnico(-1, 8).x, -30);
});

test('a meia-lua: n pontos, dentro do campo, de frente para o campo, sem colisao', () => {
    for (const n of [1, 5, 10, 11]) {
        for (let s = 1; s <= 30; s++) {
            const tec = DM.posTecnico(1, s % 2 ? -8 : 8);
            const pts = DM.meiaLua(tec, n, 1, semente(s));
            assert.strictEqual(pts.length, n);
            for (const p of pts) {
                assert.ok(Math.abs(p.x) <= 34 && Math.abs(p.z) <= 53, `fora do campo: ${JSON.stringify(p)}`);
                assert.ok(p.x <= tec.x + 1e-9, 'um jogador ficou atras do tecnico, entre ele e a linha lateral');
                const d = dist(p, tec);
                assert.ok(d >= 4.5 && d <= 7.5, `raio ${d.toFixed(2)} fora das duas fileiras`);
            }
            for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
                assert.ok(dist(pts[i], pts[j]) >= DM.meiaLuaCfg.distMin - 1e-9, `colisao (semente ${s}, n ${n})`);
            }
        }
    }
});

test('as meias-luas dos dois times nao se tocam', () => {
    const a = DM.meiaLua(DM.posTecnico(1, -8), 11, 1, semente(3));
    const b = DM.meiaLua(DM.posTecnico(1, 8), 11, 1, semente(4));
    for (const p of a) for (const q of b) assert.ok(dist(p, q) >= 1.2);
});

test('a fila do meio-campo: sobre a linha do meio, um time de cada lado da marca', () => {
    const f = DM.filaCentral(11, 10);
    assert.strictEqual(f.casa.length, 11);
    assert.strictEqual(f.fora.length, 10);
    assert.ok(f.casa.every(p => p.z === 0) && f.fora.every(p => p.z === 0));
    assert.ok(f.casa.every(p => p.x < 0) && f.fora.every(p => p.x > 0));
    const xs = f.casa.map(p => p.x).sort((a, b) => b - a);
    xs.forEach((x, i) => { if (i) assert.ok(Math.abs((xs[i - 1] - x) - DM.fila.passo) < 1e-9, 'espacamento irregular'); });
    assert.ok(Math.abs(f.casa[0].x) >= DM.fila.folgaDaMarca && Math.abs(f.fora[0].x) >= DM.fila.folgaDaMarca, 'colado a marca do meio');
});

test('a marca do penalti e o batedor a espera, para cada baliza', () => {
    for (const s of [1, -1]) {
        const m = DM.posMarca(s);
        assert.strictEqual(m.x, 0);
        assert.ok(Math.abs(m.z - s * (53 - 11)) < 1e-9);
        const e = DM.posEsperaBatedor(s);
        assert.ok(Math.abs(e.z - (m.z - s * 5.7)) < 1e-9, 'a espera e recuoBatedor atras da marca');
        const g = DM.posGol(s);
        assert.deepStrictEqual(g, { x: 0, z: s * 53 });
    }
});

test('o goleiro que espera: 5 m da linha de fundo, entre a pequena e a grande area', () => {
    for (const s of [1, -1]) for (const lx of [1, -1]) {
        const p = DM.posGoleiroEspera(s, lx);
        assert.ok(Math.abs(Math.abs(p.z) - (53 - 5)) < 1e-9, 'a 5 m da linha de fundo');
        assert.strictEqual(Math.sign(p.z), s);
        assert.strictEqual(Math.sign(p.x), lx);
        assert.ok(Math.abs(p.x) > 9.16 && Math.abs(p.x) < 20.16, 'entre a linha da pequena area e a da grande');
    }
});

test('o bandeirinha: sobre a linha de fundo, em cima da linha da grande area', () => {
    for (const s of [1, -1]) for (const lx of [1, -1]) {
        const p = DM.posBandeirinha(s, lx);
        assert.strictEqual(Math.abs(p.z), 53);
        assert.strictEqual(Math.sign(p.z), s);
        assert.ok(Math.abs(Math.abs(p.x) - 20.16) < 1e-9);
        assert.strictEqual(Math.sign(p.x), lx);
    }
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node --test --test-force-exit 3dMatch/simulador3d/tests/disputa_posicoes.test.js`
Esperado: FAIL (`ENOENT ... js/config/disputa.js`).

- [ ] **Passo 3: Implementar `js/config/disputa.js`**

```js
/*
=============================================================================
A DISPUTA DE PENALTIS — as medidas (ver js/disputa_penaltis.js)
=============================================================================
Geometria PURA (sem THREE): os testes (tests/disputa_posicoes.test.js) leem este ficheiro e correm as funcoes. Eixos: x lateral (-34..+34), z do campo (-53..+53);
`sinalZ` e o sinal da baliza usada (+1: baliza em z = +53), `ladoBanco` o sinal de x onde ficam os bancos e os tecnicos.

  tecnico    4 m para dentro da linha lateral, em z perto do meio-campo, no lado do banco do time (`posTecnico`).
  meia-lua   o time em duas fileiras (raios 5 m e 7 m) em volta do tecnico, abertas para o campo, em posicoes aleatorias sem colisao (`meiaLua`).
  fila       os que esperam, lado a lado sobre a linha do meio, um time de cada lado da marca central (`filaCentral`).
  baliza     o goleiro que NAO defende espera na lateral da area (5 m da linha de fundo, entre as linhas da pequena e da grande area); o bandeirinha fica sobre a
             linha de fundo, em cima da linha da grande area.
=============================================================================
*/
const DisputaModel = {
    campo: { larg: typeof CAMPO_LARG !== 'undefined' ? CAMPO_LARG : 68, comp: typeof CAMPO_COMP !== 'undefined' ? CAMPO_COMP : 106 },
    area: {
        marcaZ: typeof Area !== 'undefined' ? Area.distanciaPenalti : 11.0,           // da linha de fundo a marca
        pequenaMeiaLargura: typeof Area !== 'undefined' ? Area.pequenaMeiaLargura : 9.16,
        grandeMeiaLargura: typeof Area !== 'undefined' ? Area.meiaLargura : 20.16
    },
    recuoBatedor: typeof PenaltyModel !== 'undefined' ? PenaltyModel.recuoBatedor : 5.7,   // onde o batedor espera, atras da marca
    tecnico: { recuoDaLinha: 4.0, zDoMeio: 8.0 },
    // `distMin`: distancia minima entre dois jogadores (m, garantida pelo `jitter` pequeno); `abertura`: abertura do arco (rad); `jitter`: fracao do passo angular que o sorteio pode mexer.
    meiaLuaCfg: { raios: [5.0, 7.0], abertura: Math.PI * 0.9, jitter: 0.3, distMin: 1.2 },
    fila: { passo: 1.15, folgaDaMarca: 1.5 },
    goleiroEspera: { recuoDaLinhaDeFundo: 5.0 },
    juiz: { ladoDaMarca: 4.5 },
    velocidade: { jogador: 1.9, tecnico: 1.4, juiz: 1.9, goleiro: 2.4, bandeirinha: 2.4 },
    prazo: { reuniao: 45, preparo: 30, app: 30, cobranca: 7 },
    pausa: { entrega: 1.0, ajeitar: 0.8, aposContato: 1.2, fim: 4.0 },

    // O tecnico, ao lado do banco: `zBanco` e o z do centro do banco do time; fica a `zDoMeio` do meio-campo, no mesmo lado do eixo.
    posTecnico(ladoBanco, zBanco) {
        return { x: ladoBanco * (this.campo.larg / 2 - this.tecnico.recuoDaLinha), z: (Math.sign(zBanco) || 1) * (Math.abs(zBanco) < this.tecnico.zDoMeio ? Math.abs(zBanco) : this.tecnico.zDoMeio) };
    },

    /*
    A meia-lua: `n` pontos em volta de `centro`, abertos para o CAMPO (o lado oposto ao banco). Duas fileiras: a de dentro (raio menor) leva ceil(n/2). Em cada uma os angulos
    saem equidistantes dentro da abertura, com um sorteio de ate `jitter` do passo angular — posicoes aleatorias, mas nunca coladas (distMin).
    */
    meiaLua(centro, n, ladoBanco, rnd) {
        const C = this.meiaLuaCfg;
        const out = [];
        const nInterna = Math.ceil(n / 2);
        const fileiras = [{ r: C.raios[0], m: nInterna }, { r: C.raios[1], m: n - nInterna }];
        for (const f of fileiras) {
            for (let i = 0; i < f.m; i++) {
                const passo = C.abertura / f.m;
                const ang = -C.abertura / 2 + (i + 0.5) * passo + (rnd() - 0.5) * 2 * C.jitter * passo * 0.5;
                out.push({ x: centro.x - ladoBanco * f.r * Math.cos(ang), z: centro.z + f.r * Math.sin(ang) });
            }
        }
        // Mais de uma volta para baralhar quem fica em cada lugar (o sorteio e dos lugares, nao dos jogadores: quem chama atribui por indice).
        for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = out[i]; out[i] = out[j]; out[j] = t; }
        return out;
    },

    // Lado a lado sobre a linha do meio (z = 0): a casa para -x, o fora para +x, a partir da marca central, `passo` entre eles.
    filaCentral(nCasa, nFora) {
        const F = this.fila;
        const fazer = (n, s) => Array.from({ length: n }, (_, i) => ({ x: s * (F.folgaDaMarca + i * F.passo), z: 0 }));
        return { casa: fazer(nCasa, -1), fora: fazer(nFora, 1) };
    },

    posGol(sinalZ) { return { x: 0, z: sinalZ * this.campo.comp / 2 }; },
    posMarca(sinalZ) { return { x: 0, z: sinalZ * (this.campo.comp / 2 - this.area.marcaZ) }; },
    posEsperaBatedor(sinalZ) { const m = this.posMarca(sinalZ); return { x: 0, z: m.z - sinalZ * this.recuoBatedor }; },
    posJuiz(sinalZ) { const m = this.posMarca(sinalZ); return { x: this.juiz.ladoDaMarca, z: m.z }; },

    // O goleiro que nao defende: 5 m da linha de fundo, a meio caminho entre a linha da pequena e a da grande area, do lado `ladoX`.
    posGoleiroEspera(sinalZ, ladoX) {
        const A = this.area;
        return { x: ladoX * (A.pequenaMeiaLargura + A.grandeMeiaLargura) / 2, z: sinalZ * (this.campo.comp / 2 - this.goleiroEspera.recuoDaLinhaDeFundo) };
    },

    // O bandeirinha: sobre a linha de fundo, em cima da linha lateral da grande area.
    posBandeirinha(sinalZ, ladoX) { return { x: ladoX * this.area.grandeMeiaLargura, z: sinalZ * this.campo.comp / 2 }; }
};
if (typeof window !== 'undefined') window.DisputaModel = DisputaModel;
```

- [ ] **Passo 4: Rodar e ver passar**

Run: `node --test --test-force-exit 3dMatch/simulador3d/tests/disputa_posicoes.test.js`
Esperado: PASS (7 testes). Se a colisão falhar em alguma semente, reduza `jitter` para 0,2 em `meiaLuaCfg` até passar nas 30 sementes.

- [ ] **Passo 5: Registrar o ficheiro no jogo e no harness**

Em `index.html`, depois da linha do `js/config/tunel.js`, acrescentar `<script src="js/config/disputa.js"></script>`. Em `tools/headless/harness.js`, na lista `FICHEIROS`, acrescentar `'js/config/disputa.js'` depois de `'js/config/tunel.js'`.

Run: `node 3dMatch/simulador3d/tests/abertura_tunel.test.js`
Esperado: termina sem `X` (a abertura continua a funcionar com o ficheiro novo carregado).

- [ ] **Passo 6: Commit**

```bash
git add "3dMatch/simulador3d/js/config/disputa.js" "3dMatch/simulador3d/tests/disputa_posicoes.test.js" "3dMatch/simulador3d/index.html" "3dMatch/simulador3d/tools/headless/harness.js"
git commit -m "feat(3d): geometria da disputa de penaltis (meia-lua, fila, postos)"
```

---

### Tarefa 2: A cobrança real (o miolo)

Esta é a tarefa de maior risco: prova que o motor do pênalti em jogo serve a disputa (batedor e goleiro escolhidos de fora, 20 jogadores quietos, resultado classificado, relógio e placar intactos). Faz-se antes da coreografia.

**Arquivos:**
- Criar: `3dMatch/simulador3d/js/disputa_penaltis.js` (só o miolo da cobrança)
- Alterar: `js/match/match_setpieces.js`, `js/match/match_loop.js`, `js/match/match_physics.js`, `js/player.js`, `index.html`, `tools/headless/harness.js`
- Criar: `3dMatch/simulador3d/tests/disputa_cobranca.test.js`

**Interfaces:**
- Produz:
  - `Match.disputa` — `null` ou o objeto `DisputaPenaltis` enquanto a disputa dura.
  - `Match.iniciarPenaltiDaDisputa(batedor, goleiro) -> void` — põe a bola na marca da baliza em uso, prepara batedor e goleiro, estado `PENALTY`.
  - `Match.encerrarJogo() -> void` — a sequência de `FIM_DE_JOGO` hoje inline em `verificarFimDeTempo`.
  - `DisputaPenaltis.cobrar(lado, batedor, goleiro, aoFim)` — `aoFim(resultado)`, `resultado` em `'gol' | 'defesa' | 'trave' | 'fora'`.
  - Ganchos chamados pelo motor: `DisputaPenaltis.golNaBaliza()`, `DisputaPenaltis.bolaFora()`, `DisputaPenaltis.bateuNaTrave` (boolean), `DisputaPenaltis.update(dt)`.
  - `p.disputaOrdem` — se truthy e `DisputaPenaltis.activa`, o `player.update` chama `DisputaPenaltis.passoDoJogador(p, dt)` e retorna.

- [ ] **Passo 1: Escrever o teste que falha**

```js
/*
A COBRANCA DA DISPUTA (js/disputa_penaltis.js + Match.iniciarPenaltiDaDisputa): o motor do penalti em jogo serve a disputa. O batedor e o goleiro escolhem-se de fora;
o resultado vem da fisica (gol, defesa, trave, fora); o placar e o relogio nao mexem; os outros 20 ficam onde estao.
Corre com: node tests/disputa_cobranca.test.js
*/
const assert = require('assert');
require('../tools/headless/harness.js');

const dt = 1 / 60;
let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
Match.init(cena);
Officials.init(cena);
Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);

const gk = (lista) => lista.find(p => p.role === 'gk');
const batedoresA = Match.players.filter(p => p.role !== 'gk');
// Quem esta em coreografia fica quieto (o `passoDoJogador` da disputa): todos menos o batedor e o goleiro.
const quieto = () => ({ wps: [], i: 0, chegou: true, vel: 0, yaw: 0, olhar: { x: 0, z: 0 } });
const congelarOutros = (batedor, goleiro) => Match.players.concat(Match.opponents).forEach(p => { p.disputaOrdem = (p === batedor || p === goleiro) ? null : quieto(); });

console.log('1 — 30 cobrancas seguidas: sempre um resultado valido, sem travar');
const ver = { gol: 0, defesa: 0, trave: 0, fora: 0 };
Match.placarA = 0; Match.placarB = 0; Match.tempoDeJogo = 1000;
Match.disputa = DisputaPenaltis; DisputaPenaltis.activa = true;
for (let k = 0; k < 30; k++) {
    const batedor = batedoresA[k % batedoresA.length];
    const goleiro = gk(Match.opponents);
    let resultado = null;
    DisputaPenaltis.sinalZ = (k % 2) ? 1 : -1;
    congelarOutros(batedor, goleiro);
    DisputaPenaltis.cobrar('casa', batedor, goleiro, (r) => { resultado = r; });
    let n = 0;
    while (resultado === null && n < 60 * 25) { Match.update(dt); n++; }
    verifica(resultado !== null, `cobranca ${k + 1}: ${resultado} (${(n * dt).toFixed(1)} s)`, `cobranca ${k + 1} nao acabou em 25 s`);
    if (resultado !== null) ver[resultado] = (ver[resultado] || 0) + 1;
    assert.ok(['gol', 'defesa', 'trave', 'fora'].includes(resultado), 'resultado invalido: ' + resultado);
    Match.mudarEstado('DISPUTA', 'teste');
}
console.log('   distribuicao:', JSON.stringify(ver));
verifica(ver.gol > 5 && ver.gol < 30, 'ha golos e nem tudo e golo', 'distribuicao estranha: ' + JSON.stringify(ver));

console.log('2 — o placar e o relogio nao mexem durante a disputa');
verifica(Match.placarA === 0 && Match.placarB === 0, 'placar 0-0', `placar mexeu: ${Match.placarA}-${Match.placarB}`);
verifica(Match.tempoDeJogo === 1000, 'relogio parado', `relogio mexeu: ${Match.tempoDeJogo}`);

console.log('3 — os outros jogadores ficam onde estao quando tem disputaOrdem');
const batedor = batedoresA[0];
const goleiro = gk(Match.opponents);
congelarOutros(batedor, goleiro);
const posOutros3 = Match.players.concat(Match.opponents).filter(p => p !== batedor && p !== goleiro).map(p => ({ p, x: p.model.position.x, z: p.model.position.z }));
let r2 = null;
DisputaPenaltis.sinalZ = 1;
DisputaPenaltis.cobrar('casa', batedor, goleiro, (r) => { r2 = r; });
for (let n = 0; r2 === null && n < 60 * 25; n++) Match.update(dt);
const mexeu = posOutros3.filter(o => Math.hypot(o.p.model.position.x - o.x, o.p.model.position.z - o.z) > 0.01);
verifica(mexeu.length === 0, 'os que estao em coreografia nao se mexeram', `${mexeu.length} jogadores mexeram-se`);

console.log('4 — o goleiro tambem pode bater (o papel volta ao fim)');
const gkA = gk(Match.players);
congelarOutros(gkA, gk(Match.opponents));
let r3 = null;
DisputaPenaltis.sinalZ = 1;
DisputaPenaltis.cobrar('casa', gkA, gk(Match.opponents), (r) => { r3 = r; });
for (let n = 0; r3 === null && n < 60 * 25; n++) Match.update(dt);
verifica(r3 !== null, `o goleiro bateu: ${r3}`, 'a cobranca do goleiro nao acabou');
verifica(gkA.role === 'gk', 'o papel gk foi reposto', 'o goleiro ficou sem o papel gk');

DisputaPenaltis.activa = false; Match.disputa = null;
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node 3dMatch/simulador3d/tests/disputa_cobranca.test.js`
Esperado: falha ao carregar (`DisputaPenaltis is not defined`).

- [ ] **Passo 3: `Match.encerrarJogo` e o intercepto do fim** (`js/match/match_loop.js`)

Em `verificarFimDeTempo`, trocar o bloco do fim do 2.º tempo:

```js
            if (this.acr2Calculado && this.tempoDeJogo >= fimBase + this.acrescimo2) {
                this.updatePlacar();
                // Copa empatada, vista em 3D: a disputa de penaltis (js/disputa_penaltis.js) encena-se antes do apito final.
                if (typeof DisputaPenaltis !== 'undefined' && !this.disputa && DisputaPenaltis.podeIniciar()) { DisputaPenaltis.iniciar(); return true; }
                this.encerrarJogo();
                return true;
            }
```

e acrescentar, logo antes de `verificarFimDeTempo:` (dentro do mesmo `Object.assign`), a função com o corpo que saiu:

```js
    // O APITO FINAL: fim de jogo, estatisticas e a saida de campo. Tambem e chamado pela disputa de penaltis quando acaba (ou e abortada).
    encerrarJogo: function () {
        this.mudarEstado('FIM_DE_JOGO', 'apito_final');
        this.pararTodos();
        // As estatisticas totais e a classificacao no fim do jogo (os mesmos paineis do intervalo).
        if (typeof mostrarModalIntervalo === 'function') mostrarModalIntervalo(true, 'FIM DE JOGO');
        if (typeof EfeitosSonoros !== 'undefined') EfeitosSonoros.apito(1.0);
        // No fim do jogo os 22 e o trio tambem saem de campo, pelo vao da placa (como no intervalo).
        if (typeof Abertura !== 'undefined' && Abertura.saidaIntervalo) Abertura.saidaIntervalo();
    },
```

No início de `verificarFimDeTempo` acrescentar: `if (this.disputa) return false;`.

No `update`, depois de `this.delta = dt;` e **antes** de `if (this.tickSubstituicoes)`, inserir:

```js
        // A DISPUTA DE PENALTIS (js/disputa_penaltis.js): o relogio, as trocas e a IA do treinador ficam parados; nas fases de coreografia (estado DISPUTA) so andam os
        // jogadores, os oficiais e o pessoal. Na cobranca o estado e PENALTY/PLAY e o jogo corre como num penalti, com os outros 20 em `disputaOrdem`.
        if (this.disputa) {
            this.disputa.update(dt);
            if (this.state === 'DISPUTA') {
                this.players.forEach(p => p.update(dt));
                this.opponents.forEach(p => p.update(dt));
                if (typeof Officials !== 'undefined') Officials.update(dt);
                if (typeof Bancos !== 'undefined') Bancos.update(dt);
                if (typeof Staff !== 'undefined' && Staff.update) Staff.update(dt);
                if (typeof Crowd !== 'undefined' && !(typeof Config !== 'undefined' && Config.enableCrowd === false)) Crowd.update(dt);
                this.somDoEstadio(dt);
                return;
            }
        }
```

E envolver com `if (!this.disputa)` as duas chamadas seguintes: `if (this.tickSubstituicoes) this.tickSubstituicoes(dt);` e `if (typeof TreinadorCPU !== 'undefined') TreinadorCPU.tick(dt);`.

A linha do relógio passa a: `if (!this.aguardaSaida2T && !this.disputa) this.tempoDeJogo += dt * clockScale;`.

- [ ] **Passo 4: `Match.iniciarPenaltiDaDisputa`** (`js/match/match_setpieces.js`, junto de `triggerPenalty`)

```js
    /*
    O PENALTI DA DISPUTA: o que o ramo PENALTY do `setupSetPiece` faz para o batedor e o goleiro, SEM o resto: a fila da entrada da area e o teletransporte do batedor ficam de
    fora, porque na disputa os outros 20 estao em coreografia (js/disputa_penaltis.js) e o batedor ja esta na espera (`posEsperaBatedor`). `sinalZ` (em Match.disputa) e a baliza
    em uso. O gesto e a corrida sao os de sempre (match_loop.js, `penaltiPendente`).
    */
    iniciarPenaltiDaDisputa: function (batedor, goleiro) {
        const D = this.disputa, DM = DisputaModel;
        const marca = DM.posMarca(D.sinalZ);
        this.ball.position.set(marca.x, BallPhysics.raio, marca.z);
        this.ballVel.set(0, 0, 0);
        this.players.concat(this.opponents).forEach(p => { p.hasBall = false; });
        this.ballCarrier = null;
        this._penPlano = null;
        this.setPieceTeam = batedor.team;
        this.setPieceTaker = batedor;
        this.mudarEstado('PENALTY', 'disputa_penalti');
        this.setPieceTeam = batedor.team;
        this.setPieceTaker = batedor;
        this.setPieceTimer = 0;
        lookAtBola(batedor.model, this.ball.position);
        batedor.fsm.changeState('SET_PIECE_WAIT');
        if (goleiro) {
            goleiro.model.position.set(0, ALTURA_BASE_Y, D.sinalZ * CAMPO_COMP / 2);
            goleiro.gkEstado = 'idle';
            goleiro.gkReagiu = false;
            goleiro.gkDelayReacao = 0;
            goleiro.dive = null;
            lookAtBola(goleiro.model, this.ball.position);
            goleiro.resetBonesToDefault();
        }
        this.penaltiPendente = true;
        this.penaltiAtraso = DM.pausa.ajeitar + 0.6;
    },
```

Nota: `mudarEstado('PENALTY', ...)` não limpa `setPieceTaker` (só `PLAY` limpa), mas repõe-se por segurança depois dele, como no código acima.

- [ ] **Passo 5: Interceptar gol, bola fora e trave** (`js/match/match_physics.js`)

No ramo do gol (`if (Math.abs(this.ball.position.x) < (LARGURA_BALIZA / 2 - 0.1) && this.ball.position.y < ALTURA_BALIZA) {`) trocar a primeira linha `if (this.state === 'PLAY') {` por:

```js
                if (this.disputa) {
                    this.disputa.golNaBaliza();   // na disputa o gol nao conta no jogo: so o resultado da cobranca
                } else if (this.state === 'PLAY') {
```

No ramo `else {` seguinte (bola fora da baliza), trocar `if (this.state === 'PLAY') {` por:

```js
                if (this.disputa) {
                    this.disputa.bolaFora();
                } else if (this.state === 'PLAY') {
```

Em `colidirComBaliza`, nas duas linhas `if (this.ultimoRemate) this.ultimoRemate.bateuNaTrave = true;` acrescentar logo a seguir: `if (this.disputa) this.disputa.bateuNaTrave = true;`.

- [ ] **Passo 6: O gancho no jogador** (`js/player.js`, em `update`, logo depois do bloco da `aberturaOrdem`)

```js
        // A disputa de penaltis (js/disputa_penaltis.js) manda neste jogador enquanto ele caminha para a meia-lua, a fila ou o posto.
        if (this.disputaOrdem && typeof DisputaPenaltis !== 'undefined' && DisputaPenaltis.activa) {
            DisputaPenaltis.passoDoJogador(this, dt);
            return;
        }
```

- [ ] **Passo 7: O miolo em `js/disputa_penaltis.js`**

```js
/*
=============================================================================
A DISPUTA DE PENALTIS EM 3D (ver docs/superpowers/specs/2026-10-31-disputa-penaltis-3d-design.md, medidas em config/disputa.js)
=============================================================================
Corre quando um jogo de copa visto no manager termina empatado (Match.decisao, mandada no `iniciar` pelo manager). Estado `DISPUTA` do Match; `Match.disputa` aponta para
este objeto enquanto dura. As REGRAS (quem bate, quando acaba) sao do manager (textSim/penaltyShootout.ts): o 3D encena, reporta o resultado de cada cobranca (gol, defesa,
trave, fora — pela fisica do penalti em jogo) e espera `disputa_proxima`.

Neste ficheiro: a COBRANCA (este bloco) e, mais abaixo, a coreografia (reuniao, preparo, troca, fim).
=============================================================================
*/
const DisputaPenaltis = {
    activa: false,
    fase: null,            // 'REUNIAO' | 'ORDEM' | 'PREPARO' | 'COBRANCA' | 'AGUARDA' | 'FIM'
    sinalZ: 1,             // a baliza em uso: z = sinalZ * 53
    bateuNaTrave: false,
    _cobranca: null,       // { lado, batedor, goleiro, aoFim, tContato, resultado, papelGuardado }

    // Os ganchos do motor (match_physics.js): so valem durante uma cobranca com o remate no ar.
    golNaBaliza() { const c = this._cobranca; if (c && !c.resultado && c.tContato !== null) c.resultado = 'gol'; },
    bolaFora() { const c = this._cobranca; if (c && !c.resultado && c.tContato !== null) this._classificarSemGol(); },

    // Defesa se o goleiro tem a bola ou foi o ultimo a toca-la; trave se bateu num poste; senao fora.
    _classificarSemGol() {
        const c = this._cobranca;
        if (c.goleiro.hasBall || Match.lastTouchedPlayer === c.goleiro) c.resultado = 'defesa';
        else if (this.bateuNaTrave) c.resultado = 'trave';
        else c.resultado = 'fora';
    },

    /*
    UMA COBRANCA. O goleiro que bate perde o papel `gk` so durante o gesto (o ramo do penalti em player.js exclui o `gk` da corrida); o papel volta no fim. `aoFim(resultado)`
    chama-se uma vez; depois o estado volta a `DISPUTA` e a bola fica onde parou.
    */
    cobrar(lado, batedor, goleiro, aoFim) {
        this.bateuNaTrave = false;
        const papelGuardado = batedor.role === 'gk' ? 'gk' : null;
        if (papelGuardado) batedor.role = 'atk';
        batedor.disputaOrdem = null;
        if (goleiro) goleiro.disputaOrdem = null;
        this._cobranca = { lado, batedor, goleiro, aoFim, tContato: null, resultado: null, papelGuardado, t: 0 };
        Match.iniciarPenaltiDaDisputa(batedor, goleiro);
    },

    // Um frame (chamado do Match.update). Na cobranca: espera o contato (o estado passa a PLAY), conta 7 s ou ate haver resultado.
    update(dt) { this.atualizarCobranca(dt); },

    atualizarCobranca(dt) {
        const c = this._cobranca;
        if (!c) return;
        c.t += dt;
        if (c.tContato === null) {
            if (Match.state === 'PLAY') c.tContato = 0;   // `baterPenalti` mudou o estado no contato
            else if (c.t > 30) { c.resultado = 'fora'; }  // a rede de seguranca: o batedor nunca chegou a bola
        } else {
            c.tContato += dt;
            if (!c.resultado) {
                const parada = Match.ballVel.length() < 0.3 && c.tContato > 1.0;
                if (c.goleiro && c.goleiro.hasBall) this._classificarSemGol();
                else if (parada || c.tContato > DisputaModel.prazo.cobranca) this._classificarSemGol();
            }
        }
        if (c.resultado) this._fimDaCobranca();
    },

    _fimDaCobranca() {
        const c = this._cobranca;
        this._cobranca = null;
        if (c.papelGuardado) c.batedor.role = c.papelGuardado;
        Match.penaltiPendente = false;
        Match.penaltiEmVoo = 0;
        Match.mudarEstado('DISPUTA', 'fim_da_cobranca');
        Match.ballVel.set(0, 0, 0);
        [c.batedor, c.goleiro].forEach(p => { if (p) { p.velocity.set(0, 0, 0); p.hasBall = false; if (p.fsm) p.fsm.changeState('IDLE'); } });
        if (c.aoFim) c.aoFim(c.resultado);
    },

    // O passo de um jogador em coreografia (chamado do topo do FootballPlayer.update): anda em linha reta pelos pontos de `disputaOrdem.wps`.
    passoDoJogador(p, dt) {
        const s = p.disputaOrdem;
        const pos = p.model.position;
        if (s.i < s.wps.length) {
            const w = s.wps[s.i];
            const dx = w.x - pos.x, dz = w.z - pos.z, d = Math.hypot(dx, dz);
            if (d < 0.05) s.i++;
            else {
                const passo = Math.min(d, s.vel * dt);
                pos.x += dx / d * passo; pos.z += dz / d * passo;
                p.velocity.set(dx / d * s.vel, 0, dz / d * s.vel);
                s.yawAlvo = Math.atan2(dx, dz);
            }
        }
        if (s.i >= s.wps.length) {
            s.chegou = true; p.velocity.set(0, 0, 0);
            if (s.olhar) s.yawAlvo = Math.atan2(s.olhar.x - pos.x, s.olhar.z - pos.z);
        }
        const alvo = (typeof s.yawAlvo === 'number') ? s.yawAlvo : s.yaw;
        const dif = Math.atan2(Math.sin(alvo - s.yaw), Math.cos(alvo - s.yaw));
        s.yaw += dif * (1 - Math.exp(-dt * 9));
        p.model.quaternion.setFromAxisAngle(this._eixoY || (this._eixoY = new THREE.Vector3(0, 1, 0)), s.yaw);
        p.animateBones(dt);
    }
};
if (typeof window !== 'undefined') window.DisputaPenaltis = DisputaPenaltis;
```

Registrar o ficheiro: em `index.html`, depois de `js/abertura.js`, `<script src="js/disputa_penaltis.js"></script>`; em `harness.js`, depois de `'js/abertura.js'`, `'js/disputa_penaltis.js'`.

- [ ] **Passo 8: Rodar e ver passar**

Run: `node 3dMatch/simulador3d/tests/disputa_cobranca.test.js`
Esperado: `tudo certo`, com a distribuição por resultado impressa (golos entre 5 e 29).

Se a seção 3 falhar (alguém em `disputaOrdem` mexe-se), confirmar que o gancho do passo 6 está **antes** de qualquer outra lógica do `update`. Se a seção 4 falhar (goleiro-batedor), confirmar a troca do `role`. Não avançar para a Tarefa 4 enquanto este teste não passar.

- [ ] **Passo 9: Regressão dos testes de pênalti existentes**

Run: `node --test --test-force-exit 3dMatch/simulador3d/tests/penalti_corrida.test.js 3dMatch/simulador3d/tests/penalti_defesa.test.js 3dMatch/simulador3d/tests/penalti_fila.test.js 3dMatch/simulador3d/tests/abertura_tunel.test.js`
Esperado: todos passam (nada mudou fora da disputa, porque `Match.disputa` é `null`).

- [ ] **Passo 10: Commit**

```bash
git add "3dMatch/simulador3d/js" "3dMatch/simulador3d/tests/disputa_cobranca.test.js" "3dMatch/simulador3d/index.html" "3dMatch/simulador3d/tools/headless/harness.js"
git commit -m "feat(3d): cobranca da disputa de penaltis pela fisica real"
```

---

### Tarefa 3: Regras e ponte do lado da app (TypeScript)

**Arquivos:**
- Alterar: `textSim/competitions.ts` (acrescentar `decisaoDoConfronto` depois de `disputaPendente`)
- Criar: `3dMatch/disputa3d.ts`
- Criar: `tests/disputa3d.test.ts`

**Interfaces:**
- Produz:
  - `decisaoDoConfronto(comps: Competition[] | null, fixtureId: string): DecisaoDoJogo | null` com `DecisaoDoJogo = { compId: string; matchId: string; agregadoCasa: number; agregadoFora: number }`. `agregadoCasa/Fora` = golos que a equipa da casa e a de fora **deste** jogo já têm nos jogos anteriores do confronto (0 e 0 num jogo único).
  - `idDoMotor(idManager: string): number | null` (os dígitos finais de `p-269063`).
  - `emCampo(ids: number[], jogadores: Player[]): Player[]` — os jogadores do manager cujo id do motor está em `ids`, na ordem de `ids`.
  - `ordemParaOsEmCampo(ordem: string[] | undefined, jogadores: Player[]): string[]` — `normalizarOrdem` só sobre os em campo.
  - `proximaMensagem(cobrancas: Cobranca[], ordemCasa: string[], ordemFora: string[], primeiro: Lado): { lado: Lado; jogadorId: number } | { fim: true; vencedor: Lado; pens: [number, number] }` — o que responder ao 3D (ids em número do motor).

- [ ] **Passo 1: Escrever os testes que falham** (`tests/disputa3d.test.ts`)

```ts
import test from 'node:test';
import assert from 'node:assert';
import { decisaoDoConfronto, Competition, CompMatch } from '../textSim/competitions';
import { idDoMotor, emCampo, ordemParaOsEmCampo, proximaMensagem } from '../3dMatch/disputa3d';
import { Cobranca } from '../textSim/penaltyShootout';
import { Player } from '../types';

const jogo = (id: string, o: Partial<CompMatch>): CompMatch => ({ id, stage: 'QF', tie: 'T1', date: '2027-03-01', homeKey: 'L|a', awayKey: 'L|b', homeScore: null, awayScore: null, played: false, ...o });
const comp = (matches: CompMatch[]): Competition => ({ id: 'COPA_BR', name: 'Copa', teamKeys: ['L|a', 'L|b'], matches });

test('jogo unico: decisao sem agregado anterior', () => {
  const d = decisaoDoConfronto([comp([jogo('m1', {})])], 'fix-cup-m1');
  assert.deepStrictEqual(d, { compId: 'COPA_BR', matchId: 'm1', agregadoCasa: 0, agregadoFora: 0 });
});

test('ida e volta: so a volta decide, e leva o agregado da ida (por equipa, nao por lado)', () => {
  const ida = jogo('m1', { leg: 1, homeKey: 'L|b', awayKey: 'L|a', homeScore: 2, awayScore: 1, played: true });
  const volta = jogo('m2', { leg: 2, homeKey: 'L|a', awayKey: 'L|b' });
  const c = [comp([ida, volta])];
  assert.strictEqual(decisaoDoConfronto(c, 'fix-cup-m1'), null);
  assert.deepStrictEqual(decisaoDoConfronto(c, 'fix-cup-m2'), { compId: 'COPA_BR', matchId: 'm2', agregadoCasa: 1, agregadoFora: 2 });
});

test('fase de grupos (sem tie) e jogo desconhecido: sem decisao', () => {
  assert.strictEqual(decisaoDoConfronto([comp([jogo('g1', { tie: undefined })])], 'fix-cup-g1'), null);
  assert.strictEqual(decisaoDoConfronto([comp([jogo('m1', {})])], 'fix-cup-zzz'), null);
  assert.strictEqual(decisaoDoConfronto(null, 'fix-cup-m1'), null);
});

test('idDoMotor le os digitos finais', () => {
  assert.strictEqual(idDoMotor('p-269063'), 269063);
  assert.strictEqual(idDoMotor('sem-numero'), null);
});

const jog = (id: string, name: string, teamId = 't1', position = 'CM'): Player => ({ id, name, teamId, position, skill: 70, attributes: {} } as any as Player);

test('emCampo: so os do motor, na ordem pedida', () => {
  const todos = [jog('p-1', 'A'), jog('p-2', 'B'), jog('p-3', 'C')];
  assert.deepStrictEqual(emCampo([3, 1, 99], todos).map(p => p.id), ['p-3', 'p-1']);
});

test('ordemParaOsEmCampo: tira quem nao esta em campo e poe no fim quem falta', () => {
  const campo = [jog('p-1', 'A'), jog('p-2', 'B'), jog('p-3', 'C')];
  const o = ordemParaOsEmCampo(['p-3', 'p-9', 'p-1'], campo);
  assert.deepStrictEqual(o.slice(0, 2), ['p-3', 'p-1']);
  assert.strictEqual(o.length, 3);
  assert.ok(o.includes('p-2'));
});

test('proximaMensagem: continua enquanto nao ha vencedor, e fecha com o placar', () => {
  const ordemC = ['p-1', 'p-2'], ordemF = ['p-11', 'p-12'];
  const m0 = proximaMensagem([], ordemC, ordemF, 'casa');
  assert.deepStrictEqual(m0, { lado: 'casa', jogadorId: 1 });
  const cobr: Cobranca[] = [
    { lado: 'casa', jogadorId: 'p-1', gol: true }, { lado: 'fora', jogadorId: 'p-11', gol: false },
    { lado: 'casa', jogadorId: 'p-2', gol: true }, { lado: 'fora', jogadorId: 'p-12', gol: false },
    { lado: 'casa', jogadorId: 'p-1', gol: true }, { lado: 'fora', jogadorId: 'p-11', gol: false }
  ];
  const fim = proximaMensagem(cobr, ordemC, ordemF, 'casa');
  assert.deepStrictEqual(fim, { fim: true, vencedor: 'casa', pens: [3, 0] });
});
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `npx tsx --test tests/disputa3d.test.ts`
Esperado: FAIL (`decisaoDoConfronto` não exportada / módulo ausente).

- [ ] **Passo 3: `decisaoDoConfronto`** (`textSim/competitions.ts`, depois de `disputaPendente`)

```ts
/** O que o 3D precisa saber ANTES do jogo para decidir se o empate vai a penaltis: este jogo fecha um confronto (jogo unico ou ida e volta, na volta) e o agregado dos jogos anteriores. */
export interface DecisaoDoJogo { compId: string; matchId: string; agregadoCasa: number; agregadoFora: number; }
export const decisaoDoConfronto = (comps: Competition[] | null, fixtureId: string): DecisaoDoJogo | null => {
  if (!comps || !fixtureId.startsWith('fix-cup-')) return null;
  const matchId = fixtureId.slice('fix-cup-'.length);
  for (const c of comps) {
    const m = c.matches.find(x => x.id === matchId);
    if (!m) continue;
    if (!m.tie) return null;   // fase de grupos / liga: sem desempate
    const irmaos = c.matches.filter(x => x.stage === m.stage && x.tie === m.tie);
    const ultimaPerna = Math.max(...irmaos.map(x => x.leg || 1));
    if ((m.leg || 1) !== ultimaPerna) return null;
    const antes = irmaos.filter(x => x.id !== m.id && x.played);
    const golsDe = (key: string) => antes.reduce((s, x) => s + (x.homeKey === key ? (x.homeScore || 0) : x.awayKey === key ? (x.awayScore || 0) : 0), 0);
    return { compId: c.id, matchId: m.id, agregadoCasa: golsDe(m.homeKey), agregadoFora: golsDe(m.awayKey) };
  }
  return null;
};
```

- [ ] **Passo 4: `3dMatch/disputa3d.ts`**

```ts
import { Player } from '../types';
import { Cobranca, Lado, estadoDaDisputa, normalizarOrdem, proximaCobranca } from '../textSim/penaltyShootout';

/*
A DISPUTA DE PENALTIS EM 3D, o lado da app (funcoes puras). O 3D fala com ids NUMERICOS do motor ('p-269063' -> 269063); o manager com os ids dele. A app e a arbitra:
`proximaMensagem` diz o que responder ao 3D depois de cada cobranca. Ver js/disputa_penaltis.js no simulador.
*/

/** O id do motor de um jogador do manager: os digitos finais de 'p-269063'. */
export const idDoMotor = (idManager: string): number | null => {
  const m = /(\d+)$/.exec(String(idManager || ''));
  return m ? Number(m[1]) : null;
};

/** Os jogadores do manager cujo id do motor esta em `ids`, na ordem de `ids` (quem o motor nao conhece fica de fora). */
export const emCampo = (ids: number[], jogadores: Player[]): Player[] => {
  const porMotor = new Map<number, Player>();
  jogadores.forEach(p => { const n = idDoMotor(p.id); if (n !== null) porMotor.set(n, p); });
  return ids.map(n => porMotor.get(n)).filter((p): p is Player => !!p);
};

/** A ordem guardada do time, so para os que estao em campo: tira quem saiu e poe no fim, pela ordem automatica, quem falta. */
export const ordemParaOsEmCampo = (ordem: string[] | undefined, jogadoresEmCampo: Player[]): string[] => normalizarOrdem(ordem, jogadoresEmCampo);

/** A resposta ao 3D depois de uma cobranca: o proximo batedor (id do motor) ou o fim, com os penaltis marcados por cada lado. */
export const proximaMensagem = (
  cobrancas: Cobranca[], ordemCasa: string[], ordemFora: string[], primeiro: Lado
): { lado: Lado; jogadorId: number } | { fim: true; vencedor: Lado; pens: [number, number] } => {
  const e = estadoDaDisputa(cobrancas, primeiro);
  if (e.terminou && e.vencedor) return { fim: true, vencedor: e.vencedor, pens: [e.golsCasa, e.golsFora] };
  const p = proximaCobranca(cobrancas, ordemCasa, ordemFora, primeiro);
  const id = p ? idDoMotor(p.jogadorId) : null;
  if (!p || id === null) throw new Error('disputa sem proximo batedor');
  return { lado: p.lado, jogadorId: id };
};
```

- [ ] **Passo 5: Rodar e ver passar**

Run: `npx tsx --test tests/disputa3d.test.ts tests/penaltyShootout.test.ts`
Esperado: PASS em todos (os testes antigos da disputa continuam verdes).

- [ ] **Passo 6: Commit**

```bash
git add "textSim/competitions.ts" "3dMatch/disputa3d.ts" "tests/disputa3d.test.ts"
git commit -m "feat: decisao do confronto e funcoes da disputa 3D no lado da app"
```

---

### Tarefa 4: A coreografia e o fluxo (3D)

**Arquivos:**
- Alterar: `3dMatch/simulador3d/js/disputa_penaltis.js` (acrescentar o fluxo, depois do bloco da cobrança)
- Alterar: `js/officials.js` (`update`), `js/bancos.js` (`update`), `js/match/match_ui.js` (câmera)
- Criar: `3dMatch/simulador3d/tests/disputa_fluxo.test.js`

**Interfaces:**
- Consome: `DisputaModel.*` (Tarefa 1), `DisputaPenaltis.cobrar`, `Match.encerrarJogo`, `Match.disputa` (Tarefa 2), `Ponte.enviar(tipo, dados)` (existente), `Ponte.modo`, `Abertura._bolaNaMao()`, `Officials.mover(o, x, z, vel, dt, olharPara)`, `Officials.arbitro`, `Officials.assistentes`, `Bancos.bancos`.
- Produz:
  - `DisputaPenaltis.podeIniciar() -> boolean`
  - `DisputaPenaltis.iniciar() -> void` (estado `DISPUTA`, fase `REUNIAO`)
  - `DisputaPenaltis.receberOrdens(ordemCasa, ordemFora, proxima)` — ids do motor; `proxima = { lado, jogadorId }`
  - `DisputaPenaltis.receberProxima(m)` — `m = { lado, jogadorId }` ou `{ fim: true, vencedor, pens }`
  - `DisputaPenaltis.cancelar()` — o ESC
  - `DisputaPenaltis.moverOficiais(dt)`, `DisputaPenaltis.camera(pos, look)`
  - Mensagens enviadas: `disputa_reuniao` `{ casa: [{id, nome, numero, gk}], fora: [...], ladoBaliza: 1 | -1, primeiro: 'casa' | 'fora' }`, `disputa_cobranca` `{ lado, jogadorId, resultado }`, `disputa_fim` `{ pens: [casa, fora] }`.

- [ ] **Passo 1: Escrever o teste que falha** (`tests/disputa_fluxo.test.js`)

```js
/*
O FLUXO DA DISPUTA DE PENALTIS (js/disputa_penaltis.js) com a app falsa: o jogo empatado entra em DISPUTA em vez de FIM_DE_JOGO; os times formam a meia-lua; o 3D pede a
ordem (`disputa_reuniao`); cada cobranca e reportada (`disputa_cobranca`) e so segue com `disputa_proxima`; no fim `disputa_fim` e so entao o FIM_DE_JOGO.
Corre com: node tests/disputa_fluxo.test.js
*/
const assert = require('assert');
require('../tools/headless/harness.js');

const dt = 1 / 60;
let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
Match.init(cena);
Officials.init(cena);
Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);

// A ponte falsa: regista o que o 3D manda.
const msgs = [];
Ponte.modo = 'visivel';
Ponte.enviar = (tipo, dados) => msgs.push({ tipo, dados });

console.log('1 — empate com decisao: entra em DISPUTA e nao em FIM_DE_JOGO');
Match.decisao = { agregadoCasa: 0, agregadoFora: 0 };
Match.placarA = 1; Match.placarB = 1;
const meio = MatchDuration.halfGameMinutes * 60;
Match.primeiroTempoAcabou = true; Match.acr1Calculado = true; Match.acr2Calculado = true; Match.acrescimo2 = 0;
Match.tempoDeJogo = 2 * meio;
Match.state = 'PLAY';
Match.verificarFimDeTempo();
verifica(Match.state === 'DISPUTA' && DisputaPenaltis.activa && Match.disputa === DisputaPenaltis, 'estado DISPUTA', 'nao entrou em DISPUTA: ' + Match.state);

console.log('2 — a reuniao: cada time em meia-lua em volta do seu tecnico, 4 m para dentro da linha');
let n = 0;
while (!msgs.some(m => m.tipo === 'disputa_reuniao') && n < 60 * 90) { Match.update(dt); n++; }
const reuniao = msgs.find(m => m.tipo === 'disputa_reuniao');
verifica(!!reuniao, `disputa_reuniao enviada aos ${(n * dt).toFixed(0)} s`, 'a reuniao nunca acabou');
verifica(reuniao.dados.casa.length === Match.players.length && reuniao.dados.fora.length === Match.opponents.length, 'so os jogadores em campo', 'lista de jogadores errada');
verifica(Math.abs(reuniao.dados.ladoBaliza) === 1 && ['casa', 'fora'].includes(reuniao.dados.primeiro), 'sorteio do lado e de quem comeca', 'sorteio em falta');
const lado = Math.sign((typeof BancosDeReservas !== 'undefined' && BancosDeReservas.treinador.x) || 1);
for (const [lista, nome] of [[Match.players, 'casa'], [Match.opponents, 'fora']]) {
    const dentro = lista.every(p => Math.abs(p.model.position.x) <= 34 && Math.sign(p.model.position.x) === lado);
    verifica(dentro, `${nome}: todos do lado do banco e dentro do campo`, `${nome}: alguem fora do lugar`);
}

console.log('3 — a app responde com as ordens: as cobrancas acontecem e so seguem com disputa_proxima');
const idsC = reuniao.dados.casa.map(j => j.id), idsF = reuniao.dados.fora.map(j => j.id);
const primeiro = reuniao.dados.primeiro;
const ordem = { casa: idsC, fora: idsF };
let feitas = 0;
DisputaPenaltis.receberOrdens(idsC, idsF, { lado: primeiro, jogadorId: ordem[primeiro][0] });
const vistas = [];
let guarda = 0;
while (DisputaPenaltis.activa && guarda < 60 * 60 * 6) {
    Match.update(dt); guarda++;
    const c = msgs.filter(m => m.tipo === 'disputa_cobranca');
    if (c.length > feitas) {
        feitas = c.length;
        const u = c[c.length - 1].dados;
        vistas.push(u);
        verifica(['gol', 'defesa', 'trave', 'fora'].includes(u.resultado), `cobranca ${feitas}: ${u.lado} ${u.jogadorId} -> ${u.resultado}`, 'resultado invalido');
        if (feitas >= 4) {
            DisputaPenaltis.receberProxima({ fim: true, vencedor: 'casa', pens: [2, 1] });
        } else {
            const lado2 = u.lado === 'casa' ? 'fora' : 'casa';
            const idx = Math.floor(feitas / 2) % ordem[lado2].length;
            DisputaPenaltis.receberProxima({ lado: lado2, jogadorId: ordem[lado2][idx] });
        }
    }
}
verifica(feitas === 4, '4 cobrancas reportadas', `cobrancas reportadas: ${feitas}`);
verifica(vistas.every((u, i) => i === 0 || u.lado !== vistas[i - 1].lado), 'os lados alternam', 'os lados nao alternam');
const fim = msgs.find(m => m.tipo === 'disputa_fim');
verifica(fim && fim.dados.pens[0] === 2 && fim.dados.pens[1] === 1, 'disputa_fim com os penaltis da app', 'disputa_fim em falta ou errada');
verifica(Match.state === 'FIM_DE_JOGO' && !Match.disputa && !DisputaPenaltis.activa, 'so depois: FIM_DE_JOGO', 'estado final: ' + Match.state);
verifica(Match.placarA === 1 && Match.placarB === 1, 'o placar do jogo ficou 1-1', `placar: ${Match.placarA}-${Match.placarB}`);

console.log('4 — sem resposta da app em 30 s, aborta e o jogo termina como hoje');
Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);
msgs.length = 0;
Match.decisao = { agregadoCasa: 0, agregadoFora: 0 };
Match.placarA = 0; Match.placarB = 0;
Match.primeiroTempoAcabou = true; Match.acr1Calculado = true; Match.acr2Calculado = true; Match.acrescimo2 = 0;
Match.tempoDeJogo = 2 * meio; Match.state = 'PLAY';
Match.verificarFimDeTempo();
for (let i = 0; i < 60 * 140 && Match.state !== 'FIM_DE_JOGO'; i++) Match.update(dt);
verifica(Match.state === 'FIM_DE_JOGO' && !msgs.some(m => m.tipo === 'disputa_fim'), 'abortou sem disputa_fim', 'nao abortou: ' + Match.state);

console.log('5 — sem decisao no iniciar: nada muda');
Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);
Match.decisao = null; Match.placarA = 1; Match.placarB = 1;
Match.primeiroTempoAcabou = true; Match.acr1Calculado = true; Match.acr2Calculado = true; Match.acrescimo2 = 0;
Match.tempoDeJogo = 2 * meio; Match.state = 'PLAY';
Match.verificarFimDeTempo();
verifica(Match.state === 'FIM_DE_JOGO', 'FIM_DE_JOGO direto', 'entrou em disputa sem decisao');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node 3dMatch/simulador3d/tests/disputa_fluxo.test.js`
Esperado: FALHA (`DisputaPenaltis.podeIniciar is not a function`).

- [ ] **Passo 3: O fluxo em `js/disputa_penaltis.js`** (acrescentar ao objeto `DisputaPenaltis`, depois de `passoDoJogador`; lembrar de pôr uma vírgula depois da chave de `passoDoJogador`)

```js
    ,
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------
    // A COREOGRAFIA
    // ----------------------------------------------------------------------------------------------------------------------------------------------------------
    t: 0, partes: [], ordem: { casa: [], fora: [] }, primeiro: 'casa', atual: null, sub: null, tSub: 0, tApp: 0, pens: [0, 0],
    bolaComJuiz: false, ladoBanco: 1, _slots: null, _v: null,

    lista(lado) { return lado === 'casa' ? Match.players : Match.opponents; },
    ladoDe(p) { return p.team === 'TeamA' ? 'casa' : 'fora'; },
    goleiroDe(lado) { return this.lista(lado).find(p => p.role === 'gk') || null; },
    jogadorPorId(lado, id) { return this.lista(lado).find(p => p.id === id) || null; },
    _banco(lado) { return (typeof Bancos !== 'undefined' && Bancos.bancos) ? (Bancos.bancos.find(b => b.equipa === (lado === 'casa' ? 'A' : 'B')) || null) : null; },

    // So arranca no 3D visivel dentro do manager, com `decisao` e o jogo empatado no agregado, e com goleiro em campo nos dois times.
    podeIniciar() {
        const d = Match.decisao;
        if (!d || (typeof Sim !== 'undefined' && Sim.running)) return false;
        if (typeof Ponte === 'undefined' || Ponte.modo !== 'visivel') return false;
        if (Match.placarA + d.agregadoCasa !== Match.placarB + d.agregadoFora) return false;
        if (typeof Officials === 'undefined' || !Officials.arbitro || !Officials.assistentes || Officials.assistentes.length < 2) return false;
        return !!(this.goleiroDe('casa') && this.goleiroDe('fora'));
    },

    // Um movimento: `obj` (jogador, oficial ou o registo do tecnico) vai pelos pontos `wps`, a `vel` m/s, e ao chegar olha para `olhar`.
    _parte(tipo, obj, model, wps, vel, olhar) {
        const s = { tipo, obj, model, wps, i: 0, vel, olhar: olhar || null, chegou: false, yaw: 0, yawAlvo: undefined };
        const f = new THREE.Vector3(0, 0, 1).applyQuaternion(model.quaternion);
        s.yaw = Math.atan2(f.x, f.z);
        this.partes = this.partes.filter(x => x.obj !== obj);
        this.partes.push(s);
        if (tipo === 'jog') { obj.disputaOrdem = s; obj.hasBall = false; obj.velocity.set(0, 0, 0); if (obj.fsm) obj.fsm.changeState('IDLE'); }
        return s;
    },
    _parteDe(obj) { return this.partes.find(x => x.obj === obj) || null; },

    iniciar() {
        const DM = DisputaModel;
        this.activa = true; this.fase = 'REUNIAO'; this.t = 0; this.partes = []; this.pens = [0, 0]; this.atual = null; this.sub = null;
        this.sinalZ = Math.random() < 0.5 ? 1 : -1;
        this.primeiro = Math.random() < 0.5 ? 'casa' : 'fora';
        this.ladoBanco = Math.sign((typeof BancosDeReservas !== 'undefined' && BancosDeReservas.treinador && BancosDeReservas.treinador.x) || 1) || 1;
        if (!this._v) this._v = new THREE.Vector3();
        Match.disputa = this;
        Match.mudarEstado('DISPUTA', 'disputa_penaltis');
        Match.pararTodos();
        Match.ballVel.set(0, 0, 0);

        for (const lado of ['casa', 'fora']) {
            const banco = this._banco(lado);
            const zBanco = banco ? banco.zc : (lado === 'casa' ? -DM.tecnico.zDoMeio : DM.tecnico.zDoMeio);
            const tec = DM.posTecnico(this.ladoBanco, zBanco);
            const jogs = this.lista(lado).slice();
            const pts = DM.meiaLua(tec, jogs.length, this.ladoBanco, Math.random);
            if (banco && banco.treinador) this._parte('tec', banco.treinador, banco.treinador.model, [tec], DM.velocidade.tecnico, { x: 0, z: tec.z });
            jogs.forEach((p, i) => this._parte('jog', p, p.model, [pts[i]], DM.velocidade.jogador, tec));
        }
        // O juiz, com a bola na mao, vai ao circulo central e anuncia o sorteio.
        this.bolaComJuiz = true;
        const arb = Officials.arbitro;
        this._parte('arb', arb, arb.model, [{ x: 0, z: 0 }], DM.velocidade.juiz, { x: this.ladoBanco * 10, z: 0 });
        if (typeof Officials.anunciar === 'function') Officials.anunciar('PENALTY SHOOTOUT');
    },

    _todosChegaram() { return this.partes.every(s => s.chegou); },

    // A reuniao acabou: o 3D pede a ordem (ids do motor, so quem esta em campo) e espera a resposta (`receberOrdens`).
    _pedirOrdem() {
        this.fase = 'ORDEM'; this.tApp = 0;
        const dados = (lista) => lista.map(p => ({ id: p.id, nome: p.name || p.nome || '', numero: p.numero || 0, gk: p.role === 'gk' }));
        Ponte.enviar('disputa_reuniao', { casa: dados(Match.players), fora: dados(Match.opponents), ladoBaliza: this.sinalZ, primeiro: this.primeiro });
    },

    // A app mandou as ordens (ids do motor) e o primeiro batedor: monta os lugares da fila e arranca o preparo.
    receberOrdens(ordemCasa, ordemFora, proxima) {
        if (!this.activa || this.fase !== 'ORDEM') return;
        this.ordem.casa = (ordemCasa || []).slice(); this.ordem.fora = (ordemFora || []).slice();
        const f = DisputaModel.filaCentral(Match.players.length, Match.opponents.length);
        this._slots = new Map();
        Match.players.forEach((p, i) => this._slots.set(p, f.casa[i]));
        Match.opponents.forEach((p, i) => this._slots.set(p, f.fora[i]));
        this._prepararCobranca(proxima);
    },

    // Quem anda para onde, para a cobranca de `proxima` = { lado, jogadorId }: o batedor para a marca, o goleiro que defende para a linha, o outro goleiro para a lateral da
    // area, o juiz e o bandeirinha para os postos; os demais para a fila do meio-campo.
    _prepararCobranca(proxima) {
        const DM = DisputaModel;
        this.fase = 'PREPARO'; this.sub = 'andar'; this.tSub = 0; this.t = 0;
        const lado = proxima.lado, outro = lado === 'casa' ? 'fora' : 'casa';
        const batedor = this.jogadorPorId(lado, proxima.jogadorId);
        const goleiro = this.goleiroDe(outro);
        this.atual = { lado, batedor, goleiro, tecnicos: null };
        const marca = DM.posMarca(this.sinalZ), espera = DM.posEsperaBatedor(this.sinalZ), gol = DM.posGol(this.sinalZ);
        const vel = DM.velocidade;
        const assistente = Officials.assistentes.find(a => Math.sign(a.model.position.z) === this.sinalZ) || Officials.assistentes[0];
        const ladoAssist = Math.sign(assistente.model.position.x) || 1;

        for (const p of Match.players.concat(Match.opponents)) {
            if (p === batedor) { this._parte('jog', p, p.model, [{ x: marca.x, z: marca.z - this.sinalZ * 0.9 }], vel.jogador, marca); continue; }
            if (p === goleiro) { this._parte('jog', p, p.model, [{ x: gol.x, z: gol.z - this.sinalZ * 0.5 }], vel.goleiro, marca); continue; }
            if (p.role === 'gk' && this.ladoDe(p) === lado) {
                this._parte('jog', p, p.model, [DM.posGoleiroEspera(this.sinalZ, -ladoAssist)], vel.goleiro, marca); continue;
            }
            const slot = this._slots.get(p);
            this._parte('jog', p, p.model, [slot], vel.jogador, { x: 0, z: this.sinalZ * 20 });
        }
        const arb = Officials.arbitro, j = DM.posJuiz(this.sinalZ);
        this.bolaComJuiz = true;
        this._parte('arb', arb, arb.model, [j], vel.juiz, marca);
        this._parte('lin', assistente, assistente.model, [DM.posBandeirinha(this.sinalZ, ladoAssist)], vel.bandeirinha, { x: 0, z: this.sinalZ * 53 });
        this._prazoPreparo = DM.prazo.preparo;
    },

    // Substitui o `update` da Tarefa 2: a cobranca corre pelo miolo (`atualizarCobranca`); as outras fases tem os seus tempos.
    update(dt) {
        if (!this.activa) return;
        const DM = DisputaModel;
        this.t += dt;
        if (this._cobranca) {
            this.fase = 'COBRANCA';
            this.atualizarCobranca(dt);
            // Passado o contato, o batedor volta andando para o lugar dele na fila.
            const c = this._cobranca;
            if (c && c.tContato !== null && c.tContato > DM.pausa.aposContato && !this._soltou) {
                this._soltou = true;
                const slot = this._slots.get(c.batedor);
                if (slot && c.batedor.role !== 'gk') this._parte('jog', c.batedor, c.batedor.model, [slot], DM.velocidade.jogador, { x: 0, z: this.sinalZ * 20 });
            }
            return;
        }
        switch (this.fase) {
            case 'REUNIAO':
                if (this._todosChegaram() || this.t > DM.prazo.reuniao) this._pedirOrdem();
                break;
            case 'ORDEM':
            case 'AGUARDA':
                this.tApp += dt;
                if (this.tApp > DM.prazo.app) this._abortar();
                break;
            case 'PREPARO': this._atualizarPreparo(dt); break;
            case 'FIM':
                if (this.t > DM.pausa.fim) this._encerrar();
                break;
        }
    },

    _atualizarPreparo(dt) {
        const DM = DisputaModel, a = this.atual;
        this.tSub += dt;
        if (this.sub === 'andar') {
            const prontos = [a.batedor, a.goleiro].every(p => this._parteDe(p) && this._parteDe(p).chegou) && this._parteDe(Officials.arbitro).chegou;
            if (prontos || this.t > this._prazoPreparo) { this.sub = 'entrega'; this.tSub = 0; }
        } else if (this.sub === 'entrega') {
            // O juiz entrega a bola; o batedor a ajeita na marca.
            if (this.tSub > DM.pausa.entrega) {
                this.bolaComJuiz = false;
                const m = DM.posMarca(this.sinalZ);
                Match.ball.position.set(m.x, BallPhysics.raio, m.z);
                Match.ballVel.set(0, 0, 0);
                this.sub = 'ajeita'; this.tSub = 0;
            }
        } else if (this.sub === 'ajeita') {
            if (this.tSub > DM.pausa.ajeitar) {
                const e = DM.posEsperaBatedor(this.sinalZ), m = DM.posMarca(this.sinalZ);
                this._parte('jog', a.batedor, a.batedor.model, [e], DM.velocidade.jogador, m);
                this.sub = 'recuo'; this.tSub = 0;
            }
        } else if (this.sub === 'recuo') {
            const s = this._parteDe(a.batedor);
            if ((s && s.chegou) || this.tSub > 8) {
                this.sub = null;
                this.cobrar(a.lado, a.batedor, a.goleiro, (r) => this._aoFimDaCobranca(r));
            }
        }
    },

    _aoFimDaCobranca(resultado) {
        const a = this.atual;
        this._soltou = false;
        this.fase = 'AGUARDA'; this.tApp = 0;
        // A bola volta ao juiz (fora de cena, como o apanha-bolas): o preparo seguinte pega nela ja na mao dele.
        this.bolaComJuiz = true;
        Ponte.enviar('disputa_cobranca', { lado: a.lado, jogadorId: a.batedor.id, resultado });
    },

    // A resposta da app: o proximo batedor, ou o fim.
    receberProxima(m) {
        if (!this.activa || this.fase !== 'AGUARDA') return;
        if (m.fim) { this.pens = m.pens || this.pens; this.fase = 'FIM'; this.t = 0; return; }
        this._prepararCobranca(m);
    },

    _encerrar() {
        Ponte.enviar('disputa_fim', { pens: this.pens });
        this._libertar();
        Match.encerrarJogo();
    },

    // Sem resposta da app: o jogo termina como se nao houvesse disputa (a app cai no modal de texto).
    _abortar() { this._libertar(); Match.encerrarJogo(); },

    _libertar() {
        for (const s of this.partes) if (s.tipo === 'jog') { s.obj.disputaOrdem = null; s.model.visible = true; }
        this.partes = []; this.activa = false; this.fase = null; this._cobranca = null; this.bolaComJuiz = false;
        Match.disputa = null;
    },

    // ESC: leva todos direto aos pontos finais (so durante o caminhar; nunca salta cobrancas).
    cancelar() {
        if (!this.activa || this._cobranca || !['REUNIAO', 'PREPARO', 'AGUARDA'].includes(this.fase)) return;
        for (const s of this.partes) {
            const w = s.wps[s.wps.length - 1];
            if (w) { s.model.position.x = w.x; s.model.position.z = w.z; s.i = s.wps.length; s.chegou = true; }
        }
    },

    // O juiz, o bandeirinha e o tecnico andam por `Officials.mover`; a bola vai na mao do juiz enquanto `bolaComJuiz`.
    moverOficiais(dt) {
        for (const s of this.partes) {
            if (s.tipo === 'jog') continue;
            const w = s.wps[s.wps.length - 1];
            Officials.mover(s.obj, w.x, w.z, s.vel, dt, s.olhar || undefined);
            s.chegou = Math.hypot(w.x - s.model.position.x, w.z - s.model.position.z) < 0.4;
            if (s.tipo === 'lin') Officials._ajustarPano(s.obj, dt);
        }
        if (this.bolaComJuiz && typeof Abertura !== 'undefined') { Abertura._v = Abertura._v || this._v; Abertura._bolaNaMao(); }
        Officials.atualizarVista();
    },

    // A camera: na reuniao, do outro lado do campo para as duas meias-luas; depois, atras do batedor com a baliza ao fundo.
    camera(pos, look) {
        const DM = DisputaModel;
        if (this.fase === 'REUNIAO' || this.fase === 'ORDEM') {
            pos.set(-this.ladoBanco * 30, 14, 0);
            look.set(this.ladoBanco * 26, 1.2, 0);
        } else {
            const m = DM.posMarca(this.sinalZ);
            pos.set(0, 2.4, m.z - this.sinalZ * 16);
            look.set(0, 1.2, this.sinalZ * 50);
        }
    }
```

Ao colar este bloco no objeto: troque o `};` que fecha o objeto da Tarefa 2 por esta continuação (o bloco acima começa com `,`), apague o `update` curto da Tarefa 2 (este o substitui) e deixe `};` e `window.DisputaPenaltis = DisputaPenaltis;` só no fim do ficheiro.

- [ ] **Passo 4: Oficiais, técnico e câmera**

`js/officials.js`, em `update`, logo antes da linha da `Abertura.activa`:

```js
        // A disputa de penaltis (js/disputa_penaltis.js): o trio e os tecnicos andam pela coreografia, nao pelo jogo.
        if (typeof DisputaPenaltis !== 'undefined' && DisputaPenaltis.activa) { DisputaPenaltis.moverOficiais(dt); return; }
```

`js/bancos.js`, no começo de `update(dt)`, depois do `if (!B || ...) return;`:

```js
        if (typeof DisputaPenaltis !== 'undefined' && DisputaPenaltis.activa) return;   // na disputa quem move o tecnico e a coreografia
```

`js/match/match_ui.js`, trocar `if (typeof Abertura !== 'undefined' && Abertura.activa && ...) {` por uma cadeia que começa com a disputa:

```js
        if (typeof DisputaPenaltis !== 'undefined' && DisputaPenaltis.activa) {
            DisputaPenaltis.camera(targetPos, lookTarget);
        } else if (typeof Abertura !== 'undefined' && Abertura.activa && Abertura.modo !== 'segundo' && Abertura.modo !== 'intervalo') {
```

(o resto da cadeia `else if (window.cameraMode === 'center') {...` fica igual).

- [ ] **Passo 5: Rodar e ver passar**

Run: `node 3dMatch/simulador3d/tests/disputa_fluxo.test.js`
Esperado: `tudo certo`. Se a seção 2 falhar por `Match.players` com `p.name` indefinido, o `disputa_reuniao` usa `p.nome`; confirmar o campo do nome do jogador em `player.js` (`this.nome`/`this.name`) e usar esse.

- [ ] **Passo 6: Regressão**

Run: `node --test --test-force-exit 3dMatch/simulador3d/tests/disputa_posicoes.test.js 3dMatch/simulador3d/tests/disputa_cobranca.test.js 3dMatch/simulador3d/tests/abertura_tunel.test.js 3dMatch/simulador3d/tests/bancos_e_area_tecnica.test.js 3dMatch/simulador3d/tests/arbitro_no_canto.test.js`
Esperado: todos passam.

- [ ] **Passo 7: Commit**

```bash
git add "3dMatch/simulador3d/js" "3dMatch/simulador3d/tests/disputa_fluxo.test.js"
git commit -m "feat(3d): coreografia e fluxo da disputa de penaltis"
```

---

### Tarefa 5: A ponte do 3D (`ponte.js`) e o jogo do manager

**Arquivos:**
- Alterar: `3dMatch/simulador3d/js/narracao/ponte.js` (`iniciar`, o ouvinte de mensagens, `esc`)
- Alterar: `3dMatch/Simulador3DView.tsx` e `3dMatch/simulador3dCliente.ts` (`montarPayload` aceita `decisao`)
- Alterar: `context/GameContext.tsx` (`pens3d`, mensagens, `decisao`)
- Alterar: `components/MatchDay.tsx` (modal da ordem, placar dos pênaltis)

**Interfaces:**
- Consome: `decisaoDoConfronto`, `emCampo`, `ordemParaOsEmCampo`, `proximaMensagem` (Tarefa 3); mensagens da Tarefa 4.
- Produz: o `iniciar` ganha `decisao` (`DecisaoDoJogo | undefined`); `GameContext` expõe `decisaoDoJogoDeHoje(): DecisaoDoJogo | null`.

- [ ] **Passo 1: `ponte.js` — receber `decisao` e as respostas da app**

Em `iniciar(m)`, depois de `Match.primeiroTempoAcabou = false;`: `Match.decisao = (m.decisao && this.modo === 'visivel') ? m.decisao : null; Match.disputa = null;`

No ouvinte (junto de `else if (m.tipo === 'cobradores')`), acrescentar:

```js
            else if (m.tipo === 'disputa_iniciar') { if (window.DisputaPenaltis) window.DisputaPenaltis.receberOrdens(m.ordemCasa, m.ordemFora, m.proxima); }
            else if (m.tipo === 'disputa_proxima') { if (window.DisputaPenaltis) window.DisputaPenaltis.receberProxima(m); }
```

Em `esc()`, no início: `if (typeof DisputaPenaltis !== 'undefined' && DisputaPenaltis.activa) { DisputaPenaltis.cancelar(); return; }`.

Verificar com: `node --check 3dMatch/simulador3d/js/narracao/ponte.js`.

- [ ] **Passo 2: `montarPayload` leva a `decisao`**

Em `3dMatch/simulador3dCliente.ts`, `montarPayload(...)` já espalha `...extra` no objeto devolvido; basta passá-la em `extra`. Em `Simulador3DView.tsx`, na chamada de `montarPayload` do `arrancar` (a que tem `modo: 'visivel'`), acrescentar `decisao: d.decisao` ao objeto `extra`, e em `Props` acrescentar `decisao?: DecisaoDoJogo | null;` (importar o tipo de `../textSim/competitions`); em `dados.current` incluir `decisao`.

- [ ] **Passo 3: `GameContext` — a decisão e os pênaltis do 3D**

Na declaração do tipo do contexto, junto de `registrarPenaltis`:

```ts
  /** O que o 3D precisa saber do jogo de hoje do utilizador: se fecha um confronto de copa e o agregado anterior (ver decisaoDoConfronto). */
  decisaoDoJogoDeHoje: () => DecisaoDoJogo | null;
  /** O 3D acabou a disputa de penaltis do jogo de hoje: guarda `pens` para gravar quando o confronto aparecer nas copas. */
  guardarPenaltis3d: (fixtureId: string, pens: [number, number]) => void;
```

Perto de `registrarPenaltis`:

```ts
  const pens3d = useRef<Record<string, [number, number]>>({});
  const decisaoDoJogoDeHoje = (): DecisaoDoJogo | null => {
    const uf = fixtures.find(f => f.date === gameState.currentDate && (f.homeTeamId === gameState.userTeamId || f.awayTeamId === gameState.userTeamId));
    return uf ? decisaoDoConfronto(comps, uf.id) : null;
  };
  const guardarPenaltis3d = (fixtureId: string, pens: [number, number]) => { pens3d.current[fixtureId.replace('fix-cup-', '')] = pens; };
```

`disputaDePenaltis` (o `useMemo`) passa a ignorar os que o 3D já resolveu:

```ts
  const disputaDePenaltis = useMemo(() => {
    const d = userTeam ? disputaPendente(comps, userTeam.id) : null;
    return d && !pens3d.current[d.matchId] ? d : null;
  }, [comps, userTeam?.id]);
  // O 3D ja decidiu: grava os penaltis assim que o confronto aparece empatado nas copas.
  useEffect(() => {
    const d = userTeam ? disputaPendente(comps, userTeam.id) : null;
    if (d && pens3d.current[d.matchId]) { registrarPenaltis(d.compId, d.matchId, pens3d.current[d.matchId]); delete pens3d.current[d.matchId]; }
  }, [comps]);
```

Em `motor3dMensagem`, junto de `m.tipo === 'placar_ajustado'`:

```ts
    } else if (m.tipo === 'disputa_fim') {
      guardarPenaltis3d(uf.id, m.pens);
```

Exportar os dois novos membros no `value` do provider (junto de `registrarPenaltis`) e importar `decisaoDoConfronto`, `DecisaoDoJogo` de `../textSim/competitions` e `useRef` se faltar.

- [ ] **Passo 4: `MatchDay` — a ordem e o placar dos pênaltis**

Em `MatchDay.tsx`: passar `decisao={decisaoDoJogoDeHoje()}` ao `Simulador3DView`. Estados novos:

```tsx
  const [ordem3d, setOrdem3d] = useState<{ casa: number[]; fora: number[]; primeiro: 'casa' | 'fora' } | null>(null);
  const [cobrancas3d, setCobrancas3d] = useState<Cobranca[]>([]);
  const ordens3d = useRef<{ casa: string[]; fora: string[]; primeiro: 'casa' | 'fora' } | null>(null);
```

No `aoMensagem` (antes do `else motor3dMensagem(m)`):

```tsx
                      } else if (m.tipo === 'disputa_reuniao') {
                        setCobrancas3d([]);
                        setOrdem3d({ casa: m.casa.map((j: any) => j.id), fora: m.fora.map((j: any) => j.id), primeiro: m.primeiro });
                      } else if (m.tipo === 'disputa_cobranca') {
                        const lado = m.lado as 'casa' | 'fora';
                        const time = lado === 'casa' ? homeTeam : awayTeam;
                        const p = emCampo([m.jogadorId], players.filter(x => x.teamId === time.id))[0];
                        const novas = [...cobrancas3dRef.current, { lado, jogadorId: p ? p.id : 'p-' + m.jogadorId, gol: m.resultado === 'gol' }];
                        cobrancas3dRef.current = novas;
                        setCobrancas3d(novas);
                        const o = ordens3d.current!;
                        simulador3dEnviar({ tipo: 'disputa_proxima', ...proximaMensagem(novas, o.casa, o.fora, o.primeiro) });
```

(`cobrancas3dRef` é um `useRef<Cobranca[]>([])` espelhado de `cobrancas3d`; zerar o ref em `disputa_reuniao`.)

Ao confirmar a ordem (callback do `PenaltyOrderView`):

```tsx
  const confirmarOrdem3d = (ordemMeu: string[]) => {
    const meuTime = usuarioEhCasa ? homeTeam : awayTeam;
    definirOrdemPenaltis(meuTime.id, ordemMeu);
    const campoCasa = emCampo(ordem3d!.casa, players.filter(p => p.teamId === homeTeam.id));
    const campoFora = emCampo(ordem3d!.fora, players.filter(p => p.teamId === awayTeam.id));
    const ordemCasa = usuarioEhCasa ? ordemMeu : ordemParaOsEmCampo(homeTeam.penaltyOrder, campoCasa);
    const ordemFora = usuarioEhCasa ? ordemParaOsEmCampo(awayTeam.penaltyOrder, campoFora) : ordemMeu;
    ordens3d.current = { casa: ordemCasa, fora: ordemFora, primeiro: ordem3d!.primeiro };
    setOrdem3d(null);
    const proxima = proximaMensagem([], ordemCasa, ordemFora, ordem3d!.primeiro) as { lado: 'casa' | 'fora'; jogadorId: number };
    simulador3dEnviar({ tipo: 'disputa_iniciar', ordemCasa: ordemCasa.map(idDoMotor), ordemFora: ordemFora.map(idDoMotor), proxima });
  };
```

O modal por cima do iframe (o iframe tem `z-index: 5`; o modal usa `z-[300]` como o `PenaltyShootoutModal`), dentro do `return` do `MatchDay`:

```tsx
      {ordem3d && (
        <div className="absolute inset-0 z-[300] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6">
          <PenaltyOrderView
            time={usuarioEhCasa ? homeTeam : awayTeam}
            jogadores={emCampo(usuarioEhCasa ? ordem3d.casa : ordem3d.fora, players.filter(p => p.teamId === (usuarioEhCasa ? homeTeam : awayTeam).id))}
            ordemInicial={(usuarioEhCasa ? homeTeam : awayTeam).penaltyOrder}
            aoConfirmar={confirmarOrdem3d}
          />
        </div>
      )}
```

O placar do cabeçalho mostra os pênaltis durante a disputa, trocando `{match.homeScore || 0} - {match.awayScore || 0}` por:

```tsx
                        {match.homeScore || 0}{cobrancas3d.length ? ` (${cobrancas3d.filter(c => c.lado === 'casa' && c.gol).length})` : ''} - {cobrancas3d.length ? `(${cobrancas3d.filter(c => c.lado === 'fora' && c.gol).length}) ` : ''}{match.awayScore || 0}
```

`usuarioEhCasa = match.homeTeamId === gameState.userTeamId` (já existe no componente com outro nome? se não, definir). Importar `PenaltyOrderView`, `Cobranca`, `emCampo`, `ordemParaOsEmCampo`, `proximaMensagem`, `idDoMotor`.

- [ ] **Passo 5: Verificar tipos e testes**

Run: `npx tsc --noEmit -p .`
Esperado: sem erros.

Run: `npx tsx --test tests/disputa3d.test.ts tests/penaltyShootout.test.ts` e `npm run 3d:teste`
Esperado: todos passam.

- [ ] **Passo 6: Verificação manual no jogo** (skill `run`)

Iniciar com `npm run dev`, criar um jogo de copa (ou forçar o empate com o clique na sigla do placar, em tela cheia), deixar chegar a 90'+acréscimo. Conferir: (a) os técnicos e os dois times em meia-lua do lado do banco; (b) o modal da ordem só com os jogadores em campo; (c) Iniciar leva juiz, goleiro e batedor à baliza sorteada; (d) cada cobrança é decidida pela física e o placar do cabeçalho mostra `(n)`; (e) o batedor volta à fila e o seguinte vai à marca; (f) no fim o resultado fica gravado e o modal de texto **não** abre; (g) ESC durante o caminhar leva todos às posições.

- [ ] **Passo 7: Commit**

```bash
git add "3dMatch" "context/GameContext.tsx" "components/MatchDay.tsx"
git commit -m "feat: disputa de penaltis em 3D ligada ao jogo do manager"
```

---

### Tarefa 6: Goleiro expulso — troca obrigatória

Independente da disputa, mas é o que garante que os dois times cheguem a ela com goleiro em campo. Reaproveita o pipeline de substituições (`pedirSubstituicao` → `_comecar` → `_comecarTroca` → `executarSubstituicao`, em `match_substituicoes.js`).

**Arquivos:**
- Alterar: `3dMatch/simulador3d/js/match/match_substituicoes.js`, `js/treinador_cpu.js`, `js/officials.js` (`expulsar`), `js/match/match_loop.js` (espera), `js/narracao/ponte.js` (`iniciar`, mensagens)
- Alterar: `components/MatchDay.tsx` (aviso)
- Criar: `3dMatch/simulador3d/tests/goleiro_expulso.test.js`

**Interfaces:**
- Produz:
  - `Match.goleiroPendente` — `null` ou `{ lado: 'casa' | 'fora', expulso: FootballPlayer, t: number }`.
  - `Match.ladoDoUtilizador` — `'casa' | 'fora' | null` (null no modo oculto: a CPU decide pelos dois).
  - `Match.goleiroExpulso(expulso)` — chamado por `Officials.expulsar` quando `expulso.role === 'gk'`.
  - `Match._aguardaGoleiro(dt) -> boolean` — `true` enquanto o jogo parado espera pela troca.
  - `Match._promoverAGoleiro(G)` — o jogador de linha com melhor `skillFor('GK')` assume o gol.
  - `TreinadorCPU.saidaParaGoleiro(team) -> FootballPlayer | null`.
  - `req.goleiro` e `req.urgente` num pedido de substituição: `urgente` salta o aquecimento.
  - Mensagens do 3D: `expulsao` ganha `goleiro: boolean`; nova `goleiro_trocado` `{ lado }`.

- [ ] **Passo 1: Escrever o teste que falha** (`tests/goleiro_expulso.test.js`)

```js
/*
GOLEIRO EXPULSO: o time fica com goleiro. Com reserva (e menos de 5 trocas) o tecnico tira um jogador de linha e mete o goleiro reserva; sem reserva um jogador de linha vai ao gol
com o uniforme de goleiro. No time do utilizador o jogo espera pelo manager (ate 20 s de jogo parado); depois decide sozinho. Corre com: node tests/goleiro_expulso.test.js
*/
const assert = require('assert');
require('../tools/headless/harness.js');

const dt = 1 / 60;
let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();

function novoJogo(comReservaGk) {
    Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
    for (let i = 0; i < 120; i++) Match.update(dt);
    Match.ladoDoUtilizador = null;
    Match.subsPendentes = []; Match.subsFeitas = []; Match.goleiroPendente = null;
    const gkB = Match.opponents.find(p => p.role === 'gk');
    const reservas = [];
    if (comReservaGk) reservas.push({ id: 777001, sk: Object.assign({}, gkB.skills, { id: 777001, nome: 'Reserva GK', numero: 12, role: 'gk', pos: 'GK' }) });
    Match.equipaInfoB = Object.assign(Match.equipaInfoB || { nome: 'B', plantel: [] }, { reservas });
    if (typeof TreinadorCPU !== 'undefined') TreinadorCPU._usados = new Set();
    return gkB;
}
const expulsarEParar = (gk) => {
    Officials.expulsar(gk);
    Match.setupSetPiece('FREE_KICK', 'TeamA');   // a falta do vermelho: jogo parado, onde se pode trocar
};
const correrAte = (cond, seg) => { let i = 0; while (!cond() && i < 60 * seg) { Match.update(dt); i++; } return i * dt; };

console.log('1 — com goleiro reserva: sai um jogador de linha e entra o goleiro (CPU)');
let gk = novoJogo(true);
const antes = Match.opponents.length;   // 10, ja sem o expulso
expulsarEParar(gk);
verifica(Match.goleiroPendente && Match.goleiroPendente.lado === 'fora', 'goleiroPendente armado', 'goleiroPendente nao armado');
const t1 = correrAte(() => !Match.goleiroPendente && Match.opponents[0] && Match.opponents[0].role === 'gk' && Match.opponents[0].skills.id === 777001, 150);
verifica(Match.opponents[0].role === 'gk' && Match.opponents[0].skills.id === 777001, `o reserva e o goleiro (indice 0) aos ${t1.toFixed(0)} s`, 'o reserva nao entrou no gol');
verifica(Match.opponents.length === antes, 'o time continua com ' + antes + ' (um de linha saiu)', 'numero de jogadores: ' + Match.opponents.length);
verifica(Match.opponents.filter(p => p.role === 'gk').length === 1, 'so um goleiro', 'mais de um goleiro em campo');
verifica(!(Match.expulsos || []).includes(gk), 'o expulso nao volta (fora de Match.expulsos)', 'o expulso ficou em Match.expulsos');
verifica(Match.opponents[0].uniforme === gk.uniforme, 'com o uniforme de goleiro', 'uniforme errado');

console.log('2 — sem goleiro reserva: um jogador de linha vai ao gol, sem gastar troca');
gk = novoJogo(false);
const trocasAntes = (Match.substituicoes || 0);
expulsarEParar(gk);
correrAte(() => !Match.goleiroPendente, 30);
const novo = Match.opponents[0];
verifica(novo && novo.role === 'gk', 'o jogador de linha assumiu o gol (indice 0)', 'ninguem assumiu o gol');
verifica(novo.uniforme === gk.uniforme, 'com o uniforme de goleiro', 'uniforme errado');
verifica(Match.opponents.filter(p => p.role === 'gk').length === 1 && Match.opponents.length === 10, 'um goleiro, dez em campo', 'composicao errada');
verifica((Match.substituicoes || 0) === trocasAntes, 'nao contou como substituicao', 'contou como substituicao');

console.log('3 — com 5 trocas ja feitas, mesmo havendo reserva: jogador de linha ao gol');
gk = novoJogo(true);
Match.subsFeitas = [1, 2, 3, 4, 5].map(() => ({ lado: 'fora', sai: null, entra: null, t: 0 }));
expulsarEParar(gk);
correrAte(() => !Match.goleiroPendente, 30);
verifica(Match.opponents[0].role === 'gk' && Match.opponents[0].skills.id !== 777001, 'jogador de linha no gol, o reserva ficou no banco', 'usou o reserva com 5 trocas feitas');

console.log('4 — time do utilizador: o jogo espera; passados 20 s decide sozinho');
gk = novoJogo(true);
Match.ladoDoUtilizador = 'fora';
expulsarEParar(gk);
const estadoParado = Match.state;
const t4 = correrAte(() => Match.subsPendentes.some(r => r.goleiro) || !Match.goleiroPendente, 8);
verifica(Match.goleiroPendente && Match.state === estadoParado && !Match.subsPendentes.some(r => r.goleiro), 'aos 8 s ainda espera pelo manager', 'decidiu antes de tempo');
const tAuto = correrAte(() => Match.subsPendentes.some(r => r.goleiro) || !Match.goleiroPendente, 20);
verifica(Match.subsPendentes.some(r => r.goleiro) || !Match.goleiroPendente, `decidiu sozinho aos ${(t4 + tAuto).toFixed(0)} s`, 'nunca decidiu');

console.log('5 — time do utilizador: um pedido de goleiro do manager e aceite e marcado urgente');
gk = novoJogo(true);
Match.ladoDoUtilizador = 'fora';
expulsarEParar(gk);
const reserva = TreinadorCPU.reservasDe('TeamB').find(r => r.sk.role === 'gk');
const saiu = TreinadorCPU.saidaParaGoleiro('TeamB');
Match.pedirSubstituicao({ lado: 'fora', sai: String(saiu.skills.id), entra: String(reserva.id), jogador: { position: 'GK' }, _sk: reserva.sk });
const req = Match.subsPendentes[0];
verifica(req && req.goleiro === true && req.urgente === true, 'o pedido ficou goleiro + urgente', 'o pedido nao foi marcado');
correrAte(() => !Match.goleiroPendente && Match.opponents[0].role === 'gk', 150);
verifica(Match.opponents[0].skills.id === reserva.id, 'o goleiro pedido entrou', 'o goleiro pedido nao entrou');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
```

- [ ] **Passo 2: Rodar e ver falhar**

Run: `node 3dMatch/simulador3d/tests/goleiro_expulso.test.js`
Esperado: FALHA (`Match.goleiroPendente` sem armar: `goleiroExpulso` não existe).

- [ ] **Passo 3: O modelo e o estado** (`js/match/match_substituicoes.js`, depois de `window.Aquecimento = Aquecimento;`)

```js
// O GOLEIRO EXPULSO: `limiteTrocas` por time; `esperaAuto` s de jogo parado a espera da troca do manager antes de o 3D decidir sozinho.
const GoleiroExpulsoModel = { limiteTrocas: 5, esperaAuto: 20 };
if (typeof window !== 'undefined') window.GoleiroExpulsoModel = GoleiroExpulsoModel;
```

E dentro do `Object.assign(Match, {` (junto de `subsPendentes: [],`): `goleiroPendente: null, ladoDoUtilizador: null,`.

- [ ] **Passo 4: As funções novas** (no mesmo `Object.assign`, antes de `executarSubstituicao`)

```js
    /*
    O GOLEIRO FOI EXPULSO (chamado do `Officials.expulsar`): o time precisa de outro. O expulso sai de `Match.expulsos` (o `reporExpulsos` devolvia-o ao campo e o time ficava com dois
    goleiros). A troca faz-se na proxima parada (`_aguardaGoleiro`, chamada do `Match.update`): com goleiro reserva e menos de `limiteTrocas`, sai um jogador de linha e entra o reserva;
    senao o de linha com melhor `skillFor('GK')` assume o gol. No time do utilizador o jogo espera pelo pedido do manager (aba Tactics) ate `esperaAuto` s.
    */
    goleiroExpulso: function (expulso) {
        this.expulsos = (this.expulsos || []).filter(q => q !== expulso);
        this.goleiroPendente = { lado: expulso.team === 'TeamA' ? 'casa' : 'fora', expulso: expulso, t: 0 };
    },

    _trocasDoLado: function (lado) {
        return (this.subsFeitas || []).filter(s => s.lado === lado).length + this.subsPendentes.filter(r => !r.feita && r.lado === lado && !r.goleiro).length;
    },

    _limparGoleiroPendente: function () {
        const lado = this.goleiroPendente && this.goleiroPendente.lado;
        this.goleiroPendente = null;
        if (typeof Ponte !== 'undefined' && Ponte.enviar && lado) Ponte.enviar('goleiro_trocado', { lado: lado });
    },

    // `true` enquanto o jogo parado espera pela troca do goleiro (o `update` so anda os jogadores, como nas outras trocas).
    _aguardaGoleiro: function (dt) {
        const G = this.goleiroPendente;
        if (!G) return false;
        const lista = this._equipaDoLado(G.lado);
        if (lista.some(p => p.role === 'gk')) { this._limparGoleiroPendente(); return false; }
        if (this.subsPendentes.some(r => !r.feita && r.goleiro && r.lado === G.lado)) return true;   // a troca esta a andar: o jogo espera por ela
        if (!this._paradaParaSubstituir()) return false;
        G.t += dt;
        const team = G.lado === 'casa' ? 'TeamA' : 'TeamB';
        const reserva = (typeof TreinadorCPU !== 'undefined') ? TreinadorCPU.reservasDe(team).find(r => r.sk && r.sk.role === 'gk') : null;
        if (!reserva || this._trocasDoLado(G.lado) >= GoleiroExpulsoModel.limiteTrocas) {
            this._promoverAGoleiro(G);
            return false;
        }
        if (G.lado === this.ladoDoUtilizador && G.t < GoleiroExpulsoModel.esperaAuto) return true;   // o manager (aba Tactics) escolhe quem sai
        const sai = TreinadorCPU.saidaParaGoleiro(team);
        if (!sai) { this._promoverAGoleiro(G); return false; }
        TreinadorCPU._usados = TreinadorCPU._usados || new Set(); TreinadorCPU._usados.add(reserva.id);
        this.pedirSubstituicao({ lado: G.lado, sai: String(sai.skills && sai.skills.id), entra: String(reserva.id), jogador: reserva.sk, _sk: reserva.sk, goleiro: true, urgente: true });
        return true;
    },

    // Sem reserva (ou sem trocas): o de linha com melhor nota de goleiro assume o gol, no sitio onde esta, com o uniforme de goleiro. Nao conta como substituicao.
    _promoverAGoleiro: function (G) {
        const lista = this._equipaDoLado(G.lado);
        const candidatos = lista.filter(p => p.role !== 'gk' && !p.queda && !p.naBarreiraFalta && p !== this.setPieceTaker);
        candidatos.sort((a, b) => b.skillFor('GK') - a.skillFor('GK'));
        const P = candidatos[0] || lista[0];
        if (!P) { this._limparGoleiroPendente(); return; }
        const antesSubs = this.substituicoes || 0;
        this.executarSubstituicao({ lado: G.lado, goleiro: true, urgente: true, _sk: P.skills, jogador: null }, P, lista, null);
        this.substituicoes = antesSubs;
        this.subsFeitas.pop();
    },
```

- [ ] **Passo 5: Ajustar o pipeline** (`js/match/match_substituicoes.js`)

`pedirSubstituicao`, depois de `const r = Object.assign(...)` (antes de `this.subsPendentes.push(r);`):

```js
        // O pedido do manager com um GOLEIRO, para o time que esta sem goleiro: troca urgente (sem aquecimento) e que vale como a troca obrigatoria.
        const ehGk = req.jogador && (String(req.jogador.position) === 'GK' || req.jogador.role === 'gk');
        if (ehGk && this.goleiroPendente && this.goleiroPendente.lado === req.lado) { r.goleiro = true; r.urgente = true; }
```

`_comecar`: trocar `const B = (!emBatch && Aquecimento.activo) ? this._reservaDoBanco(banco, req.entra) : null;` por `const B = (!emBatch && Aquecimento.activo && !req.urgente) ? this._reservaDoBanco(banco, req.entra) : null;`.

`_numeroDoEntrante`: trocar `AdaptadorManager.jogador(req.jogador, P.pos, opcoes)` por `AdaptadorManager.jogador(req.jogador, (req.goleiro && this.goleiroPendente) ? this.goleiroPendente.expulso.pos : P.pos, opcoes)`.

`executarSubstituicao`: o entrante que vem como goleiro herda o POSTO e o uniforme do goleiro expulso, no lugar zero da lista. Trocar as linhas do uniforme e do posto por:

```js
        const G = (req.goleiro && this.goleiroPendente) ? this.goleiroPendente.expulso : null;   // o goleiro que saiu: o entrante herda o posto e o uniforme dele
        const base = G || P;
        // O uniforme: o do clube; o guarda-redes leva o dele.
        const uni = (base.role === 'gk') ? base.uniforme : ((typeof uniformeDe === 'function' && info) ? uniformeDe(info.nome) : base.uniforme);
        const N = new FootballPlayer(P.id, base.corCamisa, base.corCalcao, P.team, uni, sk.id);
        N.skills = sk;
        if (sk && sk.pe) N.pe = sk.pe;
        N.playingStyleFixo = sk.estilo || null;
        // O POSTO do que sai (ou, na troca obrigatoria, o do goleiro expulso).
        N.role = base.role;
        N.slot = base.slot;
        N.idxFormacao = base.idxFormacao;
        N.baseTarget.copy(base.baseTarget);
        N.dirZ = P.dirZ; N.targetGoalZ = P.targetGoalZ; N.ownGoalZ = P.ownGoalZ;
        N.playingStyleDesligado = P.playingStyleDesligado;   // o ON/OFF dos Playing Styles do time vale tambem para quem entra
        if (base.role === 'gk') { N.gkStyleBase = base.gkStyleBase; N.playingStyle = base.playingStyle; }
        const numero = this._numeroDoEntrante(req, P, lista);
        N.updateShirt(numero, base.pos);
        const idxPos = lista.slice(0, i).filter(q => q.pos === base.pos).length;
        if (base.role !== 'gk') this.aplicarPlayingStyle(N, base.pos, idxPos);
```

(isto substitui, uma a uma, as linhas equivalentes que usavam só `P`; manter o resto.) Onde o código copia o alvo de quem sai (`N.dynamicTarget.copy(P.dynamicTarget)` e `lugarBolaParada`), no ramo `opcoes.entrada`, usar `const alvo = G ? { x: G.baseTarget.x, z: G.baseTarget.z } : { x: P.dynamicTarget.x, z: P.dynamicTarget.z };` e `N.dynamicTarget.set(alvo.x, ALTURA_BASE_Y, alvo.z)`. Depois de `lista[i] = N;` acrescentar:

```js
        // O goleiro e sempre o indice 0 da lista (o jogo inteiro assume-o): o entrante vai para a frente e o lugar do que saiu fica vago (o time joga com menos um de linha).
        if (G) { lista.splice(i, 1); lista.unshift(N); this._limparGoleiroPendente(); }
```

- [ ] **Passo 6: Quem sai, na CPU** (`js/treinador_cpu.js`, junto de `escolherReserva`)

```js
    // Troca obrigatoria do goleiro expulso: sai o avancado mais adiantado, senao um medio, senao um defesa (o que nao esta no lance parado).
    saidaParaGoleiro(team) {
        const lista = (team === 'TeamA' ? Match.players : Match.opponents)
            .filter(p => p.role !== 'gk' && !p.naBarreiraFalta && p !== Match.setPieceTaker && p !== Match.repositor && !p.queda);
        const ordem = { atk: 0, ata: 0, mid: 1, def: 2 };
        lista.sort((a, b) => ((ordem[a.role] ?? 3) - (ordem[b.role] ?? 3)) || (b.dirZ * b.model.position.z - a.dirZ * a.model.position.z));
        return lista[0] || null;
    },
```

- [ ] **Passo 7: Armar, esperar e avisar**

`js/officials.js`, em `expulsar`, depois de `Match.expulsos.push(p);`: `if (p.role === 'gk' && typeof Match.goleiroExpulso === 'function') Match.goleiroExpulso(p);` e no `Ponte.enviar('expulsao', ...)` acrescentar `goleiro: p.role === 'gk'` ao objeto (`p.role` mantém-se `'gk'` até ao fim da função).

`js/match/match_loop.js`, no `update`, trocar a condição da espera das trocas por:

```js
        if ((this.subsEmCurso || this._aguardaEntrantes(dt) || this._aguardaGoleiro(dt)) && this._paradaParaSubstituir()) {
```

`js/narracao/ponte.js`, em `iniciar(m)`, junto de `Match.decisao = ...`: `Match.ladoDoUtilizador = (this.modo === 'visivel') ? (m.taticaDe === 'fora' ? 'fora' : 'casa') : null; Match.goleiroPendente = null;`.

`components/MatchDay.tsx`: estado `const [avisoGoleiro, setAvisoGoleiro] = useState(false);`. No `aoMensagem`, antes do ramo que já trata `m.tipo === 'expulsao'`, acrescentar `if (m.tipo === 'expulsao' && m.goleiro && m.lado === (match.homeTeamId === gameState.userTeamId ? 'A' : 'B')) setAvisoGoleiro(true);` e um ramo novo `else if (m.tipo === 'goleiro_trocado') setAvisoGoleiro(false);`. No `return`, por cima do cabeçalho:

```tsx
      {avisoGoleiro && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[250] bg-rose-700 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg shadow-xl">
          Goalkeeper sent off — take off an outfield player and bring on a goalkeeper
        </div>
      )}
```

Se o `TacticsView` impedir pôr um goleiro no lugar de um jogador de linha (verificar ao testar), liberar essa troca só enquanto `avisoGoleiro` estiver ligado (passar a flag pelo contexto, como `motor3dMensagem`).

- [ ] **Passo 8: Rodar e ver passar**

Run: `node 3dMatch/simulador3d/tests/goleiro_expulso.test.js`
Esperado: `tudo certo` (5 seções).

Regressão: `node --test --test-force-exit 3dMatch/simulador3d/tests/faltas_cartoes.test.js 3dMatch/simulador3d/tests/bancos_e_area_tecnica.test.js 3dMatch/simulador3d/tests/treinador_le_o_adversario.test.js 3dMatch/simulador3d/tests/falta_decisao.test.js` e `npx tsc --noEmit -p .`
Esperado: tudo passa.

- [ ] **Passo 9: Verificação manual** (skill `run`)

Forçar um vermelho ao goleiro do time do usuário (por exemplo, ajustando o jogo e provocando um carrinho do goleiro, ou pela ferramenta de laboratório de faltas). Conferir: o jogo pausa e o Tactics abre com o aviso vermelho; ao pedir um goleiro reserva no lugar de um jogador de linha o jogo segue com a placa do 4.º árbitro, o goleiro novo no gol e o aviso some; sem reserva no banco, um jogador de linha vai ao gol de uniforme de goleiro.

- [ ] **Passo 10: Commit**

```bash
git add "3dMatch/simulador3d/js" "3dMatch/simulador3d/tests/goleiro_expulso.test.js" "components/MatchDay.tsx"
git commit -m "feat(3d): goleiro expulso, troca obrigatoria por goleiro reserva ou jogador de linha"
```

---

### Tarefa 7: Documentação e verificação final

**Arquivos:**
- Alterar: `3dMatch/simulador3d/docs/filesSummary3d.md` (entrada nova no topo das atualizações: o que o `disputa_penaltis.js` e o `config/disputa.js` fazem, as mensagens `disputa_*` e os ganchos em `match_loop.js`, `match_physics.js`, `player.js`, `officials.js`, `bancos.js`, `ponte.js`)
- Alterar: `3dMatch/simulador3d/docs/superpowers/specs/2026-10-31-disputa-penaltis-3d-design.md` (corrigir a seção "Modelos e animações": o técnico é o de `Bancos`, e o aspeto do `ManagerAvatar` ficou de fora; os bancos ficam do mesmo lado)
- Alterar: `package.json` do manager: acrescentar `tests/disputa3d.test.ts` ao script `teste:base`; acrescentar `3dMatch/simulador3d/tests/disputa_posicoes.test.js`, `disputa_cobranca.test.js` e `disputa_fluxo.test.js` e `goleiro_expulso.test.js` ao script `3d:teste`.

- [ ] **Passo 1: Rodar tudo**

Run: `npm run teste:base && npm run 3d:teste && npx tsc --noEmit -p .`
Esperado: tudo verde.

Run: `node --test --test-force-exit 3dMatch/simulador3d/tests/*.test.js`
Esperado: sem falhas novas em relação ao estado anterior (anotar as que já falhavam antes, se houver).

- [ ] **Passo 2: Commit**

```bash
git add "3dMatch/simulador3d/docs" "package.json"
git commit -m "docs: disputa de penaltis em 3D (resumo dos ficheiros, spec corrigida, testes no script)"
```

---

## Auto-revisão

- **Cobertura da spec:** gatilho aos 90'+acréscimo (T2 passo 3); REUNIÃO com técnicos e meia-lua (T1, T4); sorteio do lado e de quem começa (T4 `iniciar`); ORDEM com modal e Iniciar (T5); PREPARO com juiz, goleiros, fila, bandeirinha, bola entregue e ajeitada (T4 `_prepararCobranca`, `_atualizarPreparo`); COBRANÇA pela física (T2); TROCA (T4 `update`, `receberProxima`); FIM, `pens` na app e `FIM_DE_JOGO` (T4 `_encerrar`, T5); placar dos pênaltis (T5); ESC (T4 `cancelar`, T5); 3D solto e sem decisão (T2 `podeIniciar`, T4 teste 5); sem resposta em 30 s (T4 teste 4); goleiro que bate (T2 teste 4); modal de texto só sem 3D (T5 `pens3d`); testes da spec (T1, T2, T3, T4). Goleiro expulso: T6 (reserva, sem reserva, 5 trocas, time do usuário, pedido do manager).
- **Fora de escopo, por decisão registrada acima:** aspeto do `ManagerAvatar` no técnico; comemoração do vencedor além da pausa de 4 s (`pausa.fim`).
- **Consistência de nomes:** `DisputaModel.posMarca/posEsperaBatedor/posGol/posJuiz/posGoleiroEspera/posBandeirinha/filaCentral/meiaLua/posTecnico` (T1) são os usados em T2 e T4; `DisputaPenaltis.cobrar/golNaBaliza/bolaFora/bateuNaTrave/passoDoJogador` (T2) são os usados em T4; `decisaoDoConfronto/emCampo/ordemParaOsEmCampo/proximaMensagem/idDoMotor` (T3) são os usados em T5.
- **Risco principal:** a Tarefa 2. A Tarefa 6 mexe em `executarSubstituicao`, que serve a todas as trocas: a regressão do passo 8 dela é obrigatória. Se o motor não aceitar batedor e goleiro de fora, o plano para ali e a spec precisa de revisão.
