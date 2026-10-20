let scene, rendererCore, cameraCore, orbitControls;
let lastTime = 0;
let fpsFrames = 0;
let fpsLastTime = 0;

/*
Shift+click em qualquer botão de minimizar/maximizar aplica o mesmo estado a
TODOS os painéis/modais de uma vez (painel de comandos, direito, jogadores,
e os sub-painéis BLUE/RED AVERAGE) — em vez de ter de clicar um por um.
*/
function toggleTodosPaineis(minimizar) {
    togglePainel(minimizar);
    togglePainelDireito(minimizar);
    togglePainelJogadores(minimizar);
    toggleSkillsTeam('a', minimizar);
    toggleSkillsTeam('b', minimizar);
    toggleEstatisticas(minimizar);
}

// Minimiza/maximiza o painel de comandos. Também ligado à tecla X
// (ver Match.setupKeyboardListeners).
function togglePainel(forcarMinimizado, evt) {
    const painel = document.getElementById('painel-comandos');
    if (!painel) return;

    const minimizar = (forcarMinimizado === undefined)
        ? !painel.classList.contains('minimizado')
        : forcarMinimizado;

    if (evt && evt.shiftKey) { toggleTodosPaineis(minimizar); return; }

    painel.classList.toggle('minimizado', minimizar);

    const btn = document.getElementById('btn-painel');
    if (btn) btn.innerHTML = minimizar ? '&plus;' : '&minus;';
    if (typeof TouchControls !== 'undefined' && TouchControls.updateButtonsState) {
        TouchControls.updateButtonsState();
    }
}

function toggleSkillsTeam(letra, forcarMinimizado, evt) {
    const conteudo = document.getElementById('skills-conteudo-' + letra);
    const btn = document.getElementById('btn-skills-' + letra);
    if (!conteudo) return;

    const minimizar = (forcarMinimizado === undefined)
        ? !conteudo.classList.contains('oculto')
        : forcarMinimizado;

    if (evt && evt.shiftKey) { toggleTodosPaineis(minimizar); return; }

    conteudo.classList.toggle('oculto', minimizar);
    if (btn) btn.innerHTML = minimizar ? '&plus;' : '&minus;';
}

/*
=============================================================================
PAINEL DE ESTATÍSTICA POR JOGO
=============================================================================
A tabela é a ÚNICA fonte: a ordem das linhas, os rótulos, os alvos e as casas
decimais estão todos aqui, e o HTML só tem o `<tbody>` vazio. Acrescentar uma
métrica é acrescentar uma linha nesta lista.

`campo` é a chave devolvida pelo `MatchStats.porJogo()`. `alvo` a null é uma
métrica sem número acordado — mostra-se o medido e um travessão na coluna do
alvo, em vez de se inventar uma referência.

Os alvos são de JOGO e não de equipa: 2,52 golos são os dois lados somados.
=============================================================================
*/
const ALVOS_ESTATISTICA = [
    { campo: 'pctPassesCertos', rotulo: '% passes certos', alvo: 80, casas: 1, sufixo: '%' },
    { campo: 'golos', rotulo: '⚽ Golos', alvo: 2.52, casas: 2 },
    { campo: 'remates', rotulo: '🎯 Finalizações', alvo: 26.1, casas: 2 },
    { campo: 'rematesNoAlvo', rotulo: '🎯 Finalizações no alvo', alvo: 8.8, casas: 2 },
    { campo: 'pctRematesNoAlvo', rotulo: '% no alvo', alvo: 33.7, casas: 1, sufixo: '%' },
    { campo: 'cantos', rotulo: '🚩 Escanteios', alvo: 9.92, casas: 2 },
    /*
    Os cartões ainda não têm alvo acordado (pedido explícito: "os cartões ainda
    não definimos"). Os números ficam à vista como referência, mas marcados
    como provisórios para não se calibrar contra eles por engano.
    */
    { campo: 'amarelos', rotulo: '🟨 Amarelos', alvo: 5.22, casas: 2 },
    { campo: 'vermelhos', rotulo: '🟥 Vermelhos', alvo: 0.20, casas: 2 },
    { campo: 'faltas', rotulo: '🦶 Faltas', alvo: 27.63, casas: 2 },
    /*
    A regra existe desde a Lei 11 implementada em Officials
    (marcarPosicoesDeImpedimento / verificarImpedimento, com o OffsideModel em
    config/defense.js): a posição congela no instante do passe e a infracção
    conta-se no primeiro toque. O `semRegra` saiu daqui — o zero de antes era
    "não é medido", agora um zero é mesmo "não houve nenhum".
    */
    { campo: 'impedimentos', rotulo: '🚫 Impedimentos', alvo: 3.20, casas: 2 },
    { campo: 'ataquesPerigosos', rotulo: '🔥 Ataques perigosos', alvo: 77.8, casas: 1 },
    { campo: 'ataquesTotais', rotulo: '⚔️ Ataques totais', alvo: 176.6, casas: 1 },
    { campo: 'passesPorTime', rotulo: '🔁 Passes tentados/time', alvo: 375, casas: 0 },
    { campo: 'pctPosseCasa', rotulo: '⏱ Posse da casa', alvo: 51, casas: 1, sufixo: '%' },
    { campo: 'defesas', rotulo: '🧤 Defesas', alvo: 6.2, casas: 2 },
    { campo: 'rematesBloqueados', rotulo: '🧱 Finalizações bloqueadas', alvo: 7.0, casas: 2 },
    { campo: 'penaltis', rotulo: '⚖️ Pênaltis', alvo: 0.28, casas: 2 },
    { campo: 'xg', rotulo: '📈 xG total', alvo: 2.84, casas: 2 },
    { campo: 'xgPorRemate', rotulo: '📈 xG por remate', alvo: 0.109, casas: 3 }
];

/*
Cor da linha pelo desvio relativo ao alvo. Relativo e não absoluto: 2 golos a
mais é um desastre, 2 faltas a mais não é nada.
*/
function classificarDesvio(valor, alvo) {
    if (alvo === null || alvo === undefined || valor === null) return '';
    if (alvo === 0) return (valor === 0) ? 'estat-ok' : 'estat-longe';
    const desvio = Math.abs(valor - alvo) / alvo;
    if (desvio <= 0.15) return 'estat-ok';
    if (desvio <= 0.40) return 'estat-perto';
    return 'estat-longe';
}

function toggleEstatisticas(forcarMinimizado, evt) {
    const conteudo = document.getElementById('estat-conteudo');
    const btn = document.getElementById('btn-estat');
    if (!conteudo) return;

    const minimizar = (forcarMinimizado === undefined)
        ? !conteudo.classList.contains('oculto')
        : forcarMinimizado;

    if (evt && evt.shiftKey) { toggleTodosPaineis(minimizar); return; }

    conteudo.classList.toggle('oculto', minimizar);
    if (btn) btn.innerHTML = minimizar ? '&plus;' : '&minus;';
}

/*
Reescreve a tabela. Chamada do `animate`, mas só de `INTERVALO_ESTATISTICA` em
`INTERVALO_ESTATISTICA` segundos reais: são treze linhas de DOM e os números
mexem-se devagar — a 60 Hz seria trabalho de layout por nada, e ainda por cima
ilegível.
*/
const INTERVALO_ESTATISTICA = 0.5;
let _relogioEstatistica = 0;

/*
`forcar` existe para a simulação em lote. O `animate()` faz `return` à cabeça
enquanto o `Sim` corre — não há loop de render nenhum a chamar isto — por isso
o Sim chama-o ele próprio uma vez por lote de passos, e aí não há `deltaReal`
que faça sentido: o relógio de jogo avançou minutos no tempo de um frame.
*/
function updatePainelEstatisticas(deltaReal, forcar) {
    if (!forcar) {
        _relogioEstatistica -= deltaReal;
        if (_relogioEstatistica > 0) return;
    }
    _relogioEstatistica = INTERVALO_ESTATISTICA;

    const tbody = document.getElementById('estat-linhas');
    if (!tbody || typeof MatchStats === 'undefined' || typeof Match === 'undefined') return;

    // Minimizado: não vale a pena escrever DOM que ninguém vê.
    const conteudo = document.getElementById('estat-conteudo');
    if (conteudo && conteudo.classList.contains('oculto')) return;

    const segundos = Match.tempoDeJogo || 0;
    const s = MatchStats.porJogo(segundos);

    const relogio = document.getElementById('estat-relogio');
    if (relogio) {
        const min = Math.floor(segundos / 60), seg = Math.floor(segundos % 60);
        const txt = `${min}'${String(seg).padStart(2, '0')} jogados`;
        relogio.textContent = s.escalado
            ? `${txt} — extrapolado para 90' (90' de relogio = ${MatchStats.minutosFisicosDeUmJogo().toFixed(1)} min simulados)`
            : `${txt} — pouco jogo para extrapolar`;
    }

    const linhas = [];
    for (const m of ALVOS_ESTATISTICA) {
        const valor = s[m.campo];

        let medido, classe;
        if (m.semRegra) {
            medido = 'sem regra';
            classe = 'estat-semdado';
        } else if (valor === null || valor === undefined || !isFinite(valor)) {
            medido = '—';
            classe = 'estat-semdado';
        } else {
            medido = valor.toFixed(m.casas) + (m.sufixo || '');
            classe = classificarDesvio(valor, m.alvo);
        }

        const alvo = (m.alvo === null || m.alvo === undefined)
            ? '—'
            : m.alvo.toFixed(m.casas) + (m.sufixo || '') + (m.provisorio ? '?' : '');

        // O ritmo por minuto fisico: quantas vezes o real (ver MatchStats.vezesORitmoReal).
        const vezes = (valor === null || valor === undefined) ? null : MatchStats.vezesORitmoReal(m.campo, valor, m.alvo);
        const ritmo = (vezes === null) ? '—' : vezes.toFixed(1) + '×';
        linhas.push(`<tr class="${classe}"><td>${m.rotulo}</td>` +
            `<td>${medido}</td><td>${alvo}</td><td title="quantas vezes o ritmo real por minuto de simulacao">${ritmo}</td></tr>`);
    }
    tbody.innerHTML = linhas.join('');
}

function togglePainelDireito(forcarMinimizado, evt) {
    const painel = document.getElementById('painel-direito');
    if (!painel) return;

    const minimizar = (forcarMinimizado === undefined)
        ? !painel.classList.contains('minimizado')
        : forcarMinimizado;

    if (evt && evt.shiftKey) { toggleTodosPaineis(minimizar); return; }

    painel.classList.toggle('minimizado', minimizar);

    const btn = document.getElementById('btn-painel-direito');
    if (btn) btn.innerHTML = minimizar ? '&plus;' : '&minus;';
}

