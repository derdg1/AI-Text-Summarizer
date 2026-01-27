// Minimale Textlänge für Artikelerkennung (in Zeichen)
const MIN_ARTICLE_LENGTH = 500;

// Höre auf Nachrichten vom Background Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({status: "ready"});
    return;
  }

  if (request.action === "summarize") {
    chrome.storage.local.set({originalText: request.text});
    createSummarySidebar(request.text, 'selection');
  }

  if (request.action === "summarizeArticle") {
    const articleText = detectArticleContent();
    if (articleText) {
      chrome.storage.local.set({originalText: articleText});
      createSummarySidebar(articleText, 'article');
    } else {
      showNoArticleNotification();
    }
  }

  if (request.action === "checkArticle") {
    const articleText = detectArticleContent();
    sendResponse({hasArticle: !!articleText, length: articleText ? articleText.length : 0});
    return true;
  }
});

// Erkennt und extrahiert den Hauptartikel-Inhalt einer Seite
function detectArticleContent() {
  let articleText = '';

  // Priorität 1: <article> Tags
  const articles = document.querySelectorAll('article');
  if (articles.length > 0) {
    // Wähle den längsten Artikel
    let longestArticle = '';
    articles.forEach(article => {
      const text = extractCleanText(article);
      if (text.length > longestArticle.length) {
        longestArticle = text;
      }
    });
    if (longestArticle.length >= MIN_ARTICLE_LENGTH) {
      articleText = longestArticle;
    }
  }

  // Priorität 2: <main> Tag
  if (!articleText) {
    const main = document.querySelector('main');
    if (main) {
      const text = extractCleanText(main);
      if (text.length >= MIN_ARTICLE_LENGTH) {
        articleText = text;
      }
    }
  }

  // Priorität 3: Semantische Klassen/IDs suchen
  if (!articleText) {
    const contentSelectors = [
      '[role="main"]',
      '[role="article"]',
      '.post-content',
      '.article-content',
      '.entry-content',
      '.content-body',
      '.article-body',
      '.post-body',
      '.story-body',
      '#article-content',
      '#main-content',
      '#content',
      '.content'
    ];

    for (const selector of contentSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = extractCleanText(element);
        if (text.length >= MIN_ARTICLE_LENGTH) {
          articleText = text;
          break;
        }
      }
    }
  }

  // Priorität 4: Heuristik - Suche nach dem längsten zusammenhängenden Textblock
  if (!articleText) {
    articleText = findLongestTextBlock();
  }

  return articleText.length >= MIN_ARTICLE_LENGTH ? articleText : null;
}

// Extrahiert sauberen Text aus einem Element (ohne Navigation, Werbung, etc.)
function extractCleanText(element) {
  // Klone das Element, um das Original nicht zu verändern
  const clone = element.cloneNode(true);

  // Entferne unerwünschte Elemente
  const unwantedSelectors = [
    'nav', 'header', 'footer', 'aside',
    '.nav', '.navigation', '.menu', '.sidebar',
    '.advertisement', '.ad', '.ads', '.advert',
    '.social-share', '.share-buttons', '.social-buttons',
    '.comments', '.comment-section', '#comments',
    '.related-posts', '.related-articles',
    'script', 'style', 'noscript', 'iframe',
    '.cookie-banner', '.newsletter-signup',
    '[role="navigation"]', '[role="banner"]',
    '[aria-hidden="true"]'
  ];

  unwantedSelectors.forEach(selector => {
    clone.querySelectorAll(selector).forEach(el => el.remove());
  });

  // Extrahiere den Text
  let text = clone.innerText || clone.textContent || '';

  // Bereinige den Text
  text = text
    .replace(/\s+/g, ' ')  // Mehrfache Leerzeichen entfernen
    .replace(/\n\s*\n/g, '\n\n')  // Mehrfache Zeilenumbrüche reduzieren
    .trim();

  return text;
}

