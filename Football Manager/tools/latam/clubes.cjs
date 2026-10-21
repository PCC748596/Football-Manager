/*
CLUBES DAS LIGAS DA AMERICA LATINA (Libertadores / Sul-Americana). Os NOMES dos clubes sao os reais; cidade, estadio, cores e ano de fundacao sao melhor-esforco e devem ser
revistos no editor (os clubes menores sobretudo). Ano 0 = nao sei (fica 1900 no jogo).

Cada pais: `id` numerico (como o do Brasil, '45', e o da Inglaterra, '65'; aqui o mesmo codigo do pais nas nacionalidades dos jogadores: Argentina 52, Bolivia 53, Brasil 54, Chile 55, Colombia 56, Equador 57, Paraguai 58, Peru 59, Uruguai 60, Venezuela 61), `sigla` (so para os ids das ligas, ex.: arg_serie_a), `serieA` (por ordem aproximada de forca: o gerador usa a ordem para dar OVR) e `acesso` (os 6 clubes extra, para o acesso e o descenso).
Campo de cada clube: [nome, sigla, cidade, estadio, cor1, cor2, padrao, ano]   padrao: s = liso, v = listras verticais, h = listras horizontais
Cores: R vermelho, W branco, K preto, B azul, LB azul-claro, N azul-marinho, Y amarelo, G verde, O laranja, M grena, V violeta, P rosa, GR cinza
Nomes iguais em paises diferentes levam sufixo do pais (ex.: "Nacional-URU"): o jogo liga jogadores a clubes pelo nome.
*/
const COR = { R: '#c8102e', W: '#ffffff', K: '#111111', B: '#1d4ed8', LB: '#6cb4ee', N: '#1e3a8a', Y: '#facc15', G: '#15803d', O: '#ea580c', M: '#7f1d1d', V: '#6d28d9', P: '#f472b6', GR: '#9ca3af' };

