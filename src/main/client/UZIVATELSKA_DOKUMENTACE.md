# Uživatelská dokumentace aplikace NETLET Analysis & Visualization

Aplikace slouží k prohlížení a porovnávání katalogů historické korespondence. Umožňuje vyhledávat dopisy, sledovat jejich časové a geografické rozložení a zkoumat vztahy mezi osobami, profesemi a tématy. Tento návod popisuje všechny stránky dostupné v aplikaci a základní práci s jejich ovládacími prvky.

## Jak začít

1. Na úvodní stránce vyberte jeden nebo více katalogů. Vedle názvu katalogu můžete otevřít jeho detail tlačítkem s ikonou informací.
2. Podle potřeby vyplňte další podmínky: období **Od** a **Do**, osobu, místo, klíčové slovo nebo jazyk. U polí s nabídkou vyberte odpovídající položku.
3. Tlačítkem s ikonou lupy otevřete výsledky na časové ose. Tlačítko **View** na kartě otevře zvolený typ vizualizace s nastaveným výběrem.

Na stránkách vizualizací se v horní liště přes **Typy zobrazení** přepíná mezi dostupnými pohledy. Vpravo lze změnit jazyk rozhraní. Logo vede zpět na úvodní stránku. Karty bez aktivního tlačítka **View** zatím neotevírají samostatnou stránku.

### Společné ovládání vizualizací

V levém panelu se vybírají katalogy a zpřesňují výsledky. Zaškrtnutím katalogu jej přidáte do výběru nebo odeberete; **Vybrat všechny** změní výběr hromadně. Skupiny filtrů lze rozbalit a jejich položky vyhledat zadáním části názvu. Kliknutí na položku ji použije jako filtr. Ikona zákazu položku vyloučí. Použité podmínky jsou uvedeny v části **Vybrané filtry**; kliknutím na položku ji odstraníte. Číslo v závorce vyjadřuje počet odpovídajících záznamů.

Nad většinou vizualizací je graf s počty dopisů podle roku. Kliknutím na rok vyberete jeden rok, tažením přes graf vymezíte delší období. Výběr můžete zrušit ovládacím prvkem grafu. Změna období upraví související výsledky. Hranici mezi panelem filtrů a obsahem lze na stránkách s děleným rozložením přetáhnout.

Výběr katalogů a filtrů se promítá do adresy stránky. Odkaz na aktuální zobrazení proto můžete zkopírovat z adresního řádku prohlížeče.

## Přehled stránek

### Úvodní stránka (`/` a `/home`)

Úvodní stránka obsahuje vyhledávací formulář a karty dostupných vizualizací. Slouží k vytvoření výchozího výběru katalogů, dat, osob, míst, klíčových slov a jazyků. Po odeslání vyhledávání se otevře **Časová osa**. Volbou karty přejdete přímo na vybranou vizualizaci.

### Časová osa (`/timeline`)

Stránka zobrazuje počty dopisů v čase a pod grafem tabulku jednotlivých dopisů. Přepínačem **křivka / sloupce** změníte podobu grafu; volba **dva grafy** zobrazí oddělené grafy. Časový výřez lze upravit přímo v grafu. Tabulka má stránkování a obsahuje katalog, autora, adresáta, místa odeslání a určení i datum. Jména a místa vedou na jejich detaily. Ikona informací otevře detail dopisu, ikona šipky jeho záznam v HIKO.

### Mapa (`/map`)

Mapa ukazuje místa spojená s korespondencí a spojnice mezi místy odeslání a určení. Velikost značek odpovídá počtu záznamů podle legendy na stránce. Volbou **Zobrazit spojnice** lze spojnice skrýt nebo znovu ukázat. Kliknutí na místo nebo spojnici otevře panel s odpovídajícími dopisy; z něj lze přejít na detail dopisu. Výběr v levém panelu a časový graf omezují zobrazená data. Mapu lze přibližovat a posouvat.

### Alternativní mapa (`/map-view`)

Tato stránka nabízí další mapové zobrazení dostupné přímou adresou. Místa jsou vyznačena body a dopisové trasy křivkami. Kliknutí na bod ukáže počty dopisů z daného místa a do něj; kliknutí na křivku zobrazí přehled dopisů na trase. V levém panelu jsou filtry a seznamy adresátů a zmíněných osob, jejichž výběrem lze zvýraznit související trasy. Časový graf omezuje období zobrazení.