/*
=============================================================================
DIA OU NOITE — e sao os holofotes que o dizem
=============================================================================
Pedido: *"assim vamos poder regular se o jogo sera de dia ou a noite, usando
os holofotes"*.

O que muda, e porque cada coisa:

    sol (`dirLight`)   de dia manda na cena; de noite fica num RESIDUO
                       (Holofotes.noite.solIntensidade) e nao a zero, porque e
                       ele que projecta as sombras dos jogadores — os holofotes
                       tem `castShadow = false` de proposito (oito mapas de
                       sombra por frame nao valem a pena). Com o sol a zero o
                       jogo ficava sem sombras nenhumas.
    ambiente           desce, senao de noite tudo continua a ler-se como de
                       dia mesmo com o sol apagado.
    ceu                a cor de fundo. E o que mais diz "noite" ao olho.
    holofotes          acendem: intensidade nas SpotLights e `emissive` no
                       material das lampadas, que e UM material partilhado
                       pelas 48 — acendem todas de uma vez.

`window.jogoNoturno` guarda o estado para quem precisar de o ler.
=============================================================================
*/
function definirPeriodo(noite) {
    const H = (typeof Holofotes !== 'undefined') ? Holofotes : null;
    if (!H) return;
    const P = noite ? H.noite : H.dia;
    window.jogoNoturno = !!noite;

    if (window.dirLightCore) window.dirLightCore.intensity = P.solIntensidade;
    if (window.ambientLightCore) window.ambientLightCore.intensity = P.ambienteIntensidade;
    if (window.sceneCore) window.sceneCore.background = new THREE.Color(P.ceu);

    const HF = window.holofotes;
    if (HF) {
        for (const l of HF.luzes) l.intensity = P.holofotesAcesos ? H.intensidadeLuz : 0;
        if (HF.matLampada) {
            HF.matLampada.color.setHex(P.holofotesAcesos
                ? H.corLampadaAcesa : H.corLampadaApagada);
            HF.matLampada.emissive.setHex(P.holofotesAcesos ? H.corLampadaAcesa : 0x000000);
            HF.matLampada.emissiveIntensity = P.holofotesAcesos ? 1.0 : 0;
        }
        if (HF.luzesSob) for (const l of HF.luzesSob) l.intensity = P.holofotesAcesos ? 0.9 : 0;
        if (HF.matLuzSob) {
            HF.matLuzSob.color.setHex(P.holofotesAcesos ? 0xfff1d0 : 0x555555);
            HF.matLuzSob.emissive.setHex(P.holofotesAcesos ? 0xfff1d0 : 0x000000);
            HF.matLuzSob.emissiveIntensity = P.holofotesAcesos ? 1.8 : 0;

        }
    }

    const btn = document.getElementById('btn-periodo');
    if (btn) btn.innerText = noite ? 'Noite' : 'Dia';
}

function togglePeriodo() {
    definirPeriodo(!window.jogoNoturno);
}
if (typeof window !== 'undefined') {
    window.definirPeriodo = definirPeriodo;
    window.togglePeriodo = togglePeriodo;
}

function toggleOffside() {
    Match.showOffsideLines = !Match.showOffsideLines;
    Match.offsideLineA.visible = Match.showOffsideLines;
    Match.offsideLineB.visible = Match.showOffsideLines;
    if (Match.defLineA) Match.defLineA.visible = Match.showOffsideLines;
    if (Match.defLineB) Match.defLineB.visible = Match.showOffsideLines;
    document.getElementById('btn-offside').innerText = 'OffSide: ' + (Match.showOffsideLines ? 'ON' : 'OFF');
    document.getElementById('btn-offside').classList.toggle('active', Match.showOffsideLines);
}

function togglePlayingStyles() {
    if (typeof Config === 'undefined') return;
    Config.usePlayingStyles = !Config.usePlayingStyles;
    const btn = document.getElementById('btn-global-playingstyles');
    if (Config.usePlayingStyles) { btn.classList.add('active'); btn.innerText = "PlayingStyles: ON"; }
    else { btn.classList.remove('active'); btn.innerText = "PlayingStyles: OFF"; }
}

// Stubs for future features (PlayerNumber, PlayerBT)
function togglePlayerNumber() {
    window.showPlayerNumber = !window.showPlayerNumber;
    document.getElementById('btn-playernumber').innerText = 'PlayerNumber: ' + (window.showPlayerNumber ? 'ON' : 'OFF');
    document.getElementById('btn-playernumber').classList.toggle('active', window.showPlayerNumber);
}
// As tags de accao (INFILTRA, CARRY, BLOCK, HEADER...) sobre a cabeça. Omissao OFF.
function toggleActionTags() {
    window.showActionTags = !window.showActionTags;
    document.getElementById('btn-actiontags').innerText = 'Tags: ' + (window.showActionTags ? 'ON' : 'OFF');
    document.getElementById('btn-actiontags').classList.toggle('active', window.showActionTags);
}
// O nome do jogador (o da camisola, de data/player_skills.js) sobre a cabeça — so dos 3 de cada equipa mais perto da bola.
function togglePlayerNames() {
    window.showPlayerNames = !window.showPlayerNames;
    document.getElementById('btn-playernames').innerText = 'PlayerNames: ' + (window.showPlayerNames ? 'ON' : 'OFF');
    document.getElementById('btn-playernames').classList.toggle('active', window.showPlayerNames);
}
function togglePlayerPoints() {
    window.showPlayerPoints = !window.showPlayerPoints;
    document.getElementById('btn-playerpoints').innerText = 'PlayerPoints: ' + (window.showPlayerPoints ? 'ON' : 'OFF');
    document.getElementById('btn-playerpoints').classList.toggle('active', window.showPlayerPoints);
}

function togglePlayerBT() {
    window.showPlayerBT = !window.showPlayerBT;
    document.getElementById('btn-playerbt').innerText = 'PlayerBT: ' + (window.showPlayerBT ? 'ON' : 'OFF');
    document.getElementById('btn-playerbt').classList.toggle('active', window.showPlayerBT);
}

function togglePlayerPOS() {
    window.showPlayerPOS = !window.showPlayerPOS;
    document.getElementById('btn-playerpos').innerText = 'PlayerPOS: ' + (window.showPlayerPOS ? 'ON' : 'OFF');
    document.getElementById('btn-playerpos').classList.toggle('active', window.showPlayerPOS);
}

function togglePlayerPlayingStyle() {
    window.showPlayerPlayingStyle = !window.showPlayerPlayingStyle;
    document.getElementById('btn-playerplayingstyle').innerText = 'Player Playing Style: ' + (window.showPlayerPlayingStyle ? 'ON' : 'OFF');
    document.getElementById('btn-playerplayingstyle').classList.toggle('active', window.showPlayerPlayingStyle);
}

window.teamBTPosState = 'OFF';
function toggleTeamBTPos() {
    if (window.teamBTPosState === 'OFF') window.teamBTPosState = 'TeamA';
    else if (window.teamBTPosState === 'TeamA') window.teamBTPosState = 'TeamB';
    else if (window.teamBTPosState === 'TeamB') window.teamBTPosState = 'Both';
    else window.teamBTPosState = 'OFF';

    let uiLabel = window.teamBTPosState;
    if (uiLabel === 'TeamA') uiLabel = 'TeamBlue';
    else if (uiLabel === 'TeamB') uiLabel = 'TeamRed';
    else if (uiLabel === 'Both') uiLabel = 'Both';

    document.getElementById('btn-teambtpos').innerText = 'Team BT POS: ' + uiLabel;
    document.getElementById('btn-teambtpos').classList.toggle('active', window.teamBTPosState !== 'OFF');
    if (typeof Match !== 'undefined') {
        if (Match.passTargetVisual) Match.passTargetVisual.visible = (window.teamBTPosState !== 'OFF' || window.playingStyleBTToggleState !== 'OFF');
        if (Match.passLineVisual) Match.passLineVisual.visible = (window.teamBTPosState !== 'OFF' || window.playingStyleBTToggleState !== 'OFF');
    }
}

/*
O anel do "Position BT" desapareceu com o nivel 2. Sobram dois:

    Team BT POS      o slot no bloco, do TeamBT
    PlayingStyleBT   o mesmo slot ja inclinado pelo estilo do jogador
*/
window.positionBTToggleState = 'OFF';
function togglePositionBT() {
    if (window.positionBTToggleState === 'OFF') window.positionBTToggleState = 'TeamA';
    else if (window.positionBTToggleState === 'TeamA') window.positionBTToggleState = 'TeamB';
    else if (window.positionBTToggleState === 'TeamB') window.positionBTToggleState = 'Both';
    else window.positionBTToggleState = 'OFF';

    let uiLabel = window.positionBTToggleState;
    if (uiLabel === 'TeamA') uiLabel = 'TeamBlue';
    else if (uiLabel === 'TeamB') uiLabel = 'TeamRed';

    document.getElementById('btn-positionbt').innerText = 'PositionBT: ' + uiLabel;
    document.getElementById('btn-positionbt').classList.toggle('active', window.positionBTToggleState !== 'OFF');
}

window.playingStyleBTToggleState = 'OFF';
function togglePlayingStyleBT() {
    if (window.playingStyleBTToggleState === 'OFF') window.playingStyleBTToggleState = 'TeamA';
    else if (window.playingStyleBTToggleState === 'TeamA') window.playingStyleBTToggleState = 'TeamB';
    else if (window.playingStyleBTToggleState === 'TeamB') window.playingStyleBTToggleState = 'Both';
    else window.playingStyleBTToggleState = 'OFF';

    let uiLabel = window.playingStyleBTToggleState;
    if (uiLabel === 'TeamA') uiLabel = 'TeamBlue';
    else if (uiLabel === 'TeamB') uiLabel = 'TeamRed';
    else if (uiLabel === 'Both') uiLabel = 'Both';

    document.getElementById('btn-playingstylebt').innerText = 'PlayingStyleBT: ' + uiLabel;
    document.getElementById('btn-playingstylebt').classList.toggle('active', window.playingStyleBTToggleState !== 'OFF');
    if (typeof Match !== 'undefined') {
        if (Match.passTargetVisual) Match.passTargetVisual.visible = (window.teamBTPosState !== 'OFF' || window.playingStyleBTToggleState !== 'OFF');
        if (Match.passLineVisual) Match.passLineVisual.visible = (window.teamBTPosState !== 'OFF' || window.playingStyleBTToggleState !== 'OFF');
    }
}

/*
Atalho de consola para afinar a pose do lateral: `testarLateral()` põe o
jogador 9 do TeamA na linha lateral com a bola nas mãos. Mexer nos valores de
LateralPose (config.js) e voltar a chamar mostra o resultado logo.
*/
function testarLateral(idx = 8, equipa = 'TeamA') {
    const lista = (equipa === 'TeamA') ? Match.players : Match.opponents;
    const p = lista[idx];
    if (!p) return;
    p.model.position.set(CAMPO_LARG / 2, ALTURA_BASE_Y, 0);
    p.hasBall = false;
    Match.ballCarrier = null;
    p.fsm.changeState('LATERAL');
    return p;
}

function toggleArbitragem() {
    if (typeof Officials === 'undefined') return;
    Officials.setVisivel(!Officials._ativo);
    const b = document.getElementById('btn-arbitragem');
    if (b) {
        b.innerText = 'Arbitragem: ' + (Officials._ativo ? 'ON' : 'OFF');
        b.classList.toggle('active', Officials._ativo);
    }
}