const PAISES = [
  {
    sigla: 'arg', id: '52', nome: 'Argentina', nacionalidade: 'ARG', idBase: 520000,
    ligaA: 'Liga Profesional', ligaB: 'Primera Nacional (acceso)', rebaixados: 3,
    serieA: [
      ['River Plate', 'RIV', 'Buenos Aires', 'Monumental', 'W', 'R', 'v', 1901],
      ['Boca Juniors', 'BOC', 'Buenos Aires', 'La Bombonera', 'N', 'Y', 'h', 1905],
      ['Racing Club', 'RAC', 'Avellaneda', 'Presidente Perón', 'LB', 'W', 'v', 1903],
      ['Independiente', 'IND', 'Avellaneda', 'Libertadores de América', 'R', 'W', 's', 1905],
      ['Estudiantes de La Plata', 'EST', 'La Plata', 'Jorge Luis Hirschi', 'R', 'W', 'v', 1905],
      ['Vélez Sarsfield', 'VEL', 'Buenos Aires', 'José Amalfitani', 'W', 'B', 's', 1910],
      ['San Lorenzo', 'SLO', 'Buenos Aires', 'Pedro Bidegain', 'B', 'R', 'v', 1908],
      ['Talleres', 'TAL', 'Córdoba', 'Mario Alberto Kempes', 'N', 'W', 'v', 1913],
      ['Rosario Central', 'ROS', 'Rosario', 'Gigante de Arroyito', 'B', 'Y', 'v', 1889],
      ['Lanús', 'LAN', 'Lanús', 'Ciudad de Lanús', 'M', 'W', 's', 1915],
      ['Belgrano', 'BEL', 'Córdoba', 'Julio César Villagra', 'LB', 'W', 'v', 1905],
      ["Newell's Old Boys", 'NOB', 'Rosario', 'Marcelo Bielsa', 'R', 'K', 'h', 1903],
      ['Argentinos Juniors', 'ARJ', 'Buenos Aires', 'Diego Armando Maradona', 'R', 'W', 'v', 1904],
      ['Huracán', 'HUR', 'Buenos Aires', 'Tomás Adolfo Ducó', 'W', 'R', 's', 1908],
      ['Defensa y Justicia', 'DYJ', 'Florencio Varela', 'Norberto Tomaghello', 'G', 'Y', 's', 1935],
      ['Godoy Cruz', 'GOD', 'Mendoza', 'Feliciano Gambarte', 'B', 'W', 'v', 1921],
      ['Tigre', 'TIG', 'Victoria', 'José Dellagiovanna', 'N', 'R', 'v', 1902],
      ['Banfield', 'BAN', 'Banfield', 'Florencio Sola', 'G', 'W', 'v', 1896],
      ['Platense', 'PLA', 'Vicente López', 'Ciudad de Vicente López', 'M', 'W', 'v', 1905],
      ['Gimnasia La Plata', 'GLP', 'La Plata', 'Juan Carmelo Zerillo', 'B', 'W', 'v', 1887],
      ['Instituto', 'INS', 'Córdoba', 'Presidente Perón', 'R', 'W', 'v', 1918],
      ['Barracas Central', 'BAR', 'Buenos Aires', 'Claudio Chiqui Tapia', 'R', 'W', 'v', 1904],
      ['Sarmiento', 'SAR', 'Junín', 'Eva Perón', 'G', 'W', 'v', 1911],
      ['Central Córdoba (SdE)', 'CCO', 'Santiago del Estero', 'Alfredo Terrera', 'K', 'W', 'v', 1919],
      ['Atlético Tucumán', 'ATU', 'San Miguel de Tucumán', 'Monumental José Fierro', 'LB', 'W', 'v', 1902],
      ['Unión', 'UNI', 'Santa Fe', '15 de Abril', 'R', 'W', 'v', 1907],
      ['Colón', 'COL', 'Santa Fe', 'Brigadier General Estanislao López', 'R', 'K', 'v', 1905],
      ['Independiente Rivadavia', 'IRI', 'Mendoza', 'Bautista Gargantini', 'B', 'W', 'v', 1913],
      ['Deportivo Riestra', 'RIE', 'Buenos Aires', 'Guillermo Laza', 'K', 'W', 'v', 1931],
      ['Aldosivi', 'ALD', 'Mar del Plata', 'José María Minella', 'Y', 'G', 'v', 1913]
    ],
    acesso: [
      ['Chacarita Juniors', 'CHA', 'San Martín', 'Chacarita Juniors', 'R', 'K', 'v', 1906],
      ['Atlanta', 'ATL', 'Buenos Aires', 'Don León Kolbowski', 'Y', 'B', 'v', 1904],
      ['Nueva Chicago', 'NCH', 'Buenos Aires', 'República de Mataderos', 'G', 'K', 'v', 1911],
      ['Ferro Carril Oeste', 'FER', 'Buenos Aires', 'Arquitecto Ricardo Etcheverry', 'G', 'W', 's', 1904],
      ['Quilmes', 'QUI', 'Quilmes', 'Centenario', 'W', 'N', 'v', 1887],
      ['San Martín (T)', 'SMT', 'San Miguel de Tucumán', 'La Ciudadela', 'R', 'K', 'v', 1909]
    ]
  },
  {
    sigla: 'chi', id: '55', nome: 'Chile', nacionalidade: 'CHI', idBase: 550000,
    ligaA: 'Primera División', ligaB: 'Primera B (acceso)', rebaixados: 3,
    serieA: [
      ['Colo-Colo', 'COC', 'Santiago', 'Monumental David Arellano', 'W', 'K', 's', 1925],
      ['Universidad de Chile', 'UCH', 'Santiago', 'Nacional Julio Martínez Prádanos', 'B', 'R', 's', 1927],
      ['Universidad Católica', 'UCA', 'Santiago', 'San Carlos de Apoquindo', 'W', 'B', 'h', 1937],
      ['Palestino', 'PAL', 'Santiago', 'Municipal de La Cisterna', 'R', 'G', 'v', 1920],
      ['Huachipato', 'HUA', 'Talcahuano', 'Huachipato-CAP Acero', 'N', 'K', 'v', 1947],
      ['Coquimbo Unido', 'COQ', 'Coquimbo', 'Francisco Sánchez Rumoroso', 'Y', 'K', 'v', 1909],
      ["O'Higgins", 'OHI', 'Rancagua', 'El Teniente', 'LB', 'W', 's', 1955],
      ['Unión Española', 'UES', 'Santiago', 'Santa Laura', 'R', 'W', 's', 1897],
      ['Audax Italiano', 'AUD', 'Santiago', 'Bicentenario de La Florida', 'G', 'W', 's', 1910],
      ['Cobresal', 'CBS', 'El Salvador', 'El Cobre', 'O', 'W', 's', 1979],
      ['Everton de Viña del Mar', 'EVE', 'Viña del Mar', 'Sausalito', 'Y', 'B', 'v', 1909],
      ['Ñublense', 'ÑUB', 'Chillán', 'Nelson Oyarzún Arenas', 'R', 'K', 'v', 1916],
      ['Unión La Calera', 'ULC', 'La Calera', 'Nicolás Chahuán Nazar', 'R', 'W', 's', 1954],
      ['Deportes Iquique', 'IQU', 'Iquique', 'Tierra de Campeones', 'LB', 'W', 's', 1978],
      ['Deportes La Serena', 'LSE', 'La Serena', 'La Portada', 'R', 'W', 's', 1955],
      ['Deportes Limache', 'LIM', 'Limache', 'Municipal de Limache', 'Y', 'B', 's', 1933]
    ],
    acesso: [
      ['Cobreloa', 'CLO', 'Calama', 'Zorros del Desierto', 'O', 'W', 's', 1977],
      ['Santiago Wanderers', 'WAN', 'Valparaíso', 'Elías Figueroa Brander', 'G', 'W', 'v', 1892],
      ['Universidad de Concepción', 'UDC', 'Concepción', 'Ester Roa Rebolledo', 'Y', 'R', 's', 1994],
      ['Deportes Temuco', 'TEM', 'Temuco', 'Germán Becker', 'G', 'W', 's', 1960],
      ['Deportes Antofagasta', 'ANT', 'Antofagasta', 'Calvo y Bascuñán', 'LB', 'W', 's', 1966],
      ['Curicó Unido', 'CUR', 'Curicó', 'La Granja', 'R', 'Y', 's', 1973]
    ]
  },
  {
    sigla: 'col', id: '56', nome: 'Colombia', nacionalidade: 'COL', idBase: 560000,
    ligaA: 'Categoría Primera A', ligaB: 'Categoría Primera B (acceso)', rebaixados: 3,
    serieA: [
      ['Atlético Nacional', 'NAC', 'Medellín', 'Atanasio Girardot', 'G', 'W', 'v', 1947],
      ['Millonarios', 'MIL', 'Bogotá', 'El Campín', 'B', 'W', 's', 1946],
      ['Junior', 'JUN', 'Barranquilla', 'Metropolitano Roberto Meléndez', 'R', 'W', 'v', 1924],
      ['Independiente Medellín', 'DIM', 'Medellín', 'Atanasio Girardot', 'R', 'N', 's', 1913],
      ['Santa Fe', 'SFE', 'Bogotá', 'El Campín', 'R', 'W', 's', 1941],
      ['América de Cali', 'AME', 'Cali', 'Pascual Guerrero', 'R', 'W', 's', 1927],
      ['Deportivo Cali', 'CAL', 'Cali', 'Deportivo Cali', 'G', 'W', 'v', 1912],
      ['Deportes Tolima', 'TOL', 'Ibagué', 'Manuel Murillo Toro', 'M', 'Y', 's', 1954],
      ['Once Caldas', 'ONC', 'Manizales', 'Palogrande', 'W', 'G', 'v', 1961],
      ['Atlético Bucaramanga', 'BUC', 'Bucaramanga', 'Alfonso López', 'Y', 'G', 's', 1949],
      ['Deportivo Pereira', 'PER', 'Pereira', 'Hernán Ramírez Villegas', 'Y', 'R', 'v', 1944],
      ['Águilas Doradas', 'AGU', 'Rionegro', 'Alberto Grisales', 'Y', 'K', 's', 2007],
      ['Envigado', 'ENV', 'Envigado', 'Polideportivo Sur', 'O', 'G', 's', 1989],
      ['La Equidad', 'EQU', 'Bogotá', 'Metropolitano de Techo', 'G', 'W', 's', 1982],
      ['Fortaleza CEIF', 'FOR', 'Bogotá', 'Metropolitano de Techo', 'N', 'W', 's', 2001],
      ['Alianza FC', 'ALI', 'Valledupar', 'Armando Maestre Pavajeau', 'Y', 'K', 's', 2019],
      ['Boyacá Chicó', 'BOY', 'Tunja', 'La Independencia', 'B', 'W', 'v', 2002],
      ['Jaguares de Córdoba', 'JAG', 'Montería', 'Jaraguay', 'Y', 'R', 's', 2012],
      ['Llaneros FC', 'LLA', 'Villavicencio', 'Bello Horizonte', 'Y', 'G', 's', 2012],
      ['Internacional de Bogotá', 'INB', 'Bogotá', 'Metropolitano de Techo', 'R', 'W', 's', 2016]
    ],
    acesso: [
      ['Cúcuta Deportivo', 'CUC', 'Cúcuta', 'General Santander', 'R', 'K', 'v', 1924],
      ['Deportes Quindío', 'QUI', 'Armenia', 'Centenario', 'Y', 'G', 'v', 1951],
      ['Patriotas Boyacá', 'PAT', 'Tunja', 'La Independencia', 'M', 'W', 's', 2003],
      ['Real Cartagena', 'RCA', 'Cartagena', 'Jaime Morón León', 'B', 'W', 's', 2003],
      ['Atlético Huila', 'HUI', 'Neiva', 'Guillermo Plazas Alcid', 'G', 'Y', 's', 1990],
      ['Unión Magdalena', 'UMA', 'Santa Marta', 'Sierra Nevada', 'B', 'R', 's', 1953]
    ]
  },
  {
    sigla: 'uru', id: '60', nome: 'Uruguay', nacionalidade: 'URU', idBase: 600000,
    ligaA: 'Primera División', ligaB: 'Segunda División (ascenso)', rebaixados: 3,
    serieA: [
      ['Peñarol', 'PEN', 'Montevidéu', 'Campeón del Siglo', 'Y', 'K', 'v', 1891],
      ['Nacional-URU', 'NAU', 'Montevidéu', 'Gran Parque Central', 'W', 'B', 's', 1899],
      ['Defensor Sporting', 'DEF', 'Montevidéu', 'Luis Franzini', 'V', 'W', 's', 1913],
      ['Danubio', 'DAN', 'Montevidéu', 'Jardines del Hipódromo', 'W', 'B', 's', 1932],
      ['Liverpool-URU', 'LIV', 'Montevidéu', 'Belvedere', 'K', 'B', 'v', 1915],
      ['Montevideo Wanderers', 'MWA', 'Montevidéu', 'Alfredo Víctor Viera', 'K', 'W', 'v', 1902],
      ['River Plate-URU', 'RPU', 'Montevidéu', 'Parque Federico Omar Saroldi', 'B', 'R', 'v', 1932],
      ['Cerro', 'CER', 'Montevidéu', 'Luis Tróccoli', 'LB', 'W', 's', 1922],
      ['Cerro Largo', 'CLA', 'Melo', 'Antonio Ubilla', 'B', 'W', 's', 1928],
      ['Boston River', 'BOS', 'Montevidéu', 'Parque Maracaná', 'G', 'W', 's', 1950],
      ['Plaza Colonia', 'PCO', 'Colonia del Sacramento', 'Parque Prado', 'W', 'B', 's', 1917],
      ['Racing-URU', 'RAU', 'Montevidéu', 'Osvaldo Roberto', 'K', 'W', 'v', 1919],
      ['Progreso', 'PRO', 'Montevidéu', 'Abraham Paladino', 'R', 'W', 's', 1917],
      ['Torque', 'TOR', 'Montevidéu', 'Parque Viera', 'LB', 'W', 's', 2007],
      ['Juventud', 'JUV', 'Las Piedras', 'Parque Artigas', 'R', 'B', 's', 1935],
      ['Deportivo Maldonado', 'DMA', 'Maldonado', 'Domingo Burgueño Miguel', 'B', 'W', 's', 1928]
    ],
    acesso: [
      ['Fénix', 'FEN', 'Montevidéu', 'Parque Capurro', 'V', 'W', 's', 1916],
      ['Miramar Misiones', 'MIR', 'Montevidéu', 'Parque Luis Méndez Piana', 'G', 'W', 's', 1913],
      ['Albion', 'ALB', 'Montevidéu', 'Parque Alfredo Víctor Viera', 'B', 'W', 'v', 1891],
      ['Rampla Juniors', 'RAM', 'Montevidéu', 'Olímpico', 'R', 'G', 'v', 1914],
      ['Central Español', 'CEN', 'Montevidéu', 'Parque Palermo', 'R', 'B', 'v', 1905],
      ['Atenas de San Carlos', 'ATE', 'San Carlos', 'Atenas', 'B', 'W', 'v', 1917]
    ]
  },
  {
    sigla: 'par', id: '58', nome: 'Paraguay', nacionalidade: 'PAR', idBase: 580000,
    ligaA: 'Primera División', ligaB: 'División Intermedia (ascenso)', rebaixados: 2,
    serieA: [
      ['Olimpia', 'OLI', 'Assunção', 'Manuel Ferreira', 'W', 'K', 'h', 1902],
      ['Cerro Porteño', 'CPO', 'Assunção', 'La Nueva Olla', 'B', 'R', 'v', 1912],
      ['Libertad', 'LBT', 'Assunção', 'Dr. Nicolás Leoz', 'K', 'W', 'v', 1905],
      ['Guaraní', 'GUA', 'Assunção', 'Rogelio Livieres', 'Y', 'K', 'v', 1903],
      ['Nacional-PAR', 'NAP', 'Assunção', 'Arsenio Erico', 'W', 'B', 'h', 1904],
      ['Sol de América', 'SOL', 'Villa Elisa', 'Luis Alfonso Giagni', 'B', 'W', 'v', 1909],
      ['Sportivo Luqueño', 'LUQ', 'Luque', 'Feliciano Cáceres', 'Y', 'B', 'v', 1921],
      ['Sportivo Trinidense', 'TRI', 'Assunção', 'Martín Torres', 'R', 'W', 'v', 1911],
      ['General Caballero JLM', 'GCA', 'Juan León Mallorquín', 'Juan Canuto Pettengill', 'R', 'W', 'v', 1993],
      ['Recoleta', 'REC', 'Assunção', 'Ricardo Gregor', 'G', 'W', 's', 1936],
      ['2 de Mayo', 'DMY', 'Pedro Juan Caballero', 'Río Parapití', 'W', 'R', 'v', 1936],
      ['Tacuary', 'TAC', 'Assunção', 'Roberto Bettega', 'K', 'W', 'v', 1923]
    ],
    acesso: [
      ['12 de Octubre', 'DOC', 'Itauguá', 'Juan Canuto Pettengill', 'R', 'B', 'v', 1914],
      ['Resistencia', 'RES', 'Assunção', 'Tomás Beggan', 'R', 'W', 'v', 1917],
      ['Sportivo Ameliano', 'AME', 'Assunção', 'Ameliano', 'R', 'W', 'v', 1939],
      ['Deportivo Capiatá', 'CAP', 'Capiatá', 'Rubén Sánchez', 'R', 'W', 's', 2002],
      ['Atlético Colegiales', 'COL', 'Assunção', 'Alfonso Colmán', 'R', 'W', 'v', 1936],
      ['Deportivo Santaní', 'SAN', 'Santaní', 'Santaní', 'G', 'W', 's', 1979]
    ]
  },
  {
    sigla: 'equ', id: '57', nome: 'Ecuador', nacionalidade: 'ECU', idBase: 570000,
    ligaA: 'LigaPro Serie A', ligaB: 'LigaPro Serie B (ascenso)', rebaixados: 3,
    serieA: [
      ['Independiente del Valle', 'IDV', 'Sangolquí', 'Banco Guayaquil', 'K', 'B', 'v', 1958],
      ['LDU Quito', 'LDU', 'Quito', 'Rodrigo Paz Delgado', 'W', 'B', 's', 1930],
      ['Barcelona SC', 'BSC', 'Guayaquil', 'Monumental Banco Pichincha', 'Y', 'R', 's', 1925],
      ['Emelec', 'EME', 'Guayaquil', 'George Capwell', 'B', 'W', 'v', 1929],
      ['Aucas', 'AUC', 'Quito', 'Gonzalo Pozo Ripalda', 'Y', 'R', 's', 1945],
      ['El Nacional', 'ENA', 'Quito', 'Olímpico Atahualpa', 'R', 'B', 'v', 1964],
      ['Deportivo Cuenca', 'CUE', 'Cuenca', 'Alejandro Serrano Aguilar', 'R', 'W', 's', 1971],
      ['Delfín', 'DEL', 'Manta', 'Jocay', 'B', 'W', 's', 1991],
      ['Orense', 'ORE', 'Machala', '9 de Mayo', 'Y', 'G', 's', 1963],
      ['Macará', 'MAC', 'Ambato', 'Bellavista', 'B', 'W', 'v', 1939],
      ['Técnico Universitario', 'TEC', 'Ambato', 'Bellavista', 'R', 'B', 's', 1971],
      ['Mushuc Runa', 'MUS', 'Ambato', 'Bellavista', 'W', 'R', 's', 2003],
      ['Libertad FC', 'LFC', 'Loja', 'Reina del Cisne', 'Y', 'B', 's', 2013],
      ['Universidad Católica-ECU', 'UCE', 'Quito', 'Olímpico Atahualpa', 'W', 'B', 's', 1963],
      ['Cumbayá FC', 'CUM', 'Quito', 'Olímpico Atahualpa', 'R', 'W', 's', 2003],
      ['Manta FC', 'MAN', 'Manta', 'Jocay', 'Y', 'R', 's', 1992]
    ],
    acesso: [
      ['Deportivo Quito', 'DQU', 'Quito', 'Olímpico Atahualpa', 'R', 'W', 'v', 1940],
      ['Guayaquil City', 'GYC', 'Guayaquil', 'Christian Benítez Betancourt', 'W', 'B', 's', 2004],
      ['9 de Octubre', 'NOV', 'Guayaquil', '9 de Octubre', 'B', 'W', 'v', 1913],
      ['Imbabura SC', 'IMB', 'Ibarra', 'Olímpico de Ibarra', 'B', 'W', 'v', 1976],
      ['Gualaceo SC', 'GUL', 'Gualaceo', 'Jorge Andrade Cobos', 'G', 'W', 'v', 1978],
      ['Chacaritas FC', 'CHF', 'Quito', 'Chacaritas', 'R', 'K', 'v', 2008]
    ]
  },
  {
    sigla: 'per', id: '59', nome: 'Peru', nacionalidade: 'PER', idBase: 590000,
    ligaA: 'Liga 1', ligaB: 'Liga 2 (ascenso)', rebaixados: 3,
    serieA: [
      ['Universitario', 'UNI', 'Lima', 'Monumental', 'W', 'R', 's', 1924],
      ['Alianza Lima', 'ALI', 'Lima', 'Alejandro Villanueva', 'B', 'W', 'v', 1901],
      ['Sporting Cristal', 'CRI', 'Lima', 'Alberto Gallardo', 'LB', 'W', 's', 1955],
      ['Melgar', 'MEL', 'Arequipa', 'Monumental de la UNSA', 'R', 'K', 'v', 1915],
      ['Cienciano', 'CIE', 'Cusco', 'Garcilaso', 'R', 'W', 'v', 1901],
      ['Sport Boys', 'SBO', 'Callao', 'Miguel Grau', 'P', 'LB', 's', 1927],
      ['Sport Huancayo', 'HUA', 'Huancayo', 'Estadio Huancayo', 'R', 'W', 'v', 2007],
      ['ADT', 'ADT', 'Tarma', 'Unión Tarma', 'R', 'W', 'v', 1950],
      ['Alianza Atlético', 'AAT', 'Sullana', 'Campeones del 36', 'B', 'W', 'v', 1920],
      ['Juan Pablo II College', 'JPC', 'Chongoyape', 'Complejo Juan Pablo II', 'B', 'W', 's', 2018],
      ['Deportivo Garcilaso', 'GAR', 'Cusco', 'Garcilaso', 'R', 'K', 'v', 1950],
      ['Carlos A. Mannucci', 'MAN', 'Trujillo', 'Mansiche', 'R', 'W', 'v', 1913],
      ['Comerciantes Unidos', 'COM', 'Cutervo', 'Juan Maldonado Gamarra', 'R', 'W', 'v', 1990],
      ['Atlético Grau', 'GRA', 'Piura', 'Campeones del 36', 'LB', 'W', 'v', 1919],
      ['UTC', 'UTC', 'Cajamarca', 'Héroes de San Ramón', 'R', 'W', 'v', 1946],
      ['Cusco FC', 'CUS', 'Cusco', 'Garcilaso', 'R', 'K', 's', 2009],
      ['Los Chankas', 'CHA', 'Andahuaylas', 'Los Chankas', 'R', 'W', 'v', 2014],
      ['Binacional', 'BIN', 'Juliaca', 'Guillermo Briceño Rosamedina', 'R', 'W', 's', 2016]
    ],
    acesso: [
      ['Deportivo Municipal', 'MUN', 'Lima', 'Iván Elías Moreno', 'R', 'W', 'v', 1935],
      ['Academia Cantolao', 'CAN', 'Callao', 'Complejo Deportivo Cantolao', 'LB', 'W', 's', 1969],
      ['Ayacucho FC', 'AYA', 'Ayacucho', 'Ciudad de Cumaná', 'R', 'W', 's', 2009],
      ['Pirata FC', 'PIR', 'Chiclayo', 'Elías Aguirre', 'K', 'Y', 's', 1954],
      ['Unión Comercio', 'UCO', 'Nueva Cajamarca', 'IPD de Moyobamba', 'R', 'B', 'v', 2008],
      ['Deportivo Llacuabamba', 'LLA', 'Llacuabamba', 'Rolando Mora', 'R', 'W', 'v', 1998]
    ]
  },
  {
    sigla: 'bol', id: '53', nome: 'Bolivia', nacionalidade: 'BOL', idBase: 530000,
    ligaA: 'División Profesional', ligaB: 'Copa Simón Bolívar (ascenso)', rebaixados: 3,
    serieA: [
      ['Bolívar', 'BOL', 'La Paz', 'Hernando Siles', 'LB', 'W', 's', 1925],
      ['The Strongest', 'STR', 'La Paz', 'Rafael Mendoza Castellón', 'Y', 'K', 'v', 1908],
      ['Always Ready', 'ARE', 'El Alto', 'Municipal de El Alto', 'R', 'W', 'v', 1933],
      ['Blooming', 'BLO', 'Santa Cruz de la Sierra', 'Ramón Tahuichi Aguilera', 'LB', 'W', 's', 1946],
      ['Oriente Petrolero', 'ORI', 'Santa Cruz de la Sierra', 'Ramón Tahuichi Aguilera', 'G', 'W', 'v', 1955],
      ['Jorge Wilstermann', 'WIL', 'Cochabamba', 'Félix Capriles', 'R', 'W', 's', 1949],
      ['Aurora', 'AUR', 'Cochabamba', 'Félix Capriles', 'B', 'W', 'v', 1935],
      ['Nacional Potosí', 'NPO', 'Potosí', 'Víctor Agustín Ugarte', 'R', 'W', 'v', 1942],
      ['Independiente Petrolero', 'IPE', 'Sucre', 'Olímpico Patria', 'Y', 'B', 'v', 1932],
      ['San Antonio Bulo Bulo', 'SAB', 'Bulo Bulo', 'Bulo Bulo', 'R', 'B', 's', 1985],
      ['Universitario de Vinto', 'VIN', 'Vinto', 'Rafael Mendoza Castellón', 'B', 'W', 's', 1985],
      ['Real Tomayapo', 'TOM', 'Tarija', 'IV Centenario', 'Y', 'G', 's', 1990],
      ['Guabirá', 'GUB', 'Montero', 'Gilberto Parada', 'G', 'W', 'v', 1962],
      ['Palmaflor', 'PAF', 'Cochabamba', 'Félix Capriles', 'G', 'Y', 's', 1989],
      ['GV San José', 'GVS', 'Oruro', 'Jesús Bermúdez', 'B', 'W', 'v', 1942],
      ['Gran Mamoré', 'MAM', 'Trinidad', 'Gran Mamoré', 'R', 'W', 's', 2003]
    ],
    acesso: [
      ['Royal Pari', 'ROP', 'Santa Cruz de la Sierra', 'Ramón Tahuichi Aguilera', 'K', 'Y', 's', 2012],
      ['Real Santa Cruz', 'RSC', 'Santa Cruz de la Sierra', 'Ramón Tahuichi Aguilera', 'R', 'W', 's', 2018],
      ['Universitario de Sucre', 'USU', 'Sucre', 'Olímpico Patria', 'K', 'Y', 's', 1968],
      ['Fancesa', 'FAN', 'Sucre', 'Olímpico Patria', 'B', 'W', 's', 1991],
      ['Atlético Bermejo', 'BER', 'Bermejo', 'Bermejo', 'G', 'W', 's', 1985],
      ['Stormers San Lorenzo', 'STO', 'Cochabamba', 'Félix Capriles', 'R', 'W', 'v', 2006]
    ]
  },
  {
    sigla: 'ven', id: '61', nome: 'Venezuela', nacionalidade: 'VEN', idBase: 610000,
    ligaA: 'Liga FUTVE', ligaB: 'Segunda División (ascenso)', rebaixados: 2,
    serieA: [
      ['Caracas FC', 'CCS', 'Caracas', 'Olímpico de la UCV', 'R', 'W', 's', 1967],
      ['Deportivo Táchira', 'TAC', 'San Cristóbal', 'Polideportivo de Pueblo Nuevo', 'Y', 'K', 'v', 1974],
      ['Carabobo FC', 'CAR', 'Valencia', 'Misael Delgado', 'Y', 'B', 's', 1996],
      ['Zamora FC', 'ZAM', 'Barinas', 'Agustín Tovar', 'K', 'W', 'v', 1977],
      ['Monagas SC', 'MON', 'Maturín', 'Monumental de Maturín', 'Y', 'K', 'v', 1987],
      ['Deportivo La Guaira', 'LAG', 'La Guaira', 'Olímpico de la UCV', 'Y', 'R', 's', 2009],
      ['Metropolitanos FC', 'MET', 'Caracas', 'Olímpico de la UCV', 'K', 'W', 'v', 2012],
      ['Academia Puerto Cabello', 'APC', 'Puerto Cabello', 'Agustín Tovar', 'B', 'W', 's', 2012],
      ['Portuguesa FC', 'POR', 'Acarigua', 'José Antonio Páez', 'R', 'W', 'v', 1972],
      ['Estudiantes de Mérida', 'EME', 'Mérida', 'Metropolitano de Mérida', 'R', 'W', 'v', 1971],
      ['UCV FC', 'UCV', 'Caracas', 'Olímpico de la UCV', 'R', 'B', 's', 2012],
      ['Angostura FC', 'ANG', 'Ciudad Bolívar', 'José Antonio Páez', 'G', 'W', 's', 2018],
      ['Deportivo Rayo Zuliano', 'RAY', 'Maracaibo', 'José Encarnación Romero', 'B', 'W', 's', 2022],
      ['Hermanos Colmenárez', 'HCO', 'Barquisimeto', 'Farid Richa', 'R', 'W', 's', 2020]
    ],
    acesso: [
      ['Mineros de Guayana', 'MIN', 'Ciudad Guayana', 'CTE Cachamay', 'K', 'R', 'v', 1981],
      ['Aragua FC', 'ARA', 'Maracay', 'José Pachencho Romero', 'R', 'W', 'v', 2008],
      ['Trujillanos FC', 'TRU', 'Valera', 'José Alberto Pérez', 'B', 'W', 'v', 1983],
      ['Gran Valencia FC', 'GVA', 'Valencia', 'Misael Delgado', 'R', 'B', 's', 2017],
      ['Ureña SC', 'URE', 'Ureña', 'Luis Loreto Lira', 'R', 'W', 's', 2017],
      ['Yaracuyanos FC', 'YAR', 'San Felipe', 'Florentino Oropeza', 'K', 'W', 'v', 2002]
    ]
  }
];

module.exports = { PAISES, COR };