### Vztahy mezi osobami (`/identities`)

Síťový graf ukazuje vazby mezi autory, adresáty a zmíněnými osobami. Výběr katalogů, filtrů a období mění rozsah sítě. Kliknutí na uzel osoby otevře související přehled korespondence; na detail jednotlivého dopisu lze přejít z informačního panelu. Najetí na položku v levém panelu pomáhá příslušnou osobu v grafu zvýraznit.

### Centralita (`/centrality`)

Síťový graf slouží ke zkoumání postavení osob v korespondenční síti. Filtry a časový graf umožňují omezit zkoumané dopisy. Volba **Včetně hlavních aktérů** mění zahrnutí hlavních osob daných katalogů. Volba **Zobrazit všechna jména** upravuje zobrazení popisků v grafu. Kliknutím na uzel otevřete údaje o příslušné osobě a jejích dopisech.

### Vztah mezi dvěma sítěmi (`/relation`)

Stránka porovnává korespondenční sítě dvou katalogů. V levém panelu **Katalogy pro porovnání** vyberte další katalog; nedostupné kombinace jsou neaktivní. Časové rozmezí a další filtry mění zobrazené vztahy. Volby **Včetně hlavních aktérů** a **Zobrazit všechna jména** upravují síťový graf. Kliknutí na uzel zobrazí související dopisy v informačním panelu.

### Profese (`/professions`)

Stránka porovnává profesní skupiny osob v korespondenci. Dva kruhové grafy ukazují rozdělení profesí podle počtu dopisů a podle počtu osob; síťový graf zobrazuje vztahy mezi profesními skupinami. V části **Zobrazit identity** určíte, zda se mají započítat autoři, adresáti, nebo obě skupiny. Výběr katalogů, filtrů a období aktualizuje grafy.

### Klíčová slova (`/keywords`)

Stránka zobrazuje témata korespondence. Kruhový graf ukazuje rozdělení klíčových slov a další grafy jejich vazby na autory a adresáty. V části **Zobrazit identity** lze obě skupiny zapnout nebo vypnout. Filtry v levém panelu a výběr období mění zobrazené výsledky.

### Období (`/periods`)

Stránka porovnává klíčová slova a profese ve třech obdobích. Pro každé období se v grafech zobrazuje samostatné rozdělení. V levém panelu lze navíc zaškrtnout konkrétní klíčová slova a tím srovnání zúžit. K dispozici jsou také běžné filtry a časový výběr.

### Detail katalogu (`/catalog/:id`)

Detail uvádí počet dopisů a počty autorů, adresátů a zmíněných osob v katalogu. Graf ukazuje rozložení korespondence v čase. V části **Korespondence** lze vybrat hlavní osobu a sledovat její časový přehled. Ikona lupy u počtu dopisů otevře časovou osu omezenou na daný katalog.

### Detail dopisu (`/letter/:id`)

Detail dopisu sdružuje datum, autory, adresáty, zmíněné osoby, místa odeslání a určení a mapu. Následují údaje o obsahu, například klíčová slova, jazyky, incipit, explicit, abstrakt a dostupný text. Sekce **Repozitáře a verze** uvádí údaje o dochovaných kopiích a jejich uložení, pokud jsou v záznamu vyplněny. Kliknutím na jméno nebo místo otevřete příslušný detail.

### Detail osoby (`/identity/:id`)

Stránka uvádí základní údaje o osobě, její profese a počty dopisů podle role autora, adresáta nebo zmíněné osoby. Grafy ukazují vývoj v čase, zastoupení katalogů a nejčastější korespondenční partnery. Výběrem partnera v grafu lze zobrazit časový průběh vzájemné korespondence.

### Detail místa (`/place/:id`)

Stránka ukazuje název místa, jeho souřadnice, mapu a počty dopisů spojených s místem. Počty jsou rozděleny na dopisy odeslané z místa, doručené do místa a dopisy, v nichž je místo zmíněno. Pokud má záznam identifikátor GeoNames, je k dispozici odkaz na tuto službu.

## Když se nic nezobrazuje

Zkontrolujte, zda je vybrán alespoň jeden katalog a zda nejsou aktivní příliš úzké filtry nebo časové rozmezí. Použité filtry lze odebrat v levém panelu. Některé kombinace katalogů nebo období nemají dostupná data; aplikace v takovém případě zobrazí upozornění.
