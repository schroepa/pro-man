# ProMan — First-time → produktive Arbeit — heuristic audit

**Auditor:** Claude (ux-audit skill)
**Date:** 2026-10-06
**Screens reviewed:** 5
**User goal:** Ein Erstnutzer soll Vault verbinden oder bewusst lokal starten, die erste Aufgabe anlegen und sie im Board bewegen — und sich danach orientiert, nicht überfordert fühlen.

## Summary

Der First-Run zeigt gleichzeitig Vault-Onboarding, Demo-Workload und volles Power-User-Chrome. Die stärkste Reibung: Demo-Daten wirken wie echte Arbeit, während Vault-CTAs mehrfach konkurrieren. Der Task-Dialog packt zu viele Felder vor den ersten Speichern. Empty State und „Erste Aufgabe“ sind klar — die Umgebung drumherum (Filter, Demo-Kunden) bleibt laut.

## Findings by screen

### 1. Landen und Onboarding verstehen

#### 1.1 🟠 Demo-Board wirkt wie echte Kundendaten (`onboarding-demo-data-unlabelled`)

- **Heuristic:** FTU.2 (No required prerequisite knowledge) + TRUST.3 (State clarity) + [Shneiderman #7 (Internal locus of control)](https://www.cs.umd.edu/~ben/goldenrules.html)
- **Severity:** 3 (Major)
- **Screen:** `01-onboarding-board.png`
- **Region:** x=20%, y=42%, w=78%, h=55%
- **What we see:** Beim ersten Besuch liegen vier Aufgaben von Acme, TechStart und Intern auf dem Board, inkl. KPI-Zahlen und Kundenbaum — ohne Label wie „Demo“ oder „Beispieldaten“. Parallel fordert das Banner „Vault verbinden“.
- **Why it matters:** Erstnutzer wissen nicht, ob sie fremde/echte Daten sehen oder eine Sandbox. Das untergräbt Vertrauen und macht den Vault-Schritt unklar („muss ich das jetzt übernehmen?“).
- **Recommendation:** Demo explizit kennzeichnen (Banner-Chip „Beispieldaten“, Sidebar-Badge) und optional einen CTA „Demo leeren / mit leerem Workspace starten“ anbieten.

#### 1.2 🟠 Zwei gleichlautende Vault-Primäraktionen konkurrieren (`onboarding-competing-vault-ctas`)

- **Heuristic:** COG.2 (Primary action count) + FTU.1 (Next action obvious) + [Hick's Law](https://lawsofux.com/hicks-law/)
- **Severity:** 3 (Major)
- **Screen:** `01-onboarding-board.png`
- **Region:** x=20%, y=12%, w=78%, h=14%
- **What we see:** „Vault verbinden“ erscheint als Primärbutton im Welcome-Banner und erneut im Sidebar-Panel. Dazu kommen „Loslegen“, „+ Neue Aufgabe“ und Spalten-„Aufgabe anlegen“.
- **Why it matters:** Mehrere gleich gewichtete nächste Schritte erhöhen die Entscheidungskosten genau im Moment, in dem Orientierung nötig ist.
- **Recommendation:** Eine Primärstory pro First-Run: Banner = Vault; Sidebar-Panel nach Dismiss auf Secondary reduzieren; „Neue Aufgabe“ erst nach Loslegen oder als einzige Alternative hervorheben.

#### 1.3 🟡 Vault-/Obsidian-Jargon ohne Einführung (`onboarding-jargon-vault-obsidian`)

- **Heuristic:** FTU.5 (Jargon budget) + [Nielsen #2 (Match between system and real world)](https://www.nngroup.com/articles/ten-usability-heuristics/) + [Plain language (Content Design)](https://uxcontent.com/10-content-design-heuristics/)
- **Severity:** 2 (Minor)
- **Screen:** `01-onboarding-board.png`
- **Region:** x=2%, y=8%, w=16%, h=14%
- **What we see:** Banner und Sidebar sprechen von „Vault“, „Obsidian-kompatible .md-Dateien“ und „Browser-Cache“, bevor das Produkt diese Begriffe erklärt.
- **Why it matters:** Nutzer ohne Obsidian-Kontext müssen intern übersetzen („Ordner? Notizen? Backup?“), bevor sie die Kernentscheidung treffen.
- **Recommendation:** First-Run-Copy auf Nutzen umstellen: z. B. „Ordner auf diesem Mac wählen — Aufgaben als Markdown speichern“. „Vault/Obsidian“ als sekundären Hinweis.

#### 1.4 🟡 „Loslegen“ verrät nicht, was passiert (`onboarding-loslegen-unclear`)

- **Heuristic:** [Specific, not generic (Content Design)](https://uxcontent.com/10-content-design-heuristics/) + FTU.1 (Next action obvious)
- **Severity:** 2 (Minor)
- **Screen:** `01-onboarding-board.png`
- **Region:** x=72%, y=18%, w=12%, h=5%
- **What we see:** Der Secondary-Button heißt „Loslegen“ und steht neben „Vault verbinden“. Optisch wirkt er wie „ohne Vault starten“, erklärt aber nicht, dass nur das Banner geschlossen wird und Demo-Daten bleiben.
- **Why it matters:** Erwartung und Ergebnis können auseinanderlaufen — Nutzer denken, sie starten „richtig“, bleiben aber im Demo-Board mit Vault-Panel.
- **Recommendation:** Label konkretisieren: „Mit Beispieldaten starten“ oder „Ohne Ordner fortfahren“; nach Klick kurzer Toast, was gilt.


### 2. Board nach Loslegen nutzen

#### 2.1 🟡 Nach Dismiss bleibt volles Filter-/KPI-Chrome (`board-first-run-chrome-density`)

- **Heuristic:** COG.3 (New concept count) + [Gerhardt-Powals #8 (Only needed information)](https://en.wikipedia.org/wiki/Heuristic_evaluation#Gerhardt-Powals'_cognitive_engineering_principles) + [Nielsen #8 (Aesthetic and minimalist design)](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Severity:** 2 (Minor)
- **Screen:** `02-board-after-dismiss.png`
- **Region:** x=20%, y=6%, w=78%, h=28%
- **What we see:** Nach „Loslegen“ bleiben View-Switcher, vier Filter-Dropdowns, KPI-Leiste, Kundenbaum und vier Board-Spalten gleichzeitig sichtbar — ohne First-Run-Guidance.
- **Why it matters:** Der Nutzer, der gerade „loslegen“ wollte, trifft sofort auf Power-User-Dichte statt auf einen geführten ersten Erfolg.
- **Recommendation:** Optionalen First-Run-Modus: KPI und erweiterte Filter einklappen, bis die erste eigene Aufgabe existiert; einen Coachmark auf „Neue Aufgabe“.

#### 2.2 🟡 Vault-Panel bleibt nach Loslegen dominant (`board-vault-panel-persists`)

- **Heuristic:** COG.2 (Primary action count) + [Nielsen #8 (Aesthetic and minimalist design)](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Severity:** 2 (Minor)
- **Screen:** `02-board-after-dismiss.png`
- **Region:** x=1%, y=7%, w=17%, h=15%
- **What we see:** Das orange „Vault verbinden“-Panel in der Sidebar bleibt nach Banner-Dismiss unverändert die lauteste Sidebar-Fläche über Views und Kunden.
- **Why it matters:** Wer bewusst ohne Ordner starten wollte, wird dauerhaft zurück in den Vault-Pfad gezogen.
- **Recommendation:** Nach Dismiss Panel kollabieren zu einer Zeile „Lokal (Browser) · Ordner verbinden“; volle Fläche nur vor Onboarding oder bei permission_needed.


### 3. Bestehende Aufgabe öffnen und verstehen

#### 3.1 🟠 Task-Dialog zeigt zu viele Felder auf einmal (`task-dialog-field-overload`)

- **Heuristic:** [Progressive disclosure](https://www.nngroup.com/articles/progressive-disclosure/) + [Hick's Law](https://lawsofux.com/hicks-law/) + COG.1 (Decision count) + [Bastien & Scapin (Workload / information density)](https://en.wikipedia.org/wiki/Heuristic_evaluation#Bastien_and_Scapin)
- **Severity:** 3 (Major)
- **Screen:** `03-task-dialog.png`
- **Region:** x=28%, y=12%, w=44%, h=78%
- **What we see:** „Aufgabe bearbeiten“ zeigt Kunde, Projekt, Titel, Status, Priorität, Assignee, zwei Daten, Schätzung, Meilenstein, Cycle, Wiederholung, Git-URL, Tags/Abhängigkeiten — plus Fußzeilenaktionen — im ersten Viewport.
- **Why it matters:** Selbst zum Lesen einer Demo-Aufgabe muss der Nutzer viele Konzepte scannen. Für First-Run-„nur Titel ändern“ ist die Oberfläche überdimensioniert.
- **Recommendation:** Essentials first: Titel, Status, Priorität, Fällig. Rest unter „Mehr Details“ / Accordion. Create-Flow noch schlanker als Edit.


### 4. Erste eigene Aufgabe anlegen

#### 4.1 🟡 Neuer Titel startet mit „--“ statt leer/Placeholder (`new-task-title-double-dash-default`)

- **Heuristic:** [Nielsen #5 (Error prevention)](https://www.nngroup.com/articles/ten-usability-heuristics/) + [Norman's principles (Affordances / signifiers)](https://www.interaction-design.org/literature/article/the-principles-of-design-by-don-norman) + [Plain language (Content Design)](https://uxcontent.com/10-content-design-heuristics/)
- **Severity:** 2 (Minor)
- **Screen:** `04-new-task-dialog.png`
- **Region:** x=30%, y=28%, w=40%, h=8%
- **What we see:** Im Dialog „Neue Aufgabe“ steht im Titelfeld der Wert „--“ (fokussiert mit orangem Rand). Speichern mit diesem Wert würde eine sinnlose Aufgabe erzeugen.
- **Why it matters:** Erstnutzer können „--“ als gültigen Default missverstehen oder übersehen und speichern Müll.
- **Recommendation:** Titelfeld leer lassen mit Placeholder „Was ist zu tun?“; Speichern ohne Titel blockieren oder soft-validieren.

#### 4.2 🟡 Neue Aufgabe erbt Demo-Kunde/Projekt ohne Erklärung (`new-task-prefilled-scope-surprise`)

- **Heuristic:** TRUST.3 (State clarity) + FTU.2 (No required prerequisite knowledge) + [Shneiderman #5 (Prevent errors)](https://www.cs.umd.edu/~ben/goldenrules.html)
- **Severity:** 2 (Minor)
- **Screen:** `04-new-task-dialog.png`
- **Region:** x=30%, y=16%, w=40%, h=12%
- **What we see:** „Neue Aufgabe“ ist vorausgefüllt mit Acme Corporation / Web-Portal Relaunch und Issue-Key ACM-WEB-2, obwohl der Nutzer gerade erst startet.
- **Why it matters:** Scope-Defaults aus Demo-Kontext erzeugen Issue-Keys und Zuordnung, die der Nutzer nicht gewählt hat — späteres Aufräumen kostet Vertrauen.
- **Recommendation:** Im First-Run ohne explizite Auswahl: leere/„Kein Kunde“-Defaults oder Hinweis „Beispielkunde vorausgewählt — ändern?“.


### 5. Leeren Workspace verstehen

#### 5.1 🟡 Filterleiste bleibt auf leerem Board sichtbar (`empty-filters-still-active`)

- **Heuristic:** FTU.4 (Empty states do work) + [Gerhardt-Powals #8 (Only needed information)](https://en.wikipedia.org/wiki/Heuristic_evaluation#Gerhardt-Powals'_cognitive_engineering_principles)
- **Severity:** 2 (Minor)
- **Screen:** `05-empty-workspace.png`
- **Region:** x=20%, y=8%, w=55%, h=6%
- **What we see:** Bei „Noch keine Aufgaben“ bleiben Kunde/Projekt/Priorität/Schnell-Filter und View-Switcher aktiv über dem Empty State.
- **Why it matters:** Filter ohne Daten suggerieren, die Leere käme von Filtern — oder lenken vom CTA „Erste Aufgabe anlegen“ ab.
- **Recommendation:** Bei totalem Leerstand Filterleiste ausblenden oder disabled + Hinweis; KPI ohnehin schon weg — Filter konsistent behandeln.

#### 5.2 🟡 Demo-Kunden bleiben im leeren Workspace (`empty-demo-clients-remain`)

- **Heuristic:** TRUST.3 (State clarity) + FTU.4 (Empty states do work) + [Consistency and standards (Nielsen #4)](https://www.nngroup.com/articles/ten-usability-heuristics/)
- **Severity:** 2 (Minor)
- **Screen:** `05-empty-workspace.png`
- **Region:** x=1%, y=48%, w=17%, h=28%
- **What we see:** Das Board ist leer, aber „Kunden & Projekte“ listet weiterhin Acme, TechStart und Intern mit Projekt-Counts „1“.
- **Why it matters:** Widerspruch: keine Aufgaben, aber Kundenbaum wirkt befüllt — unklar, ob der Workspace wirklich „frisch“ ist.
- **Recommendation:** Counts an Tasks koppeln (0 anzeigen) oder Demo-Kunden mit dem Demo-Clear entfernen; Empty State um „Beispieldaten entfernen“ ergänzen.


## Journey-level findings

#### J.1 🟡 Kein klarer First-Success-Abschluss der Journey (`journey-first-success-not-celebrated`)

- **Heuristic:** [Peak-end rule](https://lawsofux.com/peak-end-rule/) + [Shneiderman #4 (Design dialogs to yield closure)](https://www.cs.umd.edu/~ben/goldenrules.html) + [Fogg Behaviour Model (Motivation after ability)](https://behaviormodel.org/)
- **Severity:** 2 (Minor)
- **Screen:** `journey-level`
- **Region:** x=0%, y=0%, w=100%, h=100%
- **What we see:** Über Onboarding → Board → Dialog → Empty hinweg endet der Flow funktional (Speichern/CTA), aber ohne Bestätigung eines erreichten Ziels („Erste Aufgabe liegt im Board“ / „Lokal gestartet“).
- **Why it matters:** Ohne Peak-End bleibt der First-Run als dichter Werkzeugstart statt als abgeschlossener Erfolg in Erinnerung.
- **Recommendation:** Nach erster gespeicherter Aufgabe kurzes Success-Moment (Toast + optional Coachmark „Ziehen zum Status ändern“); nach Loslegen Statuszeile „Lokaler Start · Ordner jederzeit möglich“.


## Things that work well

- Primärfarbe und „+ Neue Aufgabe“ / „Speichern“ sind klar als Hauptaktion erkennbar.
- Empty State „Noch keine Aufgaben“ erklärt Vault vs. erste Aufgabe und bietet einen konkreten CTA.
- Vault-Hinweis in der Sidebar benennt ehrlich Browser-Cache vs. Ordner-Persistenz.
- Kanban-Karten zeigen Status, Priorität und Issue-Key ohne Hover.
- Task-Dialog hat Abbrechen/Schließen und destruktives Löschen als sekundäre Aktion.

## What we couldn't audit from screenshots alone

- Tastaturreihenfolge und Fokus-Ring im Task-Dialog (CustomSelects, Date-Inputs).
- Screenreader-Ansage beim Öffnen/Schließen des Dialogs und nach Speichern.
- Kontrastmessung KPI-Labels und muted Vault-Hint-Text.
- Native Vault-Ordnerauswahl (OS-Picker) ist nicht im Screenshot prüfbar.
- Mobile First-Run (Bottom-Nav, Dialog-Sheet) separat prüfen.
