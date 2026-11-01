/*
A COBRANCA DA DISPUTA COMO O PENALTI EM JOGO (relatos do teste no browser), com o fluxo inteiro e a app falsa, nas DUAS balizas (sinalZ +1 e -1) e com os dois times a bater
e a defender:
  1. o juiz fica no sitio do penalti em jogo (Officials.pontoDoArbitro, ramo PENALTY) durante a cobranca;
  2. o goleiro que espera fica SOBRE a linha lateral da grande area, a 5 m da linha de fundo, do lado contrario ao bandeirinha;
  3. os goleiros nao olham para o ceu: a cabeca nivelada no preparo, antes do contato e depois da defesa;
  4. o goleiro que defendeu nao desaparece: visivel, na area da baliza da disputa, sem saltos (o `updateGK` teletransportava-o 88 m para a sua grande area);
  5. o batedor fica ~4 s parado na espera antes da corrida (DisputaModel.pausa.esperaBatida);
  6. o batedor espera ao lado da linha da bola, do lado contrario ao pe bom (PenaltyModel.desvioBatedor, a conta do setupSetPiece);
  7. o goleiro que defende esta na linha de golo antes do contato (como no penalti em jogo).
Corre com: node tests/disputa_cobranca_posicoes.test.js
*/
require('../tools/headless/harness.js');

let falhas = 0;
const ok = m => console.log('  . ' + m);
const erro = m => { console.log('  X ' + m); falhas++; };
const verifica = (cond, bom, mau) => { if (cond) ok(bom); else erro(mau); };

