/* SneakPlay – Kartendecks mit verbotenen Wörtern (Erklär-Modus), Mathe-Decks
   nach den Leitideen des Kerncurriculums, Schul-Themen und -Missionen,
   Mathe-Aufgaben für die Wort-Bombe.

   Karte: "Begriff|verboten1,verboten2,verboten3,verboten4|Niveau|ähnlicher Begriff"
   Niveau 1 = Klasse 5–6, 2 = bis Klasse 8, 3 = bis Klasse 10.
   Der ähnliche Begriff dient der Hochstapler-Variante „Ähnlicher Begriff“.
   Mathe-Decks und „Schule“ stehen auch im Hochstapler-Modus zur Wahl. */
"use strict";

const DECK_GENERAL = ["ex_everyday", "ex_animals", "ex_food", "ex_leisure", "ex_school"];
const DECK_MATH = ["m_numbers", "m_measures", "m_space", "m_functions", "m_data"];
/* Fächer Deutsch und Englisch (nur in der deutschen Fassung; Englisch-Karten
   sind auf Englisch und werden auf Englisch erklärt) */
const DECK_GERMAN = ["d_language", "d_texts"];
const DECK_ENGLISH = ["e_everyday", "e_countries", "e_grammar"];
const DECK_ICON = { d_language: "✏️", d_texts: "📚", e_everyday: "💬", e_countries: "🌍", e_grammar: "📘", ex_everyday: "🏠", ex_animals: "🦒", ex_food: "🍕", ex_leisure: "🎳", ex_school: "🏫", m_numbers: "🔢", m_measures: "📏", m_space: "📐", m_functions: "📈", m_data: "🎲" };

