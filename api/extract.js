export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { base64, mediaType } = req.body;
  if (!base64) return res.status(400).json({ error: "Nessun file ricevuto" });

  const prompt = `Sei un assistente che estrae dati strutturati da ordini PDF di supermercati/clienti per la società Mediterraneo S.r.l.

REGOLE DI MAPPATURA CLIENTE → FORNITORE (da usare per il campo customer_name):
- Se il documento viene da JUMBO → customer_name = "ANTONIO PETTI FU PASQUALE SPA"
- Se il documento viene da EDEKA → customer_name = "BIO VERDE"
- Se il documento viene da COLRUYT → customer_name = "ANTONIO PETTI FU PASQUALE SPA"
- Se il documento viene da MD → customer_name = "LA REGINA DEL POMODORO"
- Se il documento viene da LIDL → analizza i prodotti e scegli tra "ATTIANESE S.P.A." o "ITALIA MEAL"
- Se il documento viene da REWE → analizza i prodotti e scegli tra "ANTONIO PETTI FU PASQUALE SPA", "ITALIAN FOOD", "BIO VERDE", "ATTIANESE S.P.A.", "ITALIA MEAL"

Il campo customer_name deve contenere il FORNITORE (non il supermercato mittente).
Il campo "mittente" deve contenere il nome del supermercato che ha emesso l'ordine (es. JUMBO, LIDL, ecc.).

Estrai le seguenti informazioni e restituisci SOLO un oggetto JSON valido, senza markdown, senza backtick, senza testo aggiuntivo.
Se un campo non è presente usa stringa vuota "".

{
  "mittente": "nome del supermercato che ha emesso l'ordine",
  "customer_code": "codice cliente se presente",
  "customer_name": "FORNITORE secondo le regole di mappatura sopra",
  "customer_address": "indirizzo",
  "customer_postcode": "CAP",
  "customer_city": "città",
  "customer_province": "sigla provincia",
  "customer_country": "",
  "customer_vat": "partita IVA cliente",
  "customer_pec": "PEC cliente",
  "customer_sdi": "codice destinatario SDI",
  "numero_ordine": "numero ordine",
  "numerazione": "suffisso numerazione es /JUMBO",
  "data_emissione": "data emissione YYYY-MM-DD",
  "data_scadenza": "data scadenza o consegna YYYY-MM-DD",
  "listino": "nome listino es Listino 1",
  "pagamento": "condizioni pagamento",
  "banca": "banca e IBAN",
  "agente": "agente di vendita",
  "note_interne": "note interne",
  "totale_imponibile": "totale senza IVA numerico",
  "totale_iva": "importo IVA numerico",
  "totale": "totale con IVA numerico",
  "articoli": [
    {
      "codice": "codice articolo",
      "descrizione": "descrizione articolo",
      "quantita": "quantità numerica",
      "um": "unità di misura",
      "prezzo": "prezzo unitario numerico",
      "sconti": "",
      "iva_cod": "codice IVA es N3.5 o 22",
      "iva_perc": "percentuale IVA numerica es 0 o 22",
      "iva_class": "classe IVA es NonImponibile.5",
      "iva_desc": "descrizione IVA",
      "totale": "totale riga numerico",
      "note": ""
    }
  ]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
            { type: "text", text: prompt }
          ]
        }]
      })
    });

    const data = await response.json();
    if (data.error) return res.status(500).json({ error: data.error.message });

    const text = data.content.map(i => i.text || "").join("").trim();
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    res.status(200).json(parsed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
