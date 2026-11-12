/*
NOMES CARACTERISTICOS DO MEXICO, DOS EUA E DO JAPAO, para os jogadores GERADOS (tools/gerar_ligas_mex_usa_jpn.cjs copia-os para textSim/nomesPaises.ts). Listas de nomes e sobrenomes COMUNS
(nada de jogadores reais por inteiro); o jogo combina nome + sobrenome. Combinacoes casuais podem coincidir com pessoas reais. "_" = espaco dentro de um nome.
*/
const L = (s) => s.trim().split(/\s+/).map(x => x.replace(/_/g, ' '));

const NOMES = {
  MEX: {
    nomes: L(`José Luis Juan Carlos Jesús Miguel Alejandro Francisco Jorge Fernando Ricardo Eduardo Roberto Daniel Javier Sergio Raúl Manuel Héctor Óscar Arturo Alberto
      Rodrigo Diego Andrés Iván Érick Édgar Omar Hugo Rubén Emilio Santiago Sebastián Mateo Leonardo Gerardo Alan Uriel Brayan Kevin Jonathan Ulises Israel Gilberto Ramiro
      Efraín Armando Marco Julián Adrián Gustavo Saúl Rogelio Abraham Isaac Ángel Víctor Pablo Emiliano Joaquín Tadeo Axel Jair Gael`),
    sobrenomes: L(`Hernández García Martínez López González Rodríguez Pérez Sánchez Ramírez Cruz Flores Gómez Morales Vázquez Reyes Jiménez Torres Díaz Gutiérrez Ruiz
      Mendoza Aguilar Ortiz Moreno Castillo Romero Álvarez Méndez Chávez Rivera Juárez Ramos Domínguez Herrera Medina Castro Vargas Guzmán Velázquez Muñoz Rojas Salazar
      Contreras Luna Ortega Guerrero Estrada Cervantes Delgado Cortés Navarro Ríos Montes Orozco Ávila Zavala Peña Lara Ibarra Campos Fuentes Valdez Escobar Robles Mejía
      Cabrera Tapia Quintero Bautista Rangel Arellano Villarreal Esparza Cisneros Trejo`)
  },
  USA: {
    nomes: L(`James John Michael David Chris Matthew Daniel Andrew Joshua Ryan Tyler Brandon Kyle Justin Jacob Nathan Ethan Logan Mason Caleb Dylan Austin Cole
      Jordan Connor Aidan Owen Liam Noah Jackson Carter Hunter Gavin Brody Chase Blake Trevor Garrett Spencer Wyatt Bryce Jake Sean Kevin Marcus Malik Jalen Darius Isaiah
      Elijah Xavier Miles Cameron Derek Zach Shane Evan Luke Henry Sam Max Ben Alex Diego Luis Carlos Mateo Adrian Gabriel`),
    sobrenomes: L(`Smith Johnson Williams Brown Jones Miller Davis Wilson Anderson Taylor Thomas Moore Jackson Martin Thompson White Harris Clark Lewis Robinson Walker
      Young Allen King Wright Scott Hill Green Adams Baker Nelson Carter Mitchell Roberts Turner Phillips Campbell Parker Evans Edwards Collins Stewart Morris Murphy Cook
      Rogers Morgan Cooper Peterson Reed Bailey Bell Kelly Howard Ward Cox Richardson Wood Watson Brooks Bennett Gray Hughes Price Sanders Myers Long Ross Foster Hayes
      Bryant Russell Griffin Ramirez Garcia Martinez Lopez Gonzalez Perez Rivera Torres Flores`)
  },
  JPN: {
    nomes: L(`Haruto Yuto Sota Yuki Hayato Haruki Ryusei Koki Sora Sosuke Riku Kaito Yamato Takumi Ren Daiki Kenta Shota Yusuke Ryota Kazuki Tsubasa Naoki Takuya
      Kenji Hiroshi Takashi Daisuke Shun Keita Kohei Yuya Ryo Shinji Masaki Kosuke Taiga Hinata Minato Itsuki Asahi Yusei Rintaro Kota Genki Hikaru Kyosuke Ryoma Shuto
      Taisei Yuma Kazuya Tomoya Hiroki Akira Makoto Satoshi Wataru Jun Kei Sho Tatsuya Teruki Yoshiki Kaoru`),
    sobrenomes: L(`Sato Suzuki Takahashi Tanaka Watanabe Ito Yamamoto Nakamura Kobayashi Kato Yoshida Yamada Sasaki Yamaguchi Matsumoto Inoue Kimura Hayashi Shimizu
      Yamazaki Mori Abe Ikeda Hashimoto Yamashita Ishikawa Nakajima Maeda Fujita Ogawa Goto Okada Hasegawa Murakami Kondo Ishii Saito Sakamoto Endo Aoki Fujii Nishimura
      Fukuda Ota Miura Fujiwara Okamoto Matsuda Nakagawa Nakano Harada Ono Tamura Takeuchi Kaneko Wada Nakayama Ishida Ueda Morita Hara Shibata Sakai Kudo Yokoyama
      Miyazaki Miyamoto Uchida Takagi Ando Taniguchi Ohno Maruyama Imai Kono Fujimoto Murata Takeda Ueno Sugiyama Masuda Hirano Otsuka Chiba Kubo Matsui`)
  }
};

module.exports = { NOMES };