const DECKS_RAW = {
  de: {
    d_language: ["Sprache & Grammatik", [
      "Nomen|Hauptwort,Namenwort,großschreiben,Artikel|1|Verb", "Verb|Tunwort,Tätigkeit,Zeitwort,beugen|1|Nomen", "Adjektiv|Eigenschaftswort,beschreiben,wie,steigern|1|Adverb",
      "Artikel|der,die,das,Begleiter|1|Pronomen", "Plural|Mehrzahl,viele,Einzahl,mehrere|1|Singular", "Silbe|klatschen,Wortteil,trennen,Silbenbogen|1|Buchstabe",
      "Vokal|Selbstlaut,a,e,i|1|Konsonant", "Wörterbuch|nachschlagen,Alphabet,Rechtschreibung,Duden|1|Lexikon", "Satzzeichen|Punkt,Komma,Fragezeichen,Ausrufezeichen|1|Anführungszeichen",
      "Steigerung|Komparativ,Superlativ,am,besser|1|Vergleich", "Reim|klingen,gleich,Gedicht,Ende|1|Silbe", "Ausrufezeichen|Satzzeichen,rufen,Befehl,Punkt|1|Fragezeichen",
      "Pronomen|Fürwort,ich,er,ersetzen|2|Artikel", "Präposition|Verhältniswort,auf,unter,mit|2|Konjunktion", "Subjekt|Satzglied,wer,Satzgegenstand,handelt|2|Objekt",
      "Prädikat|Satzaussage,Verb,Satzglied,tun|2|Subjekt", "Akkusativ|Fall,wen,vierter,Objekt|2|Dativ", "Dativ|Fall,wem,dritter,Objekt|2|Akkusativ",
      "Präteritum|Vergangenheit,Zeitform,ging,erzählen|2|Perfekt", "Perfekt|Vergangenheit,haben,sein,Zeitform|2|Präteritum", "Konjunktion|Bindewort,und,weil,verbinden|2|Präposition",
      "Nebensatz|Hauptsatz,Komma,weil,Verb|2|Hauptsatz", "Wortfamilie|Wortstamm,verwandt,gleich,Wörter|2|Wortfeld", "Imperativ|Befehlsform,Aufforderung,Ausrufezeichen,komm|2|Infinitiv",
      "Konjunktiv|Möglichkeit,wäre,hätte,indirekt|3|Imperativ", "Passiv|Aktiv,werden,Leideform,Handlung|3|Aktiv", "Relativsatz|der,welcher,Nebensatz,beziehen|3|Nebensatz",
      "Genitiv|Fall,wessen,zweiter,Besitz|3|Dativ", "Plusquamperfekt|Vorvergangenheit,hatte,Zeitform,vorher|3|Perfekt", "Fremdwort|Sprache,fremd,Herkunft,Englisch|3|Fachbegriff"]],
    d_texts: ["Texte & Literatur", [
      "Märchen|Es war einmal,Prinzessin,Hexe,Grimm|1|Fabel", "Fabel|Tiere,Lehre,sprechen,Moral|1|Märchen", "Gedicht|Reim,Strophe,Vers,Lyrik|1|Lied",
      "Strophe|Gedicht,Absatz,Verse,Lied|1|Vers", "Überschrift|Titel,oben,Text,fett|1|Schlagzeile", "Steckbrief|Person,Merkmale,Name,Alter|1|Beschreibung",
      "Comic|Sprechblase,Bilder,Heft,Zeichnung|1|Bilderbuch", "Hauptfigur|Held,Geschichte,wichtig,Person|1|Nebenfigur", "Bibliothek|Bücher,ausleihen,Bücherei,lesen|1|Buchhandlung",
      "Kapitel|Buch,Abschnitt,Teil,Nummer|1|Absatz", "Autor|schreiben,Buch,Schriftsteller,Werk|1|Erzähler", "Erzähler|erzählen,Geschichte,Ich,Perspektive|2|Autor",
      "Ballade|Gedicht,Geschichte,Strophen,Goethe|2|Gedicht", "Sage|Held,Legende,alt,Ort|2|Märchen", "Bericht|Ereignis,sachlich,W-Fragen,Präteritum|2|Erzählung",
      "Inhaltsangabe|Zusammenfassung,Präsens,kurz,Text|2|Bericht", "Vergleich|wie,als,Bild,Stilmittel|2|Metapher", "Personifikation|menschlich,Dinge,Stilmittel,lebendig|2|Vergleich",
      "Kurzgeschichte|kurz,offen,Ende,Alltag|2|Fabel", "Dialog|Gespräch,zwei,Personen,sprechen|2|Monolog", "Höhepunkt|Spannung,Handlung,spannendste,Kurve|2|Wendepunkt",
      "Roman|Buch,lang,Kapitel,Geschichte|2|Novelle", "Metapher|Bild,übertragen,Stilmittel,Vergleich|3|Personifikation", "Erörterung|Argumente,pro,kontra,Meinung|3|Kommentar",
      "Drama|Theater,Akt,Szene,Bühne|3|Roman", "Monolog|allein,sprechen,Bühne,Selbstgespräch|3|Dialog", "Ironie|Gegenteil,meinen,spöttisch,Spott|3|Sarkasmus",
      "Rhetorische Frage|Frage,Antwort,Stilmittel,keine|3|Ausruf", "Interpretation|deuten,Text,Bedeutung,Analyse|3|Inhaltsangabe", "Alliteration|Anfang,Laut,gleich,Stilmittel|3|Reim"]],
    e_everyday: ["Englisch: Alltag", [
      "kitchen|cook,food,fridge,room|1|bathroom", "breakfast|morning,eat,cereal,meal|1|lunch", "weekend|Saturday,Sunday,week,free|1|holiday",
      "umbrella|rain,wet,open,weather|1|raincoat", "birthday|cake,candles,present,party|1|wedding", "supermarket|shop,buy,food,trolley|1|bakery",
      "teacher|school,class,lesson,students|1|headteacher", "homework|school,home,exercise,teacher|1|test", "pencil case|pens,pencils,bag,school|1|schoolbag",
      "bus stop|bus,wait,street,station|1|train station", "grandmother|grandma,mother,old,family|1|aunt", "library|books,borrow,read,quiet|1|bookshop",
      "zoo|animals,lions,visit,cage|1|farm", "neighbour|next,door,house,lives|2|friend", "ticket|train,cinema,buy,paper|2|passport",
      "hospital|doctor,ill,nurse,sick|2|chemist", "pocket money|parents,money,week,spend|2|salary", "traffic jam|cars,road,stuck,slow|2|rush hour",
      "environment|nature,protect,planet,climate|3|pollution", "volunteer|help,free,unpaid,work|3|charity", "advertisement|product,TV,sell,buy|3|poster",
      "career|job,work,future,profession|3|apprenticeship", "pollution|dirty,air,environment,plastic|3|litter", "interview|questions,job,answer,talk|3|survey"]],
    e_countries: ["Englisch: Länder & Kultur", [
      "London|capital,England,Thames,city|1|Edinburgh", "Big Ben|clock,London,tower,bell|1|Tower Bridge", "double-decker|bus,red,London,upstairs|1|taxi",
      "Halloween|October,pumpkin,costume,trick or treat|1|Bonfire Night", "fish and chips|fish,chips,fried,British|1|sandwich", "Scotland|kilt,bagpipes,Edinburgh,country|1|Wales",
      "afternoon tea|tea,afternoon,scones,cup|1|breakfast", "school uniform|clothes,tie,same,wear|1|tracksuit", "Thanksgiving|turkey,November,thanks,American|2|Halloween",
      "Statue of Liberty|New York,statue,torch,freedom|2|Big Ben", "Union Jack|flag,British,red,blue|2|Stars and Stripes", "Australia|kangaroo,continent,Sydney,country|2|New Zealand",
      "the Tube|London,train,underground,metro|2|double-decker", "Ireland|green,island,Dublin,clover|2|Scotland", "pound|money,British,pence,currency|2|dollar",
      "Canada|maple,country,cold,Toronto|2|Alaska", "Bonfire Night|fireworks,November,Guy Fawkes,fire|3|Halloween", "Parliament|government,laws,Westminster,MPs|3|Congress",
      "Hollywood|films,Los Angeles,stars,cinema|3|Broadway", "Independence Day|4th of July,fireworks,American,holiday|3|Thanksgiving", "Shakespeare|plays,Romeo,writer,Hamlet|3|Dickens",
      "Commonwealth|countries,British,former,empire|3|United Nations"]],
    e_grammar: ["Englisch: Grammatik", [
      "plural|more,one,s,many|1|singular", "question word|who,what,where,ask|1|question tag", "verb|action,do,word,doing|1|noun",
      "noun|thing,person,word,name|1|verb", "adjective|describe,word,big,noun|1|adverb", "opposite|different,contrary,big,small|1|synonym",
      "simple past|yesterday,ed,past,finished|2|present perfect", "present perfect|have,has,already,since|2|simple past", "irregular verb|went,go,rule,ed|2|regular verb",
      "going-to future|plan,going,future,will|2|will-future", "comparative|er,more,than,compare|2|superlative", "superlative|est,most,best,the|2|comparative",
      "adverb|ly,how,describe,verb|2|adjective", "pronoun|he,she,it,instead|2|noun", "question tag|isn't it,end,question,sentence|2|question word",
      "passive|by,done,form,active|3|active", "if-clause|condition,if,would,type|3|relative clause", "relative clause|who,which,that,sentence|3|if-clause",
      "reported speech|said,told,indirect,someone|3|direct speech", "gerund|ing,noun,verb,doing|3|infinitive", "synonym|same,meaning,word,similar|3|opposite"]],
    ex_everyday: ["Alltag", [
      "Zahnbürste|Zähne,putzen,Zahnpasta,Bad|1", "Wecker|aufstehen,klingeln,Uhr,Morgen|1", "Regenschirm|Regen,nass,aufspannen,Wetter|1",
      "Kühlschrank|kalt,Küche,Essen,Tür|1", "Fahrrad|Räder,treten,Lenker,fahren|1", "Handy|telefonieren,App,Bildschirm,Smartphone|1",
      "Geburtstag|Kuchen,Kerzen,Geschenk,Jahr|1", "Waschmaschine|Wäsche,waschen,Trommel,Kleidung|1", "Supermarkt|einkaufen,Kasse,Wagen,Lebensmittel|1",
      "Treppe|Stufen,hoch,runter,Geländer|1", "Schlüssel|Tür,Schloss,öffnen,Bund|1", "Spiegel|sehen,Bild,Glas,Bad|1",
      "Mülleimer|Abfall,Tonne,werfen,Deckel|1", "Kopfkissen|Bett,schlafen,Kopf,weich|1", "Briefkasten|Post,Brief,gelb,einwerfen|1",
      "Ampel|rot,grün,Straße,Verkehr|1"]],
    ex_animals: ["Tiere", [
      "Giraffe|Hals,lang,Afrika,Flecken|1", "Pinguin|Eis,Frack,schwimmen,Vogel|1", "Elefant|Rüssel,groß,grau,Stoßzähne|1",
      "Biene|Honig,summen,stechen,gelb|1", "Schnecke|Haus,langsam,Schleim,Fühler|1", "Eule|Nacht,Vogel,Augen,weise|1",
      "Känguru|springen,Beutel,Australien,Baby|1", "Delfin|Meer,schlau,springen,Wal|1", "Fledermaus|Nacht,fliegen,hängen,Höhle|1",
      "Chamäleon|Farbe,wechseln,Zunge,Echse|1", "Igel|Stacheln,Kugel,Herbst,einrollen|1", "Krokodil|Zähne,Fluss,Maul,Reptil|1",
      "Spinne|acht,Beine,Netz,krabbeln|1", "Faultier|langsam,hängen,Baum,schlafen|1", "Papagei|bunt,sprechen,Vogel,nachplappern|1",
      "Hamster|Backen,Käfig,Rad,Nager|1"]],
    ex_food: ["Essen", [
      "Pizza|Teig,Käse,Italien,Ofen|1", "Pommes|Kartoffel,frittiert,Ketchup,Mayo|1", "Eis|kalt,Kugel,Waffel,Sommer|1",
      "Spaghetti|Nudeln,lang,Soße,Gabel|1", "Brezel|Salz,Bäcker,Knoten,Laugen|1", "Popcorn|Mais,Kino,knallen,süß|1",
      "Pfannkuchen|Pfanne,Teig,flach,Ei|1", "Banane|gelb,krumm,Schale,Affe|1", "Suppe|Löffel,Teller,heiß,flüssig|1",
      "Schokolade|süß,Kakao,Tafel,braun|1", "Erdbeere|rot,Frucht,Sommer,Sahne|1", "Toast|Brot,Toaster,knusprig,Scheibe|1",
      "Müsli|Milch,Flocken,Frühstück,Schale|1", "Burger|Brötchen,Fleisch,Käse,Fast Food|1", "Zitrone|sauer,gelb,Saft,Frucht|1",
      "Honig|Biene,süß,Glas,klebrig|1"]],
    ex_leisure: ["Freizeit & Sport", [
      "Fußball|Tor,Ball,kicken,Mannschaft|1", "Schwimmbad|Wasser,Becken,baden,Sprungbrett|1", "Kino|Film,Leinwand,Popcorn,Ticket|1",
      "Zelt|Camping,schlafen,draußen,Heringe|1", "Trampolin|springen,hüpfen,Netz,hoch|1", "Skateboard|Rollen,Brett,Tricks,fahren|1",
      "Schach|König,Dame,Brett,matt|1", "Gitarre|Saiten,spielen,Musik,Instrument|1", "Zoo|Tiere,Gehege,Pfleger,Besuch|1",
      "Achterbahn|Freizeitpark,schnell,Looping,schreien|1", "Picknick|Decke,Korb,Wiese,essen|1", "Videospiel|Konsole,zocken,Controller,Level|1",
      "Wandern|Berg,laufen,Rucksack,Weg|1", "Kartenspiel|Karten,mischen,Spiel,Stapel|1", "Puzzle|Teile,legen,Bild,zusammen|1",
      "Bowling|Kugel,Kegel,Bahn,Strike|1"]],
    ex_school: ["Schule", [
      "Tafel|Kreide,schreiben,Wand,wischen|1|Whiteboard", "Hausaufgaben|zu Hause,Aufgabe,Heft,machen|1|Klassenarbeit", "Pause|Hof,klingeln,Brot,spielen|1|Mittagspause",
      "Zeugnis|Noten,Halbjahr,Ende,Papier|1|Klassenarbeit", "Klassenarbeit|Test,Note,schreiben,lernen|1|Hausaufgaben", "Mäppchen|Stifte,Federmappe,Radiergummi,Tasche|1|Schulranzen",
      "Klassenfahrt|Reise,Jugendherberge,Klasse,Ausflug|1|Wandertag", "Lineal|messen,Linie,gerade,Zentimeter|1|Geodreieck", "Turnhalle|Sport,Halle,Geräte,Umkleide|1|Schulhof",
      "Stundenplan|Fächer,Woche,Zeit,Tabelle|1|Vertretungsplan", "Lehrerzimmer|Lehrer,Raum,Konferenz,Kaffee|1|Sekretariat", "Radiergummi|radieren,Bleistift,weg,Fehler|1|Spitzer",
      "Schulranzen|Rucksack,Tasche,Bücher,tragen|1|Mäppchen", "Hausmeister|reparieren,Schule,Schlüssel,Hof|1|Sekretariat", "Klassensprecher|wählen,Klasse,vertreten,Sprecher|1|Schülervertretung",
      "Mensa|Essen,Mittag,Kantine,Tablett|1|Kiosk"]],

    m_numbers: ["Zahlen & Operationen", [
      "Primzahl|Teiler,teilbar,zwei,eins|1|Quadratzahl", "Bruch|Zähler,Nenner,Strich,Teil|1|Dezimalzahl", "Dezimalzahl|Komma,Bruch,Stelle,Zehntel|1|Bruch",
      "Quadratzahl|mal,selbst,hoch,zwei|1|Primzahl", "Teiler|teilen,Rest,geteilt,Zahl|1|Vielfaches", "Vielfaches|mal,Einmaleins,Reihe,Teiler|1|Teiler",
      "Negative Zahl|minus,kleiner,null,Vorzeichen|1|Gegenzahl", "Summe|plus,addieren,Ergebnis,Summand|1|Produkt", "Produkt|mal,multiplizieren,Faktor,Ergebnis|1|Summe",
      "Runden|auf,ab,fünf,ungefähr|1|Überschlag", "Überschlag|schätzen,ungefähr,runden,Ergebnis|1|Runden", "Prozent|hundert,Anteil,Zeichen,Grundwert|1|Promille",
      "Quotient|geteilt,dividieren,Ergebnis,Bruch|2|Produkt", "Kehrwert|Bruch,umdrehen,Zähler,Nenner|2|Gegenzahl", "Gegenzahl|minus,Vorzeichen,negativ,Zahlenstrahl|2|Betrag",
      "Betrag|Abstand,null,Vorzeichen,positiv|2|Gegenzahl", "Potenz|hoch,Exponent,Basis,mal|2|Quadratwurzel", "Quadratwurzel|Wurzel,Quadrat,hoch,Zeichen|2|Potenz",
      "Kommutativgesetz|vertauschen,Reihenfolge,plus,mal|2|Assoziativgesetz", "Distributivgesetz|Klammer,ausmultiplizieren,plus,mal|3|Kommutativgesetz",
      "Irrationale Zahl|Bruch,Wurzel,Pi,Komma|3|Rationale Zahl", "Zehnerpotenz|hoch,zehn,null,Exponent|3|Potenz"]],
    m_measures: ["Größen & Messen", [
      "Umfang|Rand,außen,Länge,herum|1|Flächeninhalt", "Flächeninhalt|Fläche,Quadratmeter,innen,Länge|1|Umfang", "Maßstab|Karte,verkleinern,Verhältnis,eins zu|1|Verhältnis",
      "Liter|trinken,Flasche,Milliliter,Volumen|1|Kilogramm", "Kilogramm|Gewicht,Gramm,Waage,schwer|1|Liter", "Millimeter|Lineal,klein,Zentimeter,Länge|1|Zentimeter",
      "Geodreieck|messen,Winkel,Lineal,Dreieck|1|Zirkel", "Zirkel|Kreis,Spitze,zeichnen,Radius|1|Geodreieck", "Winkel|Grad,Ecke,Schenkel,Scheitel|1|Strecke",
      "Rechter Winkel|90,Grad,senkrecht,Ecke|1|Spitzer Winkel", "Radius|Mittelpunkt,Kreis,Durchmesser,halb|1|Durchmesser", "Durchmesser|Kreis,Radius,doppelt,Mitte|1|Radius",
      "Zeitspanne|Uhr,Dauer,Minuten,von bis|1|Uhrzeit", "Einheit|Meter,Kilogramm,umrechnen,Maß|1|Größe", "Volumen|Liter,Raum,Kubik,Würfel|2|Oberfläche",
      "Oberfläche|außen,Fläche,Netz,Körper|2|Volumen", "Hektar|Fläche,Feld,Quadratmeter,hundert|2|Ar", "Kreiszahl Pi|Kreis,drei,Umfang,Nachkommastellen|2|Radius",
      "Geschwindigkeit|schnell,km/h,Zeit,Strecke|2|Zeitspanne", "Dichte|Masse,Volumen,schwer,Gramm|3|Volumen"]],
    m_space: ["Raum & Form", [
      "Dreieck|drei,Ecken,Seiten,Pyramide|1|Viereck", "Quadrat|vier,gleich,Seiten,Rechteck|1|Rechteck", "Rechteck|vier,Ecken,rechter Winkel,Quadrat|1|Quadrat",
      "Würfel|sechs,Seiten,Quadrat,Spiel|1|Quader", "Quader|Schachtel,Rechteck,Kanten,Würfel|1|Würfel", "Pyramide|Spitze,Ägypten,Dreieck,Grundfläche|1|Kegel",
      "Kugel|Ball,rund,Erde,Mittelpunkt|1|Kreis", "Achsensymmetrie|Spiegel,Achse,gleich,falten|1|Punktsymmetrie", "Netz|Körper,aufklappen,Fläche,falten|1|Schrägbild",
      "Koordinatensystem|Achse,x,y,Punkt|1|Zahlenstrahl", "Parallele|Linie,gleich,Abstand,schneiden|1|Senkrechte", "Senkrechte|90,Grad,rechter Winkel,Linie|1|Parallele",
      "Parallelogramm|Viereck,parallel,Seiten,schief|2|Trapez", "Trapez|Viereck,parallel,Seiten,zwei|2|Parallelogramm", "Raute|Viereck,gleich,Seiten,Rhombus|2|Drachenviereck",
      "Drachenviereck|Drachen,Viereck,Symmetrie,steigen|2|Raute", "Zylinder|Dose,rund,Kreis,Hut|2|Kegel", "Kegel|Spitze,Eis,Waffel,Kreis|2|Pyramide",
      "Punktsymmetrie|drehen,180,Zentrum,Punkt|2|Achsensymmetrie", "Schrägbild|zeichnen,Körper,räumlich,schräg|2|Netz",
      "Satz des Pythagoras|Hypotenuse,Kathete,Quadrat,rechtwinklig|3|Kathete", "Hypotenuse|längste,Seite,Dreieck,rechter Winkel|3|Kathete"]],
    m_functions: ["Funktionen & Algebra", [
      "Variable|x,Platzhalter,Buchstabe,unbekannt|1|Konstante", "Zuordnung|zuordnen,Tabelle,Paar,Pfeil|1|Funktion", "Term|Variable,Rechenausdruck,Zahl,x|1|Gleichung", "Gleichung|gleich,Zeichen,lösen,x|1|Term",
      "Wertetabelle|Tabelle,x,y,Werte|1|Graph", "Dreisatz|drei,Schritte,Zuordnung,eins|1|Prozentrechnung", "Funktion|Zuordnung,x,y,Graph|2|Zuordnung",
      "Proportionale Zuordnung|doppelt,Quotient,gleich,Ursprung|2|Antiproportionale Zuordnung", "Antiproportionale Zuordnung|doppelt,halb,Produkt,Hyperbel|2|Proportionale Zuordnung",
      "Steigung|Gerade,steil,m,Dreieck|2|y-Achsenabschnitt", "y-Achsenabschnitt|Achse,schneiden,b,Punkt|2|Steigung", "Gerade|Linie,Steigung,linear,Lineal|2|Parabel",
      "Graph|zeichnen,Funktion,Kurve,Koordinatensystem|2|Wertetabelle", "Lineares Wachstum|gleich,jedes Mal,Gerade,dazu|2|Exponentielles Wachstum",
      "Zinsen|Bank,Prozent,Geld,Jahr|2|Prozentrechnung", "Äquivalenzumformung|Gleichung,beide Seiten,umformen,gleich|2|Gleichung",
      "Parabel|quadratisch,U,Scheitel,x²|3|Gerade", "Scheitelpunkt|Parabel,höchster,tiefster,Punkt|3|Nullstelle", "Nullstelle|null,x-Achse,schneiden,Punkt|3|Scheitelpunkt",
      "Lineares Gleichungssystem|zwei,Gleichungen,x,y|3|Gleichung", "Exponentielles Wachstum|verdoppeln,Prozent,schnell,Faktor|3|Lineares Wachstum"]],
    m_data: ["Daten & Zufall", [
      "Strichliste|Striche,zählen,fünf,Tabelle|1|Säulendiagramm", "Säulendiagramm|Balken,Säule,Höhe,Diagramm|1|Kreisdiagramm", "Kreisdiagramm|Torte,Kreis,Anteil,Stück|1|Säulendiagramm",
      "Mittelwert|Durchschnitt,addieren,teilen,Summe|1|Median", "Absolute Häufigkeit|Anzahl,oft,zählen,Strichliste|1|Relative Häufigkeit", "Münzwurf|Kopf,Zahl,werfen,Geld|1|Würfelwurf",
      "Umfrage|fragen,Leute,Meinung,Bogen|1|Statistik", "Wahrscheinlichkeit|Zufall,Prozent,Chance,möglich|2|Häufigkeit", "Zufallsexperiment|Würfel,Münze,Zufall,Ergebnis|2|Ereignis",
      "Ereignis|Ergebnis,Zufall,eintreten,Experiment|2|Ergebnis", "Relative Häufigkeit|Anteil,oft,geteilt,Versuche|2|Absolute Häufigkeit", "Median|Mitte,Zentralwert,ordnen,Reihe|2|Mittelwert",
      "Spannweite|größte,kleinste,Unterschied,Wert|2|Median", "Baumdiagramm|Ast,Pfad,Stufe,Zweig|2|Vierfeldertafel", "Statistik|Daten,auswerten,Zahlen,Diagramm|2|Umfrage",
      "Ausreißer|weit weg,Wert,extrem,anders|2|Spannweite", "Boxplot|Kasten,Quartil,Median,Antenne|3|Säulendiagramm", "Laplace-Experiment|gleich,wahrscheinlich,Würfel,fair|3|Zufallsexperiment",
      "Quartil|Viertel,Boxplot,Median,Daten|3|Median"]]
  },

  en: {
    ex_everyday: ["Everyday", [
      "Toothbrush|teeth,brush,toothpaste,bathroom|1", "Alarm clock|wake,ring,morning,clock|1", "Umbrella|rain,wet,open,weather|1",
      "Fridge|cold,kitchen,food,door|1", "Bicycle|wheels,pedal,ride,handlebars|1", "Mobile phone|call,app,screen,smartphone|1",
      "Birthday|cake,candles,present,year|1", "Washing machine|clothes,wash,drum,laundry|1", "Supermarket|shopping,till,trolley,food|1",
      "Stairs|steps,up,down,banister|1", "Key|door,lock,open,ring|1", "Mirror|look,reflection,glass,bathroom|1",
      "Bin|rubbish,throw,lid,waste|1", "Pillow|bed,sleep,head,soft|1", "Postbox|letter,post,red,stamp|1",
      "Traffic lights|red,green,road,stop|1"]],
    ex_animals: ["Animals", [
      "Giraffe|neck,long,Africa,spots|1", "Penguin|ice,swim,bird,black and white|1", "Elephant|trunk,big,grey,tusks|1",
      "Bee|honey,buzz,sting,yellow|1", "Snail|shell,slow,slime,garden|1", "Owl|night,bird,eyes,hoot|1",
      "Kangaroo|jump,pouch,Australia,baby|1", "Dolphin|sea,clever,jump,whale|1", "Bat|night,fly,hang,cave|1",
      "Chameleon|colour,change,tongue,lizard|1", "Hedgehog|spikes,ball,autumn,roll|1", "Crocodile|teeth,river,jaws,reptile|1",
      "Spider|eight,legs,web,crawl|1", "Sloth|slow,hang,tree,sleep|1", "Parrot|colourful,talk,bird,copy|1",
      "Hamster|cheeks,cage,wheel,pet|1"]],
    ex_food: ["Food", [
      "Pizza|dough,cheese,Italy,oven|1", "Chips|potato,fried,ketchup,fries|1", "Ice cream|cold,scoop,cone,summer|1",
      "Spaghetti|pasta,long,sauce,fork|1", "Pretzel|salt,knot,baked,twist|1", "Popcorn|corn,cinema,pop,sweet|1",
      "Pancake|pan,batter,flat,flip|1", "Banana|yellow,curved,peel,monkey|1", "Soup|spoon,bowl,hot,liquid|1",
      "Chocolate|sweet,cocoa,bar,brown|1", "Strawberry|red,fruit,summer,cream|1", "Toast|bread,toaster,crunchy,slice|1",
      "Cereal|milk,bowl,breakfast,flakes|1", "Burger|bun,beef,cheese,fast food|1", "Lemon|sour,yellow,juice,fruit|1",
      "Honey|bee,sweet,jar,sticky|1"]],
    ex_leisure: ["Free time & Sport", [
      "Football|goal,ball,kick,team|1", "Swimming pool|water,swim,dive,lanes|1", "Cinema|film,screen,popcorn,ticket|1",
      "Tent|camping,sleep,outside,pegs|1", "Trampoline|jump,bounce,net,high|1", "Skateboard|wheels,board,tricks,ride|1",
      "Chess|king,queen,board,checkmate|1", "Guitar|strings,play,music,instrument|1", "Zoo|animals,enclosure,keeper,visit|1",
      "Roller coaster|theme park,fast,loop,scream|1", "Picnic|blanket,basket,grass,eat|1", "Video game|console,play,controller,level|1",
      "Hiking|mountain,walk,rucksack,trail|1", "Card game|cards,shuffle,deal,deck|1", "Jigsaw puzzle|pieces,picture,fit,together|1",
      "Bowling|ball,pins,lane,strike|1"]],
    ex_school: ["School", [
      "Whiteboard|write,board,pen,wipe|1|Blackboard", "Homework|home,task,exercise book,do|1|Test", "Break time|playground,bell,snack,play|1|Lunchtime",
      "School report|grades,term,end,teacher|1|Test", "Test|exam,mark,write,revise|1|Homework", "Pencil case|pens,zip,rubber,bag|1|School bag",
      "School trip|travel,class,visit,coach|1|Sports day", "Ruler|measure,line,straight,centimetres|1|Set square", "Sports hall|PE,gym,equipment,changing|1|Playground",
      "Timetable|lessons,week,subjects,time|1|Calendar", "Staff room|teachers,room,meeting,coffee|1|School office", "Rubber|erase,pencil,mistake,rub|1|Sharpener",
      "School bag|rucksack,books,carry,bag|1|Pencil case", "Caretaker|repair,school,keys,building|1|School office", "Class representative|elect,class,speak,vote|1|School council",
      "Canteen|lunch,food,tray,eat|1|Tuck shop"]],

    m_numbers: ["Number", [
      "Prime number|factor,divisible,two,one|1|Square number", "Fraction|numerator,denominator,line,part|1|Decimal", "Decimal|point,fraction,place,tenth|1|Fraction",
      "Square number|times,itself,power,two|1|Prime number", "Factor|divide,remainder,divided,number|1|Multiple", "Multiple|times,table,sequence,factor|1|Factor",
      "Negative number|minus,smaller,zero,sign|1|Positive number", "Sum|plus,add,result,total|1|Product", "Product|times,multiply,factor,result|1|Sum",
      "Rounding|up,down,five,nearest|1|Estimate", "Estimate|guess,roughly,round,approximately|1|Rounding", "Percentage|hundred,share,sign,per cent|1|Fraction",
      "Quotient|divided,divide,result,fraction|2|Product", "Reciprocal|fraction,flip,numerator,denominator|2|Inverse", "Square root|root,square,power,sign|2|Power",
      "Power|index,exponent,base,times|2|Square root", "Commutative law|swap,order,add,multiply|2|Associative law", "Distributive law|brackets,expand,add,multiply|3|Commutative law",
      "Irrational number|fraction,root,pi,decimal|3|Rational number", "Standard form|power,ten,index,large|3|Power"]],
    m_measures: ["Measures", [
      "Perimeter|edge,outside,length,around|1|Area", "Area|surface,square metres,inside,length|1|Perimeter", "Scale|map,smaller,ratio,one to|1|Ratio",
      "Litre|drink,bottle,millilitre,volume|1|Kilogram", "Kilogram|weight,gram,scales,heavy|1|Litre", "Millimetre|ruler,small,centimetre,length|1|Centimetre",
      "Protractor|measure,angle,degrees,semicircle|1|Compasses", "Compasses|circle,point,draw,radius|1|Protractor", "Angle|degrees,corner,arms,vertex|1|Line",
      "Right angle|90,degrees,perpendicular,corner|1|Acute angle", "Radius|centre,circle,diameter,half|1|Diameter", "Diameter|circle,radius,double,middle|1|Radius",
      "Time interval|clock,duration,minutes,from to|1|Time", "Unit|metre,kilogram,convert,measure|1|Quantity", "Volume|litre,space,cubic,cube|2|Surface area",
      "Surface area|outside,area,net,solid|2|Volume", "Hectare|area,field,square metres,hundred|2|Acre", "Pi|3.14,circle,three,circumference|2|Radius",
      "Speed|fast,km/h,time,distance|2|Time interval", "Density|mass,volume,heavy,grams|3|Volume"]],
    m_space: ["Shape & Space", [
      "Triangle|three,corners,sides,pyramid|1|Quadrilateral", "Square|four,equal,sides,rectangle|1|Rectangle", "Rectangle|four,corners,right angle,square|1|Square",
      "Cube|six,faces,square,dice|1|Cuboid", "Cuboid|box,rectangle,edges,cube|1|Cube", "Pyramid|point,Egypt,triangle,base|1|Cone",
      "Sphere|ball,round,earth,centre|1|Circle", "Line symmetry|mirror,line,same,fold|1|Rotational symmetry", "Net|solid,unfold,faces,fold|1|Isometric drawing",
      "Coordinate grid|axis,x,y,point|1|Number line", "Parallel lines|line,same,distance,meet|1|Perpendicular lines", "Perpendicular lines|90,degrees,right angle,line|1|Parallel lines",
      "Parallelogram|quadrilateral,parallel,sides,slanted|2|Trapezium", "Trapezium|quadrilateral,parallel,sides,two|2|Parallelogram", "Rhombus|quadrilateral,equal,sides,diamond|2|Kite",
      "Kite|fly,quadrilateral,symmetry,wind|2|Rhombus", "Cylinder|tin,round,circle,tube|2|Cone", "Cone|point,ice cream,wafer,circle|2|Pyramid",
      "Rotational symmetry|turn,180,centre,order|2|Line symmetry", "Isometric drawing|draw,solid,3D,dots|2|Net",
      "Pythagoras' theorem|hypotenuse,squared,triangle,right-angled|3|Hypotenuse", "Hypotenuse|longest,side,triangle,right angle|3|Pythagoras' theorem"]],
    m_functions: ["Algebra & Graphs", [
      "Variable|x,letter,unknown,placeholder|1|Constant", "Mapping|arrow,pairs,table,match|1|Function", "Expression|variable,terms,number,x|1|Equation", "Equation|equals,sign,solve,x|1|Expression",
      "Table of values|table,x,y,values|1|Graph", "Unitary method|one,steps,divide,multiply|1|Ratio", "Function|input,output,x,graph|2|Mapping",
      "Direct proportion|double,ratio,constant,origin|2|Inverse proportion", "Inverse proportion|double,half,product,curve|2|Direct proportion",
      "Gradient|line,steep,m,slope|2|y-intercept", "y-intercept|axis,cross,c,point|2|Gradient", "Straight line|line,gradient,linear,ruler|2|Parabola",
      "Graph|plot,function,curve,axes|2|Table of values", "Linear growth|same,each time,line,add|2|Exponential growth",
      "Interest|bank,percentage,money,year|2|Percentage", "Balancing method|equation,both sides,solve,same|2|Equation",
      "Parabola|quadratic,U,turning point,x²|3|Straight line", "Turning point|parabola,highest,lowest,point|3|Root", "Root|zero,x-axis,cross,point|3|Turning point",
      "Simultaneous equations|two,equations,x,y|3|Equation", "Exponential growth|double,percentage,fast,multiplier|3|Linear growth"]],
    m_data: ["Data & Probability", [
      "Tally chart|lines,count,five,table|1|Bar chart", "Bar chart|bars,height,axis,chart|1|Pie chart", "Pie chart|circle,slice,share,sector|1|Bar chart",
      "Mean|average,add,divide,total|1|Median", "Frequency|how many,often,count,tally|1|Relative frequency", "Coin toss|heads,tails,flip,money|1|Dice roll",
      "Survey|ask,people,opinion,questionnaire|1|Statistics", "Probability|chance,likely,percentage,possible|2|Frequency", "Random experiment|dice,coin,chance,outcome|2|Event",
      "Event|outcome,chance,happen,experiment|2|Outcome", "Relative frequency|proportion,often,divide,trials|2|Frequency", "Median|middle,order,value,list|2|Mean",
      "Range|biggest,smallest,difference,value|2|Median", "Tree diagram|branch,path,stage,probability|2|Two-way table", "Statistics|data,analyse,numbers,chart|2|Survey",
      "Outlier|far,value,extreme,different|2|Range", "Box plot|box,quartile,median,whiskers|3|Bar chart", "Equally likely outcomes|same,chance,fair,dice|3|Random experiment",
      "Quartile|quarter,box plot,median,data|3|Median"]]
  }
};

