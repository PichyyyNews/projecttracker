export interface AcademicOption {
  yearLevel: string; // ชั้นปี เช่น "ปวส ปี 1", "ปวส ปี 2"
  group: string; // กลุ่ม เช่น "1", "2", "3", "4"
  major: string; // สาขา เช่น "เทคโนโลยีคอมพิวเตอร์ (สทค)"
}

export const ACADEMIC_GROUPS: AcademicOption[] = [
  { yearLevel: "ปวส ปี 1", group: "1", major: "เทคโนโลยีคอมพิวเตอร์ (สทค)" },
  { yearLevel: "ปวส ปี 1", group: "2", major: "เทคโนโลยีคอมพิวเตอร์ (สทค)" },
  { yearLevel: "ปวส ปี 1", group: "1", major: "เครือข่ายคอมพิวเตอร์และความปลอดภัย (สคต)" },
  { yearLevel: "ปวส ปี 1", group: "1", major: "คอมพิวเตอร์เกมและแอนิเมชัน (สคอ)" },
  { yearLevel: "ปวส ปี 2", group: "1", major: "เทคโนโลยีคอมพิวเตอร์ (สทค)" },
  { yearLevel: "ปวส ปี 2", group: "2", major: "เทคโนโลยีคอมพิวเตอร์ (สทค)" },
  { yearLevel: "ปวส ปี 2", group: "3", major: "เทคโนโลยีคอมพิวเตอร์ (สทค)" },
  { yearLevel: "ปวส ปี 2", group: "4", major: "เทคโนโลยีคอมพิวเตอร์ (สทค)" },
  { yearLevel: "ปวส ปี 2", group: "1", major: "เครือข่ายคอมพิวเตอร์และความปลอดภัย (สคต)" },
  { yearLevel: "ปวส ปี 2", group: "1", major: "คอมพิวเตอร์เกมและแอนิเมชัน (สคอ)" },
];

export const DEPARTMENTS = [
  "แผนกวิชาเทคโนโลยีคอมพิวเตอร์",
  "แผนกวิชาเทคโนโลยีสารสนเทศ",
  "แผนกวิชาอิเล็กทรอนิกส์",
  "แผนกวิชาไฟฟ้ากำลัง",
];