/*
SOMBRAS ON/OFF.

`shadowMap.enabled` sozinho não chega: o Three guarda o programa compilado de
cada material e não o recompila só porque a flag do renderer mudou. Sem
marcar os materiais como sujos, desligar não apaga as sombras já desenhadas e
voltar a ligar deixa metade da cena sem elas — o modo de falha é ficar num
estado a meio, que se lê como um bug do jogo e não do botão.

O `needsUpdate` percorre a cena uma vez por clique. É caro, mas isto é uma
opção de painel: acontece quando alguém carrega, não por frame.

O que NÃO se toca são os `castShadow`/`receiveShadow` das malhas. Esses dizem
o que cada objecto FAZ com as sombras — a bancada, por exemplo, está
deliberadamente fora delas (ver createField) — e reescrevê-los aqui perdia
essas decisões assim que se voltasse a ligar.
*/
function toggleSombras() {
    const r = window.rendererCore;
    if (!r) return;

    r.shadowMap.enabled = !r.shadowMap.enabled;
    const on = r.shadowMap.enabled;

    /*
    E TIRAR A SOMBRA À LUZ, não só ao renderer.

    Com `shadowMap.enabled = false` o Three deixa de ACTUALIZAR o mapa mas não
    o limpa: os materiais continuam a amostrar o último mapa desenhado e as
    sombras ficam CONGELADAS no sítio onde estavam quando se desligou — os
    jogadores andam e as manchas ficam no relvado.

    Pôr `castShadow = false` na luz é o que faz o mapa deixar de existir. Isto
    é a FONTE de luz, não as malhas: os `castShadow` das malhas dizem o que
    cada objecto faz com as sombras e continuam intocados.
    */
    if (window.dirLightCore) window.dirLightCore.castShadow = on;

    if (window.Match && window.Match.scene) {
        window.Match.scene.traverse(function (o) {
            if (!o.material) return;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (let i = 0; i < mats.length; i++) {
                if (mats[i]) mats[i].needsUpdate = true;
            }
        });
    }

    const b = document.getElementById('btn-sombras');
    if (b) {
        b.innerText = 'Sombras: ' + (on ? 'ON' : 'OFF');
        b.classList.toggle('active', on);
    }
}

/*
Adeptos ON/OFF. São 10 000 bonecos em quatro InstancedMesh (ver js/crowd.js) —
desligar é útil para medir o custo do resto da cena sem eles.

O estado vive no próprio botão e não no `Crowd`, porque o `Crowd` não guarda
nenhum: `setVisivel` mexe só no `.visible` das malhas.
*/
function toggleFans() {
    if (typeof Crowd === 'undefined' || !Crowd._meshes) return;
    const b = document.getElementById('btn-fans');
    const ligado = b ? !b.classList.contains('active') : true;
    Crowd.setVisivel(ligado);
    if (b) {
        b.innerText = 'Fans: ' + (ligado ? 'ON' : 'OFF');
        b.classList.toggle('active', ligado);
    }
}

/*
Som do estádio ON/OFF. O volume acompanha o jogo sozinho (ver
js/ambiente_sonoro.js); isto só o silencia.
*/
function toggleSom() {
    if (typeof AmbienteSonoro === 'undefined') return;
    const ligado = !AmbienteSonoro.ligado;
    AmbienteSonoro.setLigado(ligado);
    const b = document.getElementById('btn-som');
    if (b) {
        b.innerText = 'Som: ' + (ligado ? 'ON' : 'OFF');
        b.classList.toggle('active', ligado);
    }
}

function toggleMinimapa() {
    if (typeof Minimap === 'undefined') return;
    Minimap.setVisivel(!Minimap.visivel);
    const b = document.getElementById('btn-minimapa');
    if (b) {
        b.innerText = 'Minimapa: ' + (Minimap.visivel ? 'ON' : 'OFF');
        b.classList.toggle('active', Minimap.visivel);
    }
}

function toggleUsarPasseGrid() {
    window.usarPasseGrid = !window.usarPasseGrid;
    document.getElementById('btn-passgrid').innerText = 'PassGrid (decisão): ' + (window.usarPasseGrid ? 'ON' : 'OFF');
    document.getElementById('btn-passgrid').classList.toggle('active', window.usarPasseGrid);
}

window.allPlayingStylesEnabled = true;
function toggleAllPlayingStyles() {
    window.allPlayingStylesEnabled = !window.allPlayingStylesEnabled;
    const btn = document.getElementById('btn-all-playing-styles');
    if (btn) {
        btn.innerText = 'All Playing Styles: ' + (window.allPlayingStylesEnabled ? 'ON' : 'OFF');
        btn.classList.toggle('active', window.allPlayingStylesEnabled);
    }
    
    if (typeof Match !== 'undefined' && Match.players && Match.opponents) {
        const all = Match.players.concat(Match.opponents);
        all.forEach(p => {
            p.playingStyleDesligado = !window.allPlayingStylesEnabled;
        });
        popularPainelJogadores();
        
        // Se o modal estiver aberto, atualiza visualmente o estilo dentro dele
        const modal = document.getElementById('modal-skills');
        if (modal && !modal.classList.contains('oculto')) {
            const linhaEstilo = modal.querySelector('.skill-linha-estilo b');
            if (linhaEstilo) {
                const text = linhaEstilo.textContent;
                if (text.includes('ON') || text.includes('OFF')) {
                    linhaEstilo.textContent = text.replace(/\(O(N|FF)\)/, window.allPlayingStylesEnabled ? '(ON)' : '(OFF)');
                    linhaEstilo.style.color = window.allPlayingStylesEnabled ? '#16a34a' : '#94a3b8';
                }
            }
        }
    }
}

function togglePainelJogadores(forcarMinimizado, evt) {
    const painel = document.getElementById('painel-jogadores');
    if (!painel) return;

    const minimizar = (forcarMinimizado === undefined)
        ? !painel.classList.contains('minimizado')
        : forcarMinimizado;

    if (evt && evt.shiftKey) { toggleTodosPaineis(minimizar); return; }

    painel.classList.toggle('minimizado', minimizar);

    const btn = document.getElementById('btn-painel-jogadores');
    if (btn) btn.innerHTML = minimizar ? '&plus;' : '&minus;';
}

/*
Preenche a lista compacta (nome + fitness + Playing Style) do painel "Player
Skills" — só uma vez, no arranque, já que as skills são fixas
(data/player_skills.js).

Clicar no nome abre o modal com o detalhe completo do jogador. Clicar no
estilo liga/desliga (p.playingStyleDesligado — ver estiloAtivoDe em
playing_styles.js): desligado, o jogador usa só o PositionBT puro, sem nenhum
desvio de estilo, pra dar pra regular o nível 2 isolado do nível 3.
*/
function popularPainelJogadores() {
    const buildLista = (elId, jogadores) => {
        const el = document.getElementById(elId);
        if (!el || !jogadores) return;
        el.innerHTML = '';
        jogadores.forEach(p => {
            if (!p.skills) return;
            const linha = document.createElement('div');
            linha.className = 'linha-jogador';

            const nomeSpan = document.createElement('span');
            nomeSpan.textContent = p.skills.nome;
            nomeSpan.onclick = () => abrirModalSkills(p);
            linha.appendChild(nomeSpan);

            const estiloSpan = document.createElement('span');
            estiloSpan.className = 'lj-estilo';
            estiloSpan.title = 'Playing Style — clicar para ligar/desligar';
            const atualizarEstiloSpan = () => {
                estiloSpan.textContent = p.playingStyleDesligado ? 'OFF' : 'ON';
                estiloSpan.classList.toggle('lj-estilo-off', !!p.playingStyleDesligado);
                estiloSpan.classList.toggle('lj-estilo-on', !p.playingStyleDesligado);
            };
            atualizarEstiloSpan();
            estiloSpan.onclick = (ev) => {
                ev.stopPropagation();
                p.playingStyleDesligado = !p.playingStyleDesligado;
                atualizarEstiloSpan();
            };
            linha.appendChild(estiloSpan);


            el.appendChild(linha);
        });
    };
    buildLista('lista-jogadores-a', Match.players);
    buildLista('lista-jogadores-b', Match.opponents);

    /*
    E o título de cada coluna: o nome da equipa escolhida, ou o Blue/Red de
    sempre. Sem isto ficavam duas listas de nomes brasileiros debaixo de
    "Blue" e "Red" e não se sabia qual era qual.
    */
    const titulo = (elId, info, omissao) => {
        const el = document.getElementById(elId);
        if (el) el.textContent = (info && info.nome) ? info.nome : omissao;
    };
    titulo('titulo-jogadores-a', Match.equipaInfoA, 'Blue');
    titulo('titulo-jogadores-b', Match.equipaInfoB, 'Red');
}

function abrirModalSkills(p) {
    const skills = p.skills;
    jogadorNoModal = p;
    const modal = document.getElementById('modal-skills');
    const titulo = document.getElementById('modal-skills-titulo');
    const corpo = document.getElementById('modal-skills-corpo');
    if (!modal || !titulo || !corpo) return;

    titulo.textContent = skills.nome;

    const campos = [
        ['ID', skills.id],
        ['Posição', skills.pos],
        ['Fitness', skills.fitness],
        ['Stamina', skills.stamina],
        ['GK', skills.gk],
        ['Técnica', skills.tec],
        ['Marcação', skills.marking],
        ['Velocidade', skills.speed],
        ['Força', skills.strength],
        ['Passe', skills.pass],
        ['Interceptação', skills.intercept],
        // Leitura de jogo (ver tools/gen_player_skills.js): quanto o jogador
        // ocupa mesmo a posição que o plano colectivo lhe pede.
        ['Leitura de jogo', skills.tacticknow]
    ];

    corpo.innerHTML = campos.map(([nome, val]) =>
        '<div class="skill-linha"><span>' + nome + '</span><b>' + val + '</b></div>'
    ).join('');

    /*
    Playing Style — linha própria, clicável: liga/desliga o estilo (ver
    estiloAtivoDe em playing_styles.js). Mesmo toggle da lista compacta
    (lj-estilo em popularPainelJogadores), só que aqui dentro do modal.
    */
    const linhaEstilo = document.createElement('div');
    linhaEstilo.className = 'skill-linha skill-linha-estilo';
    const nomeEstilo = document.createElement('span');
    nomeEstilo.textContent = 'Playing Style';
    const valEstilo = document.createElement('b');
    const atualizarValEstilo = () => {
        const defEstilo = (typeof PlayingStyles !== 'undefined' && p.playingStyle)
            ? PlayingStyles[p.playingStyle] : null;
        valEstilo.textContent = (defEstilo ? defEstilo.nome : '-') +
            (p.playingStyleDesligado ? ' (OFF)' : ' (ON)');
        valEstilo.style.color = p.playingStyleDesligado ? '#94a3b8' : '#16a34a';
    };
    atualizarValEstilo();
    linhaEstilo.style.cursor = 'pointer';
    linhaEstilo.title = 'Clicar para ligar/desligar o Playing Style';
    linhaEstilo.onclick = () => {
        p.playingStyleDesligado = !p.playingStyleDesligado;
        atualizarValEstilo();
    };
    linhaEstilo.appendChild(nomeEstilo);
    linhaEstilo.appendChild(valEstilo);
    corpo.appendChild(linhaEstilo);

    modal.classList.remove('oculto');
}

/*
O MODAL DO JOGADOR FICA COM O JOGADOR QUE ESTAVA ABERTO — e se o elenco
mudar, esse jogador já não está em campo. Guarda-se quem está lá dentro para
o poder fechar na troca de equipas (ver TEAMS_CHANGED).
*/
let jogadorNoModal = null;

