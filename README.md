# AI Text Summarizer - Chrome Extension

Diese Chrome-Extension ermöglicht es dir, jeden markierten Text auf Webseiten mit OpenAI's GPT-Technologie intelligent zusammenfassen zu lassen.

## Features

- **KI-gestützte Zusammenfassung** mit OpenAI
- **Anpassbare Tonalitäten**: Wähle zwischen formal, neutral, casual, einfach oder technisch
- **Elegante Seitenleiste** für die Darstellung der Zusammenfassung
- **Export als Markdown** für einfache Weiterverwendung
- **Lokale Speicherung** deines API-Schlüssels

## Installation

1. Lade den Code herunter oder klone das Repository
2. Öffne Chrome und navigiere zu `chrome://extensions/`
3. Aktiviere den "Entwicklermodus" (obere rechte Ecke)
4. Klicke auf "Entpackte Erweiterung laden" und wähle den Ordner mit dem Code aus

## Verwendung

1. Besuche eine beliebige Webseite und markiere einen Text
2. Klicke mit der rechten Maustaste und wähle "Text zusammenfassen"
3. Bei der ersten Verwendung: Gib deinen OpenAI API-Schlüssel ein
4. Wähle die gewünschte Tonalität für deine Zusammenfassung
5. Klicke auf "Mit ausgewählter Tonalität zusammenfassen"
6. Nutze den Export-Button, um die Zusammenfassung als Markdown zu speichern

## OpenAI API-Schlüssel einrichten

Um diese Extension zu nutzen, benötigst du einen API-Schlüssel von OpenAI:

1. Erstelle ein Konto auf [OpenAI's Platform](https://platform.openai.com/)
2. Navigiere zum Bereich "API Keys"
3. Erstelle einen neuen API-Schlüssel
4. Kopiere den Schlüssel und füge ihn in die Extension ein, wenn du dazu aufgefordert wirst

## Datenschutz

- Dein API-Schlüssel wird sicher im lokalen Chrome-Speicher gespeichert
- Markierte Texte werden direkt an die OpenAI API gesendet
- Keine Daten werden an unsere Server gesendet oder von uns gespeichert
- Alle Zusammenfassungen werden nur lokal in deinem Browser verarbeitet

## Technische Details

Diese Extension nutzt:
- Chrome Extension Manifest V3
- OpenAI Chat Completions API mit dem gpt-4o-mini Modell
- Content Scripts für die Interaktion mit Webseiten
- Chrome Storage API zur sicheren Speicherung des API-Schlüssels

## Lizenz

[MIT License](LICENSE)

## Feedback und Support

Für Fragen, Feedback oder Probleme, erstelle bitte ein [Issue](https://github.com/derdg1/chrome_extension/issues) im Repository.
