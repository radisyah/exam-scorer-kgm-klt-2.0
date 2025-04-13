import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  collection,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBFi219yiToKp9D-7Ml6QeEWHqwHz3JgtE",
  authDomain: "input-nilai-ujian-mec-kgm-klt.firebaseapp.com",
  projectId: "input-nilai-ujian-mec-kgm-klt",
  storageBucket: "input-nilai-ujian-mec-kgm-klt.firebasestorage.app",
  messagingSenderId: "139888117338",
  appId: "1:139888117338:web:b9a8af60e0d173c6e07a63",
  measurementId: "G-YGZKCRFR5W",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const inputCari = document.getElementById("cariNama");
const hasilCari = document.getElementById("hasilCari");
const formNilai = document.getElementById("formNilai");
const judulFormNilai = document.getElementById("judulFormNilai");

const cariNilaiInput = document.getElementById("cariNilaiNama");
const hasilNilai = document.getElementById("hasilNilai");

let daftarMuridCache = [];
let nilaiCache = [];
let muridDipilih = null;

let siswaArray = [];

const urlParams = new URLSearchParams(window.location.search);
const akses = urlParams.get("akses");

if (akses === "tchr123") {
  document.querySelector("#siswa-container").style.display = "block";
}

if (akses === "admn123") {
  document.getElementById("uploadSiswaSection").style.display = "block";
  document.getElementById("daftarMuridSection").style.display = "block";
  document.getElementById("daftarNilaiSection").style.display = "block";
}

document.getElementById("excelInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  // ✅ Validasi format hanya .xlsx
  const allowedExtension = /\.xlsx$/i;
  if (!allowedExtension.test(file.name)) {
    Swal.fire(
      "Format Tidak Valid",
      "Silakan upload file berformat .xlsx saja.",
      "error"
    );
    e.target.value = ""; // reset input
    return;
  }

  const reader = new FileReader();
  reader.onload = (event) => {
    const data = new Uint8Array(event.target.result);
    const workbook = XLSX.read(data, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    siswaArray = XLSX.utils.sheet_to_json(sheet, {
      header: ["nama", "kelas", "level", "cabang"],
      range: 1,
    });

    if (siswaArray.length === 0) {
      Swal.fire("Kosong", "Tidak ada data ditemukan dalam file.", "info");
      return;
    }

    const invalidRows = siswaArray.filter(
      (s) => !s.nama || !s.kelas || !s.level || !s.cabang
    );
    if (invalidRows.length > 0) {
      Swal.fire(
        "❌ Validasi Gagal",
        "Ada baris yang belum lengkap. Pastikan semua kolom terisi.",
        "error"
      );
      return;
    }

    let htmlTable = "<table style='width:100%;text-align:left'>";
    htmlTable +=
      "<tr><th>Nama</th><th>Kelas</th><th>Level</th><th>Cabang</th></tr>";
    siswaArray.forEach((s) => {
      htmlTable += `<tr><td>${s.nama}</td><td>${s.kelas}</td><td>${s.level}</td><td>${s.cabang}</td></tr>`;
    });
    htmlTable += "</table>";

    Swal.fire({
      title: "Preview Data",
      html: htmlTable,
      width: "70%",
      confirmButtonText: "Cek & Simpan",
      showCancelButton: true,
      cancelButtonText: "Batal",
      preConfirm: () => simpanTanpaDuplikat(siswaArray),
    });
  };

  reader.readAsArrayBuffer(file);
});

