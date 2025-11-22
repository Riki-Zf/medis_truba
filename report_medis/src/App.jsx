import { useState, useEffect, useRef } from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip } from "chart.js";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

ChartJS.register(LineElement, CategoryScale, LinearScale, PointElement, Legend, Tooltip);

// API service
const API_BASE = "http://localhost:4000";

const apiService = {
  // Get all records
  getRecords: async () => {
    const response = await fetch(`${API_BASE}/records`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  // Create new record
  createRecord: async (record) => {
    const response = await fetch(`${API_BASE}/records`, {
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
    const response = await fetch(`${API_BASE}/records/${id}`, {
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
    const response = await fetch(`${API_BASE}/records/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  },

  // Delete all records
  deleteAllRecords: async () => {
    const response = await fetch(`${API_BASE}/records`, {
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
  const [records, setRecords] = useState([]); // Pastikan array kosong, bukan undefined
  const [editIndex, setEditIndex] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const chartRef = useRef(null);

  // LOAD DATA DARI BACKEND SAAT AWAL
  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    try {
      setLoading(true);
      const data = await apiService.getRecords();
      console.log("Data loaded:", data);
      setRecords(data || []); // Pastikan selalu array
    } catch (error) {
      console.error("Error loading records:", error);
      alert("Gagal memuat data dari server");
      setRecords([]); // Set ke array kosong jika error
    } finally {
      setLoading(false);
    }
  };

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
    const bpNormal = sys < 140 && dia < 90;
    const nadiNormal = nadi >= 60 && nadi <= 100;
    const spo2Normal = spo2 >= 95;
    const suhuNormal = suhu >= 36 && suhu <= 37.5;

    if (bpNormal && nadiNormal && spo2Normal && suhuNormal) {
      return "FIT";
    }
    return "TIDAK FIT";
  };

  const getFitnessColor = (status) => {
    return status === "FIT" ? "text-green-700 font-bold" : "text-red-700 font-bold";
  };

  const handleSubmit = async () => {
    if (!nama || !bn || !umur || !jabatan || !supervisor || !department || !sistolik || !diastolik || !nadi || !spo2 || !suhu || !tanggal) {
      alert("Semua field harus diisi!");
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
      fitness: getFitnessStatus(Number(sistolik), Number(diastolik), Number(nadi), Number(spo2), Number(suhu)),
    };

    try {
      setLoading(true);

      if (editingId) {
        // Mode Edit
        console.log("Updating record with ID:", editingId);
        await apiService.updateRecord(editingId, newRecord);
        alert("Data berhasil diupdate!");
      } else {
        // Mode Tambah
        console.log("Creating new record");
        await apiService.createRecord(newRecord);
        alert("Data berhasil ditambahkan!");
      }

      // Reload data dari server
      await loadRecords();

      // Reset form
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
    console.log("Editing record:", record);

    setNama(record.nama || "");
    setBn(record.bn || "");
    setUmur(record.umur?.toString() || "");
    setJabatan(record.jabatan || "");
    setSupervisor(record.supervisor || "");
    setDepartment(record.dept || "");
    setSistolik(record.systolic?.toString() || "");
    setDiastolik(record.diastolic?.toString() || "");
    setNadi(record.nadi?.toString() || "");
    setSpo2(record.spo2?.toString() || "");
    setSuhu(record.suhu?.toString() || "");
    setTanggal(record.tanggal || "");
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
  };

  const handleDelete = async (index) => {
    if (window.confirm("Apakah Anda yakin ingin menghapus data ini?")) {
      try {
        const record = records[index];
        console.log("Deleting record with ID:", record._id);
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

  // FUNGSI exportToPDF
  const exportToPDF = () => {
    const doc = new jsPDF("landscape");

    // Judul
    doc.setFontSize(18);
    doc.text("Laporan Kesehatan Karyawan", 14, 20);

    // Tanggal cetak
    doc.setFontSize(10);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`, 14, 28);

    // Tabel data - GUNAKAN records YANG SUDAH DIPASTIKAN ARRAY
    const tableData = (records || []).map((r) => [r.nama, r.bn, r.umur, r.jabatan, r.supervisor, r.dept, r.systolic, r.diastolic, r.nadi, r.spo2 + "%", r.suhu + "°C", r.tanggal, getBloodPressureStatus(r.systolic, r.diastolic), r.fitness]);

    autoTable(doc, {
      head: [["Nama", "BN", "Umur", "Jabatan", "Supervisor", "Dept", "Sistolik", "Diastolik", "Nadi", "SpO2", "Suhu", "Tanggal", "Status TD", "Status Fit"]],
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
          } else {
            data.cell.styles.fillColor = [252, 165, 165];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    // Tambahkan grafik
    if ((records || []).length > 0 && chartRef.current) {
      const chartImage = chartRef.current.toBase64Image();
      doc.addPage();
      doc.setFontSize(14);
      doc.text("Grafik Tekanan Darah", 14, 20);
      doc.addImage(chartImage, "PNG", 14, 30, 260, 100);
    }

    // Simpan PDF
    doc.save(`laporan-kesehatan-${new Date().toLocaleDateString("id-ID")}.pdf`);
  };

  // Data grafik - GUNAKAN records YANG SUDAH DIPASTIKAN ARRAY
  const chartData = {
    labels: (records || []).map((r) => r.tanggal || r.time),
    datasets: [
      {
        label: "Sistolik",
        data: (records || []).map((r) => r.systolic),
        borderWidth: 2,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.4)",
        tension: 0.3,
        pointRadius: 5,
      },
      {
        label: "Diastolik",
        data: (records || []).map((r) => r.diastolic),
        borderWidth: 2,
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.4)",
        tension: 0.3,
        pointRadius: 5,
      },
    ],
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Laporan Kesehatan Karyawan</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleDeleteAll}
            disabled={(records || []).length === 0 || loading}
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
            disabled={(records || []).length === 0 || loading}
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

      {/* TABEL - GUNAKAN records YANG SUDAH DIPASTIKAN ARRAY */}
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
                  <th className="border p-2 text-xs sm:text-sm">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {(records || []).map((r, i) => (
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

      {/* GRAFIK */}
      <div className="bg-white p-3 sm:p-4 rounded shadow">
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Grafik Tekanan Darah</h2>
        <div className="w-full h-64 sm:h-80 md:h-96">
          <Line ref={chartRef} data={chartData} options={{ maintainAspectRatio: false, responsive: true }} />
        </div>
      </div>
    </div>
  );
}