function fecharModalSkills() {
    jogadorNoModal = null;
    const modal = document.getElementById('modal-skills');
    if (modal) modal.classList.add('oculto');
}

/*
Simulação em lote a partir do painel, com o número de jogos e os minutos de
cada um lidos das duas caixas.

JOGOS NECESSÁRIOS PARA A COBERTURA DE ESTILOS: 11. Cada jogo usa UMA formação
(o ciclo 442/433/4231 do simulate.js) e drena um estilo por slot daquela
posição; o gargalo é o LW, que só existe no 433 e tem quatro estilos à espera
dele — logo só esvazia no 11.º jogo. Abaixo disso o `calibrarEstilos` fica
desligado, porque uma cobertura a meio troca a formação escolhida no painel
sem chegar a medir os estilos todos.
*/
const SIM_JOGOS_PARA_COBERTURA = 11;

function lerParametrosDoLote() {
    const elJogos = document.getElementById('sim-jogos');
    const elMin = document.getElementById('sim-minutos');
    const limitar = (el, omissao, min, max) => {
        const v = el ? parseInt(el.value, 10) : NaN;
        if (!isFinite(v)) return omissao;
        return Math.max(min, Math.min(max, v));
    };
    /*
    Omissões: 30 jogos de 18 minutos simulados. É o lote que se usa para
    comparar com os alvos do relatório — 18 min simulados são ~90 minutos de
    relógio de jogo (`MatchDuration.timeScale`), ou seja uma partida inteira, e
    30 jogos dão erro-padrão bastante para as linhas que se medem. Estes
    valores estão também no `value=` das caixas (index.html); aqui são a rede
    para o caso de o campo vir vazio ou com lixo.
    */
    const jogos = limitar(elJogos, 30, 1, 100);
    const minutos = limitar(elMin, 18, 1, 90);
    return { jogos, minutos, duracaoSeg: minutos * 60 };
}

/*
Aviso por baixo das caixas: diz o que este lote vai (ou não vai) cobrir e
quanto tempo real deve levar, antes de a pessoa carregar no botão.

O tempo real sai da medição: um jogo de 150 s simulados levou 3,8 s reais, ou
seja cerca de 0,025 s reais por segundo simulado. É uma estimativa grosseira e
está escrita como tal — muda com a máquina e com o que a página tem aberto.
*/
const SIM_SEG_REAIS_POR_SEG_SIMULADO = 0.025;

function actualizarAvisoDoLote() {
    const el = document.getElementById('sim-aviso-cobertura');
    if (!el) return;
    const { jogos, minutos, duracaoSeg } = lerParametrosDoLote();
    const segundos = jogos * duracaoSeg * SIM_SEG_REAIS_POR_SEG_SIMULADO;
    const tempo = segundos < 90
        ? `~${Math.round(segundos)} s`
        : `~${Math.round(segundos / 60)} min`;
    const cobre = jogos >= SIM_JOGOS_PARA_COBERTURA;

    /*
    O QUE A CAIXA PEDE E O QUE O JOGO VE SAO COISAS DIFERENTES.

    A caixa sao minutos SIMULADOS (o `duracaoSeg` que o Sim gasta a passos de
    1/60 s). O relogio da partida anda `MatchDuration.timeScale` vezes mais
    depressa — medido, 120 s simulados dao 585 s de relogio. Sem esta linha,
    quem punha 25 julgava estar a simular 25 minutos de jogo e simulava 122.
    */
    const escala = (typeof MatchDuration !== 'undefined') ? MatchDuration.timeScale : 1;
    const minJogo = Math.round(minutos * escala);

    el.innerHTML = `${jogos} × ${minutos} min simulados = <b>${minJogo} min de relógio</b> por jogo.<br>` +
        `${tempo} reais de espera (estimativa).<br>` +
        (cobre
            ? 'Cobre os 21 playing styles.'
            : `Estilos NÃO cobertos (precisa de ${SIM_JOGOS_PARA_COBERTURA} jogos).`);
}

function runFastSim() {
    if (typeof Sim === 'undefined') return;
    if (Sim.running) { console.warn('Sim já está a correr.'); return; }

    const { jogos, duracaoSeg } = lerParametrosDoLote();
    const btn = document.getElementById('btn-fastsim');
    if (btn) { btn.innerText = 'A simular...'; btn.disabled = true; }

    /*
    O `calibrarEstilos` liga-se sozinho quando o lote é grande que chegue para
    esvaziar as filas de cobertura. Ligá-lo num lote pequeno tem um custo
    escondido: a rotação de formações troca a formação escolhida no painel e
    mede metade dos estilos — o pior dos dois mundos.
    */
    const calibrarEstilos = jogos >= SIM_JOGOS_PARA_COBERTURA;

    Sim.run({
        jogos, duracaoSeg, calibrarEstilos,
        aoProgresso: (jogo, total, fraccao) => {
            if (btn) btn.innerText = `Jogo ${jogo}/${total} — ${Math.round(fraccao * 100)}%`;
        }
    }).then(() => {
        if (btn) { btn.innerText = 'Simular lote'; btn.disabled = false; }
    });
}

/*
HUD com o portador da bola (esquerda) e o adversário mais próximo dele
(direita) — troca de lado sozinho conforme quem tem a bola muda de equipa.

A barra mostra o DEPÓSITO de agora (`p.energia`, ver StaminaModel), e já não
a `skills.stamina` fixa do início do jogo: com o cansaço a existir, mostrar o
atributo era mostrar o que ele aguenta em vez do que lhe resta. A `stamina`
continua a contar — é ela que manda no ritmo a que o depósito desce — e
aparece no título da barra.
*/
/*
O MODAL DAS ESTATISTICAS DO INTERVALO (pedido): enquanto os jogadores saem de campo e durante a pausa do treinador. Equipa da esquerda do ecra a esquerda (como os cartoes);
linhas: % posse, finalizacoes, % passes certos, amarelos, vermelhos, corners, faltas, impedimentos, defesas do guarda-redes. Match.iniciarSegundoTempo esconde-o.
*/
function mostrarModalIntervalo(ligar, titulo) {
    const el = document.getElementById('modal-intervalo');
    if (!el) return;
    if (!ligar) {
        el.classList.add('oculto');
        const mc = document.getElementById('modal-classificacao');
        if (mc) mc.classList.add('oculto');
        const mn = document.getElementById('modal-notas');
        if (mn) mn.classList.add('oculto');
        const par0 = document.getElementById('intervalo-par');
        if (par0) par0.style.transform = '';
        window._classificacaoIntervalo = null;
        return;
    }
    const tt = el.querySelector('.mi-titulo'); if (tt) tt.textContent = titulo || 'INTERVALO';
    // Pede ao manager a classificacao actualizada (chega em `classificacao` e e mostrada por mostrarClassificacaoIntervalo).
    if (typeof Ponte !== 'undefined' && Ponte.aoIntervaloIniciado) Ponte.aoIntervaloIniciado();
    if (typeof MatchStats === 'undefined' || !MatchStats.TeamA) return;
    const dirLado = (t) => (typeof Lados !== 'undefined' && Lados.dirDe) ? Lados.dirDe(t) : (t === 'TeamA' ? 1 : -1);
    const esq = dirLado('TeamA') < 0 ? 'TeamA' : 'TeamB';
    const dir = esq === 'TeamA' ? 'TeamB' : 'TeamA';
    const S = { esq: MatchStats[esq], dir: MatchStats[dir] };
    const info = (t) => (t === 'TeamA') ? Match.equipaInfoA : Match.equipaInfoB;
    const cor = (t) => {
        const i = info(t), c = i && i.escudo && i.escudo.cores ? i.escudo.cores[0] : null;
        return c && c !== 'transparent' ? c : (t === 'TeamA' ? '#3498db' : '#e74c3c');
    };
    preencherEscudoHud(document.getElementById('mi-logo-esq'), 'mi-esq', esq);
    preencherEscudoHud(document.getElementById('mi-logo-dir'), 'mi-dir', dir);
    document.getElementById('mi-nome-esq').textContent = (info(esq) && info(esq).nome) || esq;
    document.getElementById('mi-nome-dir').textContent = (info(dir) && info(dir).nome) || dir;
    const golos = (t) => (t === 'TeamA' ? Match.placarA : Match.placarB) || 0;
    document.getElementById('mi-golos').textContent = golos(esq) + ' - ' + golos(dir);

    const pct = (a, b) => (b > 0 ? Math.round(100 * a / b) : 0);
    const posse = (s, o) => { const t = (s.posseSegundos || 0) + (o.posseSegundos || 0); return t > 0 ? Math.round(100 * (s.posseSegundos || 0) / t) : 50; };
    const passes = (s) => pct(s.passes.certos + s.lancamentos.certos + s.cruzamentos.certos, s.passes.tentados + s.lancamentos.tentados + s.cruzamentos.tentados);
    const linhas = [
        { r: 'POSSE DE BOLA %', e: posse(S.esq, S.dir), d: posse(S.dir, S.esq), sufixo: '%' },
        { r: 'FINALIZAÇÕES', e: S.esq.remates.tentados, d: S.dir.remates.tentados },
        { r: 'PASSES CERTOS %', e: passes(S.esq), d: passes(S.dir), sufixo: '%' },
        { r: 'CARTÕES AMARELOS', e: S.esq.cartoes.amarelos, d: S.dir.cartoes.amarelos },
        { r: 'CARTÕES VERMELHOS', e: S.esq.cartoes.vermelhos, d: S.dir.cartoes.vermelhos },
        { r: 'CORNERS', e: S.esq.cantos, d: S.dir.cantos },
        { r: 'FALTAS', e: S.esq.faltas.cometidas, d: S.dir.faltas.cometidas },
        { r: 'IMPEDIMENTOS', e: S.esq.impedimentos, d: S.dir.impedimentos },
        { r: 'DEFESAS DO GOLEIRO', e: S.esq.defesas, d: S.dir.defesas }
    ];
    const cE = cor(esq), cD = cor(dir);
    el.querySelector('#mi-linhas').innerHTML = linhas.map(l => {
        const e = l.e || 0, d = l.d || 0, t = e + d;
        const pe = t > 0 ? 100 * e / t : 50;
        const sf = l.sufixo || '';
        return '<div class="mi-linha"><div class="mi-valor esq">' + e + sf + '</div><div class="mi-rotulo">' + l.r + '</div><div class="mi-valor dir">' + d + sf + '</div>' +
            '<div class="mi-barra"><span style="width:' + pe + '%;background:' + cE + '"></span><span style="width:' + (100 - pe) + '%;background:' + cD + '"></span></div></div>';
    }).join('');
    el.classList.remove('oculto');
}

