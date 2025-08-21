# 🎯 Splitter - Outil de découpage de fichiers CSV

Un outil web moderne pour découper automatiquement vos fichiers CSV volumineux en plusieurs fichiers plus petits et gérables.

## ✨ Fonctionnalités

- **Interface intuitive** : Glissez-déposez vos fichiers CSV
- **Découpage intelligent** : Définissez le nombre de lignes par fichier
- **Gestion des headers** : Option pour conserver les en-têtes dans chaque fichier
- **Téléchargement flexible** : Fichiers individuels ou archive ZIP
- **Sécurité** : Aucun stockage permanent des données
- **Performance** : Traitement optimisé pour les gros fichiers
- **Responsive** : Interface adaptée mobile et desktop

## 🚀 Installation

### Prérequis

- Node.js (version 16 ou supérieure)
- npm ou yarn

### Étapes d'installation

1. **Cloner le projet**
   ```bash
   git clone <url-du-repo>
   cd Spliter_import
   ```

2. **Installer les dépendances serveur**
   ```bash
   npm install
   ```

3. **Installer les dépendances client**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Démarrer l'application**

   **Mode développement :**
   ```bash
   # Terminal 1 - Serveur backend
   npm run dev
   
   # Terminal 2 - Client React
   cd client
   npm start
   ```

   **Mode production :**
   ```bash
   npm run build
   npm start
   ```

5. **Accéder à l'application**
   - Développement : http://localhost:3000
   - Production : http://localhost:5000

## 📖 Guide d'utilisation

### 1. Chargement du fichier
- Cliquez sur la zone de dépôt ou glissez-déposez votre fichier CSV
- Formats acceptés : `.csv` (UTF-8)
- Taille maximale : 100 MB

### 2. Configuration
- **Nombre de lignes par fichier** : Définissez le nombre maximum de lignes de données par fichier généré
- **Header** : Cochez si votre fichier contient des en-têtes de colonnes (recommandé)

### 3. Découpage
- Cliquez sur "Découper le fichier"
- L'application traite votre fichier et affiche les statistiques

### 4. Téléchargement
- **Fichiers individuels** : Téléchargez chaque partie séparément
- **Archive ZIP** : Téléchargez tous les fichiers en une fois

## 🔧 Configuration technique

### Variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
NODE_ENV=development
PORT=5000
```

### Structure des fichiers générés

- **Avec header** : `nomOriginal_part1.csv`, `nomOriginal_part2.csv`, etc.
- **Sans header** : Même convention de nommage
- **Encodage** : Identique au fichier source

### Exemples de découpage

**Avec header (12 345 lignes, limite 5 000) :**
- `fichier_part1.csv` : 1 header + 5 000 données
- `fichier_part2.csv` : 1 header + 5 000 données  
- `fichier_part3.csv` : 1 header + 2 344 données

**Sans header (12 345 lignes, limite 5 000) :**
- `fichier_part1.csv` : 5 000 lignes
- `fichier_part2.csv` : 5 000 lignes
- `fichier_part3.csv` : 2 345 lignes

## 🛠️ Architecture technique

### Backend (Node.js + Express)
- **Framework** : Express.js
- **Traitement CSV** : csv-parser, csv-writer
- **Upload** : Multer
- **Archives** : Archiver
- **Sécurité** : Helmet, CORS, Rate limiting

### Frontend (React)
- **Framework** : React 18
- **Upload** : React Dropzone
- **HTTP Client** : Axios
- **Icons** : Lucide React
- **Styles** : CSS moderne avec Flexbox/Grid

### Fonctionnalités de sécurité
- Validation des types de fichiers
- Limitation de taille (100MB)
- Rate limiting (100 requêtes/15min)
- Nettoyage automatique des fichiers temporaires
- Headers de sécurité (Helmet)

## 📁 Structure du projet

```
Spliter_import/
├── server.js              # Serveur Express principal
├── package.json           # Dépendances serveur
├── client/                # Application React
│   ├── public/
│   ├── src/
│   │   ├── App.js         # Composant principal
│   │   ├── App.css        # Styles spécifiques
│   │   └── index.css      # Styles globaux
│   └── package.json       # Dépendances client
├── uploads/               # Fichiers temporaires (auto-créé)
├── outputs/               # Fichiers générés (auto-créé)
└── README.md              # Documentation
```

## 🔍 Dépannage

### Problèmes courants

**Erreur "Module not found"**
```bash
npm install
cd client && npm install
```

**Port déjà utilisé**
```bash
# Changer le port dans .env
PORT=5001
```

**Fichier trop volumineux**
- Vérifiez que le fichier fait moins de 100MB
- Utilisez un nombre de lignes par fichier plus petit

**Erreur de téléchargement**
- Vérifiez les permissions du dossier `outputs/`
- Redémarrez le serveur

## 🚀 Déploiement

### Heroku
```bash
heroku create votre-app-splitter
git push heroku main
```

### VPS/Docker
```bash
# Build de production
npm run build

# Démarrage
NODE_ENV=production npm start
```

## 📝 Licence

MIT License - Voir le fichier LICENSE pour plus de détails.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- Signaler des bugs
- Proposer des améliorations
- Soumettre des pull requests

## 📞 Support

Pour toute question ou problème :
- Ouvrez une issue sur GitHub
- Consultez la documentation technique
- Vérifiez les logs du serveur

---

**Splitter** - Simplifiez la gestion de vos fichiers CSV volumineux ! 🎯
