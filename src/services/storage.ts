import { Turma, Student, Assessment, CorrectionRecord, UserProfile, SystemSettings, GeneratedExam } from '../types';
import { initialTurmas, initialStudents, initialAssessments, initialCorrections, initialUser, initialSettings } from '../mockData';
import { sortStudentsByNumber } from '../utils/studentSort';

const KEYS = {
  USER: 'avaliascan_user',
  TURMAS: 'avaliascan_turmas',
  STUDENTS: 'avaliascan_students',
  ASSESSMENTS: 'avaliascan_assessments',
  CORRECTIONS: 'avaliascan_corrections',
  SETTINGS: 'avaliascan_settings',
  AUTHENTICATED: 'avaliascan_is_auth',
  VERSION_COUNTER: 'avaliascan_version_counter',
  GENERATED_EXAMS: 'avaliascan_generated_exams',
  LAST_BACKUP: 'avaliascan_last_backup_date',
};

export function formatSystemVersion(counter: number = 1): string {
  const safeCount = Math.max(1, Math.floor(counter) || 1);
  const major = 1;
  const minor = 1 + Math.floor((safeCount - 1) / 100);
  const patch = ((safeCount - 1) % 100) + 1;
  return `Versão ${String(major).padStart(2, '0')}.${String(minor).padStart(2, '0')}.${String(patch).padStart(2, '0')}`;
}

