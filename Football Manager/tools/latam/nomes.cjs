/*
NOMES CARACTERISTICOS DE CADA PAIS para o gerador de jogadores. Sao listas de nomes e sobrenomes COMUNS (nada de jogadores reais por inteiro); o gerador combina nome + sobrenome
(as vezes um segundo nome ou um segundo sobrenome) e nunca repete um nome completo. Combinacoes casuais podem coincidir com pessoas reais: os nomes serao editados mais tarde.
Para acrescentar variedade a um pais, e so juntar mais palavras as listas (separadas por espaco; use "_" onde o nome tem espaco, ex.: De_la_Cruz).
*/
const L = (s) => s.trim().split(/\s+/).map(x => x.replace(/_/g, ' '));

const NOMES = {
  ARG: {
    nomes: L(`Matías Nicolás Lucas Franco Facundo Agustín Juan Santiago Tomás Gonzalo Federico Maximiliano Leandro Ezequiel Martín Cristian Emiliano Brian Gastón Lautaro Joaquín Bruno
              Ignacio Rodrigo Sebastián Diego Mauro Walter Claudio Ramiro Axel Valentín Thiago Julián Alan Braian Cristián Jonathan Iván Marcos Hernán Fabricio Nahuel Enzo Kevin Maximo Dante`),
    sobrenomes: L(`Fernández González Rodríguez López Martínez Pérez Gómez Díaz Sosa Romero Acosta Benítez Medina Herrera Castro Ruiz Álvarez Torres Ramírez Giménez Molina Ortiz Silva Núñez
                   Luna Juárez Cabrera Ríos Morales Domínguez Moreno Peralta Vega Rojas Gutiérrez Aguirre Paz Ledesma Maidana Funes Altamirano Barrios Vázquez Correa Figueroa Ferrari Bruno Rossi
                   Gallo Conti Colombo Greco Marino Ricci Fabbri Santucci Bianchi Caruso Paoletti Peralta Soria Villalba Cardozo Sandoval Bravo Quiroga Ojeda Montiel Cáceres Coronel Duarte`)
  },
  CHI: {
    nomes: L(`Matías Benjamín Vicente Joaquín Cristóbal Sebastián Nicolás Felipe Diego Rodrigo Claudio Esteban Gonzalo Bastián Maximiliano Ignacio Javier Francisco Pablo Marcelo Mauricio
              Jean Brayan Byron Carlos Fabián Cristian Eduardo Gary Luis Miguel Óscar Patricio Rafael Víctor Alexis Arturo Eugenio Fernando Ángelo Dylan Franco Tomás`),
    sobrenomes: L(`Soto Muñoz Rojas Díaz Pérez Contreras Silva Sepúlveda Morales Rodríguez López Araya Fuentes Hernández Torres Espinoza Vásquez Tapia Reyes Gutiérrez Castillo Vargas Álvarez
                   Valenzuela Sánchez Carrasco Cortés Gómez Figueroa Riquelme Orellana Pizarro Bravo Henríquez Godoy Jara Bustos Saavedra Navarro Molina Leiva Cáceres Aguilera Ibáñez
                   Vidal Marín Maldonado Peña Salazar Campos Paredes Venegas Zúñiga Poblete Lagos Cifuentes Barrera Carvajal Medina Olivares Villalobos Mella Millanao Huenchumán Painemal Kovacevic Vukasovic`)
  },
  COL: {
    nomes: L(`Juan Camilo Andrés Santiago Jhon Yeison Jefferson Cristian Duván Miguel Dayro Wilmar Mateo Sebastián Brayan Daniel Alejandro Carlos Hernán Edwin Éder Luis Fernando Jhonatan
              Kevin Stiven Yerry Wilder Johan Nicolás Jorge Harold Elkin Deiver Alexander Rafael Dávinson Jáder Ánderson Jeison Leonardo Gustavo Mauricio Óscar`),
    sobrenomes: L(`Rodríguez Gómez González Martínez García López Hernández Sánchez Ramírez Díaz Pérez Moreno Muñoz Rojas Torres Cuesta Mosquera Valencia Palacios Rentería Mena Córdoba Caicedo
                   Murillo Ibarguen Quintero Cardona Ospina Arboleda Castaño Zapata Bedoya Echeverri Londoño Giraldo Ríos Vélez Marín Cortés Salazar Arias Henao Velásquez Montoya Perea Asprilla
                   Mojica Ayala Lerma Angulo Chará Banguero Bonilla Cuadrado Vargas Pabón Restrepo Sinisterra`)
  },
  ECU: {
    nomes: L(`Jordy Joao Kevin Byron Moisés Gonzalo Pervis Piero Ángelo Carlos Jhon Michael Alan Alexander Romario Brayan Jackson Leonardo Gabriel Luis Darwin Anderson Diego Alexis Pedro Miguel
              Jefferson Washington Segundo Marlon Bryan Cristian Fernando Wilmer Junior Renato Neider Franklin Edison Johan Marco Hólger`),
    sobrenomes: L(`Cuero Caicedo Estupiñán Plata Mina Preciado Valencia Ortiz Arroyo Angulo Cifuentes Ayoví Quiñónez Cevallos Ponce Franco Palacios Gruezo Castillo Mercado Chila Rodríguez Ramírez
                   Torres Intriago Bolaños Alcívar Macías Villacís Cangá Mendoza Alvarado Vera Zambrano Cortez Delgado Paredes Quintero Chávez Cabezas Pinargote Lara Vite Sornoza Reasco Guagua
                   Pacheco Espinoza Campana Mosquera Cabeza Rivas Bagüí Corozo Tenorio Obregón Rodríguez`)
  },
  PAR: {
    nomes: L(`Derlis Osvaldo Gustavo Hernán Cristhian Julio Fabián Óscar Robert Roque Antonio Alan Néstor Santiago Mauricio Ángel Braian Gabriel Iván Alejandro Richard Lucas Matías Ramón
              Blas Jorge Rodrigo Diego Marcelo Víctor Silvio Pablo Ariel Édgar Rolando Celso Aldo Wilder Alexis Sebastián Ronaldo Fidencio Cecilio Genaro`),
    sobrenomes: L(`Villalba Benítez Cardozo Giménez Báez Ayala Romero Caballero Martínez Rolón Ortigoza Samudio Duarte Velázquez Insfrán Aquino Barrios Britez Fernández Cabrera Ovelar Candia
                   Franco Riveros Mendieta Alderete Sanabria Bareiro Ojeda Cáceres Gamarra Chamorro Peralta Aguilar Acuña Ferreira Maidana Zárate Vera González López Rodríguez Gómez Núñez
                   Amarilla Espínola Servín Notario Lezcano Segovia Escobar Colmán Alcaraz Arévalos Paredes Morínigo Jara Meza Ruiz_Díaz Larrea`)
  },
  PER: {
    nomes: L(`Luis José Carlos Jean Piero Christian Miguel Raúl Edison Renzo Yoshimar Anderson Alexis Marcos Diego Santiago Jorge Víctor Hernán Gabriel Josué Alexander Sergio Ángel Percy
              Wilder Paolo Pedro Aldair Cristian Fernando Roberto Marco Rafael Walter Omar Andy Freddy Jhonny Kevin Edgar Joao Nilson Rodrigo`),
    sobrenomes: L(`Quispe Flores Rojas Mamani Chávez Huamán Condori Rodríguez Sánchez Ramírez Advíncula Carrillo Cueva Tapia Ormeño Aquino Zambrano Cartagena Gonzales Vásquez Castillo Torres
                   Díaz Mendoza García Ríos Paredes Cruzado Valera Herrera Palacios Salazar Ugarte Cabrera Cáceres Guevara Peña Núñez Huertas Callens Lora Polo Reyna Bustamante Rivera
                   Yotún Tanaka Ito Hohberg Gallese Abram Benavides Calcaterra Corzo Roca Sandoval Villanueva Gómez Sosa Távara`)
  },
  URU: {
    nomes: L(`Matías Nicolás Federico Facundo Agustín Santiago Diego Maximiliano Sebastián Gonzalo Martín Rodrigo Joaquín Gastón Bruno Franco Emiliano Ignacio Leandro Mauricio Cristian
              Jonathan Ramiro Brian Guillermo Nahitan Lucas Fabricio Gabriel Álvaro Marcelo Nicolás Mathías Ezequiel Washington Walter Brandon Kevin Thiago Axel Alan Ángel Gerónimo`),
    sobrenomes: L(`Rodríguez Pereira Silva Fernández González Acosta Techera Píriz Cabrera Álvarez Ferreira Martínez Núñez Suárez Cáceres Giménez Olivera Viña Techera Sosa Díaz Pérez López Torres
                   Rivero Rivas Castro Romero Ramos Benítez Correa Morales Rodríguez Lemos Abreu Ibarra Cardozo Machado Bueno Lima Vázquez Techera Sanabria Cruz Duarte Iglesias Zeballos
                   Bentancur Vecino Valverde Araujo Giacomino Cabral Cardona Barboza Casas Burgos Sánchez De_los_Santos`)
  },
  BOL: {
    nomes: L(`Marcelo Carlos Rodrigo Diego Jorge Miguel Luis Juan José Henry Ramiro Gilbert Erwin Leonel Jaime Roberto Daniel Mauricio Fernando Gabriel Danny Víctor Raúl Alejandro Boris
              Bruno Cristian Moisés Pablo Ronald Samuel Jesús Franz Limbert Ervin Rubén Juan_Carlos William Fabricio Alan Jhon Álvaro Ángel Marco Walter`),
    sobrenomes: L(`Quispe Mamani Flores Condori Choque Vargas Justiniano Saucedo Arce Roca Terceros Vaca Soliz Rojas Camacho Álvarez Méndez Zabala Chura Apaza Cuéllar Rodríguez Sánchez Gutiérrez
                   Cuéllar Ramallo Paz Lima Montaño Villarroel Suárez Escobar Zambrana Antelo Banegas Ortiz Peñaranda Arias Salvatierra Chávez Aguilar Callisaya Colque Huanca Ticona Vaca
                   Fernández Orellana Mercado Pinto Gonzales Ribera Cabrera Jiménez Guzmán Meneses Céspedes Egüez`)
  },
  VEN: {
    nomes: L(`José Luis Carlos Jhon Yeferson Darwin Ronald Edwin Jan Salomón Yangel Josef Jeriel Eduard Gabriel Daniel Diego Miguel Wuilker Néstor Juan Cristian Anthony Bryan Wilker Fernando
              Yohan Jorge Rómulo Gleiker Alexander Andrés Kevin Rafael Jovanny Franklin Eric Jesús Samuel Santiago Ángel Oswaldo Roberto Alexis Brayan Leonardo`),
    sobrenomes: L(`González Rodríguez Hernández Pérez García Ramírez Martínez Rondón Machís Osorio Rincón Soteldo Savarino Bello Córdova Ángel Castillo Ferreira Mago Lucena Marcano Herrera
                   Torres Chacón Contreras Medina Rojas Sánchez Mora Suárez Salazar Vargas Villalobos Pacheco Guerra Fernández Alvarado Zambrano Rivas Díaz Moreno Ortiz Marín Peña Navas
                   Colina Aranguren Quintero Barrios Camacho Figueroa Linares Meza Brito Yépez Bracho Ruiz Gómez`)
  },
  BRA: {
    nomes: L(`Gabriel Lucas Matheus Pedro João Rafael Bruno Felipe Gustavo Thiago Vinícius Diego Leandro Rodrigo Carlos Eduardo Marcelo Renato Fábio Wesley Wellington Ederson Jean Kauã Yuri
              Caio Henrique Igor Leonardo Murilo Davi Arthur Guilherme Nathan Otávio Allan Luan Willian Anderson Douglas Everton`),
    sobrenomes: L(`Silva Santos Oliveira Souza Lima Pereira Costa Ferreira Almeida Ribeiro Carvalho Gomes Martins Araújo Barbosa Rocha Moreira Nascimento Cardoso Teixeira Cavalcante Dias Correia
                   Monteiro Nunes Mendes Freitas Barros Batista Pinto Ramos Campos Machado Azevedo Duarte Lopes Moura Borges Fonseca Cunha Siqueira Andrade Vieira Brito`)
  }
};

module.exports = { NOMES };
