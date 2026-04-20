export default async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { base64, mediaType } = req.body;
    if (!base64) return res.status(400).json({ error: "Nessun file ricevuto" });
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "API key mancante" });
    const prompt = `Sei un assistente che estrae dati da ordini PDF di supermercati italiani. Analizza questo PDF e restituisci SOLO un oggetto JSON valido, senza markdown, senza backtick, senza spiegazioni. Regole mappatura: JUMBO/COLRUYT → Antonio Petti, EDEKA → Bio Verde, MD → La Regina del Pomodoro, LIDL → Attianese S.p.A. o Italia Meal (scegli dai prodotti), REWE → scegli tra Antonio Petti, Italian Food, Bio Verde, Attianese S.p.A., Italia Meal. JSON da restituire: {"client":"nome supermercato","supplier":"fornitore secondo mappatura","orderNumber":"numero ordine","orderDate":"GG/MM/AAAA","expiryDate":"GG/MM/AAAA","contractNumber":"numero contratto","items":[{"code":"codice","description":"descrizione","qty":"quantità","um":"unità misura","price":"prezzo","discount":"sconto","vat":"IVA"}]}`;
    try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                            contents: [{ parts: [{ inline_data: { mime_type: mediaType || "application/pdf", data: base64 } }, { text: prompt }] }],
                            generationConfig: { temperature: 0.1, maxOutputTokens: 4096 }h
                  })
          });
          const data = await response.json();
          if (!response.ok) throw new Error(data.error?.message || "Errore Gemini API");
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const clean = text.replace(/```json|```/g, "").trim();
          res.status(200).json(JSON.parse(clean));
    } catch (e) {
          res.status(500).json({ error: e.message });
    }
}
