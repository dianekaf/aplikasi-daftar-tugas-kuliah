export type StatusTugas = 'Belum Selesai' | 'Selesai';
export type PrioritasTugas = 'Rendah' | 'Sedang' | 'Tinggi';

export interface TugasKuliah {
    id: number;
    judul: string;
    mataKuliah: string;
    deadline: string;
    prioritas: PrioritasTugas;
    status: StatusTugas;
    isPenting: boolean;
}

export type DaftarTugas = TugasKuliah[];

export function simpanDataLokal<T>(kunci: string, data: T): void {
    localStorage.setItem(kunci, JSON.stringify(data));
}

export function ambilDataLokal<T>(kunci: string, nilaiAwal: T): T {
    const dataTersimpan = localStorage.getItem(kunci);
    return dataTersimpan ? (JSON.parse(dataTersimpan) as T) : nilaiAwal;
}