const $ = s => document.querySelector(s);

function toast(texto, ms = 2500) {
  const t = $("#toast");
  t.textContent = texto;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), ms);
}

function preguntarSistema(nombre) {
  return new Promise(resolve => {
    const dlg = $("#dlg-sistema");
    $("#dlg-nombre").textContent = nombre;
    const cont = $("#dlg-opciones");
    cont.innerHTML = "";
    for (const [clave, s] of Object.entries(SISTEMAS)) {
      const b = document.createElement("button");
      b.value = clave;
      b.textContent = s.nombre;
      b.style.setProperty("--c", s.color);
      cont.appendChild(b);
    }
    dlg.onclose = () => resolve(SISTEMAS[dlg.returnValue] ? dlg.returnValue : null);
    dlg.showModal();
  });
}

async function anadirArchivos(archivos) {
  let n = 0;
  for (const f of archivos) {
    let sistema = detectarSistema(f.name);
    if (!sistema) sistema = await preguntarSistema(f.name);
    if (!sistema) continue;
    const datos = await f.arrayBuffer();
    await Biblioteca.guardar({
      id: (crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random()),
      nombre: nombreBonito(f.name),
      archivo: f.name,
      sistema,
      tamano: f.size,
      anadido: Date.now(),
      datos
    });
    n++;
  }
  if (n) toast(n === 1 ? "Juego añadido" : `${n} juegos añadidos`);
  pintar();
}

function formatoTamano(b) {
  return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
}

async function pintar() {
  const juegos = await Biblioteca.todos();
  const lista = $("#lista");
  lista.innerHTML = "";
  $("#vacia").hidden = juegos.length > 0;
  for (const j of juegos) {
    const s = SISTEMAS[j.sistema];
    const li = document.createElement("li");
    li.className = "juego";
    li.innerHTML = `
      <a class="jugar" href="play.html?id=${encodeURIComponent(j.id)}">
        ${j.portada ? `<img class="chapa portada" src="${j.portada}" alt="">` : `<span class="chapa" style="--c:${s.color}">${s.corto}</span>`}
        <span class="info">
          <span class="titulo"></span>
          <span class="meta">${s.nombre} · ${formatoTamano(j.tamano)}</span>
        </span>
        <span class="play">▶</span>
      </a>
      <button class="borrar" aria-label="Borrar">🗑</button>`;
    li.querySelector(".titulo").textContent = j.nombre;
    li.querySelector(".borrar").onclick = async () => {
      if (!confirm(`¿Borrar «${j.nombre}» de la biblioteca?`)) return;
      await Biblioteca.borrar(j.id);
      pintar();
      if (window.pintarGratis) pintarGratis();
    };
    lista.appendChild(li);
  }
}

$("#btn-anadir").onclick = () => $("#selector").click();
$("#selector").onchange = e => {
  const files = [...e.target.files];
  e.target.value = "";
  if (files.length) anadirArchivos(files);
};

// Aviso para instalar en la pantalla de inicio (solo Safari iOS fuera de la app instalada)
const esIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalada = window.navigator.standalone || matchMedia("(display-mode: standalone)").matches;
let avisoCerrado = false;
try { avisoCerrado = localStorage.getItem("aviso-cerrado") === "1"; } catch (e) {}
if (esIOS && !instalada && !avisoCerrado) $("#aviso-instalar").hidden = false;
$("#cerrar-aviso").onclick = () => {
  $("#aviso-instalar").hidden = true;
  try { localStorage.setItem("aviso-cerrado", "1"); } catch (e) {}
};

// Pedimos almacenamiento persistente para que Safari no borre juegos ni partidas
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

pintar();
