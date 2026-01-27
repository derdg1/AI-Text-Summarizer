// Kontextmenü beim Installieren erstellen
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "summarizeText",
    title: "Text zusammenfassen",
    contexts: ["selection"]
  });
});

// Auf Klick auf das Kontextmenü reagieren
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "summarizeText" && info.selectionText) {
    // Speichere den Originaltext im Storage
    chrome.storage.local.set({
      originalText: info.selectionText
    });
    
    // Prüfe zuerst, ob das Content-Script aktiv ist
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      // Versuche, eine Test-Nachricht zu senden
      chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, function(response) {
        if (chrome.runtime.lastError) {
          // Content-Script ist nicht bereit oder nicht geladen
          console.log("Content-Script ist nicht bereit:", chrome.runtime.lastError.message);
          
          // Injiziere das Content-Script manuell
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['content.js']
          }, function() {
            // Nach der Injektion die eigentliche Nachricht senden
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, {
                action: "summarize",
                text: info.selectionText
              });
            }, 100); // Kleine Verzögerung, um sicherzustellen, dass das Script geladen ist
          });
        } else {
          // Content-Script ist bereit, sende die eigentliche Nachricht
          chrome.tabs.sendMessage(tabs[0].id, {
            action: "summarize",
            text: info.selectionText
          });
        }
      });
    });
  }
});