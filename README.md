# WEB2APK KAWAKI227 V4 — Railway

Générateur cloud WEB → APK pour KAWAKI227.

## Correction V4
La génération Android n’utilise plus AndroidX/AppCompat, ce qui évite le conflit Kotlin `kotlin-stdlib` / `kotlin-stdlib-jdk7` observé sur Railway.

## Déploiement
Le dépôt est prévu pour Railway avec Docker. Railway détecte automatiquement le `Dockerfile` à la racine et redéploie lorsqu’un nouveau commit est poussé sur la branche connectée.

## Fonctionnalités
- URL du site
- Nom de l’application
- Icône PNG/JPG/WEBP
- APK Android WebView
- petit texte `by kawaki` dans l’application
- téléchargement de l’APK
- interface Matrix/Hacker

⚠️ Les APK générés sont des APK debug, non signés pour une publication Play Store.
