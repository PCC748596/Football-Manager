/*
OS TREINADORES DOS CLUBES e o seu CONHECIMENTO TATICO (0-100).

Lista dada pelo utilizador (clube - treinador - conhecimento). Os nomes dos clubes sao os da base (`teamName`). Os clubes que nao estao aqui (Serie D, ligas de fora...) recebem um treinador sorteado
da lista de nomes e um conhecimento sorteado pelo PERFIL, na tabela abaixo (`PERFIS`), por uma semente do proprio clube (o mesmo clube da sempre o mesmo treinador).

O conhecimento tatico serve a CPU: quanto maior, mais cedo o treinador le o jogo e muda a equipa (ver `decideTeamIntent`, textSim/teamAI.ts: o minuto efetivo do jogo e deslocado).
*/

export interface Treinador { nome: string; tatico: number; }

export const TREINADORES: Record<string, Treinador> = {
  // Serie A
  'Atlético-PR': { nome: 'Odair Hellmann', tatico: 80 }, 'Atlético-MG': { nome: 'Eduardo Domínguez', tatico: 86 }, 'Bahia-BA': { nome: 'Rogério Ceni', tatico: 88 },
  'Botafogo-RJ': { nome: 'Rodrigo Bellão', tatico: 74 }, 'Chapecoense-SC': { nome: 'Rafael Lacerda', tatico: 79 }, 'Corinthians-SP': { nome: 'Fernando Diniz', tatico: 86 },
  'Coritiba-PR': { nome: 'Fernando Seabra', tatico: 81 }, 'Cruzeiro-MG': { nome: 'Artur Jorge', tatico: 91 }, 'Flamengo-RJ': { nome: 'Leonardo Jardim', tatico: 91 },
  'Fluminense-RJ': { nome: 'Marcão', tatico: 74 }, 'Grêmio-RS': { nome: 'Renato Gaúcho', tatico: 82 }, 'Internacional-RS': { nome: 'Paulo Pezzolano', tatico: 84 },
  'Mirassol-SP': { nome: 'Rafael Guanaes', tatico: 83 }, 'Palmeiras-SP': { nome: 'Abel Ferreira', tatico: 94 }, 'Bragantino-SP': { nome: 'Vagner Mancini', tatico: 78 },
  'Remo-PA': { nome: 'Léo Condé', tatico: 79 }, 'Santos-SP': { nome: 'Cuca', tatico: 87 }, 'São Paulo-SP': { nome: 'Dorival Júnior', tatico: 87 },
  'Vasco-RJ': { nome: 'Pedro Emanuel', tatico: 76 }, 'Vitória-BA': { nome: 'Jair Ventura', tatico: 77 },
  // Serie B
  'América-MG': { nome: 'Alberto Valentim', tatico: 76 }, 'Athletic-MG': { nome: 'Rui Duarte', tatico: 74 }, 'Atlético-GO': { nome: 'Rafael Lacerda', tatico: 79 },
  'Avaí-SC': { nome: 'Cauan de Almeida', tatico: 75 }, 'Botafogo-SP': { nome: 'Cláudio Tencati', tatico: 76 }, 'Ceará-CE': { nome: 'Mozart', tatico: 84 },
  'CRB-AL': { nome: 'Eduardo Barroca', tatico: 78 }, 'Criciúma-SC': { nome: 'Eduardo Baptista', tatico: 81 }, 'Cuiabá-MT': { nome: 'Eduardo Barros', tatico: 80 },
  'Fortaleza-CE': { nome: 'Thiago Carpini', tatico: 80 }, 'Goiás-GO': { nome: 'Daniel Paulista', tatico: 79 }, 'Juventude-RS': { nome: 'Maurício Barbieri', tatico: 77 },
  'Londrina-PR': { nome: 'Allan Aal', tatico: 75 }, 'Náutico-PE': { nome: 'Hélio dos Anjos', tatico: 81 }, 'Novorizontino-SP': { nome: 'Enderson Moreira', tatico: 80 },
  'Operário-PR': { nome: 'Alex de Souza', tatico: 76 }, 'Ponte Preta-SP': { nome: 'Marcelo Fernandes', tatico: 75 }, 'São Bernardo-SP': { nome: 'Ricardo Catalá', tatico: 79 },
  'Sport-PE': { nome: 'Roger Silva', tatico: 73 }, 'Vila Nova-GO': { nome: 'Umberto Louzer', tatico: 78 },
  // Serie C
  'Anápolis-GO': { nome: 'Evaristo Piza', tatico: 77 }, 'Botafogo-PB': { nome: 'Victor Ferraz', tatico: 65 }, 'Caxias-RS': { nome: 'William de Mattia', tatico: 75 },
  'Floresta-CE': { nome: 'Leston Júnior', tatico: 76 }, 'Guarani-SP': { nome: 'Umberto Louzer', tatico: 78 }, 'Ituano-SP': { nome: 'Mazola Júnior', tatico: 78 },
  'Maranhão-MA': { nome: 'Jerson Testoni', tatico: 74 }, 'Maringá-PR': { nome: 'Ivan Campanari', tatico: 73 }, 'Paysandu-PA': { nome: 'Mazola Júnior', tatico: 78 },
  'Volta Redonda-RJ': { nome: 'Neto Colucci', tatico: 72 }, 'Ypiranga-RS': { nome: 'Gabardo Júnior', tatico: 73 },
  // Inglaterra
  'Arsenal': { nome: 'Mikel Arteta', tatico: 94 }, 'Aston Villa': { nome: 'Unai Emery', tatico: 91 }, 'Bournemouth': { nome: 'Marco Rose', tatico: 87 },
  'Brentford': { nome: 'Keith Andrews', tatico: 77 }, 'Brighton': { nome: 'Fabian Hürzeler', tatico: 86 }, 'Chelsea': { nome: 'Xabi Alonso', tatico: 94 },
  'Crystal Palace': { nome: 'Pierre Sage', tatico: 83 }, 'Everton': { nome: 'David Moyes', tatico: 84 }, 'Fulham': { nome: 'Álvaro Arbeloa', tatico: 78 },
  'Hull City': { nome: 'Sergej Jakirović', tatico: 79 }, 'Ipswich': { nome: 'Gary O\'Neil', tatico: 78 }, 'Leeds United': { nome: 'Daniel Farke', tatico: 84 },
  'Liverpool': { nome: 'Andoni Iraola', tatico: 89 }, 'Man City': { nome: 'Enzo Maresca', tatico: 92 }, 'Man Utd': { nome: 'Michael Carrick', tatico: 82 },
  'Newcastle': { nome: 'Matthias Jaissle', tatico: 86 }, 'Nottingham Forest': { nome: 'Oliver Glasner', tatico: 88 }, 'Sunderland': { nome: 'Régis Le Bris', tatico: 82 },
  'Tottenham': { nome: 'Roberto De Zerbi', tatico: 91 }, 'Coventry City': { nome: 'Frank Lampard', tatico: 79 },
  // Espanha
  'Barcelona': { nome: 'Hansi Flick', tatico: 94 }, 'Atlético de Madrid': { nome: 'Diego Simeone', tatico: 94 }, 'Real Madrid': { nome: 'José Mourinho', tatico: 92 },
  'Real Betis': { nome: 'Manuel Pellegrini', tatico: 86 }, 'Celta Vigo': { nome: 'Claudio Giráldez', tatico: 82 }, 'Elche': { nome: 'Martín Anselmi', tatico: 81 },
  'Espanyol': { nome: 'Manolo González', tatico: 76 }, 'Getafe': { nome: 'José Bordalás', tatico: 83 }, 'Levante': { nome: 'Luís Castro', tatico: 80 },
  'Osasuna': { nome: 'Jagoba Arrasate', tatico: 82 }, 'Racing Santander': { nome: 'José Alberto López', tatico: 77 }, 'Rayo Vallecano': { nome: 'Beñat San José', tatico: 78 },
  'Deportivo La Coruña': { nome: 'Antonio Hidalgo', tatico: 77 }, 'Real Sociedad': { nome: 'Pellegrino Matarazzo', tatico: 82 }, 'Sevilla': { nome: 'Luis García Plaza', tatico: 79 },
  'Valencia': { nome: 'Javier Aguirre', tatico: 82 }, 'Villarreal': { nome: 'Íñigo Pérez', tatico: 81 }, 'Athletic Club': { nome: 'Edin Terzić', tatico: 85 },
  'Málaga': { nome: 'Juan Francisco Funes', tatico: 74 }, 'Alavés': { nome: 'Quique Sánchez Flores', tatico: 81 },
  // Italia
  'Atalanta': { nome: 'Maurizio Sarri', tatico: 91 }, 'Bologna': { nome: 'Domenico Tedesco', tatico: 84 }, 'Cagliari': { nome: 'Fabio Pisacane', tatico: 74 },
  'Como': { nome: 'Cesc Fàbregas', tatico: 91 }, 'Fiorentina': { nome: 'Fabio Grosso', tatico: 79 }, 'Frosinone': { nome: 'Massimiliano Alvini', tatico: 76 },
  'Genoa': { nome: 'Daniele De Rossi', tatico: 80 }, 'Inter': { nome: 'Cristian Chivu', tatico: 87 }, 'Juventus': { nome: 'Luciano Spalletti', tatico: 92 },
  'Lazio': { nome: 'Gennaro Gattuso', tatico: 81 }, 'Lecce': { nome: 'Eusebio Di Francesco', tatico: 82 }, 'Milan': { nome: 'Rúben Amorim', tatico: 89 },
  'Monza': { nome: 'Ivan Jurić', tatico: 85 }, 'Napoli': { nome: 'Massimiliano Allegri', tatico: 92 }, 'Parma': { nome: 'Carlos Cuesta', tatico: 81 },
  'Roma': { nome: 'Gian Piero Gasperini', tatico: 94 }, 'Sassuolo': { nome: 'Alberto Aquilani', tatico: 78 }, 'Torino': { nome: 'Ignazio Abate', tatico: 76 },
  'Udinese': { nome: 'Kosta Runjaić', tatico: 82 }, 'Venezia': { nome: 'Giovanni Stroppa', tatico: 80 },
  // Alemanha
  'Bayern München': { nome: 'Vincent Kompany', tatico: 92 }, 'Borussia Dortmund': { nome: 'Niko Kovač', tatico: 86 }, 'Freiburg': { nome: 'Julian Schuster', tatico: 82 },
  'Bayer Leverkusen': { nome: 'Carles Martínez Novell', tatico: 83 }, 'Mainz 05': { nome: 'Urs Fischer', tatico: 84 }, 'SV Elversberg': { nome: 'Vincent Wagner', tatico: 75 },
  'RB Leipzig': { nome: 'Martín Demichelis', tatico: 82 }, 'Werder Bremen': { nome: 'Daniel Thioune', tatico: 78 }, 'Hamburger SV': { nome: 'Merlin Polzin', tatico: 77 },
  'Augsburg': { nome: 'Manuel Baum', tatico: 78 }, 'Eintracht Frankfurt': { nome: 'Adi Hütter', tatico: 85 }, 'Köln': { nome: 'René Wagner', tatico: 75 },
  'Stuttgart': { nome: 'Sebastian Hoeneß', tatico: 88 }, 'Hoffenheim': { nome: 'Christian Ilzer', tatico: 85 }, 'Schalke 04': { nome: 'Miron Muslić', tatico: 79 },
  'Paderborn': { nome: 'Ralf Kettemann', tatico: 76 }, 'Union Berlin': { nome: 'Mauro Lustrinelli', tatico: 77 }, 'Borussia Mönchengladbach': { nome: 'Alexander Blessin', tatico: 82 },
  // Franca
  'Angers': { nome: 'Stéphane Gilli', tatico: 76 }, 'Auxerre': { nome: 'Will Still', tatico: 83 }, 'Brest': { nome: 'Julien Lachuer', tatico: 74 },
  'Le Havre': { nome: 'Didier Digard', tatico: 77 }, 'Le Mans': { nome: 'Patrick Videira', tatico: 72 }, 'Lens': { nome: 'Yannick Cahuzac', tatico: 76 },
  'Lille': { nome: 'Davide Ancelotti', tatico: 79 }, 'Lorient': { nome: 'Alexandre Dujeux', tatico: 77 }, 'Lyon': { nome: 'Paulo Fonseca', tatico: 87 },
  'Marseille': { nome: 'Bruno Genesio', tatico: 88 }, 'Monaco': { nome: 'Filipe Luís', tatico: 84 }, 'Nice': { nome: 'Olivier Pantaloni', tatico: 78 },
  'Paris FC': { nome: 'Liam Rosenior', tatico: 85 }, 'Paris Saint-Germain': { nome: 'Luis Enrique', tatico: 96 }, 'Rennes': { nome: 'Franck Haise', tatico: 87 },
  'Strasbourg': { nome: 'Hugo Oliveira', tatico: 79 }, 'Toulouse': { nome: 'Berthel Askou', tatico: 75 }, 'Troyes': { nome: 'Stéphane Dumont', tatico: 76 },
  // Portugal
  'Porto': { nome: 'Francesco Farioli', tatico: 88 }, 'Benfica': { nome: 'Marco Silva', tatico: 89 }, 'Sporting CP': { nome: 'Rui Borges', tatico: 84 },
  'Braga': { nome: 'Carlos Vicens', tatico: 83 }, 'Famalicão': { nome: 'Carlos Carvalhal', tatico: 83 }, 'Vitória SC': { nome: 'Tiago Margarido', tatico: 78 },
  'Estoril': { nome: 'Vasco Matos', tatico: 77 }, 'Marítimo': { nome: 'Mitchell van der Gaag', tatico: 79 }, 'Moreirense': { nome: 'Vasco Botelho da Costa', tatico: 76 },
  'Arouca': { nome: 'Vasco Seabra', tatico: 77 }, 'Santa Clara': { nome: 'Petit', tatico: 77 }, 'Estrela da Amadora': { nome: 'Pepa', tatico: 78 },
  'Gil Vicente': { nome: 'Luís Pinto', tatico: 76 }, 'Académico de Viseu': { nome: 'Bruno Pinheiro', tatico: 75 }, 'Alverca': { nome: 'Sérgio Ferreira', tatico: 73 },
  'Rio Ave': { nome: 'Vasco Seabra', tatico: 77 }, 'Casa Pia': { nome: 'Filipe Coelho', tatico: 74 }, 'Nacional': { nome: 'Alexandre Santos', tatico: 75 },
  // Holanda
  'Ajax': { nome: 'Míchel', tatico: 86 }, 'AZ Alkmaar': { nome: 'Lee-Roy Echteld', tatico: 78 }, 'Cambuur': { nome: 'Johan Plat', tatico: 72 },
  'ADO Den Haag': { nome: 'Robin Peter', tatico: 75 }, 'Excelsior': { nome: 'Ruben den Uil', tatico: 74 }, 'Feyenoord': { nome: 'Giovanni van Bronckhorst', tatico: 86 },
  'Fortuna Sittard': { nome: 'Danny Buijs', tatico: 76 }, 'Go Ahead Eagles': { nome: 'Joseph Oosting', tatico: 79 }, 'Groningen': { nome: 'Dick Lukkien', tatico: 78 },
  'Heerenveen': { nome: 'Robin Veldman', tatico: 76 }, 'NEC Nijmegen': { nome: 'Dick Schreuder', tatico: 82 }, 'PEC Zwolle': { nome: 'Dennis van der Ree', tatico: 72 },
  'PSV Eindhoven': { nome: 'Peter Bosz', tatico: 91 }, 'Sparta Rotterdam': { nome: 'Rogier Meijer', tatico: 76 }, 'Telstar': { nome: 'Henk Brugge', tatico: 72 },
  'FC Twente': { nome: 'John van den Brom', tatico: 80 }, 'Utrecht': { nome: 'Anthony Correia', tatico: 76 }, 'Willem II': { nome: 'Adrie Koster', tatico: 76 },
  // Completando os clubes da base que faltavam
  'Leicester': { nome: 'Russell Martin', tatico: 82 }, 'Southampton': { nome: 'Tonda Eckert', tatico: 78 }, 'West Ham': { nome: 'Nuno Espírito Santo', tatico: 85 },
  'Wolves': { nome: 'César Peixoto', tatico: 77 }, 'Girona': { nome: 'Quique Álvarez', tatico: 79 }, 'Mallorca': { nome: 'Luis García Plaza', tatico: 81 },
  'Real Oviedo': { nome: 'Julián Calero', tatico: 81 }, 'Hellas Verona': { nome: 'Marco Baroni', tatico: 82 }, 'Pisa': { nome: 'Paolo Bianco', tatico: 77 },
  'Cremonese': { nome: 'Fabio Pecchia', tatico: 82 }, 'Wolfsburg': { nome: 'Dieter Hecking', tatico: 83 }, 'St. Pauli': { nome: 'Marcel Rapp', tatico: 81 },
  'Heidenheim': { nome: 'Frank Schmidt', tatico: 84 }, 'Nantes': { nome: 'Grégory Poirier', tatico: 76 }, 'Metz': { nome: 'Grégory Proment', tatico: 73 }
};

