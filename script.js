/* CONFIG LOGIN */
const ADMIN_USER = "admin";
const ADMIN_PASS = "Hot20Li26.Ctes";
const ADMIN_2FA = "762600";
let intentosFallidos = 0;
const MAX_INTENTOS = 5;

/* INDEXEDDB */
let productos = [];
let db;

function initDB() {
    const request = indexedDB.open("ST_DB", 1);

    request.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains("productos")) {
            const store = db.createObjectStore("productos", { keyPath: "id", autoIncrement: true });
            store.createIndex("orden", "orden", { unique: false });
        }
    };

    request.onsuccess = (e) => {
        db = e.target.result;
        cargarProductosDB();
    };

    request.onerror = () => {
        console.log("Error al abrir IndexedDB");
        productos = productosDefault();
        renderProductos();
    };
}

function productosDefault() {
    return [
        { id: 1, img: "freidora-moretti.jpg", nombre: "Freidora Moretti 12L", precio: "$350.000", orden: 1 },
        { id: 2, img: "notebook-lenovo.jpg", nombre: "Notebook Lenovo i5", precio: "$780.000", orden: 2 },
        { id: 3, img: "impresora-epson.jpg", nombre: "Impresora Epson L3250", precio: "$120.000", orden: 3 },
        { id: 4, img: "silla-gamer.jpg", nombre: "Silla Gamer RGB", precio: "$150.000", orden: 4 }
    ];
}

function cargarProductosDB() {
    const tx = db.transaction("productos", "readwrite");
    const store = tx.objectStore("productos");
    const req = store.getAll();

    req.onsuccess = () => {
        if (req.result.length === 0) {
            const base = productosDefault();
            base.forEach(p => store.add(p));
            tx.oncomplete = () => recargarDesdeDB();
        } else {
            productos = req.result.sort((a, b) => (a.orden || 0) - (b.orden || 0));
            renderProductos();
        }
    };
}

function recargarDesdeDB() {
    const tx = db.transaction("productos", "readonly");
    const store = tx.objectStore("productos");
    const req = store.getAll();
    req.onsuccess = () => {
        productos = req.result.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        renderProductos();
    };
}

/* RENDER GALERÍA */
const galeria = document.getElementById("galeriaGrid");

function renderProductos() {
    if (!galeria) return;
    galeria.innerHTML = "";
    productos.forEach(p => {
        galeria.innerHTML += `
            <div class="galeria-item reveal" draggable="true" data-id="${p.id}">
                <img src="${p.img}" alt="${p.nombre}">
                <h4>${p.nombre}</h4>
                <p>${p.precio}</p>
                ${esAdmin() ? `
                <div class="acciones">
                    <button onclick="editarProducto(${p.id})">✏️ Editar</button>
                    <button onclick="eliminarProducto(${p.id})">🗑️ Eliminar</button>
                </div>` : `
                <button onclick="window.open('https://wa.me/543794403781')">Consultar</button>
                `}
            </div>
        `;
    });
    if (esAdmin()) activarDragAndDrop();
    aplicarReveal();
}

function esAdmin() {
    return localStorage.getItem("adminST") === "true" && window.location.pathname.includes("admin");
}

/* LOGIN */
function login() {
    const user = document.getElementById("userLogin").value.trim();
    const pass = document.getElementById("passLogin").value.trim();
    const code = document.getElementById("codeLogin").value.trim();
    const error = document.getElementById("loginError");

    if (intentosFallidos >= MAX_INTENTOS) {
        error.innerText = "Demasiados intentos fallidos. Intente más tarde.";
        registrarActividad("Bloqueo por intentos fallidos");
        return;
    }

    if (user !== ADMIN_USER || pass !== ADMIN_PASS) {
        intentosFallidos++;
        error.innerText = `Usuario o contraseña incorrectos (${intentosFallidos}/${MAX_INTENTOS})`;
        registrarActividad("Intento fallido de acceso");
        return;
    }

    if (code !== ADMIN_2FA) {
        intentosFallidos++;
        error.innerText = `Código 2FA incorrecto (${intentosFallidos}/${MAX_INTENTOS})`;
        registrarActividad("Código 2FA incorrecto");
        return;
    }

    localStorage.setItem("adminST", "true");
    registrarActividad("Acceso exitoso");
    window.location.href = "admin.html";
}

function logout() {
    localStorage.removeItem("adminST");
    registrarActividad("Cierre de sesión");
    window.location.href = "index.html";
}

/* LOGS */
function registrarActividad(evento) {
    const logs = JSON.parse(localStorage.getItem("logsST") || "[]");
    logs.push({ evento, fecha: new Date().toLocaleString() });
    localStorage.setItem("logsST", JSON.stringify(logs));
}