const SCHOOL_TOPICS = {
  de: ["Welches Schulfach sollte es unbedingt geben?", "Wie sieht die perfekte Pause aus?", "Wohin sollte die nächste Klassenfahrt gehen?",
    "Was würdet ihr an eurer Schule ändern?", "Wofür braucht man Mathe im Alltag?", "Was ist das beste Pausenbrot?",
    "Welche Erfindung hat die Welt am meisten verändert?", "Wie sieht der perfekte Schultag aus?", "Welches Haustier würde gut in die Klasse passen?",
    "Was nehmt ihr mit auf eine einsame Insel?", "Ihr plant ein Schulfest. Was gibt es?", "Welche Superkraft hätte im Unterricht Vorteile?",
    "Wie wird die Schule in 50 Jahren aussehen?", "Was ist das beste Brettspiel?", "Sommerferien oder Winterferien – was ist besser?"],
  en: ["Which school subject should definitely exist?", "What does the perfect break time look like?", "Where should the next school trip go?",
    "What would you change about your school?", "What do you need maths for in everyday life?", "What is the best packed lunch?",
    "Which invention changed the world the most?", "What does the perfect school day look like?", "Which pet would suit our class?",
    "What would you take to a desert island?", "You're planning a school fair. What's on?", "Which superpower would help most in lessons?",
    "What will school look like in 50 years?", "What is the best board game?", "Summer holidays or winter holidays – which is better?"]
};
const SCHOOL_MISSIONS = {
  de: ["Benutze dreimal das Wort „proportional“.", "Nenne im Gespräch eine Primzahl über 20.", "Bringe das Wort „Hypotenuse“ unter.",
    "Stimme der Person links von dir bei allem zu.", "Beantworte die nächste Frage mit einer Gegenfrage.", "Erwähne eine Zahl mit Komma.",
    "Benutze zweimal das Wort „eigentlich“.", "Zähle beim Reden etwas an den Fingern ab.", "Bringe jemanden dazu, eine Zahl zu nennen.",
    "Erwähne ein Schulfach, das es gar nicht gibt.", "Beginne einen Satz mit „Mathematisch gesehen …“.", "Nenne im Gespräch eine Uhrzeit.",
    "Bringe jemanden dazu, „genau“ zu sagen.", "Benutze das Wort „Wahrscheinlichkeit“.", "Stelle zwei Fragen direkt hintereinander.",
    "Schätze im Gespräch eine Zahl („ungefähr …“).", "Wiederhole das letzte Wort deines Vorredners.", "Erwähne eine geometrische Form.",
    "Benutze zweimal das Wort „Prozent“.", "Lenke das Gespräch kurz auf das Wetter.", "Sage einmal „Das kann man beweisen!“.",
    "Frage jemanden nach seinem Lieblingsfach.", "Nenne eine Einheit, zum Beispiel Meter oder Liter.", "Lobe ausdrücklich die Idee einer anderen Person.",
    "Sage einen ganzen Satz auf Englisch.", "Benutze eine Metapher.", "Baue ein Sprichwort ein.", "Stelle eine rhetorische Frage.",
    "Benutze ein englisches Wort, als wäre es Deutsch.", "Beginne zwei Wörter hintereinander mit demselben Buchstaben – und das dreimal."],
  en: ["Say the word “proportional” three times.", "Mention a prime number above 20.", "Work the word “hypotenuse” into the conversation.",
    "Agree with everything the person on your left says.", "Answer the next question with another question.", "Mention a decimal number.",
    "Say the word “actually” twice.", "Count something off on your fingers while talking.", "Get someone to say a number.",
    "Mention a school subject that doesn't exist.", "Start a sentence with “Mathematically speaking …”.", "Mention a time of day.",
    "Get someone to say “exactly”.", "Use the word “probability”.", "Ask two questions straight after each other.",
    "Estimate a number in the conversation (“roughly …”).", "Repeat the last word of the previous speaker.", "Mention a geometric shape.",
    "Say the word “percent” twice.", "Briefly steer the conversation to the weather.", "Say “That can be proved!” once.",
    "Ask someone about their favourite subject.", "Mention a unit, for example metres or litres.", "Explicitly praise another person's idea.",
    "Say a whole sentence in another language.", "Use a metaphor.", "Work a proverb into the conversation.", "Ask a rhetorical question.",
    "Use a word from another language as if it were English.", "Start two words in a row with the same letter – three times."]
};
/* Wort-Bombe: Aufgaben für Deutsch und Englisch (nur deutsche Fassung) */
const BOMB_GERMAN = [["Ein Nomen mit -ung", 1], ["Ein Verb der Bewegung", 1], ["Ein Adjektiv für Gefühle", 1], ["Ein Wort mit ie", 1], ["Ein Wort mit ß", 1],
  ["Ein Wort mit Doppel-L", 1], ["Ein Reimwort auf -aus", 1], ["Ein Wort mit drei Silben", 1], ["Ein Nomen, das mit Schul- beginnt", 1], ["Ein Märchen", 1],
  ["Eine Märchenfigur", 1], ["Ein Wort, das mit Sp beginnt", 1], ["Ein Verb mit ver-", 1], ["Ein Tier mit Artikel „die“", 1], ["Ein Wort mit ck", 1],
  ["Eine Präposition", 2], ["Ein Verb im Präteritum", 2], ["Ein Wort mit -heit oder -keit", 2], ["Eine Konjunktion", 2], ["Ein Fremdwort", 2],
  ["Ein Wort aus dem Wortfeld „sagen“", 2], ["Ein Pronomen", 2], ["Ein Stilmittel", 3], ["Eine Textsorte", 3], ["Ein Satzglied", 3], ["Ein Verb mit unregelmäßigem Präteritum", 3]];
