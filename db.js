// Biblioteca de juegos guardada en el propio iPhone (IndexedDB).
const DB_NAME = "mi-consola";
const STORE = "juegos";

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await abrirDB();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    let result;
    Promise.resolve(fn(store)).then(r => { result = r; });
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

function reqP(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const Biblioteca = {
  async todos() {
    const db = await abrirDB();
    const lista = await reqP(db.transaction(STORE).objectStore(STORE).getAll());
    // No devolvemos el binario en el listado
    return lista.map(({ datos, ...meta }) => meta).sort((a, b) => (b.ultimaVez || b.anadido) - (a.ultimaVez || a.anadido));
  },
  async obtener(id) {
    const db = await abrirDB();
    return reqP(db.transaction(STORE).objectStore(STORE).get(id));
  },
  async guardar(juego) {
    // Guardamos el ROM como ArrayBuffer (más fiable que Blob en Safari)
    return tx("readwrite", s => s.put(juego));
  },
  async borrar(id) {
    return tx("readwrite", s => s.delete(id));
  },
  async marcarJugado(id) {
    const j = await this.obtener(id);
    if (!j) return;
    j.ultimaVez = Date.now();
    await this.guardar(j);
  }
};

const SISTEMAS = {
  nes:  { nombre: "NES",           corto: "NES",  color: "#c0392b" },
  snes: { nombre: "Super Nintendo", corto: "SNES", color: "#6c5ce7" },
  gb:   { nombre: "Game Boy / Color", corto: "GB", color: "#27ae60" },
  gba:  { nombre: "Game Boy Advance", corto: "GBA", color: "#2d6cdf" },
  n64:  { nombre: "Nintendo 64",   corto: "N64",  color: "#e67e22" },
  nds:  { nombre: "Nintendo DS",   corto: "DS",   color: "#636e72" }
};

const EXTENSIONES = {
  nes: "nes", fds: "nes", unf: "nes", unif: "nes",
  sfc: "snes", smc: "snes", fig: "snes", swc: "snes",
  gb: "gb", gbc: "gb", sgb: "gb",
  gba: "gba",
  n64: "n64", z64: "n64", v64: "n64",
  nds: "nds"
};

function detectarSistema(nombreArchivo) {
  const ext = (nombreArchivo.split(".").pop() || "").toLowerCase();
  return EXTENSIONES[ext] || null;
}

function nombreBonito(nombreArchivo) {
  return nombreArchivo
    .replace(/\.[^.]+$/, "")
    .replace(/[_]+/g, " ")
    .replace(/\s*[\[(][^\])]*[\])]/g, "")
    .trim() || nombreArchivo;
}