/** Perfis dos treinadores sem entrada na lista: faixa do conhecimento tatico e peso do sorteio (pedido do utilizador). */
export const PERFIS: { nome: string; min: number; max: number; peso: number }[] = [
  { nome: 'Destaque nacional em divisões inferiores', min: 75, max: 82, peso: 5 },
  { nome: 'Experiente em Série C e Série B', min: 70, max: 79, peso: 15 },
  { nome: 'Técnico regional experiente', min: 62, max: 74, peso: 45 },
  { nome: 'Técnico em desenvolvimento', min: 50, max: 65, peso: 25 },
  { nome: 'Iniciante no futebol profissional', min: 40, max: 55, peso: 10 }
];

/** O conhecimento tatico de um treinador sem entrada na lista, pelo perfil sorteado com `rnd` (0..1). */
export const sortearConhecimento = (rnd: () => number): { perfil: string; tatico: number } => {
  const soma = PERFIS.reduce((a, p) => a + p.peso, 0);
  let r = rnd() * soma, escolhido = PERFIS[PERFIS.length - 1];
  for (const p of PERFIS) { r -= p.peso; if (r <= 0) { escolhido = p; break; } }
  return { perfil: escolhido.nome, tatico: Math.round(escolhido.min + rnd() * (escolhido.max - escolhido.min)) };
};
