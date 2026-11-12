/*
NOMES CARACTERISTICOS dos paises do grupo africa_asia, para os jogadores GERADOS (tools/gerar_ligas_sav.cjs copia-os para textSim/nomesPaises.ts). Nomes e sobrenomes COMUNS,
nada de jogadores reais por inteiro; o jogo combina nome + sobrenome. Paises com a mesma tradicao partilham listas (Magrebe, Golfo). "_" = espaco dentro de um nome.
*/
const L = (s) => s.trim().split(/\s+/).map(x => x.replace(/_/g, ' '));

const EGITO = {
  nomes: L(`Mohamed Ahmed Mahmoud Mostafa Omar Ali Hassan Hussein Karim Amr Tarek Youssef Islam Khaled Hossam Walid Sherif Ayman Hamdi Ramadan Emad Akram Ibrahim Marwan Ziad
    Abdallah Mahmoud Ahmed_Sayed Eslam Nasser Sayed Hany Saber Osama Taher Adel Wael Haitham Bassem Fathy Gamal`),
  sobrenomes: L(`Hassan Mohamed Ali Ibrahim Mahmoud Mostafa Abdelrahman Fathy Hamdy Gaber Salah Samir Shawky Abdelaziz Abdelhamid Saad Ashraf Kamal Farouk Fawzy Zaki Ramadan Sobhi
    El-Sayed Hamed Abdelmoneim Yassin Hamouda Soliman Tawfik Nabil Magdy Nagy Shehata Wahba Zidan Radwan Hosny Lotfy Morsy Gomaa Badawi Ghanem Shaker Taha Atef Osman`)
};
const MAGREBE = {
  nomes: L(`Mohamed Youssef Ayoub Hamza Achraf Yassine Amine Anas Ilias Zakaria Oussama Soufiane Bilal Mehdi Adam Nabil Karim Hakim Rachid Abdelkader Ismail Walid Sofiane Riyad
    Islam Ramy Haithem Seifeddine Ghaith Aymen Wajdi Hamdi Fedi Taha Nassim Fares Mounir Abdelhak Redouane Badr Imad Reda`),
  sobrenomes: L(`Benali Bennani Alaoui El_Idrissi Tazi Berrada Chraibi Bouzidi Mansouri Haddad Belhadj Benyoussef Ziani Belkacem Chaouch Belkacemi Saidi Hamdani Kaddouri Laaroussi
    Ouahbi Amrani El_Amrani Lahlou Rahmouni Boudiaf Mebarki Ferhat Kherbouche Messaoudi Abdellaoui Chakir Najjar Jaziri Trabelsi Ben_Salah Mejri Hamrouni Sassi Ayari
    Ben_Amor Gharbi Jebali Bouazizi Touati Selmi Hannachi`)
};
const GOLFO = {
  nomes: L(`Abdullah Mohammed Fahad Saud Khalid Sultan Faisal Turki Nawaf Salem Saleh Abdulrahman Ali Omar Hamad Yousef Nasser Majed Hassan Mubarak Rashid Ahmed Ibrahim Mansour
    Hamdan Saif Khalifa Jassim Hamza Ziyad Musab Bader Talal Hazza Rakan Meshal Abdulaziz Yasser`),
  sobrenomes: L(`Al-Otaibi Al-Ghamdi Al-Qahtani Al-Shahrani Al-Dosari Al-Harbi Al-Zahrani Al-Mutairi Al-Anazi Al-Shamrani Al-Malki Al-Juhani Al-Subaie Al-Hamdan Al-Rashidi
    Al-Kaabi Al-Mansoori Al-Hammadi Al-Shamsi Al-Nuaimi Al-Mazrouei Al-Dhaheri Al-Suwaidi Al-Hosani Al-Marri Al-Kuwari Al-Hajri Al-Naimi Al-Mohannadi Al-Sulaiti Al-Hashimi
    Al-Ali Al-Ahmad Al-Yami Al-Bishi Al-Faraj Al-Najjar Al-Sahli`)
};

