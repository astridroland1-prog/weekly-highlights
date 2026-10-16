# Weekly Highlights – Marketing Feldschlösschen

Outil en deux parties pour préparer le mail hebdomadaire « Weekly Highlights » envoyé à tout le département marketing.

| Page | Pour qui | Adresse |
|---|---|---|
| Formulaire | l'équipe | https://feldschloesschen-weekly-highlights.netlify.app/ |
| Compilation | Astrid (mot de passe) | https://feldschloesschen-weekly-highlights.netlify.app/zusammenstellen |

## Fonctionnement
1. Chaque collègue remplit le formulaire (DE/FR) : temps forts avec photos et vidéos, points de la semaine prochaine, nouvelles de l'équipe, puis clique sur « Senden / Envoyer ». Aucun nom ni e-mail n'est demandé.
2. Les contributions et les fichiers sont conservés dans Netlify Blobs, classés par semaine (ISO).
3. Sur la page de compilation, Astrid voit le mail de la semaine déjà assemblé dans son format habituel (Hallo zusammen … Liebe Grüsse), photos dans le texte. Elle peut le corriger, puis « Copier pour Outlook » et le coller dans un nouveau mail.

## Structure
- `public/index.html` – formulaire de l'équipe
- `public/zusammenstellen.html` – page de compilation
- `netlify/functions/` – `upload` (un fichier, 4,4 Mo max.), `media` (affiche un fichier), `submit` (enregistre une contribution), `admin` (liste ou supprime, protégé)
- Mot de passe de la compilation : variable d'environnement `ADMIN_PASSWORD` dans Netlify (Project configuration → Environment variables). Après un changement, redéployer.

Chaque modification poussée sur `main` est mise en ligne automatiquement par Netlify.
