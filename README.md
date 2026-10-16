# Weekly Highlights – Marketing Feldschlösschen

Outil en deux parties pour préparer le mail hebdomadaire « Weekly Highlights » envoyé à tout le département marketing.

| Page | Pour qui | Adresse |
|---|---|---|
| Formulaire | l'équipe | https://feldschloesschen-weekly-highlights.netlify.app/ |
| Compilation | Astrid (mot de passe) | https://feldschloesschen-weekly-highlights.netlify.app/zusammenstellen |

## Fonctionnement
1. Le formulaire est un tableau commun de la semaine (DE/FR) : chacun voit ce qui est déjà saisi, complète une entrée existante (« Bearbeiten / ergänzen ») ou en ajoute une nouvelle. Chaque entrée est enregistrée séparément ; un avertissement signale un sujet semblable déjà présent, et une modification simultanée par deux personnes est détectée.
2. Les entrées et les fichiers sont conservés dans Netlify Blobs (`wh-items`, classés par semaine ISO ; `wh-media` pour les fichiers).
3. Sur la page de compilation, Astrid voit le mail de la semaine déjà assemblé dans son format habituel (Hallo zusammen … Liebe Grüsse), photos dans le texte. Elle peut le corriger, puis « Copier pour Outlook » et le coller dans un nouveau mail.

## Structure
- `public/index.html` – formulaire de l'équipe
- `public/zusammenstellen.html` – page de compilation
- `netlify/functions/` – `send` (envoie le mail compilé via Resend si `RESEND_API_KEY` est défini ; destinataire `MAIL_TO`, par défaut astrid.roland@fgg.ch), `items` (liste, ajoute, modifie les entrées), `upload` (un fichier, 4,4 Mo max.), `media` (affiche un fichier), `admin` (vérifie le mot de passe, supprime une entrée)
- Mot de passe de la compilation : variable d'environnement `ADMIN_PASSWORD` dans Netlify (Project configuration → Environment variables). Après un changement, redéployer.

Chaque modification poussée sur `main` est mise en ligne automatiquement par Netlify.
