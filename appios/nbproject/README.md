# NB Studio iOS Alkalmazás

Ez az iOS alkalmazás lehetővé teszi az ügyfelek számára, hogy hozzáférjenek a megosztott projektekhez a mobiltelefonjukon.

## Telepítési útmutató

### 1. Xcode beállítások

Az alkalmazás fordítása előtt a következő beállításokat kell elvégezni az Xcode-ban:

1. Nyisd meg az Xcode projektet (`nbproject.xcodeproj`)
2. Válaszd ki a projekt fájlt a navigációs panelen
3. Válaszd ki a "nbproject" target-et
4. Menj a "Info" fülre
5. Add hozzá a következő beállításokat a plist szerkesztőben:

   - **App Transport Security Settings**
     - Allow Arbitrary Loads: YES

   - **UIBackgroundModes**
     - Add hozzá a "remote-notification" értéket

Vagy forráskód nézetben (jobb klikk az Info.plist fájlra > Open As > Source Code) add hozzá a következő kódot:

```xml
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
</array>
```

Ezek a beállítások megtalálhatók a `nbproject/Info.plist.additions` fájlban is.

### 2. Alkalmazás futtatása

1. Válassz egy szimulátor eszközt vagy csatlakoztass egy iOS készüléket
2. Kattints a "Run" gombra (▶️) az Xcode-ban

## Funkciók

- Projektek hozzáadása URL és PIN kód megadásával
- Több projekt kezelése egy helyen
- Projekt részletek megtekintése (áttekintés, számlák, fájlok, fejlesztési napló)
- Értesítések fogadása új számlák és fejlesztési napló bejegyzések esetén

## Projekt struktúra

- **Models**: Adatmodellek
- **Views**: Felhasználói felület komponensek
- **Services**: Háttérszolgáltatások (API, értesítések, adattárolás)

## Hibaelhárítás

### Info.plist hiba

Ha a következő hibát kapod:

```
Multiple commands produce '/Users/username/Library/Developer/Xcode/DerivedData/nbproject-xxx/Build/Products/Debug-iphoneos/nbproject.app/Info.plist'
```

Akkor ellenőrizd, hogy nincs-e manuálisan létrehozott Info.plist fájl a projektben. Ha van, távolítsd el, és használd helyette az Xcode által generált fájlt a fent leírt beállításokkal.
