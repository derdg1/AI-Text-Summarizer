document.addEventListener('DOMContentLoaded', function() {
  // Lade die letzte Zusammenfassung, falls vorhanden
  chrome.storage.local.get(['summary', 'originalText'], function(data) {
    if (data.summary) {
      document.getElementById('last-summary').style.display = 'block';
      document.getElementById('summary-content').textContent = data.summary;
      
      // Export-Button-Funktionalität
      document.getElementById('export-button').addEventListener('click', function() {
        exportMarkdown(data.summary, data.originalText);
      });
    }
  });
});

// Exportiert den Original-Text und die Zusammenfassung als Markdown
function exportMarkdown(summary, originalText) {
  const markdown = `# Text-Zusammenfassung

## Original-Text

${originalText || "Kein Original-Text verfügbar"}

## Zusammenfassung

${summary || "Keine Zusammenfassung verfügbar"}

---
Erstellt mit der Text-Zusammenfasser Extension
`;
  
  // Erstelle einen Blob und Download-Link
  const blob = new Blob([markdown], {type: 'text/markdown'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'zusammenfassung.md';
  a.click();
  
  // Bereinige das URL-Objekt
  setTimeout(() => URL.revokeObjectURL(url), 100);
}