export const storageService = {
  getUser: (): UserProfile => {
    try {
      const data = localStorage.getItem(KEYS.USER);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          ...initialUser,
          ...parsed,
        };
      }
      return initialUser;
    } catch {
      return initialUser;
    }
  },

  setUser: (user: UserProfile) => {
    try {
      localStorage.setItem(KEYS.USER, JSON.stringify(user));
      // Also sync schoolName and teacherName to settings in localStorage
      const currentSettingsData = localStorage.getItem(KEYS.SETTINGS);
      const currentSettings: SystemSettings = currentSettingsData ? JSON.parse(currentSettingsData) : initialSettings;
      const updatedSettings: SystemSettings = {
        ...currentSettings,
        schoolName: user.schoolName || currentSettings.schoolName,
        teacherName: user.name || currentSettings.teacherName,
      };
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(updatedSettings));
    } catch (e) {
      console.error('Error in setUser', e);
    }
  },

  isAuthenticated: (): boolean => {
    try {
      const auth = localStorage.getItem(KEYS.AUTHENTICATED);
      return auth !== 'false'; // defaults to logged in for immediate showcase, but user can log out/in anytime
    } catch {
      return true;
    }
  },

  setAuthenticated: (isAuth: boolean) => {
    localStorage.setItem(KEYS.AUTHENTICATED, String(isAuth));
  },

  getTurmas: (): Turma[] => {
    try {
      const data = localStorage.getItem(KEYS.TURMAS);
      if (!data) return initialTurmas;
      const parsed: Turma[] = JSON.parse(data);
      // Clean out any legacy example turmas (turma_01, turma_02, turma_03)
      const exampleTurmaIds = new Set(['turma_01', 'turma_02', 'turma_03']);
      const cleaned = parsed.filter((t) => !exampleTurmaIds.has(t.id));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.TURMAS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return initialTurmas;
    }
  },

  setTurmas: (turmas: Turma[]) => {
    localStorage.setItem(KEYS.TURMAS, JSON.stringify(turmas));
  },

  getStudents: (): Student[] => {
    try {
      const data = localStorage.getItem(KEYS.STUDENTS);
      if (!data) return sortStudentsByNumber(initialStudents);
      const parsed: Student[] = JSON.parse(data);

      // Clean out any legacy example students from turma_01, turma_02, turma_03
      const exampleTurmaIds = new Set(['turma_01', 'turma_02', 'turma_03']);
      const exampleStudentIds = new Set([
        'alu_01', 'alu_02', 'alu_03', 'alu_04', 'alu_05',
        'alu_06', 'alu_07', 'alu_08', 'alu_09', 'alu_10',
        'alu_11', 'alu_12', 'alu_13'
      ]);
      const cleaned = parsed.filter((s) => !exampleTurmaIds.has(s.turmaId) && !exampleStudentIds.has(s.id));

      // Ensure all students have strictly unique IDs (resolves duplicate key issues from bulk additions)
      const seenIds = new Set<string>();
      let hasDuplicates = false;

      const sanitized: Student[] = cleaned.map((student, idx) => {
        if (!student.id || seenIds.has(student.id)) {
          hasDuplicates = true;
          const uniqueId = `alu_${student.turmaId || 'turma'}_${student.enrollmentNumber || idx}_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
          seenIds.add(uniqueId);
          return { ...student, id: uniqueId };
        }
        seenIds.add(student.id);
        return student;
      });

      const sortedSanitized = sortStudentsByNumber(sanitized);

      if (hasDuplicates || cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.STUDENTS, JSON.stringify(sortedSanitized));
      }

      return sortedSanitized;
    } catch {
      return sortStudentsByNumber(initialStudents);
    }
  },

  setStudents: (students: Student[]) => {
    const seenIds = new Set<string>();
    const sanitized = students.map((student, idx) => {
      if (!student.id || seenIds.has(student.id)) {
        const uniqueId = `alu_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).substring(2, 7)}`;
        seenIds.add(uniqueId);
        return { ...student, id: uniqueId };
      }
      seenIds.add(student.id);
      return student;
    });
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(sanitized));
  },

  getAssessments: (): Assessment[] => {
    try {
      const data = localStorage.getItem(KEYS.ASSESSMENTS);
      if (!data) return [];
      const parsed: Assessment[] = JSON.parse(data);
      // Clean out legacy example assessments (av_01, av_02) that belonged to deleted example turmas,
      // strictly preserving all existing assessments created by the user
      const exampleAssessmentIds = new Set(['av_01', 'av_02']);
      const cleaned = parsed.filter((a) => !exampleAssessmentIds.has(a.id));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  setAssessments: (assessments: Assessment[]) => {
    localStorage.setItem(KEYS.ASSESSMENTS, JSON.stringify(assessments));
  },

  getCorrections: (): CorrectionRecord[] => {
    try {
      const data = localStorage.getItem(KEYS.CORRECTIONS);
      if (!data) return [];
      const parsed: CorrectionRecord[] = JSON.parse(data);
      // Clean out corrections tied to example turmas or example assessments
      const exampleTurmaIds = new Set(['turma_01', 'turma_02', 'turma_03']);
      const exampleAssessmentIds = new Set(['av_01', 'av_02']);
      const cleaned = parsed.filter((c) => !exampleTurmaIds.has(c.turmaId) && !exampleAssessmentIds.has(c.assessmentId));
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(KEYS.CORRECTIONS, JSON.stringify(cleaned));
      }
      return cleaned;
    } catch {
      return [];
    }
  },

  setCorrections: (corrections: CorrectionRecord[]) => {
    localStorage.setItem(KEYS.CORRECTIONS, JSON.stringify(corrections));
  },

  getSettings: (): SystemSettings => {
    try {
      const data = localStorage.getItem(KEYS.SETTINGS);
      const user = storageService.getUser();
      if (!data) {
        return {
          ...initialSettings,
          cameraResolution: '720p',
          scanEngineMode: 'gemini_vision',
          autoFreezeOnSharpness: false,
          schoolName: user?.schoolName || initialSettings.schoolName,
          teacherName: user?.name || initialSettings.teacherName,
        };
      }
      const parsed = JSON.parse(data);
      const isCustomRes = localStorage.getItem('avaliascan_resolution_customized');
      const isCustomMode = localStorage.getItem('avaliascan_scan_mode_customized');

      return {
        ...initialSettings,
        ...parsed,
        cameraResolution: isCustomRes ? (parsed.cameraResolution || '720p') : '720p',
        scanEngineMode: isCustomMode ? (parsed.scanEngineMode || 'gemini_vision') : 'gemini_vision',
        autoFreezeOnSharpness: parsed.autoFreezeOnSharpness !== undefined ? Boolean(parsed.autoFreezeOnSharpness) : false,
        schoolName: parsed.schoolName || user?.schoolName || initialSettings.schoolName,
        teacherName: parsed.teacherName || user?.name || initialSettings.teacherName,
      };
    } catch {
      return initialSettings;
    }
  },

  setSettings: (settings: SystemSettings) => {
    try {
      localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
      const currentUser = storageService.getUser();
      if (currentUser) {
        const updatedUser: UserProfile = {
          ...currentUser,
          schoolName: settings.schoolName || currentUser.schoolName,
          name: settings.teacherName || currentUser.name,
        };
        localStorage.setItem(KEYS.USER, JSON.stringify(updatedUser));
      }
    } catch (e) {
      console.error('Error in setSettings', e);
    }
  },

  getGeneratedExams: (): GeneratedExam[] => {
    try {
      const data = localStorage.getItem(KEYS.GENERATED_EXAMS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getGeneratedExamByAssessmentId: (assessmentId: string): GeneratedExam | undefined => {
    const list = storageService.getGeneratedExams();
    return list.find((e) => e.assessmentId === assessmentId);
  },

  saveGeneratedExam: (exam: GeneratedExam) => {
    try {
      const list = storageService.getGeneratedExams();
      const existingIdx = list.findIndex((e) => e.assessmentId === exam.assessmentId || e.id === exam.id);
      let updated: GeneratedExam[];
      if (existingIdx >= 0) {
        updated = list.map((item, idx) => (idx === existingIdx ? exam : item));
      } else {
        updated = [exam, ...list];
      }
      localStorage.setItem(KEYS.GENERATED_EXAMS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error saving generated exam:', e);
    }
  },

  deleteGeneratedExam: (assessmentIdOrExamId: string) => {
    try {
      const list = storageService.getGeneratedExams();
      const updated = list.filter((e) => e.assessmentId !== assessmentIdOrExamId && e.id !== assessmentIdOrExamId);
      localStorage.setItem(KEYS.GENERATED_EXAMS, JSON.stringify(updated));
    } catch (e) {
      console.error('Error deleting generated exam:', e);
    }
  },

  resetToDefault: () => {
    // Preserve existing assessments, corrections, settings, user profile and generated exams
    const assessments = localStorage.getItem(KEYS.ASSESSMENTS);
    const corrections = localStorage.getItem(KEYS.CORRECTIONS);
    const settings = localStorage.getItem(KEYS.SETTINGS);
    const user = localStorage.getItem(KEYS.USER);
    const generatedExams = localStorage.getItem(KEYS.GENERATED_EXAMS);

    localStorage.removeItem(KEYS.TURMAS);
    localStorage.removeItem(KEYS.STUDENTS);

    if (assessments) localStorage.setItem(KEYS.ASSESSMENTS, assessments);
    if (corrections) localStorage.setItem(KEYS.CORRECTIONS, corrections);
    if (settings) localStorage.setItem(KEYS.SETTINGS, settings);
    if (user) localStorage.setItem(KEYS.USER, user);
    if (generatedExams) localStorage.setItem(KEYS.GENERATED_EXAMS, generatedExams);
  },

  getLastBackupDate: (): string | null => {
    try {
      return localStorage.getItem(KEYS.LAST_BACKUP);
    } catch {
      return null;
    }
  },

  setLastBackupDate: (dateStr?: string) => {
    try {
      const val = dateStr || new Date().toISOString();
      localStorage.setItem(KEYS.LAST_BACKUP, val);
      // Also update in settings
      const settings = storageService.getSettings();
      storageService.setSettings({ ...settings, lastBackupDate: val });
    } catch (e) {
      console.error('Error setting last backup date', e);
    }
  },

  generateBackupData: (
    overrideTurmas?: Turma[],
    overrideStudents?: Student[],
    overrideAssessments?: Assessment[],
    overrideCorrections?: CorrectionRecord[],
    overrideSettings?: SystemSettings,
    overrideUser?: UserProfile
  ) => {
    const turmas = overrideTurmas || storageService.getTurmas();
    const students = overrideStudents || storageService.getStudents();
    const assessments = overrideAssessments || storageService.getAssessments();
    const corrections = overrideCorrections || storageService.getCorrections();
    const settings = overrideSettings || storageService.getSettings();
    const user = overrideUser || storageService.getUser();
    const generatedExams = storageService.getGeneratedExams();
    const versionCounter = storageService.getVersionCounter();

    const now = new Date();
    const isoDate = now.toISOString();

    return {
      app: 'AvaliaScan',
      systemVersion: formatSystemVersion(versionCounter),
      exportedAt: isoDate,
      description: 'Backup completo dos dados locais (JSON) do AvaliaScan',
      schoolName: settings.schoolName || user.schoolName || 'Escola',
      teacherName: settings.teacherName || user.name || 'Professor',
      counts: {
        turmas: turmas.length,
        students: students.length,
        assessments: assessments.length,
        corrections: corrections.length,
        generatedExams: generatedExams.length,
      },
      turmas,
      students,
      assessments,
      corrections,
      settings,
      user,
      generatedExams,
      versionCounter,
    };
  },

  downloadBackupFile: (data?: any, isAuto: boolean = false): string => {
    try {
      const backupData = data || storageService.generateBackupData();
      const now = new Date();
      const datePart = now.toISOString().split('T')[0];
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const prefix = isAuto ? 'avaliascan_backup_automatico' : 'avaliascan_backup_completo';
      const filename = `${prefix}_${datePart}_${hours}h${minutes}.json`;

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      storageService.setLastBackupDate(now.toISOString());
      return filename;
    } catch (e) {
      console.error('Error triggering backup download', e);
      return '';
    }
  },

  getVersionCounter: (): number => {
    try {
      const val = localStorage.getItem(KEYS.VERSION_COUNTER);
      const parsed = val ? parseInt(val, 10) : 44;
      return Number.isFinite(parsed) && parsed >= 44 ? parsed : 44;
    } catch {
      return 44;
    }
  },

  getVersion: (): string => {
    return formatSystemVersion(storageService.getVersionCounter());
  },

  incrementVersion: (): string => {
    try {
      const current = storageService.getVersionCounter();
      const next = current + 1;
      localStorage.setItem(KEYS.VERSION_COUNTER, String(next));
      return formatSystemVersion(next);
    } catch {
      return formatSystemVersion(1);
    }
  },
};
