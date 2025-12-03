import { useState, useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// API service - SESUAIKAN DENGAN BACKEND ANDA
const API_BASE = "https://medis-truba.vercel.app";

const apiService = {
  // Get all records
  getRecords: async () => {
    const response = await fetch(`${API_BASE}/api/records`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return data.data || []; // Sesuaikan dengan response structure backend
  },

  // Create new record
  createRecord: async (record) => {
    const response = await fetch(`${API_BASE}/api/records`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  // Update record
  updateRecord: async (id, record) => {
    const response = await fetch(`${API_BASE}/api/records/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(record),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  // Delete record
  deleteRecord: async (id) => {
    const response = await fetch(`${API_BASE}/api/records/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  // Delete all records
  deleteAllRecords: async () => {
    const response = await fetch(`${API_BASE}/api/records`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },
};

export default function App() {
  const [nama, setNama] = useState("");
  const [bn, setBn] = useState("");
  const [umur, setUmur] = useState("");
  const [jabatan, setJabatan] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [department, setDepartment] = useState("");
  const [sistolik, setSistolik] = useState("");
  const [diastolik, setDiastolik] = useState("");
  const [nadi, setNadi] = useState("");
  const [spo2, setSpo2] = useState("");
  const [suhu, setSuhu] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [catatan, setCatatan] = useState("");
  const [records, setRecords] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editingId, setEditingId] = useState(null); // ID untuk edit
  const [reportType, setReportType] = useState("daily");
  const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
  const [reportWeek, setReportWeek] = useState(getCurrentWeek());
  const [previewFitness, setPreviewFitness] = useState("");
  const [showAllRecords, setShowAllRecords] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fungsi untuk mendapatkan minggu saat ini dalam format YYYY-Www
  function getCurrentWeek() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const pastDaysOfYear = (now - startOfYear) / 86400000;
    return now.getFullYear() + "-W" + Math.ceil((pastDaysOfYear + 1) / 7);
  }

  // LOAD DATA DARI BACKEND SAAT AWAL
  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await apiService.getRecords();
      console.log("Data loaded:", data);
      setRecords(data || []);
    } catch (error) {
      console.error("Error loading records:", error);
      alert("Gagal memuat data dari server");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect untuk update preview status
  useEffect(() => {
    if (sistolik && diastolik && nadi && spo2 && suhu) {
      const status = getFitnessStatus(Number(sistolik), Number(diastolik), Number(nadi), Number(spo2), Number(suhu));
      setPreviewFitness(status);
    } else {
      setPreviewFitness("");
    }
  }, [sistolik, diastolik, nadi, spo2, suhu]);

  const getColor = (sys, dia) => {
    if (sys < 120 && dia < 80) return "bg-green-200";
    if ((sys >= 120 && sys <= 139) || (dia >= 80 && dia <= 89)) return "bg-yellow-200";
    if ((sys >= 140 && sys <= 159) || (dia >= 90 && dia <= 99)) return "bg-orange-300";
    return "bg-red-300";
  };

  const getBloodPressureStatus = (sys, dia) => {
    if (sys < 120 && dia < 80) return "Normal";
    if ((sys >= 120 && sys <= 139) || (dia >= 80 && dia <= 89)) return "Prehipertensi";
    if ((sys >= 140 && sys <= 159) || (dia >= 90 && dia <= 99)) return "Hipertensi Tahap 1";
    return "Hipertensi Tahap 2";
  };

  const getFitnessStatus = (sys, dia, nadi, spo2, suhu) => {
    // Cek tekanan darah
    let bpStatus = "FIT";
    if (sys >= 150 || dia >= 100) {
      bpStatus = "UNFIT";
    } else if ((sys >= 130 && sys < 150) || (dia >= 90 && dia < 100)) {
      bpStatus = "FIT WITH NOTE";
    }

    // Cek nadi
    let nadiStatus = "FIT";
    if (nadi > 130) {
      nadiStatus = "UNFIT";
    } else if (nadi >= 100 && nadi <= 130) {
      nadiStatus = "FIT WITH NOTE";
    }

    // Cek SpO2
    let spo2Status = "FIT";
    if (spo2 < 92) {
      spo2Status = "UNFIT";
    } else if (spo2 >= 92 && spo2 < 95) {
      spo2Status = "FIT WITH NOTE";
    }

    // Cek suhu
    let suhuStatus = "FIT";
    if (suhu >= 38) {
      suhuStatus = "UNFIT";
    } else if (suhu >= 37.5 && suhu < 38) {
      suhuStatus = "FIT WITH NOTE";
    }

    // Tentukan status akhir
    if (bpStatus === "UNFIT" || nadiStatus === "UNFIT" || spo2Status === "UNFIT" || suhuStatus === "UNFIT") {
      return "TIDAK FIT";
    }

    if (bpStatus === "FIT WITH NOTE" || nadiStatus === "FIT WITH NOTE" || spo2Status === "FIT WITH NOTE" || suhuStatus === "FIT WITH NOTE") {
      return "FIT WITH NOTE";
    }

    return "FIT";
  };

  const getFitnessColor = (status) => {
    if (status === "FIT") return "text-green-700 font-bold";
    if (status === "FIT WITH NOTE") return "text-orange-600 font-bold";
    return "text-red-700 font-bold";
  };

  const handleSubmit = async () => {
    if (!nama || !bn || !umur || !jabatan || !supervisor || !department || !sistolik || !diastolik || !nadi || !spo2 || !suhu || !tanggal) {
      alert("Semua field harus diisi!");
      return;
    }

    const fitnessStatus = getFitnessStatus(Number(sistolik), Number(diastolik), Number(nadi), Number(spo2), Number(suhu));

    if (fitnessStatus === "FIT WITH NOTE" && !catatan.trim()) {
      alert("Harap isi catatan untuk status FIT WITH NOTE");
      return;
    }

    const newRecord = {
      nama,
      bn,
      umur: Number(umur),
      jabatan,
      supervisor,
      dept: department,
      systolic: Number(sistolik),
      diastolic: Number(diastolik),
      nadi: Number(nadi),
      spo2: Number(spo2),
      suhu: Number(suhu),
      tanggal,
      time: new Date().toLocaleTimeString(),
      color: getColor(Number(sistolik), Number(diastolik)),
      fitness: fitnessStatus,
      catatan: fitnessStatus === "FIT WITH NOTE" ? catatan : "",
    };

    try {
      setLoading(true);

      if (editingId) {
        // Mode Edit
        await apiService.updateRecord(editingId, newRecord);
        alert("Data berhasil diupdate!");
      } else {
        // Mode Tambah
        await apiService.createRecord(newRecord);
        alert("Data berhasil ditambahkan!");
      }

      // Reload data dari server
      await loadRecords();
      resetForm();
    } catch (error) {
      console.error("Error saving record:", error);
      alert(`Gagal menyimpan data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (index) => {
    const record = records[index];
    setNama(record.nama);
    setBn(record.bn);
    setUmur(record.umur.toString());
    setJabatan(record.jabatan);
    setSupervisor(record.supervisor);
    setDepartment(record.dept);
    setSistolik(record.systolic.toString());
    setDiastolik(record.diastolic.toString());
    setNadi(record.nadi.toString());
    setSpo2(record.spo2.toString());
    setSuhu(record.suhu.toString());
    setTanggal(record.tanggal);
    setCatatan(record.catatan || "");
    setEditIndex(index);
    setEditingId(record._id);

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditIndex(null);
    setEditingId(null);
    resetForm();
  };

  const resetForm = () => {
    setNama("");
    setBn("");
    setUmur("");
    setJabatan("");
    setSupervisor("");
    setDepartment("");
    setSistolik("");
    setDiastolik("");
    setNadi("");
    setSpo2("");
    setSuhu("");
    setTanggal("");
    setCatatan("");
  };

  const handleDelete = async (index) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      try {
        const record = records[index];
        await apiService.deleteRecord(record._id);
        await loadRecords();
        alert("Data berhasil dihapus!");
      } catch (error) {
        console.error("Error deleting record:", error);
        alert("Gagal menghapus data");
      }
    }
  };

  const handleDeleteAll = async () => {
    if (window.confirm("Apakah Anda yakin ingin menghapus SEMUA data?")) {
      try {
        await apiService.deleteAllRecords();
        setRecords([]);
        alert("Semua data berhasil dihapus!");
      } catch (error) {
        console.error("Error deleting all records:", error);
        alert("Gagal menghapus semua data");
      }
    }
  };

  // Fungsi untuk mendapatkan data berdasarkan tanggal (daily)
  const getDailyRecords = () => {
    return records.filter((record) => record.tanggal === reportDate);
  };

  // Fungsi untuk mendapatkan data berdasarkan minggu (weekly)
  const getWeeklyRecords = () => {
    const [year, weekStr] = reportWeek.split("-W");
    const week = parseInt(weekStr);

    return records.filter((record) => {
      const recordDate = new Date(record.tanggal);
      const recordYear = recordDate.getFullYear();
      const startOfYear = new Date(recordYear, 0, 1);
      const pastDaysOfYear = (recordDate - startOfYear) / 86400000;
      const recordWeek = Math.ceil((pastDaysOfYear + 1) / 7);

      return recordYear === parseInt(year) && recordWeek === week;
    });
  };

  // Fungsi untuk mendapatkan data yang akan ditampilkan berdasarkan tipe laporan
  const getFilteredRecords = () => {
    if (showAllRecords) {
      return records;
    }
    if (reportType === "daily") {
      return getDailyRecords();
    } else {
      return getWeeklyRecords();
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF("landscape");
    const filteredRecords = getFilteredRecords();

    let reportTitle = "Laporan Kesehatan Karyawan";
    if (showAllRecords) {
      reportTitle = "Laporan Kesehatan Karyawan - Semua Data";
    } else if (reportType === "daily") {
      reportTitle = `Laporan Kesehatan Harian - ${new Date(reportDate).toLocaleDateString("id-ID")}`;
    } else {
      reportTitle = `Laporan Kesehatan Mingguan - ${reportWeek}`;
    }

    doc.setFontSize(18);
    doc.text(reportTitle, 14, 20);

    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 28);

    const tableData = filteredRecords.map((r) => [
      r.nama,
      r.bn,
      r.umur,
      r.jabatan,
      r.supervisor,
      r.dept,
      r.systolic,
      r.diastolic,
      r.nadi,
      r.spo2 + "%",
      r.suhu + "°C",
      r.tanggal,
      getBloodPressureStatus(r.systolic, r.diastolic),
      r.fitness,
      r.catatan || "-",
    ]);

    autoTable(doc, {
      head: [["Nama", "BN", "Umur", "Jabatan", "Supervisor", "Dept", "Sistolik", "Diastolik", "Nadi", "SpO2", "Suhu", "Tanggal", "Status TD", "Status Fit", "Catatan"]],
      body: tableData,
      startY: 35,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
      didDrawCell: (data) => {
        if (data.section === "body" && data.column.index === 12) {
          const status = data.cell.raw;
          if (status === "Normal") {
            data.cell.styles.fillColor = [187, 247, 208];
          } else if (status === "Prehipertensi") {
            data.cell.styles.fillColor = [254, 240, 138];
          } else if (status === "Hipertensi Tahap 1") {
            data.cell.styles.fillColor = [253, 186, 116];
          } else if (status === "Hipertensi Tahap 2") {
            data.cell.styles.fillColor = [252, 165, 165];
          }
        }
        if (data.section === "body" && data.column.index === 13) {
          const status = data.cell.raw;
          if (status === "FIT") {
            data.cell.styles.fillColor = [187, 247, 208];
            data.cell.styles.fontStyle = "bold";
          } else if (status === "FIT WITH NOTE") {
            data.cell.styles.fillColor = [253, 186, 116];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.fillColor = [252, 165, 165];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    let fileName = `laporan-kesehatan-${new Date().toLocaleDateString("id-ID")}`;
    if (showAllRecords) {
      fileName = `laporan-semua-data-${new Date().toLocaleDateString("id-ID")}`;
    } else if (reportType === "daily") {
      fileName = `laporan-harian-${reportDate}`;
    } else {
      fileName = `laporan-mingguan-${reportWeek}`;
    }
    doc.save(`${fileName}.pdf`);
  };

  const getStatistics = () => {
    const filteredRecords = getFilteredRecords();
    const total = filteredRecords.length;

    if (total === 0) {
      return { total: 0, fit: 0, fitWithNote: 0, unfit: 0 };
    }

    const fit = filteredRecords.filter((r) => r.fitness === "FIT").length;
    const fitWithNote = filteredRecords.filter((r) => r.fitness === "FIT WITH NOTE").length;
    const unfit = filteredRecords.filter((r) => r.fitness === "TIDAK FIT").length;

    return {
      total,
      fit,
      fitWithNote,
      unfit,
      fitPercentage: ((fit / total) * 100).toFixed(1),
      fitWithNotePercentage: ((fitWithNote / total) * 100).toFixed(1),
      unfitPercentage: ((unfit / total) * 100).toFixed(1),
    };
  };

  const stats = getStatistics();
  const filteredRecords = getFilteredRecords();

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Laporan Kesehatan Karyawan</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleDeleteAll}
            disabled={records.length === 0 || loading}
            className="bg-red-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            Hapus Semua
          </button>
          <button
            onClick={exportToPDF}
            disabled={filteredRecords.length === 0 || loading}
            className="bg-green-600 text-white px-3 sm:px-4 py-2 rounded hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Ekspor PDF
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {loading && <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">Memproses data...</div>}

      {/* FILTER LAPORAN */}
      <div className="bg-white p-4 rounded-lg border border-gray-300">
        <h2 className="text-lg font-semibold mb-3">Filter Laporan</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Tipe Laporan</label>
            <select className="border p-2 w-full rounded text-sm sm:text-base" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              <option value="daily">Harian</option>
              <option value="weekly">Mingguan</option>
            </select>
          </div>

          {reportType === "daily" ? (
            <div>
              <label className="block font-medium text-sm sm:text-base mb-1">Tanggal Laporan</label>
              <input type="date" className="border p-2 w-full rounded text-sm sm:text-base" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="block font-medium text-sm sm:text-base mb-1">Minggu Laporan</label>
              <input type="week" className="border p-2 w-full rounded text-sm sm:text-base" value={reportWeek} onChange={(e) => setReportWeek(e.target.value)} />
            </div>
          )}

          <div className="flex items-end">
            <button onClick={() => setShowAllRecords(!showAllRecords)} className={`${showAllRecords ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-600 hover:bg-gray-700"} text-white px-4 py-2 rounded text-sm sm:text-base w-full`}>
              {showAllRecords ? "Tampilkan Filter" : "Tampilkan Semua"}
            </button>
          </div>

          <div className="flex items-end">
            <div className="text-sm text-gray-600">
              <p>
                Total Data: <span className="font-bold">{stats.total}</span>
              </p>
              <p>
                Data Ditampilkan: <span className="font-bold">{filteredRecords.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* STATISTIK */}
      {filteredRecords.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <h2 className="text-lg font-semibold mb-3">Statistik Kesehatan</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-green-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-700">{stats.fit}</div>
              <div className="text-sm text-green-600">FIT</div>
              <div className="text-xs text-green-500">{stats.fitPercentage}%</div>
            </div>
            <div className="bg-orange-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-orange-700">{stats.fitWithNote}</div>
              <div className="text-sm text-orange-600">FIT WITH NOTE</div>
              <div className="text-xs text-orange-500">{stats.fitWithNotePercentage}%</div>
            </div>
            <div className="bg-red-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-red-700">{stats.unfit}</div>
              <div className="text-sm text-red-600">UNFIT</div>
              <div className="text-xs text-red-500">{stats.unfitPercentage}%</div>
            </div>
            <div className="bg-blue-100 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-700">{stats.total}</div>
              <div className="text-sm text-blue-600">TOTAL KARYAWAN</div>
            </div>
          </div>
        </div>
      )}

      {/* FORM */}
      <div className="bg-gray-100 p-3 sm:p-4 rounded-lg">
        {editIndex !== null && (
          <div className="mb-4 p-3 bg-blue-100 border border-blue-400 rounded flex justify-between items-center">
            <span className="text-blue-800 font-semibold">Mode Edit - Sedang mengedit data (ID: {editingId})</span>
            <button onClick={handleCancelEdit} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm">
              Batal Edit
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {/* Form fields tetap sama */}
          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Nama</label>
            <input type="text" className="border p-2 w-full rounded text-sm sm:text-base" value={nama} onChange={(e) => setNama(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">BN</label>
            <input type="text" className="border p-2 w-full rounded text-sm sm:text-base" value={bn} onChange={(e) => setBn(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Umur</label>
            <input type="number" className="border p-2 w-full rounded text-sm sm:text-base" value={umur} onChange={(e) => setUmur(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Jabatan</label>
            <input type="text" className="border p-2 w-full rounded text-sm sm:text-base" value={jabatan} onChange={(e) => setJabatan(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Supervisor</label>
            <input type="text" className="border p-2 w-full rounded text-sm sm:text-base" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Departemen</label>
            <input type="text" className="border p-2 w-full rounded text-sm sm:text-base" value={department} onChange={(e) => setDepartment(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Sistolik</label>
            <input type="number" className="border p-2 w-full rounded text-sm sm:text-base" value={sistolik} onChange={(e) => setSistolik(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Diastolik</label>
            <input type="number" className="border p-2 w-full rounded text-sm sm:text-base" value={diastolik} onChange={(e) => setDiastolik(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Nadi</label>
            <input type="number" className="border p-2 w-full rounded text-sm sm:text-base" value={nadi} onChange={(e) => setNadi(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Oksigen Darah (SpO2)</label>
            <input type="number" className="border p-2 w-full rounded text-sm sm:text-base" value={spo2} onChange={(e) => setSpo2(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Suhu Badan (°C)</label>
            <input type="number" step="0.1" className="border p-2 w-full rounded text-sm sm:text-base" value={suhu} onChange={(e) => setSuhu(e.target.value)} />
          </div>

          <div>
            <label className="block font-medium text-sm sm:text-base mb-1">Tanggal</label>
            <input type="date" className="border p-2 w-full rounded text-sm sm:text-base" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </div>

          {/* Preview Status Fitness */}
          {previewFitness && (
            <div className="col-span-1 sm:col-span-2 lg:col-span-3">
              <div className={`p-3 rounded-lg text-center font-bold ${getFitnessColor(previewFitness)}`}>
                Status Preview: {previewFitness}
                {previewFitness === "FIT WITH NOTE" && <div className="text-sm font-normal mt-1 text-orange-600">Catatan wajib diisi untuk status ini</div>}
              </div>
            </div>
          )}

          {/* Kolom Catatan */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3">
            <label className="block font-medium text-sm sm:text-base mb-1">Catatan (Wajib diisi jika status FIT WITH NOTE)</label>
            <textarea className="border p-2 w-full rounded text-sm sm:text-base" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Masukkan catatan khusus untuk status FIT WITH NOTE" rows="3" />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`${
              editIndex !== null ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700"
            } text-white px-4 py-2 rounded col-span-1 sm:col-span-2 lg:col-span-3 text-sm sm:text-base disabled:bg-gray-400 disabled:cursor-not-allowed`}
          >
            {loading ? "Memproses..." : editIndex !== null ? "Update Laporan" : "Tambah Laporan"}
          </button>
        </div>
      </div>

      {/* INFO LAPORAN */}
      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-blue-800">
            {showAllRecords
              ? `Menampilkan Semua Data (${filteredRecords.length} data)`
              : `Menampilkan ${reportType === "daily" ? "Laporan Harian" : "Laporan Mingguan"} -${reportType === "daily" ? ` Tanggal ${new Date(reportDate).toLocaleDateString("id-ID")}` : ` Minggu ${reportWeek}`} (${
                  filteredRecords.length
                } data)`}
          </span>
        </div>
      </div>

      {/* TABEL */}
      <div className="overflow-x-auto -mx-4 sm:mx-0">
        <div className="inline-block min-w-full align-middle">
          <div className="overflow-hidden border border-gray-300 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr className="bg-gray-300">
                  <th className="border p-2 text-xs sm:text-sm">Nama</th>
                  <th className="border p-2 text-xs sm:text-sm">BN</th>
                  <th className="border p-2 text-xs sm:text-sm hidden lg:table-cell">Umur</th>
                  <th className="border p-2 text-xs sm:text-sm hidden md:table-cell">Jabatan</th>
                  <th className="border p-2 text-xs sm:text-sm hidden xl:table-cell">Supervisor</th>
                  <th className="border p-2 text-xs sm:text-sm hidden lg:table-cell">Dept</th>
                  <th className="border p-2 text-xs sm:text-sm">Sistolik</th>
                  <th className="border p-2 text-xs sm:text-sm">Diastolik</th>
                  <th className="border p-2 text-xs sm:text-sm hidden md:table-cell">Nadi</th>
                  <th className="border p-2 text-xs sm:text-sm hidden lg:table-cell">SpO2</th>
                  <th className="border p-2 text-xs sm:text-sm hidden lg:table-cell">Suhu</th>
                  <th className="border p-2 text-xs sm:text-sm hidden xl:table-cell">Tanggal</th>
                  <th className="border p-2 text-xs sm:text-sm">Status Fit</th>
                  <th className="border p-2 text-xs sm:text-sm hidden lg:table-cell">Catatan</th>
                  <th className="border p-2 text-xs sm:text-sm">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {filteredRecords.map((r, i) => (
                  <tr key={i} className={r.color}>
                    <td className="border p-2 text-xs sm:text-sm">{r.nama}</td>
                    <td className="border p-2 text-xs sm:text-sm">{r.bn}</td>
                    <td className="border p-2 text-xs sm:text-sm hidden lg:table-cell">{r.umur}</td>
                    <td className="border p-2 text-xs sm:text-sm hidden md:table-cell">{r.jabatan}</td>
                    <td className="border p-2 text-xs sm:text-sm hidden xl:table-cell">{r.supervisor}</td>
                    <td className="border p-2 text-xs sm:text-sm hidden lg:table-cell">{r.dept}</td>
                    <td className="border p-2 text-xs sm:text-sm">{r.systolic}</td>
                    <td className="border p-2 text-xs sm:text-sm">{r.diastolic}</td>
                    <td className="border p-2 text-xs sm:text-sm hidden md:table-cell">{r.nadi}</td>
                    <td className="border p-2 text-xs sm:text-sm hidden lg:table-cell">{r.spo2}%</td>
                    <td className="border p-2 text-xs sm:text-sm hidden lg:table-cell">{r.suhu}°C</td>
                    <td className="border p-2 text-xs sm:text-sm hidden xl:table-cell">{r.tanggal}</td>
                    <td className={`border p-2 text-xs sm:text-sm text-center ${getFitnessColor(r.fitness)}`}>{r.fitness}</td>
                    <td className="border p-2 text-xs sm:text-sm hidden lg:table-cell">{r.catatan || "-"}</td>
                    <td className="border p-2 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => handleEdit(i)} className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs sm:text-sm inline-flex items-center gap-1" title="Edit data">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button onClick={() => handleDelete(i)} className="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs sm:text-sm inline-flex items-center gap-1" title="Hapus data">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                              fillRule="evenodd"
                              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          <span className="hidden sm:inline">Hapus</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {filteredRecords.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="mt-2">Tidak ada data {showAllRecords ? "" : reportType === "daily" ? "untuk tanggal ini" : "untuk minggu ini"}</p>
        </div>
      )}
    </div>
  );
}
