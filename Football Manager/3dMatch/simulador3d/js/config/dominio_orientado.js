/*
=============================================================================
DOMINIO ORIENTADO — o primeiro toque para o espaco (js/dominio_orientado.js)
=============================================================================
Pedido: *"O dominio orientado nao e um passe, e um toque pra ele proprio"* — quem recebe le o lance antes de a bola chegar e toca-a para o espaco onde vai
correr, apanhando o marcador desprevenido. Era um toque fixo (4.2 + TEC x 0.025 m/s) na direccao para onde ele ja ia.

  leitura       a chance de ler o lance a tempo: `base` + `porAtributo` x (consciencia tactica + reaccoes, 50 -> 0, 99 -> 1); quem nao le domina como antes
  direccoes     quantas direccoes se avaliam a volta da frente de ataque (de -`abertura` a +`abertura` graus) e o alcance da avaliacao do espaco
  pesos         a nota de cada direccao: espaco livre, progresso para a baliza, fugir do marcador, nao ir para tras
  toque         com espaco (adversario mais perto do ponto a mais de `espacoLongo` m): toque LONGO, `longoMin`-`longoMax` m pela aceleracao dele;
                apertado: CURTO e protegido, `curto` m
  erro          a qualidade (drible + controlo de bola): desvio da direccao ate `anguloMax` rad e da distancia ate `distMax` (fraccao) para o pior
  enganar       se o toque vai para o lado contrario ao do marcador (cos < `cosLadoOposto`), ele fica `base` s sem lhe poder tocar e travado,
                mais com o drible de quem recebe acima das reaccoes dele (`porDiferenca` s por cada 10 pontos)
  chemistry     com uma corrida avisada pelo proprio (Chemistry Intelligence), o toque segue essa corrida
=============================================================================
*/
const DominioOrientadoModel = {
    activo: true,
    leitura: { base: 0.30, porAtributo: 0.55, max: 0.92 },
    direccoes: { n: 9, abertura: 120, raioEspaco: 6.0 },
    pesos: { espaco: 1.0, progresso: 0.6, fugirMarcador: 0.8, paraTras: 1.2 },
    toque: { espacoLongo: 4.0, longoMin: 2.5, longoMax: 5.5, curto: 1.2, vChegada: 1.5 },
    erro: { anguloMax: 0.35, distMax: 0.35 },
    enganar: { cosLadoOposto: -0.2, raioMarcador: 4.0, base: 0.30, porDiferenca: 0.06, max: 0.6, travagem: 0.4 },
    chemistry: true
};
if (typeof window !== 'undefined') window.DominioOrientadoModel = DominioOrientadoModel;