// === FETCH CACHE DATA SEKALI
async function loadCaches() {
  const [muridSnapshot, nilaiSnapshot] = await Promise.all([
    getDocs(collection(db, "murid")),
    getDocs(collection(db, "nilai")),
  ]);
  daftarMuridCache = muridSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  nilaiCache = nilaiSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function simpanTanpaDuplikat(siswaArray) {
  const total = siswaArray.length;
  let berhasil = 0;
  let duplikat = [];

  Swal.fire({
    title: "Menyimpan data...",
    html: `
      <div id="progressText">0 / ${total} disimpan</div>
      <div style="width: 100%; background: #ccc; border-radius: 5px; overflow: hidden; margin-top: 10px;">
        <div id="progressBar" style="width: 0%; height: 10px; background: #1976d2;"></div>
      </div>
    `,
    showConfirmButton: false,
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  for (let i = 0; i < total; i++) {
    const siswa = siswaArray[i];
    const isDuplicate = daftarMuridCache.some((m) => m.nama === siswa.nama);

    if (isDuplicate) {
      duplikat.push(siswa.nama);
    } else {
      const docRef = await addDoc(collection(db, "murid"), siswa);
      daftarMuridCache.push({ id: docRef.id, ...siswa });
      berhasil++;
    }

    const percent = Math.floor(((i + 1) / total) * 100);
    document.getElementById("progressBar").style.width = `${percent}%`;
    document.getElementById("progressText").textContent = `${
      i + 1
    } / ${total} diproses`;
  }

  Swal.fire({
    icon: duplikat.length ? "warning" : "success",
    title: "Selesai",
    html: `✅ ${berhasil} berhasil disimpan.<br>❌ Duplikat: ${
      duplikat.length > 0 ? duplikat.join(", ") : "Tidak ada"
    }`,
  });

  document.getElementById("excelInput").value = "";
}

function resetFormNilai() {
  ["reading", "listening", "writing", "speaking", "matematika"].forEach(
    (id) => (document.getElementById(id).value = "")
  );
}

function sembunyikanFormNilai() {
  formNilai.classList.add("hidden");
  hasilCari.textContent = "";
  inputCari.value = "";
  muridDipilih = null;
}

// ======================= TAMPILKAN MURID (PAKAI CACHE) ==========================
function tampilkanMurid() {
  renderMuridTablePage(daftarMuridCache, currentPage);
}

// ======================= LOAD DATA NILAI (DARI CACHE) ==========================
function loadDataNilaiMurid() {
  renderNilaiMuridPage(nilaiCache, currentPageNilai);
}

const tambahBtn = document.getElementById("tambahMuridBtn");
tambahBtn?.addEventListener("click", async (e) => {
  e.preventDefault();

  const data = {
    nama: document.getElementById("nama").value.trim(),
    kelas: document.getElementById("kelas").value.trim(),
    level: document.getElementById("level").value.trim(),
    cabang: document.getElementById("cabang").value.trim(),
  };

  if (!data.nama) {
    Swal.fire({
      icon: "warning",
      title: "Nama wajib diisi",
      text: "Silakan isi nama murid terlebih dahulu.",
    });
    return;
  }

  Swal.fire({
    title: "Menyimpan...",
    text: "Mohon tunggu, data murid sedang disimpan.",
    allowOutsideClick: false,
    didOpen: () => Swal.showLoading(),
  });

  try {
    await addDoc(collection(db, "murid"), data);
    daftarMuridCache.push(data); // ⬅️ update cache langsung
    Swal.fire({
      icon: "success",
      title: "Berhasil!",
      text: "Data murid berhasil disimpan.",
      timer: 1500,
      showConfirmButton: false,
    });
    ["nama", "kelas", "level", "cabang"].forEach((id) => {
      document.getElementById(id).value = "";
    });
    tampilkanMurid();
  } catch (err) {
    console.error("❌ Gagal menyimpan murid:", err);
    Swal.fire({
      icon: "error",
      title: "Gagal!",
      text: "Terjadi kesalahan saat menyimpan data murid.",
    });
  }
});

// ✅ Inisialisasi
let currentPageNilai = 1;
const itemsPerPageNilai = 5;

// === DEBOUNCE UTILITY
function debounce(func, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// === PENCARIAN NILAI BERDASARKAN CACHE
inputCari.addEventListener(
  "input",
  debounce(() => {
    const keyword = inputCari.value.toLowerCase();
    if (!keyword) return sembunyikanFormNilai();

    const hasil = daftarMuridCache.find((m) =>
      m.nama.toLowerCase().includes(keyword)
    );

    if (hasil) {
      muridDipilih = hasil;
      hasilCari.textContent = `Ditemukan: ${hasil.nama} (Kelas ${hasil.kelas}, Level ${hasil.level}, Cabang ${hasil.cabang})`;
      judulFormNilai.textContent = `Input / Edit nilai untuk ${hasil.nama}`;

      const data = nilaiCache.find(
        (n) => n.nama.toLowerCase() === hasil.nama.toLowerCase()
      );

      if (data) {
        document.getElementById("reading").value = data.reading ?? "";
        document.getElementById("listening").value = data.listening ?? "";
        document.getElementById("writing").value = data.writing ?? "";
        document.getElementById("speaking").value = data.speaking ?? "";
        document.getElementById("matematika").value = data.matematika ?? "";
      } else {
        resetFormNilai();
      }

      formNilai.classList.remove("hidden");
    } else {
      hasilCari.textContent = "❌ Murid tidak ditemukan.";
      sembunyikanFormNilai();
    }
  }, 300)
);

document
  .getElementById("simpanNilaiBtn")
  .addEventListener("click", async () => {
    if (!muridDipilih) {
      Swal.fire({
        icon: "warning",
        title: "Belum memilih murid",
        text: "Silakan cari dan pilih murid terlebih dahulu.",
      });
      return;
    }

    const reading = parseInt(document.getElementById("reading").value) || null;
    const listening =
      parseInt(document.getElementById("listening").value) || null;
    const writing = parseInt(document.getElementById("writing").value) || null;
    const speaking =
      parseInt(document.getElementById("speaking").value) || null;
    const matematika =
      parseInt(document.getElementById("matematika").value) || null;

    if (!reading && !listening && !writing && !speaking && !matematika) {
      Swal.fire({
        icon: "warning",
        title: "Belum memilih Nilai",
        text: "Minimal isi satu nilai sebelum menyimpan.",
      });
      return;
    }

    const nilai = {
      nama: muridDipilih.nama,
      kelas: muridDipilih.kelas,
      level: muridDipilih.level,
      cabang: muridDipilih.cabang,
      reading,
      listening,
      writing,
      speaking,
      matematika,
      tanggal: new Date().toISOString(),
    };

    Swal.fire({
      title: "Menyimpan nilai...",
      text: `Menyimpan data nilai untuk ${muridDipilih.nama}`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const docRef = doc(db, "nilai", muridDipilih.nama.toLowerCase());
      await setDoc(docRef, nilai, { merge: true });
      Swal.fire({
        icon: "success",
        title: "Nilai Disimpan",
        text: `${muridDipilih.nama} berhasil disimpan.`,
        timer: 1500,
        showConfirmButton: false,
      });
      resetFormNilai();
      sembunyikanFormNilai();
    } catch (err) {
      console.error("❌ Gagal simpan nilai:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal menyimpan nilai",
        text: "Terjadi kesalahan. Silakan coba lagi.",
      });
    }
  });

document.getElementById("batalNilaiBtn").addEventListener("click", () => {
  resetFormNilai();
  sembunyikanFormNilai();
});

cariNilaiInput.addEventListener(
  "input",
  debounce(() => {
    const keyword = cariNilaiInput.value.toLowerCase();
    hasilNilai.innerHTML = "";

    if (!keyword) return;

    const data = nilaiCache.find(
      (d) => d.nama.toLowerCase().includes(keyword) // Pastikan tanda kurung di sini lengkap.
    );

    if (data) {
      hasilNilai.innerHTML = `
      <div class="nilai-card">
        <h3>${data.nama} - ${data.cabang}, Kelas ${data.kelas}, Level ${data.level}</h3>
        <p>📖 Reading: ${data.reading}</p>
        <p>🎧 Listening: ${data.listening}</p>
        <p>✍️ Writing: ${data.writing}</p>
        <p>🗣️ Speaking: ${data.speaking}</p>
        <p>🔢 Matematika: ${data.matematika}</p>
      </div>
    `;
    } else {
      hasilNilai.textContent = "❌ Nilai tidak ditemukan.";
    }
  }, 500)
);

let currentPage = 1;
const itemsPerPage = 5;

function renderMuridTablePage(data, page = 1) {
  const daftarMurid = document.getElementById("daftarMurid");
  daftarMurid.innerHTML = "";

  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedItems = data.slice(start, end);

  paginatedItems.forEach((murid) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="sticky-col">${murid.nama}</td>
      <td>${murid.kelas}</td>
      <td>${murid.level}</td>
      <td>${murid.cabang}</td>
      <td>
        <button class="btn-edit" data-nama="${murid.nama}">✏️ Edit</button>

        <button class="btn-delete" data-nama="${murid.nama}">🗑 Hapus</button>
      </td>
    `;
    daftarMurid.appendChild(tr);
    bindDeleteButtons();
  });

  renderPaginationControls(data.length, page);
}

function renderPaginationControls(totalItems, currentPage) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const pagination = document.getElementById("paginationMurid");
  let html = "";

  const maxButtons = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;

  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (currentPage > 1) {
    html += `<button onclick="changePage(${
      currentPage - 1
    })">&laquo; Prev</button>`;
  }

  // Tambahkan "1" dan "..." di depan jika startPage > 2
  if (startPage > 2) {
    html += `<button onclick="changePage(1)">1</button>`;
    html += `<span class="dots">...</span>`;
  } else if (startPage === 2) {
    html += `<button onclick="changePage(1)">1</button>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="${
      i === currentPage ? "active" : ""
    }" onclick="changePage(${i})">${i}</button>`;
  }

  // Tambahkan "..." dan "lastPage" di akhir jika endPage < totalPages - 1
  if (endPage < totalPages - 1) {
    html += `<span class="dots">...</span>`;
    html += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
  } else if (endPage === totalPages - 1) {
    html += `<button onclick="changePage(${totalPages})">${totalPages}</button>`;
  }

  if (currentPage < totalPages) {
    html += `<button onclick="changePage(${
      currentPage + 1
    })">Next &raquo;</button>`;
  }

  pagination.innerHTML = html;
}

let editDocId = null;

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-edit")) {
    const nama = e.target.dataset.nama;

    // Menampilkan modal "Memuat data..."
    Swal.fire({
      title: "Memuat data...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const q = query(collection(db, "murid"), where("nama", "==", nama));
    const snapshot = await getDocs(q);

    // Setelah data berhasil dimuat, tutup modal loading
    Swal.close();

    if (!snapshot.empty) {
      const docRef = snapshot.docs[0];
      const data = docRef.data();
      editDocId = docRef.id;

      document.getElementById("editNama").value = data.nama || "";
      document.getElementById("editKelas").value = data.kelas || "";
      document.getElementById("editLevel").value = data.level || "";
      document.getElementById("editCabang").value = data.cabang || "";

      const modal = document.getElementById("modalEditMurid");

      // Reset animasi jika modal sedang terbuka
      modal.classList.remove("show");
      modal.classList.remove("hidden");

      // Pakai delay singkat agar animasi bisa dipicu ulang
      setTimeout(() => {
        modal.classList.add("show");
      }, 100);
    } else {
      Swal.fire("❌ Murid tidak ditemukan");
    }
  }
});

// Simpan Edit
document
  .getElementById("btnSimpanEditMurid")
  .addEventListener("click", async () => {
    if (!editDocId) return;

    const updatedData = {
      nama: document.getElementById("editNama").value.trim(),
      kelas: document.getElementById("editKelas").value.trim(),
      level: document.getElementById("editLevel").value.trim(),
      cabang: document.getElementById("editCabang").value.trim(),
    };

    Swal.fire({
      title: "Menyimpan...",
      text: "Mohon tunggu, data murid sedang disimpan.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await setDoc(doc(db, "murid", editDocId), updatedData);

      // ✅ Update data di daftarMuridCache
      const index = daftarMuridCache.findIndex(
        (m) => m.nama === updatedData.nama
      );
      if (index !== -1) {
        daftarMuridCache[index] = updatedData;
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Data murid berhasil disimpan.",
        timer: 1500,
        showConfirmButton: false,
      });

      // ✅ Tutup modal dan render ulang
      const modal = document.getElementById("modalEditMurid");
      modal.classList.remove("show");
      setTimeout(() => modal.classList.add("hidden"), 300);

      editDocId = null;
      renderMuridTablePage(daftarMuridCache, currentPage);
    } catch (err) {
      console.error("❌ Gagal edit murid:", err);
      Swal.fire("❌ Gagal menyimpan perubahan.");
    }
  });

// Batal
document.getElementById("btnBatalEditMurid").addEventListener("click", () => {
  const modal = document.getElementById("modalEditMurid");
  modal.classList.remove("show");
  setTimeout(() => {
    modal.classList.add("hidden");
  }, 300); // Sesuai dengan CSS transition
  editDocId = null;
});

function bindDeleteButtons() {
  document.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const nama = btn.dataset.nama;
      if (!nama) return;

      const konfirmasi = await Swal.fire({
        icon: "warning",
        title: "Hapus Murid?",
        text: `Yakin ingin menghapus murid "${nama}"?`,
        showCancelButton: true,
        confirmButtonText: "Ya, Hapus",
        cancelButtonText: "Batal",
      });

      if (!konfirmasi.isConfirmed) return;

      Swal.fire({
        title: "Menghapus data...",
        text: `Menghapus data siswa untuk ${nama}`,
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading(),
      });

      try {
        const q = query(collection(db, "murid"), where("nama", "==", nama));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          Swal.fire(
            "Tidak ditemukan",
            `Murid "${nama}" tidak ditemukan.`,
            "info"
          );
          return;
        }

        for (const docSnap of snapshot.docs) {
          await deleteDoc(doc(db, "murid", docSnap.id));
        }

        daftarMuridCache = daftarMuridCache.filter((m) => m.nama !== nama); // ⬅️ update cache
        renderMuridTablePage(daftarMuridCache, currentPage);

        Swal.fire("Berhasil!", `Murid "${nama}" berhasil dihapus.`, "success");
      } catch (err) {
        console.error(err);
        Swal.fire("Gagal", "Terjadi kesalahan saat menghapus data.", "error");
      }
    });
  });
}

