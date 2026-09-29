// Wires up any button.password-toggle[data-target=<inputId>] to show/hide that password field.
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".password-toggle");
  if (!btn) return;

  const input = document.getElementById(btn.dataset.target);
  if (!input) return;

  const showing = input.type === "text";
  input.type = showing ? "password" : "text";
  btn.textContent = showing ? "👁" : "🙈";
  btn.setAttribute("aria-label", showing ? "Mostrar contraseña" : "Ocultar contraseña");
});