// Findet den längsten zusammenhängenden Textblock (Fallback-Heuristik)
function findLongestTextBlock() {
  const paragraphs = document.querySelectorAll('p');
  let textBlocks = [];
  let currentBlock = [];
  let lastParent = null;

  paragraphs.forEach(p => {
    const parent = p.parentElement;
    const text = p.innerText?.trim() || '';

    // Ignoriere kurze Absätze (wahrscheinlich Navigation/Footer)
    if (text.length < 50) return;

    // Prüfe, ob wir im gleichen Eltern-Container sind
    if (parent === lastParent || lastParent === null) {
      currentBlock.push(text);
    } else {
      if (currentBlock.length > 0) {
        textBlocks.push(currentBlock.join('\n\n'));
      }
      currentBlock = [text];
    }
    lastParent = parent;
  });

  if (currentBlock.length > 0) {
    textBlocks.push(currentBlock.join('\n\n'));
  }

  // Wähle den längsten Block
  return textBlocks.reduce((a, b) => a.length > b.length ? a : b, '');
}

// Zeigt eine Benachrichtigung, wenn kein Artikel gefunden wurde
function showNoArticleNotification() {
  const notification = document.createElement('div');
  notification.id = 'no-article-notification';
  notification.style.cssText = `
    position: fixed; top: 20px; right: 20px; z-index: 10001;
    background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px;
    padding: 16px 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px; color: #856404; max-width: 300px;
  `;
  notification.innerHTML = `
    <strong>Kein Artikel gefunden</strong><br>
    <span style="font-size:13px;">Auf dieser Seite konnte kein längerer Textinhalt erkannt werden.
    Versuche, Text manuell zu markieren.</span>
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.transition = 'opacity 0.3s';
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 4000);
}

// Erstellt den Floating Action Button für Artikelzusammenfassung
function createFloatingButton() {
  // Entferne existierenden Button
  const existingButton = document.getElementById('article-summarize-fab');
  if (existingButton) existingButton.remove();

  // Prüfe, ob ein Artikel vorhanden ist
  const articleText = detectArticleContent();
  if (!articleText) return;

  const fab = document.createElement('div');
  fab.id = 'article-summarize-fab';
  fab.style.cssText = `
    position: fixed; bottom: 24px; right: 24px; z-index: 9999;
    width: 56px; height: 56px; border-radius: 50%;
    background: linear-gradient(135deg, #4285f4 0%, #34a853 100%);
    box-shadow: 0 4px 12px rgba(66, 133, 244, 0.4);
    cursor: pointer; display: flex; align-items: center; justify-content: center;
    transition: transform 0.2s, box-shadow 0.2s;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  fab.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="white" stroke-width="1" fill="none"/>
      <path d="M14 2V8H20" stroke="white" stroke-width="1" fill="none"/>
      <line x1="8" y1="13" x2="16" y2="13" stroke="white" stroke-width="2"/>
      <line x1="8" y1="17" x2="13" y2="17" stroke="white" stroke-width="2"/>
    </svg>
  `;

  // Tooltip
  const tooltip = document.createElement('div');
  tooltip.style.cssText = `
    position: absolute; bottom: 100%; right: 0; margin-bottom: 8px;
    background: #333; color: white; padding: 8px 12px; border-radius: 6px;
    font-size: 13px; white-space: nowrap; opacity: 0; transition: opacity 0.2s;
    pointer-events: none;
  `;
  tooltip.textContent = 'Artikel zusammenfassen (Alt+S)';
  fab.appendChild(tooltip);

  // Hover-Effekte
  fab.addEventListener('mouseenter', () => {
    fab.style.transform = 'scale(1.1)';
    fab.style.boxShadow = '0 6px 16px rgba(66, 133, 244, 0.5)';
    tooltip.style.opacity = '1';
  });

  fab.addEventListener('mouseleave', () => {
    fab.style.transform = 'scale(1)';
    fab.style.boxShadow = '0 4px 12px rgba(66, 133, 244, 0.4)';
    tooltip.style.opacity = '0';
  });

  // Klick-Handler
  fab.addEventListener('click', () => {
    chrome.storage.local.set({originalText: articleText});
    createSummarySidebar(articleText, 'article');
  });

  document.body.appendChild(fab);
}

// Initialisiere den Floating Button nach Seitenladung
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(createFloatingButton, 1000);
  });
} else {
  setTimeout(createFloatingButton, 1000);
}

// Erstellt die Seitenleiste für die Zusammenfassung
// mode: 'selection' für markierten Text, 'article' für automatisch erkannten Artikel
function createSummarySidebar(text, mode = 'selection') {
  // Entferne existierende Seitenleiste
  const existingSidebar = document.getElementById('summary-sidebar');
  if (existingSidebar) existingSidebar.remove();

  // Verstecke den FAB wenn Sidebar offen ist
  const fab = document.getElementById('article-summarize-fab');
  if (fab) fab.style.display = 'none';

  const isArticleMode = mode === 'article';
  const sourceLabel = isArticleMode ? 'Erkannter Artikel' : 'Markierter Text';
  const headerGradient = isArticleMode
    ? 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)'
    : '#f7f7f7';
  const headerTextColor = isArticleMode ? 'white' : '#333';
  const wordCount = text.split(/\s+/).length;
  const charCount = text.length;

  // CSS-Stile definieren
  const styles = {
    sidebar: `position:fixed; top:0; right:0; width:380px; height:100%; background:white; border-left:1px solid #e0e0e0;
              box-shadow:-2px 0 10px rgba(0,0,0,0.1); z-index:10000; display:flex; flex-direction:column;
              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`,
    header: `padding:16px; border-bottom:1px solid #e0e0e0; background:${headerGradient}; display:flex;
             justify-content:space-between; align-items:center;`,
    title: `margin:0; font-size:16px; color:${headerTextColor};`,
    closeBtn: `background:none; border:none; font-size:24px; cursor:pointer; color:${headerTextColor}; padding:0; margin:0; line-height:1;`,
    content: `flex:1; padding:16px; overflow-y:auto;`,
    section: `margin-bottom:20px;`,
    sectionTitle: `margin:0 0 8px 0; font-size:14px; color:#555;`,
    badge: `display:inline-block; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:500; margin-left:8px;
            background:${isArticleMode ? '#e8f5e9' : '#e3f2fd'}; color:${isArticleMode ? '#2e7d32' : '#1565c0'};`,
    stats: `display:flex; gap:12px; margin-bottom:12px; font-size:12px; color:#666;`,
    statItem: `background:#f5f5f5; padding:4px 8px; border-radius:4px;`,
    originalText: `padding:12px; background:#f5f5f5; border-radius:4px; font-size:14px; color:#555;
                   max-height:150px; overflow-y:auto; white-space:pre-wrap; margin-bottom:16px; line-height:1.5;`,
    select: `width:100%; padding:10px; border:1px solid #ddd; border-radius:4px; background-color:white;
             font-size:14px; margin-bottom:12px;`,
    button: `background:#4285f4; color:white; border:none; border-radius:4px; padding:10px 16px;
             font-size:14px; cursor:pointer; width:100%; transition:background 0.2s;`,
    buttonSecondary: `background:white; color:#4285f4; border:1px solid #4285f4; border-radius:4px; padding:8px 16px;
                      font-size:13px; cursor:pointer; width:100%; transition:all 0.2s; margin-top:8px;`,
    summaryBox: `padding:16px; background:#f0f7ff; border:1px solid #d0e3ff; border-radius:4px;
                 font-size:15px; line-height:1.6; color:#333; white-space:pre-wrap;`,
    apiSection: `padding:16px; background:#fff4e5; border:1px solid #ffd8a8; border-radius:4px;
                 margin-top:16px; display:none;`,
    apiTitle: `margin:0 0 8px 0; font-size:14px; color:#b44d12;`,
    input: `width:100%; padding:8px; margin:8px 0; border:1px solid #ddd; border-radius:4px; box-sizing:border-box;`,
    note: `margin-top:8px; font-size:12px; color:#666;`,
    footer: `padding:16px; border-top:1px solid #e0e0e0; background:#f7f7f7; display:flex; justify-content:space-between;`,
    modeSwitch: `display:flex; gap:8px; margin-bottom:16px;`,
    modeSwitchBtn: `flex:1; padding:8px; border:1px solid #ddd; border-radius:4px; background:white;
                    font-size:12px; cursor:pointer; text-align:center; transition:all 0.2s;`,
    modeSwitchBtnActive: `flex:1; padding:8px; border:1px solid #4285f4; border-radius:4px; background:#e3f2fd;
                          font-size:12px; cursor:pointer; text-align:center; color:#4285f4; font-weight:500;`
  };

  // Erstelle die Hauptelemente
  const sidebar = document.createElement('div');
  sidebar.id = 'summary-sidebar';
  sidebar.style.cssText = styles.sidebar;

  // Baue Seitenleiste zusammen
  sidebar.innerHTML = `
    <div style="${styles.header}">
      <h3 style="${styles.title}">KI-Zusammenfassung</h3>
      <button id="close-sidebar" style="${styles.closeBtn}">&times;</button>
    </div>

    <div style="${styles.content}">
      <div style="${styles.modeSwitch}">
        <button id="mode-selection" style="${!isArticleMode ? styles.modeSwitchBtnActive : styles.modeSwitchBtn}">
          Markierter Text
        </button>
        <button id="mode-article" style="${isArticleMode ? styles.modeSwitchBtnActive : styles.modeSwitchBtn}">
          Ganzen Artikel
        </button>
      </div>

      <div style="${styles.section}">
        <h4 style="${styles.sectionTitle}">
          ${sourceLabel}
          <span style="${styles.badge}">${isArticleMode ? 'Auto-erkannt' : 'Manuell'}</span>
        </h4>
        <div style="${styles.stats}">
          <span style="${styles.statItem}">${wordCount.toLocaleString()} Wörter</span>
          <span style="${styles.statItem}">${charCount.toLocaleString()} Zeichen</span>
        </div>
        <div id="original-text-preview" style="${styles.originalText}">${text.length > 400 ? text.substring(0, 400) + '...' : text}</div>
      </div>

      <div style="${styles.section}">
        <h4 style="${styles.sectionTitle}">Tonalität der Zusammenfassung:</h4>
        <select id="tone-select" style="${styles.select}">
          <option value="neutral">Neutral - Sachlich und objektiv</option>
          <option value="formal">Formal - Akademisch und professionell</option>
          <option value="casual">Casual - Locker und zugänglich</option>
          <option value="simple">Einfach - Für leichte Verständlichkeit</option>
          <option value="technical">Technisch - Mit Fachbegriffen</option>
        </select>
        <button id="summarize-button" style="${styles.button}">Zusammenfassen</button>
      </div>

      <div style="${styles.section}">
        <h4 style="${styles.sectionTitle}">KI-Zusammenfassung:</h4>
        <div id="summary-content" style="${styles.summaryBox}">Wähle eine Tonalität und klicke auf "Zusammenfassen"</div>
      </div>

      <div id="api-key-section" style="${styles.apiSection}">
        <h4 style="${styles.apiTitle}">API-Schlüssel erforderlich</h4>
        <input id="api-key-input" type="password" placeholder="Dein OpenAI API-Schlüssel" style="${styles.input}">
        <button id="save-api-key" style="${styles.button}">Speichern & Zusammenfassen</button>
        <p style="${styles.note}">Der API-Schlüssel wird nur lokal gespeichert.</p>
      </div>
    </div>

    <div style="${styles.footer}">
      <button id="export-button" style="${styles.button}">Zusammenfassung exportieren</button>
    </div>
  `;
  
  // Füge Seitenleiste zur Seite hinzu
  document.body.appendChild(sidebar);

  // Event-Listener hinzufügen
  document.getElementById('close-sidebar').addEventListener('click', () => {
    sidebar.remove();
    // Zeige FAB wieder an
    const fab = document.getElementById('article-summarize-fab');
    if (fab) fab.style.display = 'flex';
  });

  // Mode-Switch Buttons
  document.getElementById('mode-selection').addEventListener('click', () => {
    const selectedText = window.getSelection().toString().trim();
    if (selectedText && selectedText.length > 0) {
      chrome.storage.local.set({originalText: selectedText});
      createSummarySidebar(selectedText, 'selection');
    } else {
      document.getElementById('summary-content').textContent = 'Bitte markiere zuerst einen Text auf der Seite.';
    }
  });

  document.getElementById('mode-article').addEventListener('click', () => {
    const articleText = detectArticleContent();
    if (articleText) {
      chrome.storage.local.set({originalText: articleText});
      createSummarySidebar(articleText, 'article');
    } else {
      document.getElementById('summary-content').textContent = 'Kein Artikel auf dieser Seite erkannt.';
    }
  });

  document.getElementById('summarize-button').addEventListener('click', () => {
    const selectedTone = document.getElementById('tone-select').value;
    chrome.storage.local.get(['openaiApiKey'], function(data) {
      if (data.openaiApiKey) {
        generateSummary(text, data.openaiApiKey, selectedTone);
      } else {
        document.getElementById('api-key-section').style.display = 'block';
        document.getElementById('summary-content').textContent = 'Bitte gib deinen OpenAI API-Schlüssel ein.';
      }
    });
  });

  document.getElementById('save-api-key').addEventListener('click', () => {
    const apiKey = document.getElementById('api-key-input').value.trim();
    if (apiKey) {
      chrome.storage.local.set({ openaiApiKey: apiKey }, function() {
        document.getElementById('api-key-section').style.display = 'none';
        const selectedTone = document.getElementById('tone-select').value;
        generateSummary(text, apiKey, selectedTone);
      });
    }
  });

  document.getElementById('export-button').addEventListener('click', exportSummary);

  // Überprüfe API-Schlüssel
  chrome.storage.local.get(['openaiApiKey'], function(data) {
    if (!data.openaiApiKey) {
      document.getElementById('api-key-section').style.display = 'block';
    }
  });
}