document
  .getElementById("btnExportNilai")
  .addEventListener("click", async () => {
    Swal.fire({
      title: "Mengekspor data...",
      text: "Mohon tunggu, sedang menyiapkan file Excel.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      if (nilaiCache.length === 0) {
        return Swal.fire(
          "Kosong",
          "Belum ada data nilai untuk diekspor.",
          "info"
        );
      }

      const dataExport = nilaiCache.map((d) => ({
        Nama: d.nama || "",
        Kelas: d.kelas || "",
        Level: d.level || "",
        Cabang: d.cabang || "",
        Reading: d.reading ?? "",
        Listening: d.listening ?? "",
        Writing: d.writing ?? "",
        Speaking: d.speaking ?? "",
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Nilai Siswa");

      XLSX.writeFile(workbook, "data_nilai_siswa.xlsx");

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "File Excel telah disimpan.",
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (err) {
      console.error("Export error:", err);
      Swal.fire("Gagal", "Terjadi kesalahan saat ekspor data.", "error");
    }
  });

function renderNilaiMuridPage(data, page = 1) {
  const tbody = document.getElementById("daftarNilaiMurid");
  tbody.innerHTML = "";

  const start = (page - 1) * itemsPerPageNilai;
  const end = start + itemsPerPageNilai;
  const paginatedItems = data.slice(start, end);

  paginatedItems.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="sticky-col">${item.nama}</td>
      <td>${item.kelas}</td>
      <td>${item.level}</td>
      <td>${item.cabang}</td>
      <td>${item.reading ?? "-"}</td>
      <td>${item.listening ?? "-"}</td>
      <td>${item.writing ?? "-"}</td>
      <td>${item.speaking ?? "-"}</td>
      <td>
        <button class="btn-edit-nilai" data-id="${item.id}">✏️ Edit</button>
        <button class="btn-delete-nilai" data-id="${item.id}" data-nama="${
      item.nama
    }">🗑 Hapus</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  renderPaginationNilai(data.length, page);
}

function renderPaginationNilai(totalItems, currentPage) {
  const pagination = document.getElementById("paginationNilaiMurid");
  let html = "";
  const totalPages = Math.ceil(totalItems / itemsPerPageNilai);
  const maxButtons = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
  let endPage = startPage + maxButtons - 1;
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - maxButtons + 1);
  }

  if (currentPage > 1) {
    html += `<button onclick="changePageNilai(${
      currentPage - 1
    })">&laquo; Prev</button>`;
  }

  if (startPage > 2) {
    html += `<button onclick="changePageNilai(1)">1</button><span class="dots">...</span>`;
  } else if (startPage === 2) {
    html += `<button onclick="changePageNilai(1)">1</button>`;
  }

  for (let i = startPage; i <= endPage; i++) {
    html += `<button class="${
      i === currentPage ? "active" : ""
    }" onclick="changePageNilai(${i})">${i}</button>`;
  }

  if (endPage < totalPages - 1) {
    html += `<span class="dots">...</span><button onclick="changePageNilai(${totalPages})">${totalPages}</button>`;
  } else if (endPage === totalPages - 1) {
    html += `<button onclick="changePageNilai(${totalPages})">${totalPages}</button>`;
  }

  if (currentPage < totalPages) {
    html += `<button onclick="changePageNilai(${
      currentPage + 1
    })">Next &raquo;</button>`;
  }

  pagination.innerHTML = html;
}

let editNilaiId = null;
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-edit-nilai")) {
    const id = e.target.dataset.id;
    editNilaiId = id; // ⬅️ WAJIB diset supaya tombol simpan bisa bekerja

    const data = nilaiCache.find((item) => item.id === id);

    if (!data) {
      Swal.close();
      return Swal.fire("❌ Data tidak ditemukan.");
    }

    document.getElementById("editReading").value = data.reading ?? "";
    document.getElementById("editListening").value = data.listening ?? "";
    document.getElementById("editWriting").value = data.writing ?? "";
    document.getElementById("editSpeaking").value = data.speaking ?? "";

    Swal.close();
    const modal = document.getElementById("modalEditNilai");
    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("show"));
  }
});

