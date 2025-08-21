# 📖 Guide d'utilisation - Splitter

## 🚀 Démarrage rapide

### 1. Accéder à l'application
- Ouvrez votre navigateur
- Allez sur : http://localhost:3000
- L'interface s'affiche avec un design moderne et intuitif

### 2. Charger votre fichier CSV
- **Glissez-déposez** votre fichier CSV dans la zone bleue
- Ou **cliquez** sur la zone pour sélectionner un fichier
- Formats acceptés : `.csv` uniquement
- Taille maximale : 100 MB

### 3. Configurer le découpage
- **Nombre de lignes par fichier** : Entrez le nombre maximum de lignes de données par fichier
  - Exemple : 5000 lignes par fichier
  - Recommandé : 1000-10000 selon vos besoins

- **Header** : ✅ Cochez cette case si votre fichier contient des en-têtes de colonnes
  - Exemple : "nom,prenom,email,age"
  - Si coché : chaque fichier généré aura les mêmes en-têtes
  - Si décoché : découpage simple sans gestion des en-têtes

### 4. Lancer le découpage
- Cliquez sur le bouton **"Découper le fichier"**
- Attendez le traitement (indicateur de chargement)
- Les résultats s'affichent automatiquement

### 5. Télécharger les fichiers
- **Fichiers individuels** : Cliquez sur "Télécharger" pour chaque partie
- **Archive ZIP** : Cliquez sur "Télécharger tout (ZIP)" pour tout récupérer

## 📊 Exemples concrets

### Exemple 1 : Fichier avec header (20 000 lignes)
**Configuration :**
- Lignes par fichier : 5 000
- Header : ✅ Coché

**Résultat :**
- `monfichier_part1.csv` : Header + 5 000 lignes
- `monfichier_part2.csv` : Header + 5 000 lignes
- `monfichier_part3.csv` : Header + 5 000 lignes
- `monfichier_part4.csv` : Header + 5 000 lignes

### Exemple 2 : Fichier sans header (15 000 lignes)
**Configuration :**
- Lignes par fichier : 3 000
- Header : ❌ Décoché

**Résultat :**
- `monfichier_part1.csv` : 3 000 lignes
- `monfichier_part2.csv` : 3 000 lignes
- `monfichier_part3.csv` : 3 000 lignes
- `monfichier_part4.csv` : 3 000 lignes
- `monfichier_part5.csv` : 3 000 lignes

## ⚠️ Messages d'erreur courants

### "Veuillez sélectionner un fichier CSV valide"
- **Cause** : Le fichier n'est pas au format CSV
- **Solution** : Vérifiez l'extension du fichier (.csv)

### "Le fichier doit contenir au minimum un header et une ligne de données"
- **Cause** : Fichier trop petit ou header décoché avec fichier vide
- **Solution** : Vérifiez le contenu du fichier et la case header

### "Le nombre de lignes par fichier doit être supérieur à 0"
- **Cause** : Valeur invalide dans le champ de configuration
- **Solution** : Entrez un nombre positif (ex: 1000)

### "Fichier trop volumineux"
- **Cause** : Le fichier dépasse 100 MB
- **Solution** : Utilisez un fichier plus petit ou découpez-le manuellement

## 💡 Conseils d'utilisation

### Optimisation des performances
- **Fichiers volumineux** : Utilisez des valeurs de 1000-5000 lignes par fichier
- **Fichiers moyens** : 5000-10000 lignes par fichier
- **Fichiers petits** : 1000-2000 lignes par fichier

### Gestion des headers
- **Toujours cocher** si votre fichier a des en-têtes de colonnes
- **Décocher** uniquement pour des fichiers de données brutes
- **Vérification** : Ouvrez votre CSV dans un éditeur de texte pour voir les en-têtes

### Nommage des fichiers
- Les fichiers générés conservent le nom original + "_partX"
- Exemple : `donnees.csv` → `donnees_part1.csv`, `donnees_part2.csv`
- L'encodage est préservé (UTF-8 recommandé)

## 🔧 Fonctionnalités avancées

### Téléchargement en lot
- Utilisez le bouton "Télécharger tout (ZIP)" pour récupérer tous les fichiers
- L'archive ZIP contient tous les fichiers découpés
- Pratique pour le partage ou l'archivage

### Statistiques en temps réel
- Nombre de fichiers générés
- Nombre total de lignes traitées
- Nombre de lignes par fichier configuré

### Interface responsive
- Fonctionne sur ordinateur, tablette et mobile
- Adaptation automatique de l'interface selon la taille d'écran

## 🆘 Support

### Problèmes techniques
1. **Vérifiez votre navigateur** : Chrome, Firefox, Safari, Edge récents
2. **Vérifiez votre connexion** : Internet requis pour le traitement
3. **Redémarrez l'application** : Fermez et rouvrez le navigateur

### Questions fréquentes

**Q : Mes fichiers sont-ils stockés sur le serveur ?**
R : Non, tous les fichiers sont supprimés automatiquement après téléchargement.

**Q : Puis-je découper d'autres formats que CSV ?**
R : Non, l'outil est spécialement conçu pour les fichiers CSV.

**Q : Quelle est la taille maximale de fichier ?**
R : 100 MB maximum pour des raisons de performance.

**Q : Les en-têtes sont-ils préservés ?**
R : Oui, si vous cochez la case "Header", chaque fichier aura les mêmes en-têtes.

---

**Splitter** - Simplifiez la gestion de vos fichiers CSV volumineux ! 🎯
