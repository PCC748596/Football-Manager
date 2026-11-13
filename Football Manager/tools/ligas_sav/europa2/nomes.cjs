/*
NOMES CARACTERISTICOS dos paises novos do grupo europa2 (os que ja existiam — Noruega, Paises Baixos, Turquia, Belgica, Grecia, Ucrania — ja tem os deles em
textSim/nomesPaises.ts). Nomes e sobrenomes COMUNS, sem nomes distintivos de jogadores famosos; o jogo combina nome + sobrenome. "_" = espaco dentro de um nome.
*/
const L = (s) => s.trim().split(/\s+/).map(x => x.replace(/_/g, ' '));

const NOMES = {
  DEN: {
    nomes: L(`Mads Mikkel Rasmus Frederik Mathias Jonas Oliver Lucas Emil Magnus Victor William Christian Anders Kasper Simon Nikolaj Andreas Jakob Thomas Martin Peter
      Morten Søren Jesper Rune Malthe Sebastian Tobias Gustav Oscar Alexander Nicolai Jeppe Laurits Asger Valdemar`),
    sobrenomes: L(`Jensen Nielsen Hansen Pedersen Andersen Christensen Larsen Sørensen Rasmussen Jørgensen Petersen Madsen Kristensen Olsen Thomsen Christiansen Poulsen
      Johansen Møller Mortensen Knudsen Jakobsen Mikkelsen Frederiksen Laursen Henriksen Lund Schmidt Holm Vestergaard Bach Dam Nørgaard Lauridsen Østergaard Kjær Bruun`)
  },
  FIN: {
    nomes: L(`Juho Eero Aleksi Joonas Ville Lauri Mikko Antti Jussi Teemu Samuli Onni Elias Leo Oskari Veeti Niklas Aapo Tuomas Matias Arttu Santeri Jere Roope
      Eetu Kalle Otto Väinö Iiro Henri Kasperi Topias Valtteri Aatu`),
    sobrenomes: L(`Korhonen Virtanen Mäkinen Nieminen Mäkelä Hämäläinen Laine Heikkinen Koskinen Järvinen Lehtonen Lehtinen Saarinen Salminen Heinonen Niemi Heikkilä
      Kinnunen Salonen Turunen Salo Laitinen Tuominen Rantanen Karjalainen Jokinen Mattila Savolainen Lahtinen Ahonen Hiltunen Leinonen Kallio Väisänen Peltonen`)
  },
  HUN: {
    nomes: L(`Bence Máté Levente Dávid Ádám Balázs Dániel Gergő Péter Tamás Zoltán Krisztián Norbert Roland Attila László Gábor Márk Milán Barnabás Botond Kristóf
      Patrik Richárd Szabolcs Viktor Marcell Olivér Zsolt Csaba Benedek Ákos`),
    sobrenomes: L(`Nagy Kovács Tóth Szabó Horváth Varga Kiss Molnár Németh Farkas Balogh Papp Takács Juhász Lakatos Mészáros Oláh Simon Rácz Fekete Szilágyi Török
      Fehér Balázs Gál Kis Szűcs Kocsis Orsós Pintér Fodor Szalai Sipos Magyar Lukács Gulyás Bíró Király`)
  },
  POL: {
    nomes: L(`Jakub Kacper Szymon Mateusz Bartosz Michał Filip Wiktor Dawid Kamil Patryk Damian Paweł Piotr Tomasz Krzysztof Łukasz Adrian Sebastian Karol Marcin
      Rafał Dominik Hubert Oskar Igor Maciej Wojciech Przemysław Konrad Adam Antoni`),
    sobrenomes: L(`Nowak Kowalski Wiśniewski Wójcik Kowalczyk Kamiński Lewandowicz Zieliński Szymański Woźniak Dąbrowski Kozłowski Jankowski Mazur Kwiatkowski Krawczyk
      Piotrowski Grabowski Nowakowski Pawłowski Michalski Nowicki Adamczyk Dudek Zając Wieczorek Jabłoński Król Majewski Olszewski Jaworski Wróbel Malinowski Pawlak
      Witkowski Walczak Stępień Górski Rutkowski`)
  },
  SCO: {
    nomes: L(`Jack James Lewis Ryan Callum Connor Kyle Liam Jamie Ross Scott Craig Euan Fraser Calum Lachlan Finlay Cameron Blair Hamish Rory Alasdair Ewan Kieran
      Greg Grant Stuart Andrew David Mark Paul Sean Aaron Josh Lennon Rhys`),
    sobrenomes: L(`Smith Brown Wilson Campbell Stewart Thomson Robertson Anderson MacDonald Scott Reid Murray Taylor Clark Ross Watson Morrison Paterson Young Mitchell
      Walker Fraser Miller McDonald Gray Henderson Hamilton Johnston Duncan Graham Ferguson Kerr Davidson Bell Cameron Kelly Martin Hunter Allan Grant MacKenzie McLean`)
  },
  SWE: {
    nomes: L(`William Liam Hugo Lucas Oliver Elias Alexander Oscar Adam Ludvig Axel Filip Viktor Gustav Isak Leo Emil Anton Albin Elias Erik Johan Karl Viktor Linus
      Jonathan Simon Anton Jesper Rasmus Hampus Melvin Noah Melker Sixten`),
    sobrenomes: L(`Andersson Johansson Karlsson Nilsson Eriksson Larsson Olsson Persson Svensson Gustafsson Pettersson Jonsson Jansson Hansson Bengtsson Jönsson
      Lindberg Jakobsson Magnusson Olofsson Lindström Lindqvist Lindgren Axelsson Berg Bergström Lundberg Lind Lundgren Lundqvist Mattsson Berglund Fredriksson Sandberg
      Henriksson Forsberg Sjöberg Wallin Engström Danielsson`)
  },
  SUI: {
    nomes: L(`Luca Noah Leon Nico Jan Fabian Simon Lukas David Elia Gian Livio Joel Silvan Cedric Kevin Pascal Yannick Florian Dario Andrin Nils Mattia Alessio
      Loris Bastien Théo Hugo Mathieu Rémy Arnaud Lorenzo Marco Gianluca`),
    sobrenomes: L(`Müller Meier Schmid Keller Weber Huber Schneider Meyer Steiner Fischer Gerber Brunner Baumann Frei Zimmermann Moser Widmer Wyss Graf Roth Bühler
      Gasser Kunz Rochat Favre Bovet Girard Dubois Monnier Python Bernasconi Rossi Ferrari Galli Lombardi Bianchi Hofer Lüthi Suter`)
  },
  WAL: {
    nomes: L(`Rhys Dylan Owen Gareth Dafydd Iwan Tomos Osian Gethin Huw Ieuan Rhodri Aled Cai Elis Ifan Morgan Evan Lewis Jack Ryan Jordan Callum Ben Liam Kieran
      Sion Llyr Steffan Harri Macsen Jac`),
    sobrenomes: L(`Jones Williams Davies Evans Thomas Roberts Lewis Hughes Morgan Griffiths Edwards Owen Price Rees Jenkins Lloyd Powell Phillips Morris James Pritchard
      Parry Bowen Watkins Pugh Vaughan Howells Llewellyn Prosser Probert Bevan Gwynne Meredith Pryce Hopkins Rowlands`)
  },
  AUS: {
    nomes: L(`Jack Oliver William Noah Thomas James Lucas Ethan Lachlan Cooper Riley Mason Liam Jacob Harrison Charlie Hunter Archie Max Jayden Bailey Connor Mitchell
      Brodie Callum Nathan Joshua Daniel Matthew Luke Tyler Jake Kai Hamish`),
    sobrenomes: L(`Smith Jones Williams Brown Wilson Taylor Johnson White Martin Anderson Thompson Nguyen Thomas Walker Harris Lee Ryan Robinson Kelly King Davis Wright
      Evans Roberts Green Hall Wood Jackson Clarke Patel Khan Lewis James Phillips Mitchell Hughes Edwards Turner Murphy Hill Papadopoulos Nikolic Kovac Rossi`)
  }
};

module.exports = { NOMES };
