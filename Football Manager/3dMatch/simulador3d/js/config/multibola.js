/*
=============================================================================
MULTIBOLA — bolas de reserva em cones a volta do campo
=============================================================================
Spec: docs/superpowers/specs/2026-11-12-multibola-design.md. Pedido, com imagem: *"uns cones com as bolas serao colocados ao redor do campo nas posicoes da
imagem"*. Quando a bola sai, quem cobra vai buscar uma bola (a do cone mais proximo do ponto por onde ela saiu, ou a propria bola se ela voltou ao campo),
abaixa-se, pega nela, leva-a ao ponto e cobra. Ver js/multibola.js.

Eixos: x e a LARGURA (laterais em x = +-CAMPO_LARG/2), z o COMPRIMENTO (linhas de fundo em z = +-CAMPO_COMP/2).
=============================================================================
*/
const MultiBolaModel = {
    activo: true,

    /*
    Os cones (pela imagem de referencia). `foraDaLinha`: quantos metros fora da linha ficam — `frenteDasPlacas` (0.70 m: 30 cm e depois mais 40, pedidos) a frente da face das placas de
    publicidade (PlacasPublicidade.recuo menos meia espessura). Sem placas: `foraDaLinhaSemPlacas`.
    */
    frenteDasPlacas: 0.70,
    foraDaLinhaSemPlacas: 1.5,
    get foraDaLinha() {
        const P = (typeof PlacasPublicidade !== 'undefined') ? PlacasPublicidade : null;
        if (!P || !P.activo || typeof P.recuo !== 'number') return this.foraDaLinhaSemPlacas;
        return P.recuo - (P.espessura || 0) / 2 - this.frenteDasPlacas;
    },
    zLateralOposta: [-44, -22, 0, 22, 44],          // a lateral SEM bancos: 5 cones
    zLateralBancos: [-46, -32, -5, 5, 31, 45],       // a lateral dos bancos (TunelJogadores.lado): 6, aos pares entre os bancos
    xAtrasDaBaliza: [-10, 10],                       // 2 atras de cada baliza

    // A bola que sai (pedido): segue a fisica; se em `tetoSaida` s voltar ao campo (ex.: bateu na placa e voltou), e ela que se usa; senao, ou se parar la fora, some.
    tetoSaida: 5.0,
    vParada: 0.5,                                    // m/s abaixo da qual a bola conta como parada

    // O andar do cobrador (m/s): empatado ou a ganhar, trote; a perder, corre. `velAndar` e o passo de recuar no canto.
    velTrote: 4.0,
    velCorrida: 6.0,
    velAndar: 2.0,

    // Abaixar e pegar na bola (s), com a pose do goleiro a apanhar (GoalkeeperPose.apanhar): desce, fica com as maos nela e sobe com ela.
    pegar: { descer: 0.45, segurar: 0.25, subir: 0.45 },
    // CANTO: depois de pousar a bola, recua `recuoCanto` m (de frente para ela, como no penalti), fica `esperaAntesDeBater` s e vem bater a `velAproximacaoCanto` m/s.
    recuoCanto: 3.2,
    esperaAntesDeBater: 0.6,
    velAproximacaoCanto: 2.4,
    // Altura e avanco da bola nas maos enquanto a leva (m, a frente do peito).
    alturaNasMaos: 1.15,
    avancoNasMaos: 0.35,
    // Com as maos na pose de segurar, a bola vai no meio delas e `frenteDasMaos` m a frente (encostada as palmas).
    frenteDasMaos: 0.06,

    // O desenho do cone.
    // O cone inteiro (altura e raio da base) 15% maior do que era (0.32 x 0.14), e CORTADO NA METADE (pedido): desenha-se so a metade de baixo, com a bola
    // pousada no aro de cima (raio = metade do da base).
    cone: { altura: 0.368, raio: 0.161, corte: 0.5, cor: 0xff7a1a }
};

if (typeof window !== 'undefined') window.MultiBolaModel = MultiBolaModel;
