// Uma vez: grava <mod>/regras.json com os dados que traziam nomes reais (treinadores, grupos das copas, classificacao do ano anterior).
import fs from 'fs';
import path from 'path';
import { TREINADORES } from '../textSim/treinadores';
import { GRUPOS_REAIS_LIB, GRUPOS_REAIS_SUL, CLASSIFICACAO_INICIAL } from '../textSim/competitions';
import { REAL_COUNTRIES_JSON } from '../textSim/realDatabase';
const ant: Record<string, string[]> = {};
for (const p of REAL_COUNTRIES_JSON as any[]) Object.assign(ant, p.classificacaoAnterior || {});
const pasta = path.resolve(process.env.FM_MOD_DIR || 'C:\Footmanager3D\mod');
fs.writeFileSync(path.join(pasta, 'regras.json'), JSON.stringify({ treinadores: TREINADORES, gruposLib: GRUPOS_REAIS_LIB, gruposSul: GRUPOS_REAIS_SUL, classificacaoInicial: CLASSIFICACAO_INICIAL, classificacaoAnterior: ant }, null, 1));
console.log('ok', Object.keys(TREINADORES).length, Object.keys(ant));
