# 🧠 Maze Cup — Prototype 2D Multijoueur (MVP)

## 🎯 VISION DU PROJET

Maze Cup est un jeu multijoueur 2D top-down basé sur :

- la mémoire
- le stress
- la compétition
- l’orientation dans un labyrinthe
- la prise de décision rapide

Le joueur doit :

1. Observer un labyrinthe entièrement visible
2. Mémoriser le chemin
3. Survivre dans un fog of war
4. Atteindre une coupe centrale avant les autres joueurs

---

# ✅ CE QUI EST DÉJÀ FAIT

## 🧱 1. Setup du projet

- Projet initialisé avec Vite
- Phaser installé
- Git configuré
- Structure de base mise en place

---

## 🎮 2. MOTEUR DE JEU

- Phaser configuré
- GameScene créée
- boucle create / update fonctionnelle

---

## 🧍 3. JOUEUR

- Classe Player en OOP
- Déplacement clavier (flèches)
- Physique Arcade activée
- Collision avec murs

---

## 🗺️ 4. LABYRINTHE

- Génération via matrice 2D
- 1 = mur / 0 = chemin
- Affichage dynamique des murs
- collisions fonctionnelles

---

## 📷 5. CAMÉRA

- caméra suit le joueur
- zoom dynamique
- monde étendu

---

## 🧭 6. SPAWN SYSTEM

- spawn aléatoire dans les zones libres
- évite les murs
- position variable à chaque partie

---

## 🌫️ 7. FOG OF WAR (VERSION ACTUELLE)

- système de vision limité autour du joueur
- cercle de visibilité dynamique
- masque basé sur Graphics (Phaser)
- transition après phase d’observation

---

## ⏱️ 8. PHASE D’OBSERVATION

- 3 secondes au début de la partie
- labyrinthe entièrement visible
- caméra zoom out
- timer affiché à l’écran
- transition automatique vers le fog

---

# 🚧 PROBLÈMES / LIMITES ACTUELLES

- Fog basé sur Graphics parfois instable selon rendu WebGL
- Pas encore d’optimisation réseau (multijoueur absent)
- Pas encore d’objectif central (coupe non ajoutée)
- Pas encore de système de victoire

---

# 🔥 ROADMAP MVP

## 🧠 PHASE 1 — CORE GAMEPLAY (EN COURS)

### ⏱️ 1. Phase d’observation

- labyrinthe visible 3–5 secondes
- timer UI
- mémorisation du terrain

---

### 🌫️ 2. Phase de brouillard

- vision limitée autour du joueur
- gameplay basé sur mémoire + stress

---

## 🏁 3. OBJECTIF CENTRAL

- ajout d’une coupe au centre du labyrinthe
- détection de victoire
- fin de partie

---

## 👥 4. MULTIJOUEUR (FUTUR)

- Socket.IO
- synchronisation des joueurs
- positions en temps réel
- leaderboard dynamique

---

## 🏆 5. SCORING SYSTEM

- +100 premier
- +60 deuxième
- +40 troisième
- bonus sans usage de “coup d’œil”
- pénalités selon gameplay

---

## 👁️ 6. MÉCANIQUE “COUP D’ŒIL”

- affiche la map entière 1 seconde
- cooldown
- pénalités selon distance à la coupe

---

## 🧭 7. TRACES JOUEURS

- trails lumineux temporaires
- confusion / stratégie / bluff

---

## 💣 8. OBJETS SPÉCIAUX

- Bulldozer :
  - détruit murs
  - crée raccourcis
  - révèle position temporairement

---

# 🎨 DIRECTION ARTISTIQUE

- vue top-down 2D
- ambiance sombre + néon
- style lisible type mobile game
- inspiration :
  - Among Us (lisibilité)
  - Brawl Stars (UI)

effets :

- glow
- fog
- contraste élevé
- stress visuel

---

# 🧠 OBJECTIF FINAL MVP

Créer un jeu jouable et addictif :

- 1 seule map
- 4–10 joueurs
- fog après mémorisation
- coupe centrale
- leaderboard live
- gameplay basé mémoire + pression

---

# ⚙️ STACK TECHNIQUE

- Phaser (game engine)
- Vite (build tool)
- Node.js (backend futur)
- Socket.IO (multiplayer)
- Firebase (option stockage)

---

# 🚀 PRINCIPES DE DÉVELOPPEMENT

- MVP d’abord
- gameplay avant graphismes
- un système à la fois
- tester → ajuster → améliorer
- garder le scope petit

---

# 🧭 PROCHAINE ÉTAPE IMMÉDIATE

👉 AJOUT DE LA COUPE CENTRALE
👉 + système de victoire
👉 + fin de partie

================================================

================================================

src/
│
├── scenes/
│ └── GameScene.js
│
├── entities/
│ ├── Player.js
│ └── Trophy.js
│
├── systems/
│ ├── FogSystem.js
│ ├── MazeBuilder.js
│ ├── ObservationSystem.js
│ ├── SpawnSystem.js
│ └── CollisionSystem.js
│
├── maze/
│ └── mazeData.js
│
├── ui/
│ ├── TimerUI.js
│ └── LeaderboardUI.js
│
├── managers/
│ ├── GameManager.js
│ └── SocketManager.js
│
├── utils/
│ ├── constants.js
│ └── helpers.js
│
└── main.js
