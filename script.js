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
  apiKey: "AIzaSyAGpqDZoKxd6oTtVuXt2Cc8U3XCZV6S5_w",
  authDomain: "mec-kgm-klt.firebaseapp.com",
  projectId: "mec-kgm-klt",
  storageBucket: "mec-kgm-klt.firebasestorage.app",
  messagingSenderId: "1001961428291",
  appId: "1:1001961428291:web:3049033421bc8cad124bf6",
  measurementId: "G-ZXGS4GLEEJ",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const inputCari = document.getElementById("cariNama");
const hasilCari = document.getElementById("hasilCari");
const formNilai = document.getElementById("formNilai");
const judulFormNilai = document.getElementById("judulFormNilai");

const cariNilaiInput = document.getElementById("cariNilaiNama");
const hasilNilai = document.getElementById("hasilNilai");

// ======================= GLOBAL VARIABLES ==========================
let daftarMuridCache = [];
let siswaArray = [];
let nilaiCache = [];
let muridDipilih = null;
let editDocId = null;
let editNilaiId = null;
let currentPage = 1;
let currentPageNilai = 1;
const itemsPerPage = 5;
const itemsPerPageNilai = 5;

// === KONFIGURASI MAINTENANCE ===
const isUnderMaintenance = false; // Ubah menjadi true jika situs sedang perbaikan

// === CEK DAN ATUR TAMPILAN AKSES ===
function checkMaintenance() {
  if (isUnderMaintenance) {
    window.location.href = "404.html";
    return;
  }

  // Ambil parameter akses dari URL (misalnya: index.html?akses=tchr123)
  const akses = new URLSearchParams(window.location.search).get("akses");

  // Sembunyikan semua section terlebih dahulu
  document.querySelector("#siswa-container").style.display = "none";
  document.getElementById("uploadSiswaSection").style.display = "none";
  document.getElementById("uploadSiswaNilaiSection").style.display = "none";
  document.getElementById("daftarMuridSection").style.display = "none";
  document.getElementById("daftarNilaiSection").style.display = "none";
  document.getElementById("cariNilaiSection").style.display = "none";

  // Akses guru
  if (akses === "tchr123") {
    document.querySelector("#siswa-container").style.display = "block";
    document.getElementById("cariNilaiSection").style.display = "block";
  }

  // Akses admin
  if (akses === "admn123") {
    document.querySelector("#siswa-container").style.display = "block";
    document.getElementById("uploadSiswaSection").style.display = "block";
    document.getElementById("uploadSiswaNilaiSection").style.display = "block";
    document.getElementById("daftarMuridSection").style.display = "block";
    document.getElementById("daftarNilaiSection").style.display = "block";
  }

  // Tanpa akses: hanya bisa lihat fitur cari nilai
  if (!akses) {
    document.getElementById("cariNilaiSection").style.display = "block";
  }
}

