/*
=============================================================================
O ADAPTADOR DO FOOTBALL MANAGER — traduz elencos, escalação e formação do manager para o motor
=============================================================================
O manager (React + TypeScript, pasta "Football Manager") guarda por jogador { id: 'p-<id real>', name, position, skill, fitness,
morale, def, pas, drb, sht, shirtNumber, playStyle, injury } e por equipa { id, name, tactics, lineup[11 ids pela ordem dos slots
da formação], bench[ids] }. O motor 3D lê elencos no formato do data/squads.js. Isto faz a ponte, sem o motor saber nada do
manager, e sem o manager saber nada do motor.

O QUE FAZ
  . `formacaoDeSlots`   regista no `FormationsData` uma formação nova a partir dos slots do manager ({x, y, label} com x 0-100 da
                        esquerda para a direita e y 0-100 com a baliza em baixo). Os rotulos ST/SS valem CF. Assim as 7 formacoes do
                        manager (e qualquer outra que ele venha a ter) funcionam sem escrever geometria a mao.
  . `jogador`           um jogador do manager vira um jogador do motor. Quando o id real existe nos dados do simulador (os dois
                        jogos usam o mesmo ficheiro de origem), parte das 10 skills reais; senao deriva-as de skill/def/pas/drb/sht. Por
                        cima entram o estado do manager: forma fisica (`fitness`) e moral (`morale`).
  . `equipa`            o plantel e so o ONZE escalado (o banco fica de fora: o motor ainda nao tem substituicoes). Cada jogador leva
                        `pb` (a nota por posicao) a 100 na posicao do slot dele e baixa nas outras, para o `escolherOnze` do
                        motor respeitar a escalacao do treinador em vez de escolher o melhor onze sozinho.
  . `prepararPartida`   monta as duas equipas no motor (Match.trocarEquipas) e aplica a formacao e o estilo.

LIMITES DA PRIMEIRA VERSAO (escritos para nao se descobrirem por acaso)
  . O painel do motor e GLOBAL (Tatics.estilo, linhaDefensiva, pressaoDefensiva): aqui aplica-se a da equipa do UTILIZADOR. A equipa da CPU joga com a
    tatica PROPRIA do clube (`Tatics.porEquipa`, ver `taticaDe`) e e comandada pelo TreinadorCPU (js/treinador_cpu.js).
  . Sem substituicoes nem lesoes dentro do jogo.
=============================================================================
*/
const AdaptadorManager = {
    // Rotulos do manager -> posicao do motor.
    POS_DO_ROTULO: { GK: 'GK', LB: 'LB', RB: 'RB', CB: 'CB', DM: 'DM', CM: 'CM', LM: 'LM', RM: 'RM', AM: 'AM', LW: 'LW', RW: 'RW', ST: 'CF', SS: 'CF', CF: 'CF' },
    ROLE_DA_POS: { GK: 'gk', LB: 'def', RB: 'def', CB: 'def', DM: 'mid', CM: 'mid', LM: 'mid', RM: 'mid', AM: 'mid', LW: 'atk', RW: 'atk', CF: 'atk' },

    // As posicoes do motor, para a nota por posicao (`pb`).
    TODAS_AS_POS: ['GK', 'RB', 'LB', 'CB', 'DM', 'RM', 'LM', 'CM', 'RW', 'LW', 'AM', 'CF'],

    // O id real: 'p-269063' -> 269063 (os dados do simulador usam o numero).
    idReal(idManager) {
        const m = /(\d+)$/.exec(String(idManager || ''));
        return m ? Number(m[1]) : null;
    },

    _jogadorReal(idManager) {
        const id = this.idReal(idManager);
        if (id === null || typeof SquadsData === 'undefined' || !SquadsData.equipas) return null;
        if (!this._indice) {
            this._indice = new Map();
            for (const e of SquadsData.equipas) for (const j of e.plantel) this._indice.set(j.id, j);
        }
        return this._indice.get(id) || null;
    },

    /*
    A formacao: `slots` e a lista do manager ({ id, x, y, label }). Devolve a chave no FormationsData. x 15 (esquerda no ecra) e o
    lado +x do motor (LB em +x); y 88 (baliza) vira z -0.95 e y 15 (ponta de lanca) vira z +0.60.
    */
    formacaoDeSlots(nome, slots) {
        const chave = 'mgr:' + nome;
        const f = slots.map((s, i) => {
            const pos = this.POS_DO_ROTULO[s.label] || 'CM';
            const z = -0.95 + ((88 - s.y) / (88 - 15)) * 1.55;
            return { x: Math.max(-0.95, Math.min(0.95, (50 - s.x) / 50)), z: Math.max(-0.95, Math.min(0.65, z)), role: this.ROLE_DA_POS[pos], pos: pos, num: i + 1 };
        });
        FormationsData[chave] = f;
        return chave;
    },

    /*
    AS POSICOES POR ZONA do treinador (aba Match Tactics, `Tactics.zoneOverrides[formacao]`): `over` = { com|sem: { zona: { posto: [x, z] } } }. A equipa passa a ter uma tabela PROPRIA em
    `FormacoesZonas.formacoes[chave]` (copia da base com os ajustes por cima); sem ajustes, a chave sai e vale a da formacao. `_v` invalida a cache de posicoes (team_bt.js).
    */
    registarZonas(chave, nome, over) {
        if (typeof FormacoesZonas === 'undefined' || !FormacoesZonas.formacoes) return;
        const F = FormacoesZonas.formacoes[nome];
        delete FormacoesZonas.formacoes[chave];
        if (F && over && (over.com || over.sem)) {
            const c = JSON.parse(JSON.stringify(F));
            for (const fase of ['com', 'sem']) {
                const o = over[fase]; if (!o) continue;
                for (const z of Object.keys(o)) for (const s of Object.keys(o[z])) {
                    const p = c[fase][z] && c[fase][z][s];
                    if (p) { p.x = o[z][s][0]; p.z = o[z][s][1]; }
                }
            }
            FormacoesZonas.formacoes[chave] = c;
        }
        FormacoesZonas._v = (FormacoesZonas._v || 0) + 1;
    },

    // 0..100 para a escala do motor (o motor roda perto dos 70-90; um jogador de 60 do manager fica abaixo disso).
    _escala(v, escala) { return Math.max(1, Math.min(100, Math.round(v * (escala || 1)))); },

    /*
    Um jogador do manager. `rotulo` e o do slot onde joga (pode nao ser a posicao natural). `opcoes.escala` afina a escala das
    skills derivadas (1 = sem alteracao).
    */
    // O estilo derivado dos 31 atributos (o mesmo criterio de skill_map.js, notasDeEstilo) para quem nao traz estilo nos dados; null sem atributos.
    _estiloDos31(mp, posMotor) {
        if (!mp.atributos || typeof estiloDeAtributos !== 'function' || typeof registoDe31 !== 'function') return null;
        try { return estiloDeAtributos(registoDe31(mp.atributos, mp.extrasGK), posMotor) || null; } catch (e) { return null; }
    },

    jogador(mp, rotulo, opcoes) {
        opcoes = opcoes || {};
        const posSlot = this.POS_DO_ROTULO[rotulo] || 'CM';
        const posNatural = this.POS_DO_ROTULO[mp.position] || posSlot;
        const real = this._jogadorReal(mp.id);
        const skill = mp.skill || 60;
        const forma = (typeof mp.fitness === 'number') ? Math.max(0, Math.min(100, mp.fitness)) : 90;
        let base;
        /*
        COM OS 31 ATRIBUTOS (`mp.atributos`, do manager: textSim/atributos3d.ts): as dez skills do motor saem deles — mesmos pesos (SkillMap) e mesma calibragem (skillsDe31, skill_map.js) — e os 31
        ficam no jogador (`atr`) para as decisoes do jogo lerem o atributo certo (passe curto, passe longo, cruzamento...). Sem eles, valem os dados do 3D e a derivacao antiga.
        */
        const por31 = (mp.atributos && typeof skillsDe31 === 'function') ? skillsDe31(mp.atributos, mp.extrasGK) : null;
        if (por31) {
            base = { gk: por31.gk, tec: por31.tec, marking: por31.marking, intercept: por31.intercept, pass: por31.pass,
                speed: por31.speed, strength: por31.strength, tacticknow: por31.tacticknow, stamina: por31.stamina, fitness: por31.fitness };
        } else if (real) {
            // As skills reais do motor (data/squads.js), do mesmo ficheiro de origem que o manager.
            base = { gk: real.gk, tec: real.tec, marking: real.marking, intercept: real.intercept, pass: real.pass,
                speed: real.speed, strength: real.strength, tacticknow: real.tacticknow, stamina: real.stamina, fitness: real.fitness };
        } else {
            const def = mp.def || skill, pas = mp.pas || skill, drb = mp.drb || skill, sht = mp.sht || skill;
            const ala = ['LW', 'RW', 'LM', 'RM', 'LB', 'RB'].indexOf(posNatural) >= 0;
            const central = ['CB', 'CF'].indexOf(posNatural) >= 0;
            base = {
                gk: posNatural === 'GK' ? skill : Math.round(skill * 0.3),
                tec: this._escala((drb * 0.6 + sht * 0.4), opcoes.escala),
                marking: this._escala(def, opcoes.escala),
                intercept: this._escala(def * 0.8 + skill * 0.2, opcoes.escala),
                pass: this._escala(pas, opcoes.escala),
                speed: this._escala(skill + (ala ? 4 : (central ? -4 : 0)), opcoes.escala),
                strength: this._escala(skill + (central ? 4 : (ala ? -3 : 0)), opcoes.escala),
                tacticknow: this._escala(skill, opcoes.escala),
                stamina: this._escala(skill, opcoes.escala),
                fitness: this._escala(skill, opcoes.escala)
            };
        }
        // O ESTADO DO MANAGER: a forma fisica do dia e a moral mexem na resistencia e na forma (e um pouco em tudo).
        const moral = (typeof mp.morale === 'number') ? Math.max(0, Math.min(100, mp.morale)) : 50;
        const fator = 0.94 + 0.06 * (forma / 100) + 0.02 * ((moral - 50) / 50);
        base.fitness = Math.max(1, Math.min(100, Math.round(base.fitness * (0.7 + 0.3 * forma / 100))));
        base.stamina = Math.max(1, Math.min(100, Math.round(base.stamina * (0.8 + 0.2 * forma / 100))));
        for (const k of ['tec', 'marking', 'intercept', 'pass', 'speed', 'strength', 'tacticknow']) base[k] = Math.max(1, Math.min(100, Math.round(base[k] * fator)));
        // A nota por posicao: a do slot onde joga vale 100 (para o motor o escolher); as outras decaem com a distancia.
        const pb = {};
        for (const p of this.TODAS_AS_POS) pb[p] = (p === posSlot) ? 100 : (p === posNatural ? 70 : 40);
        return Object.assign({
            id: real ? real.id : (this.idReal(mp.id) || Math.floor(Math.random() * 1e9)),
            nome: mp.name || (real && real.nome) || 'Jogador',
            pos: posSlot, role: this.ROLE_DA_POS[posSlot], numero: mp.shirtNumber || (real && real.numero) || 0,
            estilo: (real && real.estilo) || this._estiloDos31(mp, posNatural), estiloOrigem: real ? real.estiloOrigem : (por31 ? 'atributos' : null), pb: pb,
            atr: por31 ? mp.atributos : null,
            pe: (mp.peBom === 'e' || mp.peBom === 'd') ? mp.peBom : undefined   // o pe bom do manager manda sobre o sorteio do motor (pePreferido)
        }, base);
    },

    /*
    A equipa do manager -> uma "equipa de plantel" do motor. `jogadoresPorId` e o mapa id -> jogador do manager; a escalacao vem de
    `equipa.lineup` (11 ids pela ordem dos slots de `slots`).
    */
    equipa(equipaMgr, jogadoresPorId, slots, opcoes) {
        const plantel = [];
        for (let i = 0; i < slots.length; i++) {
            const mp = jogadoresPorId[equipaMgr.lineup[i]];
            if (!mp) throw new Error('escalacao: jogador nao encontrado no slot ' + i + ' (' + equipaMgr.lineup[i] + ')');
            plantel.push(this.jogador(mp, slots[i].label, opcoes));
        }
        const v = []; for (const j of plantel) for (const k of ['gk', 'tec', 'marking', 'intercept', 'pass', 'speed', 'strength', 'tacticknow', 'stamina', 'fitness']) v.push(j[k]);
        // O BANCO (os substitutos da aba Tactics) só para o cenário: o motor ainda não faz substituições. Vai para os bancos de reservas 3D.
        const banco = (equipaMgr.bench || []).map(id => jogadoresPorId[id]).filter(Boolean).slice(0, 10)
            .map(mp => { const real = this._jogadorReal(mp.id); return { id: real ? real.id : this.idReal(mp.id), nome: mp.name, numero: mp.shirtNumber || 0, gk: String(mp.position) === 'GK' }; });
        // As skills dos reservas, ja convertidas: o treinador da CPU (js/treinador_cpu.js) mete-os em campo sem precisar do manager.
        const reservas = (equipaMgr.bench || []).map(id => jogadoresPorId[id]).filter(Boolean).slice(0, 10).map(mp => {
            try { const sk = this.jogador(mp, mp.position, opcoes); return { id: sk.id, sk: sk }; } catch (e) { return null; }
        }).filter(Boolean);
        return {
            reservas: reservas,
            banco: banco,
            // O ESCUDO (HUD do portador, main.js): a imagem do clube ou, sem ela, as tres cores em barras verticais (a mesma do TeamShield do manager).
            escudo: { logo: equipaMgr.logoUrl || null, cores: equipaMgr.cores || null },
            id: this._novoId(), nome: equipaMgr.name, cidade: equipaMgr.city || '', estadio: equipaMgr.stadium || '', pais: equipaMgr.country || '',
            prestigio: 0, adeptos: equipaMgr.fanBase || 0, forca: Math.round(v.reduce((a, b) => a + b, 0) / v.length), plantel: plantel
        };
    },
    _contaId: 9000000,
    _novoId() { return ++this._contaId; },

    /*
    Trocar `Lados.trocados` pede o mesmo que a troca do intervalo (Match.iniciarSegundoTempo): o sentido de ataque esta guardado em cada
    jogador (dirZ, balizas) e no quadro de cada equipa (TeamAI). Sem refazer isso a IA ataca para o lado antigo.
    */
    _refrescarLados() {
        [...Match.players, ...Match.opponents].forEach(p => {
            p.dirZ = Lados.dirDe(p.team);
            p.targetGoalZ = (CAMPO_COMP / 2) * p.dirZ;
            p.ownGoalZ = -(CAMPO_COMP / 2) * p.dirZ;
        });
        if (typeof TeamAI !== 'undefined' && TeamAI.blackboards) {
            ['TeamA', 'TeamB'].forEach(t => {
                const bb = TeamAI.blackboards[t];
                if (!bb) return;
                bb.dir = Lados.dirDe(t);
                bb.ownGoalZ = (typeof ownGoalZCenter === 'function') ? ownGoalZCenter(t) : -(CAMPO_COMP / 2) * bb.dir;
                bb.atkGoalZ = -bb.ownGoalZ;
            });
        }
    },

    /*
    O PAINEL ESQUERDO DO 3D mostra as equipas da partida: Equipa A = a que joga em casa, Equipa B = a visitante. Os selects so conhecem o
    catalogo do simulador, por isso a equipa do manager entra como uma opcao propria (nome e forca) e fica escolhida. Ficam
    desativados: trocar a equipa por aqui desfaria a escalacao do manager.
    */
    mostrarNoPainel(eC, eF) {
        if (typeof document === 'undefined') return;
        [['t-equipa-A', eC], ['t-equipa-B', eF]].forEach(([id, eq]) => {
            const sel = document.getElementById(id);
            if (!sel) return;
            [...sel.options].filter(o => o.dataset && o.dataset.manager).forEach(o => o.remove());
            const o = document.createElement('option');
            o.value = String(eq.id); o.textContent = eq.nome + ' (' + eq.forca + ')'; o.dataset.manager = '1';
            sel.appendChild(o);
            sel.value = o.value;
            sel.disabled = true;
        });
        const bloco = document.getElementById('bloco-equipas');
        if (bloco) bloco.style.display = '';
    },

    // Estilo de jogo do manager -> o do motor (so o estilo geral: ver os LIMITES no topo).
    ESTILO_DO_MANAGER: { 'Very Defensive': 'muito_defensiva', 'Defensive': 'defesa', 'Balanced': 'balanceado', 'Offensive': 'ataque', 'Very Offensive': 'muito_ofensiva' },

    /*
    Prepara a partida no motor. `casa` e `fora`: { equipa, jogadoresPorId, formacao: { nome, slots } }.
    `opcoes.taticaDe`: 'casa' | 'fora' (a equipa cuja tatica vale para as duas; omissao 'casa').
    Devolve { chaveCasa, chaveFora }.
    */
    prepararPartida(casa, fora, opcoes) {
        opcoes = opcoes || {};
        // A OCUPACAO do estadio neste jogo (0..1, do manager: ocupacao-base + bonus do jogo): a torcida desenhada e a capacidade x ocupacao x a fracao da qualidade grafica (crowd.js, `definirOcupacao`).
        if (typeof opcoes.ocupacao === 'number' && typeof Crowd !== 'undefined' && Crowd.definirOcupacao) Crowd.definirOcupacao(opcoes.ocupacao, opcoes.ocupacaoVisitante);
        this._opcoes = opcoes;   // as mesmas opcoes (escala das skills) valem para os substitutos (Match.executarSubstituicao)
        const eC = this.equipa(casa.equipa, casa.jogadoresPorId, casa.formacao.slots, opcoes);
        const eF = this.equipa(fora.equipa, fora.jogadoresPorId, fora.formacao.slots, opcoes);
        // As equipas ficam no catalogo do motor so enquanto a partida durar (e limpam-se na seguinte).
        SquadsData.equipas = SquadsData.equipas.filter(e => e.id < 9000000);
        SquadsData.equipas.push(eC, eF);
        const kC = this.formacaoDeSlots(casa.formacao.nome, casa.formacao.slots);
        const kF = this.formacaoDeSlots(fora.formacao.nome + '#fora', fora.formacao.slots);
        const zonasDe = (l) => (l.equipa.tactics && l.equipa.tactics.zoneOverrides && l.equipa.tactics.zoneOverrides[l.formacao.nome]) || null;
        this.registarZonas(kC, casa.formacao.nome, zonasDe(casa));
        this.registarZonas(kF, fora.formacao.nome, zonasDe(fora));
        // O lado do utilizador: os ajustes que ele mudar com o jogo em curso (mensagem `tatica`) vao para a tabela dele.
        this._ladoUtilizador = ((opcoes.taticaDe || 'casa') === 'casa') ? { chave: kC, nome: casa.formacao.nome } : { chave: kF, nome: fora.formacao.nome };
        Tatics.formacaoA = kC; Tatics.formacaoB = kF;
        Tatics.formacaoFixaA = kC; Tatics.formacaoFixaB = kF;
        // O TREINADOR DA CPU: a equipa que NAO e a do utilizador joga com a tatica propria do clube e e comandada pelo treinador dela (conhecimento tatico).
        if (typeof TreinadorCPU !== 'undefined') {
            TreinadorCPU.limpar();
            const cpuEhCasa = (opcoes.taticaDe || 'casa') !== 'casa';
            const cpu = cpuEhCasa ? casa : fora;
            // A posicao na tabela do campeonato (o manager manda `tabela: { casa: {posicao,total}, fora: {posicao,total} }`).
            const tb = opcoes.tabela || null;
            const tabela = (tb && tb.casa && tb.fora) ? (cpuEhCasa ? { posicao: tb.casa.posicao, total: tb.casa.total, posicaoAdv: tb.fora.posicao } : { posicao: tb.fora.posicao, total: tb.fora.total, posicaoAdv: tb.casa.posicao }) : null;
            if (cpu && cpu.tatica) TreinadorCPU.registar(cpuEhCasa ? 'TeamA' : 'TeamB', { conhecimento: cpu.conhecimentoTatico, tabela: tabela, amistoso: !!opcoes.amistoso, base: { estilo: cpu.tatica.estilo, pressaoDefensiva: cpu.tatica.pressaoDefensiva, pressaoValor: cpu.tatica.pressaoValor, linhaDefensiva: cpu.tatica.linhaDefensiva, linhaValor: cpu.tatica.linhaValor, teamPlayStyle: cpu.tatica.teamPlayStyle, compactness: cpu.tatica.compactness, lengthCompactness: cpu.tatica.lengthCompactness, setores: cpu.tatica.setores, agressividade: cpu.tatica.agressividade } });
        }
        const t = ((opcoes.taticaDe || 'casa') === 'casa' ? casa : fora).equipa.tactics;
        if (t && this.ESTILO_DO_MANAGER[t.style]) Tatics.estilo = this.ESTILO_DO_MANAGER[t.style];
        // A CASA a esquerda do ecra, como no placar do manager: a camera lateral TV fica em +X, onde a esquerda e +Z; o TeamA ataca +Z
        // no 1.o tempo (`Lados.trocados` falso), por isso a casa so fica a esquerda com os lados trocados.
        if (typeof Lados !== 'undefined') Lados.trocados = (opcoes.casaEsquerda !== false);
        // Os uniformes que o treinador escolheu (kit 1/2/3): o desenho de linha entra na tabela `Uniformes` pelo nome da equipa; o do
        // guarda-redes vai em `Match.uniformeGKA/B` (match_setup.js).
        // Todos os kits (titular incluido) vestem a conversao do kit do manager, para o 3D combinar com o uniforme escolhido; o desenho feito a mao
        // do simulador (config/uniformes.js) so entra quando o manager nao manda kit. O original guarda-se para voltar a ele.
        this._originais = this._originais || {};
        const uni = (lado, eq) => {
            if (!lado.uniforme || typeof Uniformes === 'undefined') return;
            if (!(eq.nome in this._originais)) this._originais[eq.nome] = Uniformes[eq.nome] || null;
            const orig = this._originais[eq.nome];
            // O uniforme do 3D e SEMPRE o kit que o utilizador escolheu (uniforme.linha): o desenho feito a mao do clube (`orig`) so vale
            // quando o manager nao manda kit.
            if (lado.uniforme.linha) Uniformes[eq.nome] = lado.uniforme.linha;
            else if (orig) Uniformes[eq.nome] = orig; else delete Uniformes[eq.nome];
        };
        uni(casa, eC); uni(fora, eF);
        // O traje do juiz escolhido na tela dos uniformes (null = sorteado, ver Officials.sortearTraje).
        if (typeof Officials !== 'undefined') Officials.trajeEscolhido = (opcoes.arbitro && opcoes.arbitro.camisa) ? opcoes.arbitro : null;
        Match.uniformeGKA = (casa.uniforme && casa.uniforme.gk) || null;
        Match.uniformeGKB = (fora.uniforme && fora.uniforme.gk) || null;
        // As OUTRAS camisas de cada time (os outros dois kits do manager), para a torcida (crowd.js, `_kitsDaEquipa`).
        Match.uniformesOutros = { A: (casa.uniforme && casa.uniforme.outros) || [], B: (fora.uniforme && fora.uniforme.outros) || [] };
        Match.trocarEquipas({ A: eC.id, B: eF.id });
        // OS COBRADORES E O CAPITAO que o treinador designou (aba Match Tactics): ids do motor, por equipa. Sem designado, o motor escolhe como sempre (ver `cobradorDesignado`, utils.js).
        const mapaCobradores = (c) => { if (!c) return null; const o = {}; for (const k of Object.keys(c)) { const id = this.idReal(c[k]); if (id !== null) o[k] = id; } return o; };
        Match.cobradores = { A: mapaCobradores(casa.equipa.cobradores), B: mapaCobradores(fora.equipa.cobradores) };
        this._refrescarLados();
        this.mostrarNoPainel(eC, eF);
        return { chaveCasa: kC, chaveFora: kF, equipaCasa: eC, equipaFora: eF };
    }
};
if (typeof window !== 'undefined') window.AdaptadorManager = AdaptadorManager;