const BOMB_ENGLISH = [["An animal (in English)", 1], ["Something in a classroom (in English)", 1], ["A colour (in English)", 1], ["Food (in English)", 1], ["A family member (in English)", 1],
  ["A day or a month (in English)", 1], ["A piece of clothing (in English)", 1], ["A job (in English)", 1], ["An English word with th", 1], ["A room in a house (in English)", 1],
  ["A hobby (in English)", 1], ["A means of transport (in English)", 1], ["A number word above twenty (in English)", 1], ["An irregular verb", 2], ["A verb in the simple past", 2],
  ["A country where people speak English", 2], ["An English word ending in -ly", 2], ["An adjective with -er and -est", 2], ["A weather word (in English)", 2], ["A British or American city", 2],
  ["A phrasal verb", 3], ["An English word ending in -tion", 3], ["A synonym for “big”", 3], ["A word about the environment (in English)", 3]];

/* Wort-Bombe: Mathe-Aufgaben mit Niveau */
const BOMB_MATH = {
  de: [["Eine Primzahl", 1], ["Eine Quadratzahl", 1], ["Eine gerade Zahl über 100", 1], ["Ein Vielfaches von 7", 1], ["Ein Teiler von 60", 1],
    ["Eine geometrische Figur", 1], ["Ein geometrischer Körper", 1], ["Eine Längeneinheit", 1], ["Eine Zeiteinheit", 1], ["Eine Einheit für Gewicht oder Volumen", 1],
    ["Ein Wort aus der Geometrie", 1], ["Etwas mit einem rechten Winkel", 1], ["Etwas Kugelförmiges", 1], ["Eine negative Zahl", 1], ["Ein Fachbegriff zum Rechnen", 1],
    ["Etwas, das man messen kann", 1], ["Eine durch 3 teilbare Zahl", 1], ["Ein Mathe-Werkzeug aus dem Mäppchen", 1], ["Ein Viereck", 1], ["Ein Ergebnis aus dem Einmaleins", 1],
    ["Eine Zahl mit Komma", 1], ["Ein Bruch kleiner als ½", 2], ["Eine Zahl zwischen 1 und 2", 2], ["Ein Diagrammtyp", 2], ["Ein Begriff aus der Wahrscheinlichkeit", 2],
    ["Ein Teil eines Kreises", 2], ["Eine Potenz von 2", 2], ["Ein Begriff zu Gleichungen", 2], ["Ein Begriff zu Funktionen", 3], ["Eine irrationale Zahl", 3]],
  en: [["A prime number", 1], ["A square number", 1], ["An even number above 100", 1], ["A multiple of 7", 1], ["A factor of 60", 1],
    ["A 2D shape", 1], ["A 3D shape", 1], ["A unit of length", 1], ["A unit of time", 1], ["A unit of mass or volume", 1],
    ["A word from geometry", 1], ["Something with a right angle", 1], ["Something shaped like a sphere", 1], ["A negative number", 1], ["A maths word for calculating", 1],
    ["Something you can measure", 1], ["A number divisible by 3", 1], ["A maths tool from your pencil case", 1], ["A quadrilateral", 1], ["An answer from the times tables", 1],
    ["A decimal number", 1], ["A fraction smaller than ½", 2], ["A number between 1 and 2", 2], ["A type of chart", 2], ["A word from probability", 2],
    ["A part of a circle", 2], ["A power of 2", 2], ["A word about equations", 2], ["A word about functions", 3], ["An irrational number", 3]]
};

