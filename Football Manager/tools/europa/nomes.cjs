/*
NOMES CARACTERISTICOS DOS PAISES EUROPEUS (mais os que o gerador usa para os estrangeiros: Brasil e Argentina vem de ../latam/nomes.cjs). Listas de nomes e sobrenomes COMUNS
(nada de jogadores reais por inteiro); o gerador combina nome + sobrenome (as vezes um segundo nome ou sobrenome) e nunca repete um nome completo. Combinacoes casuais podem
coincidir com pessoas reais: os nomes poderao ser editados mais tarde. "_" = espaco dentro de um nome (ex.: Van_der_Berg).
*/
const L = (s) => s.trim().split(/\s+/).map(x => x.replace(/_/g, ' '));

const NOMES = {
  ENG: {
    nomes: L(`Jack Harry Oliver George Charlie Jacob Thomas Oscar William James Henry Leo Alfie Archie Joshua Freddie Ethan Samuel Daniel Joseph Mason Callum Connor Ryan Declan Kieran Jordan Marcus Reece
              Phil Mason Jude Bukayo Cole Kyle Trent Aaron Ben Luke Tyrone Conor Jamie Lewis Nathan Liam Adam Danny Ollie Ricky Sam Tommy Billy Ross Kane Jadon`),
    sobrenomes: L(`Smith Jones Taylor Brown Williams Wilson Johnson Davies Robinson Wright Thompson Evans Walker White Roberts Green Hall Wood Jackson Clarke Patel Khan Lewis Harris Turner Hill Cooper
                   Morgan Bennett Cook Murphy Bailey Ward Collins Campbell Hughes Fletcher Palmer  Rice  Walsh Mount  Henderson Maguire Stones  Gordon   Bowen
                    Gallagher Mitchell Dunn Barnes Allen Hunt Marsh Reid Booth Pearce Kelly Webster Burton Hayes Shaw Rogers Lloyd Ashton Holt Carter Mills Bell Fox`)
  },
  ESP: {
    nomes: L(`Alejandro Pablo Álvaro Daniel David Adrián Javier Sergio Carlos Miguel Jorge Rubén Iván Raúl Diego Marcos Hugo Mario Gonzalo Fernando Álex Nacho Dani Pedri Gavi Unai Mikel Aitor Iker
              Ferran Marc Joan Jesús Víctor Rodrigo Santi Isco Borja Kike Ander Oihan Asier Yeray Lucas Pau Fermín Abel Nico Pol Antonio Manuel Francisco José_Luis Juan Roberto Samu`),
    sobrenomes: L(`García Fernández González Rodríguez López Martínez Sánchez Pérez Gómez Martín Jiménez Ruiz Hernández Díaz Moreno Muñoz Álvarez Romero Alonso Gutiérrez Navarro Torres Domínguez Vázquez
                   Ramos Gil Ramírez Serrano Blanco Molina Morales Suárez Ortega Delgado Castro Ortiz Rubio Marín Sanz Núñez Iglesias Medina Garrido Cortés Castillo Santos Lozano Guerrero Cano Prieto
                   Méndez Cruz Calvo Gallego Vidal León Márquez Herrera Peña Flores Cabrera Campos Vega Fuentes Carrasco Diez Caballero Nieto Reyes Aguilar Pascual Santana Herrero Lorenzo Hidalgo
                   Urrutia Etxeberria Goikoetxea Agirre  Olaizola Iturralde Mendizábal Puig Soler Ferrer Vila Roca Costa Pons Serra Mas Bosch Font`)
  },
  GER: {
    nomes: L(`Lukas Leon Jonas Finn Noah Luca Felix Tim Maximilian Paul Niklas Jan Philipp Moritz Florian Tobias David Julian Kai Leon Marvin Nico Sebastian Fabian Jannik Robin Timo Benedikt Dominik
              Matthias Stefan Thomas Christian Michael Andreas Marcel Patrick Lars Henrik Jamal Joshua Kevin Serge Leroy Karim Leon Mats Antonio Manuel Thilo Jonathan Waldemar Ridle Aleksandar`),
    sobrenomes: L(`Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Schäfer Koch Bauer Richter Klein Wolf Schröder Neumann Schwarz Zimmermann Braun Krüger Hofmann Hartmann Lange
                   Schmitt Werner Schmitz Krause Meier Lehmann Schmid Schulze Maier Köhler Herrmann König Walter Mayer Huber Kaiser Fuchs Peters Lang Scholz Möller Weiß Jung Hahn Schubert Vogel Friedrich
                   Keller Günther Frank Berger Winkler Roth Beck Lorenz Baumann Franke Albrecht Schuster Simon Ludwig Böhm Winter Kraus Martin Schumacher Krämer Vogt Stein Jäger Otto Sommer Groß Seidel
                   Brandt Haas Schreiber Graf Schulte Dietrich Ziegler Kuhn Kühn Pohl Engel Horn Busch Bergmann Thomas Voigt Sauer Arnold Wolff Pfeiffer      Goretzka`)
  },
  ITA: {
    nomes: L(`Francesco Alessandro Lorenzo Andrea Matteo Gabriele Riccardo Davide Marco Leonardo Federico Simone Giuseppe Antonio Luca Stefano Nicolò Giacomo Mattia Samuele Edoardo Tommaso Filippo Emanuele
              Gianluca Domenico Salvatore Fabio Cristian Daniele Alberto Roberto Paolo Michele Vincenzo Massimo Claudio Enrico Manuel Sandro Giovanni Pietro Bryan Mario Ciro Dario Raffaele`),
    sobrenomes: L(`Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De_Luca Mancini Costa Giordano Rizzo Lombardi Moretti Barbieri Fontana Santoro Mariani Rinaldi
                   Caruso Ferrara Galli Martini Leone Longo Gentile Martinelli Vitale Lombardo Serra Coppola De_Santis D'Angelo Marchetti Parisi Villa Conte Ferraro Ferri Fabbri Bianco Marini Grasso Valentini
                   Messina Sala De_Angelis Gatti Pellegrini Palumbo Sanna Farina Rizzi Monti Cattaneo Morelli Amato Silvestri Mazza Testa Grassi Pellegrino Carbone Giuliani Benedetti Barone Rossetti
                   Caputo Montanari Guerra Palmieri Bernardi Martino Fiore De_Rosa Ferretti Bellini Basile Riva Donati Piras Vitali Battaglia Sartori Neri Costantini Milani Pagano Ruggiero Sorrentino`)
  },
  FRA: {
    nomes: L(`Lucas Hugo Léo Louis Gabriel Jules Adam Arthur Nathan Raphaël Théo Enzo Mathis Maxime Antoine Clément Kylian Ousmane Aurélien Eduardo Dayot Jonathan Mathieu Romain Florian Quentin Alexandre
              Nicolas Thomas Pierre Baptiste Corentin Valentin Rayan Ibrahima Moussa Youssouf Amine Karim Yann Benoît Sébastien Bastien Rémi Axel Tanguy Morgan Alexis Anthony Jordan Steven Wesley`),
    sobrenomes: L(`Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent Lefebvre Michel Garcia David Bertrand Roux Vincent Fournier Morel Girard André Lefèvre Mercier Dupont
                   Lambert Bonnet François Martinez Legrand Garnier Faure Rousseau Blanc Guerin Muller Henry Roussel Nicolas Perrin Morin Mathieu Clement Gauthier Dumont Lopez Fontaine Chevalier Robin
                   Masson Sanchez Gerard Nguyen Boyer Denis Lemaire Duval Joly Gautier Roger Roche Roy Noel Meyer Lucas Meunier Jean Perez Marchand Dufour Blanchard Marie Barbier Brun Dumas Brunet
                   Schmitt Leroux Colin Fernandez Pierre Renard Arnaud Rolland Caron Aubert Giraud Leclerc Vidal Bourgeois Renaud Lemoine Picard Gaillard Philippe Leclercq Lacroix Fabre Dupuis Olivier
                   Diallo Traoré Camara Koné Diop Sow Cissé Sylla Bamba Touré Konaté Doucouré Sissoko       Coman Kolo`)
  },
  NOR: {
    nomes: L(`Erling Martin Ole Kristian Sander Jonas Henrik Andreas Magnus Fredrik Mathias Markus Sondre Torbjørn Håkon Eirik Even Aleksander Tobias Sebastian Mats Joachim Per Lars Anders Jørgen Morten
              Stian Vegard Tarik Patrick Thelo Leo Julian Oscar Ulrik Rune Bjørn Svein Trond Espen Kjetil Ruben Elias Emil Nikolai Gustav Ask Birk Sigurd Sverre Mohammed`),
    sobrenomes: L(`Hansen Johansen Olsen Larsen Andersen Pedersen Nilsen Kristiansen Jensen Karlsen Johnsen Pettersen Eriksen Berg Haugen Hagen Johannessen Andreassen Jacobsen Dahl Jørgensen Halvorsen
                   Henriksen Lund Sørensen Jakobsen Moen Gundersen Iversen Strand Solberg Svendsen Eide Knutsen Martinsen Paulsen Bakken Kristoffersen Mathisen Lie Amundsen Nguyen Rasmussen Ali
                       Berge     Ryerson Nyland Ajer Meling Østigård Hauge Bobb Heggem Strandberg Wolfe Brynhildsen Fet Gjesdal`)
  },
  NED: {
    nomes: L(`Daan Sem Luuk Bram Milan Finn Jesse Lars Thijs Ruben Tim Mees Gijs Stijn Sven Niels Joey Rick Jasper Jurriën Matthijs Virgil Frenkie Cody Denzel Xavi Memphis Donyell Jerdy Teun Steven Ryan
              Quinten Noa Jan Pieter Dirk Koen Wout Bart Maarten Hidde Nathan Mats Ricardo Justin Ilias Georginio Tijjani Joshua Lutsharel Kenneth Jordy Calvin`),
    sobrenomes: L(`De_Jong Jansen De_Vries Van_den_Berg Van_Dijk Bakker Janssen Visser Smit Meijer De_Boer Mulder De_Groot Bos Vos Peters Hendriks Van_Leeuwen Dekker Brouwer De_Wit Dijkstra Smits
                   De_Graaf Van_der_Meer Van_der_Linden Kok Jacobs De_Haan Vermeulen Van_den_Heuvel Van_der_Veen Van_den_Broek De_Bruijn De_Bruin Van_Dam Schouten Van_Beek Willems Van_Vliet
                   Hoekstra Maas Verhoeven Koster Prins Huisman Peeters Kuipers Gerritsen Veenstra Timmermans Wouters Bosman Veldhuis Zwart Postma Dijk Pauw  Simons   Schouten
                   Veerman Til Perišić Lang Flamingo  Smal Dest Ferrari Sauer Paixão Hartman Bijlow Wellenreuther Zerrouki  Wieffer  Trauner  Hato`)
  },
  POR: {
    nomes: L(`João Pedro Tiago Diogo Rui Bruno Rafael Miguel André Gonçalo Francisco Ricardo Nuno Hugo Fábio Ruben Vítor Gil Rodrigo Tomás Afonso Duarte Martim Leandro Paulo Sérgio Carlos Luís Daniel
              Danilo Otávio Nélson Domingos Zé Jota Vitinha Palhinha Trincão Gedson Fábio Pote Moura Samu Galeno Evanilson Wendell Nico Marcus Eustáquio Pepê Alan`),
    sobrenomes: L(`Silva Santos Ferreira Pereira Oliveira Costa Rodrigues Martins Jesus Sousa Fernandes Gonçalves Gomes Lopes Marques Alves Almeida Ribeiro Pinto Carvalho Teixeira Moreira Correia Mendes
                   Nunes Soares Vieira Monteiro Cardoso Rocha Raposo Neves Coelho Cruz Cunha Pires Ramos Reis Simões Antunes Matos Fonseca Machado Araújo Barros Freitas Baptista Henriques Tavares
                   Moura Azevedo Lima Borges Campos Faria Cabral Morais Guerreiro Leite Magalhães Rebelo Valente Brandão Esteves Veiga Salgado Cavaco Seabra Varela Andrade Bastos Vaz Matias`)
  },
  TUR: {
    nomes: L(`Mehmet Mustafa Ahmet Ali Hüseyin Hasan İbrahim Ömer Yusuf Emre Burak Can Cenk Arda Kerem Enes Barış Okan Selçuk Kaan Orkun Ferdi Hakan Mert Berkay Efe Bora Furkan Tolga Uğurcan Zeki Cengiz
              Irfan Oğuz Yunus Salih Taylan Deniz Eren Alperen Semih Rıdvan Atakan Muhammed Bilal Abdülkadir Metehan Ismail Samet Volkan Gökhan Nuri Ozan Tarık Süleyman Murat`),
    sobrenomes: L(`Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Kara Koç Kurt Özkan Şimşek Polat Korkmaz Özer Çakır Erdoğan Yavuz Can Acar Şen Aksoy
                   Güneş Aktaş Tekin Bulut Güler Karaca Ateş Çiftçi Ünal Sönmez Gündoğdu Tunç Duran Taş Bozkurt Akın Türkmen Avcı Keskin Işık Eren Sarı Kaplan Güven Bayram Uysal Soylu  
                      Akgün   Ayhan Uçan Türüç  Çağlar Meras Barışık Kutlu Tosun Doğan Karagöz Bardakcı Kabak Ayyıldız Zorlu  Sivok Mertens`)
  },
  AUT: {
    nomes: L(`Lukas Jakob Maximilian David Tobias Florian Felix Simon Julian Alexander Daniel Dominik Michael Stefan Thomas Christoph Philipp Marco Patrick Matthias Sebastian Konrad Marcel Nicolas Kevin Xaver
              Stefan Christian Martin Andreas Peter Manuel Niklas Raphael Mario Patrik Gernot Heinz Reinhold Paul Valentin Fabio Leo Elias Noah Emanuel Roman Karim Nikola`),
    sobrenomes: L(`Gruber Huber Bauer Wagner Müller Pichler Steiner Moser Mayer Hofer Leitner Berger Fuchs Eder Fischer Schmid Winkler Weber Schwarz Maier Schneider Reiter Mayr Schmidt Wimmer Egger Brunner
                   Lang Baumgartner Auer Binder Lechner Wolf Wallner Aigner Ebner Koller Lehner Haas Schuster Mair Holzer Fuchs Bauer Kraus Posch Hackl Hartl Stadler Gasser Prinz Seidl Kainz 
                    Baumgartner   Schlager  Wöber Posch Danso Lienhart Trauner Gregoritsch Schmid Grillitsch Schopp Kalajdžić Weimann Wimmer Querfeld Svoboda`)
  },
  AZE: {
    nomes: L(`Elvin Rashad Rauf Orkhan Elnur Vusal Ramil Tural Emin Samir Kamran Murad Ali Nijat Namiq Elshan Mahir Eldar Anar Ruslan Ilkin Rahman Javid Farid Ruslan Mirabdulla Ayaz Nihat Bakhtiyar Ulvi
              Vugar Zaur Aghabala Tamerlan Ramazan Elchin Cavid Salman Aydin Turan Mahammad Pasha Ismayil Sabuhi`),
    sobrenomes: L(`Mammadov Aliyev Hasanov Huseynov Ismayilov Abdullayev Guliyev Rzayev Mustafayev Najafov Safarov Karimov Ibrahimov Jafarov Bayramov Sadiqov Nasirov Valiyev Quliyev Rahimov Mirzayev
                   Allahverdiyev Hajiyev Alasgarov Imamverdiyev Yusifov Shahbazov Kerimov Mahmudov Zeynalov Aghayev Salayev Bahramov Garayev Mehdiyev Gurbanov Hamidov Shukurov Asgarov Dadashov Nuriyev`)
  },
  BEL: {
    nomes: L(`Lucas Noah Louis Liam Arthur Jules Victor Adam Thomas Maxime Jonas Kevin Thorgan Romelu Youri Dries Leandro Axel Hans Simon Timothy Michel Siebe Brandon Christian Joris Mats Dante Zeno Koni
              Hugo Wout Bart Tom Jan Pieter Dennis Yari Nathan Aster Raphael Gaëtan Sander Casper Bjorn Matthias Maarten Nick Senne Stef Ardon Isaac`),
    sobrenomes: L(`Peeters Janssens Maes Jacobs Mertens Willems Claes Goossens Wouters De_Smet Dubois Lambert Martin Dumont Leclercq Lejeune Hermans Vermeulen Michiels Aerts De_Backer Hendrickx Stevens
                   Vandenberghe Van_Damme Verbruggen Pauwels Desmet Smets Claeys Segers Cools Lemmens Bogaert Dewulf Van_de_Velde Coppens Bosmans Verhaegen Huybrechts De_Cock Jansen Wauters
                            Meunier Castagne  Theate Faes Mechele Vanaken Rits Spileers Jutglà Sowah Stankovic
                   Nielsen Tzolis Ordóñez Skov Diatta Hotić Vetlesen Hoedt Sandra Vermant Onyedika Lang Forbs Stanković`)
  },
  SVK: {
    nomes: L(`Marek Peter Martin Tomáš Lukáš Michal Juraj Ján Jakub Dávid Adam Filip Patrik Róbert Miroslav Matúš Samuel Dominik Vladimír Ondrej Stanislav Milan Pavol Branislav Erik Šimon Richard Roman
              Maroš Ivan Viktor Denis Tibor Alexander Kristián Szabolcs Bence Oliver Tobias Rastislav Ľubomír Jozef Ladislav Eduard Dušan Andrej`),
    sobrenomes: L(`Horváth Kováč Varga Tóth Nagy Baláž Szabó Molnár Balog Lukáč Novák Oravec Gajdoš Kollár Hudák Polák Kubík Šimko Černák Sloboda Mikuš Kováčik Urban Marcinko Hrnčár Bednár Čech Kutiš
                   Králik Mazáň Duda   Hancko Kucka   Schranz Bero Gyömbér Vavro Valjent Rigo Hrošovský Mak Mráz Šatka Ďuriš Chrien Kozák Lacko Pauschek`)
  },
  GRE: {
    nomes: L(`Giorgos Dimitris Nikos Konstantinos Ioannis Panagiotis Christos Vasilis Thanasis Alexandros Stefanos Michalis Sotiris Kostas Anastasios Manolis Lazaros Giannis Petros Pantelis Aris Fotis
              Tasos Marios Andreas Theodoros Spyros Efthymis Orestis Lefteris Zisis Dionysis Kyriakos Antonis Stelios Evangelos Vangelis Charalampos Pavlos Argyris`),
    sobrenomes: L(`Papadopoulos Vlachos Georgiou Dimitriou Papadakis Karagiannis Nikolaidis Konstantinou Ioannou Oikonomou Papageorgiou Makris Antoniou Alexiou Vasiliou Pappas Kyriakou Michailidis
                   Panagiotou Athanasiou Theodorou Christodoulou Mavridis Angelopoulos Petridis Stavrou Lazaridis Sotiriou Andreadis Giannakopoulos Zografos Karamanlis Siopis 
                       Ioannidis Hatzidiakos Retsos Vagiannidis Zivkovic Pavlidis Mavrias Kourbelis Douvikas Koulierakis Svarnas Strakosha Bouchalakis`)
  },
  CZE: {
    nomes: L(`Jakub Jan Tomáš Lukáš Martin Ondřej David Vojtěch Matěj Adam Filip Petr Michal Pavel Jiří Josef Daniel Marek Antonín Patrik Radek Roman Václav Zdeněk Aleš Dominik Lubomír Karel Ladislav
              Miroslav Vladimír Štěpán Šimon Denis Erik Tadeáš Vít Kryštof Samuel Prokop Rostislav Oldřich Bohumil`),
    sobrenomes: L(`Novák Svoboda Novotný Dvořák Černý Procházka Kučera Veselý Horák Němec Marek Pospíšil Pokorný Hájek Král Jelínek Růžička Beneš Fiala Sedláček Doležal Zeman Kolář Navrátil Čermák Urban
                   Vaněk Blažek Kříž Kovář Bartoš Vlček Polák Musil Kopecký Šimek Konečný Malý Holub Čech Staněk Štěpánek Kadlec Sýkora Souček Coufal Barák Provod Holeš Kuchta Zima Chaloupek
                   Chytil Jurásek Vlkanova Hrošovský Lingr Doudera Schranz Sadílek Bořil Ševčík Jurečka Kušej Tomič Zafeiris Moses Olatunji Chorý   Kalvach Provod Mihálik`)
  },
  UKR: {
    nomes: L(`Oleksandr Andriy Serhiy Dmytro Volodymyr Mykola Viktor Ihor Oleh Artem Taras Roman Bohdan Maksym Vasyl Yaroslav Denys Vitaliy Ruslan Mykhailo Danylo Anatoliy Yuriy Pavlo Illia Nazar
              Kyrylo Oleksiy Stanislav Heorhiy Vladyslav Eduard Valentyn Markiyan Zakhar Tymofiy Ivan Leonid Vadym Bohdan Mykyta Yevhen Radion Marko`),
    sobrenomes: L(`Melnyk Shevchenko Boyko Kovalenko Bondarenko Tkachenko Kovalchuk Kravchenko Oliynyk Shevchuk Koval Polishchuk Bondar Tkachuk Moroz Marchenko Lysenko Rudenko Savchenko Petrenko
                   Mykhailenko Karpenko Lytvynenko Panchenko Zinchenko        Matviyenko Konoplya Bondar Traoré Bondarenko Kryskiv
                   Heorhiyevskyi Zubkov Bolbat Pikhalyonok Shaparenko Mykhaylychenko Kabaev Vanat Sikan Shved Hlushchenko Bukhal Neshcheret     Syrota`)
  }
};

module.exports = { NOMES };