// Generiert die KI-Zusammenfassung mit OpenAI API
async function generateSummary(text, apiKey, tone = 'neutral') {
  const summaryElement = document.getElementById('summary-content');
  summaryElement.textContent = 'KI-Zusammenfassung wird erstellt...';
  
  // Tonalitäts-Anweisungen definieren
  const toneInstructions = {
    formal: "Verwende einen formalen, akademischen Schreibstil mit präziser Fachsprache.",
    casual: "Verwende einen lockeren, zugänglichen Schreibstil mit einfachen Worten.",
    simple: "Verwende sehr einfache Sprache und kurze Sätze für maximale Verständlichkeit.",
    technical: "Verwende technische Fachbegriffe und präzise Formulierungen.",
    neutral: "Verwende einen sachlichen, neutralen Schreibstil."
  };
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // Korrigiert: gpt-4o-mini ist das korrekte OpenAI Modell
        messages: [
          {
            role: "system",
            content: `Du bist ein hilfreicher Assistent, der Texte präzise zusammenfasst. ${toneInstructions[tone]}`
          },
          {
            role: "user",
            content: `Fasse den folgenden Text zusammen: ${text}`
          }
        ],
        max_completion_tokens: 500,
        temperature: 0.5
      })
    });
    
    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'Unbekannter API-Fehler');
    }
    
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const summary = data.choices[0].message.content.trim();
      chrome.storage.local.set({ summary: summary });
      summaryElement.textContent = summary;
    } else {
      throw new Error('Ungültiges Antwortformat von der API');
    }
  } catch (error) {
    console.error('Fehler bei der OpenAI API:', error);
    
    if (error.message.includes('API key')) {
      summaryElement.textContent = 'Fehler: Ungültiger API-Schlüssel.';
      document.getElementById('api-key-section').style.display = 'block';
    } else {
      summaryElement.textContent = `Fehler bei der Zusammenfassung: ${error.message}`;
    }
  }
}

// Exportiert nur die Zusammenfassung als Markdown
function exportSummary() {
  chrome.storage.local.get(['summary'], function(data) {
    const summary = data.summary || "Keine Zusammenfassung verfügbar";
    
    const markdown = `# KI-Zusammenfassung\n\n${summary}\n\n---\nErstellt mit der Text-Zusammenfasser Extension`;
    
    const blob = new Blob([markdown], {type: 'text/markdown'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ki-zusammenfassung.md';
    a.click();
    
    setTimeout(() => URL.revokeObjectURL(url), 100);
  });
}