// Jalankan saat halaman dimuat
window.onload = checkMaintenance;

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
      header: ["noInduk", "nama", "kelas", "level", "cabang"], // ✅ Tambah ini
      range: 1,
    });

    if (siswaArray.length === 0) {
      Swal.fire("Kosong", "Tidak ada data ditemukan dalam file.", "info");
      return;
    }

    const invalidRows = siswaArray.filter(
      (s) => !s.noInduk || !s.nama || !s.kelas || !s.level || !s.cabang
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
      "<tr><th>noInduk</th><th>Nama</th><th>Kelas</th><th>Level</th><th>Cabang</th></tr>";
    siswaArray.forEach((s) => {
      htmlTable += `<tr><td>${s.noInduk}</td><td>${s.nama}</td><td>${s.kelas}</td><td>${s.level}</td><td>${s.cabang}</td></tr>`;
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

document.getElementById("excelNilaiInput").addEventListener("change", (e) => {
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
      header: [
        "nama",
        "kelas",
        "level",
        "cabang",
        "reading",
        "listening",
        "writing",
        "speaking",
        "matematika",
      ],
      range: 1,
    });

    if (siswaArray.length === 0) {
      Swal.fire("Kosong", "Tidak ada data ditemukan dalam file.", "info");
      return;
    }

    const invalidRows = siswaArray.filter(
      (s) =>
        !s.nama ||
        !s.kelas ||
        !s.level ||
        !s.cabang ||
        !s.reading ||
        !s.listening ||
        !s.writing ||
        !s.speaking
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
      "<tr><th>Nama</th><th>Kelas</th><th>Level</th><th>Cabang</th><th>Reading</th><th>Listening</th><th>Writing</th><th>Speaking</th><th>Matematika</th></tr>";
    siswaArray.forEach((s) => {
      htmlTable += `<tr><td>${s.nama}</td><td>${s.kelas}</td><td>${s.level}</td><td>${s.cabang}</td><td>${s.reading}</td><td>${s.listening}</td><td>${s.writing}</td><td>${s.speaking}</td><td>${s.matematika}</td></tr>`;
    });
    htmlTable += "</table>";

    Swal.fire({
      title: "Preview Data",
      html: htmlTable,
      width: "70%",
      confirmButtonText: "Cek & Simpan",
      showCancelButton: true,
      cancelButtonText: "Batal",
      preConfirm: () => simpanNilaiTanpaDuplikat(siswaArray),
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

function initInputCari() {
  inputCari.addEventListener(
    "input",
    debounce(() => {
      if (daftarMuridCache.length === 0) {
        console.warn("⚠️ Cache murid belum siap");
        return;
      }

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

        document.getElementById("reading").value = data?.reading ?? "";
        document.getElementById("listening").value = data?.listening ?? "";
        document.getElementById("writing").value = data?.writing ?? "";
        document.getElementById("speaking").value = data?.speaking ?? "";
        document.getElementById("matematika").value = data?.matematika ?? "";

        formNilai.classList.remove("hidden");
      } else {
        hasilCari.textContent = "❌ Murid tidak ditemukan.";
        sembunyikanFormNilai();
      }
    }, 300)
  );
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

async function simpanNilaiTanpaDuplikat(siswaArray) {
  const total = siswaArray.length;
  let berhasil = 0;
  let duplikat = [];

  // Reset daftarMuridCache sebelum proses baru dimulai
  daftarMuridCache = [];

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

    // Pengecekan duplikat di Firestore
    const querySnapshot = await getDocs(
      query(collection(db, "nilai"), where("nama", "==", siswa.nama))
    );

    if (!querySnapshot.empty) {
      // Jika ada data yang sudah ada di Firestore, tandai sebagai duplikat
      duplikat.push(siswa.nama);
    } else {
      // Jika tidak ada duplikat, simpan data ke Firestore
      const docRef = await addDoc(collection(db, "nilai"), siswa);
      // Tambahkan siswa ke cache
      daftarMuridCache.push({ id: docRef.id, ...siswa });
      berhasil++;
    }

    // Update progress bar
    const percent = Math.floor(((i + 1) / total) * 100);
    document.getElementById("progressBar").style.width = `${percent}%`;
    document.getElementById("progressText").textContent = `${
      i + 1
    } / ${total} diproses`;
  }

  // Setelah selesai, tampilkan notifikasi
  Swal.fire({
    icon: duplikat.length ? "warning" : "success",
    title: "Selesai",
    html: `✅ ${berhasil} berhasil disimpan.<br>❌ Duplikat: ${
      duplikat.length > 0 ? duplikat.join(", ") : "Tidak ada"
    }`,
  });

  // Reset input file setelah selesai
  document.getElementById("excelNilaiInput").value = "";
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

// === DEBOUNCE UTILITY
function debounce(func, delay = 300) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

// inputCari.addEventListener(
//   "input",
//   debounce(() => {
//     const keyword = inputCari.value.trim().toLowerCase();
//     if (!keyword) {
//       console.log("⛔ Keyword kosong. Tidak mencari apa pun.");
//       return sembunyikanFormNilai();
//     }

//     // ✅ Lihat isi cache murid dan nilai saat ini
//     console.log("📦 Cache Murid:", daftarMuridCache);
//     console.log("📦 Cache Nilai:", nilaiCache);

//     const hasil = daftarMuridCache.find((m) =>
//       m.nama.toLowerCase().includes(keyword)
//     );

//     if (hasil) {
//       console.log("✅ Ditemukan di cache murid:", hasil);

//       muridDipilih = hasil;
//       hasilCari.textContent = `Ditemukan: ${hasil.nama} (Kelas ${hasil.kelas}, Level ${hasil.level}, Cabang ${hasil.cabang})`;
//       judulFormNilai.textContent = `Input / Edit nilai untuk ${hasil.nama}`;

//       const nilai = nilaiCache.find(
//         (n) => n.nama.toLowerCase() === hasil.nama.toLowerCase()
//       );

//       console.log("📥 Nilai ditemukan di cache:", nilai);

//       document.getElementById("reading").value = nilai?.reading ?? "";
//       document.getElementById("listening").value = nilai?.listening ?? "";
//       document.getElementById("writing").value = nilai?.writing ?? "";
//       document.getElementById("speaking").value = nilai?.speaking ?? "";
//       document.getElementById("matematika").value = nilai?.matematika ?? "";

//       formNilai.classList.remove("hidden");
//     } else {
//       console.log("❌ Tidak ditemukan di cache murid");
//       hasilCari.textContent = "❌ Murid tidak ditemukan.";
//       sembunyikanFormNilai();
//     }
//   }, 300)
// );

document
  .getElementById("simpanNilaiBtn")
  .addEventListener("click", async () => {
    if (!muridDipilih) return Swal.fire("❌ Belum memilih murid.");

    const nilai = {
      noInduk: muridDipilih.noInduk || "",
      nama: muridDipilih.nama,
      reading: parseInt(document.getElementById("reading").value) || null,
      listening: parseInt(document.getElementById("listening").value) || null,
      writing: parseInt(document.getElementById("writing").value) || null,
      speaking: parseInt(document.getElementById("speaking").value) || null,
      matematika: parseInt(document.getElementById("matematika").value) || null,
      tanggal: new Date().toISOString(),
    };

    Swal.fire({
      title: "Menyimpan nilai...",
      didOpen: () => Swal.showLoading(),
    });

    try {
      await setDoc(doc(db, "nilai", muridDipilih.nama.toLowerCase()), nilai, {
        merge: true,
      });

      // ✅ Update nilaiCache LOKAL
      const index = nilaiCache.findIndex((n) => n.nama === muridDipilih.nama);
      if (index !== -1) nilaiCache[index] = { ...nilaiCache[index], ...nilai };
      else nilaiCache.push({ id: muridDipilih.nama.toLowerCase(), ...nilai });

      Swal.fire("✅ Nilai disimpan", "", "success");
      resetFormNilai();
      sembunyikanFormNilai();
      renderNilaiMuridPage(nilaiCache, currentPageNilai); // opsional
    } catch (err) {
      console.error(err);
      Swal.fire("❌ Gagal menyimpan nilai", "", "error");
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
        <h3>${data.nama} - ${data.cabang}, Kelas ${data.kelas}, Level ${
        data.level
      }</h3>
        <p>📖 Reading: ${data.reading !== null ? data.reading : "menunggu"}</p>
        <p>🎧 Listening: ${
          data.listening !== null ? data.listening : "menunggu"
        }</p>
        <p>✍️ Writing: ${data.writing !== null ? data.writing : "menunggu"}</p>
        <p>🗣️ Speaking: ${
          data.speaking !== null ? data.speaking : "menunggu"
        }</p>
        <p>🔢 Matematika: ${
          data.matematika !== null ? data.matematika : "menunggu"
        }</p>
      </div>
    `;
    } else {
      hasilNilai.textContent = "❌ Nilai tidak ditemukan.";
    }
  }, 500)
);

function renderMuridTablePage(data, page = 1) {
  const daftarMurid = document.getElementById("daftarMurid");
  daftarMurid.innerHTML = "";

  const sorted = [...data].sort((a, b) =>
    String(a.noInduk || "").localeCompare(String(b.noInduk || ""))
  );

  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedItems = sorted.slice(start, end);

  paginatedItems.forEach((murid) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="sticky-col">${murid.noInduk || "-"}</td>
      <td>${murid.nama}</td>
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

      document.getElementById("editNoInduk").value = data.noInduk || "";
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
      noInduk: document.getElementById("editNoInduk").value.trim(),
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

      // ✅ Update cache
      const index = daftarMuridCache.findIndex((m) => m.id === editDocId);
      if (index !== -1) {
        daftarMuridCache[index] = { id: editDocId, ...updatedData };
      }

      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Data murid berhasil disimpan.",
        timer: 1500,
        showConfirmButton: false,
      });

      // ✅ Tutup modal & render ulang tabel
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

// Export nilai

document
  .getElementById("btnExportNilai")
  .addEventListener("click", async () => {
    if (nilaiCache.length === 0) {
      return Swal.fire(
        "Kosong",
        "Belum ada data nilai untuk diekspor.",
        "info"
      );
    }

    Swal.fire({
      title: "Mengekspor data...",
      text: "Mohon tunggu, sedang menyiapkan file Excel.",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      const dataExport = nilaiCache.map((d) => ({
        Noinduk: d.noInduk || "",
        Nama: d.nama || "",
        Reading: d.reading ?? "",
        Listening: d.listening ?? "",
        Writing: d.writing ?? "",
        Speaking: d.speaking ?? "",
        Matematika: d.matematika ?? "",
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

document
  .getElementById("exportReadingToSheet")
  .addEventListener("click", async () => {
    if (nilaiCache.length === 0) {
      return Swal.fire(
        "Kosong",
        "Belum ada data nilai untuk diekspor.",
        "info"
      );
    }

    Swal.fire({
      title: "Mengekspor data...",
      text: "Mohon tunggu, sedang mengirim nilai Reading ke BAVIC...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    const readings = [...nilaiCache]
      .sort((a, b) =>
        String(a.noInduk || "").localeCompare(String(b.noInduk || ""))
      )
      .map((n) => n.reading ?? "");

    const endpoint =
      "https://script.google.com/macros/s/AKfycbx2GJAPS3ljc8H1vydX-H9DKgvbt0MxpEk2A3XMf8psR3xGJWdf4MTKqT99EgXYa6Z32g/exec";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: JSON.stringify(readings),
        headers: { "Content-Type": "application/json" },
      });

      const text = await res.text();
      Swal.fire(
        "✅ Sukses",
        `Data Reading berhasil dikirim: ${text}`,
        "success"
      );
    } catch (err) {
      console.error("❌ Gagal kirim:", err);
      Swal.fire("❌ Gagal", "Tidak bisa kirim data ke spreadsheet", "error");
    }
  });

// Render nilai murid
function renderNilaiMuridPage(data, page = 1) {
  const tbody = document.getElementById("daftarNilaiMurid");
  tbody.innerHTML = "";

  const sorted = [...data].sort((a, b) =>
    String(a.noInduk || "").localeCompare(String(b.noInduk || ""))
  );

  const start = (page - 1) * itemsPerPageNilai;
  const end = start + itemsPerPageNilai;
  const paginatedItems = sorted.slice(start, end);

  paginatedItems.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${item.noInduk}</td>
      <td class="sticky-col">${item.nama}</td>
      <td>${item.reading !== null ? item.reading : "menunggu"}</td>
      <td>${item.listening !== null ? item.listening : "menunggu"}</td>
      <td>${item.writing !== null ? item.writing : "menunggu"}</td>
      <td>${item.speaking !== null ? item.speaking : "menunggu"}</td>
      <td>${
        item.matematika !== null ? item.matematika : "menunggu"
      }</td> <!-- Tambahkan kolom untuk nilai matematika -->
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
    document.getElementById("editMatematika").value = data.matematika ?? "";

    Swal.close();
    const modal = document.getElementById("modalEditNilai");
    modal.classList.remove("hidden");
    requestAnimationFrame(() => modal.classList.add("show"));
  }
});

// Simpan Edit Nilai
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
      matematika:
        parseInt(document.getElementById("editMatematika")?.value) || null,
    };

    Swal.fire({
      title: "Menyimpan...",
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading(),
    });

    try {
      await setDoc(doc(db, "nilai", editNilaiId), updated, { merge: true });

      // ✅ Update nilaiCache lokal
      const index = nilaiCache.findIndex((item) => item.id === editNilaiId);
      if (index !== -1) {
        nilaiCache[index] = { ...nilaiCache[index], ...updated };
      }

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

      // ✅ render ulang langsung dari cache
      renderNilaiMuridPage(nilaiCache, currentPageNilai);
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

// Hapus Nilai
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("btn-delete-nilai")) {
    const id = e.target.dataset.id;
    const nama = e.target.dataset.nama;

    const konfirmasi = await Swal.fire({
      icon: "warning",
      title: `Hapus Nilai?`,
      text: `Yakin ingin menghapus nilai murid "${nama}"?`,
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

      // Update nilaiCache secara langsung
      // Update nilaiCache secara langsung
      nilaiCache = nilaiCache.filter((item) => item.id !== id); // Hapus nilai dari cache

      Swal.fire("✅ Berhasil", "Data nilai berhasil dihapus.", "success");

      // Render ulang daftar nilai murid
      loadDataNilaiMurid(); // Memanggil fungsi untuk memuat data nilai murid
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
  [
    "editReading",
    "editListening",
    "editWriting",
    "editSpeaking",
    "editMatematika",
  ].forEach((id) => {
    const select = document.getElementById(id);
    select.innerHTML = "";
    nilaiOptions.forEach((val) => {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = val === "" ? id.replace("edit", "") : val;
      select.appendChild(option);
    });
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  await loadCaches(); // ✅ Ambil semua data murid dan nilai sekali saja
  tampilkanMurid(); // ✅ Render daftar murid
  renderNilaiMuridPage(nilaiCache, currentPageNilai); // ✅ Render nilai dari cache
  isiOpsiNilaiSelect();
  // exportReadingToSheet();
  initInputCari(); // ⬅️ tambahkan ini di sini
});
