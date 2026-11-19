import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatNA, formatTemperature, formatDate } from "./formatters";

const BRAND_BURGUNDY: [number, number, number] = [112, 9, 31]; // #70091f
const BRAND_GOLD: [number, number, number] = [138, 111, 80];   // #8a6f50
const TEXT_DARK: [number, number, number] = [40, 40, 40];
const BORDER_COLOR: [number, number, number] = [232, 223, 212];

/**
 * Helper to dynamically load the official TCC logo as a compressed data URL
 */
async function loadLogoDataUrl(): Promise<string | null> {
    if (typeof window === "undefined") return null;
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.onload = () => {
                try {
                    const canvas = document.createElement("canvas");
                    canvas.width = 160;
                    canvas.height = 160;
                    const ctx = canvas.getContext("2d");
                    if (!ctx) return resolve(null);
                    ctx.drawImage(img, 0, 0, 160, 160);
                    resolve(canvas.toDataURL("image/jpeg", 0.92));
                } catch {
                    resolve(null);
                }
            };
            img.onerror = () => resolve(null);
            img.src = "/tcc-logo.jpg";
        } catch {
            resolve(null);
        }
    });
}

/**
 * Export Monthly Clinic Report as a professional PDF
 */
export async function exportMonthlyReportPDF(reportData: {
    report?: {
        period?: string;
        month_name?: string;
        year?: number;
        generated_at?: string;
    };
    summary?: {
        total_visits?: number;
        student_visits?: number;
        students_treated?: number;
        faculty_visits?: number;
        staff_visits?: number;
    };
    reasons?: Array<{ reason: string; count: number }>;
    common_illnesses?: Array<{ illness: string; count: number }>;
    medicine_usage?: Array<{
        medicine_name: string;
        unit: string;
        quantity_used: number;
    }>;
    visits?: Array<{
        id: number;
        date: string;
        person: string;
        person_type: string;
        department?: string;
        reason: string;
        symptoms?: string;
        temperature?: string;
        blood_pressure?: string;
        medicine?: string;
        medicine_quantity?: number | string;
        nurse?: string;
    }>;
}) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoData = await loadLogoDataUrl();

    // Header Background Accent (Height 26mm)
    doc.setFillColor(112, 9, 31);
    doc.rect(0, 0, pageWidth, 26, "F");

    // TCC Logo on the Right Upper
    if (logoData) {
        doc.addImage(logoData, "JPEG", pageWidth - 14 - 18, 4, 18, 18);
    }

    // Clinic Title & Subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.text("TAGOLOAN COMMUNITY COLLEGE", 14, 10.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("HEALTH SERVICES CLINIC — CAMPUS CLINIC MANAGEMENT SYSTEM", 14, 16);

    doc.setFontSize(7);
    doc.text("Baluarte, Tagoloan, Misamis Oriental · clinic@tcc.edu.ph", 14, 21);

    // Period & Report Title
    const periodText = reportData.report?.period || `${reportData.report?.month_name || "Monthly"} ${reportData.report?.year || ""}`;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`REPORT PERIOD: ${periodText.toUpperCase()}`, pageWidth - 36, 17, { align: "right" });

    // Document Meta
    let currentY = 32;
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12.5);
    doc.text("MONTHLY CLINIC ACTIVITY & HEALTH REPORT", 14, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const genDate = reportData.report?.generated_at
        ? new Date(reportData.report.generated_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
        : new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    doc.text(`Generated: ${genDate} | Scope: All recorded clinic visits for ${periodText}`, 14, currentY + 5);

    currentY += 12;

    // Summary Statistics Cards Table
    const summary = reportData.summary || {};
    const totalVisits = Number(summary.total_visits || 0);
    const studentsTreated = Number(summary.students_treated ?? summary.student_visits ?? 0);
    const studentVisits = Number(summary.student_visits || 0);
    const facultyVisits = Number(summary.faculty_visits || 0);
    const staffVisits = Number(summary.staff_visits || 0);

    autoTable(doc, {
        startY: currentY,
        head: [["Total Visits", "Students Treated", "Student Visits", "Faculty Visits", "Staff Visits"]],
        body: [[
            String(totalVisits),
            String(studentsTreated),
            String(studentVisits),
            String(facultyVisits),
            String(staffVisits),
        ]],
        theme: "plain",
        headStyles: {
            fillColor: [245, 240, 235],
            textColor: [112, 9, 31],
            fontStyle: "bold",
            fontSize: 9,
            halign: "center",
        },
        bodyStyles: {
            textColor: [40, 40, 40],
            fontSize: 12,
            fontStyle: "bold",
            halign: "center",
        },
        styles: {
            cellPadding: 4,
            lineColor: BORDER_COLOR,
            lineWidth: 0.2,
        },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Common Reasons & Common Illnesses Tables
    const reasons = (reportData.reasons || []).slice(0, 5);
    const illnesses = (reportData.common_illnesses || []).slice(0, 5);

    // Reasons Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(112, 9, 31);
    doc.text("TOP REASONS FOR CONSULTATION", 14, currentY);

    autoTable(doc, {
        startY: currentY + 3,
        head: [["Consultation Reason", "Count", "% of Visits"]],
        body: reasons.length > 0 ? reasons.map(r => [
            formatNA(r.reason),
            String(r.count),
            totalVisits > 0 ? `${Math.round((r.count / totalVisits) * 100)}%` : "0%",
        ]) : [["No consultation records for this period", "-", "-"]],
        theme: "striped",
        headStyles: {
            fillColor: BRAND_BURGUNDY,
            textColor: [255, 255, 255],
            fontSize: 8.5,
        },
        bodyStyles: {
            fontSize: 8,
            textColor: TEXT_DARK,
        },
        styles: { cellPadding: 2.5 },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;

    // Common Illnesses Table (matches on-screen & print report)
    if (illnesses.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(112, 9, 31);
        doc.text("COMMON ILLNESSES & SYMPTOMS", 14, currentY);

        autoTable(doc, {
            startY: currentY + 3,
            head: [["Illness / Reported Symptom", "Reported Cases", "% of Visits"]],
            body: illnesses.map(i => [
                formatNA(i.illness),
                String(i.count),
                totalVisits > 0 ? `${Math.round((i.count / totalVisits) * 100)}%` : "0%",
            ]),
            theme: "striped",
            headStyles: {
                fillColor: [140, 40, 60],
                textColor: [255, 255, 255],
                fontSize: 8.5,
            },
            bodyStyles: {
                fontSize: 8,
                textColor: TEXT_DARK,
            },
            styles: { cellPadding: 2.5 },
            margin: { left: 14, right: 14 },
        });

        currentY = (doc as any).lastAutoTable.finalY + 7;
    }

    // Medicines Given Table
    const meds = (reportData.medicine_usage || []).slice(0, 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(112, 9, 31);
    doc.text("MEDICINES DISPENSED & QUANTITIES", 14, currentY);

    autoTable(doc, {
        startY: currentY + 3,
        head: [["Medicine / Supply Name", "Quantity Given", "Unit"]],
        body: meds.length > 0 ? meds.map(m => [
            formatNA(m.medicine_name),
            String(m.quantity_used),
            formatNA(m.unit),
        ]) : [["No medicines were dispensed during this period", "-", "-"]],
        theme: "striped",
        headStyles: {
            fillColor: BRAND_GOLD,
            textColor: [255, 255, 255],
            fontSize: 8.5,
        },
        bodyStyles: {
            fontSize: 8,
            textColor: TEXT_DARK,
        },
        styles: { cellPadding: 2.5 },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Detailed Visits Log
    const visits = reportData.visits || [];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(112, 9, 31);
    doc.text(`CLINIC VISITS LOG (${visits.length} Records)`, 14, currentY);

    autoTable(doc, {
        startY: currentY + 3,
        head: [["Date", "Patient Name", "Category", "Department", "Reason / Symptoms", "Temp", "BP", "Medication", "Nurse"]],
        body: visits.length > 0 ? visits.map(v => [
            formatDate(v.date),
            formatNA(v.person),
            formatNA(v.person_type),
            formatNA(v.department),
            formatNA(v.reason) + (v.symptoms && v.symptoms !== v.reason ? `\n(${v.symptoms})` : ""),
            formatTemperature(v.temperature),
            formatNA(v.blood_pressure),
            v.medicine ? `${v.medicine} (${v.medicine_quantity || 1})` : "None",
            formatNA(v.nurse),
        ]) : [["No clinic visits recorded for this period", "-", "-", "-", "-", "-", "-", "-", "-"]],
        theme: "grid",
        headStyles: {
            fillColor: BRAND_BURGUNDY,
            textColor: [255, 255, 255],
            fontSize: 7.5,
            halign: "center",
        },
        bodyStyles: {
            fontSize: 7,
            textColor: TEXT_DARK,
            valign: "middle",
        },
        columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 28 },
            2: { cellWidth: 16 },
            3: { cellWidth: 26 },
            4: { cellWidth: 34 },
            5: { cellWidth: 14, halign: "center" },
            6: { cellWidth: 14, halign: "center" },
            7: { cellWidth: 18 },
            8: { cellWidth: 14 },
        },
        styles: { cellPadding: 2 },
        margin: { left: 14, right: 14, bottom: 15 },
        didDrawPage: (data) => {
            // Footer on each page
            const pageNum = doc.getNumberOfPages();
            doc.setFontSize(7.5);
            doc.setTextColor(120, 120, 120);
            doc.text("Tagoloan Community College — Health Services Clinic — Official Monthly Report", 14, doc.internal.pageSize.getHeight() - 8);
            doc.text(`Page ${data.pageNumber} of ${pageNum}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
        },
    });

    // Official Endorsement & Signatures
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY + 30 > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        finalY = 22;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);

    // Prepared by
    doc.text("Prepared by:", 14, finalY);
    doc.line(14, finalY + 12, 75, finalY + 12);
    doc.setFont("helvetica", "bold");
    doc.text("Clinic Staff / Attending Nurse", 14, finalY + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text("Health Services Clinic · Tagoloan Community College", 14, finalY + 20);

    // Noted by
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text("Noted by:", pageWidth - 75, finalY);
    doc.line(pageWidth - 75, finalY + 12, pageWidth - 14, finalY + 12);
    doc.setFont("helvetica", "bold");
    doc.text("College Administration", pageWidth - 75, finalY + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text("Tagoloan Community College", pageWidth - 75, finalY + 20);

    const safeFilename = `TCC_Clinic_Monthly_Report_${(reportData.report?.period || "report").replace(/\s+/g, "_")}.pdf`;
    doc.save(safeFilename);
}

/**
 * Export Individual Student Medical Report as a professional PDF
 */
export async function exportStudentMedicalReportPDF(
    student: {
        student_id: string;
        full_name?: string;
        first_name: string;
        middle_name?: string;
        last_name: string;
        course: string;
        year_level: string;
        section?: string;
        department?: string;
        sex?: string;
        birth_date?: string;
        contact_number?: string;
        address?: string;
    },
    visits: Array<{
        id: number;
        visit_date: string;
        reason: string;
        symptoms?: string;
        temperature?: string;
        blood_pressure?: string;
        assessment?: string;
        treatment?: string;
        medicine_name?: string;
        medicine_quantity?: number | string;
        nurse_name?: string;
        remarks?: string;
        department?: string;
    }>,
    totalVisitsCount: number
) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const logoData = await loadLogoDataUrl();

    // Burgundy Header Banner (Height 26mm)
    doc.setFillColor(112, 9, 31);
    doc.rect(0, 0, pageWidth, 26, "F");

    // TCC Logo on the Right Upper
    if (logoData) {
        doc.addImage(logoData, "JPEG", pageWidth - 14 - 18, 4, 18, 18);
    }

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13.5);
    doc.text("TAGOLOAN COMMUNITY COLLEGE", 14, 10.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("HEALTH SERVICES CLINIC — STUDENT MEDICAL RECORD", 14, 16);

    doc.setFontSize(7);
    doc.text("Baluarte, Tagoloan, Misamis Oriental · clinic@tcc.edu.ph", 14, 21);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("CONFIDENTIAL MEDICAL HISTORY", pageWidth - 36, 17, { align: "right" });

    // Document Subheading
    let currentY = 32;
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("INDIVIDUAL STUDENT MEDICAL REPORT", 14, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 100, 100);
    const genDate = new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
    doc.text(`Generated on: ${genDate} | Authorized Clinic Personnel Copy`, 14, currentY + 5);

    currentY += 12;

    // Student Profile Table
    const fullName = student.full_name || [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(" ");
    const academicInfo = `${student.course || "N/A"} - ${student.year_level || "N/A"}${student.section ? ` (${student.section})` : ""}`;
    const department = student.department || "N/A";

    autoTable(doc, {
        startY: currentY,
        head: [["Student Profile Information", "Academic & Contact Details"]],
        body: [
            [`Student ID: ${formatNA(student.student_id)}\nFull Name: ${fullName}\nSex: ${formatNA(student.sex)}\nDate of Birth: ${formatDate(student.birth_date)}`,
             `Course & Year: ${academicInfo}\nDepartment: ${department}\nContact Number: ${formatNA(student.contact_number)}\nAddress: ${formatNA(student.address)}`]
        ],
        theme: "plain",
        headStyles: {
            fillColor: BRAND_BURGUNDY,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 9,
        },
        bodyStyles: {
            textColor: TEXT_DARK,
            fontSize: 8.5,
        },
        styles: {
            cellPadding: 4,
            lineColor: BORDER_COLOR,
            lineWidth: 0.2,
        },
        margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;

    // Consultation History Table
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(112, 9, 31);
    doc.text(`CHRONOLOGICAL CLINIC CONSULTATION HISTORY (${totalVisitsCount} Consultations)`, 14, currentY);

    autoTable(doc, {
        startY: currentY + 3,
        head: [["Date", "Reason & Symptoms", "Vitals", "Assessment & Diagnosis", "Treatment Provided", "Medication Dispensed", "Attending Nurse", "Remarks"]],
        body: visits.length > 0 ? visits.map(v => [
            formatDate(v.visit_date),
            `${formatNA(v.reason)}${v.symptoms && v.symptoms !== v.reason ? `\nSymptoms: ${v.symptoms}` : ""}`,
            `Temp: ${formatTemperature(v.temperature)}\nBP: ${formatNA(v.blood_pressure)}`,
            formatNA(v.assessment),
            formatNA(v.treatment),
            v.medicine_name ? `${v.medicine_name} (${v.medicine_quantity || 1})` : "None",
            formatNA(v.nurse_name),
            formatNA(v.remarks),
        ]) : [["No clinic visits recorded for this student", "-", "-", "-", "-", "-", "-", "-"]],
        theme: "grid",
        headStyles: {
            fillColor: BRAND_BURGUNDY,
            textColor: [255, 255, 255],
            fontSize: 8,
            halign: "center",
        },
        bodyStyles: {
            fontSize: 7.5,
            textColor: TEXT_DARK,
            valign: "top",
        },
        columnStyles: {
            0: { cellWidth: 18 },
            1: { cellWidth: 32 },
            2: { cellWidth: 20 },
            3: { cellWidth: 26 },
            4: { cellWidth: 26 },
            5: { cellWidth: 22 },
            6: { cellWidth: 20 },
            7: { cellWidth: 18 },
        },
        styles: { cellPadding: 2.5 },
        margin: { left: 14, right: 14, bottom: 15 },
        didDrawPage: (data) => {
            const pageNum = doc.getNumberOfPages();
            doc.setFontSize(7.5);
            doc.setTextColor(130, 130, 130);
            doc.text("Tagoloan Community College — Health Services Clinic — Confidential Student Medical History Record", 14, doc.internal.pageSize.getHeight() - 8);
            doc.text(`Page ${data.pageNumber} of ${pageNum}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
        },
    });

    // Verification & Endorsement Signature
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY + 30 > doc.internal.pageSize.getHeight() - 15) {
        doc.addPage();
        finalY = 22;
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.text("Certified True & Correct:", 14, finalY);
    doc.line(14, finalY + 12, 75, finalY + 12);
    doc.setFont("helvetica", "bold");
    doc.text("Attending Clinic Nurse / Physician", 14, finalY + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(110, 110, 110);
    doc.text("Health Services Clinic · Tagoloan Community College", 14, finalY + 20);

    const safeId = (student.student_id || "Student").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`TCC_Medical_Report_${safeId}.pdf`);
}

export interface MedicalCertificateData {
    patient_name: string;
    student_id?: string;
    role_label?: string;
    address?: string;
    visit_date: string;
    diagnosis?: string;
    reason?: string;
    symptoms?: string;
    temperature?: string | number;
    blood_pressure?: string;
    treatment?: string;
    rest_days?: string | number;
    remarks?: string;
    attending_nurse?: string;
}

/**
 * Export official Medical Certificate matching Philippine clinic standards
 * with official TCC logo in the upper right.
 */
export async function exportMedicalCertificatePDF(cert: MedicalCertificateData) {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const logoData = await loadLogoDataUrl();

    // 1. Official Header with Logo on the Right Upper
    if (logoData) {
        doc.addImage(logoData, "JPEG", pageWidth - 14 - 24, 12, 24, 24);
    }

    doc.setTextColor(50, 50, 50);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("Republic of the Philippines", 14, 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(112, 9, 31); // TCC Burgundy
    doc.text("TAGOLOAN COMMUNITY COLLEGE", 14, 23);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text("HEALTH SERVICES & CAMPUS CLINIC", 14, 29);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text("Baluarte, Tagoloan, Misamis Oriental · clinic@tcc.edu.ph", 14, 34);

    // Decorative Burgundy Accent Line
    doc.setDrawColor(112, 9, 31);
    doc.setLineWidth(1.2);
    doc.line(14, 42, pageWidth - 14, 42);
    doc.setDrawColor(210, 210, 210);
    doc.setLineWidth(0.4);
    doc.line(14, 43.5, pageWidth - 14, 43.5);

    // 2. Document Title (Centered & Bold)
    let y = 60;
    doc.setTextColor(20, 20, 20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.text("MEDICAL CERTIFICATE", pageWidth / 2, y, { align: "center" });

    // 3. Date (Upper Right)
    y = 74;
    const issueDate = cert.visit_date ? formatDate(cert.visit_date) : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Date: ${issueDate}`, pageWidth - 14, y, { align: "right" });

    // 4. Salutation
    y = 90;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text("To Whom It May Concern:", 14, y);

    // 5. Certification Paragraph matching user's reference
    y = 104;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);

    const patientName = cert.patient_name || "the patient named herein";
    const patientAddress = cert.address && cert.address !== "N/A" ? cert.address : "Tagoloan, Misamis Oriental";
    const visitDateStr = cert.visit_date ? formatDate(cert.visit_date) : "the indicated consultation date";

    const p1 = `THIS IS TO CERTIFY that ${patientName} of ${patientAddress} was examined and treated at the Tagoloan Community College Health Services Clinic on ${visitDateStr} with the following diagnosis:`;
    
    const linesP1 = doc.splitTextToSize(p1, pageWidth - 28);
    doc.text(linesP1, 14, y);
    y += (linesP1.length * 6.5) + 10;

    // 6. Clinical Diagnosis Card / Underlined box
    const diagnosisText = cert.diagnosis || cert.symptoms || cert.reason || "Clinical Consultation & Treatment";
    const vitalsText = `Vital Signs: Temperature: ${formatTemperature(cert.temperature)}  |  Blood Pressure: ${formatNA(cert.blood_pressure)}`;

    doc.setFillColor(252, 250, 248);
    doc.setDrawColor(180, 150, 140);
    doc.setLineWidth(0.5);
    doc.roundedRect(14, y, pageWidth - 28, 28, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(112, 9, 31);
    doc.text("DIAGNOSIS / FINDINGS:", 19, y + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(20, 20, 20);
    doc.text(diagnosisText, 19, y + 16);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(90, 90, 90);
    doc.text(vitalsText, 19, y + 23);

    y += 40;

    // 7. Rest Period / Medical Attention Recommendation
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);

    const restDays = cert.rest_days ? `${cert.rest_days} day(s)` : (cert.remarks || "one (1) day");
    const recommendation = `And would need medical attention / rest for ${restDays} barring complication.`;
    const linesRec = doc.splitTextToSize(recommendation, pageWidth - 28);
    doc.text(linesRec, 14, y);
    y += (linesRec.length * 6.5) + 6;

    if (cert.treatment && cert.treatment !== "N/A" && cert.treatment !== "-") {
        const treatText = `Treatment Provided: ${cert.treatment}`;
        const linesTreat = doc.splitTextToSize(treatText, pageWidth - 28);
        doc.text(linesTreat, 14, y);
        y += (linesTreat.length * 6.5) + 6;
    }

    // 8. Purpose Note
    y += 10;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text("Note: This certificate is issued upon the request of the patient for institutional / academic validation purposes only.", 14, y);

    // 9. Attending Nurse / Healthcare Officer Signature Block on the Bottom Right
    const sigY = pageHeight - 65;
    const sigX = pageWidth - 80;

    doc.setDrawColor(60, 60, 60);
    doc.setLineWidth(0.6);
    doc.line(sigX, sigY, pageWidth - 14, sigY);

    const nurseName = cert.attending_nurse || "Angel Stacee Sabandal";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(20, 20, 20);
    doc.text(nurseName, sigX + ((pageWidth - 14 - sigX) / 2), sigY + 5.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(80, 80, 80);
    doc.text("Attending Clinic Nurse", sigX + ((pageWidth - 14 - sigX) / 2), sigY + 10.5, { align: "center" });
    doc.text("Tagoloan Community College Clinic", sigX + ((pageWidth - 14 - sigX) / 2), sigY + 14.5, { align: "center" });

    // 10. Official Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text("TCC Health Services Clinic · Baluarte, Tagoloan, Misamis Oriental · Est. 2003", 14, pageHeight - 10);
    doc.text("Valid with Official Clinic Stamp", pageWidth - 14, pageHeight - 10, { align: "right" });

    const safeId = (cert.student_id || cert.patient_name || "Patient").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`TCC_Medical_Certificate_${safeId}.pdf`);
}