/*
A CLASSIFICACAO DO INTERVALO (pedido): ao lado das estatisticas, a tabela do campeonato ate este momento (com o resultado provisorio do jogo em curso), para o treinador:
posicao, escudo, nome, pontos, vitorias e os ultimos 5 jogos (bolinhas verde = vitoria, amarela = empate, vermelha = derrota). `linhas` vem do manager
([{ pos, nome, logo, cores, pts, v, forma: ['V','E','D'...], destaque }]); so aparece enquanto o modal das estatisticas esta aberto.
*/
function mostrarClassificacaoIntervalo(linhas, emCurso) {
    const el = document.getElementById('modal-classificacao');
    const stats = document.getElementById('modal-intervalo');
    if (!el || !Array.isArray(linhas) || !linhas.length) return;
    window._classificacaoIntervalo = linhas;
    if (!stats || stats.classList.contains('oculto')) return;
    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const escudo = (l) => {
        if (l.logo) return '<img src="' + esc(l.logo) + '" alt="" style="width:100%;height:100%;object-fit:contain">';
        const c = l.cores || [], c1 = c[0] || '#64748b', c2 = (c[1] && c[1] !== 'transparent') ? c[1] : c1, c3 = (c[2] && c[2] !== 'transparent') ? c[2] : c1;
        return '<svg viewBox="0 0 100 120" style="width:100%;height:100%"><path d="M0 0 L100 0 L100 40 C100 100 50 120 50 120 C50 120 0 100 0 40 Z" fill="' + esc(c1) + '"/>' +
            '<rect x="33" y="0" width="34" height="115" fill="' + esc(c2) + '" opacity="0.9"/><rect x="67" y="0" width="33" height="100" fill="' + esc(c3) + '" opacity="0.9"/></svg>';
    };
    document.getElementById('mc-linhas').innerHTML = linhas.map(l => {
        const forma = (l.forma || []).slice(-5);
        const bolas = [0, 1, 2, 3, 4].map(i => '<i class="' + (forma[i - (5 - forma.length)] || '') + '"></i>').join('');
        return '<div class="mc-linha' + (l.destaque ? ' dest' : '') + '"><span class="mc-pos">' + l.pos + '</span><span class="mc-esc">' + escudo(l) + '</span><span class="mc-nome">' + esc(l.nome) + (l.vivo ? ' <small style="opacity:.8;font-weight:400">(' + esc(l.vivo) + ' ao vivo)</small>' : '') +
            '</span><span class="mc-num">' + l.pts + '</span><span class="mc-num">' + l.v + '</span><span class="mc-forma">' + bolas + '</span></div>';
    }).join('');
    const nota = document.getElementById('mc-nota');
    if (nota) nota.textContent = (typeof emCurso === 'number') ? ('inclui ' + emCurso + ' jogos em curso') : '';
    el.classList.remove('oculto');
}

// AS NOTAS DOS JOGADORES no ecra das estatisticas (intervalo e fim): `dados` = { casa: { nome, jogadores: [{ nome, nota }] }, fora: ... }, do manager.
function mostrarNotasIntervalo(dados) {
    const el = document.getElementById('modal-notas');
    const stats = document.getElementById('modal-intervalo');
    if (!el || !dados || !dados.casa || !dados.fora) return;
    if (!stats || stats.classList.contains('oculto')) return;
    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const coluna = (id, lado) => {
        document.getElementById(id).innerHTML = '<div class="mn-eq">' + esc(String(lado.nome || '').split('-')[0]) + '</div>' + (lado.jogadores || []).map(j =>
            '<div class="mn-linha"><span>' + esc(j.nome || '') + '</span><span class="' + (j.nota >= 7.5 ? 'alta' : j.nota <= 5.5 ? 'baixa' : '') + '">' + Number(j.nota).toFixed(1) + '</span></div>').join('');
    };
    coluna('mn-casa', dados.casa); coluna('mn-fora', dados.fora);
    el.classList.remove('oculto');
    // As tres caixas lado a lado cabem no ecra: reduz a escala (a de sempre e 1.3) se for preciso.
    const par = document.getElementById('intervalo-par');
    if (par) {
        par.style.transform = 'translate(-50%, -50%) scale(1.3)';
        const w = par.getBoundingClientRect().width / 1.3;
        const s = Math.min(1.3, (window.innerWidth * 0.97) / Math.max(1, w));
        par.style.transform = 'translate(-50%, -50%) scale(' + s.toFixed(3) + ')';
    }
}

// O ESCUDO do time num elemento `.hud-jog-logo`: a imagem do clube, ou 3 barras verticais com as cores dele (como o TeamShield do manager); sem nada, a cor da equipa.
function preencherEscudoHud(logoEl, uid, team) {
    if (!logoEl) return;
    const cor = (team === 'TeamA') ? '#3498db' : '#e74c3c';
    const info = (team === 'TeamA') ? Match.equipaInfoA : Match.equipaInfoB;
    const esc = info && info.escudo ? info.escudo : null;
    const chaveEscudo = esc ? (esc.logo || (esc.cores || []).join(',')) : cor;
    if (logoEl.dataset.escudo === chaveEscudo) return;
    logoEl.dataset.escudo = chaveEscudo;
    if (esc && esc.logo) {
        logoEl.innerHTML = '<img src="' + esc.logo + '" alt="" style="width:100%;height:100%;object-fit:contain">';
    } else {
        const c = (esc && esc.cores && esc.cores[0]) ? esc.cores : [cor, cor, cor];
        const c1 = c[0] || cor, c2 = c[1] || c1, c3 = (c[2] && c[2] !== 'transparent') ? c[2] : c1;
        logoEl.innerHTML = '<svg viewBox="0 0 100 120" style="width:100%;height:100%"><defs><clipPath id="hudesc-' + uid + '"><path d="M0 0 L100 0 L100 40 C100 100 50 120 50 120 C50 120 0 100 0 40 Z"/></clipPath></defs>' +
            '<g clip-path="url(#hudesc-' + uid + ')"><rect x="0" y="0" width="33" height="120" fill="' + c1 + '"/><rect x="33" y="0" width="34" height="120" fill="' + c2 + '"/><rect x="67" y="0" width="33" height="120" fill="' + c3 + '"/></g>' +
            '<path d="M0 0 L100 0 L100 40 C100 100 50 120 50 120 C50 120 0 100 0 40 Z" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="4"/></svg>';
    }
}

/*
O CARTAO DE EVENTO (pedido): quando um contador sobe — remate, canto, falta, cartao... — mostra no topo, centrado, 50 px abaixo: ESCUDO numero NOME numero ESCUDO,
cada equipa do seu lado (a da esquerda do ecra a esquerda). Dura `HUD_EVENTO.duracao` (7) s; um evento novo substitui o anterior. Compara os contadores do MatchStats
a cada frame (a primeira leitura e as quedas — novo jogo — so refazem a referencia).
*/
const HUD_EVENTO = {
    duracao: 7.0,
    eventos: [
        { nome: 'SHOTS', le: s => s.remates.tentados },
        { nome: 'SHOTS ON TARGET', le: s => s.remates.noAlvo },
        { nome: 'CORNERS', le: s => s.cantos },
        { nome: 'FOULS', le: s => s.faltas.cometidas },
        { nome: 'OFFSIDES', le: s => s.impedimentos },
        { nome: 'YELLOW CARDS', le: s => s.cartoes.amarelos },
        { nome: 'RED CARDS', le: s => s.cartoes.vermelhos }
    ],
    _antes: null, _fim: 0, _ultimoAgora: 0
};

function updateHudEvento() {
    const el = document.getElementById('hud-evento');
    if (!el || typeof MatchStats === 'undefined' || !MatchStats.TeamA || !MatchStats.TeamB) return;
    const H = HUD_EVENTO;
    const agora = performance.now() / 1000;
    const atual = H.eventos.map(e => [e.le(MatchStats.TeamA) || 0, e.le(MatchStats.TeamB) || 0]);
    let novo = -1;
    if (!H._antes) {
        H._antes = atual;
    } else {
        for (let i = 0; i < atual.length; i++) {
            if (atual[i][0] > H._antes[i][0] || atual[i][1] > H._antes[i][1]) novo = i;
        }
        H._antes = atual;
    }
    const antesDaSaida = Match.state === 'ABERTURA' || Match.state === 'INTERVALO' || (typeof Abertura !== 'undefined' && Abertura.activa);
    if (novo >= 0 && !antesDaSaida) {
        const dirLado = (t) => (typeof Lados !== 'undefined' && Lados.dirDe) ? Lados.dirDe(t) : (t === 'TeamA' ? 1 : -1);
        // O CARTAO DE ESTATISTICAS NAO VIRA NO 2.o TEMPO (pedido): fica na ordem do 1.o, mesmo com as equipas a trocar de lado.
        let esq = dirLado('TeamA') < 0 ? 'TeamA' : 'TeamB';
        if (Match.segundoTempoIniciado) esq = esq === 'TeamA' ? 'TeamB' : 'TeamA';
        const dir = esq === 'TeamA' ? 'TeamB' : 'TeamA';
        preencherEscudoHud(document.getElementById('hud-evento-logo-esq'), 'evento-esq', esq);
        preencherEscudoHud(document.getElementById('hud-evento-logo-dir'), 'evento-dir', dir);
        document.getElementById('hud-evento-num-esq').textContent = atual[novo][esq === 'TeamA' ? 0 : 1];
        document.getElementById('hud-evento-num-dir').textContent = atual[novo][dir === 'TeamA' ? 0 : 1];
        document.getElementById('hud-evento-nome').textContent = H.eventos[novo].nome;
        el.classList.remove('oculto');
        H._fim = agora + H.duracao;
    }
    if (!el.classList.contains('oculto') && (agora >= H._fim || antesDaSaida)) el.classList.add('oculto');
}

function preencherHudJogador(elId, p) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!p || !p.skills) { el.classList.add('oculto'); return; }

    const cor = (p.team === 'TeamA') ? '#3498db' : '#e74c3c';
    preencherEscudoHud(el.querySelector('.hud-jog-logo'), el.id, p.team);
    // Nome | numero | posicao.
    const numero = (p.skills.numero !== undefined && p.skills.numero !== null && p.skills.numero !== '') ? p.skills.numero : p.num;
    el.querySelector('.hud-jog-nome').textContent = [p.skills.nome, numero, p.pos].filter(x => x !== undefined && x !== null && x !== '').join(' | ');
    // Quem tem cartao AMARELO leva o nome em amarelo no cartao (pedido).
    el.querySelector('.hud-jog-nome').style.color = p.temAmarelo ? '#facc15' : '';

    /*
    Barra em 5 segmentos de 20 pontos, TODOS acesos na mesma cor — a cor
    depende de quantos segmentos estão cheios: 5 = green, 4 = yellow,
    3 = orange, 2 ou 1 = red.
    */
    const deposito = (typeof p.energia === 'number') ? p.energia : 1;
    const acesos = Math.ceil(THREE.MathUtils.clamp(deposito * 100, 0, 100) / 20);
    const corPorAcesos = { 5: 'on-green', 4: 'on-yellow', 3: 'on-orange', 2: 'on-red', 1: 'on-red', 0: 'on-red' };
    const corStamina = corPorAcesos[acesos];
    const segs = el.querySelectorAll('.hud-jog-stamina-bar .seg');
    segs.forEach((seg, i) => {
        seg.className = 'seg' + (i < acesos ? ' ' + corStamina : '');
    });
    el.querySelector('.hud-jog-stamina-bar').title =
        'Depósito ' + Math.round(deposito * 100) + '% (stamina ' + p.skills.stamina + ')';

    el.classList.remove('oculto');
}

