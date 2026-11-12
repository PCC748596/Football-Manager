/*
=============================================================================
COMEMORACAO DE CAMPEAO — os numeros (o controlador e js/comemoracao_campeao.js)
=============================================================================
Pedido: *"Crie a comemoracao de campeao. Todos os jogadores juntos no centro do campo, pulando e levantando a
taca."*

Depois do apito final do jogo que da o titulo (Match.campeao, mandado pelo manager no `iniciar`; ou o teste
`Comemoracao.campeao('TeamA')`), os vencedores correm para o circulo central e juntam-se num grupo apertado,
virados para as cameras (+X); o capitao recebe a taca, ergue-a e passa-a a um companheiro (`guiao.portadores`), que tambem a
erguem; no fim o capitao ergue-a outra vez com todos a pular. Os derrotados vao a passo para o lado do tunel e
ficam desolados; o trio afasta-se. Depois segue a saida de campo normal do fim do jogo (Abertura.saidaIntervalo).

Os angulos das poses sao os do rig, no formato do `_escreverPoseComemorar` (fsm.js, o mesmo da comemoracao de
golo, config/comemoracao.js): coxa/tronco x negativo vai para a frente; joelho x positivo dobra; ombro x negativo
levanta o braco a frente/acima; ombro z positivo abre o braco para fora (o esquerdo; o direito e espelhado).
=============================================================================
*/
const ComemoracaoTitulo = {
    activo: true,
    // Segundos de jogo entre o apito final e o arranque (o juiz apita e aponta o centro, RefereeModel.duracaoSinal).
    atrasoApito: 2.8,
    // Tecto de seguranca de toda a sequencia (s): passado isto acaba, aconteca o que acontecer.
    tempoMax: 40.0,

    // A REUNIAO no circulo central.
    reuniao: {
        prazo: 6.0,                 // s: a festa comeca mesmo que alguem ainda nao tenha chegado (junta-se ao chegar)
        velocidade: [6.4, 7.8],     // m/s (cada um sorteia), a correr de alegria
        atrasoMax: 0.6,             // s: cada um arranca com um pequeno atraso sorteado
        // O grupo: o capitao no centro, virado para as cameras (+X); os outros em dois arcos atras e aos lados (a frente
        // fica livre para a camara ver a taca). Angulos em graus medidos a partir da frente (+X).
        arco1: { raio: 1.15, max: 7, de: 70, ate: 290 },
        arco2: { raio: 2.10, de: 52, ate: 308 },
        arco3: { raio: 3.10, de: 40, ate: 320 },   // os reservas que vieram do banco (ComemoracaoCampeao.tickReservas)
        jitter: 0.15,               // m de desvio sorteado em cada lugar
        olharFrente: 7.0            // m: todos olham para um ponto a esta distancia a frente do capitao
    },

    // A TACA (procedimental): medidas em metros.
    taca: {
        altura: 0.62,               // da base ao bordo
        raioBojo: 0.15,
        cor: 0xe8b830, metalness: 0.75, roughness: 0.28, emissivo: 0x3a2600,
        corBase: 0x2a1f12,          // o pedestal escuro (madeira/pedra)
        // Onde as maos a agarram, medido desde a base (o pe da taca, por baixo do bojo).
        pega: 0.16,
        tEntrega: 0.6               // s: a taca aparece (escala de 0 a 1) nas maos do capitao
    },

    // O GUIAO DA TACA, depois de todos juntos: erguer, segurar la em cima, baixar, passar ao seguinte.
    guiao: {
        inicio: 0.8,                // s depois da reuniao ate ao primeiro erguer (a taca ja na mao)
        tErguer: 0.7,
        tManter: 2.6,
        tBaixar: 0.6,
        tPasse: 0.8,
        pausa: 0.25,
        portadores: 2,              // o capitao e mais N-1 companheiros; o capitao ergue-a outra vez no fim (ultimo erguer)
        fimDepois: 0.6              // s depois do ultimo baixar ate a festa acabar
    },

    // OS SALTOS: cada um com o seu ritmo, altura e fase; com a taca no ar todos saltam juntos.
    salto: {
        // No chao (agachar / aterrar) o pe compensa a canela para a sola ficar plana: pe = -(coxa + joelho) x isto (1 = plana). Ver passoDoJogador.
        compensaPe: 1.0,
        periodo: [0.68, 0.95],      // s por ciclo (sorteado)
        altura: [0.22, 0.42],       // m
        fracaoNoAr: 0.55,           // parte do ciclo no ar; o resto e o agachar para o proximo salto
        pausaChance: 0.18,          // em cada ciclo, probabilidade de parar um ciclo (para nao parecerem maquinas)
        periodoJuntos: 0.78,        // s: com a taca no ar o ritmo e o mesmo para todos
        alturaPortador: 0.06        // m: quem segura a taca la em cima so balanca
    },

    pose: {
        dePe: { pelvisX: 0, peitoX: 0, pescocoX: 0, coxaE: 0, joelhoE: 0, peE: 0, coxaD: 0, joelhoD: 0, peD: 0,
            bracoEx: 0, bracoEz: 0.1, cotoveloE: -0.1, bracoDx: 0, bracoDz: 0.1, cotoveloD: -0.1 },
        // Fase de agachar antes do salto.
        agachar: { pelvisX: 0.12, peitoX: 0.22, pescocoX: -0.10, coxaE: -0.55, joelhoE: 1.05, peE: 0.45, coxaD: -0.55, joelhoD: 1.05, peD: 0.45,
            bracoEx: -2.4, bracoEz: 0.45, cotoveloE: -0.35, bracoDx: -2.4, bracoDz: 0.45, cotoveloD: -0.35 },
        // No ar: pernas um pouco encolhidas, bracos bem no alto.
        ar: { pelvisX: 0, peitoX: -0.08, pescocoX: -0.25, coxaE: -0.35, joelhoE: 0.65, peE: 0.35, coxaD: -0.25, joelhoD: 0.55, peD: 0.30,
            bracoEx: -2.85, bracoEz: 0.40, cotoveloE: -0.15, bracoDx: -2.85, bracoDz: 0.40, cotoveloD: -0.15 },
        // A taca segura a frente do peito (antes de erguer, a passar).
        segurar: { pelvisX: 0, peitoX: -0.04, pescocoX: 0.10, coxaE: 0, joelhoE: 0.05, peE: 0, coxaD: 0, joelhoD: 0.05, peD: 0,
            bracoEx: -0.75, bracoEz: -0.18, cotoveloE: -1.15, bracoDx: -0.75, bracoDz: -0.18, cotoveloD: -1.15 },
        // A taca la em cima: bracos esticados acima da cabeca, maos juntas, tronco um pouco para tras, a olhar para ela.
        erguer: { pelvisX: 0, peitoX: -0.14, pescocoX: -0.45, coxaE: 0, joelhoE: 0.08, peE: 0, coxaD: 0, joelhoD: 0.08, peD: 0,
            bracoEx: -3.02, bracoEz: -0.16, cotoveloE: -0.22, bracoDx: -3.02, bracoDz: -0.16, cotoveloD: -0.22 },
        // OS DERROTADOS: maos na cintura e cabeca baixa, ou agachados com as maos nos joelhos (a terceira variante e a das
        // maos na cabeca, o `lamento` do quase golo — QuaseGoloModel).
        cintura: { pelvisX: 0.04, peitoX: 0.18, pescocoX: 0.45, coxaE: 0, joelhoE: 0.06, peE: 0, coxaD: 0, joelhoD: 0.06, peD: 0,
            bracoEx: 0.50, bracoEz: 0.50, cotoveloE: -1.35, bracoDx: 0.50, bracoDz: 0.50, cotoveloD: -1.35 },
        joelhos: { pelvisX: 0.10, peitoX: 0.65, pescocoX: 0.30, coxaE: -0.55, joelhoE: 0.80, peE: 0.25, coxaD: -0.55, joelhoD: 0.80, peD: 0.25,
            bracoEx: -0.75, bracoEz: 0.12, cotoveloE: -0.10, bracoDx: -0.75, bracoDz: 0.12, cotoveloD: -0.10 },
        // De pe a olhar a festa (vira-se para o grupo): bracos caidos, cabeca um pouco baixa.
        olhar: { pelvisX: 0, peitoX: 0.06, pescocoX: 0.12, coxaE: 0, joelhoE: 0.04, peE: 0, coxaD: 0, joelhoD: 0.04, peD: 0,
            bracoEx: 0.05, bracoEz: 0.08, cotoveloE: -0.15, bracoDx: 0.05, bracoDz: 0.08, cotoveloD: -0.15 },
        // Sentado no relvado: coxas a frente, joelhos para cima (o pe compensa a canela para a sola assentar), tronco para tras apoiado nas maos atras.
        sentadoRelva: { pelvisX: -0.25, peitoX: -0.10, pescocoX: 0.30, coxaE: -1.35, joelhoE: 1.25, peE: 0.10, coxaD: -1.20, joelhoD: 1.05, peD: 0.15,
            bracoEx: 0.75, bracoEz: 0.25, cotoveloE: -0.05, bracoDx: 0.75, bracoDz: 0.25, cotoveloD: -0.05 }
    },

    // OS DERROTADOS vao a passo para o lado do tunel (-X), sem atravessar o grupo, e ficam ali.
    derrotados: {
        velocidade: [1.8, 2.4],   // 1.2-1.7 -> 1.8-2.4: a passo largo, para estarem ja a olhar / sentados durante a festa (a 1.5 m/s metade ainda andava aos 13 s)
        // As variantes, sorteadas pelos derrotados: de pe a OLHAR a festa, SENTADOS no relvado, e poucas das maos na cabeca / na cintura.
        variantes: ['olhar', 'sentado', 'olhar', 'sentado', 'cabeca', 'olhar', 'sentado', 'cintura', 'olhar', 'sentado', 'olhar'],
        andarMax: 12,               // m: no maximo isto na direccao do sitio (para ja estarem parados durante a festa)
        longeDoGrupo: 8,            // m: e nunca mais perto do centro (do grupo) do que isto
        xMin: 12, xMax: 27,         // |x| do sitio onde param (do lado do tunel)
        zMin: 9, zMax: 30           // |z| (do lado do campo onde ja estavam)
    },

    // O TECNICO do campeao entra no grupo da festa (e na volta olimpica).
    tecnico: { velocidade: [3.2, 3.8] },

    /*
    A VOLTA OLIMPICA (ComemoracaoCampeao._comecarVolta): no fim da festa, com as estatisticas no ecra. Por dentro das linhas (`dentro` m), a `velocidade` m/s, cada um
    com um desvio ate `espalhar` m e um atraso ate `atrasoMax` s; o capitao ergue a taca a cada `ergueCada` s; confetis a cada `confetisCada` s. `tempoMax`: prazo.
    */
    volta: { activo: true, dentro: 3.0, velocidade: [3.4, 3.9], espalhar: 1.8, atrasoMax: 1.2, ergueCada: 3.5, confetisCada: 9.0, tempoMax: 140 },

    // OS RESERVAS do campeao (ComemoracaoCampeao.tickReservas): a partir de `aosMinutos` do 2.o tempo levantam-se e vao para a beira do campo em frente ao banco
    // (`foraDaLinha` m fora da linha lateral, `espaco` m entre eles), a `velocidade` m/s; voltam a `velocidadeVolta`.
    reservas: { activo: true, aosMinutos: 85, foraDaLinha: 1.6, espaco: 1.3, velocidade: 2.2, velocidadeVolta: 2.4 },

    // O TRIO afasta-se para a lateral do tunel, perto do meio-campo, de frente para o grupo; o juiz leva a bola na mao.
    oficiais: { x: 31.0, zArbitro: 9.0, zAssistentes: [11.5, 6.5], velocidade: 2.6 },

    // A CAMARA propria (ver ComemoracaoCampeao.camera): de longe e alta enquanto se juntam; depois perto, a frente do
    // grupo (+X), a rodar devagar de um lado para o outro; a taca no centro da imagem.
    camera: {
        reuniao: { raio: 24, altura: 11 },
        // A volta olimpica: alta e afastada (`altura` m), `recuo` m do centro para o lado oposto ao grupo, a seguir o grupo `segue` (0..1).
        volta: { altura: 46, recuo: 28, segue: 0.25, suave: 0.04 },
        festa: { raio: 9.5, altura: 2.9, raioOscila: 1.6, abertura: 0.75, ritmo: 0.16 },   // abertura (rad): meio angulo da oscilacao a volta de +X
        alvoAltura: 1.7,
        fim: { raio: 26, altura: 13, tempo: 3.0 }   // os ultimos `tempo` s: afasta-se e sobe
    },

    // Confetis nas cores do campeao (e dourados) a cada erguer da taca.
    confetis: { activo: true, quantidade: 700, area: 9.0, alturaMin: 9, alturaMax: 16, queda: [1.2, 2.4], tamanho: 0.16 }
};
if (typeof window !== 'undefined') window.ComemoracaoTitulo = ComemoracaoTitulo;
