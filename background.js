// Kontextmenü beim Installieren erstellen
chrome.runtime.onInstalled.addListener(() => {
  // Kontextmenü für markierten Text
  chrome.contextMenus.create({
    id: "summarizeText",
    title: "Text zusammenfassen",
    contexts: ["selection"]
  });

  // Kontextmenü für Artikel-Zusammenfassung (auf jeder Seite verfügbar)
  chrome.contextMenus.create({
    id: "summarizeArticle",
    title: "Artikel auf dieser Seite zusammenfassen",
    contexts: ["page"]
  });
});

// Keyboard-Shortcut Handler
chrome.commands.onCommand.addListener((command) => {
  if (command === "summarize-article") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;

      // Prüfe, ob das Content-Script aktiv ist
      chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, function(response) {
        if (chrome.runtime.lastError) {
          // Content-Script ist nicht bereit, injiziere es
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['content.js']
          }, function() {
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, {action: "summarizeArticle"});
            }, 100);
          });
        } else {
          chrome.tabs.sendMessage(tabs[0].id, {action: "summarizeArticle"});
        }
      });
    });
  }
});

// Auf Klick auf das Kontextmenü reagieren
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Handler für markierten Text
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

  // Handler für Artikel-Zusammenfassung
  if (info.menuItemId === "summarizeArticle") {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (!tabs[0]) return;

      chrome.tabs.sendMessage(tabs[0].id, {action: "ping"}, function(response) {
        if (chrome.runtime.lastError) {
          chrome.scripting.executeScript({
            target: {tabId: tabs[0].id},
            files: ['content.js']
          }, function() {
            setTimeout(() => {
              chrome.tabs.sendMessage(tabs[0].id, {action: "summarizeArticle"});
            }, 100);
          });
        } else {
          chrome.tabs.sendMessage(tabs[0].id, {action: "summarizeArticle"});
        }
      });
    });
  }
});