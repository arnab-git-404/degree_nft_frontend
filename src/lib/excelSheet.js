// Excel templates and readers for bulk imports. exceljs is large, so it loads only when used.
// A spec describes one sheet: { fileName, sheetName, columns: [{ key, header, width, text?, list? }],
// required: [keys whose column must exist], instructions: [lines], prepare?(row) }.

export const MAX_IMPORT_ROWS = 2000;
const TEMPLATE_ROWS = 1000;

const loadExcel = async () => (await import("exceljs")).default;
const normalise = (text) => String(text || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export async function downloadTemplate(spec) {
  const ExcelJS = await loadExcel();
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(spec.sheetName);
  sheet.columns = spec.columns.map(({ key, header, width }) => ({ key, header, width }));
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  spec.columns.forEach((column, index) => {
    // Text cells keep leading zeros and "+" (registration numbers, phones, codes).
    if (column.text) sheet.getColumn(column.key).numFmt = "@";
    if (column.list) {
      const letter = sheet.getColumn(index + 1).letter;
      for (let row = 2; row <= TEMPLATE_ROWS + 1; row += 1) {
        sheet.getCell(`${letter}${row}`).dataValidation = { type: "list", allowBlank: true, formulae: [`"${column.list.join(",")}"`] };
      }
    }
  });

  const help = workbook.addWorksheet("Instructions");
  help.getColumn(1).width = 110;
  spec.instructions.forEach((line, index) => {
    help.addRow([line]).font = index === 0 ? { bold: true, size: 13 } : {};
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = spec.fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Rows of the spec's sheet (or the first sheet), matched to columns by header name. Each row keeps its
// sheet row number, so the server can say which row is wrong.
export async function readSheet(file, spec) {
  const ExcelJS = await loadExcel();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(await file.arrayBuffer());
  } catch {
    throw new Error("This is not an Excel (.xlsx) file. Download the template and fill that in.");
  }

  const sheet = workbook.getWorksheet(spec.sheetName) || workbook.worksheets[0];
  if (!sheet) throw new Error("The file has no sheet.");

  const columnOf = {};
  sheet.getRow(1).eachCell((cell, column) => {
    const match = spec.columns.find((item) => normalise(item.header) === normalise(cell.text));
    if (match) columnOf[match.key] = column;
  });
  const missing = spec.required.filter((key) => !columnOf[key]);
  if (missing.length) {
    const names = missing.map((key) => `"${spec.columns.find((column) => column.key === key).header}"`).join(", ");
    throw new Error(`The first row needs the column${missing.length > 1 ? "s" : ""} ${names}. Use the template.`);
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = Object.fromEntries(
      spec.columns.map(({ key }) => [key, columnOf[key] ? String(row.getCell(columnOf[key]).text ?? "").trim() : ""])
    );
    if (Object.values(values).every((value) => !value)) return;
    rows.push({ row: rowNumber, ...(spec.prepare ? spec.prepare(values) : values) });
  });

  if (rows.length === 0) throw new Error("The file has no rows below the header row.");
  if (rows.length > MAX_IMPORT_ROWS) throw new Error(`Import up to ${MAX_IMPORT_ROWS} rows per file (this one has ${rows.length}).`);
  return rows;
}

// "Active" / "active" / "" → ACTIVE; anything else goes as typed and the server reports it.
const status = (fallback) => (values) => ({ ...values, status: values.status ? values.status.toUpperCase() : fallback });

export const STUDENT_SHEET = {
  fileName: "students-template.xlsx",
  sheetName: "Students",
  required: ["fullName"],
  columns: [
    { key: "fullName", header: "Full name", width: 28 },
    { key: "registrationNo", header: "Registration no.", width: 20, text: true },
    { key: "email", header: "Email", width: 30 },
    { key: "phone", header: "Phone", width: 18, text: true },
    { key: "status", header: "Status", width: 12, list: ["Active", "Inactive"] },
  ],
  prepare: (values) => {
    const { status: value, ...rest } = status("ACTIVE")(values);
    return { ...rest, studentStatus: value };
  },
  instructions: [
    "How to fill the Students sheet",
    "• One row per student. Full name is required; the other columns are optional.",
    "• Registration no. is your college's own number. It must be unique in your college and in this file.",
    "• Status is Active or Inactive. Leave it empty for Active.",
    "• A student who takes a second course is NOT added again: courses are added as enrollments.",
    "• Keep the first row (the column names) as it is. Up to 2000 students per file.",
  ],
};

export const ENROLLMENT_SHEET = {
  fileName: "enrollments-template.xlsx",
  sheetName: "Enrollments",
  required: ["registrationNo", "programCode", "startYear"],
  columns: [
    { key: "registrationNo", header: "Registration no.", width: 20, text: true },
    { key: "programCode", header: "Program code", width: 14, text: true },
    { key: "startYear", header: "Batch start year", width: 16 },
    { key: "endYear", header: "Batch end year", width: 16 },
    { key: "enrollmentCode", header: "Enrollment code", width: 22, text: true },
    { key: "officialEnrollmentNo", header: "Official enrollment no.", width: 24, text: true },
    { key: "status", header: "Status", width: 12, list: ["Enrolled", "Completed", "Cancelled"] },
  ],
  prepare: status("ENROLLED"),
  instructions: [
    "How to fill the Enrollments sheet",
    "• One row per student per batch. Registration no., Program code and Batch start year are required.",
    "• The student must already exist (Students page) with that registration no.",
    "• Program code is the code on the Programs page (e.g. CSE). The batch is that program's batch starting in that year.",
    "• Batch end year is only needed when the program has two batches starting in the same year.",
    "• Enrollment code and Official enrollment no. are optional. Status is Enrolled, Completed or Cancelled (empty = Enrolled).",
    "• Keep the first row (the column names) as it is. Up to 2000 rows per file.",
  ],
};
