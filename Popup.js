document.addEventListener('DOMContentLoaded', function() {
  // Prüfe, ob ein Artikel auf der aktuellen Seite erkannt wird
  checkForArticle();

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

  // Button-Handler für Artikel-Zusammenfassung
  document.getElementById('summarize-article-btn').addEventListener('click', function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;

      // Sende Nachricht an Content-Script
      chrome.tabs.sendMessage(tabs[0].id, {action: "summarizeArticle"}, function(response) {
        if (chrome.runtime.lastError) {
          // Content-Script nicht bereit, injiziere es
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['content.js']
          }, function() {
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, {action: "summarizeArticle"});
              window.close(); // Schließe Popup
            }, 100);
          });
        } else {
          window.close(); // Schließe Popup
        }
      });
    });
  });
});

// Prüft, ob ein Artikel auf der aktuellen Seite vorhanden ist
function checkForArticle() {
  const statusElement = document.getElementById('article-status');
  const statusText = document.getElementById('status-text');
  const statusIcon = statusElement.querySelector('.status-icon');
  const button = document.getElementById('summarize-article-btn');

  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs[0]) {
      showNoArticle();
      return;
    }

    // Sende Nachricht an Content-Script, um Artikel zu prüfen
    chrome.tabs.sendMessage(tabs[0].id, {action: "checkArticle"}, function(response) {
      if (chrome.runtime.lastError || !response) {
        // Content-Script nicht bereit, versuche es zu injizieren und erneut zu prüfen
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          files: ['content.js']
        }, function() {
          setTimeout(() => {
            chrome.tabs.sendMessage(tabs[0].id, {action: "checkArticle"}, function(response) {
              if (response && response.hasArticle) {
                showArticleFound(response.length);
              } else {
                showNoArticle();
              }
            });
          }, 200);
        });
      } else if (response.hasArticle) {
        showArticleFound(response.length);
      } else {
        showNoArticle();
      }
    });
  });

  function showArticleFound(length) {
    statusElement.classList.remove('no-article');
    statusIcon.textContent = '✓';
    const wordCount = Math.round(length / 5); // Grobe Schätzung
    statusText.textContent = `Artikel erkannt (~${wordCount.toLocaleString()} Wörter)`;
    button.disabled = false;
    button.style.opacity = '1';
  }

  function showNoArticle() {
    statusElement.classList.add('no-article');
    statusIcon.textContent = '!';
    statusText.textContent = 'Kein Artikel auf dieser Seite erkannt';
    button.disabled = true;
    button.style.opacity = '0.6';
  }
}

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