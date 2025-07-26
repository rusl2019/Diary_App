// renderer.js
const diaryText = document.getElementById('diary-text');
const passwordInput = document.getElementById('password');
const saveBtn = document.getElementById('save-btn');
const openBtn = document.getElementById('open-btn');
const statusMessage = document.getElementById('status-message');

saveBtn.addEventListener('click', async () => {
  const text = diaryText.value;
  const password = passwordInput.value;

  if (!text || !password) {
    statusMessage.textContent = 'Error: Tulisan dan password tidak boleh kosong!';
    statusMessage.className = 'error';
    return;
  }

  statusMessage.textContent = 'Menyimpan...';
  statusMessage.className = 'info';

  const result = await window.electronAPI.saveFile({ text, password });
  if (result.success) {
    statusMessage.textContent = `Berhasil disimpan di: ${result.path}`;
    statusMessage.className = 'success';
  } else {
    statusMessage.textContent = 'Penyimpanan dibatalkan.';
    statusMessage.className = 'info';
  }
});

openBtn.addEventListener('click', async () => {
    const password = passwordInput.value;
    if (!password) {
        statusMessage.textContent = 'Error: Masukkan password untuk membuka file!';
        statusMessage.className = 'error';
        return;
    }

    statusMessage.textContent = 'Membuka file...';
    statusMessage.className = 'info';

    const result = await window.electronAPI.openFile(password);
    if (result.success) {
        diaryText.value = result.text;
        statusMessage.textContent = 'File berhasil dibuka!';
        statusMessage.className = 'success';
    } else {
        statusMessage.textContent = result.error || 'Gagal membuka file atau dibatalkan.';
        statusMessage.className = 'error';
    }
});