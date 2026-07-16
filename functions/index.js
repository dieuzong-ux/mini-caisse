const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ============================================================
// 1. Enregistrer le token FCM d'un utilisateur
//    Appelé depuis le front quand l'utilisateur active les notifs
// ============================================================
exports.saveToken = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { token, userId } = req.body;
  if (!token) return res.status(400).json({ error: "Token manquant" });

  await db.collection("fcm_tokens").doc(token).set({
    token,
    userId: userId || "anonymous",
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return res.status(200).json({ success: true });
});

// ============================================================
// 2. Envoyer une notification push à tous les abonnés
//    Appelé depuis le front quand une opération est enregistrée
// ============================================================
exports.sendPushToAll = functions.https.onRequest(async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).send("");
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { title, body, data } = req.body;
  if (!title || !body) return res.status(400).json({ error: "title et body requis" });

  // Récupérer tous les tokens enregistrés
  const snapshot = await db.collection("fcm_tokens").get();
  if (snapshot.empty) return res.status(200).json({ sent: 0, message: "Aucun abonné" });

  const tokens = snapshot.docs.map(doc => doc.data().token);

  // Envoyer en batch (max 500 par appel FCM)
  const message = {
    notification: { title, body },
    data: data || {},
    webpush: {
      notification: {
        title,
        body,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        vibrate: [200, 100, 200],
        actions: [
          { action: "open", title: "📂 Ouvrir" },
          { action: "dismiss", title: "✕ Ignorer" }
        ]
      },
      fcmOptions: { link: "https://pwa-test-fcb50.web.app" }
    },
    tokens
  };

  const response = await admin.messaging().sendEachForMulticast(message);

  // Nettoyer les tokens invalides
  const invalidTokens = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      const code = resp.error?.code;
      if (code === "messaging/invalid-registration-token" ||
          code === "messaging/registration-token-not-registered") {
        invalidTokens.push(tokens[idx]);
      }
    }
  });

  if (invalidTokens.length > 0) {
    const batch = db.batch();
    invalidTokens.forEach(t => batch.delete(db.collection("fcm_tokens").doc(t)));
    await batch.commit();
  }

  return res.status(200).json({
    sent: response.successCount,
    failed: response.failureCount,
    cleaned: invalidTokens.length
  });
});

// ============================================================
// 3. Trigger automatique : quand une opération est ajoutée dans
//    Firestore, envoyer automatiquement un push à tous
// ============================================================
exports.onNewOperation = functions.firestore
  .document("operations/{opId}")
  .onCreate(async (snap) => {
    const op = snap.data();
    const emoji = op.type === "vente" ? "💵" : "💸";
    const label = op.type === "vente" ? "Nouvelle vente" : "Nouvelle dépense";

    const snapshot = await db.collection("fcm_tokens").get();
    if (snapshot.empty) return null;

    const tokens = snapshot.docs.map(doc => doc.data().token);

    const message = {
      notification: {
        title: `${emoji} ${label} enregistrée`,
        body: `${op.libelle} — ${op.montant.toLocaleString()} F CFA`
      },
      webpush: {
        notification: {
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
          vibrate: [200, 100, 200]
        },
        fcmOptions: { link: "https://pwa-test-fcb50.web.app" }
      },
      tokens
    };

    return admin.messaging().sendEachForMulticast(message);
  });