let semente = 7;
Math.random = () => { semente = (semente + 0x6D2B79F5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

if (typeof Sim === 'undefined') global.Sim = {};
Sim.running = false;
const cena = new THREE.Scene();
const dt = 1 / 60;
const q = new THREE.Quaternion(), v = new THREE.Vector3();
// A inclinacao da cabeca (graus, + = para cima): a frente do pescoco no mundo.
const inclinacao = (p) => { const n = p.rig && (p.rig.head || p.rig.neck); if (!n) return 0; p.model.updateMatrixWorld(true); n.getWorldQuaternion(q); v.set(0, 0, 1).applyQuaternion(q); return Math.asin(Math.max(-1, Math.min(1, v.y))) * 180 / Math.PI; };

function disputa(sinalZ, nCobrancas) {
    Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
    for (let i = 0; i < 120; i++) Match.update(dt);
    // Canhotos e destros entre os batedores (o desvio da espera e para o lado contrario ao pe bom).
    Match.players.concat(Match.opponents).forEach((p, i) => { if (p.role !== 'gk') p.pe = (i % 2) ? 'e' : 'd'; });
    const msgs = [];
    Ponte.modo = 'visivel'; Ponte.enviar = (tipo, dados) => msgs.push({ tipo, dados });
    DisputaPenaltis.iniciar();
    DisputaPenaltis.sinalZ = sinalZ;   // a baliza do teste (o sorteio ainda nao foi usado)
    const D = DisputaPenaltis, M = 53;
    const r = { kicks: [], cabeca: [], vigia: [], espera: [], juiz: [] };
    let k = null, vig = null, n = 0, antes = null, ultimaCob = null;
    while (D.activa && n < 60 * 600) {
        const estadoAntes = Match.state, faseAntes = D.fase;
        const gkAntes = k && k.goleiro ? { x: k.goleiro.model.position.x, z: k.goleiro.model.position.z, cab: inclinacao(k.goleiro) } : null;
        const arbAntes = Officials.arbitro.model.position.clone();
        const juizEsperado = (Match.state === 'PENALTY') ? Officials.pontoDoArbitro(Match.ball) : null;
        Match.update(dt); n++;
        // O inicio da cobranca (cobrar): onde esta o batedor e quando.
        // Uma cobranca NOVA (a anterior pode ainda estar no desfecho depois do resultado).
        if (D._cobranca && !k && !D._cobranca.desfecho && D._cobranca !== ultimaCob) {
            ultimaCob = D._cobranca;
            const c = D._cobranca;
            k = { lado: c.lado, batedor: c.batedor, goleiro: c.goleiro, pe: c.batedor.pe, t0: n, p0: { x: c.batedor.model.position.x, z: c.batedor.model.position.z }, maxMov4: 0 };
        }
        if (k && D._cobranca && k.tContato === undefined) {
            const b = k.batedor.model.position;
            if ((n - k.t0) * dt < (DisputaModel.pausa.esperaBatida - 0.1)) k.maxMov4 = Math.max(k.maxMov4, Math.hypot(b.x - k.p0.x, b.z - k.p0.z));
            // O contato: o estado passa de PENALTY a PLAY; o goleiro e o juiz medem-se no ultimo frame de PENALTY.
            if (estadoAntes === 'PENALTY' && Match.state === 'PLAY') {
                k.tContato = (n - k.t0) * dt;
                k.gk = gkAntes;
                k.juiz = juizEsperado ? Math.hypot(arbAntes.x - juizEsperado.x, arbAntes.z - juizEsperado.z) : null;
            }
        }
        // Depois do fim da cobranca: o goleiro que defendeu, frame a frame, ate ao contato seguinte.
        if (vig) {
            const p = vig.g.model.position;
            const salto = Math.hypot(p.x - vig.x, p.z - vig.z);
            vig.pior = Math.max(vig.pior, salto); vig.x = p.x; vig.z = p.z;
            if (!vig.g.model.visible) vig.invisivel = true;
            if (Math.sign(p.z) !== sinalZ || Math.abs(p.z) < M - 16.5 - 1 || Math.abs(p.x) > 21.5 || p.y < -0.9) vig.fora = `(${p.x.toFixed(1)}, ${p.y.toFixed(2)}, ${p.z.toFixed(1)}) em ${D.fase}`;
            if (D._cobranca && Match.state === 'PLAY' && estadoAntes === 'PENALTY') { r.vigia.push(vig); vig = null; }
        }
        // A cabeca dos goleiros nas fases em que estao parados ou a acabar de andar (entrega, ajeita, recuo) e depois de a coreografia os levantar.
        if (D.fase === 'PREPARO' && ['entrega', 'ajeita', 'recuo'].includes(D.sub)) {
            for (const g of Match.players.concat(Match.opponents).filter(p => p.role === 'gk')) r.cabeca.push({ fase: D.sub, ang: inclinacao(g), team: g.team });
        }
        if (D.fase === 'PREPARO' && D.sub === 'recuo' && D.tSub < dt * 1.5) {
            // O goleiro que espera (o do time que bate, se nao bate) e o bandeirinha.
            const a = D.atual, gEsp = (a.lado === 'casa' ? Match.players : Match.opponents).find(p => p.role === 'gk' && p !== a.batedor);
            const lin = D.partes.find(s => s.tipo === 'lin');
            if (gEsp && lin) r.espera.push({ g: { x: gEsp.model.position.x, z: gEsp.model.position.z }, lin: { x: lin.model.position.x, z: lin.model.position.z } });
            r.juiz.push(Math.hypot(Officials.arbitro.model.position.x - DisputaModel.posJuiz(sinalZ).x, Officials.arbitro.model.position.z - DisputaModel.posJuiz(sinalZ).z));
        }
        const rr = msgs.find(m => m.tipo === 'disputa_reuniao' && !m.lido);
        if (rr && D.fase === 'ORDEM') { rr.lido = true; D.receberOrdens(rr.dados.casa.map(j => j.id), rr.dados.fora.map(j => j.id), { lado: rr.dados.primeiro, jogadorId: rr.dados[rr.dados.primeiro].find(j => !j.gk).id }); }
        const c = msgs.find(m => m.tipo === 'disputa_cobranca' && !m.lido);
        if (c && D.fase === 'AGUARDA') {
            c.lido = true;
            k.resultado = c.dados.resultado; r.kicks.push(k);
            vig = { g: k.goleiro, x: k.goleiro.model.position.x, z: k.goleiro.model.position.z, pior: 0, resultado: k.resultado, fora: null, invisivel: false };
            k = null;
            const feitas = msgs.filter(m => m.tipo === 'disputa_cobranca').length, r0 = msgs.find(m => m.tipo === 'disputa_reuniao');
            if (feitas >= nCobrancas) D.receberProxima({ fim: true, vencedor: 'casa', pens: [1, 0] });
            else { const lado = c.dados.lado === 'casa' ? 'fora' : 'casa'; const lista = r0.dados[lado].filter(j => !j.gk); D.receberProxima({ lado, jogadorId: lista[(feitas >> 1) % lista.length].id }); }
        }
    }
    return r;
}

for (const sinalZ of [1, -1]) {
    console.log(`\n== baliza sinalZ ${sinalZ}`);
    const r = disputa(sinalZ, 6);
    verifica(r.kicks.length === 6 && r.kicks.some(x => x.lado === 'casa') && r.kicks.some(x => x.lado === 'fora'), '6 cobrancas, os dois times a bater e a defender', 'cobrancas: ' + r.kicks.length);
    verifica(r.kicks.some(x => x.pe === 'e') && r.kicks.some(x => x.pe !== 'e'), 'batedores canhotos e destros', 'so um pe entre os batedores');
    verifica(r.kicks.some(x => x.resultado === 'defesa'), 'houve defesas: ' + r.kicks.map(x => x.resultado).join(','), 'nenhuma defesa nesta semente (o caso 4 nao foi exercitado)');
    for (const [i, x] of r.kicks.entries()) {
        const rot = `cobranca ${i + 1} (${x.lado}, goleiro ${x.goleiro.team}, pe ${x.pe || 'd'})`;
        // 6. o desvio do batedor
        const esp = DisputaModel.posEsperaBatedor(sinalZ, x.pe);
        const ladoEsperado = ((x.pe === 'e') ? -1 : 1) * sinalZ;
        verifica(Math.hypot(x.p0.x - esp.x, x.p0.z - esp.z) < 0.35 && Math.sign(x.p0.x) === ladoEsperado, `${rot}: batedor na espera com o desvio (x ${x.p0.x.toFixed(2)})`, `${rot}: batedor em (${x.p0.x.toFixed(2)}, ${x.p0.z.toFixed(2)}), esperado (${esp.x.toFixed(2)}, ${esp.z.toFixed(2)})`);
        // 5. a espera antes da corrida
        verifica(x.tContato >= DisputaModel.pausa.esperaBatida, `${rot}: contato aos ${x.tContato.toFixed(1)} s do inicio (>= ${DisputaModel.pausa.esperaBatida})`, `${rot}: contato cedo, aos ${x.tContato && x.tContato.toFixed(1)} s`);
        verifica(x.maxMov4 < 0.1, `${rot}: parado nos primeiros ${DisputaModel.pausa.esperaBatida - 0.1} s (mexeu ${x.maxMov4.toFixed(3)} m)`, `${rot}: mexeu ${x.maxMov4.toFixed(2)} m durante a espera`);
        // 7. o goleiro na linha
        verifica(x.gk && Math.abs(x.gk.z - sinalZ * 53) < 0.05 && Math.abs(x.gk.x) < 0.3, `${rot}: goleiro na linha antes do contato (z ${x.gk && x.gk.z.toFixed(3)})`, `${rot}: goleiro fora da linha: ${JSON.stringify(x.gk)}`);
        // 3. a cabeca antes do contato (o penalti em jogo da cerca de -6 graus)
        verifica(x.gk && Math.abs(x.gk.cab) < 12, `${rot}: cabeca do goleiro nivelada antes do contato (${x.gk && x.gk.cab.toFixed(1)} graus)`, `${rot}: goleiro a olhar ${x.gk && x.gk.cab.toFixed(1)} graus`);
        // 1. o juiz no sitio do penalti em jogo
        verifica(x.juiz !== null && x.juiz < 0.6, `${rot}: juiz no sitio do penalti em jogo (a ${x.juiz && x.juiz.toFixed(2)} m)`, `${rot}: juiz a ${x.juiz && x.juiz.toFixed(2)} m do sitio do penalti em jogo`);
    }
    // 4. o goleiro depois de cada cobranca
    for (const [i, g] of r.vigia.entries()) {
        verifica(!g.invisivel && !g.fora && g.pior < 1.0, `depois da cobranca ${i + 1} (${g.resultado}): goleiro visivel, na area da disputa, maior passo ${g.pior.toFixed(2)} m`,
            `depois da cobranca ${i + 1} (${g.resultado}): invisivel ${g.invisivel}, fora ${g.fora}, maior passo ${g.pior.toFixed(2)} m`);
    }
    // 3. a cabeca dos goleiros no preparo (incluindo o que acabou de defender)
    const piorCab = r.cabeca.reduce((m, c) => Math.max(m, Math.abs(c.ang)), 0);
    verifica(r.cabeca.length > 0 && piorCab < 12, `cabeca dos goleiros no preparo: pior ${piorCab.toFixed(1)} graus`, `cabeca dos goleiros no preparo: pior ${piorCab.toFixed(1)} graus (a olhar para o ceu)`);
    // 2. o goleiro que espera e o bandeirinha
    for (const e of r.espera) {
        verifica(Math.abs(Math.abs(e.g.x) - 20.16) < 0.4 && Math.abs(e.g.z - sinalZ * 48) < 0.4, `goleiro a espera sobre a linha da grande area (${e.g.x.toFixed(2)}, ${e.g.z.toFixed(2)})`, `goleiro a espera em (${e.g.x.toFixed(2)}, ${e.g.z.toFixed(2)})`);
        verifica(Math.sign(e.g.x) !== Math.sign(e.lin.x), 'do lado contrario ao bandeirinha', `goleiro e bandeirinha do mesmo lado (${e.g.x.toFixed(1)} / ${e.lin.x.toFixed(1)})`);
    }
    verifica(r.espera.length > 0, 'mediu o goleiro que espera', 'nao mediu o goleiro que espera');
    // 1. o juiz no posto da disputa (o mesmo do penalti em jogo) antes do recuo
    verifica(r.juiz.length > 0 && r.juiz.every(d => d < 0.6), `juiz no posto antes da cobranca (pior ${Math.max(...r.juiz).toFixed(2)} m)`, 'juiz longe do posto: ' + r.juiz.map(d => d.toFixed(2)).join(','));
}

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
process.exit(0);
