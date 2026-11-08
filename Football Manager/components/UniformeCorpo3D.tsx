import React, { useEffect, useState } from 'react';
import { getKitDetails, getGKKitDetails } from '../types';
import type { Team } from '../types';
import { uniformeDoKit } from '../3dMatch/simulador3dCliente';
import { pedirImagem3D, imagem3DEmCache } from './PlayerFace3D';
import { TeamKit } from './TeamKit';

interface Props {
  team: Team;
  /** 0, 1, 2 = uniformes de linha; omitido com `gk` = o de goleiro. */
  kitIndex?: 0 | 1 | 2;
  gk?: boolean;
  /** O adversario (so no goleiro): o uniforme de goleiro evita a cor dele. */
  oponente?: Team;
  number?: number;
  /** Giro em graus: 0 = de frente; 20 = de frente girado um pouco (como as fotos dos rostos); 180 = de costas. */
  graus?: number;
  className?: string;
}

/*
O UNIFORME NUM JOGADOR GENERICO, DE FRENTE (girado como as fotos dos rostos) — o corpo inteiro do modelo do jogo (cabecapreview.html, tipo 'corpo') vestindo o uniforme do clube, com o numero nas costas. O jogador e o mesmo
para todos (o que importa e o uniforme). Enquanto a imagem nao chega, aparece o icone plano de sempre (TeamKit).
*/
export const UniformeCorpo3D: React.FC<Props> = ({ team, kitIndex = 0, gk = false, oponente, number = 9, graus = 20, className = '' }) => {
  const kit = gk ? getGKKitDetails(team, 0, 0, oponente) : getKitDetails(team, kitIndex);
  const chave = `corpo|${team.id}|${gk ? 'gk' + (oponente ? oponente.id : '') : kitIndex}|${kit.c1}${kit.c2 || ''}${kit.c3 || ''}|${number}|${graus}`;
  const [url, setUrl] = useState<string>(imagem3DEmCache(chave));
  useEffect(() => {
    setUrl(imagem3DEmCache(chave));
    return pedirImagem3D(chave, { tipo: 'corpo', camisa: kit.c1, uniforme: uniformeDoKit(kit, !gk), numero: number, graus }, setUrl);
  }, [chave]);
  if (!url) return <TeamKit team={team} kitIndex={gk ? undefined : kitIndex} gk={gk} className={className} number={number} />;
  return <img src={url} alt="" className={className} style={{ objectFit: 'contain' }} />;
};

export default UniformeCorpo3D;
