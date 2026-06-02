// Shared auth state — updates nav on every page
(async function () {
  if (typeof window.supabase === 'undefined') return;
  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data } = await sb.auth.getSession();
  const signinLink = document.getElementById('nav-signin');
  const signoutLink = document.getElementById('nav-signout');
  if (data.session) {
    if (signinLink) signinLink.classList.add('hidden');
    if (signoutLink) {
      signoutLink.classList.remove('hidden');
      signoutLink.onclick = async () => {
        await sb.auth.signOut();
        window.location.href = 'index.html';
      };
    }
  }
})();