function updateHudJogadores() {
    /*
    OS CARTOES NAO SOMEM DURANTE O JOGO (pedido): saem na entrada em campo, no intervalo e no fim, e voltam depois. Mostram sempre quem esta com a bola e o marcador dele
    (o adversario mais perto); sem ninguem com a bola dominada, o mais perto da bola de cada equipa. Quem esta num cartao so e trocado quando outro esta mais de
    `HISTERESE` m mais perto, para o cartao nao piscar de nome em nome.
    */
    const HISTERESE = 1.0;
    const naoJoga = Match.state === 'ABERTURA' || Match.state === 'INTERVALO' || Match.state === 'FIM_DE_JOGO' ||
        (typeof Abertura !== 'undefined' && Abertura.activa);
    if (naoJoga || !Match.ball) {
        preencherHudJogador('hud-jogador-esq', null);
        preencherHudJogador('hud-jogador-dir', null);
        window._hudMemoria = null;
        return;
    }
    const maisPerto = (lista, pos, anterior) => {
        let melhor = null, dm = Infinity, dAnt = Infinity;
        for (const o of lista) {
            if (!o || !o.model || o.expulso) continue;
            const d = o.model.position.distanceTo(pos);
            if (o === anterior) dAnt = d;
            if (d < dm) { dm = d; melhor = o; }
        }
        return (anterior && dAnt <= dm + HISTERESE) ? anterior : melhor;
    };
    const mem = window._hudMemoria || (window._hudMemoria = { A: null, B: null });
    const carrier = Match.ballCarrier;
    let pA, pB;
    if (carrier && carrier.model) {
        // O portador, e o adversario mais perto dele.
        const adversarios = (carrier.team === 'TeamA') ? Match.opponents : Match.players;
        const outro = maisPerto(adversarios, carrier.model.position, carrier.team === 'TeamA' ? mem.B : mem.A);
        pA = carrier.team === 'TeamA' ? carrier : outro;
        pB = carrier.team === 'TeamA' ? outro : carrier;
    } else {
        // Bola solta: o mais perto da bola de cada equipa.
        pA = maisPerto(Match.players, Match.ball.position, mem.A);
        pB = maisPerto(Match.opponents, Match.ball.position, mem.B);
    }
    mem.A = pA; mem.B = pB;

    // O cartao da ESQUERDA e o do time que esta a esquerda do ecra (o que defende a esquerda e ataca para a direita, dirZ -1 na camara lateral TV); o da
    // DIREITA, o do outro.
    const dirLado = (t) => (typeof Lados !== 'undefined' && Lados.dirDe) ? Lados.dirDe(t) : (t === 'TeamA' ? 1 : -1);
    const aEsquerda = dirLado('TeamA') < 0;
    preencherHudJogador('hud-jogador-esq', aEsquerda ? pA : pB);
    preencherHudJogador('hud-jogador-dir', aEsquerda ? pB : pA);
}

window.cameraFrustum = new THREE.Frustum();
window.cameraProjMatrix = new THREE.Matrix4();

function updateCameraFrustum() {
    if (!window.cameraCore) return;
    window.cameraCore.updateMatrixWorld();
    window.cameraProjMatrix.multiplyMatrices(window.cameraCore.projectionMatrix, window.cameraCore.matrixWorldInverse);
    window.cameraFrustum.setFromProjectionMatrix(window.cameraProjMatrix);
}

const _embutidoSemCidade = /[?&]embutido/.test(location.search) && !/[?&](cidade|oculto)/.test(location.search);
function animate(time) {
    requestAnimationFrame(animate);

    // A simulação em lote (js/simulate.js) conduz o Match.update() e não
    // desenha nada — enquanto ela corre, este loop fica de fora por
    // completo, para não haver dois donos do tick nem gasto de GPU à toa.
    if (typeof Sim !== 'undefined' && Sim.running) return;

    let delta = (time - lastTime) / 1000;
    if (isNaN(delta) || delta > 0.1) delta = 0.016;
    lastTime = time;
    // O tempo do FRAME desenhado, para quem suaviza por frame e não por passo
    // de simulação — a câmara (ver Match.updateCamera).
    window.lastFrameDelta = delta;

    if (typeof Weather !== 'undefined') Weather.update(delta);
    /*
    A CIDADE SO QUANDO APARECE. Embutido no manager (?embutido=1) as cameras normais (TV, lateral, centro) nao a mostram (o estadio tapa-a)
    e ela pesa (500 torcedores a andar, transito). So se constroi (uma vez) e so se desenha e actualiza nas cameras que a veem
    (cinema, grua, orbita), ou sempre com ?cidade=1.
    */
    if (typeof Cidade !== 'undefined') {
        if (_embutidoSemCidade) {
            const ve = ['cinema', 'grua', 'orbit'].indexOf(window.cameraMode) >= 0;
            if (ve && !Cidade.grupo && typeof CidadeConfig !== 'undefined' && CidadeConfig.ativa && Match.scene) Cidade.construir(Match.scene);
            if (Cidade.grupo) Cidade.grupo.visible = ve;
            if (ve) Cidade.update(delta);
        } else {
            Cidade.update(delta);
        }
    }

    fpsFrames++;
    if (time - fpsLastTime >= 1000) {
        let fps = Math.round((fpsFrames * 1000) / (time - fpsLastTime));
        window._fpsAtual = fps;   // lido pela barra da tela cheia (ponte.js, #tc-fps)
        let titleEl = document.getElementById('app-title');
        if (titleEl) titleEl.innerText = 'SOCCER SIM | FPS: ' + fps;
        
        if (fps < 30 && window.Config && window.Config.enableCrowd && !window.crowdDisabledByFps) {
            window.consecutiveLowFps = (window.consecutiveLowFps || 0) + 1;
            if (window.consecutiveLowFps >= 10) { // 10 segundos consecutivos abaixo de 30 FPS (a torcida sumia por quedas curtas)
                window.crowdDisabledByFps = true;
                if (typeof Crowd !== 'undefined') Crowd.setVisivel(false);
                let uiToggle = document.getElementById('toggle-fans');
                if (uiToggle) uiToggle.checked = false; // atualiza a interface
                console.warn("Performance Mode: Crowd automatically disabled due to low FPS (< 40).");
                titleEl.innerText = 'SOCCER SIM | FPS: ' + fps + ' (Crowd Disabled)';
            }
        } else {
            window.consecutiveLowFps = 0;
        }
        
        fpsFrames = 0;
        fpsLastTime = time;
    }

    /*
    O JOGO NÃO ANDA POR BAIXO DE UMA REPETIÇÃO.

    Quem segurava o `Match.update` durante um replay era a PAUSA: o
    `startReplay` chamava `Match.togglePause()`. Só que o `playFrame` também
    pára em pausa (e com razão: o botão de pause tem de valer no replay), e as
    duas coisas juntas davam uma repetição congelada no primeiro frame — para a
    ver era preciso carregar em Continue, e aí a simulação corria POR BAIXO
    dela, a escrever nos mesmos corpos que a repetição estava a repor.

    Agora são dois travões separados e cada um com o seu dono: a repetição
    segura a simulação (aqui), e a pausa segura as duas. É também isto que
    prende a saída de bola até ao fim da repetição do golo (ver `replayDoGolo`,
    js/match/match_replay.js): sem `Match.update`, a máquina de estados do golo
    fica onde está.
    */
    const emRepeticao = !!(window.MatchReplay && window.MatchReplay.isReplaying);

    if (!window.isPaused && !emRepeticao) {
        // GAME_SPEED é o ritmo base da partida (config.js); o speedMultiplier
        // continua a ser só o controlo 0.5x/1.0x/1.3x do painel.
        if (window.speedMultiplier === 'frame') {
            if (Match.stepNextFrame) {
                Match.stepNextFrame = false;
                Match.update((1/60) * GAME_SPEED);
            }
        } else {
            /*
            PASSOS PARTIDOS, e não um passo grande.

            `Match.update(dt * N)` não é o mesmo jogo N vezes mais depressa:
            é o mesmo jogo com a física a saltar buracos. Ao 10x que este botão
            era, o passo seria ~0.15 s (7 Hz), e a essa cadência a bola anda
            1,5 m entre frames — atravessa a rede (testada por bandas de
            0.22 m), passa ao lado dos contactos, e os temporizadores da FSM
            saltam gestos inteiros. O 2x já saiu do painel e o mais rápido é
            hoje 1.2x, mas a partição fica: é ela que torna a escolha do
            multiplicador inofensiva, e o mesmo código serve o 0.3x novo — aí
            é sempre um passo só, mais pequeno que o frame.

            Correr N passos do tamanho normal dá exactamente o mesmo jogo, só
            mais vezes por frame. Abaixo de `PASSO_MAX` isto é um passo só, ou
            seja o 0.7x/1.0x/1.2x de sempre não muda nada.

            A `guarda` existe para o caso do frame lento: sem ela, um frame
            demorado pedia mais passos, que o tornavam mais demorado ainda.
            Melhor perder tempo de jogo do que entrar em espiral.

            E os passos são todos do MESMO TAMANHO (ver `partirPasso`,
            utils.js). Eram uma fatia cheia mais um resto, e o resto podia ser
            de décimas de milésimo de segundo — tempo nenhum de jogo, mas uma
            dose inteira de suavização do rig, que conta por chamada e não por
            segundo. Era isso que fazia a animação mudar de ritmo conforme o
            frame partia ou não.
            */
            const PASSO_MAX = (1 / 60) * GAME_SPEED * 1.5;
            const corte = partirPasso(delta * window.speedMultiplier * GAME_SPEED, PASSO_MAX);
            for (let i = 0; i < corte.n; i++) Match.update(corte.passo);
            const guarda = corte.n;
            /*
            QUANTOS PASSOS ESTE FRAME PEDIU — contado para a auditoria de
            performance, e não por gosto de contar.

            O passo tem tecto (`PASSO_MAX`, 1.5 frames de 60 Hz) mas o tempo a
            consumir é o do frame REAL: a 60 fps cabe um passo, e no instante
            em que o frame passa de ~25 ms passam a ser DOIS. Isso acrescenta
            um tick de lógica inteiro ao frame que já estava lento, o que o
            mantém lento — e é por isso que a queda se lê como um PATAMAR nos
            40 fps e não como uma descida suave. Ver auditarPerformance.
            */
            window._perfPassos = (window._perfPassos || 0) + guarda;
        }
    }

    /*
    A CÂMARA DEPOIS DO MUNDO, e não antes.

    Isto corria no topo do `animate`, ANTES do `Match.update`: a câmara era
    apontada à bola do frame ANTERIOR e só depois o mundo avançava, mas o
    `render` lá em baixo desenha as duas coisas juntas. Ficava um frame
    inteiro de desencontro entre o que a câmara persegue e o que está
    desenhado — a 60 fps com a bola a 20 m/s são 33 cm, e lê-se como a
    imagem a arrastar-se atrás do jogo.

    O `updateCameraFrustum` vem junto de propósito: o frustum tem de ser o
    desta câmara, não o de uma posição que já não existe.
    */
    if (window.cameraMode === 'orbit') {
        if (orbitControls) orbitControls.update();
    } else {
        Match.updateCamera();
    }
    // Torcida: so ate 1.2x o viewport (crowd.js, `cullar`).
    if (typeof Crowd !== 'undefined' && Crowd.cullar && window.cameraCore) Crowd.cullar(window.cameraCore);
    // Discos em vez de bonecos na câmara de cima — ver atualizarVistaTatica.
    Match.atualizarVistaTatica();
    updateCameraFrustum();

    // Fora do `if (!isPaused)`: em pausa os números continuam a valer, e o
    // painel tem de continuar a mostrá-los.
    updatePainelEstatisticas(delta);

    if (TeamAI && TeamAI.blackboards) {
        const bbA = TeamAI.blackboards['TeamA'];
        if (bbA && bbA.state) {
            const el = document.getElementById('hud-state-a');
            if (el.innerText !== bbA.state) el.innerText = bbA.state;
        }
        const bbB = TeamAI.blackboards['TeamB'];
        if (bbB && bbB.state) {
            const el = document.getElementById('hud-state-b');
            if (el.innerText !== bbB.state) el.innerText = bbB.state;
        }


        // Alimenta a aba do fluxograma do TeamBT (teamBtView.html), se aberta.
        // BroadcastChannel: nada acontece se ninguém estiver a ouvir do outro lado.
        if (!window._teamBtChannel) window._teamBtChannel = new BroadcastChannel('teamBtTrace');
        if (!window._lastBtPost || time - window._lastBtPost > 200) {
            window._lastBtPost = time;
            window._teamBtChannel.postMessage({
                TeamA: bbA ? { trace: bbA.trace, posture: bbA.posture } : null,
                TeamB: bbB ? { trace: bbB.trace, posture: bbB.posture } : null
            });
        }
    }

    if (!window._hudJogadoresLast || time - window._hudJogadoresLast > 200) {
        window._hudJogadoresLast = time;
        updateHudJogadores();
        updateHudEvento();
    }

    // Minimapa a cada frame: são 23 pontos num canvas 2D, custa menos que
    // qualquer um dos overlays do debug que desenhavam texto por célula.
    if (typeof Minimap !== 'undefined') Minimap.update();

    if (window.MatchReplay && window.MatchReplay.isReplaying) {
        window.MatchReplay.playFrame();
    } else if (window.MatchReplay && !window.isPaused) {
        window.MatchReplay.recordFrame();
    }
    rendererCore.render(scene, cameraCore);

    auditarPerformance(time);
}

