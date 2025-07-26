const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

// --- Configuration ---
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const APP_DATA_PATH = path.join(app.getPath("home"), ".diary_app");
const ENTRIES_PATH = path.join(APP_DATA_PATH, "entries");
const METADATA_PATH = path.join(APP_DATA_PATH, "metadata.json");

/**
 * Encrypts a given text using a password with AES encryption.
 *
 * @param {string} text - The plaintext to encrypt.
 * @param {string} password - The password used to derive the encryption key.
 * @returns {string} The encrypted data as a hexadecimal string, including IV, authentication tag, and ciphertext.
 */
function encrypt(text, password) {
  const key = crypto
    .createHash("sha256")
    .update(String(password))
    .digest("base64")
    .substring(0, 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("hex");
}

/**
 * Decrypts an encrypted hexadecimal string using the provided password.
 *
 * @param {string} encryptedHex - The encrypted data in hexadecimal format.
 * @param {string} password - The password used for decryption.
 * @returns {string|null} The decrypted string if successful, or null if decryption fails.
 */
function decrypt(encryptedHex, password) {
  try {
    const key = crypto
      .createHash("sha256")
      .update(String(password))
      .digest("base64")
      .substring(0, 32);
    const dataBuffer = Buffer.from(encryptedHex, "hex");
    const iv = dataBuffer.subarray(0, IV_LENGTH);
    const authTag = dataBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = dataBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    return decrypted.toString();
  } catch (error) {
    return null;
  }
}

/**
 * Ensures that the required data directories and metadata file exist.
 * Creates the application data directory, entries directory, and metadata file if they do not already exist.
 * The metadata file is initialized with an empty entries array.
 */
function ensureDataStructure() {
  if (!fs.existsSync(APP_DATA_PATH)) {
    fs.mkdirSync(APP_DATA_PATH);
  }
  if (!fs.existsSync(ENTRIES_PATH)) {
    fs.mkdirSync(ENTRIES_PATH);
  }
  if (!fs.existsSync(METADATA_PATH)) {
    fs.writeFileSync(METADATA_PATH, JSON.stringify({ entries: [] }));
  }
}

/**
 * Creates the main application window with specified dimensions and loads the index.html file.
 * The window uses a preload script for enhanced security and functionality.
 *
 * @function
 * @returns {void}
 */
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  ensureDataStructure();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// --- IPC Handlers ---

/**
 * Handles requests from the renderer to get all diary entries.
 * Reads the metadata file and returns the list of entries, sorted by most recent first.
 * @returns {Promise<Array<Object>>} A promise that resolves to an array of entry metadata objects.
 */
ipcMain.handle("get-entries", () => {
  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, "utf8"));
  return metadata.entries.sort((a, b) => new Date(b.date) - new Date(a.date));
});

/**
 * Handles saving a new diary entry.
 * Encrypts the content, saves it to a new file, and adds its metadata to the list.
 * @param {IpcMainInvokeEvent} event - The IPC event object.
 * @param {Object} payload - The data for the new entry.
 * @param {string} payload.title - The title of the entry.
 * @param {string} payload.text - The content of the entry.
 * @param {string} payload.password - The password to encrypt the entry.
 * @returns {Promise<Object>} A promise that resolves to an object indicating success and the new entry's data.
 */
ipcMain.handle("save-entry", (event, { title, text, password }) => {
  const encryptedContent = encrypt(text, password);
  const timestamp = Date.now();
  const filename = `${timestamp}.diary`;
  const filePath = path.join(ENTRIES_PATH, filename);

  fs.writeFileSync(filePath, encryptedContent);

  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, "utf8"));
  const newEntry = {
    id: timestamp,
    title: title,
    date: new Date().toISOString(),
    filename: filename,
  };
  metadata.entries.push(newEntry);
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));

  return { success: true, entry: newEntry };
});

/**
 * Handles opening an existing diary entry.
 * Finds the corresponding file and decrypts its content using the provided password.
 * @param {IpcMainInvokeEvent} event - The IPC event object.
 * @param {Object} payload - The data needed to open the entry.
 * @param {string} payload.filename - The filename of the entry to open.
 * @param {string} payload.password - The password to decrypt the entry.
 * @returns {Promise<Object>} A promise that resolves to an object with the decrypted text on success, or an error message on failure.
 */
ipcMain.handle("open-entry", (event, { filename, password }) => {
  const filePath = path.join(ENTRIES_PATH, filename);
  if (fs.existsSync(filePath)) {
    const encryptedContent = fs.readFileSync(filePath, "utf8");
    const decryptedText = decrypt(encryptedContent, password);
    if (decryptedText !== null) {
      return { success: true, text: decryptedText };
    } else {
      return { success: false, error: "Password salah." };
    }
  }
  return { success: false, error: "File tidak ditemukan." };
});

/**
 * Handles deleting an existing diary entry.
 * Removes the entry file and its corresponding record from the metadata file.
 * @param {IpcMainInvokeEvent} event - The IPC event object.
 * @param {Object} payload - The data needed to delete the entry.
 * @param {string} payload.filename - The filename of the entry to delete.
 * @returns {Promise<Object>} A promise that resolves to an object indicating success.
 */
ipcMain.handle("delete-entry", (event, { filename }) => {
  const filePath = path.join(ENTRIES_PATH, filename);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, "utf8"));
  metadata.entries = metadata.entries.filter(
    (entry) => entry.filename !== filename
  );
  fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));

  return { success: true };
});

/**
 * Handles editing an existing diary entry.
 * Overwrites the entry file with new encrypted content and updates its metadata.
 * @param {IpcMainInvokeEvent} event - The IPC event object.
 * @param {Object} payload - The data for the edited entry.
 * @param {string} payload.filename - The filename of the entry to edit.
 * @param {string} payload.newTitle - The updated title for the entry.
 * @param {string} payload.newText - The updated text content for the entry.
 * @param {string} payload.password - The password to re-encrypt the entry.
 * @returns {Promise<Object>} A promise that resolves to an object indicating success or failure.
 */
ipcMain.handle(
  "edit-entry",
  (event, { filename, newTitle, newText, password }) => {
    const filePath = path.join(ENTRIES_PATH, filename);

    if (fs.existsSync(filePath)) {
      const encryptedContent = encrypt(newText, password);
      fs.writeFileSync(filePath, encryptedContent);

      const metadata = JSON.parse(fs.readFileSync(METADATA_PATH, "utf8"));
      const entryIndex = metadata.entries.findIndex(
        (entry) => entry.filename === filename
      );

      if (entryIndex > -1) {
        metadata.entries[entryIndex].title = newTitle;
        metadata.entries[entryIndex].modified = new Date().toISOString();
      }

      fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2));

      return { success: true };
    }

    return { success: false, error: "File tidak ditemukan untuk diedit." };
  }
);
