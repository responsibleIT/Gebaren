# Gebaren - Interactieve Vormcontrole met Handgebaren

Een innovatieve webapplicatie die geometrische vormen en sterren bestuurt met handgebaren via de webcam. Gebouwd met MediaPipe voor nauwkeurige handdetectie.

## Instructies

### Voordat je begint kijk je het volgende filmpje;

Visual Studio Code Editor installeren
[https://cmda.github.io/internetstandaarden-screencasts/videos/04-editor-installeren/](https://cmda.github.io/internetstandaarden-screencasts/videos/04-editor-installeren/)

### Checklist
- [ ] Download & open [Visual Studio Code (VSC)](https://code.visualstudio.com/Download)
- [ ] Download [dit project](https://responsibleit.github.io/Gebaren/gebaren.zip) als een zipje en pak het uit.
- [ ] Sleep het mapje Gebaren (NIET de zip) in <ins>Visual Studio Code</ins>
- [ ] Installeer de extensie `Live Server` vanuit de **Extensions: Marketplace** in <ins>Visual Studio Code</ins>
- [ ] Klik (rechts-onder) op `Go Live` om het project op te starten en ga aan de slag met onderstaande opdrachten

## Opdrachten

Bekijk nu de volgende 2 filmpjes;
 
### CSS Selectors
 https://cmda.github.io/internetstandaarden-screencasts/videos/08-selectors/
 
### CSS Kleurcodes
https://cmda.github.io/internetstandaarden-screencasts/videos/09-kleurcodes/

### Checklist
- [ ] Lees de onderstaande documentatie goed door
- [ ] Speel met de gebaren
- [ ] Creeër 3 (originele & leuke!) thema's met behulp van; [adobe](https://color.adobe.com/create/color-wheel) & [realtime](https://www.realtimecolors.com)
- [ ] Pas waardes aan in CSS (& Javascript)
  - [ ] Sloop de site 🔨

## 🚀 Functies

- **Real-time handdetectie** met MediaPipe
- **Vorm- en sterselectie** via handgebaren
- **Dynamische vormvoorvertoning** 
- **Intuïtieve bewegingsbesturing**
- **Beste ondersteund op Chrome**

## 🎮 Handgebaren Referentie

### 📋 Selectie Gebaren

#### 👍 **Duim Omhoog**
- **Functie**: Schakel naar sterren modus
- **Gebruik**: Houd je duim omhoog om sterrenvormen te selecteren
- **Beschikbare sterren**: 4, 5, 7, en 10 punten

#### 👎 **Duim Omlaag** 
- **Functie**: Schakel naar vormen modus
- **Gebruik**: Houd je duim omlaag om geometrische vormen te selecteren
- **Beschikbare vormen**: Driehoek, Vierkant, Vijfhoek, Zeshoek

#### ✌️ **Victory/Peace**
- **Functie**: Wissel tussen vormen en sterren
- **Gebruik**: Maak een V-teken om te schakelen tussen de twee modi

### 🔢 Vorm Selectie via Vingers

#### 🤏 **Vingertelling**
- **1-10 vingers**: Houd het gewenste aantal vingers omhoog
- **Voorbeeld**: 
  - 3 vingers = Driehoek (in vormen modus)
  - 5 vingers = 5-puntige ster (in sterren modus)
- **Bevestiging**: Maak een vuist om je selectie te bevestigen

### 🎯 Beweging & Transformatie

#### ✋ **Handbeweging**
- **Functie**: Beweeg de vorm over het scherm
- **Gebruik**: Beweeg je hand om de vorm te verplaatsen
- **Tip**: Gebruik je dominante hand voor de beste resultaten

#### 🤏 **Knijpgebaar (Pinch)**
- **Functie**: Vergroot of verklein de vorm
- **Gebruik**: 
  - Breng beide handen naar elkaar toe = kleiner maken
  - Beweeg beide handen van elkaar af = groter maken
- **Tip**: Gebruik beide handen voor deze transformatie
- **Bereik**: 0.5x tot 2x de oorspronkelijke grootte

#### 🔄 **Handrotatie**
- **Functie**: Roteer de vorm
- **Gebruik**: Draai je hand om de vorm te roteren
- **Bereik**: 360° rotatie mogelijk

### 🔄 Reset Gebaren

#### 🤟 **"I Love You" Gebaar**
- **Functie**: Reset de grootte terug naar `1`
- **Gebruik**: Steek duim, wijsvinger en pink omhoog
- **Effect**: 
  - Schaal terug naar 100%
  - Rotatie terug naar 0°
  - Vorm blijft op huidige positie

#### ✊ **Vuist**
- **Functie**: Bevestig vormkeuze tijdens preview
- **Gebruik**: Maak een vuist wanneer je de gewenste vorm ziet
- **Effect**: Selecteert de vorm definitief

## 🛠️ Technische Details

### Vereisten
- **Webcam**: Voor handdetectie
- **Moderne browser**: Chrome & Firefox
- **Internetverbinding**: Voor MediaPipe CDN

### Ondersteunde Browsers
- ✅ Chrome (aanbevolen)
- ✅ Firefox
- ✅ Edge

### Prestatie Tips
- **Goede verlichting**: Zorg voor voldoende licht op je handen
- **Stabiele camera**: Plaats je camera stevig voor betere detectie
- **Handafstand**: Houd je handen 30-60cm van de camera
- **Effen achtergrond**: Gebruik een even achtergrond voor betere detectie

## 📁 Project Structuur

```
Gebaren/
├── assets/
│   ├── fonts/          # Lettertypen
│   ├── images/         # Afbeeldingen en iconen
│   └── svg/           # SVG vormbestanden
├── scripts/
│   ├── gestureControl.js    # Handgebaar detectie
│   └── nonGestureControl.js # UI en vormmanipulatie
├── styles/
│   ├── core/          # Basis CSS bestanden
│   ├── animations.css # Animaties
│   ├── stylesheet.css # Hoofdstijlblad
│   └── pas-dit-aan.css  # CSS variabelen / waardes om mee te spelen
├── index.html         # Hoofdpagina
└── README.md         # Deze documentatie
```

## 🔧 Configuratie

## 🐛 Probleemoplossing

### Webcam werkt niet
- Controleer browser permissies
- Herstart de browser
- Controleer of andere applicaties de camera gebruiken

### Handdetectie is onnauwkeurig
- Verbeter de verlichting
- Gebruik een even achtergrond
- Houd handen binnen het camerabeeld
- Vermijd snelle bewegingen


## 📄 Licentie

Dit project valt onder de MIT licentie. Zie `LICENSE` voor details.
