# Mini Caisse — PWA Research Project

## Fonctionnalités PWA implémentées

| Fonctionnalité | Statut | Description |
|---|---|---|
| Service Worker | ✅ | Cache offline, fetch intercept |
| Web App Manifest | ✅ | Installable, icônes, thème |
| Notifications Push | ✅ | Permission + notification locale via SW |
| Background Sync | ✅ | Envoi différé quand connexion revenue |
| Periodic Background Sync | ✅ | Rappel journalier automatique |
| Badge API | ✅ | Compteur sur l'icône de l'app |
| Share Target | ✅ | Recevoir des partages d'autres apps |
| Offline Detection | ✅ | Badge hors-ligne dans le header |
| Install Prompt | ✅ | Bannière d'installation personnalisée |
| Lab PWA | ✅ | Panneau de détection des capacités du navigateur |

---

## Déploiement Firebase Hosting (test sur téléphone)

### 1. Installer Firebase CLI
```bash
npm install -g firebase-tools
```

### 2. Se connecter
```bash
firebase login
```

### 3. Créer un projet sur https://console.firebase.google.com
- Copier l'ID du projet
- Remplacer `ton-projet-firebase-id` dans `.firebaserc`

### 4. Déployer
```bash
cd pwa-mini-caisse_1
firebase deploy
```

L'app sera accessible sur : `https://ton-projet-firebase-id.web.app`

---

## Déploiement GitHub Pages (alternative gratuite)

### 1. Créer un repo GitHub et pousser le code
```bash
git init
git add .
git commit -m "PWA Mini Caisse"
git remote add origin https://github.com/TON_USER/mini-caisse.git
git push -u origin main
```

### 2. Activer GitHub Pages
- Aller dans Settings > Pages
- Source : `main` branch, dossier `/pwa-mini-caisse`
- L'app sera sur : `https://TON_USER.github.io/mini-caisse/`

---

## Limites connues des PWA

| Limite | Détail |
|---|---|
| iOS Safari | Pas de Push Notifications (avant iOS 16.4), Periodic Sync absent |
| Notifications Push réelles | Nécessite un serveur VAPID (ex: Firebase Cloud Messaging) |
| Bluetooth / NFC | Très limité, Chrome Android uniquement |
| Accès fichiers système | Limité à File System Access API (pas tous les navigateurs) |
| Stores (App Store / Play) | Possible via TWA (Trusted Web Activity) sur Android |

---

## Pour aller encore plus loin

- **FCM (Firebase Cloud Messaging)** : notifications push réelles depuis un serveur
- **IndexedDB** : base de données locale plus puissante que localStorage
- **TWA (Trusted Web Activity)** : publier la PWA sur le Play Store
- **Web Share API** : partager depuis l'app vers d'autres apps
- **File System Access API** : lire/écrire des fichiers locaux
- **WebUSB / WebSerial** : connecter des périphériques USB
