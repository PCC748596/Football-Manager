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

    // Os cones (pela imagem de referencia). `foraDaLinha`: quantos metros fora da linha ficam.
    foraDaLinha: 1.5,
    zLateralOposta: [-44, -22, 0, 22, 44],          // a lateral SEM bancos: 5 cones
    zLateralBancos: [-46, -32, -5, 5, 31, 45],       // a lateral dos bancos (TunelJogadores.lado): 6, aos pares entre os bancos
    xAtrasDaBaliza: [-10, 10],                       // 2 atras de cada baliza

    // A bola que sai: segue a fisica e some quando bate na barreira/placa, quando para la fora, ou passados `tetoSaida` s.
    tetoSaida: 3.0,
    vParada: 0.5,                                    // m/s abaixo da qual a bola conta como parada

    // O andar do cobrador: trote; quem esta a perder corre, quem esta a ganhar anda (m/s).
    velTrote: 4.0,
    velCorrida: 6.0,
    velAndar: 2.0,

    // Abaixar e pegar na bola (s).
    tempoPegar: 0.6,
    // Altura e avanco da bola nas maos enquanto a leva (m, a frente do peito).
    alturaNasMaos: 1.15,
    avancoNasMaos: 0.35,

    // O desenho do cone.
    cone: { altura: 0.32, raio: 0.14, cor: 0xff7a1a }
};

if (typeof window !== 'undefined') window.MultiBolaModel = MultiBolaModel;
