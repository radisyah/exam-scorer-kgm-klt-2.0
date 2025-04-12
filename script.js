import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  collection,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDY0AOViUoiGszsIxrnT54O5wTE70lwGmA",
  authDomain: "aplikasi-input-nilai-ujian.firebaseapp.com",
  projectId: "aplikasi-input-nilai-ujian",
  storageBucket: "aplikasi-input-nilai-ujian.firebasestorage.app",
  messagingSenderId: "193921895444",
  appId: "1:193921895444:web:5104b5124792c097636b01",
  measurementId: "G-793WCRN5WL",
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
let muridDipilih = null;

let siswaArray = [];

const urlParams = new URLSearchParams(window.location.search);
const akses = urlParams.get("akses");

if (akses === "xyz123") {
  document.querySelector("#siswa-container").style.display = "block";
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

async function simpanTanpaDuplikat(siswaArray) {
  const total = siswaArray.length;
  let berhasil = 0;
  let duplikat = [];

  // Tampilkan sweetalert dengan progress
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

    // Cek duplikat berdasarkan nama
    const q = query(collection(db, "murid"), where("nama", "==", siswa.nama));
    const existing = await getDocs(q);

    if (!existing.empty) {
      duplikat.push(siswa.nama);
    } else {
      await addDoc(collection(db, "murid"), {
        nama: siswa.nama,
        kelas: siswa.kelas,
        level: siswa.level,
        cabang: siswa.cabang,
        hari: siswa.hari || "-",
      });
      berhasil++;
    }

    // Update progress bar
    const percent = Math.floor(((i + 1) / total) * 100);
    document.getElementById("progressBar").style.width = `${percent}%`;
    document.getElementById("progressText").textContent = `${
      i + 1
    } / ${total} diproses`;
  }

  // Final feedback
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
    (id) => {
      document.getElementById(id).value = "";
    }
  );
}

function sembunyikanFormNilai() {
  formNilai.classList.add("hidden");
  hasilCari.textContent = "";
  inputCari.value = "";
  muridDipilih = null;
}

async function tampilkanMurid() {
  const snapshot = await getDocs(collection(db, "murid"));
  daftarMuridCache = snapshot.docs.map((doc) => doc.data());
  renderMuridTablePage(daftarMuridCache, currentPage);
}

async function muatDataMurid() {
  const snapshot = await getDocs(collection(db, "murid"));
  daftarMuridCache = snapshot.docs.map((doc) => doc.data());
}

document
  .getElementById("tambahMuridBtn")
  .addEventListener("click", async (e) => {
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
      muatDataMurid();
    } catch (err) {
      console.error("❌ Gagal menyimpan murid:", err);
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text: "Terjadi kesalahan saat menyimpan data murid.",
      });
    }
  });

inputCari.addEventListener("input", async () => {
  const keyword = inputCari.value.toLowerCase();
  if (!keyword) {
    sembunyikanFormNilai();
    return;
  }

  const hasil = daftarMuridCache.find((murid) =>
    murid.nama.toLowerCase().includes(keyword)
  );

  if (hasil) {
    muridDipilih = hasil;
    hasilCari.textContent = `Ditemukan: ${hasil.nama} (Kelas ${hasil.kelas}, Level ${hasil.level}, Cabang ${hasil.cabang})`;
    judulFormNilai.textContent = `Input / Edit nilai untuk ${hasil.nama}`;

    formNilai.classList.remove("hidden");

    const docRef = doc(db, "nilai", hasil.nama.toLowerCase());
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      document.getElementById("reading").value = data.reading ?? "";
      document.getElementById("listening").value = data.listening ?? "";
      document.getElementById("writing").value = data.writing ?? "";
      document.getElementById("speaking").value = data.speaking ?? "";
      document.getElementById("matematika").value = data.matematika ?? "";
    } else {
      resetFormNilai();
    }
  } else {
    hasilCari.textContent = "❌ Murid tidak ditemukan.";
    sembunyikanFormNilai();
  }
});

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

cariNilaiInput.addEventListener("input", async () => {
  const keyword = cariNilaiInput.value.toLowerCase();
  hasilNilai.innerHTML = "";

  if (!keyword) return;

  const snapshot = await getDocs(collection(db, "nilai"));
  const data = snapshot.docs
    .map((doc) => doc.data())
    .find((d) => d.nama.toLowerCase().includes(keyword));

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
});

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
      <td class="baris-nama">${murid.nama}</td>
      <td>${murid.kelas}</td>
      <td>${murid.level}</td>
      <td>${murid.cabang}</td>
      <td><button class="btn-delete" data-nama="${murid.nama}">🗑 Hapus</button></td>
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

        Swal.fire("Berhasil!", `Murid "${nama}" berhasil dihapus.`, "success");
        tampilkanMurid(); // Refresh
      } catch (err) {
        console.error(err);
        Swal.fire("Gagal", "Terjadi kesalahan saat menghapus data.", "error");
      }
    });
  });
}

window.changePage = function (page) {
  currentPage = page;
  renderMuridTablePage(daftarMuridCache, currentPage);
};

window.addEventListener("DOMContentLoaded", () => {
  tampilkanMurid();
  muatDataMurid();
});
