# Come pubblicare l'app su GitHub e Vercel

Il codice è pronto in questa cartella. Devi solo caricarlo su GitHub e collegarlo
a Vercel. Scegli **uno** dei due metodi.

> Nota: non serve installare Node.js. La build viene fatta da Vercel nel cloud.

---

## Metodo A — Doppio clic (più semplice, richiede Git)

1. Se non hai Git, installalo da <https://git-scm.com/download/win> (lascia tutte le opzioni di default).
2. Fai **doppio clic** su `pubblica-su-github.bat` in questa cartella.
3. Se è la prima volta, ti verrà chiesto di accedere a GitHub: conferma nella finestra del browser.
4. Quando lo script scrive `Fatto!`, il codice è su GitHub.

## Metodo B — GitHub Desktop (senza riga di comando)

1. Installa **GitHub Desktop** da <https://desktop.github.com> e accedi col tuo account.
2. `File` → `Add local repository…` → seleziona questa cartella
   (`Scotland-yard-online`). Se chiede di creare un repository, accetta.
3. In basso scrivi un messaggio (es. "primo commit") e premi **Commit to main**.
4. Premi **Publish repository** in alto. Importante: scegli il repository esistente
   `LeonardoSerafin/Scotland-yard-online` (oppure lascia che ne crei uno con quel nome).

---

## Collegare Vercel (uguale per entrambi i metodi)

1. Vai su <https://vercel.com> e accedi con GitHub.
2. **Add New… → Project**.
3. Scegli la repo **Scotland-yard-online** e premi **Import**.
4. Vercel rileva da solo che è un progetto **Vite**: non toccare nulla, premi **Deploy**.
5. Dopo ~1 minuto avrai il link pubblico dell'app. Ad ogni futuro `push` su GitHub,
   Vercel ripubblica automaticamente.

---

## Aggiornare l'app in futuro

- Metodo A: ri-esegui `pubblica-su-github.bat`.
- Metodo B: in GitHub Desktop fai **Commit** e poi **Push origin**.

Vercel aggiornerà il sito da solo.