document
  .getElementById("btnSimpanEditNilai")
  .addEventListener("click", async () => {
    if (!editNilaiId) return;

    const updated = {
      reading: parseInt(document.getElementById("editReading")?.value) || null,
      listening:
        parseInt(document.getElementById("editListening")?.value) || null,
      writing: parseInt(document.getElementById("editWriting")?.value) || null,
      speaking:
        parseInt(document.getElementById("editSpeaking")?.value) || null,
    };

    Swal.fire({
      title: "Menyimpan...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await setDoc(doc(db, "nilai", editNilaiId), updated, { merge: true });

      Swal.fire({
        icon: "success",
        title: "✅ Berhasil",
        text: "Data nilai berhasil diperbarui.",
        timer: 1500,
        showConfirmButton: false,
      });

      editNilaiId = null;
      document.getElementById("modalEditNilai").classList.remove("show");
      setTimeout(() => {
        document.getElementById("modalEditNilai").classList.add("hidden");
      }, 300);
      await loadDataNilaiMurid();
    } catch (error) {
      console.error("❌ Error saat menyimpan nilai:", error);
      Swal.fire("❌ Gagal", "Terjadi kesalahan saat menyimpan.", "error");
    }
  });

// ✅ Batal
btnBatalEditNilai.addEventListener("click", () => {
  const modal = document.getElementById("modalEditNilai");
  modal.classList.remove("show");
  setTimeout(() => modal.classList.add("hidden"), 300);
  editNilaiId = null;
});

document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-delete-nilai")) {
    const id = e.target.dataset.id;
    const nama = e.target.dataset.nama;

    const konfirmasi = await Swal.fire({
      icon: "warning",
      title: `Hapus Nilai?`,
      text: `Yakin ingin menghapus nilai murid \"${nama}\"?`,
      showCancelButton: true,
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal",
    });

    if (!konfirmasi.isConfirmed) return;

    Swal.fire({
      title: "Menghapus data...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await deleteDoc(doc(db, "nilai", id));
      Swal.fire("✅ Berhasil", "Data nilai berhasil dihapus.", "success");
      await loadDataNilaiMurid();
    } catch (err) {
      console.error(err);
      Swal.fire("❌ Gagal", "Gagal menghapus data.", "error");
    }
  }
});

// ✅ Pindah Halaman
window.changePageNilai = function (page) {
  currentPageNilai = page;
  renderNilaiMuridPage(nilaiCache, currentPageNilai);
};

window.changePage = function (page) {
  currentPage = page;
  renderMuridTablePage(daftarMuridCache, currentPage);
};

window.addEventListener("DOMContentLoaded", async () => {
  await loadCaches(); // isi cache murid & nilai
  tampilkanMurid(); // render data tabel
  isiOpsiNilaiSelect();
  loadDataNilaiMurid(); // tampilkan nilai di daftar
});

function isiOpsiNilaiSelect() {
  const nilaiOptions = [
    "",
    0,
    40,
    45,
    50,
    55,
    60,
    65,
    70,
    75,
    80,
    85,
    90,
    95,
    100,
  ];
  ["editReading", "editListening", "editWriting", "editSpeaking"].forEach(
    (id) => {
      const select = document.getElementById(id);
      select.innerHTML = "";
      nilaiOptions.forEach((val) => {
        const option = document.createElement("option");
        option.value = val;
        option.textContent = val === "" ? id.replace("edit", "") : val;
        select.appendChild(option);
      });
    }
  );
}
