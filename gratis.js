// Catálogo de juegos homebrew con licencia libre incluidos en la app.
let CATALOGO = [];
let filtroGratis = "todos";

function mostrarPestana(cual) {
  const gratis = cual === "gratis";
  $("#panel-gratis").hidden = !gratis;
  $("#panel-mios").hidden = gratis;
  $("#tab-gratis").classList.toggle("activa", gratis);
  $("#tab-mios").classList.toggle("activa", !gratis);
  try { localStorage.setItem("pestana", cual); } catch (e) {}
  window.scrollTo(0, 0);
}

async function pintarGratis() {
  const mios = await Biblioteca.todos();
  const instalados = new Map(mios.filter(j => j.slug).map(j => [j.slug, j.id]));
  const ul = $("#lista-gratis");
  ul.innerHTML = "";
  for (const g of CATALOGO) {
    if (filtroGratis !== "todos" && g.sistema !== filtroGratis) continue;
    const s = SISTEMAS[g.sistema];
    const li = document.createElement("li");
    li.className = "ficha";
    const idLocal = instalados.get(g.slug);
    li.innerHTML = `
      <button class="ficha-boton">
        <span class="ficha-img">${g.portada ? `<img loading="lazy" src="juegos/${g.slug}/portada.png" alt="">` : ""}
          <span class="ficha-chapa" style="--c:${s.color}">${g.plataforma}</span>
          ${idLocal ? '<span class="ficha-ok">✓</span>' : ""}
        </span>
        <span class="ficha-titulo"></span>
        <span class="ficha-autor"></span>
      </button>
      <a class="ficha-lic" target="_blank" rel="noopener"></a>`;
    li.querySelector(".ficha-titulo").textContent = g.titulo;
    li.querySelector(".ficha-autor").textContent = g.autor ? "de " + g.autor : "";
    const lic = li.querySelector(".ficha-lic");
    lic.textContent = g.licencia;
    if (g.web) lic.href = g.web; else lic.removeAttribute("href");
    li.querySelector(".ficha-boton").onclick = () => jugarGratis(g, li);
    ul.appendChild(li);
  }
}

async function jugarGratis(g, li) {
  const mios = await Biblioteca.todos();
  const ya = mios.find(j => j.slug === g.slug);
  if (ya) { location.href = "play.html?id=" + encodeURIComponent(ya.id); return; }
  li.classList.add("cargando");
  toast("Descargando " + g.titulo + "…", 60000);
  try {
    const r = await fetch(`juegos/${g.slug}/${g.archivo}`);
    if (!r.ok) throw new Error(r.status);
    const datos = await r.arrayBuffer();
    const id = crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random();
    await Biblioteca.guardar({
      id, slug: g.slug, nombre: g.titulo, archivo: g.archivo, sistema: g.sistema,
      tamano: datos.byteLength, anadido: Date.now(),
      portada: g.portada ? `juegos/${g.slug}/portada.png` : null, datos
    });
    location.href = "play.html?id=" + encodeURIComponent(id);
  } catch (e) {
    li.classList.remove("cargando");
    toast("No se pudo descargar. Revisa tu conexión.");
  }
}

$("#tab-mios").onclick = () => { mostrarPestana("mios"); pintar(); };
$("#tab-gratis").onclick = () => { mostrarPestana("gratis"); pintarGratis(); };
document.querySelectorAll("#filtros .filtro").forEach(b => b.onclick = () => {
  filtroGratis = b.dataset.f;
  document.querySelectorAll("#filtros .filtro").forEach(x => x.classList.toggle("activo", x === b));
  pintarGratis();
});

(async function () {
  try {
    CATALOGO = await (await fetch("juegos/catalogo.json")).json();
    $("#num-gratis").textContent = CATALOGO.length;
  } catch (e) { CATALOGO = []; }
  let pestana = null;
  try { pestana = localStorage.getItem("pestana"); } catch (e) {}
  const mios = await Biblioteca.todos();
  // Si la biblioteca está vacía, abrimos directamente los juegos gratis
  mostrarPestana(pestana || (mios.length ? "mios" : "gratis"));
  pintarGratis();
})();
