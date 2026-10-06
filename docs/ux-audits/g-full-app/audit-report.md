# ProMan — Full App Journey — heuristic audit

**Auditor:** Claude (ux-audit skill)
**Date:** 2026-10-06
**Screens reviewed:** 10
**User goal:** Ein Nutzer soll Aufgaben im Board steuern, Kundenstammdaten pflegen, Docs finden und bearbeiten und zwischen Views wechseln — und dabei immer wissen, wo er ist und was der nächste Schritt ist.

## Summary

Die App deckt viele Hubs ab, aber die Shell bleibt überall gleich laut: Vault-CTA und „+ Neue Aufgabe“ dominieren auch in Docs, Client-Seite und Backoffice. Kunden-Seite und Docs sind nutzbar, skalieren aber in Liste/Chrome noch wie ein Single-Doc-Workspace. Mobile Bottom-Nav existiert; der Task-Dialog auf schmalen Viewports frisst den Kontext. Größter Hebel: kontextuelle Primäraktionen pro Hub und Docs-Liste für Wachstum.

## Findings by screen

### 1. Board überblicken und Aufgaben steuern

#### 1.1 🟡 Zahl neben Kundenname meint Projekte, liest sich wie Tasks (`ia-client-count-means-projects`)

- **Heuristic:** [Nielsen #2 (Match between system and real world)](https://www.nngroup.com/articles/ten-usability-heuristics/) + [Gerhardt-Powals #5 (Names related to function)](https://en.wikipedia.org/wiki/Heuristic_evaluation#Gerhardt-Powals'_cognitive_engineering_principles)
- **Severity:** 2 (Minor)
- **Screen:** `01-board.png`
- **Region:** x=1%, y=52%, w=17%, h=8%
- **What we see:** Im Kundenbaum steht rechts neben „Acme Corporation“ eine „1“ — tatsächlich Projektanzahl, leicht als offene Tasks lesbar.
- **Why it matters:** Falsche mentale Modelle beim Scannen der Sidebar, besonders neben KPI „Offene Aufgaben“.
- **Recommendation:** Zahl labeln („1 Proj.“) oder durch Chevron/Collapse ersetzen; Task-Counts nur auf Projektebene.


### 2. Aufgaben in der Liste finden

#### 2.1 ⚪ Zuweisungsspalte ist durchgehend leer (—) (`list-assignee-all-empty`)

- **Heuristic:** [Gerhardt-Powals #8 (Only needed information)](https://en.wikipedia.org/wiki/Heuristic_evaluation#Gerhardt-Powals'_cognitive_engineering_principles) + [Nielsen #8 (Aesthetic and minimalist design)](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Severity:** 1 (Cosmetic)
- **Screen:** `02-list.png`
- **Region:** x=88%, y=28%, w=10%, h=40%
- **What we see:** Alle vier Zeilen zeigen unter „ZUWEISUNG“ einen Gedankenstrich; die Spalte belegt trotzdem Breite.
- **Why it matters:** Bei ungenutztem Assignees-Feature ist die Spalte Rauschen und verdrängt nützlichere Felder (Tags/Cycle).
- **Recommendation:** Spalte ausblenden bis Members genutzt werden, oder Default-Assignee in Demo setzen.


### 3. Kundenstammdaten pflegen

#### 3.1 🟡 Kunden-Seite hat mehrere gleich laute Primärflächen (`client-page-primary-action-collision`)

- **Heuristic:** COG.2 (Primary action count) + [Fitts's Law](https://lawsofux.com/fittss-law/) + [Hick's Law](https://lawsofux.com/hicks-law/)
- **Severity:** 2 (Minor)
- **Screen:** `03-client-page.png`
- **Region:** x=68%, y=10%, w=28%, h=8%
- **What we see:** Auf einer Seite konkurrieren „Board öffnen“ (primary), „Docs öffnen“, Topbar „Neue Aufgabe“, Sidebar „Vault verbinden“ und unten „Speichern“.
- **Why it matters:** Unklar, ob der Job Navigation (Board/Docs) oder Speichern der Stammdaten ist.
- **Recommendation:** Eine Primärzone: Speichern sticky am Stammdaten-Block; Board/Docs als Secondary; Vault/Neue Aufgabe in der Shell dämpfen.

#### 3.2 ⚪ Kontakt-Badge „PRIMARY“ bricht DE-UI (`client-page-primary-english-badge`)

- **Heuristic:** [Consistent terminology (Content Design)](https://uxcontent.com/10-content-design-heuristics/) + [Nielsen #4 (Consistency and standards)](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Severity:** 1 (Cosmetic)
- **Screen:** `03-client-page.png`
- **Region:** x=62%, y=42%, w=30%, h=8%
- **What we see:** Ansprechpartner zeigen das Badge „PRIMARY“ in einer sonst deutschen Oberfläche („Ansprechpartner“, „Rolle“).
- **Why it matters:** Kleine Inkonsistenz signalisiert unpolierte i18n und erschwert Scanning.
- **Recommendation:** Badge „Primär“ / i18n-Key nutzen (wie im Client-i18n bereits vorgesehen).


### 4. Docs finden und bearbeiten

#### 4.1 🟠 Docs-Liste ist flache Karte mit Snippet — skaliert nicht (`docs-list-does-not-scale`)

- **Heuristic:** [Gerhardt-Powals #6 (Group data meaningfully)](https://en.wikipedia.org/wiki/Heuristic_evaluation#Gerhardt-Powals'_cognitive_engineering_principles) + [F-pattern scanning](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/) + FTU.4 (Empty states do work)
- **Severity:** 3 (Major)
- **Screen:** `04-docs.png`
- **Region:** x=18%, y=12%, w=22%, h=35%
- **What we see:** Die mittlere Spalte zeigt eine große Karte mit Titel, Fließtext-Snippet, Kunde und Datum — bei einem Doc ok, ohne Suche, Tree oder Projektgruppierung.
- **Why it matters:** Bei wachsender Wissensbasis wird Scannen und Finden teuer; das ist das bekannte Skalierungsrisiko des Docs-Hubs.
- **Recommendation:** Kompakte Titelliste + Suche; Gruppierung nach Projekt; Snippet nur bei Hover/aktiv; optional Scope-Filter des aktuellen Kunden klarer labeln.

#### 4.2 ⚪ Doc-Titel erscheint dreifach (Liste, Header, Markdown-H1) (`docs-title-triplicated`)

- **Heuristic:** [Nielsen #8 (Aesthetic and minimalist design)](https://www.nngroup.com/articles/ten-usability-heuristics/) + [Consistent terminology (Content Design)](https://uxcontent.com/10-content-design-heuristics/)
- **Severity:** 1 (Cosmetic)
- **Screen:** `04-docs.png`
- **Region:** x=42%, y=18%, w=50%, h=22%
- **What we see:** „Anforderungsspezifikation Portal“ steht in der Listenkarte, als Editor-Titel und erneut als erste Zeile `# …` im Body.
- **Why it matters:** Redundanz kostet Viewport und verwischt, welches Feld die Quelle der Wahrheit ist.
- **Recommendation:** Entweder H1 aus Body ableiten oder Body ohne doppelten Titel starten; Listenkarte nur Titel + Meta.


### 5. Kundenverwaltung im Backoffice

#### 5.1 🟡 Backoffice wiederholt Detailpflege der Kunden-Seite (`backoffice-overlaps-client-page`)

- **Heuristic:** [Nielsen #4 (Consistency and standards)](https://www.nngroup.com/articles/ten-usability-heuristics/) + [Shneiderman #1 (Strive for consistency)](https://www.cs.umd.edu/~ben/goldenrules.html) + COG.3 (New concept count)
- **Severity:** 2 (Minor)
- **Screen:** `05-backoffice.png`
- **Region:** x=20%, y=48%, w=75%, h=45%
- **What we see:** Backoffice zeigt für Acme Kontakte, Projekte und Status-Spalten-Editor — parallel zur neuen Kunden-Seite mit Stammdaten/Kontakten/Projekten. Zusätzlich „Kunde“-Link und Inline-Edit.
- **Why it matters:** Zwei Orte für dieselbe Pflege erzeugen „wo editiere ich?“-Unsicherheit und Drift-Risiko.
- **Recommendation:** Backoffice = Übersicht anlegen/löschen + Link zur Kunden-Seite; Detailformulare dort entfernen oder klar als „Schnellbearbeitung“ kennzeichnen.

#### 5.2 🟡 Status-Spalten als Roh-DSL schrecken Nicht-Power-User ab (`backoffice-status-columns-raw-dsl`)

- **Heuristic:** FTU.5 (Jargon budget) + [Nielsen #2 (Match between system and real world)](https://www.nngroup.com/articles/ten-usability-heuristics/) + [Bastien & Scapin (Guidance / prompting)](https://en.wikipedia.org/wiki/Heuristic_evaluation#Bastien_and_Scapin)
- **Severity:** 2 (Minor)
- **Screen:** `05-backoffice.png`
- **Region:** x=55%, y=72%, w=40%, h=18%
- **What we see:** Projektkonfiguration verlangt Textarea-Zeilen `todo|Zu erledigen|5` mit Label „id|Name|WIP“.
- **Why it matters:** Fehleranfällig und weit entfernt von der sonst visuell geführten UI; hohe Cognitive Load für seltene Admin-Aufgabe.
- **Recommendation:** Strukturierte Zeilen-UI (Name, WIP-Stepper, optional ID advanced); DSL nur als Import/Export.


### 7. Aufgabe im Dialog bearbeiten

#### 7.1 🟠 Task-Dialog bleibt der dichteste Screen der App (`task-dialog-density-cross-app`)

- **Heuristic:** [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) + [Hick's Law](https://lawsofux.com/hicks-law/) + COG.1 (Decision count)
- **Severity:** 3 (Major)
- **Screen:** `07-task-dialog.png`
- **Region:** x=28%, y=10%, w=44%, h=80%
- **What we see:** Über dem Board öffnet der Dialog weiterhin die volle Feldmenge (Kunde bis Git-URL) ohne Abschnitte — gleiches Muster wie im First-time-Audit.
- **Why it matters:** Jeder Hub, der in Aufgaben mündet, erbt dieselbe Friction; das bremst Tagesgeschäft und Mobile gleichermaßen.
- **Recommendation:** Essentials-first Dialog app-weit; „Mehr Details“ für Cycle/Git/Recurrence/Dependencies.


### 9. Timeline und Abhängigkeiten lesen

#### 9.1 🟡 Gantt-Farblegende mischt Priorität und Status (`gantt-priority-legend-vs-status-colors`)

- **Heuristic:** [Gerhardt-Powals #2 (Reduce uncertainty)](https://en.wikipedia.org/wiki/Heuristic_evaluation#Gerhardt-Powals'_cognitive_engineering_principles) + [Significance of codes (Bastien & Scapin)](https://en.wikipedia.org/wiki/Heuristic_evaluation#Bastien_and_Scapin) + [Nielsen #4 (Consistency and standards)](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Severity:** 2 (Minor)
- **Screen:** `09-gantt.png`
- **Region:** x=55%, y=14%, w=35%, h=6%
- **What we see:** Legende nennt „Normal / Dringend / Erledigt“ — Priorität und Done-Status in einer Farbcodierung; Balkenfarben folgen nicht klar den Board-Statusfarben.
- **Why it matters:** Nutzer, die vom Board kommen, müssen Farben neu lernen und können „orange = urgent“ mit „in progress“ verwechseln.
- **Recommendation:** Eine Codierung wählen: entweder Statusfarben wie Board oder Priorität als Stripe/Icon; Legende entsprechend umbenennen.


### 10. Board auf dem Handy nutzen

#### 10.1 🟡 Mobile: Bottom-Nav und Board müssen neben Dialog-Sheet bestehen (`mobile-dialog-eats-board-context`)

- **Heuristic:** [Fitts's Law](https://lawsofux.com/fittss-law/) + [Nielsen #3 (User control and freedom)](https://www.nngroup.com/articles/ten-usability-heuristics/) + [Miller's Law](https://lawsofux.com/millers-law/)
- **Severity:** 2 (Minor)
- **Screen:** `10-mobile-board.png`
- **Region:** x=0%, y=85%, w=100%, h=15%
- **What we see:** Im schmalen Viewport (≤768px) erscheinen Bottom-Nav und einspaltiges Board; der Task-Dialog als Full-Height-Sheet bleibt der dominante Mobile-Pfad und verdeckt Board-Kontext vollständig.
- **Why it matters:** Ohne sichtbaren Board-Kontext beim Editieren steigt Orientierungsverlust; Zurück/Abbrechen muss perfekt sitzen.
- **Recommendation:** Sheet-Header mit Issue-Key + Status-Chip; nach Speichern kurzer Board-Peek; Bottom-Nav unter offenem Sheet nicht konkurrieren lassen (bereits scroll-locked — Fokus sichtbar halten).


## Journey-level findings

#### J.1 🟠 „+ Neue Aufgabe“ bleibt Primär-CTA in Docs, Kunde und Backoffice (`journey-global-new-task-everywhere`)

- **Heuristic:** COG.2 (Primary action count) + [Nielsen #4 (Consistency and standards)](https://www.nngroup.com/articles/ten-usability-heuristics/) + [Match between system and real world (Nielsen #2)](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Severity:** 3 (Major)
- **Screen:** `journey-level`
- **Region:** x=0%, y=0%, w=100%, h=100%
- **What we see:** In Docs, Kunden-Seite und Backoffice ist die lauteste Topbar-Aktion weiterhin „+ Neue Aufgabe“, obwohl der lokale Job ein Doc, Stammdaten oder Kundenanlage ist.
- **Why it matters:** Nutzer im falschen Hub starten leicht eine Aufgabe statt der intendierten Aktion — oder die echte Hub-Aktion (neues Doc / Speichern) wirkt sekundär.
- **Recommendation:** Topbar-Primäraktion kontextuell: Docs → „+ Neues Doc“, Backoffice → „+ Kunde“, Client → „Board öffnen“ oder „+ Aufgabe für diesen Kunden“; globale Aufgabe in Overflow/⌘K belassen.

#### J.2 🟠 Vault-Panel bleibt über alle Hubs die lauteste Sidebar-Fläche (`journey-vault-panel-global-noise`)

- **Heuristic:** [Nielsen #8 (Aesthetic and minimalist design)](https://www.nngroup.com/articles/ten-usability-heuristics/) + COG.2 (Primary action count) + [Gerhardt-Powals #8 (Only needed information)](https://en.wikipedia.org/wiki/Heuristic_evaluation#Gerhardt-Powals'_cognitive_engineering_principles)
- **Severity:** 3 (Major)
- **Screen:** `journey-level`
- **Region:** x=0%, y=0%, w=100%, h=100%
- **What we see:** Von Board über Liste, Kunde, Docs, Backoffice und Gantt sitzt dasselbe orange „Vault verbinden“-Panel oben in der Sidebar — auch wenn der Nutzer längst arbeitet.
- **Why it matters:** Persistente Conversion-Fläche konkurriert dauerhaft mit Navigation und Scope-Wahl; der Arbeitskontext wirkt nie „settled“.
- **Recommendation:** Nach Onboarding/Dismiss zu kompakter Statuszeile kollabieren; volle Fläche nur Offline-First-Run oder permission_needed.


## Things that work well

- Sidebar → Kundenname öffnet eine echte Kunden-Seite mit KPIs, Stammdaten, Kontakten und Projekten.
- Liste zeigt Issue-Key, Status, Priorität und Scope in einer scannbaren Tabelle.
- Gantt visualisiert Abhängigkeiten und Today-Marker klar.
- ⌘K gruppiert Aktionen und Views mit Shortcuts.
- Docs-Editor mit Bearbeiten/Vorschau und Client/Projekt-Zuordnung.

## What we couldn't audit from screenshots alone

- Keyboard- und Screenreader-Pass über CustomSelects in Client-Seite und Docs-Meta.
- Mobile Edge-Swipe Drawer und Bottom-Nav Fokusreihenfolge.
- Kontrast KPI-Labels und muted Meta-Text in Docs/Backoffice.
- Vault OS-Picker und Permission-Reload-Flow (nicht im Screenshot).
