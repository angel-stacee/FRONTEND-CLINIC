/**
 * Formatters and sanitizers for TCC Clinic Management System
 */

/**
 * Display "N/A" when optional fields have no input or recorded information.
 * Never displays null, undefined, or unwanted blank values.
 */
export function formatNA(value: any): string {
    if (value === null || value === undefined) {
        return "N/A";
    }

    const str = String(value).trim();
    if (str === "" || str === "-" || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") {
        return "N/A";
    }

    return str;
}

/**
 * Parses user input for temperature and standardizes to Celsius numeric string (e.g., "36.5").
 * If Fahrenheit (°F) is entered (e.g., "98.6 F", "98.6°F", or numeric > 50 without unit),
 * automatically converts it to Celsius using °C = (°F - 32) × 5/9.
 */
export function parseAndNormalizeTemperature(raw: string | number | null | undefined): string {
    if (raw === null || raw === undefined) {
        return "";
    }

    const str = String(raw).trim();
    if (str === "" || str === "-" || str.toLowerCase() === "null") {
        return "";
    }

    const isFahrenheit = /f/i.test(str) || (!/c/i.test(str) && parseFloat(str.replace(/[^0-9.]/g, "")) > 50);
    const num = parseFloat(str.replace(/[^0-9.]/g, ""));

    if (isNaN(num)) {
        return str;
    }

    let celsius = num;
    if (isFahrenheit) {
        celsius = (num - 32) * (5 / 9);
    }

    return (Math.round(celsius * 10) / 10).toFixed(1);
}

/**
 * Standardize temperature records to Celsius (°C) on display.
 * Automatically appends °C without duplicates. Example: 36.5 displays as 36.5 °C.
 */
export function formatTemperature(raw: string | number | null | undefined): string {
    if (raw === null || raw === undefined) {
        return "N/A";
    }

    const str = String(raw).trim();
    if (str === "" || str === "-" || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") {
        return "N/A";
    }

    // Already formatted with °C
    if (/°\s*C/i.test(str)) {
        return str;
    }

    const cleanNum = parseAndNormalizeTemperature(str);
    if (!cleanNum || isNaN(Number(cleanNum))) {
        return formatNA(str);
    }

    return `${cleanNum} °C`;
}

/**
 * Map course to department
 */
export function mapCourseToDepartment(course: string | null | undefined): string {
    if (!course) return "N/A";
    const c = course.trim().toUpperCase();
    switch (c) {
        case "BSIT":
            return "College of Information Technology (BSIT)";
        case "BSBA":
            return "College of Business Administration (BSBA)";
        case "BSHM":
            return "College of Hospitality Management (BSHM)";
        case "BSED":
            return "College of Education (BSED)";
        case "BSCRIM":
            return "College of Criminal Justice Education (BSCRIM)";
        case "MIDWIFERY":
            return "College of Nursing & Midwifery";
        case "BLIS":
            return "Department of Library and Information Science (BLIS)";
        default:
            return course;
    }
}

/**
 * Format date cleanly (e.g. "Mar 15, 2026")
 */
export function formatDate(rawDate: string | null | undefined): string {
    if (!rawDate) return "N/A";
    try {
        const d = new Date(rawDate);
        if (isNaN(d.getTime())) return String(rawDate);
        return d.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    } catch {
        return String(rawDate);
    }
}
