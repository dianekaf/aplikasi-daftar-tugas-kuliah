import './style.css';
import type {
  DaftarTugas, 
  PrioritasTugas,
  StatusTugas,
  TugasKuliah,
} from './types';
import { ambilDataLokal, simpanDataLokal } from './types';

const KUNCI_STORAGE = 'data_tugas_kuliah_v1';

const namaAplikasi: string = import.meta.env.VITE_APP_TITLE || 'DAFTAR TUGAS KULIAH';
const versiAplikasi: string = import.meta.env.VITE_APP_VERSION || '1.0.0';

let daftarTugas: DaftarTugas = ambilDataLokal<DaftarTugas>(KUNCI_STORAGE, []);
let idEditAktif: number | null = null;

function amankanTeks(teks: string): string {
  const elemen = document.createElement('div');
  elemen.textContent = teks;
  return elemen.innerHTML;
}

function normalisasiDeadline(deadline: string): string {
  return deadline.includes('T') ? deadline : `${deadline}T23:59`;
}

function formatTanggalWaktu(deadline: string): string {
  const waktu = new Date(normalisasiDeadline(deadline));
  if (Number.isNaN(waktu.getTime())) return deadline;

  return waktu.toLocaleString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }) + ' WIB';
}

function hitungMundur(deadline: string, status: StatusTugas): {teks: string; terlambat: boolean}
{
  if (status === 'Selesai') {
    return {teks: 'Tugas Selesai', terlambat: false };
  }

  const targetWaktu = new Date(normalisasiDeadline(deadline)).getTime();
  const selisih = targetWaktu - Date.now();

  if (selisih <= 0) {
    return { teks: 'Waktu habis / Terlambat!', terlambat: true };
  }

  const hari = Math.floor(selisih / (1000 * 60 * 60 * 24));
  const jam = Math.floor((selisih / (1000 * 60 * 60)) % 24);
  const menit = Math.floor((selisih / (1000 * 60)) % 60);
  const detik = Math.floor((selisih / 1000) % 60);

  if (hari > 0) {
    return { teks: `${hari} hari ${jam} jam ${menit} menit lagi`, terlambat: false };
  }
  return { teks: `${jam} jam ${menit} menit ${detik} detik lagi`, terlambat: false };
}

function perbaruiWaktuLive(): void {
  const elemenJamSekarang = document.querySelector<HTMLSpanElement>('#waktu-sekarang');
  if (elemenJamSekarang) {
    elemenJamSekarang.textContent = new Date().toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }) + ' WIB';
  }

  const semuaElemenCountdown = document.querySelectorAll<HTMLSpanElement>('[data-countdown-id]');
  semuaElemenCountdown.forEach((elemen) => {
    const id = Number(elemen.dataset.countdownId);
    const tugas = daftarTugas.find((item) => item.id === id);
    if (!tugas) return;

    const hasil = hitungMundur(tugas.deadline, tugas.status);
    elemen.textContent = hasil.teks;
    elemen.className = `badge-countdown ${
      tugas.status === 'Selesai'
        ? 'countdown-selesai'
        : hasil.terlambat
          ? 'countdown-terlambat'
          : 'countdown-aktif'
    }`;
  });
}

