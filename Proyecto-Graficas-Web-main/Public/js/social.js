const postButton = document.getElementById('post-button');
const sendPost = document.getElementById('sendPost');
const usernameInput = document.getElementById('usernameInput');
const postInput = document.getElementById('postContent');
const postsContainer = document.getElementById('postsContainer');
const socialModal = document.getElementById('socialModal');
const closeSocialModal = document.getElementById('closeSocialModal');

// Mostrar modal
postButton.addEventListener('click', () => {
  socialModal.style.display = 'flex';
  loadPosts();
});

// Cerrar modal
closeSocialModal.addEventListener('click', () => {
  socialModal.style.display = 'none';
});

// Enviar publicación
sendPost.addEventListener('click', async () => {
  const username = usernameInput.value.trim();
  const content = postInput.value.trim();

  if (!username || !content) {
    alert('Por favor, llena todos los campos.');
    return;
  }

  try {
    const res = await fetch('http://localhost:3000/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, content })
    });

    const data = await res.json();
    console.log("Respuesta del servidor:", data);

    if (data.twitter?.data?.id) {
      alert("✅ Publicado también en Twitter (X)");
    } else {
      alert("📱 Publicado localmente (no se pudo en Twitter o sin permisos)");
    }

    postInput.value = '';
    loadPosts();
  } catch (err) {
    console.error(err);
    alert("Error al publicar.");
  }
});

// Cargar publicaciones locales
async function loadPosts() {
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
}
