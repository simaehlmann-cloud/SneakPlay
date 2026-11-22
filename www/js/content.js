/* SneakPlay – Spielinhalte je Sprache
   Kategorien (Hochstapler), Gesprächsthemen und Missionen (Geheime
   Missionen), Aufgaben für die Wort-Bombe. Die Kategorie-Schlüssel sind in
   allen Sprachen gleich; die Begriffe selbst sind je Sprache eigenständig
   ausgesucht, nicht wörtlich übersetzt. Keine Inhalte zu Alkohol, Rauchen,
   Glücksspiel oder Gewalt – validate.js prüft das. */
"use strict";

const CAT_ORDER = ["food", "everyday", "animals", "music", "football", "travel", "jobs", "sports", "movies"];
const CAT_ICON = { food: "🍕", everyday: "🎉", animals: "🦒", music: "🎵", football: "⚽", travel: "🏖️", jobs: "🧑‍🚒", sports: "🏓", movies: "🎬" };

const CONTENT = {
  de: {
    cats: {
      food: { name: "Essen & Genuss", words: ["Currywurst", "Döner mit allem", "Käsefondue", "Sonntagsbraten", "Kalter Hund", "Sushi-Laufband", "Raclette", "Pommes rot-weiß", "Spaghetti Bolognese", "Pfannkuchen", "Erdbeerkuchen", "Grillwürstchen", "Popcorn", "Lebkuchen", "Brezel", "Spiegelei", "Kartoffelsalat", "Zuckerwatte", "Milchreis", "Pizza Hawaii", "Gummibärchen", "Butterbrot"] },
      everyday: { name: "Alltag & Party", words: ["Akku bei 1 %", "Falsche Person gewinkt", "Wecker gesnoozed", "Gruppenchat", "Selfie-Stick", "Wäscheberg", "Parkplatzsuche", "Stau", "Geburtstagstorte", "Luftballon", "Polonaise", "Verkleidung", "Konfetti", "Fotobox", "Spülmaschine ausräumen", "Schlüssel vergessen", "Montagmorgen", "Paketbote", "Staubsauger", "Fernbedienung", "Kaffeemaschine", "Regenschirm"] },
      animals: { name: "Tiere", words: ["Pinguin", "Faultier", "Giraffe", "Erdmännchen", "Krake", "Igel", "Känguru", "Flamingo", "Waschbär", "Elefant", "Chamäleon", "Eule", "Hamster", "Delfin", "Schildkröte", "Alpaka", "Biber", "Papagei", "Krokodil", "Marienkäfer"] },
      music: { name: "Musik", words: ["Ohrwurm", "Luftgitarre", "Autotune", "Festival", "One-Hit-Wonder", "Zugabe", "Bass-Drop", "Mitsing-Hymne", "Schlagzeugsolo", "Karaoke", "Plattenspieler", "Boyband", "Dirigent", "Blockflöte", "Konzertticket", "Playlist", "Kopfhörer", "Mundharmonika", "Backstage", "Weihnachtslied", "Tonleiter", "Chor"] },
      football: { name: "Fußball", words: ["Abseitsfalle", "Stadionwurst", "Gelb-Rote Karte", "Eigentor", "Elfmeterschießen", "Flutlichtspiel", "Pfostenknaller", "Fallrückzieher", "Torwarthandschuhe", "Trikottausch", "Nachspielzeit", "Videobeweis", "Fangesang", "Kopfball", "Ersatzbank", "Freistoßmauer", "Schiedsrichterpfeife", "Halbzeitpause", "Bolzplatz", "Pokalfinale"] },
      travel: { name: "Urlaub & Reisen", words: ["Sonnenbrand", "Handtuch auf der Liege", "Koffer packen", "Sicherheitskontrolle", "Zeltplatz", "Sandburg", "Postkarte", "Jetlag", "Kreuzfahrt", "Wohnmobil", "Skilift", "Sandalen mit Socken", "Reiseführer", "Hotelfrühstück", "Taucherbrille", "Stadtführung", "Souvenir", "Luftmatratze", "Hängematte", "Zugverspätung"] },
      jobs: { name: "Berufe", words: ["Feuerwehrfrau", "Zahnarzt", "Pilotin", "Bäcker", "Lehrerin", "Friseur", "Tierärztin", "Koch", "Astronaut", "Detektivin", "Busfahrer", "Gärtner", "Zauberer", "Postbotin", "Schornsteinfeger", "Bauarbeiter", "Fotografin", "Kapitän", "Bibliothekar", "Rettungssanitäterin"] },
      sports: { name: "Sport & Freizeit", words: ["Trampolin", "Minigolf", "Bowling", "Klettern", "Yoga", "Inlineskates", "Schwimmbad", "Tischtennis", "Joggen", "Wandern", "Angeln", "Kegeln", "Brettspielabend", "Puzzle", "Fahrradtour", "Schlittschuhlaufen", "Tanzkurs", "Paddeln", "Federball", "Volleyball"] },
      movies: { name: "Film & Serien", words: ["Abspann", "Spoiler", "3D-Brille", "Serienmarathon", "Gruselfilm", "Zeichentrickfilm", "Superheld", "Trailer", "Kinokasse", "Untertitel", "Stuntdouble", "Drehbuch", "Hauptrolle", "Liebeskomödie", "Fortsetzung", "Nachos", "Kinosessel", "Werbung vor dem Film", "Bösewicht", "Happy End", "Cliffhanger", "Dankesrede"] }
    },
    topics: [
      "Was ist die beste Jahreszeit – und warum?", "Wir planen einen gemeinsamen Ausflug. Wohin geht’s?",
      "Welche Erfindung ist total überbewertet?", "Ihr eröffnet zusammen ein Café. Wie heißt es und was gibt es?",
      "Was würdet ihr mit einer Million Euro machen?", "Welche Superkraft wäre im Alltag am nützlichsten?",
      "Wie sieht der perfekte Sonntag aus?", "Welches Haustier passt zu wem in dieser Runde?",
      "Ihr organisiert ein Vereinsfest. Was steht auf dem Programm?", "Morgenmensch oder Nachteule – was ist besser?",
      "Welches Schulfach sollte es unbedingt geben?", "Was nehmt ihr mit auf eine einsame Insel?",
      "Wie sieht die perfekte Pizza aus?", "Urlaub: Strand oder Berge?",
      "Was ist das nervigste Geräusch der Welt?", "Ihr seid einen Tag Bürgermeister. Welche Regel führt ihr ein?",
      "Zeitreise: lieber in die Vergangenheit oder in die Zukunft?", "Was ist das beste Brettspiel aller Zeiten?",
      "Welches Lied muss auf jeder Feier laufen?", "Was war das beste Geschenk, das ihr je bekommen habt?",
      "Wie würde der Film über euer Leben heißen?", "Welche Fähigkeit würdet ihr gerne über Nacht lernen?",
      "Was ist das perfekte Frühstück?", "Hund oder Katze – die ewige Frage.",
      "Ihr gründet eine Band. Wie heißt sie und was spielt sie?"
    ],
    missions: [
      "Bringe unauffällig das Wort „Ananas“ im Gespräch unter.", "Beantworte die nächste Frage, die dir gestellt wird, mit einer Gegenfrage.",
      "Stimme der Person links von dir bei allem begeistert zu.", "Erwähne beiläufig ein Tier, das es gar nicht gibt.",
      "Benutze dreimal das Wort „quasi“.", "Bringe jemanden dazu, „Ja, genau“ zu sagen.",
      "Erzähle eine kurze Anekdote, die komplett erfunden ist.", "Berühre zweimal deine Nase, während du sprichst.",
      "Wiederhole das letzte Wort deines Vorredners, bevor du antwortest.", "Bringe jemanden dazu, dir eine Frage zu deinem Hobby zu stellen.",
      "Sprich einen ganzen Satz im Flüsterton.", "Baue ein Sprichwort in das Gespräch ein.",
      "Beginne einen Satz mit „Das erinnert mich an meinen Onkel …“", "Mache jemandem ein Kompliment für seine Frisur.",
      "Nenne im Gespräch zweimal eine Uhrzeit.", "Benutze ein englisches Wort, das gar nicht passt.",
      "Widersprich dir einmal selbst.", "Gähne einmal herzhaft.",
      "Zähle beim Reden etwas an deinen Fingern ab.", "Sprich einen Satz in einem Dialekt.",
      "Stelle jemandem eine Frage, die mit „Stell dir vor …“ beginnt.", "Lenke das Gespräch kurz auf das Wetter.",
      "Lache über etwas, das gar nicht lustig war.", "Bringe jemanden dazu, deinen Namen zu sagen.",
      "Mache mitten im Satz eine dramatische Pause von fünf Sekunden.", "Verwende zweimal das Wort „legendär“.",
      "Schaue einmal demonstrativ auf eine unsichtbare Uhr.", "Klatsche einmal in die Hände, wenn du etwas betonst.",
      "Zitiere einen Film – oder tu zumindest so.", "Nenne im Gespräch eine Zahl über 1000.",
      "Frage jemanden nach seinem Lieblingsessen.", "Beginne zwei Sätze mit „Ehrlich gesagt …“.",
      "Verschränke dreimal die Arme, während jemand anderes spricht.", "Bringe das Wort „Pinguin“ unter.",
      "Summe kurz eine Melodie vor dich hin.", "Erzähle, dass du letzte Nacht etwas Seltsames geträumt hast.",
      "Ändere mitten in der Runde deine Meinung zum Thema.", "Imitiere unauffällig die Sitzhaltung einer anderen Person.",
      "Stelle zwei Fragen direkt hintereinander.", "Benutze dreimal das Wort „sozusagen“."
    ],
    bomb: [
      "Ein Tier", "Etwas Rotes", "Eine Stadt", "Etwas in der Küche", "Ein Obst oder Gemüse", "Ein Beruf",
      "Eine Sportart", "Etwas, das man in den Urlaub mitnimmt", "Ein Vorname", "Ein Land", "Etwas im Badezimmer",
      "Etwas, das fliegen kann", "Ein Kleidungsstück", "Etwas aus Holz", "Ein Musikinstrument", "Etwas Rundes",
      "Ein Wort, das auf -ung endet", "Etwas aus dem Supermarkt", "Eine Farbe", "Ein Brett- oder Kartenspiel",
      "Etwas, das laut ist", "Ein Fahrzeug", "Etwas im Klassenzimmer", "Ein Körperteil", "Eine Süßigkeit",
      "Etwas Kaltes", "Eine Märchenfigur", "Ein Fluss, Berg oder Meer", "Etwas mit Rädern", "Etwas im Garten",
      "Ein Gericht mit Nudeln oder Reis", "Ein Tier mit vier Beinen", "Etwas Weiches", "Etwas auf einer Geburtstagsfeier",
      "Ein Hobby", "Etwas, das leuchtet", "Ein Ort in der Stadt", "Ein Wort mit drei Silben", "Ein Werkzeug",
      "Etwas zum Frühstück", "Ein Fußballverein", "Ein Superheld oder Bösewicht", "Etwas, das man im Winter braucht",
      "Ein Wort mit Doppelbuchstaben (wie „Ball“)", "Etwas Grünes", "Ein Gegenstand im Wohnzimmer",
      { letter: "Ein Wort mit {x} am Anfang", letters: "ABDEFGHKLMNPRST" }
    ]
  },

  en: {
    cats: {
      food: { name: "Food & Treats", words: ["Fish and chips", "Pizza", "Cheese fondue", "Sunday roast", "Sushi conveyor belt", "Pancakes", "Strawberry cake", "BBQ sausage", "Popcorn", "Gingerbread", "Pretzel", "Fried egg", "Potato salad", "Candyfloss", "Rice pudding", "Hawaiian pizza", "Gummy bears", "Sandwich", "Spaghetti bolognese", "Burrito", "Ice cream sundae", "Beans on toast"] },
      everyday: { name: "Everyday & Party", words: ["Battery at 1 %", "Waving at the wrong person", "Snooze button", "Group chat", "Selfie stick", "Laundry pile", "Finding a parking space", "Traffic jam", "Birthday cake", "Balloon", "Conga line", "Fancy dress", "Confetti", "Photo booth", "Emptying the dishwasher", "Locked out", "Monday morning", "Parcel delivery", "Vacuum cleaner", "TV remote", "Coffee machine", "Umbrella"] },
      animals: { name: "Animals", words: ["Penguin", "Sloth", "Giraffe", "Meerkat", "Octopus", "Hedgehog", "Kangaroo", "Flamingo", "Raccoon", "Elephant", "Chameleon", "Owl", "Hamster", "Dolphin", "Tortoise", "Alpaca", "Beaver", "Parrot", "Crocodile", "Ladybird"] },
      music: { name: "Music", words: ["Earworm", "Air guitar", "Autotune", "Festival", "One-hit wonder", "Encore", "Bass drop", "Sing-along", "Drum solo", "Karaoke", "Record player", "Boy band", "Conductor", "Recorder", "Concert ticket", "Playlist", "Headphones", "Harmonica", "Backstage", "Christmas song", "Scales", "Choir"] },
      football: { name: "Football", words: ["Offside trap", "Stadium hot dog", "Red card", "Own goal", "Penalty shootout", "Floodlights", "Hitting the post", "Bicycle kick", "Goalkeeper gloves", "Shirt swap", "Stoppage time", "Video referee", "Fan chant", "Header", "Subs bench", "Free-kick wall", "Referee's whistle", "Half-time", "Kickabout", "Cup final"] },
      travel: { name: "Holidays & Travel", words: ["Sunburn", "Towel on the sunbed", "Packing a suitcase", "Security check", "Campsite", "Sandcastle", "Postcard", "Jet lag", "Cruise", "Camper van", "Ski lift", "Socks with sandals", "Guidebook", "Hotel breakfast", "Snorkel", "City tour", "Souvenir", "Air mattress", "Hammock", "Delayed train"] },
      jobs: { name: "Jobs", words: ["Firefighter", "Dentist", "Pilot", "Baker", "Teacher", "Hairdresser", "Vet", "Chef", "Astronaut", "Detective", "Bus driver", "Gardener", "Magician", "Postal worker", "Chimney sweep", "Builder", "Photographer", "Ship captain", "Librarian", "Paramedic"] },
      sports: { name: "Sports & Hobbies", words: ["Trampoline", "Mini golf", "Bowling", "Climbing", "Yoga", "Rollerblades", "Swimming pool", "Table tennis", "Jogging", "Hiking", "Fishing", "Darts", "Board game night", "Jigsaw puzzle", "Bike ride", "Ice skating", "Dance class", "Canoeing", "Badminton", "Volleyball"] },
      movies: { name: "Film & TV", words: ["End credits", "Spoiler", "3D glasses", "Binge-watching", "Horror film", "Cartoon", "Superhero", "Trailer", "Box office", "Subtitles", "Stunt double", "Script", "Leading role", "Romcom", "Sequel", "Nachos", "Cinema seat", "Adverts before the film", "Villain", "Happy ending", "Cliffhanger", "Award speech"] }
    },
    topics: [
      "What is the best season – and why?", "We're planning a day out together. Where are we going?",
      "Which invention is totally overrated?", "You're opening a café together. What's it called and what's on the menu?",
      "What would you do with a million?", "Which superpower would be most useful in everyday life?",
      "What does the perfect Sunday look like?", "Which pet would suit whom in this group?",
      "You're organising a club party. What's on the programme?", "Early bird or night owl – which is better?",
      "Which school subject should definitely exist?", "What would you take to a desert island?",
      "What does the perfect pizza look like?", "Holidays: beach or mountains?",
      "What is the most annoying noise in the world?", "You're mayor for a day. Which rule do you introduce?",
      "Time travel: past or future?", "What is the best board game of all time?",
      "Which song has to be played at every party?", "What was the best present you ever got?",
      "What would the film about your life be called?", "Which skill would you like to learn overnight?",
      "What is the perfect breakfast?", "Dogs or cats – the eternal question.",
      "You're starting a band. What's it called and what do you play?"
    ],
    missions: [
      "Casually work the word “pineapple” into the conversation.", "Answer the next question you're asked with another question.",
      "Enthusiastically agree with everything the person on your left says.", "Casually mention an animal that doesn't exist.",
      "Say the word “basically” three times.", "Get someone to say “Yes, exactly”.",
      "Tell a short story that is completely made up.", "Touch your nose twice while you're talking.",
      "Repeat the last word of the previous speaker before you answer.", "Get someone to ask you about your hobby.",
      "Say a whole sentence in a whisper.", "Slip a proverb into the conversation.",
      "Start a sentence with “That reminds me of my uncle …”", "Compliment someone on their hair.",
      "Mention a time of day twice.", "Use a word from another language that doesn't fit at all.",
      "Contradict yourself once.", "Give one big, hearty yawn.",
      "Count something off on your fingers while talking.", "Say one sentence in a funny accent.",
      "Ask someone a question that starts with “Imagine …”", "Briefly steer the conversation to the weather.",
      "Laugh at something that wasn't funny at all.", "Get someone to say your name.",
      "Make a dramatic five-second pause in the middle of a sentence.", "Use the word “legendary” twice.",
      "Pointedly look at an invisible watch once.", "Clap your hands once when you make a point.",
      "Quote a film – or at least pretend to.", "Mention a number above 1000.",
      "Ask someone about their favourite food.", "Start two sentences with “To be honest …”.",
      "Fold your arms three times while someone else is talking.", "Work the word “penguin” into the conversation.",
      "Hum a short tune to yourself.", "Say you had a strange dream last night.",
      "Change your opinion on the topic halfway through.", "Quietly copy the way another person is sitting.",
      "Ask two questions straight after each other.", "Say “so to speak” three times."
    ],
    bomb: [
      "An animal", "Something red", "A city", "Something in the kitchen", "A fruit or vegetable", "A job",
      "A sport", "Something you pack for a holiday", "A first name", "A country", "Something in the bathroom",
      "Something that can fly", "An item of clothing", "Something made of wood", "A musical instrument", "Something round",
      "A word ending in -ing", "Something from the supermarket", "A colour", "A board or card game",
      "Something loud", "A vehicle", "Something in a classroom", "A part of the body", "A sweet or snack",
      "Something cold", "A fairy-tale character", "A river, mountain or sea", "Something with wheels", "Something in the garden",
      "A dish with pasta or rice", "An animal with four legs", "Something soft", "Something at a birthday party",
      "A hobby", "Something that glows", "A place in town", "A word with three syllables", "A tool",
      "Something for breakfast", "A football club", "A superhero or villain", "Something you need in winter",
      "A word with a double letter (like “ball”)", "Something green", "Something in the living room",
      { letter: "A word starting with {x}", letters: "ABCDFGHLMNPRSTW" }
    ]
  }
};

/* Wort-Bombe: Aufgaben als flache Liste (Buchstaben-Aufgaben aufgefächert) */
function bombPrompts(lang) {
  const out = [];
  CONTENT[lang].bomb.forEach(p => {
    if (typeof p === "string") out.push(p);
    else for (const x of p.letters) out.push(p.letter.replace("{x}", x));
  });
  return out;
}
