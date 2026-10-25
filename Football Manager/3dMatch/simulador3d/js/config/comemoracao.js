/*
=============================================================================
COMEMORAÇÕES DE GOLO — o autor festeja, e os companheiros correm até ele
=============================================================================
Pedido, com sete fotografias de um jogo clássico: *"tem como usar esses keyframes de 1 a 7 para fazer uma das
comemorações de gol?"*. Os quadros 7-5 são a corrida, o 4 é o joelho a ir ao chão, o 3 e o 2 são o deslize de
joelhos com o tronco para trás, e o 1 é de joelhos com os braços no ar.

A corrida não precisa de clip: o jogador corre pela FSM normal (MOVE_TO_POS) até ao ponto de partida do
deslize. O clip é do que vem a seguir — o estado `COMEMORAR` da FSM (fsm.js), que escreve a pose a partir
destes quadros, e o `ComemoracaoGol` (js/comemoracao.js), que sorteia a comemoração, escolhe o sítio e manda os
companheiros.

Os ângulos são os do rig (ver `PedidoDeBola` e o `SlideTackleModel.pose`): coxa/tronco x negativo vai para a
frente; joelho x positivo dobra o calcanhar para trás; ombro z positivo abre o braço esquerdo para fora (e
negativo o direito); ombro x positivo leva o braço para trás. Foram tirados à vista das fotografias, como o
GoalKickClip — afinam-se aqui.
=============================================================================
*/
const ComemoracaoGol = {
    activo: true,
    // Probabilidade de o golo ter comemoração em corrida. Os restantes seguem como sempre (volta ao meio-campo).
    chance: 0.85,
    // As comemorações a sortear, com pesos. Para juntar outra: um novo `tipo` no ComemoracaoGol.sorteio.
    comemoracoes: [{ tipo: 'joelhos', peso: 0.6 }, { tipo: 'punho', peso: 0.4 }, { tipo: 'soco', peso: 0.4 }],
    // O estado do jogo não espera mais do que isto (s), aconteça o que acontecer.
    tempoMax: 12.0,

    // Quem corre até ao autor.
    apoio: {
        max: 3,             // companheiros de campo
        raioMax: 38.0,      // só os que estão a menos disto do ponto de chegada
        velocidade: 7.5,    // m/s, a correr
        chegada: 1.6,       // m: a esta distância do ponto, começam a festejar
        festa: 2.4,         // s a festejar depois de chegar
        espalhar: 2.0       // m de raio à volta do ponto onde o autor pára
    },

    joelhos: {
        // A corrida até ao ponto de partida: para o lado da linha lateral mais perto, um pouco para trás.
        corrida: { min: 5.0, max: 12.0, margemLinha: 5.0, recuoDaBaliza: 0.6, velocidade: 7.5, prazo: 6.0 },
        // O deslize em si.
        velocidadeDeslize: 8.5,   // m/s à entrada; cai ao longo do deslize
        tQueda: 0.60,             // quadro 4: vai-se abaixando a correr
        tDeslize: 1.9,            // quadros 3 e 2: desliza de joelhos
        tBracos: 0.90,            // quadro 1: os braços sobem
        tManter: 2.2,             // fica assim
        tLevantar: 0.8,           // e levanta-se
        limiteLateral: 31.0,      // |x| máximo onde pode parar (a linha lateral é 34)
        // As três poses (quadros 4, 3-2 e 1). `k` mistura-as; zero é a de pé.
        pose: {
            // 4: a descer a correr — corpo a baixar, pernas dobradas, tronco ainda em frente, braços soltos.
            queda: {
                pelvisX: 0.10, peitoX: 0.15, pescocoX: -0.05,
                coxaE: -0.75, joelhoE: 1.35, peE: 0.2,
                coxaD: -0.55, joelhoD: 1.55, peD: 0.3,
                bracoEx: 0.45, bracoEz: 0.20, cotoveloE: -0.30,
                bracoDx: 0.45, bracoDz: 0.20, cotoveloD: -0.30
            },
            // 3 e 2: SENTADO NOS CALCANHARES a deslizar (coxa à frente, canela deitada atrás, joelho muito
            // dobrado), tronco levemente para trás, braços ao lado do corpo.
            deslize: {
                pelvisX: 0.0, peitoX: -0.18, pescocoX: -0.08,
                coxaE: -0.90, joelhoE: 2.45, peE: 0.9,
                coxaD: -0.90, joelhoD: 2.45, peD: 0.9,
                bracoEx: 0.25, bracoEz: 0.30, cotoveloE: -0.15,
                bracoDx: 0.25, bracoDz: 0.30, cotoveloD: -0.15
            },
            // 4 da referencia (BRACOS ABERTOS): ainda a deslizar, tronco mais para tras e os dois bracos abertos na horizontal.
            bracosAbertos: {
                pelvisX: 0.0, peitoX: -0.32, pescocoX: -0.15,
                coxaE: -0.90, joelhoE: 2.45, peE: 0.9,
                coxaD: -0.90, joelhoD: 2.45, peD: 0.9,
                bracoEx: 0.05, bracoEz: 1.50, cotoveloE: -0.10,
                bracoDx: 0.05, bracoDz: 1.50, cotoveloD: -0.10
            },
            // 1: ainda sentado nos calcanhares, tronco levemente para trás, braços levantados para cima.
            bracosAcima: {
                pelvisX: 0.0, peitoX: -0.22, pescocoX: -0.20,
                coxaE: -0.90, joelhoE: 2.45, peE: 0.9,
                coxaD: -0.90, joelhoD: 2.45, peD: 0.9,
                bracoEx: -0.15, bracoEz: 2.85, cotoveloE: -0.05,
                bracoDx: -0.15, bracoDz: 2.85, cotoveloD: -0.05
            }
        }
    },

    /*
    COMEMORACAO 2 — PUNHO ERGUIDO (referencia: corrida, parada, punho erguido, olhar para a torcida, final). Corre como a dos joelhos, trava, ergue o braco direito
    com o punho fechado e fica a olhar para a torcida (a cabeca vira de um lado para o outro) antes de voltar.
    */
    punho: {
        corrida: { min: 4.0, max: 9.0, margemLinha: 5.0, recuoDaBaliza: 0.6, velocidade: 7.5, prazo: 6.0 },
        tParada: 0.45,    // trava a corrida
        tErguer: 0.55,    // o braco sobe
        tManter: 2.8,     // fica assim, a olhar para a torcida
        tBaixar: 0.7,
        olhar: { amplitude: 0.55, ritmo: 1.6 },   // rad e rad/s do pescoco (esquerda-direita)
        pose: {
            parada: {
                pelvisX: 0.0, peitoX: 0.08, pescocoX: 0.0,
                coxaE: -0.10, joelhoE: 0.25, peE: 0.0, coxaD: 0.10, joelhoD: 0.20, peD: 0.0,
                bracoEx: 0.30, bracoEz: 0.20, cotoveloE: -0.55,
                bracoDx: 0.30, bracoDz: 0.20, cotoveloD: -0.55
            },
            punho: {
                pelvisX: 0.0, peitoX: -0.14, pescocoX: -0.14,
                coxaE: -0.12, joelhoE: 0.12, peE: 0.0, coxaD: 0.12, joelhoD: 0.10, peD: 0.0,
                bracoEx: 0.05, bracoEz: 0.30, cotoveloE: -0.35,
                bracoDx: -0.20, bracoDz: 2.80, cotoveloD: -0.15
            }
        }
    },


    /*
    COMEMORACAO 3 — SOCO NO AR (referencia: tres fotogramas, o corpo no ar com o punho erguido, o segundo soco e o terceiro, a descer). O autor corre, PULA e dá o soco no ar em sequencia
    (soco1, soco2, soco3) sem parar de avancar; ao cair vira-se 180 graus, de frente para a direccao de onde vem a corrida, e espera os dois companheiros que correm atras dele para
    se abracarem. Poses (rig: ver o resto do ficheiro): soco1 = o braco direito sobe, o joelho direito sobe; soco2 = o direito fica no alto e o esquerdo vai a frente; soco3 = a descer,
    o braco esquerdo esticado a frente e o direito dobrado.
    */
    soco: {
        corrida: { min: 6.0, max: 12.0, margemLinha: 5.0, recuoDaBaliza: 0.6, velocidade: 7.5, prazo: 6.0 },
        tPulo: 0.95,              // o pulo inteiro (sobe e desce) e os tres socos, s
        alturaPulo: 0.42,         // m no pico
        tDesacelera: 1.25,        // a velocidade da corrida cai a zero em tanto tempo (a partir do pulo)
        distanciaParada: 4.2,     // m aproximados que ainda corre depois do pulo (onde os companheiros chegam)
        limiteLateral: 31.0,      // |x| maximo onde pode parar (a linha lateral e 34)
        tVirar: 0.50,             // a viragem de 180 graus
        tEspera: 2.4,             // espera os companheiros (e o abraco), de frente para eles
        tBaixar: 0.5,             // volta ao de pe
        apoioMax: 2,              // os companheiros que correm atras dele
        pose: {
            corrida: { pelvisX: 0.0, peitoX: 0.12, pescocoX: 0.0, coxaE: -0.55, joelhoE: 0.45, peE: 0.0, coxaD: 0.40, joelhoD: 0.70, peD: 0.0,
                bracoEx: 0.45, bracoEz: 0.20, cotoveloE: -0.60, bracoDx: -0.55, bracoDz: 0.20, cotoveloD: -0.70 },
            soco1: { pelvisX: 0.0, peitoX: -0.05, pescocoX: -0.12, coxaE: 0.30, joelhoE: 0.90, peE: 0.0, coxaD: -1.50, joelhoD: 1.40, peD: 0.0,
                bracoEx: -0.80, bracoEz: 0.30, cotoveloE: -1.30, bracoDx: -3.00, bracoDz: 0.25, cotoveloD: -0.10 },
            soco2: { pelvisX: 0.0, peitoX: 0.0, pescocoX: -0.10, coxaE: -0.90, joelhoE: 1.20, peE: 0.0, coxaD: -0.20, joelhoD: 0.60, peD: 0.0,
                bracoEx: -1.30, bracoEz: 0.20, cotoveloE: -0.30, bracoDx: -2.80, bracoDz: 0.20, cotoveloD: -0.10 },
            soco3: { pelvisX: 0.0, peitoX: 0.10, pescocoX: 0.0, coxaE: 0.20, joelhoE: 0.30, peE: 0.0, coxaD: -0.70, joelhoD: 1.00, peD: 0.0,
                bracoEx: -1.50, bracoEz: 0.25, cotoveloE: -0.10, bracoDx: -0.60, bracoDz: 0.30, cotoveloD: -1.50 },
            espera: { pelvisX: 0.0, peitoX: 0.0, pescocoX: 0.0, coxaE: 0.0, joelhoE: 0.05, peE: 0.0, coxaD: 0.0, joelhoD: 0.05, peD: 0.0,
                bracoEx: -0.10, bracoEz: 0.55, cotoveloE: -0.35, bracoDx: -0.10, bracoDz: 0.55, cotoveloD: -0.35 }
        }
    },

    // Quem corre até ao autor festeja com os braços no ar e saltinhos.
    abraco: {
        bracoZ: 2.55, bracoX: -0.15, cotovelo: -0.10,
        saltoAltura: 0.05, saltoRitmo: 7.0   // 0.05: antes 0.16, e ele aparecia no ar (20 cm acima do relvado); 0 = pes sempre no chao
    }
};
if (typeof window !== 'undefined') window.ComemoracaoGol = ComemoracaoGol;
