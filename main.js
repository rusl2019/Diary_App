// main.js
const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

// Algoritma enkripsi yang akan digunakan
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Panjang Initialization Vector untuk GCM
const AUTH_TAG_LENGTH = 16; // Panjang Authentication Tag untuk GCM

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Menghubungkan preload script dengan aman
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, // Wajib untuk keamanan
      nodeIntegration: false,  // Wajib untuk keamanan
    },
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// Fungsi untuk mengenkripsi data
function encrypt(text, password) {
  // Membuat kunci 32-byte dari password menggunakan SHA-256
  const key = crypto.createHash('sha256').update(String(password)).digest('base64').substring(0, 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Gabungkan iv, authTag, dan data terenkripsi menjadi satu buffer untuk disimpan
  return Buffer.concat([iv, authTag, encrypted]).toString('hex');
}

// Fungsi untuk mendekripsi data
function decrypt(encryptedHex, password) {
  try {
    const key = crypto.createHash('sha256').update(String(password)).digest('base64').substring(0, 32);
    const dataBuffer = Buffer.from(encryptedHex, 'hex');
    const iv = dataBuffer.subarray(0, IV_LENGTH);
    const authTag = dataBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = dataBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    // Jika password salah atau file rusak, akan terjadi error
    console.error("Decryption failed:", error);
    return null;
  }
}

// Menangani permintaan 'save-file' dari frontend
ipcMain.handle('save-file', async (event, { text, password }) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Simpan Diary',
    buttonLabel: 'Simpan',
    filters: [{ name: 'Encrypted Diary', extensions: ['diary'] }],
  });

  if (filePath) {
    const encryptedContent = encrypt(text, password);
    fs.writeFileSync(filePath, encryptedContent);
    return { success: true, path: filePath };
  }
  return { success: false };
});


// Menangani permintaan 'open-file' dari frontend
ipcMain.handle('open-file', async (event, password) => {
  const { filePaths } = await dialog.showOpenDialog({
    title: 'Buka Diary',
    buttonLabel: 'Buka',
    properties: ['openFile'],
    filters: [{ name: 'Encrypted Diary', extensions: ['diary'] }],
  });

  if (filePaths && filePaths.length > 0) {
    const filePath = filePaths[0];
    const encryptedContent = fs.readFileSync(filePath, 'utf8');
    const decryptedText = decrypt(encryptedContent, password);

    if (decryptedText !== null) {
      return { success: true, text: decryptedText };
    } else {
      return { success: false, error: 'Password salah atau file rusak.' };
    }
  }
  return { success: false };
});