function mostrarLogs() {
    const box = document.getElementById("logBox");
    if (!box) return;
    const logs = JSON.parse(localStorage.getItem("logsST") || "[]");
    box.innerHTML = logs.map(l => `<p>• ${l.fecha}: ${l.evento}</p>`).join("");
}

function limpiarLogs() {
    localStorage.removeItem("logsST");
    mostrarLogs();
}

/* CRUD PANEL */
const form = document.getElementById("productoForm");

if (form) {
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const img = document.getElementById("imgUrl").value.trim();
        const nombre = document.getElementById("nombreProd").value.trim();
        const precio = document.getElementById("precioProd").value.trim();
        if (!img || !nombre || !precio) return;

        const nuevoOrden = (productos[productos.length - 1]?.orden || 0) + 1;
        const nuevo = { img, nombre, precio, orden: nuevoOrden };

        const tx = db.transaction("productos", "readwrite");
        const store = tx.objectStore("productos");
        const req = store.add(nuevo);

        req.onsuccess = () => {
            registrarActividad("Nuevo producto agregado: " + nombre);
            recargarDesdeDB();
            form.reset();
        };
    });
}

function eliminarProducto(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    const tx = db.transaction("productos", "readwrite");
    const store = tx.objectStore("productos");
    store.delete(id);
    tx.oncomplete = () => {
        registrarActividad("Producto eliminado ID: " + id);
        recargarDesdeDB();
    };
}

function editarProducto(id) {
    const prod = productos.find(p => p.id === id);
    if (!prod) return;

    const nuevoNombre = prompt("Nuevo nombre:", prod.nombre);
    if (!nuevoNombre) return;
    const nuevoPrecio = prompt("Nuevo precio:", prod.precio);
    if (!nuevoPrecio) return;
    const nuevaImg = prompt("Nueva URL de imagen:", prod.img);
    if (!nuevaImg) return;

    prod.nombre = nuevoNombre;
    prod.precio = nuevoPrecio;
    prod.img = nuevaImg;

    const tx = db.transaction("productos", "readwrite");
    const store = tx.objectStore("productos");
    store.put(prod);
    tx.oncomplete = () => {
        registrarActividad("Producto editado ID: " + id);
        recargarDesdeDB();
    };
}

/* DRAG & DROP ORDEN */
let dragSrcEl = null;

function activarDragAndDrop() {
    const items = document.querySelectorAll(".galeria-item");
    items.forEach(item => {
        item.addEventListener("dragstart", dragStart);
        item.addEventListener("dragover", dragOver);
        item.addEventListener("drop", dropItem);
    });
}

function dragStart(e) {
    dragSrcEl = this;
    e.dataTransfer.effectAllowed = "move";
}

function dragOver(e) {
    e.preventDefault();
}

function dropItem(e) {
    e.preventDefault();
    if (dragSrcEl === this) return;

    const id1 = Number(dragSrcEl.dataset.id);
    const id2 = Number(this.dataset.id);
    const idx1 = productos.findIndex(p => p.id === id1);
    const idx2 = productos.findIndex(p => p.id === id2);
    if (idx1 === -1 || idx2 === -1) return;

    const tempOrden = productos[idx1].orden;
    productos[idx1].orden = productos[idx2].orden;
    productos[idx2].orden = tempOrden;

    const tx = db.transaction("productos", "readwrite");
    const store = tx.objectStore("productos");
    productos.forEach(p => store.put(p));
    tx.oncomplete = () => {
        registrarActividad("Orden de productos modificado");
        productos.sort((a, b) => (a.orden || 0) - (b.orden || 0));
        renderProductos();
    };
}

/* HERO ANIMADO */
const canvas = document.getElementById("heroCanvas");
let ctx = null;
if (canvas) ctx = canvas.getContext("2d");

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight * 0.85;
}
if (canvas) {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
}

let particles = [];

function initParticles() {
    if (!canvas) return;
    particles = [];
    for (let i = 0; i < 60; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 3 + 1,
            dx: (Math.random() - 0.5) * 0.6,
            dy: (Math.random() - 0.5) * 0.6
        });
    }
}

function animateParticles() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
    });
    requestAnimationFrame(animateParticles);
}
if (canvas) {
    initParticles();
    animateParticles();
}

/* REVEAL */
function aplicarReveal() {
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });
    reveals.forEach(el => observer.observe(el));
}

/* INIT */
aplicarReveal();
initDB();
if (window.location.pathname.includes("admin")) {
    mostrarLogs();
}
