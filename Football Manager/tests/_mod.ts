/*
CARREGA O MOD DOS DADOS REAIS ANTES DOS TESTES: varios testes conferem os clubes reais (Libertadores, Paulistao, Copa do Brasil...) pelos NOMES. A base do jogo e generica; os nomes reais estao em `public/dados_reais`.
Uso: npx tsx --import ./tests/_mod.ts --test tests/<ficheiro>.test.ts   (sem a pasta dados_reais nao faz nada)
*/
import fs from 'fs';
import path from 'path';
import { aplicarMod } from '../textSim/modDados';
const pasta = path.resolve(process.cwd(), 'public', 'dados_reais');
const ler = (n: string) => { try { return JSON.parse(fs.readFileSync(path.join(pasta, n), 'utf8')); } catch { return []; } };
if (fs.existsSync(path.join(pasta, 'mod.json'))) aplicarMod(ler('clubes.json'), ler('jogadores.json'), ler('competicoes.json'));