const NOMES = {
  EGY: EGITO,
  MAR: MAGREBE, ALG: MAGREBE, TUN: MAGREBE,
  KSA: GOLFO, UAE: GOLFO, QAT: GOLFO,
  RSA: {
    nomes: L(`Thabo Sipho Themba Lebo Bongani Siyabonga Mandla Kagiso Thulani Lucky Teboho Tebogo Katlego Sibusiso Vusi Lwazi Mthunzi Nkosinathi Andile Lungelo Sfiso Thato
      Neo Tshepo Karabo Junior Brandon Keagan Ethan Grant Aubrey Patrick Mihlali Ofentse Sizwe Musa Tumelo`),
    sobrenomes: L(`Nkosi Dlamini Mokoena Khumalo Ndlovu Mahlangu Zulu Mathebula Sithole Cele Mthembu Ngcobo Mabaso Molefe Radebe Shabalala Masilela Mkhize Ntuli Buthelezi
      Mofokeng Maluleka Modise Mashego Morena Motaung Sibiya Hlongwane Zwane Moloi Mbatha Petersen Williams Adams Daniels Jacobs Smith Botha`)
  },
  TAN: {
    nomes: L(`Juma Hamisi Abdallah Saidi Rashidi Ally Bakari Omari Shabani Ramadhani Salum Mussa Idrissa Ibrahim Kelvin Clement Elias Hassan Nassoro Yusuph Ismail Haji
      Erasto Himid Dickson Abdul Simon Zawadi Baraka Amani Furaha Jabiri`),
    sobrenomes: L(`Mohamed Juma Hamisi Mwinyi Mwakalebela Mwakyusa Mwasomola Ngowi Chacha Mkumbo Mwakasege Kimaro Mrisho Kibaya Mwakatobe Mapunda Mwakapuja Kitwana Lyimo Matola Mwita
      Seif Mfaume Kombo Mbwana Hussein Msoka Kilima Mkwawa Saidi Ngowi Massawe Shayo Mushi Lema Swai`)
  },
  COD: {
    nomes: L(`Jean Patrick Glody Merveille Junior Fiston Dieumerci Héritier Christian Trésor Ricky Joël Jonathan Arsène Chancel Cédric Exaucé Grâce Elie Mike Ben Yannick Hervé
      Serge Jordan Gloire Ricardo Prince Josué Emmanuel Chadrack Benjamin`),
    sobrenomes: L(`Mbuyamba Kabongo Mukoko Kalonji Tshibola Ilunga Mulumba Kasongo Mpoyi Kabeya Mavungu Mulenda Kayembe Ngoy Mukendi Tshimanga Banza Lukusa
      Mbuyi Kanku Tshiyombo Kibonge Makiadi Lusamba Nsimba Bompunga Kalala Mutombo Kitenge Mwamba Ngandu`)
  },
  ANG: {
    nomes: L(`João Manuel António José Pedro Paulo Carlos Domingos Francisco Mateus Isaac Hugo Jonathan Wilson Dany Nelson Ary Augusto Rui Alberto
      Jacinto Edson Adilson Cristiano Tiago Bruno Hélder Lucas Gilberto`),
    sobrenomes: L(`Silva Santos Fernandes Domingos Francisco Manuel Neto Mateus Cabral Lopes Costa Dala Kiala Mabiala Kiluanje Catumbela Bento Pinto Sebastião Gaspar Tavares
      Mendes Lourenço Afonso Vieira Quintas Mavinga Nzau Sambo Cassule Kapanga Mbanza Muanza`)
  },
  GHA: {
    nomes: L(`Kwame Kofi Kwabena Kwaku Yaw Kojo Kwasi Kwadwo Emmanuel Isaac Daniel Samuel Joseph Prince Richard Ebenezer Godfred Felix Seth Mohammed Abdul Ibrahim Rashid
      Nana Kelvin Benjamin Eric Collins Augustine Michael Jonathan Patrick Mubarak`),
    sobrenomes: L(`Mensah Asante Owusu Boateng Osei Agyemang Addo Ofori Appiah Darko Amoah Ansah Adjei Badu Danso Frimpong Gyan Kumah Nkrumah Opoku Quaye Sarpong Tetteh Yeboah
      Acquah Amankwah Annan Baffour Boakye Antwi Asamoah Bonsu Nyarko Salifu Issah Abubakar`)
  },
  CIV: {
    nomes: L(`Koffi Yao Konan Kouassi Kouadio Amani Ange Serge Jean Didier Franck Christian Arnaud Wilfried Sébastien Stéphane Hervé Max Junior Seydou Ibrahim Moussa Karim
      Lassina Mamadou Souleymane Abdoulaye Brice Cédric Jérémie Simon Evrard`),
    sobrenomes: L(`Kouamé Koné Coulibaly Traoré Ouattara Bamba Diallo Touré Kouassi Yao Konan N'Guessan Kouadio Gnagnon Aké Zahui Kouakou Doumbia Fofana Gnahoré Kouamé Tanoh
      Diomandé Sangaré Cissé Bakayoko Dagnogo Tia Zoro Akpa Kacou Dja Djédjé Gnohéré`)
  },
  MLI: {
    nomes: L(`Moussa Mamadou Amadou Ibrahim Seydou Adama Boubacar Souleymane Abdoulaye Oumar Lassana Cheick Youssouf Modibo Bakary Drissa Sekou Mahamadou Ousmane Kalifa
      Yacouba Massiré Aliou Hamidou Salif Issa Fousseni Siaka Nouhoum Yves Djibril`),
    sobrenomes: L(`Traoré Diarra Keïta Coulibaly Konaté Cissé Sissoko Touré Doumbia Sidibé Diallo Maïga Dembélé Kanouté Camara Samaké Bagayoko Sangaré Kouyaté Diakité Haïdara
      Koné Tounkara Fofana Niaré Dramé Sylla Ballo Diabaté Sacko Thiam Kané Soumaré`)
  },
  KOR: {
    nomes: L(`Min-jun Seo-jun Do-yoon Ye-jun Si-woo Ha-jun Ji-ho Jun-seo Hyun-woo Ji-hoon Jae-sung Sung-min Dong-hyun Young-woo Jin-su Tae-hwan Seung-ho Kyung-won Hyun-jun
      Woo-young Jae-won Min-kyu Sang-ho Joon-ho Dae-won Jun-hyuk Min-seok Tae-yang Ho-jin Yong-woo Sung-jin Jun-young Seung-woo`),
    sobrenomes: L(`Kim Lee Park Choi Jung Kang Cho Yoon Jang Lim Han Oh Seo Shin Kwon Hwang Ahn Song Jeon Hong Yoo Ko Moon Yang Son Bae Baek Heo Nam Noh Ha Kwak Sung Cha Joo Woo Min`)
  },
  IRN: {
    nomes: L(`Mohammad Ali Reza Hossein Mehdi Amir Saeed Hamid Majid Morteza Mojtaba Milad Ehsan Vahid Sajjad Omid Arash Payam Karim Ramin Alireza Mohammadreza Saman
      Sadegh Mehrdad Rouzbeh Danial Kaveh Farshad Ahmad Masoud Sina Behnam Hadi Yasin`),
    sobrenomes: L(`Hosseini Mohammadi Rezaei Ahmadi Karimi Moradi Jafari Rahimi Ghasemi Hashemi Mousavi Kazemi Sadeghi Ebrahimi Nazari Asadi Bagheri Amiri Shahbazi Ansari
      Nouri Rostami Salehi Zamani Karami Farahani Gholami Akbari Heidari Mahmoudi Safari Torabi Yazdani Abbasi Esmaeili Soltani`)
  }
};

module.exports = { NOMES };
