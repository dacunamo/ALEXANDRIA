// Renders the logged-in/out state into a #auth-status element, if present on the page.
document.addEventListener("DOMContentLoaded", async () => {
  const el = document.getElementById("auth-status");
  if (!el) return;

  try {
    const res = await fetch("/api/auth/me");
    el.textContent = "";

    if (res.ok) {
      const user = await res.json();

      const greeting = document.createElement("span");
      greeting.textContent = `Hola, ${user.displayName || user.email}`;

      const spaceLink = document.createElement("a");
      spaceLink.href = "/mi-espacio";
      spaceLink.textContent = "Mi espacio";

      const logoutLink = document.createElement("a");
      logoutLink.href = "#";
      logoutLink.textContent = "Salir";
      logoutLink.addEventListener("click", async (e) => {
        e.preventDefault();
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.href = "/";
      });

      el.appendChild(greeting);
      el.appendChild(spaceLink);
      el.appendChild(logoutLink);
    } else {
      // Iniciar sesión / Registrarse hidden for now.
      // const loginLink = document.createElement("a");
      // loginLink.href = "/login";
      // loginLink.textContent = "Iniciar sesión";

      // const registerLink = document.createElement("a");
      // registerLink.href = "/register";
      // registerLink.textContent = "Registrarse";

      // el.appendChild(loginLink);
      // el.appendChild(registerLink);
    }
  } catch (err) {
    console.error("Error comprobando la sesión:", err);
  }
});
