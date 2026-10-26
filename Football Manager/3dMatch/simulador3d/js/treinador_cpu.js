/*
=============================================================================
O TREINADOR DA CPU — muda a tatica e faz substituicoes conforme o jogo
=============================================================================
Pedido: o conhecimento tatico do treinador (0-100, `Team.managerTactics`) passa a mandar no 3D: a CPU muda a equipa de acordo com o resultado, o minuto e os cartoes (e, numa segunda etapa, a posicao na
tabela). Na partida do utilizador so mexe a equipa da CPU; nas simulacoes em lote, as duas.

COMO FUNCIONA
  . `registar(team, { conhecimento, base })` poe a equipa ('TeamA'/'TeamB') sob o comando de um treinador. `base` = a tatica propria dela ({ estilo, pressaoDefensiva, linhaDefensiva }, nos nomes do motor).
  . A cada `Match.update` o `tick` olha o placar, o minuto e os vermelhos; decide de `intervalo` em `intervalo` minutos de jogo e logo a seguir a um golo ou a um vermelho (com a demora de reaccao do
    treinador). A POSICAO NA TABELA (`tabela`: { posicao, total, posicaoAdv }) define o objetivo do clube e a postura de partida. A decisao e uma INTENCAO (atacar, recuar, segurar a bola, normal) igual a do motor de texto (textSim/teamAI.ts) e vira tatica propria da equipa em `Tatics.porEquipa[team]`
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
    maxTrocas: 5,            // por jogo oficial
    maxTrocasAmistoso: 11,   // num amistoso as trocas nao tem limite (so o banco)
    equipas: { TeamA: null, TeamB: null },   // team -> { conhecimento, base, ultimoMin, reagirEm, golosVistos, vermelhosVistos, trocas, intencao }
    _log: [],

    registar(team, dados) {
        const base = Object.assign({ estilo: 'balanceado', pressaoDefensiva: 'balanced', linhaDefensiva: 'medium' }, (dados && dados.base) || {});
        const k = (dados && typeof dados.conhecimento === 'number') ? dados.conhecimento : 70;
        const tabela = (dados && dados.tabela && dados.tabela.posicao && dados.tabela.total) ? dados.tabela : null;
        this.equipas[team] = { conhecimento: k, base: base, tabela: tabela, objetivo: this.objetivoDe(tabela), amistoso: !!(dados && dados.amistoso), maxTrocas: (dados && dados.amistoso) ? this.maxTrocasAmistoso : this.maxTrocas, amarelosVistos: 0, ultimoMin: 0, reagirEm: null, golosVistos: 0, vermelhosVistos: 0, trocas: 0, intencao: 'BALANCED', pedidas: 0 };
        // A POSICAO NA TABELA muda a postura de PARTIDA (so com leitura de jogo: conhecimento >= 60): contra um adversario muito melhor classificado o treinador fecha-se; contra um muito pior, ataca.
        const T = this.equipas[team];
        T.base = this.ajustarBasePorTabela(base, T);
        if (typeof Tatics !== 'undefined' && Tatics.porEquipa) Tatics.porEquipa[team] = Object.assign({}, T.base);
    },

    // O objetivo do clube pela posicao: titulo (os 20% de cima), vaga (ate 40%), meio, rebaixamento (os 30% de baixo).
    objetivoDe(tabela) {
        if (!tabela) return 'MEIO';
        const f = tabela.total > 1 ? (tabela.posicao - 1) / (tabela.total - 1) : 0.5;
        return f <= 0.2 ? 'TITULO' : f <= 0.4 ? 'VAGA' : f >= 0.7 ? 'REBAIXAMENTO' : 'MEIO';
    },

    ajustarBasePorTabela(base, T) {
        const t = Object.assign({}, base);
        if (!T.tabela || !(T.tabela.posicaoAdv > 0) || T.conhecimento < 60) return t;
        const d = T.tabela.posicaoAdv - T.tabela.posicao;          // > 0: o adversario esta pior classificado
        const limiar = Math.max(4, Math.round(T.tabela.total * 0.3));
        if (d >= limiar) { if (t.estilo === 'balanceado' || t.estilo === 'defesa') t.estilo = 'ataque'; t.pressaoDefensiva = 'balanced'; }
        else if (d <= -limiar && T.objetivo !== 'TITULO') { if (t.estilo === 'balanceado' || t.estilo === 'ataque') t.estilo = 'defesa'; t.pressaoDefensiva = 'low'; t.linhaDefensiva = 'low'; }
        return t;
    },

    limpar() {
        this.equipas = { TeamA: null, TeamB: null };
        this._log = [];
        if (typeof Tatics !== 'undefined' && Tatics.porEquipa) { Tatics.porEquipa.TeamA = null; Tatics.porEquipa.TeamB = null; }
    },

    // O minuto de jogo (1..), como o resto do motor o conta.
    minuto() { return Match.tempoDeJogo / 60 + 1; },

    // Os jogadores de campo desta equipa com amarelo (os que pressionam e disputam bolas): defesas e medios pesam mais.
    amarelosEmCampo(team) {
        const lista = team === 'TeamA' ? Match.players : Match.opponents;
        let n = 0;
        for (const p of lista) if (p.temAmarelo && p.role !== 'gk') n += (p.role === 'def' || p.role === 'mid') ? 1 : 0.5;
        return n;
    },

    // A PRESSAO NAO PODE SER ALTA COM AMARELOS: um jogador amarelado que pressiona arrisca a expulsao. Com amarelos o treinador baixa a pressao da equipa (e, mais tarde, troca-os: ver `substituicoesPorCartoes`).
    limitarPorAmarelos(tatica, amarelos) {
        const t = Object.assign({}, tatica);
        const ordem = { low: 0, balanced: 1, high: 2 };
        const teto = amarelos >= 3 ? 'low' : amarelos >= 1 ? 'balanced' : 'high';
        if (ordem[t.pressaoDefensiva] > ordem[teto]) t.pressaoDefensiva = teto;
        // E a agressividade tambem: com amarelos o treinador manda ter cuidado nos duelos.
        const agr = { muito_passiva: 0, passiva: 1, balanceada: 2, agressiva: 3, muito_agressiva: 4 };
        const tetoAgr = amarelos >= 3 ? 'passiva' : amarelos >= 1 ? 'balanceada' : null;
        if (tetoAgr && agr[t.agressividade] > agr[tetoAgr]) t.agressividade = tetoAgr;
        return t;
    },

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
        // O OBJETIVO (posicao na tabela): quem luta pelo titulo ou pela vaga precisa de ganhar e arrisca mais cedo; quem foge do rebaixamento aceita o empate contra um adversario melhor e protege o 1-0.
        const T2 = T.tabela, melhorQueEu = T2 && T2.posicaoAdv > 0 && T2.posicaoAdv < T2.posicao;
        if (T.objetivo === 'TITULO' || T.objetivo === 'VAGA') {
            if (dif === 0 && m >= 70) return 'ATTACK';
            if (dif < 0 && m >= 50) return 'ATTACK';
        } else if (T.objetivo === 'REBAIXAMENTO') {
            if (dif === 0 && m >= 75) return melhorQueEu ? 'RETREAT' : 'ATTACK';
            if (dif === 1 && m >= 65) return 'RETREAT';
            if (dif < 0 && m >= 55) return 'ATTACK';
        }
        if (dif <= -2 && m > 45) return 'ATTACK';
        if (dif < 0 && m >= 60) return 'ATTACK';
        if (dif >= 2 && m >= 70) return 'POSSESS';
        if (dif === 1 && m >= 80) return 'RETREAT';
        if (dif === 1 && m >= 70) return 'POSSESS';
        return 'BALANCED';
    },

    /*
    LER O ADVERSARIO E CONTRAPOR. Quanto melhor o treinador (conhecimento tatico), mais ajustes do adversario ele percebe e melhor responde. `leitura` (0..1) = (k - 40) / 60; cada contra-medida
    tem a sua dificuldade e so entra quando a leitura a alcanca (k 50: so a mais obvia; k 70: leitura 0.5, metade; k 95: todas). Le a tatica ACTUAL do adversario (o painel do utilizador, ou a da CPU
    que ele enfrenta), por isso se ajusta quando o utilizador muda. A intencao do jogo (atacar / recuar / segurar) manda na pressao e na linha; aqui entram o estilo ofensivo e as compactacoes, e a
    pressao e a linha so em jogo normal.
    */
    chaveEstiloOfensivo(team) {
        const o = Tatics.porEquipa && Tatics.porEquipa[team];
        return (o && o.teamPlayStyle) || ((team === 'TeamB' && Tatics.teamPlayStyleB) ? Tatics.teamPlayStyleB : Tatics.teamPlayStyle);
    },
    contrapor(tatica, T, team, intencao) {
        const k = T.conhecimento;
        const leitura = Math.max(0, Math.min(1, (k - 40) / 60));
        if (leitura <= 0 || typeof taticaDe !== 'function') return tatica;
        const adv = team === 'TeamA' ? 'TeamB' : 'TeamA';
        const t = Object.assign({}, tatica);
        const pres = taticaDe(adv, 'pressaoDefensiva'), linha = taticaDe(adv, 'linhaDefensiva'), mental = taticaDe(adv, 'estilo');
        const ofens = this.chaveEstiloOfensivo(adv), larg = taticaDe(adv, 'compactness'), comp = taticaDe(adv, 'lengthCompactness');
        const normal = (intencao === 'BALANCED');
        const regras = [
            // [dificuldade, texto, aplica]
            [0.25, 'pressao alta: sai por cima dela (bola direta)', () => pres === 'high', () => { t.teamPlayStyle = 'direct'; }],
            [0.25, 'linha alta: ataca as costas (contra-ataque)', () => linha === 'high', () => { t.teamPlayStyle = 'counter_attack'; }],
            [0.40, 'posse de bola: pressiona mais alto', () => ofens === 'possession' && normal, () => { t.pressaoDefensiva = 'high'; }],
            [0.40, 'jogo direto / contra-ataque: baixa a linha e fecha a profundidade', () => (ofens === 'direct' || ofens === 'counter_attack') && normal, () => { if (t.linhaDefensiva === 'high') t.linhaDefensiva = 'medium'; t.lengthCompactness = 'short'; }],
            [0.50, 'jogo pelas alas: fecha a largura do bloco', () => ofens === 'wing_play', () => { t.compactness = 'short'; }],
            [0.60, 'adversario muito ofensivo: segura-o e sai no contra-ataque', () => (mental === 'ataque' || mental === 'muito_ofensiva') && normal, () => { t.teamPlayStyle = 'counter_attack'; if (t.estilo === 'ataque' || t.estilo === 'muito_ofensiva') t.estilo = 'balanceado'; }],
            [0.70, 'adversario fechado atras: abre o campo e circula', () => (mental === 'defesa' || mental === 'muito_defensiva' || pres === 'low') && normal, () => { t.teamPlayStyle = 'possession'; t.compactness = 'large'; if (t.linhaDefensiva === 'low') t.linhaDefensiva = 'medium'; }],
            [0.85, 'bloco curto do adversario: espalha o jogo pelas alas', () => comp === 'short' || comp === 'mediumSmall' || larg === 'short', () => { t.teamPlayStyle = 'wing_play'; t.compactness = 'large'; }]
        ];
        const aplicadas = [];
        for (const r of regras) if (leitura >= r[0] && r[2]()) { r[3](); aplicadas.push(r[1]); }
        t._contras = aplicadas.length;
        return t;
    },

    // A tatica propria que corresponde a intencao (sobre a base da equipa).
    taticaDeIntencao(base, intencao) {
        const t = Object.assign({}, base);
        switch (intencao) {
            case 'ATTACK': t.estilo = (base.estilo === 'muito_ofensiva') ? 'muito_ofensiva' : 'ataque'; t.pressaoDefensiva = 'balanced'; t.linhaDefensiva = 'high'; break;   // a pressao ALTA subia faltas e cartoes (23 faltas e 8 amarelos por jogo): ataca com a linha alta mas pressiona de forma equilibrada
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
            // Um amarelo novo (ou menos): o treinador reage.
            const amarelos = this.amarelosEmCampo(team);
            if (amarelos !== T.amarelosVistos) { T.amarelosVistos = amarelos; T.reagirEm = Match.tempoDeJogo + Math.max(2, (100 - T.conhecimento) * 0.3); }
            const proximo = T.ultimoMin + this.intervalo;
            const porTempo = min >= proximo;
            const porEvento = T.reagirEm !== null && Match.tempoDeJogo >= T.reagirEm;
            if (!porTempo && !porEvento) continue;
            if (porTempo) T.ultimoMin = Math.floor(min / this.intervalo) * this.intervalo;
            T.reagirEm = null;
            const intencao = this.decidirIntencao(T, e, min);
            // A tatica da intencao, com a pressao limitada pelos amarelos.
            const tatica = this.limitarPorAmarelos(this.contrapor(this.taticaDeIntencao(T.base, intencao), T, team, intencao), amarelos);
            const atual = Tatics.porEquipa[team];
            const mudou = intencao !== T.intencao || !atual || atual.pressaoDefensiva !== tatica.pressaoDefensiva || atual.estilo !== tatica.estilo || atual.linhaDefensiva !== tatica.linhaDefensiva || atual.teamPlayStyle !== tatica.teamPlayStyle || atual.compactness !== tatica.compactness || atual.lengthCompactness !== tatica.lengthCompactness || atual.agressividade !== tatica.agressividade;
            if (mudou) {
                this._log.push({ min: Math.floor(min), team, intencao, dif: e.dif, k: T.conhecimento, pressao: tatica.pressaoDefensiva, estiloOfensivo: tatica.teamPlayStyle, contras: tatica._contras || 0, amarelos: amarelos });
                T.intencao = intencao;
                Tatics.porEquipa[team] = tatica;
            }
            this.substituicoesPorCartoes(team, T, e, min);
        }
        // A FORMACAO no intervalo (1.a leitura depois dos 45 minutos).
        for (const team of ['TeamA', 'TeamB']) {
            const T = this.equipas[team];
            if (T && !T.formacaoFeita && min >= 46) { T.formacaoFeita = true; this.formacaoNoIntervalo(team, T, this._estado(team), min); }
        }
    },

    /*
    A FORMACAO NO INTERVALO. O treinador le o primeiro tempo e, se perde, ataca com mais gente na frente (433); se ganha e o objetivo e aguentar (rebaixamento) ou vence por 2+, fecha com um meio-campo
    mais cheio (4231); caso contrario fica. Com conhecimento baixo (< 60) ha uma probabilidade (60 - k)/100 de nao mexer. So troca por formacoes da base do motor (433, 442, 4231), de forma que o
    resultado (quem joga onde) segue a ordem da lista da equipa, como a mudanca de formacao pelo painel (`Match.assignFormations`).
    */
    formacaoNoIntervalo(team, T, e, min) {
        if (typeof FormationsData === 'undefined' || typeof Tatics === 'undefined') return;
        if (T.conhecimento < 60 && Math.random() < (60 - T.conhecimento) / 100) return;
        const chaveAtual = team === 'TeamA' ? Tatics.formacaoA : Tatics.formacaoB;
        const forma = (k) => { const f = FormationsData[k]; if (!f) return null; const c = { def: 0, mid: 0, atk: 0 }; f.forEach(x => { if (c[x.role] !== undefined) c[x.role]++; }); return c; };
        const atual = forma(chaveAtual);
        // Com menos um (de qualquer das equipas) nao se mexe na forma: o `assignFormations` refaz as DUAS e conta com onze de cada lado.
        if (!atual || Match.players.length < 11 || Match.opponents.length < 11) return;
        let alvo = null;
        if (e.dif < 0 && atual.atk < 3) alvo = '433';
        else if ((e.dif >= 2 || (e.dif >= 1 && T.objetivo === 'REBAIXAMENTO')) && atual.mid < 5) alvo = '4231';
        if (!alvo || alvo === chaveAtual || !FormationsData[alvo]) return;
        if (team === 'TeamA') { Tatics.formacaoA = alvo; Tatics.formacaoFixaA = alvo; } else { Tatics.formacaoB = alvo; Tatics.formacaoFixaB = alvo; }
        if (typeof Match.assignFormations === 'function') Match.assignFormations();
        this._log.push({ min: Math.floor(min), team, formacao: chaveAtual + ' -> ' + alvo, dif: e.dif, k: T.conhecimento });
    },

    // ---------------------------------------------------------------------------------------------
    // SUBSTITUICOES por cartoes.
    substituicoesPorCartoes(team, T, e, min) {
        if (T.trocas + T.pedidas >= T.maxTrocas) return;
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
