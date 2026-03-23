/**
 * Lógica para la página de Bienvenida (Alexandria)
 */
function abrirHerramienta() {
    // Añadimos una clase de salida para una transición suave
    const container = document.querySelector('.main-container');
    if (container) {
        container.style.opacity = '0';
        container.style.transform = 'translateY(-20px)';
        container.style.transition = 'all 0.8s ease';
    }

    // Redirección tras la animación
    setTimeout(() => {
        window.location.href = "index.html";
    }, 600);
}

// Log para confirmar que el script cargó
console.log("Alexandria Welcome Script: Cargado ✧");