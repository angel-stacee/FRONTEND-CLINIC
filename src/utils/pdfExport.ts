import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatNA, formatTemperature, formatDate } from "./formatters";

const BRAND_BURGUNDY: [number, number, number] = [112, 9, 31]; // #70091f
const BRAND_GOLD: [number, number, number] = [138, 111, 80];   // #8a6f50
const TEXT_DARK: [number, number, number] = [40, 40, 40];
const BORDER_COLOR: [number, number, number] = [232, 223, 212];

/**
 * Export Monthly Clinic Report as a professional PDF
 */
export function exportMonthlyReportPDF(reportData: {
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

    // Header Background Accent
    doc.setFillColor(112, 9, 31);
    doc.rect(0, 0, pageWidth, 24, "F");

    // Clinic Title & Subtitle
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("TAGOLOAN COMMUNITY COLLEGE CLINIC", 14, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("HEALTH SERVICES & CAMPUS CLINIC MANAGEMENT SYSTEM", 14, 18);

    // Period & Report Title
    const periodText = reportData.report?.period || `${reportData.report?.month_name || "Monthly"} ${reportData.report?.year || ""}`;
    doc.setFontSize(8);
    doc.text(`REPORT PERIOD: ${periodText.toUpperCase()}`, pageWidth - 14, 18, { align: "right" });

    // Document Meta
    let currentY = 32;
    doc.setTextColor(TEXT_DARK[0], TEXT_DARK[1], TEXT_DARK[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("MONTHLY CLINIC ACTIVITY & HEALTH REPORT", 14, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
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

    // Common Reasons & Common Illnesses Tables side by side
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
        head: [["Date", "Patient Name", "Category", "Department", "Reason / Symptoms", "Temp", "BP", "Medication"]],
        body: visits.length > 0 ? visits.map(v => [
            formatDate(v.date),
            formatNA(v.person),
            formatNA(v.person_type),
            formatNA(v.department),
            formatNA(v.reason) + (v.symptoms && v.symptoms !== v.reason ? `\n(${v.symptoms})` : ""),
            formatTemperature(v.temperature),
            formatNA(v.blood_pressure),
            v.medicine ? `${v.medicine} (${v.medicine_quantity || 1})` : "None",
        ]) : [["No clinic visits recorded for this period", "-", "-", "-", "-", "-", "-", "-"]],
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
            valign: "middle",
        },
        columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 32 },
            2: { cellWidth: 18 },
            3: { cellWidth: 28 },
            4: { cellWidth: 36 },
            5: { cellWidth: 15, halign: "center" },
            6: { cellWidth: 15, halign: "center" },
            7: { cellWidth: 20 },
        },
        styles: { cellPadding: 2 },
        margin: { left: 14, right: 14, bottom: 15 },
        didDrawPage: (data) => {
            // Footer on each page
            const pageNum = doc.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(120, 120, 120);
            doc.text("TCC Clinic Management System — Official Monthly Report", 14, doc.internal.pageSize.getHeight() - 8);
            doc.text(`Page ${data.pageNumber} of ${pageNum}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
        },
    });

    const safeFilename = `TCC_Clinic_Monthly_Report_${(reportData.report?.period || "report").replace(/\s+/g, "_")}.pdf`;
    doc.save(safeFilename);
}

/**
 * Export Individual Student Medical Report as a professional PDF
 */
export function exportStudentMedicalReportPDF(
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

    // Burgundy Header Banner
    doc.setFillColor(112, 9, 31);
    doc.rect(0, 0, pageWidth, 24, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text("TAGOLOAN COMMUNITY COLLEGE CLINIC", 14, 11);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("HEALTH SERVICES & CAMPUS CLINIC — STUDENT MEDICAL RECORD", 14, 18);

    doc.setFontSize(8);
    doc.text("CONFIDENTIAL MEDICAL HISTORY", pageWidth - 14, 18, { align: "right" });

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
            doc.text("TCC Clinic — Confidential Student Medical History Record", 14, doc.internal.pageSize.getHeight() - 8);
            doc.text(`Page ${data.pageNumber} of ${pageNum}`, doc.internal.pageSize.getWidth() - 14, doc.internal.pageSize.getHeight() - 8, { align: "right" });
        },
    });

    const safeId = (student.student_id || "Student").replace(/[^a-zA-Z0-9]/g, "_");
    doc.save(`TCC_Medical_Report_${safeId}.pdf`);
}
