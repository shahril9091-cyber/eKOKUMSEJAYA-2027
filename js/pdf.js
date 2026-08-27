/**
 * js/pdf.js
 * ---------------------------------------------------------
 * Penjana PDF sebenar untuk Laporan Aktiviti, eRPH, dan
 * Analisis Keseluruhan, menggunakan html2canvas + jsPDF.
 *
 * Laporan Aktiviti & eRPH: A4 POTRET, satu muka surat (font
 * dikecilkan secara terkawal jika kandungan melimpah — lihat
 * shrinkToFit_). Analisis Keseluruhan: A4 POTRET, disokong
 * berbilang muka surat (jadual boleh panjang ikut bilangan
 * murid/minggu — lihat addCanvasAsMultiPage_).
 * ---------------------------------------------------------
 */

const PdfGenerator = (() => {
  const SCHOOL_LOGO_URL = "https://i.postimg.cc/DZkdW8qn/Logo-SK-Seri-Jaya-Transparent.png";

  // ---- Laporan Aktiviti: A4 POTRET, satu muka surat ----
  const REPORT_PAGE_W_PX = 1050;
  const REPORT_PAGE_H_PX = 1485;

  function buildContainer_(report, images) {
    const container = document.createElement("div");
    container.id = "pdf-render-area";
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: ${REPORT_PAGE_W_PX}px; height: ${REPORT_PAGE_H_PX}px;
      background: #ffffff; color: #101826;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      padding: 44px 50px; box-sizing: border-box;
      display: flex; flex-direction: column;
    `;

    const pct = report.total > 0 ? Math.round((report.present / report.total) * 100) : 0;

    const imageSlotsHtml = [0, 1, 2, 3].map((i) => {
      const img = images[i];
      return `
        <div style="border:1px solid #dfe3ea; border-radius:6px; overflow:hidden; position:relative; aspect-ratio:4/3; background:#f4f6f9; display:flex; align-items:center; justify-content:center;">
          ${img && img.dataUri ? `<img src="${img.dataUri}" style="width:100%; height:100%; object-fit:cover;">`
                : `<span style="color:#8894a3; font-size:12px;">Gambar ${i + 1} tiada</span>`}
          <span style="position:absolute; bottom:0; left:0; right:0; background:rgba(11,31,58,0.78); color:#fff; font-size:10.5px; padding:3px 8px;">
            ${(img && img.caption) || ""}
          </span>
        </div>
      `;
    }).join("");

    container.innerHTML = `
      <div class="pdf-scale" style="text-align:center; margin-bottom:12px;">
        <img src="${SCHOOL_LOGO_URL}" crossorigin="anonymous" style="width:52px; height:52px; object-fit:contain; margin-bottom:4px;">
        <div style="font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; font-size:19px; color:#0b1f3a; letter-spacing:0.5px;">SK SERI JAYA</div>
        <div style="font-size:11.5px; color:#c99a3a; letter-spacing:0.6px; margin-top:2px;">BERILMU • BERTAQWA • ISTIQAMAH</div>
        <div style="font-size:14px; font-weight:700; margin-top:8px; color:#0b1f3a;">LAPORAN AKTIVITI KOKURIKULUM</div>
      </div>

      <div class="pdf-scale" style="display:grid; grid-template-columns:1fr 1fr; gap:5px 20px; font-size:12px; border-top:2px solid #0b1f3a; border-bottom:1px solid #dfe3ea; padding:9px 0; margin-bottom:10px;">
        <div><strong>Tarikh:</strong> ${report.date || "-"}</div>
        <div><strong>Hari:</strong> ${report.day || "-"}</div>
        <div><strong>Masa:</strong> ${(report.time_start || "-") + " - " + (report.time_end || "-")}</div>
        <div><strong>Tempat:</strong> ${report.venue || "-"}</div>
        <div><strong>Kategori:</strong> ${report.category || "-"}</div>
        <div><strong>Unit:</strong> ${report.unit || "-"}</div>
        <div><strong>Guru Penasihat:</strong> ${report.teacher || "-"}</div>
        <div><strong>Jumlah Murid:</strong> ${report.total || 0}</div>
        <div style="grid-column: span 2;"><strong>Hadir / Tidak Hadir:</strong> ${report.present || 0} / ${(report.total || 0) - (report.present || 0)} (${pct}%)</div>
      </div>

      <div class="pdf-scale" style="font-size:12px; line-height:1.45; margin-bottom:10px;">
        <div style="margin-bottom:5px;"><strong>Tajuk:</strong> ${report.title || "-"}</div>
        <div style="margin-bottom:5px;"><strong>Objektif:</strong> ${report.objective || "-"}</div>
        <div style="margin-bottom:5px;"><strong>Aktiviti:</strong> ${report.activity_description || "-"}</div>
        <div><strong>Hasil / Pencapaian:</strong> ${report.achievement || "-"}</div>
      </div>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; flex:1; margin-bottom:12px;">${imageSlotsHtml}</div>

      <div class="pdf-scale" style="display:grid; grid-template-columns:1fr 1fr; gap:30px; font-size:11.5px; margin-top:auto;">
        <div style="text-align:center;">
          <div style="margin-bottom:30px;">Disediakan oleh:</div>
          <div style="border-top:1px solid #101826; padding-top:4px;">${report.teacher || "................................"}<br><span style="color:#4b5768;">Guru Penasihat</span></div>
        </div>
        <div style="text-align:center;">
          <div style="margin-bottom:30px;">Disahkan oleh:</div>
          <div style="border-top:1px solid #101826; padding-top:4px;">................................<br><span style="color:#4b5768;">Penyelaras Kokurikulum, SK Seri Jaya</span></div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    return container;
  }

  // Kecilkan font secara berperingkat jika kandungan melimpah, supaya
  // kekal SATU muka surat — tanpa merosakkan susun atur.
  function shrinkToFit_(container, maxHeight) {
    let scale = 100;
    const minScale = 78;
    while (container.scrollHeight > maxHeight && scale > minScale) {
      scale -= 4;
      container.querySelectorAll(".pdf-scale").forEach((el) => {
        el.style.fontSize = scale + "%";
      });
    }
  }

  async function generateActivityReportPdf(report) {
    if (!window.jspdf || !window.html2canvas) {
      throw new Error("Library PDF belum dimuatkan. Semak sambungan internet dan muat semula halaman.");
    }

    let images = [];
    try {
      images = await Api.getImagesByReport(report.report_id);
      // Muat setiap gambar sebagai base64 MELALUI API sendiri (bukan terus
      // daripada drive.google.com) — mengelak isu CORS/"tainted canvas" yang
      // menyebabkan gambar senyap tidak terlukis oleh html2canvas walaupun
      // gambar sudah berjaya dimuat naik ke Drive. Lihat Images.gs.
      images = await Promise.all(images.map(async (img) => {
        try {
          const result = await Api.getImageBase64(img.drive_file_id);
          return { ...img, dataUri: `data:${result.mime_type};base64,${result.base64}` };
        } catch (e) {
          return { ...img, dataUri: "" }; // gambar ini akan dipaparkan sebagai "tiada" sahaja
        }
      }));
    } catch (e) {
      images = []; // laporan masih boleh dijana tanpa gambar
    }

    const container = buildContainer_(report, images);
    shrinkToFit_(container, REPORT_PAGE_H_PX);

    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, pageW, pageH, undefined, "FAST");

      const safeUnit = (report.unit || "Unit").replace(/[^a-zA-Z0-9]+/g, "_");
      const safeDate = (report.date || "").split("-").reverse().join("-"); // yyyy-MM-dd -> dd-MM-yyyy
      pdf.save(`Laporan_Aktiviti_${safeUnit}_${safeDate || "tarikh"}.pdf`);
    } finally {
      container.remove();
    }
  }

  // ---- eRPH: dokumen lebih ringkas, satu muka surat A4 potret ----
  function buildErphContainer_(erph) {
    const container = document.createElement("div");
    container.id = "pdf-erph-render-area";
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: 1050px; min-height: 1485px;
      background: #ffffff; color: #101826;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      padding: 50px 60px; box-sizing: border-box;
    `;
    container.innerHTML = `
      <div style="text-align:center; margin-bottom:18px;">
        <img src="${SCHOOL_LOGO_URL}" crossorigin="anonymous" style="width:52px; height:52px; object-fit:contain; margin-bottom:4px;">
        <div style="font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; font-size:19px; color:#0b1f3a;">SK SERI JAYA</div>
        <div style="font-size:11px; color:#c99a3a; letter-spacing:0.5px;">BERILMU • BERTAQWA • ISTIQAMAH</div>
        <div style="font-size:14px; font-weight:700; margin-top:8px;">RANCANGAN PENGAJARAN HARIAN (eRPH) KOKURIKULUM</div>
      </div>
      <table style="width:100%; border-collapse:collapse; font-size:12.5px; margin-bottom:16px;">
        ${erphRow_("Tarikh", erph.date)}${erphRow_("Hari", erph.day)}${erphRow_("Masa", (erph.time_start || "-") + " - " + (erph.time_end || "-"))}
        ${erphRow_("Unit", erph.unit)}${erphRow_("Guru Pembimbing", erph.teacher)}
      </table>
      ${erphBlock_("Tajuk / Aktiviti", erph.topic)}
      ${erphBlock_("Objektif", erph.objective)}
      ${erphBlock_("Aktiviti / Langkah", erph.activities)}
      ${erphBlock_("Nilai / Kemahiran", erph.values)}
      ${erphBlock_("Bahan / Peralatan", erph.materials)}
      ${erphBlock_("Refleksi", erph.reflection)}
      ${erphBlock_("Catatan", erph.remarks)}
    `;
    document.body.appendChild(container);
    return container;
  }

  function erphRow_(label, value) {
    return `<tr><td style="padding:5px 0; width:160px; color:#4b5768; vertical-align:top;">${label}</td><td style="padding:5px 0;">${value || "-"}</td></tr>`;
  }
  function erphBlock_(label, value) {
    return `<div style="margin-bottom:12px; font-size:12.5px;"><div style="font-weight:700; color:#0b1f3a; margin-bottom:3px;">${label}</div><div style="line-height:1.5;">${value || "-"}</div></div>`;
  }

  async function generateErphPdf(erph) {
    if (!window.jspdf || !window.html2canvas) {
      throw new Error("Library PDF belum dimuatkan. Semak sambungan internet dan muat semula halaman.");
    }
    const container = buildErphContainer_(erph);
    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const imgProps = pdf.getImageProperties(canvas.toDataURL("image/jpeg", 0.95));
      const imgH = (imgProps.height * pageW) / imgProps.width;
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, pageW, imgH);

      const safeUnit = (erph.unit || "Unit").replace(/[^a-zA-Z0-9]+/g, "_");
      const safeDate = (erph.date || "").split("-").reverse().join("-");
      pdf.save(`eRPH_${safeUnit}_${safeDate || "tarikh"}.pdf`);
    } finally {
      container.remove();
    }
  }

  // ---- Bantuan kongsi: lukis satu kanvas panjang merentasi BEBERAPA muka
  // surat PDF (bukan satu sahaja) — untuk dokumen jadual yang boleh jadi
  // panjang ikut bilangan murid/minggu, seperti Analisis Keseluruhan.
  function addCanvasAsMultiPage_(pdf, canvas) {
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    let heightLeft = imgH;
    let position = 0;

    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;

    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
  }

  // ---- Analisis Keseluruhan: jadual kehadiran murid ikut minggu ----
  function buildAnalysisContainer_(unitName, weeks, weekDates, rows) {
    const container = document.createElement("div");
    container.id = "pdf-analysis-render-area";
    container.style.cssText = `
      position: fixed; left: -9999px; top: 0;
      width: 1550px;
      background: #ffffff; color: #101826;
      font-family: 'Inter', 'Segoe UI', sans-serif;
      padding: 40px 46px; box-sizing: border-box;
    `;

    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

    const formatShortDate = (iso) => {
      if (!iso) return "";
      const [, m, d] = String(iso).split("-");
      return `${d}/${m}`;
    };

    const headerCells = weeks.map((w) => `
      <th style="padding:7px 4px; text-align:center; font-size:10px; white-space:nowrap;">
        Minggu ${w}${weekDates[w] ? `<br><span style="font-weight:400; opacity:0.85;">${formatShortDate(weekDates[w])}</span>` : ""}
      </th>
    `).join("");

    const bodyRows = rows.map((r, i) => `
      <tr style="background:${i % 2 ? "#f7f9fc" : "#ffffff"};">
        <td style="padding:7px 8px; border-bottom:1px solid #e1e6ee; font-size:11.5px;">${i + 1}</td>
        <td style="padding:7px 8px; border-bottom:1px solid #e1e6ee; font-size:11.5px; white-space:nowrap;">${r.name}</td>
        <td style="padding:7px 8px; border-bottom:1px solid #e1e6ee; font-size:11.5px; white-space:nowrap;">${r.kelas}</td>
        ${weeks.map((w) => {
          const status = r.byWeek[w];
          const symbol = status === "HADIR" ? "✓" : status === "TIDAK_HADIR" ? "✕" : status === "LEWAT" ? "L" : status === "BERSEBAB" ? "B" : "-";
          const color = status === "HADIR" ? "#1a8f5e" : status === "TIDAK_HADIR" ? "#c23b3b" : status ? "#b4790f" : "#c6cedb";
          return `<td style="padding:7px 4px; border-bottom:1px solid #e1e6ee; text-align:center; font-weight:700; color:${color}; font-size:12.5px;">${symbol}</td>`;
        }).join("")}
      </tr>
    `).join("");

    container.innerHTML = `
      <div style="text-align:center; margin-bottom:14px;">
        <img src="${SCHOOL_LOGO_URL}" crossorigin="anonymous" style="width:48px; height:48px; object-fit:contain; margin-bottom:4px;">
        <div style="font-family:'Plus Jakarta Sans',sans-serif; font-weight:800; font-size:18px; color:#0b1f3a;">SK SERI JAYA</div>
        <div style="font-size:10.5px; color:#c99a3a; letter-spacing:0.5px;">BERILMU • BERTAQWA • ISTIQAMAH</div>
        <div style="font-size:13.5px; font-weight:700; margin-top:8px; color:#0b1f3a;">ANALISIS KEHADIRAN MENGIKUT MINGGU</div>
        <div style="font-size:11.5px; color:#4b5768; margin-top:4px;">Unit: ${unitName} &nbsp;|&nbsp; Dijana pada ${dateStr}</div>
      </div>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#0b1f3a; color:#fff;">
            <th style="padding:7px 8px; text-align:left; font-size:10.5px;">#</th>
            <th style="padding:7px 8px; text-align:left; font-size:10.5px;">Nama Murid</th>
            <th style="padding:7px 8px; text-align:left; font-size:10.5px;">Kelas</th>
            ${headerCells}
          </tr>
        </thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <div style="margin-top:12px; font-size:10.5px; color:#4b5768;">Petunjuk: ✓ Hadir &nbsp; ✕ Tidak Hadir &nbsp; L Lewat &nbsp; B Bersebab &nbsp; - Tiada rekod</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:30px; font-size:11.5px; margin-top:36px; max-width:520px;">
        <div style="text-align:center;">
          <div style="margin-bottom:26px;">Disediakan oleh:</div>
          <div style="border-top:1px solid #101826; padding-top:4px;">................................<br><span style="color:#4b5768;">Guru Penasihat</span></div>
        </div>
        <div style="text-align:center;">
          <div style="margin-bottom:26px;">Disahkan oleh:</div>
          <div style="border-top:1px solid #101826; padding-top:4px;">................................<br><span style="color:#4b5768;">Penyelaras Kokurikulum</span></div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
    return container;
  }

  async function generateAnalysisPdf(unitName, weeks, weekDates, rows) {
    if (!window.jspdf || !window.html2canvas) {
      throw new Error("Library PDF belum dimuatkan. Semak sambungan internet dan muat semula halaman.");
    }
    const container = buildAnalysisContainer_(unitName, weeks, weekDates, rows);
    try {
      const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      addCanvasAsMultiPage_(pdf, canvas);

      const safeUnit = (unitName || "Unit").replace(/[^a-zA-Z0-9]+/g, "_");
      const dateStr = new Date().toISOString().slice(0, 10);
      pdf.save(`Analisis_Kehadiran_${safeUnit}_${dateStr}.pdf`);
    } finally {
      container.remove();
    }
  }

  return { generateActivityReportPdf, generateErphPdf, generateAnalysisPdf };
})();