function renderAplikasi(): void {
  const app = document.querySelector<HTMLDivElement>('#app');
  if (!app) return;

  const tugasDiedit = idEditAktif !== null 
    ? daftarTugas.find((item) => item.id === idEditAktif) 
    : undefined;

  const totalTugas: number = daftarTugas.length;
  const totalSelesai: number = daftarTugas.filter(
    (item) => item.status === 'Selesai'
  ).length;
  const totalBelum: number = totalTugas - totalSelesai;

  app.innerHTML = `
    <main class="container">
      <header class="header">
        <div>
          <h1>${amankanTeks(namaAplikasi)}</h1>
          <p class="subtitle">Kelola jadwal dan tenggat tugas kuliah secara terstruktur</p>         
          <p class="info-waktu-live">Waktu Sekarang: <span id="waktu-sekarang">Memuat waktu...</span></p>
        </div>
        <span class="badge-versi">v${amankanTeks(versiAplikasi)}</span>
      </header>

      <section class="ringkasan-grid">
        <div class="kartu-stat">
          <span class="stat-label">Total Tugas</span>
          <strong class="stat-angka">${totalTugas}</strong>
        </div>
        <div class="kartu-stat">
          <span class="stat-label">Belum Selesai</span>
          <strong class="stat-angka teks-peringatan">${totalBelum}</strong>
        </div>
        <div class="kartu-stat">
          <span class="stat-label">Selesai</span>
          <strong class="stat-angka teks-sukses">${totalSelesai}</strong>
        </div>
      </section>

      <section class="panel-form">
        <h2>${tugasDiedit ? 'Edit Tugas Kuliah' : 'Tambah Tugas Baru'}</h2>
        <p class="subtitle" style="margin-bottom: 12px;">Menampilkan <strong>${totalTugas}</strong> tugas kuliah yang tercatat di penyimpanan lokal.</p>
        <form id="form-tugas" class="form-grid">
          <div class="grup-input">
            <label for="input-judul">Judul Tugas</label>
            <input
              type="text"
              id="input-judul"
              placeholder="Contoh: Tugas Pertemuan 1"
              value="${tugasDiedit ? amankanTeks(tugasDiedit.judul) : ''}"
              required
            />
          </div>
          
          <div class="grup-input">
           <label for="input-matkul">Mata Kuliah</label>
           <input
              type="text"
              id="input-matkul"
              placeholder="Contoh: Pengembangan Aplikasi Web"
              value="${tugasDiedit ? amankanTeks(tugasDiedit.mataKuliah) : ''}"
              required
            />
          </div>

          <div class="grup-input">
           <label for="input-deadline">Tenggat Waktu (Deadline)</label>
           <input
              type="datetime-local"
              id="input-deadline"
              value="${tugasDiedit ? normalisasiDeadline(tugasDiedit.deadline) : ''}"
              required
            />
          </div>

          <div class="grup-input">
           <label for="select-prioritas">Tingkat Prioritas</label>
           <select id="select-prioritas">
            <option value="Rendah" ${tugasDiedit?.prioritas === 'Rendah' ? 'selected' : ''}>Rendah</option>
            <option value="Sedang" ${!tugasDiedit || tugasDiedit.prioritas === 'Sedang' ? 'selected' : ''}>Sedang</option>
            <option value="Tinggi" ${tugasDiedit?.prioritas === 'Tinggi' ? 'selected' : ''}>Tinggi</option>
            </select>
          </div>

          <div class="grup-checkbox">
            <input
              type="checkbox"
              id="check-penting"
              ${tugasDiedit?.isPenting ? 'checked' : ''}
            />
            <label for="check-penting">Tandai sebagai tugas prioritas penting</label>
          </div>

          <div class="grup-aksi-form">
            <button type="submit" class="btn btn-utama">
              ${tugasDiedit ? 'Simpan Perubahan' : '+ Tambah Tugas'}
            </button>
            ${tugasDiedit ? '<button type="button" id="btn-batal-edit" class="btn btn-sekunder">Batal</button>' : ''}
          </div>
        </form>
      </section>

      <section class="panel-daftar">
        <h2>Daftar Tugas Kuliah</h2>
        ${
          daftarTugas.length === 0
            ? '<p class="kosong-info">Belum ada tugas kuliah yang dicatat. Tambahkan tugas pertamamu di atas.</p>'
            : `<div class="daftar-kartu">
                ${daftarTugas.map((tugas) => `
                  <article class="kartu-tugas ${tugas.status === 'Selesai' ? 'tugas-selesai' : ''}">
                    <div class="kartu-header">
                      <span class="badge-matkul">${amankanTeks(tugas.mataKuliah)}</span>
                      <div class="badge-grup">
                        ${tugas.isPenting ? '<span class="badge-penting">Penting</span>' : ''}
                        <span class="badge-prioritas prioritas-${tugas.prioritas.toLowerCase()}">${tugas.prioritas}</span>
                      </div>
                    </div>

                    <h3 class="judul-tugas">${amankanTeks(tugas.judul)}</h3>
                    <p class="info-deadline">Deadline: <strong>${formatTanggalWaktu(tugas.deadline)}</strong> &bull; Status: <strong>${tugas.status}</strong></p>
                    <p class="baris-countdown">
                      Sisa Waktu: <span data-countdown-id="${tugas.id}" class="badge-countdown">${hitungMundur(tugas.deadline, tugas.status).teks}</span>
                    </p>

                    <div class="kartu-aksi">
                      <button type="button" class="btn-kecil btn-status" data-aksi="toggle" data-id="${tugas.id}">
                        ${tugas.status === 'Belum Selesai' ? 'Tandai Selesai' : 'Batal Selesai'}
                      </button>
                      <button type="button" class="btn-kecil btn-edit" data-aksi="edit" data-id="${tugas.id}">
                        Edit
                      </button>
                      <button type="button" class="btn-kecil btn-hapus" data-aksi="hapus" data-id="${tugas.id}">
                        Hapus
                      </button>
                    </div>
                  </article>
                `
                  )
                  
                  .join('')}
              </div>`
        }
      </section>
      <footer class="footer">
      <p>${amankanTeks(namaAplikasi)} &bull; Dibangun dengan Vite & TypeScript</p>
    </footer>
    </main>
  `;

  pasangEventListener();
  perbaruiWaktuLive();
}

