/*
=============================================================================
DOMINIO ORIENTADO — decide o primeiro toque de quem recebe (config: DominioOrientadoModel)
=============================================================================
Chamado na recepcao no chao (resolveBallContact, match_physics.js), antes do gesto de dominio pela direita. Devolve { dir, velocidade, enganou } ou null
(nao leu o lance: o dominio de sempre). Puro no que decide; so o `aplicarEngano` mexe no marcador.

  1. LER: quem recebe le o lance a tempo com a chance da consciencia tactica e das reaccoes.
  2. ONDE: avalia `direccoes.n` direccoes a volta da frente de ataque; a nota pesa o espaco livre no ponto do toque, o progresso para a baliza, o fugir do
     marcador e o nao ir para tras. Com uma corrida avisada pelo proprio (Chemistry Intelligence), segue essa corrida.
  3. QUANTO: com espaco, toque longo (pela aceleracao dele, para chegar a bola antes do marcador); apertado, curto e protegido.
  4. COMO: a qualidade (drible + controlo de bola) desvia a direccao e a distancia.
  5. O MARCADOR: com o toque para o lado contrario ao dele, fica um instante sem reagir (touchLock e travado).
=============================================================================
*/
const DominioOrientado = {
    _norm(p, campos, base) {
        const v = (p && typeof p.atributoDe === 'function') ? p.atributoDe(campos, base) : 70;
        return Math.max(0, Math.min(1, (v - 50) / 49));
    },

    /** O adversario de campo mais perto de (x, z) e a distancia. */
    _maisPerto(advs, x, z) {
        let o = null, d = Infinity;
        for (const a of advs) {
            if (!a || !a.model || a.role === 'gk' || a.expulso) continue;
            const di = Math.hypot(a.model.position.x - x, a.model.position.z - z);
            if (di < d) { d = di; o = a; }
        }
        return { o, d };
    },

    decidir(p, rnd) {
        const M = (typeof DominioOrientadoModel !== 'undefined') ? DominioOrientadoModel : null;
        if (!M || !M.activo || !p || !p.model || p.role === 'gk') return null;
        const sorteio = rnd || Math.random;
        // 1. LER O LANCE
        const leitura = this._norm(p, ['tacticalAwa', 'reactions'], 'TEC');
        if (sorteio() >= Math.min(M.leitura.max, M.leitura.base + M.leitura.porAtributo * leitura)) return null;

        const advs = (p.team === 'TeamA') ? Match.opponents : Match.players;
        const px = p.model.position.x, pz = p.model.position.z, dirZ = p.dirZ || 1;
        const marc = this._maisPerto(advs, px, pz);

        // 2. ONDE: as direccoes a volta da frente de ataque (0 = para a baliza adversaria)
        let melhor = null;
        let chemDir = null;
        if (M.chemistry && typeof ChemistryIntel !== 'undefined' && typeof ChemistryIntelModel !== 'undefined' && ChemistryIntelModel.activo) {
            const a = ChemistryIntel.intencaoDe(p);
            if (a && a.estado === 'compreendida') { const dx = a.x - px, dz = a.z - pz, n = Math.hypot(dx, dz); if (n > 1) chemDir = { x: dx / n, z: dz / n }; }
        }
        // Na recepcao o aviso ja foi executado pelo passe: vale a propria corrida (quem recebe a correr para um espaco toca para la).
        if (!chemDir && M.chemistry && p.fsm && p.fsm.currentState === 'RUN_INTO_SPACE' && p.runAlvo) {
            const dx = p.runAlvo.x - px, dz = p.runAlvo.z - pz, n = Math.hypot(dx, dz);
            if (n > 1 && dz * dirZ > -0.2 * n) chemDir = { x: dx / n, z: dz / n };
        }
        const D = M.direccoes, P = M.pesos, T = M.toque;
        const cands = [];
        if (chemDir) cands.push({ x: chemDir.x, z: chemDir.z, chem: true });
        for (let i = 0; i < D.n; i++) {
            const ang = (-D.abertura + (2 * D.abertura) * i / Math.max(1, D.n - 1)) * Math.PI / 180;
            cands.push({ x: Math.sin(ang), z: Math.cos(ang) * dirZ, chem: false });
        }
        for (const c of cands) {
            const tx = px + c.x * T.espacoLongo, tz = pz + c.z * T.espacoLongo;
            if (Math.abs(tx) > CAMPO_LARG / 2 - 1.5 || Math.abs(tz) > CAMPO_COMP / 2 - 1.5) continue;
            const esp = Math.min(D.raioEspaco, this._maisPerto(advs, tx, tz).d) / D.raioEspaco;
            const progresso = c.z * dirZ;
            let fugir = 0;
            if (marc.o && marc.d < M.enganar.raioMarcador) {
                const mx = marc.o.model.position.x - px, mz = marc.o.model.position.z - pz, mn = Math.hypot(mx, mz) || 1;
                fugir = -(c.x * mx + c.z * mz) / mn;   // +1 para o lado contrario ao do marcador
            }
            const nota = P.espaco * esp + P.progresso * progresso + P.fugirMarcador * fugir - (progresso < -0.2 ? P.paraTras * (-progresso) : 0) + (c.chem ? 0.5 : 0);
            if (!melhor || nota > melhor.nota) melhor = { x: c.x, z: c.z, nota, esp, fugir };
        }
        if (!melhor) return null;

        // 3. QUANTO: com espaco, toque longo pela aceleracao dele; apertado, curto
        const espacoNoPonto = this._maisPerto(advs, px + melhor.x * T.espacoLongo, pz + melhor.z * T.espacoLongo).d;
        const acel = this._norm(p, ['acceleration', 'sprintSpeed'], 'SPEED');
        let dist = espacoNoPonto > T.espacoLongo ? T.longoMin + (T.longoMax - T.longoMin) * acel : T.curto;

        // 4. COMO: a qualidade do toque
        const q = this._norm(p, ['dribbling', 'ballControl'], 'TEC');
        const g = () => { const u = Math.max(1e-9, sorteio()), v = sorteio(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
        const desvio = g() * M.erro.anguloMax * (1 - q);
        const cs = Math.cos(desvio), sn = Math.sin(desvio);
        const dx = melhor.x * cs - melhor.z * sn, dz = melhor.x * sn + melhor.z * cs;
        dist *= Math.max(0.5, 1 + g() * M.erro.distMax * (1 - q));
        // a velocidade que poe a bola a `dist` m (rolamento com arrasto, a chegar mansa)
        const v = (typeof velocidadeParaChegarA === 'function') ? velocidadeParaChegarA(dist, T.vChegada, 14) : 2 + dist * 1.2;

        // 5. O MARCADOR: o toque para o lado contrario ao dele
        let enganou = null;
        if (marc.o && marc.d < M.enganar.raioMarcador && melhor.fugir > -M.enganar.cosLadoOposto) {
            const drible = p.atributoDe ? p.atributoDe(['dribbling', 'agility'], 'TEC') : 70;
            const reac = marc.o.atributoDe ? marc.o.atributoDe(['reactions', 'anticipation'], 'INTERCEPT') : 70;
            enganou = { marcador: marc.o, t: Math.min(M.enganar.max, Math.max(0.1, M.enganar.base + ((drible - reac) / 10) * M.enganar.porDiferenca)) };
        }
        return { dir: { x: dx, z: dz }, velocidade: v, dist, enganou, chem: !!(chemDir && melhor.x === chemDir.x && melhor.z === chemDir.z) };
    },

    /** O marcador apanhado em contrapé: um instante sem tocar na bola e travado. */
    aplicarEngano(enganou) {
        if (!enganou || !enganou.marcador) return;
        const m = enganou.marcador, E = DominioOrientadoModel.enganar;
        m.touchLock = Math.max(m.touchLock || 0, enganou.t);
        if (m.velocity) m.velocity.multiplyScalar(E.travagem);
        if (typeof MatchStats !== 'undefined' && MatchStats[m.team === 'TeamA' ? 'TeamB' : 'TeamA']) {
            const s = MatchStats[m.team === 'TeamA' ? 'TeamB' : 'TeamA'];
            s.dominiosOrientadosEnganaram = (s.dominiosOrientadosEnganaram || 0) + 1;
        }
    }
};
if (typeof window !== 'undefined') window.DominioOrientado = DominioOrientado;
