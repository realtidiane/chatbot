<div align="center">

# 🤖 Chatbot

### *Un chatbot multi-modèles, multi-utilisateurs, en streaming temps-réel*

Une seule interface pour discuter avec **GPT-4o**, **Claude**, **Gemini**, **Llama**, **Mistral**, **DeepSeek**…
via [OpenRouter](https://openrouter.ai). Comptes utilisateurs, historique persistant, rendu Markdown, thème clair/sombre.

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)](https://www.python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-MIT-green)](#-licence)

</div>

---

## 📖 Table des matières

- [À propos](#-à-propos)
- [Fonctionnalités](#-fonctionnalités)
- [Architecture](#-architecture)
- [Stack technique](#-stack-technique)
- [Démarrage rapide](#-démarrage-rapide)
- [Configuration `.env`](#-configuration-env)
- [API REST](#-api-rest)
- [Streaming SSE](#-streaming-sse)
- [Sécurité](#-sécurité)
- [Build de production](#-build-de-production)
- [Roadmap](#-roadmap)
- [Contribuer](#-contribuer)
- [Auteur](#-auteur)

---

## ✨ À propos

**Chatbot** est une application web **full-stack** pensée pour donner accès à **plusieurs modèles d'IA** depuis une seule interface, sans avoir à jongler entre ChatGPT, Claude, Gemini, etc.

Elle s'appuie sur **OpenRouter** comme passerelle universelle vers les LLMs, expose une API **FastAPI** asynchrone qui gère les comptes, l'historique et le **streaming SSE**, et offre un frontend **React** moderne avec rendu Markdown, coloration syntaxique et glassmorphism.

> 🎯 **Cas d'usage** : assistant personnel multi-modèles, banc d'essai de prompts, chatbot privé pour une équipe, projet d'apprentissage full-stack Python/React.

---

## 🚀 Fonctionnalités

### 🧠 Multi-modèles via OpenRouter
- Sélection du modèle à la volée : **GPT-4o**, **Claude 3.5**, **Gemini 2.0**, **Llama 3.1**, **Mistral**, **DeepSeek**…
- Liste des modèles récupérée dynamiquement depuis l'API OpenRouter
- Réglage du **system prompt** et de la **température** par conversation

### 💬 Conversations persistantes
- **Historique multi-conversations** stocké en MySQL (par utilisateur)
- Création / renommage / suppression
- Migration automatique des anciennes conversations `localStorage` au premier login

### 🔐 Authentification
- Inscription / connexion par **JWT** (PyJWT + bcrypt)
- Chaque utilisateur a son propre historique privé
- Mode **inscription désactivable** (intranet / usage perso)
- Tokens à expiration configurable (par défaut 7 jours)

### ⚡ Streaming temps-réel
- Réponses streamées en **Server-Sent Events** (SSE)
- Affichage progressif token par token, façon ChatGPT
- Possibilité d'interrompre la génération côté client

### 🎨 Interface
- Design **glassmorphism** moderne, **thème sombre/clair** persisté
- Rendu **Markdown** complet : tableaux, listes, blocs de code
- **Coloration syntaxique** via highlight.js
- Composants accessibles (WCAG AA, `aria-labels`, `prefers-reduced-motion`)
- **Responsive** : desktop, tablette, mobile

### 🛡️ Sécurité & robustesse
- Mots de passe hashés avec **bcrypt**
- **Rate limiting** (60 req/min/IP via slowapi)
- Validation Pydantic stricte sur toutes les entrées
- CORS configurable + **regex LAN** pour les usages réseau local
- Gestion d'erreurs sans fuite d'information sensible

---

## 🏗️ Architecture

```
┌──────────────────────────┐         ┌──────────────────────────┐
│       FRONTEND           │         │        BACKEND           │
│  React + Vite + Tailwind │◄───────►│  FastAPI (async)         │
│                          │  HTTP   │                          │
│  • useAuth (JWT)         │  SSE    │  • /api/auth (JWT)       │
│  • useConversations      │         │  • /api/conversations    │
│  • streamChat (fetch+SSE)│         │  • /api/chat (SSE)       │
│  • Markdown + highlight  │         │  • /api/models           │
└──────────────────────────┘         └────────────┬─────────────┘
                                                  │
                            ┌──────────────────┐  │  ┌────────────────┐
                            │   MySQL 8        │◄─┘  │  OpenRouter    │
                            │  users / convs / │     │  (LLM gateway) │
                            │  messages        │     └────────────────┘
                            └──────────────────┘
```

### Arborescence

```
chatbot/
├── backend/
│   ├── main.py                      # FastAPI app + lifespan (init DB)
│   ├── auth/
│   │   ├── security.py              # bcrypt + JWT
│   │   └── dependencies.py          # get_current_user
│   ├── db/
│   │   ├── database.py              # SQLAlchemy 2 async + session
│   │   └── models.py                # User, Conversation, Message
│   ├── routes/
│   │   ├── auth.py                  # /api/auth/(register|login|me|config)
│   │   ├── conversations.py         # CRUD + /import
│   │   └── chat.py                  # /api/chat (SSE streaming)
│   ├── services/openrouter.py       # client OpenRouter
│   ├── models/schemas.py            # Pydantic
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── App.jsx                  # gating auth + chat
│       ├── components/              # Sidebar, Header, ChatArea, InputArea,
│       │                            # SettingsDialog, AuthScreen, ModelSelector
│       ├── hooks/                   # useAuth, useConversations, useTheme
│       └── utils/                   # api, streaming, migrate, storage
│
└── README.md
```

---

## 🧰 Stack technique

| Couche       | Technologies                                                          |
|--------------|-----------------------------------------------------------------------|
| **Frontend** | React 18, Vite 5, TailwindCSS 3                                       |
|              | react-markdown + remark-gfm + rehype-highlight (rendu Markdown + code)|
|              | lucide-react (icônes), highlight.js (coloration syntaxique)           |
| **Backend**  | Python 3.10+, FastAPI 0.115, Uvicorn (ASGI)                           |
|              | SQLAlchemy 2 async + aiomysql (driver), Pydantic v2                   |
|              | bcrypt + PyJWT (auth), slowapi (rate limit), httpx (client OpenRouter)|
| **DB**       | MySQL 8 (ou MariaDB 10.x)                                             |
| **LLM**      | [OpenRouter](https://openrouter.ai) (passerelle vers GPT, Claude, Gemini, Llama…) |
| **Streaming**| Server-Sent Events (SSE) bout-en-bout                                 |

---

## ⚡ Démarrage rapide

### Prérequis

- **Python ≥ 3.10** (3.12 / 3.13 recommandé)
- **Node.js ≥ 18** & **npm**
- **MySQL ≥ 5.7** ou **MariaDB ≥ 10.x**
- Une **clé API OpenRouter** → [openrouter.ai/keys](https://openrouter.ai/keys)

### 1️⃣ Cloner le repo

```bash
git clone https://github.com/realtidiane/chatbot.git
cd chatbot
```

### 2️⃣ Créer la base de données

```sql
CREATE DATABASE chatbot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Recommandé : un utilisateur dédié plutôt que root
-- CREATE USER 'chatbot'@'localhost' IDENTIFIED BY 'mot_de_passe_solide';
-- GRANT ALL PRIVILEGES ON chatbot.* TO 'chatbot'@'localhost';
-- FLUSH PRIVILEGES;
```

> ✅ Les **tables sont créées automatiquement** au premier démarrage du backend (via `Base.metadata.create_all`).

### 3️⃣ Lancer le backend

```bash
cd backend

# Environnement virtuel
python -m venv .venv
.venv\Scripts\activate          # Windows
source .venv/bin/activate       # macOS / Linux

# Dépendances
python -m pip install --upgrade pip
pip install -r requirements.txt

# Configuration
cp .env.example .env            # macOS / Linux
copy .env.example .env          # Windows
```

Édite ensuite `backend/.env` et renseigne **trois variables minimum** :

1. **`OPENROUTER_API_KEY`** — ta clé OpenRouter
2. **`DATABASE_URL`** — par exemple :
   ```
   mysql+aiomysql://root@localhost:3306/chatbot
   mysql+aiomysql://root:VotreMotDePasse@localhost:3306/chatbot
   ```
3. **`JWT_SECRET`** — génère une chaîne aléatoire :
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

Démarre le serveur :

```bash
# Option A : uvicorn directement
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Option B : équivalent, plus simple
python main.py
```

➡️ API disponible sur **http://localhost:8000**

### 4️⃣ Lancer le frontend

Dans un **second terminal** :

```bash
cd frontend
npm install
npm run dev
```

➡️ Interface disponible sur **http://localhost:5173** 🎉

> 💡 Vite écoute sur `0.0.0.0` — l'app est aussi accessible depuis un autre appareil sur le **même Wi-Fi** (ex : `http://192.168.1.42:5173` depuis ton téléphone).

### 5️⃣ Premier usage

1. Ouvre `http://localhost:5173`
2. Clique sur **S'inscrire**, crée un compte (mot de passe ≥ 6 caractères)
3. Choisis un modèle dans la liste, écris un message — la réponse arrive en streaming ✨
4. Si tu avais des conversations dans le `localStorage` avant l'auth, elles sont **importées automatiquement** au premier login

---

## ⚙️ Configuration `.env`

| Variable                | Description                                                | Défaut                                 |
|-------------------------|------------------------------------------------------------|----------------------------------------|
| `OPENROUTER_API_KEY`    | **Requis** — clé API OpenRouter                            | —                                      |
| `OPENROUTER_BASE_URL`   | Endpoint OpenRouter                                        | `https://openrouter.ai/api/v1`         |
| `DEFAULT_MODEL`         | Modèle par défaut si le client n'en spécifie pas           | `openai/gpt-4o-mini`                   |
| `APP_NAME`              | Identité envoyée à OpenRouter (analytics)                  | `Chatbot`                              |
| `HTTP_REFERER`          | Idem (leaderboard OpenRouter)                              | `http://localhost:5173`                |
| `DATABASE_URL`          | DSN async SQLAlchemy                                       | `mysql+aiomysql://root@localhost/chatbot` |
| `JWT_SECRET`            | **Change-la !** Chaîne aléatoire pour signer les tokens    | placeholder                            |
| `JWT_ALGORITHM`         | Algorithme JWT                                             | `HS256`                                |
| `JWT_EXPIRE_MINUTES`    | Durée de vie d'un token (en minutes)                       | `10080` (7 jours)                      |
| `ALLOW_REGISTRATION`    | `true` / `false` — autoriser l'inscription publique        | `true`                                 |
| `FRONTEND_ORIGINS`      | Liste CORS séparée par virgules (`*` = tout autoriser)     | `http://localhost:5173,…`              |
| `FRONTEND_ORIGIN_REGEX` | Regex CORS additionnelle (couvre 192.168/10/172.16-31)     | regex LAN par défaut                   |
| `HOST` / `PORT`         | Bind du serveur (`python main.py` uniquement)              | `0.0.0.0` / `8000`                     |

### Désactiver l'inscription publique

```env
ALLOW_REGISTRATION=false
```

L'écran de login masque l'onglet « S'inscrire ». Tu peux toujours créer des comptes via l'API ou directement en SQL.

### Accès depuis un autre appareil du LAN

Le CORS autorise par défaut les plages `192.168.*`, `10.*` et `172.16-31.*` via la regex `FRONTEND_ORIGIN_REGEX`. Pense à **autoriser Python et Node dans le pare-feu Windows** au premier lancement (réseau privé).

---

## 🌐 API REST

Base : `http://localhost:8000`

### Public

| Méthode | URL                        | Description                                      |
|---------|----------------------------|--------------------------------------------------|
| GET     | `/health`                  | Statut du service                                |
| GET     | `/api/auth/config`         | `{ registration_enabled: boolean }`              |
| GET     | `/api/models`              | Liste des modèles OpenRouter disponibles         |
| POST    | `/api/auth/register`       | Inscription `{ email, password, name? }`         |
| POST    | `/api/auth/login`          | Connexion `{ email, password }` → `access_token` |

### Authentifié — `Authorization: Bearer <jwt>`

| Méthode | URL                                  | Description                              |
|---------|--------------------------------------|------------------------------------------|
| GET     | `/api/auth/me`                       | Utilisateur courant                      |
| GET     | `/api/conversations`                 | Liste des conversations de l'utilisateur |
| POST    | `/api/conversations`                 | Créer une conversation                   |
| GET     | `/api/conversations/{id}`            | Détail + messages                        |
| PATCH   | `/api/conversations/{id}`            | Éditer (titre, modèle, system, temp)     |
| DELETE  | `/api/conversations/{id}`            | Supprimer                                |
| POST    | `/api/conversations/import`          | Bulk-import depuis localStorage          |
| POST    | `/api/chat`                          | Envoyer un message → réponse en SSE      |

### Exemple — `POST /api/chat`

```json
{
  "conversation_id": "abc123…",
  "content": "Explique-moi la blockchain comme à un enfant de 10 ans",
  "model": "anthropic/claude-3.5-sonnet",
  "system_prompt": null,
  "temperature": 0.7
}
```

---

## 📡 Streaming SSE

L'endpoint `/api/chat` ne renvoie **pas** un JSON classique mais un flux **Server-Sent Events** :

```
data: {"type": "token", "content": "La "}
data: {"type": "token", "content": "blockchain "}
data: {"type": "token", "content": "est "}
…
data: {"type": "done", "message_id": "msg_xyz"}
```

Côté frontend, `utils/streaming.js` consomme ce flux avec `fetch` + `ReadableStream` et met à jour l'UI en temps réel. La conversation est **persistée en base** côté serveur dès que le stream se termine.

---

## 🛡️ Sécurité

> ⚠️ **Avant de mettre en ligne**, lis attentivement cette section.

- 🔒 **Ne jamais commit `.env`** — il est dans `.gitignore`
- 🔑 **Change `JWT_SECRET`** pour une chaîne aléatoire de 48+ caractères
- 🔐 Les mots de passe sont hashés avec **bcrypt** (jamais en clair)
- ⏱️ Les tokens JWT expirent au bout de 7 jours par défaut (`JWT_EXPIRE_MINUTES`)
- 🚧 **Rate limiting** : 60 req/min/IP via slowapi (à durcir en prod)
- 🚫 Si une clé OpenRouter fuite, **révoque-la immédiatement** sur [openrouter.ai/keys](https://openrouter.ai/keys)
- 🌐 N'expose **jamais** l'app brute sur Internet : place-la derrière un reverse-proxy avec **HTTPS** (nginx, Caddy, Traefik) et envisage **fail2ban**
- 🧪 Validation **Pydantic** stricte sur toutes les entrées (limite les mauvaises surprises)

---

## 🏭 Build de production

### Frontend

```bash
cd frontend
npm run build           # produit frontend/dist
npm run preview         # sert dist sur le port 4173 pour tester
```

### Servir le frontend depuis FastAPI

Pour un déploiement en un seul service, monte `frontend/dist` comme `StaticFiles` dans `main.py`, désactive le proxy Vite, et place l'ensemble derrière **nginx** ou **Caddy** avec HTTPS.

### Production checklist

- [ ] `JWT_SECRET` régénéré (48+ caractères)
- [ ] `ALLOW_REGISTRATION=false` si chatbot privé
- [ ] `FRONTEND_ORIGINS` restreint aux domaines réels
- [ ] HTTPS via reverse-proxy (Caddy, nginx + certbot)
- [ ] Backups MySQL automatisés
- [ ] Monitoring (au minimum un `/health` watchdog)
- [ ] Rotation des logs

---

## 🧭 Roadmap

- [ ] Upload d'images (modèles vision : GPT-4o, Claude, Gemini)
- [ ] Recherche dans l'historique
- [ ] Export des conversations (Markdown, JSON, PDF)
- [ ] Partage public d'une conversation (lien en lecture seule)
- [ ] **Tools / function calling** OpenAI-compatible
- [ ] Mode équipe / espace de travail partagé
- [ ] Application mobile (React Native ou PWA)
- [ ] Auto-titrage des conversations par le LLM
- [ ] Migrations de schéma via **Alembic** (pour passer en prod sereinement)

---

## 🤝 Contribuer

Les contributions sont bienvenues ! Pour proposer une amélioration :

1. Fork le repo
2. Crée une branche : `git checkout -b feat/ma-feature`
3. Commit : `git commit -m "feat: ajout de ma feature"`
4. Push : `git push origin feat/ma-feature`
5. Ouvre une **Pull Request**

Style de code attendu : **Python** suivant PEP 8 (formatage `ruff`/`black` apprécié), **JS** en ESLint/Prettier raisonnable, commits en convention `type: description`.

---

## 📜 Licence

Distribué sous licence **MIT**. Libre de l'utiliser, le modifier et le redistribuer.

---

## 👤 Auteur

**Tidiane** — [@realtidiane](https://github.com/realtidiane)

🇸🇳 *Built with care from Senegal.*

Si ce projet t'a été utile, n'hésite pas à laisser une ⭐ sur le repo !
