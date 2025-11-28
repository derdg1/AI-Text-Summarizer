// Höre auf Nachrichten vom Background Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping") {
    sendResponse({status: "ready"});
    return;
  }
  
  if (request.action === "summarize") {
    chrome.storage.local.set({originalText: request.text});
    createSummarySidebar(request.text);
  }
});

// Erstellt die Seitenleiste für die Zusammenfassung
function createSummarySidebar(text) {
  // Entferne existierende Seitenleiste
  const existingSidebar = document.getElementById('summary-sidebar');
  if (existingSidebar) existingSidebar.remove();
  
  // CSS-Stile definieren
  const styles = {
    sidebar: `position:fixed; top:0; right:0; width:350px; height:100%; background:white; border-left:1px solid #e0e0e0; 
              box-shadow:-2px 0 10px rgba(0,0,0,0.1); z-index:10000; display:flex; flex-direction:column; 
              font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;`,
    header: `padding:16px; border-bottom:1px solid #e0e0e0; background:#f7f7f7; display:flex; 
             justify-content:space-between; align-items:center;`,
    title: `margin:0; font-size:16px; color:#333;`,
    closeBtn: `background:none; border:none; font-size:24px; cursor:pointer; color:#666; padding:0; margin:0; line-height:1;`,
    content: `flex:1; padding:16px; overflow-y:auto;`,
    section: `margin-bottom:20px;`,
    sectionTitle: `margin:0 0 8px 0; font-size:14px; color:#555;`,
    originalText: `padding:12px; background:#f5f5f5; border-radius:4px; font-size:14px; color:#555; 
                   max-height:120px; overflow-y:auto; white-space:pre-wrap; margin-bottom:16px;`,
    select: `width:100%; padding:8px; border:1px solid #ddd; border-radius:4px; background-color:white; 
             font-size:14px; margin-bottom:12px;`,
    button: `background:#4285f4; color:white; border:none; border-radius:4px; padding:8px 16px; 
             font-size:14px; cursor:pointer; width:100%;`,
    summaryBox: `padding:16px; background:#f0f7ff; border:1px solid #d0e3ff; border-radius:4px; 
                 font-size:15px; line-height:1.5; color:#333; white-space:pre-wrap;`,
    apiSection: `padding:16px; background:#fff4e5; border:1px solid #ffd8a8; border-radius:4px; 
                 margin-top:16px; display:none;`,
    apiTitle: `margin:0 0 8px 0; font-size:14px; color:#b44d12;`,
    input: `width:100%; padding:8px; margin:8px 0; border:1px solid #ddd; border-radius:4px; box-sizing:border-box;`,
    note: `margin-top:8px; font-size:12px; color:#666;`,
    footer: `padding:16px; border-top:1px solid #e0e0e0; background:#f7f7f7; display:flex; justify-content:space-between;`
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
      <div style="${styles.section}">
        <h4 style="${styles.sectionTitle}">Markierter Text:</h4>
        <div style="${styles.originalText}">${text.length > 300 ? text.substring(0, 300) + '...' : text}</div>
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
        <button id="summarize-button" style="${styles.button}">Mit ausgewählter Tonalität zusammenfassen</button>
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
  document.getElementById('close-sidebar').addEventListener('click', () => sidebar.remove());
  
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