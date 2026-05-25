# 🧠 Maze Cup — Prototype 2D Multijoueur (MVP)

## 🎯 Vision du projet

Maze Cup est un jeu multijoueur 2D top-down basé sur :

- la mémoire
- le stress
- la compétition
- l’orientation dans un labyrinthe
- la prise de décision rapide

Le joueur doit mémoriser un labyrinthe visible pendant quelques secondes, puis naviguer dans le noir (fog of war) pour atteindre une coupe au centre avant les autres joueurs.

---

# ✅ CE QUI EST DÉJÀ FAIT

## 🧱 1. Setup du projet

- Projet initialisé avec Vite
- Phaser installé
- Git initialisé et premier commit effectué
- Structure de base créée

---

## 🎮 2. Moteur de jeu

- Phaser configuré (config.js)
- Scene principale GameScene créée
- Boucle de jeu active (create / update)

---

## 🧍 3. Joueur

- Classe Player créée (orientée objet)
- Déplacement clavier (flèches)
- Physique Arcade activée
- Collision avec les limites du monde

---

## 🗺️ 4. Labyrinthe

- Génération via tableau 2D
- 1 = mur / 0 = chemin
- Affichage dynamique des murs
- Système de collisions joueur ↔ murs

---

## 📷 5. Caméra

- Caméra suit le joueur
- Monde agrandi (world bounds)
- Expérience top-down dynamique

---

## 🌫️ 6. Fog of War (base)

- Système de masque lumineux autour du joueur
- Zone visible limitée
- Base pour gameplay mémoire / stress

---

# 🚧 EN COURS / À STABILISER

- Nettoyage des imports ES Modules (Vite + Phaser)
- Chargement correct des assets (player image)
- Stabilisation du fog (optimisation RenderTexture)
- Organisation propre des scènes et entités

---

# 🔥 PROCHAINES ÉTAPES (ROADMAP MVP)

## 🧠 PHASE 1 — CORE GAMEPLAY

### ⏱️ 1. Phase d’observation

- Au début de la partie :
  - labyrinthe entièrement visible
  - joueurs visibles
  - coupe visible
- Timer de 10 secondes

---

### 🌫️ 2. Phase de brouillard

- Activation du fog of war
- Le joueur ne voit que autour de lui
- Gameplay basé sur mémoire

---

## 🏁 3. Objectif principal

- Ajouter une coupe au centre du labyrinthe
- Détection de victoire quand un joueur la touche

---

## 👥 4. Multijoueur (Socket.IO)

- Synchronisation des joueurs en temps réel
- Position des joueurs en live
- Classement dynamique basé sur distance à la coupe

---

## 🏆 5. Système de scoring

- +100 pour le premier
- +60 pour le deuxième
- +40 pour le troisième
- bonus si aucun "coup d’œil" utilisé
- pénalités pour utilisation du coup d’œil

---

## 👁️ 6. Mécanique “Coup d’œil”

- Affiche la map complète pendant 1 seconde
- Cooldown + pénalités :
  - loin de la coupe → -15 points
  - proche de la coupe → reset position + -5 points

---

## 🧭 7. Traces des joueurs

- Les joueurs laissent une trace lumineuse temporaire
- Permet de suivre ou tromper les autres joueurs

---

## 💣 8. Objets spéciaux

- Bulldozer :
  - détruit 2 murs
  - crée un raccourci
  - bruit + reveal position temporaire

---

# 🎨 DIRECTION ARTISTIQUE

- Vue top-down 2D
- Style sombre + néon
- Ambiance stress / mémoire / confusion
- Inspiré de :
  - Among Us (lisibilité)
  - Brawl Stars (UI mobile)
- Effets :
  - glow
  - fog
  - lumière dynamique

---

# 🧠 OBJECTIF FINAL MVP

Créer une version jouable simple mais addictive :

- 1 seule map
- 4 à 10 joueurs
- une coupe centrale
- fog of war après phase d’observation
- leaderboard en temps réel
- gameplay basé sur mémoire + stress

---

# ⚙️ STACK TECHNIQUE

- Phaser (frontend game engine)
- Vite (build tool)
- Node.js (backend futur)
- Socket.IO (multiplayer temps réel futur)
- Firebase (storage initial optionnel)

---

# 🚀 PRINCIPES IMPORTANT

- Toujours construire petit système par petit système
- Le gameplay > les graphismes
- MVP d’abord, features ensuite
- Une mécanique = un fichier / une classe

---

# 🧭 PROCHAINE ÉTAPE IMMÉDIATE

➡️ Phase d’observation (timer + reveal full map)
➡️ transition automatique vers fog
➡️ début du vrai gameplay
