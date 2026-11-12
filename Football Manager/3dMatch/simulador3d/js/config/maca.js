/*
=============================================================================
A MACA — os 4 maqueiros e o medico do time (js/maca.js)
=============================================================================
Pedido: *"vamos colocar 4 funcionarios com uma maca em algum lugar em volta do campo. Se houver um jogador lesionado que tenha que sair, os
funcionarios entram com a maca, o jogador deita e eles carregam o jogador ate o tunel. O medico do time vai acompanhando os maqueiros."*

ONDE ESPERAM: atras das placas de publicidade do lado do tunel, entre a boca do tunel (z = 0) e o banco de reservas (z = +-12), de pe ao lado da
maca pousada no chao. As medidas de x estao em modulo: o sinal e o do lado do tunel (TunelJogadores.lado).

QUANDO ENTRAM: numa PARADA do jogo (falta, lateral, tiro de meta, canto) em que haja uma troca pendente de um lesionado que tem de sair
(MatchInjuries: estado Forced/Requested; ou o teste manual `Maca.levar`). Nao ha no motor uma paragem do arbitro por lesao: a troca forcada ja
era feita na proxima parada, e a maca entra nessa mesma parada. Enquanto o lesionado esta em campo a cobranca espera (Match._seguraCobranca);
quando a maca sai do campo o substituto entra e o jogo recomeca; a maca segue para o tunel e os maqueiros voltam ao posto.
A MACA SAI PELA LATERAL MAIS PROXIMA: na metade do campo oposta ao tunel sai pela lateral de la e da a volta por fora do campo, atras da baliza mais proxima; do lado do tunel sai a direito para a
lateral e segue pela faixa ate ao tunel (atravessar o campo na diagonal segurava o jogo 30 s ou mais).
=============================================================================
*/
const MacaModel = {
    activa: true,
    // O posto (m): o centro da maca pousada. x em modulo (atras das placas, a 39); z do lado +Z, entre o corredor do tunel (|z| < 4) e o vidro do banco (z > 6.8).
    posto: { x: 41.2, z: 5.3 },
    // Os maqueiros parados no posto, no referencial da maca (a = ao longo da maca, para o campo; l = de lado).
    parados: [{ a: 0.6, l: 0.78 }, { a: -0.6, l: 0.78 }, { a: 0.6, l: -0.78 }, { a: -0.6, l: -0.78 }],
    // As pegas: 2 de cada lado, nas pontas dos varais (a > 0 = a frente da maca).
    pegas: [{ a: 1.30, l: 0.45 }, { a: 1.30, l: -0.45 }, { a: -1.30, l: 0.45 }, { a: -1.30, l: -0.45 }],
    // Velocidades (m/s): a ir ter com o lesionado (trote, com a maca vazia), a levar (passo rapido) e a voltar ao posto.
    velIr: 5.0,
    velLevar: 2.8,
    velVoltar: 2.0,
    velMedico: 5.0,
    velRotacao: 1.8,            // rad/s: a maca vira nas esquinas do caminho (os maqueiros contornam)
    // Tempos (s).
    tPegar: 0.6,                // agachar (e o mesmo a erguer) a maca
    tPousar: 0.6,
    tSentar: 0.9,               // o lesionado senta-se no relvado enquanto a maca nao chega
    tDeitar: 1.5,               // passa para a maca e deita-se
    esperaMax: 80,              // seguranca: passado isto a troca faz-se mesmo com o lesionado ainda em campo (o jogo nunca fica preso)
    // O lesionado deita-se de costas com a bacia em `zBacia` (ao longo da maca: os pes para a frente); sentado no relvado fica a `ladoDoDoente` m do eixo da maca.
    zBacia: -0.05,
    ladoDoDoente: 0.85,
    // |z| maximo do caminho dentro do tunel (a boca tem 5 m e a maca com os maqueiros ~1.4 m de largura).
    zTunel: 1.0,
    // A maca sai pela lateral mais proxima e anda por fora do campo ate ao tunel: as faixas (m para la das linhas; as placas estao a 5 m). Chegada a faixa,
    // conta como FORA DO CAMPO (a troca faz-se e o jogo recomeca).
    faixaLonge: 2.3, faixaPerto: 1.9, faixaFundo: 3.3,
    // O medico: ao lado da maca (l, a no referencial dela) a acompanhar; no atendimento, a `ladoMedico` m do lesionado, do outro lado.
    medico: { a: 0.1, l: 1.15 },
    ladoMedico: 0.8,
    // Sem o banco (Bancos), o medico de cada time espera aqui (x em modulo).
    medicoSemBanco: { x: 40.6, z: -5.3, passo: 1.2 },
    // A maca (m).
    maca: {
        comprimento: 2.5, distVarais: 0.60, raioVaral: 0.022,
        lona: { largura: 0.56, comprimento: 1.9, espessura: 0.02 },
        pernas: 0.14,
        cores: { varal: 0xb8bec6, lona: 0xf08c00, pernas: 0x2b2f36 }
    },
    // A roupa dos maqueiros: camisa vermelha, calca escura.
    cores: { camisa: '#c92a2a', calca: '#2b2f36' },
    // Poses (angulos do rig, como em Bancos._sentar: anca < 0 = perna para a frente, joelho > 0 dobra).
    poses: {
        sentado: { anca: -2.1, joelho: 1.3, tronco: 0.25 },     // sentado no relvado, joelhos para cima
        deitado: { anca: -0.08, joelho: 0.18 },                  // de costas na maca
        agachado: { anca: -1.1, joelho: 1.8, tronco: 0.5, braco: -0.35 }
    }
};
if (typeof window !== 'undefined') window.MacaModel = MacaModel;
