console.log("📜 CARGANDO SOCIAL.JS...");

function initSocialLogic() {
    console.log("⚙️ Inicializando lógica social...");

    const sendPost = document.getElementById('sendPost');
    const usernameInput = document.getElementById('usernameInput');
    const postInput = document.getElementById('postContent');
    const socialModal = document.getElementById('socialModal');
    const closeSocialModal = document.getElementById('closeSocialModal');
    const postButton = document.getElementById('post-button');

    if (closeSocialModal) {
        closeSocialModal.onclick = () => {
            console.log(" Click en cerrar modal");
            if (socialModal) socialModal.style.display = 'none';
        };
    } else {
        console.warn(" No se encontró el botón de cerrar (id='closeSocialModal')");
    }

    if (postButton && socialModal) {
        postButton.onclick = () => {
            console.log("🔘 Click en botón menú principal");
            socialModal.style.display = 'flex';
            if(postInput) postInput.value = ""; 
        };
    }

    // enviar a twitter
    if (sendPost) {
        sendPost.onclick = async () => {
            console.log("🚀 Botón Publicar PRESIONADO");

            const username = usernameInput.value.trim();
            const content = postInput.value.trim();

            console.log("📝 Datos a enviar:", { username, content });

            if (!username || !content) {
                alert('Por favor, llena el mensaje antes de publicar.');
                return;
            }

            sendPost.disabled = true;
            sendPost.innerText = "Enviando...";

            try {
                console.log("📡 Conectando con el servidor...");
                // Enviar al servidor
                const res = await fetch('http://localhost:3000/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, content })
                });

                const data = await res.json();
                console.log(" Respuesta del servidor:", data);

                if (data.success) {
                    if (data.twitterError) {
                        alert("Guardado en el juego, pero hubo un error con Twitter:\n" + data.twitterError);
                    } else {
                        alert(" Publicado con éxito!");
                    }
                    
                    // Cerrar la ventana automáticamente
                    if (socialModal) socialModal.style.display = 'none';
                    
                    // Recargar posts si la función existe
                    if (typeof loadPosts === 'function') loadPosts();
                    
                } else {
                    alert("Error del servidor: " + (data.error || "Desconocido"));
                }

            } catch (err) {
                console.error(" Error de conexión:", err);
                alert("No se pudo conectar con el servidor. Revisa la consola (F12).");
            } finally {
                // Reactivar botón
                sendPost.disabled = false;
                sendPost.innerText = "Publicar";
            }
        };
    } else {
        console.error(" ERROR CRÍTICO: No se encontró el botón 'sendPost' en el HTML.");
    }
}

// Ejecutar cuando el DOM esté listo o inmediatamente si ya cargó
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSocialLogic);
} else {
    initSocialLogic();
}

// Función auxiliar para cargar posts
window.loadPosts = async function() {
    const postsContainer = document.getElementById('postsContainer');
    if (!postsContainer) return;
    
    try {
        const res = await fetch('http://localhost:3000/posts');
        const posts = await res.json();
        postsContainer.innerHTML = '';
        posts.forEach(p => {
            const div = document.createElement('div');
            div.classList.add('post');
            div.innerHTML = `
                <strong>${p.username}</strong>: ${p.content}<br>
                <small>${new Date(p.created_at).toLocaleString()}</small>
            `;
            postsContainer.appendChild(div);
        });
    } catch (err) {
        console.error("Error cargando posts:", err);
    }
};