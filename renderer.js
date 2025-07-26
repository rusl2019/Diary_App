const entryList = document.getElementById("entry-list");
const entryTitle = document.getElementById("entry-title");
const diaryText = document.getElementById("diary-text");
const passwordInput = document.getElementById("password");
const saveBtn = document.getElementById("save-btn");
const newEntryBtn = document.getElementById("new-entry-btn");
const statusMessage = document.getElementById("status-message");

let activeEntryFilename = null;

/**
 * Clears the diary editor fields and resets the UI state.
 * - Empties the entry title and diary text inputs.
 * - Sets the active entry filename to null.
 * - Removes the 'active' class from all entry items.
 * - Updates the status message to indicate a new entry is being created.
 */
function clearEditor() {
  entryTitle.value = "";
  diaryText.value = "";
  activeEntryFilename = null;
  document
    .querySelectorAll(".entry-item.active")
    .forEach((el) => el.classList.remove("active"));
  statusMessage.textContent = "Membuat entri baru...";
  statusMessage.className = "info";
}

/**
 * Loads diary entries from the backend via Electron API, renders them in the entry list,
 * and sets up event listeners for opening and deleting entries.
 * Handles UI updates for entry selection, deletion, and error/success messages.
 * Requires global DOM elements: entryList, statusMessage, passwordInput, entryTitle, diaryText,
 * and activeEntryFilename.
 *
 * @async
 * @function
 * @returns {Promise<void>} Resolves when entries are loaded and UI is updated.
 */
async function loadEntries() {
  const entries = await window.electronAPI.getEntries();
  entryList.innerHTML = "";

  for (const entry of entries) {
    const item = document.createElement("div");
    item.className = "entry-item";
    item.dataset.filename = entry.filename;

    const infoContainer = document.createElement("div");
    infoContainer.className = "entry-item-info";

    const title = document.createElement("div");
    title.className = "entry-item-title";
    title.textContent = entry.title;

    const date = document.createElement("div");
    date.className = "entry-item-date";
    date.textContent = new Date(entry.date).toLocaleString();

    infoContainer.appendChild(title);
    infoContainer.appendChild(date);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "×";
    deleteBtn.addEventListener("click", async (e) => {
      e.stopPropagation();

      const isConfirmed = confirm(
        `Apakah Anda yakin ingin menghapus entri "${entry.title}"?`
      );
      if (isConfirmed) {
        await window.electronAPI.deleteEntry({ filename: entry.filename });
        statusMessage.textContent = "Entri berhasil dihapus.";
        statusMessage.className = "success";

        if (activeEntryFilename === entry.filename) {
          clearEditor();
        }

        loadEntries();
      }
    });

    item.appendChild(infoContainer);
    item.appendChild(deleteBtn);

    infoContainer.addEventListener("click", async () => {
      const password = passwordInput.value;
      if (!password) {
        statusMessage.textContent = "Masukkan password untuk membuka entri!";
        statusMessage.className = "error";
        return;
      }

      const result = await window.electronAPI.openEntry({
        filename: entry.filename,
        password,
      });
      if (result.success) {
        entryTitle.value = entry.title;
        diaryText.value = result.text;
        activeEntryFilename = entry.filename;

        document
          .querySelectorAll(".entry-item.active")
          .forEach((el) => el.classList.remove("active"));
        item.classList.add("active");

        statusMessage.textContent = "Entri berhasil dibuka.";
        statusMessage.className = "success";
      } else {
        statusMessage.textContent = result.error;
        statusMessage.className = "error";
      }
    });

    entryList.appendChild(item);
  }
}

saveBtn.addEventListener("click", async () => {
  const title = entryTitle.value;
  const text = diaryText.value;
  const password = passwordInput.value;

  if (!title || !text || !password) {
    statusMessage.textContent = "Judul, isi, dan password tidak boleh kosong!";
    statusMessage.className = "error";
    return;
  }

  statusMessage.textContent = "Menyimpan...";
  statusMessage.className = "info";

  if (activeEntryFilename) {
    const result = await window.electronAPI.editEntry({
      filename: activeEntryFilename,
      newTitle: title,
      newText: text,
      password: password,
    });

    if (result.success) {
      statusMessage.textContent = "Perubahan berhasil disimpan!";
      statusMessage.className = "success";
      passwordInput.value = "";
      await loadEntries();
    } else {
      statusMessage.textContent = result.error || "Gagal menyimpan perubahan.";
      statusMessage.className = "error";
    }
  } else {
    const result = await window.electronAPI.saveEntry({
      title,
      text,
      password,
    });

    if (result.success) {
      statusMessage.textContent = "Entri baru berhasil disimpan!";
      statusMessage.className = "success";
      clearEditor();
      passwordInput.value = "";
      await loadEntries();
    } else {
      statusMessage.textContent = "Gagal menyimpan entri.";
      statusMessage.className = "error";
    }
  }
});

newEntryBtn.addEventListener("click", clearEditor);

loadEntries();
