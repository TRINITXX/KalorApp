# REVIEW.md

Lu par toute review de ce repo. Une remarque de review qui revient s'ajoute ici.

KalorApp est une app iOS personnelle (un seul utilisateur), sans backend : tout vit dans une base SQLite locale partagée avec l'extension widget/Siri par le groupe d'apps `group.com.kalorapp.app`.

## Ce qu'est un bug ici

- **Calories fausses** : une entrée dont les valeurs ne valent pas `valeur pour 100 g × quantité / 100` du produit au moment de l'ajout, ou un total du jour qui ne somme pas les entrées affichées. Les entrées sont des instantanés : modifier un produit ne réécrit pas les entrées passées, et modifier une entrée repart de ses propres valeurs (`entryPer100g`), pas de celles du produit.
- **Dates** : une date de journal calculée en UTC. La colonne `entries.date` est la date locale `YYYY-MM-DD` (`formatDateISO`), jamais `toISOString()` ni `date('now')` SQLite. `created_at` est en UTC (`datetime('now')`) : le lire comme tel. Pièges déjà vus : une date « aujourd'hui » figée au montage de l'écran, fausse après minuit (passer par `useToday`) ; la date du jour passée en paramètre de navigation, qui la fige aussi.
- **Installation neuve** : une migration qui ajoute une colonne déjà présente dans `src/db/schema.ts` plante au premier lancement (déjà vu, test `src/db/migrations.test.ts`). Toute nouvelle colonne va dans le schéma ET dans une étape `ALTER` réservée aux anciennes bases.
- **Chemin de la base** : jamais un chemin absolu comme nom dans `openDatabaseAsync`. expo-sqlite le colle sous son propre dossier, et l'app lit alors un autre fichier que Siri et le widget (déjà vu, test `src/db/client.test.ts`). Le dossier passe en 3e argument.
- **Base partagée avec Swift** : une colonne ajoutée, renommée ou rendue obligatoire sans son équivalent dans `targets/widget/SQLiteHelper.swift`, qui écrit aussi des entrées. Les migrations (`src/db/migrations.ts`) sont additives et montent `CURRENT_VERSION`.
- **Copies Swift de la dictée** : `targets/widget/VoiceLogger.swift` recopie le format de la liste de produits (`buildCatalog`, `src/lib/voice/prompt.ts`), le message envoyé (`buildUserMessage`) et la lecture de la réponse (`src/lib/voice/interpret.ts`) ; `MealRule.swift` recopie `src/lib/meal-rule.ts` ; `ClaudeKey.swift` lit la clé rangée par `src/lib/voice/api-key.ts` (service `kalorapp`, groupe de trousseau `com.kalorapp.shared`). Un changement d'un côté sans l'autre est un bug. Les consignes, le schéma et le modèle passent par l'app (`syncSiriVoiceConfig`) : ne pas les écrire en dur en Swift. Côté Siri, toute écriture se vérifie et un échec annule tout (`ROLLBACK`) : Siri n'annonce jamais un aliment absent du journal.
- **Micro** : une écoute qui reste ouverte quand l'écran se ferme (le mode continu n'a pas de minuteur de silence : couper dans le nettoyage de `useDictation`), un écran poussé par-dessus pendant l'écoute, ou une réponse de Claude appliquée après la fermeture de l'écran. Les mots d'une dictée se cumulent par segments (`src/lib/voice/transcript.ts`) : ne jamais remplacer le texte par le dernier résultat. Un mot d'arrêt (« stop », « c'est tout ») testé sur un résultat partiel sans délai coupe une phrase qui continue ; un mot qui peut finir un aliment (« fini », « terminé ») n'est pas un mot d'arrêt.
- **Mise à jour sans réinstallation** : du JS envoyé par `eas update` (branche `preview`, runtime = version de l'app dans `app.config.ts`, 1.1.0 depuis la dictée) qui appelle un module natif absent du build installé. Un module natif ou un changement d'`app.config.ts` demande un nouveau build : le dire, et garder un repli quand le module manque (modèle : `src/modules/widget-bridge/index.ts`).
- **Saisie de nombres sur iOS** : un champ décimal qui refuse la virgule ou la perd. Pièges déjà vus : `value` contrôlé qui efface la virgule (utiliser `defaultValue`), `parseFloat` sans `replace(",", ".")`, une quantité validée sans quitter le champ qui garde l'ancienne valeur ; un champ qui ne recopie la valeur qu'hors focus alors que des boutons la changent clavier ouvert.
- **Mode clair** : une couleur codée en dur (`#999`, `#fff` sur fond clair) au lieu de `useThemeColors()`. Déjà vu : valeurs nutritionnelles invisibles en clair.
- **OpenFoodFacts** : un appel sans l'en-tête `User-Agent` (refusé par l'API), ou qui ignore les valeurs `_prepared_100g`. Un produit enregistré avec des macros à 0 parce que le réseau a coupé.
- **Gestes** : un glisser (`ReanimatedSwipeable`, `GestureDetector`) hors de `GestureHandlerRootView`, posé dans `src/app/_layout.tsx` (il manquait jusqu'en octobre 2026).
- **Journal incomplet** : un repas désactivé dans les réglages qui cache des aliments déjà notés (le total ne colle plus avec la liste). L'écran du jour affiche tout repas qui contient des aliments.
- **Tri** : un tri alphabétique fait par SQLite (`ORDER BY name`) range « Pâtes » après « Pommes » : trier avec `localeCompare(…, "fr")`.
- **Navigation** : `router.replace` qui fait perdre le bouton retour ; un double appui qui pousse 2 fois le même écran (passer par `useSingleNavigation`).
- **Rechargement** : un écran qui lit la base avec `useFocusEffect` seul. Siri écrit dans la base app fermée : recharger aussi au retour au premier plan (`useRefreshOnFocus`).
- **Cycle d'imports** : `src/lib/widget-sync.ts` importé en statique depuis `src/db/queries/` (passer par l'import dynamique existant).
- **Textes** : un accent manquant ou un reste d'anglais dans un texte affiché.

## Zones sensibles

Un changement qui touche une de ces zones se propose en `/review-maison` :

- Base et migrations : `src/db/`
- Code Swift, non testable sans Mac : `targets/widget/`, `src/modules/widget-bridge/ios/`
- Configuration native : `app.config.ts`, `eas.json`

## Décisions à ne pas signaler

- Pas de serveur : la clé API Anthropic est stockée sur le téléphone (trousseau iOS). App à un seul utilisateur.
- Le tri des dictées existe en 2 exemplaires, côté app (TypeScript) et côté Siri (Swift) : choix produit pour que Siri marche app fermée. Les consignes envoyées à Claude restent uniques.

## Chemins à ignorer

`package-lock.json`, `android/`, `dist/`, `docs/`, `assets/`, `.screenshots/`.