/*
=============================================================================
AUDITORIA DE PERFORMANCE — o que cresce ao longo do jogo
=============================================================================
Relato: "quando chega a 40 minutos de jogo aproximadamente, cai de 60 para
40 FPS".

Uma queda que aparece com o TEMPO, e não com o que está no ecrã, é
acumulação. Medido primeiro do lado da LÓGICA, sem ecrã
(`tools/headless/perf_deriva.js`, 63 minutos de jogo): o tempo de CPU por
frame ficou PLANO (2.7 -> 2.0 ms), a cena ficou nos mesmos 1975 objectos e
nenhuma colecção do `Match`/`MatchStats`/`Officials` cresceu sem limite.
Portanto não é o jogo a pensar: é o desenho, ou algo que só existe no browser.

Daqui em diante a medição tem de ser feita ONDE ELA ACONTECE, e é isso que
esta função faz: a cada `PERF_INTERVALO` segundos escreve na consola os
contadores do renderer — chamadas de desenho, geometrias e TEXTURAS vivas —,
os objectos da cena e, no Chrome, o heap de JS. Um deles a subir a cada
linha diz onde está a fuga:

    textures a subir    -> textura criada e não libertada (ver as
                           CanvasTexture do updateShirt e dos painéis)
    geometries a subir  -> geometria criada por evento e não libertada
    calls a subir       -> objectos a mais na cena a serem desenhados
    heap a subir e o resto plano -> pressão de GC (alocação por frame)
    tudo plano          -> não é o cliente: é térmico, ou a tab em segundo
                           plano, ou o próprio browser a estrangular

Fica LIGADO por omissão enquanto o relato estiver aberto: é uma linha de
consola a cada 30 s, e sem ela a auditoria depende de alguém se lembrar de
ligar uma bandeira antes de jogar. `window.auditarPerf = false` cala.
=============================================================================
*/
const PERF_INTERVALO = 30;

function auditarPerformance(time) {
    if (window.auditarPerf === false) return;
    if (!rendererCore || !rendererCore.info) return;

    if (!window._perfProx) {
        window._perfProx = time + PERF_INTERVALO * 1000;
        window._perfFrames = 0;
        window._perfT0 = time;
        return;
    }
    window._perfFrames++;
    if (time < window._perfProx) return;

    const fps = window._perfFrames * 1000 / (time - window._perfT0);
    const passosPorFrame = (window._perfPassos || 0) / Math.max(1, window._perfFrames);
    window._perfProx = time + PERF_INTERVALO * 1000;
    window._perfFrames = 0;
    window._perfPassos = 0;
    window._perfT0 = time;

    let objectos = 0;
    scene.traverse(() => { objectos++; });

    const r = rendererCore.info;
    const heap = (performance && performance.memory)
        ? Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB' : '-';
    const minJogo = (Match.tempoDeJogo / 60).toFixed(1);

    console.log(`[perf] ${minJogo}' de jogo | ${fps.toFixed(0)} fps | ` +
        `passos/frame ${passosPorFrame.toFixed(2)} | ` +
        `calls ${r.render.calls} | tris ${r.render.triangles} | ` +
        `geometrias ${r.memory.geometries} | texturas ${r.memory.textures} | ` +
        `objectos ${objectos} | heap ${heap}`);
}

/*
=============================================================================
VALIDAÇÃO DE ARRANQUE DOS MODELOS (Auditoria item 7)
=============================================================================
Confirma que todos os modelos essenciais de configuração, física e animação
foram carregados antes de inicializar o jogo, falhando imediatamente com
erro explícito em vez de degradar silenciosamente com valores de fallback.
=============================================================================
*/
function validarModelosDoJogo() {
    const modelosObrigatorios = [
        ['Area', typeof Area !== 'undefined'],
        ['BallPhysics', typeof BallPhysics !== 'undefined'],
        ['GoalFrame', typeof GoalFrame !== 'undefined'],
        ['BarreiraCampo', typeof BarreiraCampo !== 'undefined'],
        ['Tatics', typeof Tatics !== 'undefined'],
        ['FormationsData', typeof FormationsData !== 'undefined'],
        ['MatchDuration', typeof MatchDuration !== 'undefined'],
        ['SetPiecePrazos', typeof SetPiecePrazos !== 'undefined'],
        ['TeamShape', typeof TeamShape !== 'undefined'],
        ['BlockShape', typeof BlockShape !== 'undefined'],
        ['MentalidadeModel', typeof MentalidadeModel !== 'undefined'],
        ['PassLineModel', typeof PassLineModel !== 'undefined'],
        ['PassModel', typeof PassModel !== 'undefined'],
        ['PassErrorModel', typeof PassErrorModel !== 'undefined'],
        ['SupportModel', typeof SupportModel !== 'undefined'],
        ['FirstTouchModel', typeof FirstTouchModel !== 'undefined'],
        ['RunIntoSpaceModel', typeof RunIntoSpaceModel !== 'undefined'],
        ['ShootingModel', typeof ShootingModel !== 'undefined'],
        ['ShotModel', typeof ShotModel !== 'undefined'],
        ['FreeKickModel', typeof FreeKickModel !== 'undefined'],
        ['PenaltyModel', typeof PenaltyModel !== 'undefined'],
        ['CrossModel', typeof CrossModel !== 'undefined'],
        ['HeaderModel', typeof HeaderModel !== 'undefined'],
        ['XGModel', typeof XGModel !== 'undefined'],
        ['SlideTackleModel', typeof SlideTackleModel !== 'undefined'],
        ['MarkingModel', typeof MarkingModel !== 'undefined'],
        ['DefensivePressureModel', typeof DefensivePressureModel !== 'undefined'],
        ['CornerDefenseModel', typeof CornerDefenseModel !== 'undefined'],
        ['GoalkeeperStyle', typeof GoalkeeperStyle !== 'undefined'],
        ['GoalkeeperPose', typeof GoalkeeperPose !== 'undefined'],
        ['GoalkeeperDistribution', typeof GoalkeeperDistribution !== 'undefined'],
        ['GoalkeeperDive', typeof GoalkeeperDive !== 'undefined'],
        ['GkCatchModel', typeof GkCatchModel !== 'undefined'],
        ['TurnModel', typeof TurnModel !== 'undefined'],
        ['LateralGait', typeof LateralGait !== 'undefined'],
        ['GaitModel', typeof GaitModel !== 'undefined'],
        ['SaltoCabeceio', typeof SaltoCabeceio !== 'undefined'],
        ['CadenceModel', typeof CadenceModel !== 'undefined'],
        ['AppearanceModel', typeof AppearanceModel !== 'undefined'],
        ['RestlessModel', typeof RestlessModel !== 'undefined'],
        ['VisionModel', typeof VisionModel !== 'undefined'],
        ['EsperaPeloSlotModel', typeof EsperaPeloSlotModel !== 'undefined'],
        ['GiroDeCostasModel', typeof GiroDeCostasModel !== 'undefined'],
        ['CarryModel', typeof CarryModel !== 'undefined'],
        ['DribbleModel', typeof DribbleModel !== 'undefined'],
        ['BallControl', typeof BallControl !== 'undefined'],
        ['ThrowInModel', typeof ThrowInModel !== 'undefined'],
        ['PerceptionModel', typeof PerceptionModel !== 'undefined'],
        ['ActionAnimClips', typeof ActionAnimClips !== 'undefined'],
        ['ShotClip', typeof ShotClip !== 'undefined'],
        ['GoalkeeperKickClip', typeof GoalkeeperKickClip !== 'undefined'],
        ['GoalkeeperGroundKickClip', typeof GoalkeeperGroundKickClip !== 'undefined'],
        ['PlayerKickClip', typeof PlayerKickClip !== 'undefined'],
        ['GoalkeeperThrowClip', typeof GoalkeeperThrowClip !== 'undefined'],
        ['ThrowInClip', typeof ThrowInClip !== 'undefined'],
        ['Match', typeof Match !== 'undefined']
    ];

    const emFalta = modelosObrigatorios.filter(m => !m[1]).map(m => m[0]);
    if (emFalta.length > 0) {
        throw new Error(`Modelos críticos em falta na inicialização: ${emFalta.join(', ')}`);
    }
}

/*
OS DOIS SELECTORES DE EQUIPA, a partir de `data/squads.js`.

Preenchidos em código e não escritos à mão no HTML: são 57 equipas geradas
por `tools/gen_squads.js`, e a lista muda sempre que os dados de origem
mudarem. Sem o ficheiro carregado o bloco fica escondido — o jogo continua
com as equipas genéricas.
*/
function preencherSelectoresDeEquipa() {
    const bloco = document.getElementById('bloco-equipas');
    const selA = document.getElementById('t-equipa-A');
    const selB = document.getElementById('t-equipa-B');
    if (!bloco || !selA || !selB) return;
    if (typeof SquadsData === 'undefined' || !SquadsData.equipas || !SquadsData.equipas.length) return;

    for (const e of SquadsData.equipas) {
        for (const sel of [selA, selB]) {
            const opt = document.createElement('option');
            opt.value = String(e.id);
            // O numero e a FORCA do time: media das skills dos onze titulares (tools/gen_squads.js).
            opt.textContent = `${e.nome} (${e.forca})`;
            sel.appendChild(opt);
        }
    }
    bloco.style.display = '';
}

