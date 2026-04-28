# Chatbot — FastAPI + React + OpenRouter (avec authentification)

Application web de chatbot multi-utilisateurs. Backend Python (FastAPI)
qui parle à [OpenRouter](https://openrouter.ai/) en streaming, base de
données MySQL pour les comptes et l'historique, frontend React + Vite +
Tailwind avec un thème sombre/clair, glassmorphism, rendu Markdown,
coloration syntaxique, multi-conversations persistées par utilisateur.

## Arborescence

```
chatbot/
├── backend/
│   ├── main.py                       # FastAPI app + lifespan (init DB)
│   ├── auth/
│   │   ├── security.py               # bcrypt + JWT
│   │   └── dependencies.py           # get_current_user
│   ├── db/
│   │   ├── database.py               # engine async + session
│   │   └── models.py                 # User, Conversation, Message
│   ├── routes/
│   │   ├── auth.py                   # /api/auth/(register|login|me|config)
│   │   ├── conversations.py          # CRUD + /import
│   │   └── chat.py                   # /api/chat (SSE, persiste)
│   ├── services/openrouter.py
│   ├── models/schemas.py             # Pydantic
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── package.json, vite.config.js, tailwind/postcss configs
│   └── src/
│       ├── App.jsx                   # auth gating + chat
│       ├── components/               AuthScreen, Sidebar, Header, ChatArea, …
│       ├── hooks/                    useAuth, useConversations, useTheme
│       └── utils/                    api, streaming, migrate, storage
├── .gitignore
└── README.md
```

## Prérequis

- Python ≥ 3.10 (3.12/3.13 recommandé)
- Node.js ≥ 18
- MySQL ≥ 5.7 (ou MariaDB 10.x)
- Une clé API OpenRouter (https://openrouter.ai/keys)

## 1) Préparer MySQL

Connectez-vous en root et créez la base. Le serveur attend une DB
nommée `chatbot` (vous pouvez changer dans `.env`) :

```sql
CREATE DATABASE chatbot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- Optionnel mais recommandé : créez un utilisateur dédié plutôt que d'utiliser root
-- CREATE USER 'chatbot'@'localhost' IDENTIFIED BY 'mot_de_passe_solide';
-- GRANT ALL PRIVILEGES ON chatbot.* TO 'chatbot'@'localhost';
-- FLUSH PRIVILEGES;
```

Les tables sont créées automatiquement au premier démarrage du backend
(via `Base.metadata.create_all`).

## 2) Backend

```bash
cd backend

# (recommandé) environnement virtuel
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

python -m pip install --upgrade pip
pip install -r requirements.txt

# Configurer .env
cp .env.example .env       # macOS / Linux
copy .env.example .env     # Windows
```

Ouvrez `backend/.env` et remplissez **trois choses** :

1. `OPENROUTER_API_KEY` — votre clé OpenRouter
2. `DATABASE_URL` — par exemple :
   - sans mot de passe : `mysql+aiomysql://root@localhost:3306/chatbot`
   - avec mot de passe : `mysql+aiomysql://root:VotreMotDePasse@localhost:3306/chatbot`
3. `JWT_SECRET` — générez une chaîne aléatoire :
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(48))"
   ```

Puis lancez le backend :

```bash
# Option A — uvicorn directement (écoute sur toutes les interfaces) :
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Option B — équivalent, plus simple :
python main.py
```

Endpoints principaux :

- `GET  /health` — status
- `GET  /api/auth/config` — `{registration_enabled}` (public)
- `POST /api/auth/register` — body : `{email, password, name?}` → `{access_token}`
- `POST /api/auth/login` — body : `{email, password}` → `{access_token}`
- `GET  /api/auth/me` — utilisateur courant (auth requise)
- `GET  /api/conversations` — liste des conversations de l'utilisateur (auth)
- `POST /api/conversations` — créer (auth)
- `GET  /api/conversations/{id}` — détail + messages (auth)
- `PATCH /api/conversations/{id}` — éditer titre/modèle/system prompt/température (auth)
- `DELETE /api/conversations/{id}` — supprimer (auth)
- `POST /api/conversations/import` — bulk-import depuis localStorage (auth)
- `POST /api/chat` — envoyer un message (auth, SSE) :
  ```json
  {
    "conversation_id": "abc123…",
    "content": "Bonjour",
    "model": "openai/gpt-4o-mini",
    "system_prompt": null,
    "temperature": 0.7
  }
  ```
- `GET  /api/models` — modèles OpenRouter (public)

## 3) Frontend

Dans un second terminal :

```bash
cd frontend
npm install
npm run dev
```

Le frontend écoute sur `http://0.0.0.0:5173` — donc accessible
localement (`http://localhost:5173`) **et** depuis n'importe quel
appareil sur le même Wi-Fi (ex : `http://192.168.1.42:5173` depuis
votre téléphone).

## Premier usage

1. Ouvrez `http://localhost:5173`.
2. Cliquez sur **S'inscrire**, créez un compte avec email + mot de
   passe (≥ 6 caractères).
3. Si vous aviez déjà des conversations en localStorage avant l'auth,
   elles sont **importées automatiquement** au premier login (vous
   verrez une notification en bas de l'écran).
4. Discutez ! Les conversations sont sauvegardées sur le serveur,
   accessibles depuis n'importe quel navigateur où vous vous
   connectez avec le même compte.

### Désactiver l'inscription publique

Dans `.env` :
```
ALLOW_REGISTRATION=false
```
La page de login masquera l'onglet « S'inscrire ». Vous pouvez créer
des comptes manuellement via l'API ou un script SQL.

### Accès LAN

Le CORS autorise par défaut les plages LAN (`10.*`, `192.168.*`,
`172.16-31.*`). Vous pouvez surcharger via `FRONTEND_ORIGINS` ou
`FRONTEND_ORIGIN_REGEX` dans `.env`. Pensez à autoriser Python et
Node dans le pare-feu Windows (réseau privé) au premier lancement.

## Sécurité

- **Ne jamais commit `.env`** — il est dans `.gitignore`.
- **Changez `JWT_SECRET`** avant de mettre en ligne.
- **Révoquez les clés exposées** sur https://openrouter.ai/keys.
- Les mots de passe sont hashés avec **bcrypt**, pas en clair.
- Les tokens JWT expirent par défaut au bout de 7 jours
  (`JWT_EXPIRE_MINUTES`).
- Le rate limiting (60 req/min/IP) atténue mais ne remplace pas une
  protection adéquate — n'exposez pas l'app sur Internet sans HTTPS,
  reverse-proxy, et fail2ban équivalent.

## Build de production

```bash
cd frontend
npm run build           # produit frontend/dist
npm run preview         # sert dist sur le port 4173 pour tester
```

Pour servir le frontend depuis FastAPI en production, montez
`frontend/dist` comme `StaticFiles` dans `main.py` (et désactivez le
proxy Vite). Mettez le tout derrière nginx/Caddy avec HTTPS.
