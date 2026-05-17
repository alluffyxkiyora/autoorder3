document.addEventListener('DOMContentLoaded', function() {
  
  // Mouse glow trail effect
  document.addEventListener('mousemove', (e) => {
    const glow = document.createElement('div');
    glow.style.cssText = `
      position: fixed;
      left: ${e.clientX}px;
      top: ${e.clientY}px;
      width: 20px;
      height: 20px;
      background: radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
      z-index: 9999;
      animation: glowTrail 0.6s ease-out forwards;
      transform: translate(-50%, -50%);
    `;
    document.body.appendChild(glow);
    
    setTimeout(() => glow.remove(), 600);
  });

  // Buy button handlers
  document.querySelectorAll('.buy-btn').forEach(btn => {
    btn.addEventListener('click', async function() {
      const ram = this.dataset.ram;
      const username = document.getElementById('username').value.trim();
      
      if (!username || username.length < 3) {
        showToast('Username minimal 3 karakter!', 'red');
        document.getElementById('username').focus();
        return;
      }
      
      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        showToast('Username hanya boleh huruf, angka, _, -', 'red');
        return;
      }
      
      showLoading(true);
      
      try {
        const response = await fetch('/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, ram })
        });
        
        const data = await response.json();
        
        if (data.success) {
          window.location.href = `/payment/${data.orderId}`;
        } else {
          showToast(data.message || 'Gagal membuat pesanan', 'red');
        }
      } catch (error) {
        showToast('Terjadi kesalahan sistem', 'red');
      } finally {
        showLoading(false);
      }
    });
  });

  // Input effects
  const usernameInput = document.getElementById('username');
  if (usernameInput) {
    usernameInput.addEventListener('focus', function() {
      this.parentElement.classList.add('ring-4', 'ring-blue-500/30');
    });
    
    usernameInput.addEventListener('blur', function() {
      this.parentElement.classList.remove('ring-4', 'ring-blue-500/30');
    });
  }

  // Enter key support
  document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.querySelector('.buy-btn:hover')) {
      document.querySelector('.buy-btn:hover').click();
    }
  });

  // Parallax floating elements
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const parallax = document.querySelectorAll('.animate-float');
    parallax.forEach(el => {
      el.style.transform = `translateY(${scrolled * 0.5}px)`;
    });
  });
});

function showLoading(show) {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.toggle('hidden', !show);
  }
}

function showToast(message, type = 'error') {
  const toast = document.getElementById('toast');
  const messageEl = document.getElementById('toast-message');
  
  if (messageEl) messageEl.textContent = message;
  
  toast.className = `fixed bottom-6 right-6 z-50 p-6 ${
    type === 'error' ? 'bg-gradient-to-r from-red-500/90 to-pink-500/90 backdrop-blur-xl border border-red-500/50 shadow-2xl shadow-red-500/25' :
    type === 'success' ? 'bg-gradient-to-r from-green-500/90 to-emerald-500/90 backdrop-blur-xl border border-emerald-500/50 shadow-2xl shadow-emerald-500/25' :
    'bg-gradient-to-r from-blue-500/90 to-cyan-500/90 backdrop-blur-xl border border-blue-500/50 shadow-2xl shadow-blue-500/25'
  } rounded-2xl max-w-sm mx-auto font-[Exo2] text-white font-medium`;
  
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// CSS for mouse glow trail
const style = document.createElement('style');
style.textContent = `
  @keyframes glowTrail {
    to {
      opacity: 0;
      transform: translate(-50%, -50%) translateY(-30px) scale(0);
    }
  }
`;
document.head.appendChild(style);