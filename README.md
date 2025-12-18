
# ⚓ Dockord
### *Le centre de contrôle Discord manquant.*

Dockord est une application desktop légère conçue pour transformer Discord en un outil de productivité efficace. Ne perdez plus jamais un message important, une annonce clé ou un lien utile dans le flux incessant de vos serveurs.

![Version](https://img.shields.io/badge/version-1.0.0-blue?style=for-the-badge)
![Electron](https://img.shields.io/badge/built%20with-Electron-2b2d31?style=for-the-badge&logo=electron)
![React](https://img.shields.io/badge/UI-React-61DAFB?style=for-the-badge&logo=react)

## 🎯 Le Problème
Sur Discord, les informations cruciales se noient vite. On fait des captures d'écran, on épingle (quand on a les droits), ou on oublie simplement où on a vu quoi. **Dockord** offre une couche d'organisation externe, persistante et personnelle.

## ✨ Fonctionnalités Clés

- **📦 Capture Intuitive** : Collez simplement un lien de message Discord. Dockord l'indexe avec vos notes personnelles.
- **🏷️ Tags & Collections** : Classez vos sauvegardes par projet, par thématique (#urgent, #ressources) ou par serveur.
- **⏰ Rappels Systèmes** : Ne procrastinez plus sur une réponse. Programmez un rappel et recevez une notification native (Windows/macOS/Linux).
- **🔎 Recherche Instantanée** : Retrouvez n'importe quel message en une fraction de seconde grâce à une recherche multi-critères.
- **📂 Historique Hors-Ligne** : Même si le salon est supprimé ou que vous quittez le serveur, vous gardez une trace de vos notes et du lien original.

## 🛠️ Installation & Développement

### Prérequis
- [Node.js](https://nodejs.org/) (v16+)
- npm ou yarn

### Lancement en développement
```bash
# Installer les dépendances
npm install

# Lancer l'application
npm start
```

### Build & Distribution
```bash
# Créer l'exécutable pour votre OS
npm run dist
```

## 🔒 Confidentialité & Sécurité
Dockord est une application **locale**. Vos données sont stockées sur votre machine (SQLite/JSON). Aucune API Discord n'est requise, ce qui garantit :
- Zéro risque de bannissement.
- Zéro accès à vos tokens Discord.
- Une rapidité d'exécution maximale.

---
*Fait avec ❤️ pour la communauté Discord par l'équipe Dockord.*