/* Rohdaten in Objekte: DECKS[lang][id] = { name, cards: [{ w, f[], lv, s }] } */
const DECKS = {};
for (const [lang, decks] of Object.entries(DECKS_RAW)) {
  DECKS[lang] = {};
  for (const [id, [name, raw]] of Object.entries(decks)) {
    DECKS[lang][id] = {
      name,
      cards: raw.map(line => {
        const [w, f, lv, s] = line.split("|");
        return { w, f: f.split(","), lv: Number(lv) || 1, s: s || "" };
      })
    };
  }
}

/* =====================================================================
   Zahlen-Hochstapler: gleichwertige Darstellungen
   Jede Gruppe: Niveau, gleichwertige Darstellungen (die Crew bekommt je
   eine davon) und naheliegende, aber NICHT gleichwertige Werte (für den
   Hochstapler). Dezimalkomma; die englische Fassung bekommt Dezimalpunkte.
   ===================================================================== */
const EQUIV_DECKS = ["m_equiv_num", "m_equiv_term"];
DECK_ICON.m_equiv_num = "🟰";
DECK_ICON.m_equiv_term = "✖️";
const EQUIV_NAMES = { de: { m_equiv_num: "Gleicher Wert", m_equiv_term: "Gleiche Terme" }, en: { m_equiv_num: "Same value", m_equiv_term: "Equivalent expressions" } };
const EQUIV_RAW = {
  m_equiv_num: [
    [1, ["½", "0,5", "50 %", "2/4", "5/10"], ["0,25", "1/3", "5 %"]],
    [1, ["¼", "0,25", "25 %", "2/8", "3/12"], ["0,4", "1/5", "2,5 %"]],
    [1, ["¾", "0,75", "75 %", "6/8", "9/12"], ["0,34", "4/3", "7,5 %"]],
    [1, ["⅕", "0,2", "20 %", "2/10", "4/20"], ["0,5", "¼", "2 %"]],
    [1, ["1/10", "0,1", "10 %", "10/100", "3/30"], ["0,01", "1 %", "1/100"]],
    [1, ["1", "100 %", "4/4", "1,0", "10/10"], ["0,1", "1/100", "10 %"]],
    [1, ["24", "4 · 6", "3 · 8", "48 : 2", "12 + 12"], ["4 + 6", "26", "36 : 2"]],
    [2, ["1,5", "3/2", "150 %", "1½", "6/4"], ["1,05", "2/3", "15 %"]],
    [2, ["⅛", "0,125", "12,5 %", "2/16", "3/24"], ["1/12", "0,8", "1,25 %"]],
    [2, ["⅖", "0,4", "40 %", "4/10", "6/15"], ["5/2", "0,04", "4 %"]],
    [2, ["0,02", "2 %", "1/50", "2/100", "4/200"], ["0,2", "1/20", "20 %"]],
    [2, ["⅓", "0,333…", "2/6", "5/15", "33,3… %"], ["0,3", "3/10", "30 %"]],
    [2, ["−3", "−6 : 2", "4 − 7", "−1 · 3", "−(+3)"], ["3", "−7 + 4 · 2", "−(−3)"]],
    [3, ["1000", "10³", "10 · 10 · 10", "10⁶ : 10³", "1 · 10³"], ["30", "10⁴", "3 · 10"]],
    [3, ["32", "2⁵", "2 · 2 · 2 · 2 · 2", "4 · 8", "2³ · 2²"], ["10", "2 · 5", "5²"]],
    [3, ["4", "√16", "2²", "8 : 2", "√2 · √8"], ["8", "√8", "4²"]],
    [3, ["0,001", "10⁻³", "1/1000", "0,1 %", "1 : 1000"], ["0,01", "10³", "1 %"]],
    [3, ["2", "√4", "√2 · √2", "4 : 2", "2¹"], ["√2", "1,41", "2²"]]
  ],
  m_equiv_term: [
    [2, ["2(x + 3)", "2x + 6", "x + x + 6", "2 · x + 2 · 3", "6 + 2x"], ["2x + 3", "x + 6", "2x + 5"]],
    [2, ["5a", "3a + 2a", "a · 5", "6a − a", "a + a + a + a + a"], ["6a", "5 + a", "a⁵"]],
    [2, ["4x − 8", "4(x − 2)", "2(2x − 4)", "−8 + 4x", "4 · x − 4 · 2"], ["4x − 2", "4(x − 8)", "2(x − 4)"]],
    [2, ["a · b · c", "c · b · a", "b · (a · c)", "(a · b) · c", "a · c · b"], ["a + b + c", "a · b + c", "3abc"]],
    [2, ["3x − 1", "5x − (2x + 1)", "5x − 2x − 1", "−1 + 3x", "x + 2x − 1"], ["3x + 1", "7x − 1", "3x − 2"]],
    [2, ["x : 2", "½ x", "0,5 x", "x · 0,5", "x/2"], ["2x", "x − 2", "x + ½"]],
    [2, ["x²", "x · x", "(−x)²", "x · x · 1", "x³ : x"], ["2x", "x + x", "−x²"]],
    [3, ["a² + 2ab + b²", "(a + b)²", "(a + b)(a + b)", "(b + a)²", "a² + ab + ab + b²"], ["a² + b²", "a² + ab + b²", "2a + 2b"]],
    [3, ["x² − 1", "(x + 1)(x − 1)", "(x − 1)(x + 1)", "x · x − 1", "−1 + x²"], ["x² + 1", "(x − 1)²", "x² − 2x + 1"]],
    [3, ["2⁵", "2³ · 2²", "32", "2 · 2⁴", "(2⁵)¹"], ["2⁶", "4⁵", "64"]],
    [3, ["a⁶", "a² · a⁴", "(a³)²", "a · a⁵", "a⁸ : a²"], ["a⁸", "a⁵", "(a²)⁴"]],
    [3, ["x² − 6x + 9", "(x − 3)²", "(3 − x)²", "(x − 3)(x − 3)", "x² − 3x − 3x + 9"], ["x² − 9", "x² + 9", "(x + 3)²"]]
  ]
};
/* EQUIV[lang][id] = { name, groups: [{ lv, reps[], near[] }] } */
const EQUIV = {};
for (const lang of ["de", "en"]) {
  const fix = s => (lang === "en" ? s.replace(/(\d),(\d)/g, "$1.$2").replace(/ %/g, "%") : s);
  EQUIV[lang] = {};
  for (const id of EQUIV_DECKS) {
    EQUIV[lang][id] = { name: EQUIV_NAMES[lang][id], groups: EQUIV_RAW[id].map(([lv, reps, near]) => ({ lv, reps: reps.map(fix), near: near.map(fix) })) };
  }
}
