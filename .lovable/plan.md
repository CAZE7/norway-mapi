## Ziel

Die Karte/Sidebar soll beim Klick in die Suchleiste, beim Tippen und beim Scrollen nicht mehr einfrieren; auch das erste Laden soll wieder schneller und stabiler wirken.

## Bestätigte Hinweise aus dem Code

- Beim Start werden alle Marker direkt in `NorwayMap` gebaut und per `cluster.addLayers(built)` hinzugefügt.
- Bei jeder Such-/Filteränderung wird ein großer Marker-Diff berechnet und anschließend `removeLayers`/`addLayers` auf dem MarkerCluster ausgeführt.
- Die Sidebar lädt für sichtbare Ergebniszeilen Bilder über `PlaceThumb`/`lookupPlaceImage`; beim Scrollen können dadurch viele Wikipedia/Commons-Anfragen und `localStorage`-Cache-Zugriffe parallel starten.
- Es gibt bereits eine bekannte Projekt-Notiz zu Focus-/Map-Deadlocks; `Sheet modal={false}` ist gesetzt, aber der aktuelle Freeze tritt auch auf Desktop/Sidebar-Interaktion auf und passt eher zu zu viel synchroner Marker-/Thumbnail-Arbeit beim Fokus/Scrollen/Suchen.

## Umsetzung

1. **Freeze reproduzieren und messen**
   - Mit Playwright die Startseite öffnen, Suche fokussieren, tippen und Sidebar scrollen.
   - Browser-Konsole, lange Tasks und sichtbaren Zustand prüfen, damit die Änderung gegen genau dieses Verhalten validiert wird.

2. **Marker-Updates entkoppeln und abbrechbar machen**
   - In `NorwayMap` den sichtbaren Marker-Sync so umbauen, dass große Add/Remove-Operationen in kleine Frames aufgeteilt werden.
   - Alte geplante Marker-Updates abbrechen, sobald eine neue Suche/Filterung kommt.
   - `currentVisibleRef` erst passend zur geplanten Arbeit kontrolliert aktualisieren, damit keine Marker-Spam-Schleifen entstehen.

3. **Suche weniger aggressiv auf die Karte anwenden**
   - Die Sidebar-Eingabe bleibt sofort bedienbar.
   - Die Kartenfilterung bekommt eine etwas stabilere Verzögerung/Transition, damit nicht bei jedem Fokus-/Tastaturereignis der komplette Cluster blockiert.

4. **Thumbnail-Ladevorgänge beim Scrollen drosseln**
   - `PlaceThumb` so begrenzen, dass nicht dutzende externe Bildsuchen gleichzeitig starten.
   - Bereits laufende/gleiche Bild-Lookups wiederverwenden, statt dieselbe Anfrage mehrfach zu starten.
   - Dadurch wird schnelles Scrollen in der linken Liste deutlich leichter für den Main Thread und das Netzwerk.

5. **ScrollArea vereinfachen, falls nötig**
   - Wenn Radix `ScrollArea` im Test weiter am Freeze beteiligt ist, ersetze ich sie in der Ergebnisliste durch native `overflow-y-auto`-Container, um Focus-/Pointer-Komplexität zu reduzieren.

6. **Validierung**
   - Nach der Änderung erneut per Playwright testen: initiales Laden, Klick in Suche, Tippen, schnelles Scrollen links, Filterwechsel.
   - Nur als erledigt melden, wenn die Seite dabei weiter reagiert und keine Freeze-/Long-Task-Symptome mehr sichtbar sind.