function pasangEventListener(): void {
  const form = document.querySelector<HTMLFormElement>('#form-tugas');
  const inputJudul = document.querySelector<HTMLInputElement>('#input-judul');
  const inputMatkul = document.querySelector<HTMLInputElement>('#input-matkul');
  const inputDeadline = document.querySelector<HTMLInputElement>('#input-deadline');
  const selectPrioritas = document.querySelector<HTMLSelectElement>('#select-prioritas');
  const checkPenting = document.querySelector<HTMLInputElement>('#check-penting');
  const btnBatalEdit = document.querySelector<HTMLButtonElement>('#btn-batal-edit');

  if (!form || !inputJudul || !inputMatkul || !inputDeadline || !selectPrioritas || !checkPenting) {
    return;
  }

  form.addEventListener('submit', (event: SubmitEvent) => {
    event.preventDefault();

    const judul = inputJudul.value.trim();
    const mataKuliah = inputMatkul.value.trim();
    const deadline = inputDeadline.value;
    const prioritas= selectPrioritas.value as PrioritasTugas;
    const isPenting = checkPenting.checked;

    if (!judul || !mataKuliah || !deadline) return;

    if (idEditAktif !== null){
      daftarTugas = daftarTugas.map((tugas) =>
        tugas.id === idEditAktif 
          ? {...tugas, judul, mataKuliah, deadline, prioritas, isPenting } 
          : tugas 
      );
      idEditAktif = null;
    } else {
      const tugasBaru: TugasKuliah = {
        id: Date.now(),
        judul,
        mataKuliah,
        deadline,
        prioritas,
        status: 'Belum Selesai',
        isPenting,
      };
      daftarTugas = [tugasBaru, ...daftarTugas];
    }
    
    simpanDataLokal<DaftarTugas>(KUNCI_STORAGE, daftarTugas);
    renderAplikasi();
  });

  
    if (btnBatalEdit) {
      btnBatalEdit.addEventListener('click', () => {
        idEditAktif = null;
        renderAplikasi();
      });
    }



const semuaTombolAksi = document.querySelectorAll<HTMLButtonElement>('[data-aksi]');
semuaTombolAksi.forEach((tombol) => {
  tombol.addEventListener('click', () => {
    const aksi = tombol.dataset.aksi;
    const id = Number(tombol.dataset.id);

    if (aksi === 'toggle') {
      daftarTugas = daftarTugas.map((tugas) => {
        if (tugas.id !== id) return tugas;
        const statusBaru: StatusTugas = tugas.status === 'Belum Selesai' ? 'Selesai' : 'Belum Selesai' ;
        return { ...tugas, status: statusBaru };
      });
      simpanDataLokal<DaftarTugas>(KUNCI_STORAGE, daftarTugas);
      renderAplikasi();
    } else if (aksi === 'edit') {
      idEditAktif = id;
      renderAplikasi();
    } else if (aksi === 'hapus') {
      if (idEditAktif === id) idEditAktif = null;
      daftarTugas = daftarTugas.filter((tugas) => tugas.id !== id);
      simpanDataLokal<DaftarTugas>(KUNCI_STORAGE, daftarTugas);
      renderAplikasi();
    }
  });
});
}

renderAplikasi();
renderAplikasi();
setInterval(perbaruiWaktuLive, 1000);