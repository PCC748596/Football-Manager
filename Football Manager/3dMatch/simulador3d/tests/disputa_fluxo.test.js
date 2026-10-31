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

// Um jogo de copa empatado ate a DISPUTA, com o 3D recem-criado.
const comecarDisputa = () => {
    Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
    for (let i = 0; i < 120; i++) Match.update(dt);
    msgs.length = 0;
    Match.decisao = { agregadoCasa: 0, agregadoFora: 0 };
    Match.placarA = 0; Match.placarB = 0;
    Match.primeiroTempoAcabou = true; Match.acr1Calculado = true; Match.acr2Calculado = true; Match.acrescimo2 = 0;
    Match.tempoDeJogo = 2 * meio; Match.state = 'PLAY';
    Match.verificarFimDeTempo();
};
const rodar = (segundos) => { for (let i = 0; i < Math.round(segundos / dt) && Match.state !== 'FIM_DE_JOGO'; i++) Match.update(dt); };

console.log('4 — a ORDEM espera a decisao humana (prazo.ordem); so a resposta automatica da app (AGUARDA) aborta aos 30 s');
const prazos = DisputaModel.prazo;
verifica(prazos.ordem > prazos.app && prazos.app === 30, `prazo.ordem (${prazos.ordem} s) maior que prazo.app (${prazos.app} s)`, 'prazos: ' + JSON.stringify(prazos));
comecarDisputa();
for (let i = 0; i < 60 * 90 && !msgs.some(m => m.tipo === 'disputa_reuniao'); i++) Match.update(dt);
verifica(DisputaPenaltis.fase === 'ORDEM', 'a reuniao acabou: fase ORDEM', 'fase: ' + DisputaPenaltis.fase);
rodar(31);
verifica(DisputaPenaltis.activa && DisputaPenaltis.fase === 'ORDEM' && Match.state === 'DISPUTA', 'ORDEM aos 31 s: NAO aborta (o treinador ainda esta a decidir)', `abortou cedo: activa=${DisputaPenaltis.activa} estado=${Match.state}`);
rodar(prazos.ordem - 31 - 1);
verifica(DisputaPenaltis.activa, `ORDEM a ${prazos.ordem - 1} s: ainda activa`, 'abortou antes do prazo.ordem');
rodar(3);
verifica(Match.state === 'FIM_DE_JOGO' && !DisputaPenaltis.activa && !msgs.some(m => m.tipo === 'disputa_fim'), `ORDEM passado prazo.ordem (${prazos.ordem} s): aborta sem disputa_fim`, 'nao abortou: ' + Match.state);

console.log('4b — AGUARDA: sem resposta da app em 30 s depois de uma cobranca, aborta e o jogo termina como hoje');
comecarDisputa();
for (let i = 0; i < 60 * 90 && !msgs.some(m => m.tipo === 'disputa_reuniao'); i++) Match.update(dt);
const reun = msgs.find(m => m.tipo === 'disputa_reuniao').dados;
DisputaPenaltis.receberOrdens(reun.casa.map(j => j.id), reun.fora.map(j => j.id), { lado: reun.primeiro, jogadorId: reun[reun.primeiro][0].id });
for (let i = 0; i < 60 * 120 && !msgs.some(m => m.tipo === 'disputa_cobranca'); i++) Match.update(dt);
verifica(DisputaPenaltis.fase === 'AGUARDA', 'a primeira cobranca foi reportada: fase AGUARDA', 'fase: ' + DisputaPenaltis.fase);
rodar(29);
verifica(DisputaPenaltis.activa, 'AGUARDA aos 29 s: ainda activa', 'abortou cedo');
rodar(3);
verifica(Match.state === 'FIM_DE_JOGO' && !DisputaPenaltis.activa && !msgs.some(m => m.tipo === 'disputa_fim'), 'AGUARDA aos 32 s: abortou sem disputa_fim', 'nao abortou: ' + Match.state);

console.log('5 — sem decisao no iniciar: nada muda');
Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);
Match.decisao = null; Match.placarA = 1; Match.placarB = 1;
Match.primeiroTempoAcabou = true; Match.acr1Calculado = true; Match.acr2Calculado = true; Match.acrescimo2 = 0;
Match.tempoDeJogo = 2 * meio; Match.state = 'PLAY';
Match.verificarFimDeTempo();
verifica(Match.state === 'FIM_DE_JOGO', 'FIM_DE_JOGO direto', 'entrou em disputa sem decisao');

console.log('6 — o fim da disputa com uma cobranca a meio repoe a baliza do time e o papel de goleiro (goleiro a bater)');
Match.init(cena); Officials.init(cena); Match.resetPlay('TeamA');
for (let i = 0; i < 120; i++) Match.update(dt);
msgs.length = 0;
Match.decisao = { agregadoCasa: 0, agregadoFora: 0 };
Match.placarA = 0; Match.placarB = 0;
Match.primeiroTempoAcabou = true; Match.acr1Calculado = true; Match.acr2Calculado = true; Match.acrescimo2 = 0;
Match.tempoDeJogo = 2 * meio; Match.state = 'PLAY';
Match.verificarFimDeTempo();
for (let i = 0; i < 60 * 90 && !msgs.some(m => m.tipo === 'disputa_reuniao'); i++) Match.update(dt);
const gkCasa = Match.players.find(p => p.role === 'gk');
const gkFora = Match.opponents.find(p => p.role === 'gk');
DisputaPenaltis.receberOrdens(Match.players.map(p => DisputaPenaltis.idApp(p)), Match.opponents.map(p => DisputaPenaltis.idApp(p)), { lado: 'casa', jogadorId: DisputaPenaltis.idApp(gkCasa) });   // ids reais (o contrato com a app: skills.id)
for (let i = 0; i < 60 * 60 && !DisputaPenaltis._cobranca; i++) Match.update(dt);
verifica(!!DisputaPenaltis._cobranca && gkCasa.role !== 'gk', 'a cobranca do goleiro esta a meio (sem o papel gk)', 'a cobranca nao arrancou');
DisputaPenaltis._abortar();
verifica(gkCasa.role === 'gk', 'o goleiro-batedor voltou a ser gk', 'o goleiro-batedor ficou sem o papel gk');
const meioC = CAMPO_COMP / 2;
verifica([gkCasa, gkFora].every(p => p.dirZ === Lados.dirDe(p.team) && p.targetGoalZ === meioC * Lados.dirDe(p.team) && p.ownGoalZ === -meioC * Lados.dirDe(p.team)), 'a baliza do time foi reposta aos dois', 'os campos da baliza ficaram trocados');
verifica(!Match.disputa && !DisputaPenaltis.activa && !Match.penaltiPendente && Match.state === 'FIM_DE_JOGO', 'o jogo acabou sem disputa nem penalti pendente', 'estado final: ' + Match.state);
verifica(Match.players.concat(Match.opponents).every(p => !p.disputaOrdem), 'ninguem ficou preso na coreografia', 'alguem ficou com disputaOrdem');

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
process.exit(0);   // o harness deixa handles abertos: sai-se explicitamente (como os outros testes)
