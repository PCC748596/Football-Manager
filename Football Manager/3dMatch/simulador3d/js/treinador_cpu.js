/*
=============================================================================
O TREINADOR DA CPU — muda a tatica e faz substituicoes conforme o jogo
=============================================================================
Pedido: o conhecimento tatico do treinador (0-100, `Team.managerTactics`) passa a mandar no 3D: a CPU muda a equipa de acordo com o resultado, o minuto e os cartoes (e, numa segunda etapa, a posicao na
tabela). Na partida do utilizador so mexe a equipa da CPU; nas simulacoes em lote, as duas.

COMO FUNCIONA
  . `registar(team, { conhecimento, base })` poe a equipa ('TeamA'/'TeamB') sob o comando de um treinador. `base` = a tatica propria dela ({ estilo, pressaoDefensiva, linhaDefensiva }, nos nomes do motor).
  . A cada `Match.update` o `tick` olha o placar, o minuto e os vermelhos; decide de `intervalo` em `intervalo` minutos de jogo e logo a seguir a um golo ou a um vermelho (com a demora de reaccao do
    treinador). A decisao e uma INTENCAO (atacar, recuar, segurar a bola, normal) igual a do motor de texto (textSim/teamAI.ts) e vira tatica propria da equipa em `Tatics.porEquipa[team]`
    (ver `taticaDe`, config/tactics.js).
  . O CONHECIMENTO manda em tres coisas: o minuto efetivo da leitura (cada ponto acima de 70 adianta 0,3 min: um 94 reage ~7 min antes, um 50 ~6 min depois), a demora de reaccao (`demoraS`) e o
    risco de NAO ler o jogo (abaixo de 60 ha a probabilidade (60 - k)/100 de ficar na tatica base).
  . SUBSTITUICOES por cartoes: com amarelo, defesas e medios saem a partir de `minutoAmarelo` (mais cedo com mais conhecimento); com vermelho, o treinador tira o avancado mais adiantado e mete um defesa
    (se nao estiver a perder por 2+). Um reserva do mesmo papel entra pelo caminho de sempre (`Match.pedirSubstituicao`: nas simulacoes em lote e instantaneo; no jogo visivel passa pelo aquecimento e pela placa).
=============================================================================
*/
const TreinadorCPU = {
    activo: true,
    intervalo: 5.0,          // minutos de jogo entre leituras
    minutoAmarelo: 62,       // com conhecimento 70; mais cedo com mais conhecimento (-0,25 min por ponto), mais tarde com menos
    maxTrocas: 5,
    equipas: { TeamA: null, TeamB: null },   // team -> { conhecimento, base, ultimoMin, reagirEm, golosVistos, vermelhosVistos, trocas, intencao }
    _log: [],

    registar(team, dados) {
        const base = Object.assign({ estilo: 'balanceado', pressaoDefensiva: 'balanced', linhaDefensiva: 'medium' }, (dados && dados.base) || {});
        this.equipas[team] = { conhecimento: (dados && typeof dados.conhecimento === 'number') ? dados.conhecimento : 70, base: base, ultimoMin: 0, reagirEm: null, golosVistos: 0, vermelhosVistos: 0, trocas: 0, intencao: 'BALANCED', pedidas: 0 };
        if (typeof Tatics !== 'undefined' && Tatics.porEquipa) Tatics.porEquipa[team] = Object.assign({}, base);
    },

    limpar() {
        this.equipas = { TeamA: null, TeamB: null };
        this._log = [];
        if (typeof Tatics !== 'undefined' && Tatics.porEquipa) { Tatics.porEquipa.TeamA = null; Tatics.porEquipa.TeamB = null; }
    },

    // O minuto de jogo (1..), como o resto do motor o conta.
    minuto() { return Match.tempoDeJogo / 60 + 1; },

    _estado(team) {
        const meus = team === 'TeamA' ? Match.placarA : Match.placarB, deles = team === 'TeamA' ? Match.placarB : Match.placarA;
        const listaMeus = team === 'TeamA' ? Match.players : Match.opponents, listaDeles = team === 'TeamA' ? Match.opponents : Match.players;
        const emCampo = (l) => l.length;
        const vermelhosMeus = 11 - emCampo(listaMeus), vermelhosDeles = 11 - emCampo(listaDeles);
        return { dif: meus - deles, golos: meus + deles, vermelhosMeus: Math.max(0, vermelhosMeus), vermelhosDeles: Math.max(0, vermelhosDeles) };
    },

    // A intencao do treinador (a mesma logica do motor de texto, com o minuto efetivo e os vermelhos).
    decidirIntencao(T, e, minuto) {
        const m = minuto + (T.conhecimento - 70) * 0.3;
        // Menos conhecimento, menos leitura: as vezes nao reage e fica na tatica base.
        if (T.conhecimento < 60 && Math.random() < (60 - T.conhecimento) / 100) return 'BALANCED';
        const dif = e.dif;
        if (e.vermelhosMeus > e.vermelhosDeles) {            // com menos um
            if (dif > 0) return 'RETREAT';
            if (dif < 0 && m >= 70) return 'ATTACK';
            return 'RETREAT';
        }
        if (e.vermelhosDeles > e.vermelhosMeus) return dif > 0 ? 'POSSESS' : 'ATTACK';   // com mais um: ataca para decidir, ou gere
        if (dif <= -2 && m > 45) return 'ATTACK';
        if (dif < 0 && m >= 60) return 'ATTACK';
        if (dif >= 2 && m >= 70) return 'POSSESS';
        if (dif === 1 && m >= 80) return 'RETREAT';
        if (dif === 1 && m >= 70) return 'POSSESS';
        return 'BALANCED';
    },

    // A tatica propria que corresponde a intencao (sobre a base da equipa).
    taticaDeIntencao(base, intencao) {
        const t = Object.assign({}, base);
        switch (intencao) {
            case 'ATTACK': t.estilo = (base.estilo === 'muito_ofensiva') ? 'muito_ofensiva' : 'ataque'; t.pressaoDefensiva = 'high'; t.linhaDefensiva = 'high'; break;
            case 'RETREAT': t.estilo = 'muito_defensiva'; t.pressaoDefensiva = 'low'; t.linhaDefensiva = 'low'; break;
            case 'POSSESS': t.estilo = 'balanceado'; t.pressaoDefensiva = 'low'; t.linhaDefensiva = 'medium'; break;
            default: break;
        }
        return t;
    },

    tick(dt) {
        if (!this.activo || typeof Tatics === 'undefined' || !Tatics.porEquipa) return;
        if (Match.state !== 'PLAY' && Match.state !== 'GOAL' && Match.state !== 'FREE_KICK' && Match.state !== 'CORNER_KICK' && Match.state !== 'THROW_IN' && Match.state !== 'GOAL_KICK') return;
        const min = this.minuto();
        for (const team of ['TeamA', 'TeamB']) {
            const T = this.equipas[team];
            if (!T) continue;
            const e = this._estado(team);
            // Um golo ou um vermelho novo: reage depois da demora do treinador.
            if (e.golos !== T.golosVistos || e.vermelhosMeus + e.vermelhosDeles !== T.vermelhosVistos) {
                T.golosVistos = e.golos; T.vermelhosVistos = e.vermelhosMeus + e.vermelhosDeles;
                T.reagirEm = Match.tempoDeJogo + Math.max(2, (100 - T.conhecimento) * 0.3);
            }
            const proximo = T.ultimoMin + this.intervalo;
            const porTempo = min >= proximo;
            const porEvento = T.reagirEm !== null && Match.tempoDeJogo >= T.reagirEm;
            if (!porTempo && !porEvento) continue;
            if (porTempo) T.ultimoMin = Math.floor(min / this.intervalo) * this.intervalo;
            T.reagirEm = null;
            const intencao = this.decidirIntencao(T, e, min);
            if (intencao !== T.intencao) {
                T.intencao = intencao;
                Tatics.porEquipa[team] = this.taticaDeIntencao(T.base, intencao);
                this._log.push({ min: Math.floor(min), team, intencao, dif: e.dif, k: T.conhecimento });
            }
            this.substituicoesPorCartoes(team, T, e, min);
        }
    },

    // ---------------------------------------------------------------------------------------------
    // SUBSTITUICOES por cartoes.
    substituicoesPorCartoes(team, T, e, min) {
        if (T.trocas + T.pedidas >= this.maxTrocas) return;
        const lado = team === 'TeamA' ? 'casa' : 'fora';
        if (Match.subsPendentes.some(r => !r.feita && r.lado === lado)) return;    // uma de cada vez
        const lista = team === 'TeamA' ? Match.players : Match.opponents;
        let sai = null, motivo = '';
        // VERMELHO: com menos um, tira o avancado mais adiantado e mete um defesa (nao se estiver a perder por 2 ou mais).
        if (e.vermelhosMeus > e.vermelhosDeles && e.dif > -2 && !T.trocouPorVermelho) {
            const avancados = lista.filter(p => p.role === 'atk' && !p.naBarreiraFalta);
            if (avancados.length) { avancados.sort((a, b) => b.dirZ * b.model.position.z - a.dirZ * a.model.position.z); sai = avancados[0]; motivo = 'vermelho'; T.trocouPorVermelho = true; }
        }
        // AMARELO: defesas e medios com amarelo saem a partir do minuto do treinador (mais cedo com mais conhecimento).
        if (!sai) {
            const desde = this.minutoAmarelo - (T.conhecimento - 70) * 0.25;
            if (min >= desde) {
                const amarelados = lista.filter(p => p.temAmarelo && (p.role === 'def' || p.role === 'mid') && p.role !== 'gk');
                if (amarelados.length) { amarelados.sort((a, b) => (a.skills ? a.skills.tec : 0) - (b.skills ? b.skills.tec : 0)); sai = amarelados[0]; motivo = 'amarelo'; }
            }
        }
        if (!sai) return;
        const papelEntra = (motivo === 'vermelho') ? 'def' : sai.role;
        const reserva = this.escolherReserva(team, papelEntra, sai);
        if (!reserva) return;
        const req = { lado: lado, sai: String(sai.skills && sai.skills.id), entra: String(reserva.id), jogador: reserva.sk, _sk: reserva.sk, _motivoCPU: motivo };
        if (Match.pedirSubstituicao(req)) {
            T.pedidas++;
            this._usados = this._usados || new Set(); this._usados.add(reserva.id);
            this._log.push({ min: Math.floor(min), team, troca: (sai.skills ? sai.skills.nome : '?') + ' -> ' + reserva.sk.nome, motivo });
        }
    },

    // Os reservas da equipa: o banco do manager (`info.reservas`, com as skills ja convertidas) ou, nas simulacoes, o plantel menos quem esta em campo.
    reservasDe(team) {
        const info = team === 'TeamA' ? Match.equipaInfoA : Match.equipaInfoB;
        if (!info) return [];
        const usados = this._usados || new Set();
        const emJogo = new Set();
        [].concat(Match.players, Match.opponents, Match.expulsos || [], (Match.subsFeitas || []).map(s => s.sai)).forEach(p => { if (p && p.skills) emJogo.add(p.skills.id); });
        if (info.reservas && info.reservas.length) return info.reservas.filter(r => !usados.has(r.id) && !emJogo.has(r.id));
        return (info.plantel || []).filter(j => !usados.has(j.id) && !emJogo.has(j.id)).map(j => ({ id: j.id, sk: j }));
    },

    escolherReserva(team, papel, sai) {
        const rs = this.reservasDe(team).filter(r => r.sk && r.sk.role === papel && r.sk.role !== 'gk');
        if (!rs.length) return null;
        const nota = (r) => ((r.sk.pb && sai.pos && r.sk.pb[sai.pos]) || 40) + ((r.sk.tec || 0) + (r.sk.pass || 0) + (r.sk.marking || 0)) / 6;
        rs.sort((a, b) => nota(b) - nota(a));
        return rs[0];
    }
};
if (typeof window !== 'undefined') window.TreinadorCPU = TreinadorCPU;
