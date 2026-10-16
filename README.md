# Weekly Highlights – Marketing Feldschlösschen

Outil en deux parties pour préparer le mail hebdomadaire « Weekly Highlights » envoyé à tout le département marketing.

| Page | Pour qui | Adresse |
|---|---|---|
| Formulaire | l'équipe | https://feldschloesschen-weekly-highlights.netlify.app/ |
| Compilation | Astrid (mot de passe) | https://feldschloesschen-weekly-highlights.netlify.app/zusammenstellen |
| Archives | toute l'équipe (lecture) | https://feldschloesschen-weekly-highlights.netlify.app/archiv |

## Fonctionnement
1. Le formulaire est un tableau commun de la semaine (DE/FR) : chacun voit ce qui est déjà saisi, complète une entrée existante (« Bearbeiten / ergänzen ») ou en ajoute une nouvelle. Chaque entrée est enregistrée séparément ; un avertissement signale un sujet semblable déjà présent, et une modification simultanée par deux personnes est détectée.
2. Les entrées et les fichiers sont conservés dans Netlify Blobs (`wh-items`, classés par semaine ISO ; `wh-media` pour les fichiers).
3. Sur la page de compilation, Astrid voit le mail de la semaine déjà assemblé dans son format habituel (Hallo zusammen … Liebe Grüsse), photos dans le texte. Elle peut le corriger, puis « Copier pour Outlook » et le coller dans un nouveau mail.

## Structure
- `public/index.html` – formulaire de l'équipe
- `public/zusammenstellen.html` – page de compilation
- `netlify/functions/` – `rewrite` (harmonise le style des entrées avec Claude si `ANTHROPIC_API_KEY` est défini ; modèle `ANTHROPIC_MODEL`, par défaut claude-sonnet-5-5), `send` (envoie le mail compilé via Resend si `RESEND_API_KEY` est défini ; destinataire `MAIL_TO`, par défaut astrid.roland@fgg.ch), `archive` (garde une copie de chaque compilation envoyée, par semaine), `items` (liste, ajoute, modifie les entrées), `upload` (un fichier, 4,4 Mo max.), `media` (affiche un fichier), `admin` (vérifie le mot de passe, supprime une entrée)
- Mot de passe de la compilation : variable d'environnement `ADMIN_PASSWORD` dans Netlify (Project configuration → Environment variables). Après un changement, redéployer.

Chaque modification poussée sur `main` est mise en ligne automatiquement par Netlify.

## Réglages optionnels (variables d'environnement Netlify)
| Variable | Effet |
|---|---|
| `ADMIN_PASSWORD` | mot de passe de la page de compilation (obligatoire) |
| `TEAM_CODE` | code d'équipe demandé une fois par appareil sur le formulaire et les archives (sans lui : accès par simple lien) |
| `RESEND_API_KEY` | envoi direct du mail compilé, photos intégrées (`MAIL_TO`, `MAIL_FROM` en option) |
| `ANTHROPIC_API_KEY` | bouton « Harmoniser le style » (`ANTHROPIC_MODEL` en option) |
| `TEAMS_WEBHOOK_URL` | rappel automatique chaque jeudi 11:45 UTC dans un canal Teams (workflow « webhook ») |

Après chaque changement de variable : Netlify → Deploys → Trigger deploy. État des réglages (sans valeurs) : `/api/health`.
