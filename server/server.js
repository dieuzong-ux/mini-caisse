const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// En local : utilise serviceAccount.json
// Sur Render : utilise la variable d'environnement FIREBASE_SERVICE_ACCOUNT
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require('./serviceAccount.json');
}

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });

// Stockage en mémoire
const tokens = new Set();
const operations = [];

// POST /save-token
app.post('/save-token', (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token manquant' });
  tokens.add(token);
  console.log(`[FCM] Token enregistré. Total abonnés : ${tokens.size}`);
  res.json({ success: true, subscribers: tokens.size });
});

// POST /send-push
app.post('/send-push', async (req, res) => {
  const { title, body, url } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'title et body requis' });
  if (tokens.size === 0) return res.json({ sent: 0, message: 'Aucun abonné' });

  const tokenList = Array.from(tokens);
  const message = {
    webpush: {
      notification: {
        title, body,
        icon: 'https://pwa-test-fcb50.web.app/icons/icon-192.png',
        badge: 'https://pwa-test-fcb50.web.app/icons/icon-192.png',
        vibrate: [200, 100, 200],
        actions: [
          { action: 'open', title: '📂 Ouvrir' },
          { action: 'dismiss', title: '✕ Ignorer' }
        ]
      },
      data: { url: url || 'https://pwa-test-fcb50.web.app/#operations' },
      fcmOptions: { link: url || 'https://pwa-test-fcb50.web.app/#operations' }
    },
    tokens: tokenList
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const code = resp.error?.code;
        if (code === 'messaging/invalid-registration-token' ||
            code === 'messaging/registration-token-not-registered') {
          tokens.delete(tokenList[idx]);
        }
      }
    });
    console.log(`[FCM] ${response.successCount} push envoyés`);
    res.json({ sent: response.successCount, failed: response.failureCount });
  } catch (err) {
    console.error('[FCM] Erreur :', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/subscribers', (req, res) => res.json({ count: tokens.size }));
app.get('/', (req, res) => res.json({ status: 'ok', subscribers: tokens.size }));

// GET /operations
app.get('/operations', (req, res) => res.json(operations));

// POST /operation
app.post('/operation', async (req, res) => {
  const { id, type, libelle, montant, heure, auteur } = req.body;
  if (!type || !libelle || !montant) return res.status(400).json({ error: 'Champs manquants' });
  const op = { id: id || Date.now(), type, libelle, montant, heure, auteur: auteur || 'Inconnu', createdAt: new Date().toISOString() };
  operations.unshift(op);
  if (operations.length > 200) operations.pop();
  console.log(`[OP] ${auteur} — ${type} : ${libelle} ${montant}`);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[SERVER] Push server démarré sur le port ${PORT}`));
