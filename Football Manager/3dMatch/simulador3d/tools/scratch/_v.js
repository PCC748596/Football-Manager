// velocidade de saida para a bola rasteira chegar a `dist` com ~6.5 m/s (PassModel.vChegadaRasteira): resolve com a funcao do jogo.
module.exports = (dist) => (typeof velocidadeRasteiraPara === 'function') ? velocidadeRasteiraPara(dist, 6.5) : 14;