/*
Põe os selectores no que está em campo. Corre depois do `Match.init`, que é
quem resolve as equipas por omissão.
*/
function sincronizarSelectoresDeEquipa() {
    const par = [['t-equipa-A', 'equipaIdA'], ['t-equipa-B', 'equipaIdB']];
    for (const [elId, campo] of par) {
        const sel = document.getElementById(elId);
        if (!sel) continue;
        const id = Match[campo];
        const valor = (id === null || id === undefined) ? '' : String(id);
        // Só se a opção existir: um id sem equipa na lista deixaria o
        // selector em branco a dizer o que não é.
        if ([...sel.options].some(o => o.value === valor)) sel.value = valor;
    }
}

/*
Troca as equipas escolhidas no painel. Os bonecos são recriados — ver
Match.trocarEquipas, que explica porquê.
*/
function trocarEquipaDoPainel() {
    const selA = document.getElementById('t-equipa-A');
    const selB = document.getElementById('t-equipa-B');
    if (!selA || !selB || typeof Match === 'undefined') return;

    const idDe = (sel) => (sel.value === '') ? null : Number(sel.value);
    // Quem actualiza o painel, os nomes e o modal é o TEAMS_CHANGED que o
    // `trocarEquipas` emite — ver ligarActualizacaoDoElenco. Assim a troca
    // feita pela consola ou pelo lote actualiza a mesma coisa.
    Match.trocarEquipas({ A: idDe(selA), B: idDe(selB) });
}

/*
LIGA A UI À TROCA DE ELENCO. Uma vez, no arranque.

O painel "Player Skills" nasceu a ser montado uma vez só — as skills eram
fixas, geradas por `tools/gen_player_skills.js`. Com planteis reais o elenco
muda em jogo, e tudo o que mostra jogadores tem de ser refeito: as duas
listas, os títulos das colunas, os nomes do placar, e o modal que pode estar
aberto com um jogador que já saiu de campo.

O HUD do portador e do marcador não entra aqui: refaz-se sozinho a cada 200 ms
a partir das listas vivas (ver updateHudJogadores).
*/
function ligarActualizacaoDoElenco() {
    if (typeof EventBus === 'undefined') return;
    EventBus.on('TEAMS_CHANGED', () => {
        if (typeof Crowd !== 'undefined' && Crowd.recolorir) {
            { const cs = { A: Crowd.coresDaEquipa(Match.players, 'A'), B: Crowd.coresDaEquipa(Match.opponents, 'B') }; Crowd.recolorir(cs); if (typeof CidadeGente !== 'undefined' && CidadeGente.recolorirComTimes) CidadeGente.recolorirComTimes(cs); }
            if (Match.pintarBandeirasDeCanto) Match.pintarBandeirasDeCanto(Crowd.coresDaEquipa(Match.players));
        }
        if (jogadorNoModal) {
            const emCampo = Match.players.includes(jogadorNoModal) ||
                Match.opponents.includes(jogadorNoModal);
            if (!emCampo) fecharModalSkills();
        }
        popularPainelJogadores();
        actualizarNomesNoPlacar();
    });
}

/*
Nomes no placar: o das equipas escolhidas, ou o RED/BLUE de sempre.
*/
function actualizarNomesNoPlacar() {
    if (typeof Match === 'undefined') return;
    const elA = document.getElementById('placar-nome-a');
    const elB = document.getElementById('placar-nome-b');
    if (elA) elA.textContent = (Match.equipaInfoA && Match.equipaInfoA.nome) ? Match.equipaInfoA.nome : 'BLUE';
    if (elB) elB.textContent = (Match.equipaInfoB && Match.equipaInfoB.nome) ? Match.equipaInfoB.nome : 'RED';
}

document.addEventListener("DOMContentLoaded", () => {
    try {
        validarModelosDoJogo();

        // Preenche o aviso do lote com os valores por omissão das caixas.
        actualizarAvisoDoLote();

        if (typeof AmbienteSonoro !== 'undefined') AmbienteSonoro.init();
        // Apito e chute (assets/apito.mpeg, assets/chute.mpeg). Partilham o
        // interruptor do ambiente — ver js/efeitos_sonoros.js.
        if (typeof EfeitosSonoros !== 'undefined') EfeitosSonoros.init();

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB);
        window.sceneCore = scene;

        cameraCore = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.3, 800);   // near 0.3 (era 0.1): 3x mais precisao de profundidade, menos z-fighting
        window.cameraCore = cameraCore;

        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 850);
        rendererCore = new THREE.WebGLRenderer({ antialias: !isTouchDevice, powerPreference: "high-performance" });
        // Max pixel ratio of 1.0 on tablets to save fill rate
        // Embutido no manager (?embutido=1): pixel ratio 1 (o iframe divide a GPU com a pagina do manager).
        rendererCore.setPixelRatio((typeof Qualidade !== 'undefined') ? Math.min(window.devicePixelRatio || 1, Qualidade.cfg().pixelRatio) : ((isTouchDevice || /[?&]embutido/.test(location.search)) ? 1 : Math.min(window.devicePixelRatio || 1, 1.5)));   // Qualidade (config/qualidade.js)
        rendererCore.setSize(window.innerWidth, window.innerHeight);
        rendererCore.shadowMap.enabled = (typeof Qualidade === 'undefined') ? true : Qualidade.cfg().sombras;
        rendererCore.shadowMap.type = THREE.PCFShadowMap; // Better performance
        document.body.appendChild(rendererCore.domElement);
        window.rendererCore = rendererCore;

        orbitControls = new SimpleOrbitControls(cameraCore, rendererCore.domElement);
        window.orbitControls = orbitControls;

        const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
        dirLight.position.set(50, 100, 40);
        dirLight.castShadow = (typeof Qualidade === 'undefined') ? true : Qualidade.cfg().sombras;
        /*
        NITIDEZ DA SOMBRA = texels por metro, e é uma divisão simples:
        `mapSize / (2*d)`. Estava em 1024 sobre uma área de 160x160 m, ou seja
        6.4 texels por metro — uma perna de 20 cm ficava em 1.3 texels e a
        sombra saía uma mancha, mesmo com o corpo todo a projectar.

        O `d` cobre o campo inteiro (106x68, meia-diagonal 63 m), portanto 70
        chega e sobra; com 2048 dão 14.6 texels por metro, mais do dobro.
        Baixar o `d` sem baixar a nitidez não era opção: a sombra tem de
        alcançar a bancada e as balizas, e cortar a área faz as sombras
        desaparecerem nas pontas do campo.

        Em tablets fica como estava — lá as peças nem projectam (ver
        criarPeca em pose.js).
        */
        const mapaSombra = (typeof Qualidade !== 'undefined') ? Math.min(Qualidade.cfg().mapa, isTouchDevice ? 512 : 4096) : (isTouchDevice ? 512 : 2048);
        dirLight.shadow.mapSize.width = mapaSombra;
        dirLight.shadow.mapSize.height = mapaSombra;

        const d = isTouchDevice ? 80 : 70;
        dirLight.shadow.camera.left = -d;
        dirLight.shadow.camera.right = d;
        dirLight.shadow.camera.top = d;
        dirLight.shadow.camera.bottom = -d;
        dirLight.shadow.camera.near = 10;
        dirLight.shadow.camera.far = 250;
        /*
        O `bias` afasta a sombra da superfície para o chão não se sombrear a si
        próprio (acne). Está ligado à resolução: com o dobro dos texels, o
        valor antigo passava a afastar de mais e descolava a sombra dos pés —
        o boneco parecia a pairar. `normalBias` trata do mesmo problema pela
        normal, que é o que funciona bem em caixas.
        */
        dirLight.shadow.bias = -0.0002;
        dirLight.shadow.normalBias = 0.02;

        // Guardada para o botão das sombras: desligar só o `shadowMap` do
        // renderer não chega (ver toggleSombras).
        window.dirLightCore = dirLight;
        if (typeof Qualidade !== 'undefined') Qualidade.aplicar();   // acerta o rotulo do botao das sombras com o nivel (config/qualidade.js)
        // Na tela de jogo do manager (embutido) os paineis arrancam MINIMIZADOS (pedido).
        if (/[?&]embutido/.test(location.search)) { try { toggleTodosPaineis(true); } catch (e) { /* sem paineis */ } }
        scene.add(dirLight);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
        // Guardadas para o interruptor dia/noite (ver definirPeriodo).
        window.ambientLightCore = ambientLight;
        scene.add(ambientLight);

        preencherSelectoresDeEquipa();
        ligarActualizacaoDoElenco();
        Match.init(scene);
        if (typeof Weather !== 'undefined') Weather.init(scene, cameraCore);
        // A cidade à volta do estádio (js/cidade.js). O nevoeiro do Weather esbate o fim dela.
        // ?oculto=1 (a partida dentro do iframe do manager, sem desenhar): a cidade nao se constroi.
        const _params = new URLSearchParams(location.search);
        if (typeof Cidade !== 'undefined' && CidadeConfig.ativa && !_params.has('oculto') && (!_params.has('embutido') || _params.has('cidade'))) Cidade.construir(scene);
        
        if (isTouchDevice) {
            Match.setSpeed(0.9);
        }
        
        if (typeof Minimap !== 'undefined') Minimap.init();
        if (typeof Officials !== 'undefined') Officials.init(scene);
        Tatics.updateSkills();
        // Os selectores a mostrar as equipas que estão MESMO em campo (ver
        // Match.equipasPorOmissao): sem isto diziam "genérica" com o Grêmio
        // e o Internacional a jogar.
        sincronizarSelectoresDeEquipa();
        if (typeof Crowd !== 'undefined' && Crowd.recolorir) { const cs = { A: Crowd.coresDaEquipa(Match.players, 'A'), B: Crowd.coresDaEquipa(Match.opponents, 'B') }; Crowd.recolorir(cs); if (typeof CidadeGente !== 'undefined' && CidadeGente.recolorirComTimes) CidadeGente.recolorirComTimes(cs); }
        if (typeof Crowd !== 'undefined' && Match.pintarBandeirasDeCanto) Match.pintarBandeirasDeCanto(Crowd.coresDaEquipa(Match.players));
        popularPainelJogadores();
        actualizarNomesNoPlacar();
        // A entrada pelo tunel (js/abertura.js): so no browser, uma vez, ao carregar a pagina.
        // ?embutido=1 (aberto pelo manager, js/narracao/ponte.js): sem tunel nem paineis; o jogo so arranca quando a ponte o mandar.
        if (_params.has('embutido')) {
            document.body.classList.add('embutido');
        } else if (typeof Abertura !== 'undefined') {
            Abertura.iniciar();
        }
        requestAnimationFrame(animate);
    } catch (err) {
        console.error("Erro crítico de inicialização:", err);
        const hud = document.getElementById('hud-state');
        if (hud) {
            hud.innerText = "Erro: " + err.message;
            hud.style.color = "#ff4757";
        }
    }
});

window.addEventListener('resize', () => {
    if (window.cameraCore && window.rendererCore) {
        window.cameraCore.aspect = window.innerWidth / window.innerHeight;
        window.cameraCore.updateProjectionMatrix();
        window.rendererCore.setSize(window.innerWidth, window.innerHeight);
    }
});
