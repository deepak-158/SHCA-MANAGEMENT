// Class definitions in order
export const CLASS_LIST = [
  { id: 'nursery', name: 'Nursery', order: 0 },
  { id: 'lkg', name: 'LKG', order: 1 },
  { id: 'ukg', name: 'UKG', order: 2 },
  { id: 'class-1', name: 'Class 1', order: 3 },
  { id: 'class-2', name: 'Class 2', order: 4 },
  { id: 'class-3', name: 'Class 3', order: 5 },
  { id: 'class-4', name: 'Class 4', order: 6 },
  { id: 'class-5', name: 'Class 5', order: 7 },
  { id: 'class-6', name: 'Class 6', order: 8 },
  { id: 'class-7', name: 'Class 7', order: 9 },
  { id: 'class-8', name: 'Class 8', order: 10 },
  { id: 'class-9', name: 'Class 9', order: 11 },
  { id: 'class-10', name: 'Class 10', order: 12 },
  { id: 'class-11', name: 'Class 11', order: 13 },
  { id: 'class-12', name: 'Class 12', order: 14 },
];

export const SECTION_LIST = ['A', 'B', 'C', 'D', 'E'];

export const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LEAVE: 'Leave',
};

export const LEAVE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const ROLES = {
  ADMIN: 'admin',
  CLASS_TEACHER: 'class_teacher',
  SUBJECT_TEACHER: 'subject_teacher',
  STUDENT: 'student',
};

export const GRADE_MAP = [
  { min: 91, max: 100, grade: 'A+', remark: 'Outstanding' },
  { min: 81, max: 90, grade: 'A', remark: 'Excellent' },
  { min: 71, max: 80, grade: 'B+', remark: 'Very Good' },
  { min: 61, max: 70, grade: 'B', remark: 'Good' },
  { min: 51, max: 60, grade: 'C+', remark: 'Above Average' },
  { min: 41, max: 50, grade: 'C', remark: 'Average' },
  { min: 33, max: 40, grade: 'D', remark: 'Below Average' },
  { min: 0, max: 32, grade: 'F', remark: 'Fail' },
];

export const EXAM_TYPES = ['Unit Test', 'Mid Term Exam', 'Final Exam'];
