import { Turma, Student, Assessment, CorrectionRecord, UserProfile, SystemSettings } from './types';

export const initialUser: UserProfile = {
  id: 'usr_01',
  name: 'Prof. Carlos Eduardo Silveira',
  email: 'mipcjr@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
  role: 'professor',
  authProvider: 'google',
  biometricRegistered: true,
  schoolName: 'Colégio Integrado Horizonte',
  createdAt: '2026-02-10',
};

export const initialSettings: SystemSettings = {
  schoolName: 'Colégio Integrado Horizonte',
  teacherName: 'Prof. Carlos Eduardo Silveira',
  cameraResolution: '720p',
  scanEngineMode: 'gemini_vision',
  autoSaveScan: true,
  soundOnScan: true,
  autoScanOnDetection: false,
  omrSensitivity: 'media',
  enableBiometrics: true,
  darkPastelMode: false,
  autoFreezeOnSharpness: false,
  autoBackupEnabled: true,
  autoBackupFrequency: 'after_corrections',
};

export const initialTurmas: Turma[] = [
  {
    id: 'turma_04',
    name: '5º Ano B',
    grade: 'Ensino Fundamental I',
    shift: 'Manhã',
    year: 2026,
    subjectDefault: 'Polivalente / Multidisciplinar',
    studentCount: 35,
    colorPastel: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    createdAt: '2026-03-01',
  },
];

export const initialStudents: Student[] = [
  // Alunos importados para a turma 5º Ano B (Nº de matrícula = número, Nome Completo = nome)
  { id: 'alu_5b_01', name: 'ÁGATHA GABRIELA SILVA DE OLIVEIRA', enrollmentNumber: '1', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_02', name: 'ALICE VITORIA TOMAZ PEDROSO', enrollmentNumber: '2', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_03', name: 'ALISON MIGUEL DOS SANTOS OLIVEIRA', enrollmentNumber: '3', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_04', name: 'ALYCE AFONSO VIANA', enrollmentNumber: '4', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_05', name: 'ANA ALICIA DA SILVA PAIS', enrollmentNumber: '5', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_06', name: 'ANA CLARA CAMARGO DOS SANTOS', enrollmentNumber: '6', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_07', name: 'ANA CLARA FERNANDES DOS SANTOS SILVEIRA', enrollmentNumber: '7', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_08', name: 'ANNY EMANUELY ALVES', enrollmentNumber: '8', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_09', name: 'BERNARDO GANEM LIRA', enrollmentNumber: '9', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_10', name: 'BRAYAN DA SILVA STANLEY', enrollmentNumber: '10', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_11', name: 'BRYAIN DAVI MONTEIRO LUCCHESI', enrollmentNumber: '11', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_12', name: 'CARLOS DANIEL MOTTA', enrollmentNumber: '12', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_13', name: 'EMANUELLY DA COSTA BARNABÉ', enrollmentNumber: '13', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_14', name: 'ENZO MIGUEL MIRANDA', enrollmentNumber: '14', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_15', name: 'EVELYN LOUIZE LEOPOLDINO SOARES', enrollmentNumber: '15', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_16', name: 'FELIPE GABRIEL OLIVEIRA DA SILVA', enrollmentNumber: '16', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_17', name: 'HENRY NATHAN HONORATO PAIXAO', enrollmentNumber: '17', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_18', name: 'ISAAC WILLIAN ALVES DA SILVA', enrollmentNumber: '18', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_19', name: 'ISABELLA MOREIRA DA SILVA', enrollmentNumber: '19', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_20', name: 'ISAQUE LORENZO FRAGOSO', enrollmentNumber: '20', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_21', name: 'IZABELLA FALOSSI AMANCIO', enrollmentNumber: '21', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_22', name: 'JOÃO LUKAS DE CAMARGO', enrollmentNumber: '22', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_23', name: 'JOÃO MIGUEL RODRIGUES MAMEDES', enrollmentNumber: '23', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_24', name: 'JOAO MIGUEL SANTOS DO NASCIMENTO', enrollmentNumber: '24', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_25', name: 'KATHIELLY VITORIA DA SILVA FELIX', enrollmentNumber: '25', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_26', name: 'LAURA FERREIRA PECANHA', enrollmentNumber: '26', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_27', name: 'LIVIA ALVES DE LIMA', enrollmentNumber: '27', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_28', name: 'LUCAS HENRIQUE APARECIDO DA SILVA', enrollmentNumber: '28', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_29', name: 'LUCAS VINICIUS DE OLIVEIRA REIS', enrollmentNumber: '29', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_30', name: 'MONIQUE CRISTINA SILVA DO CARMO', enrollmentNumber: '30', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_31', name: 'PIETRO SAMUEL CANDIDO MENDES', enrollmentNumber: '31', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_32', name: 'WASHINGTON DOS SANTOS SILVA JÚNIOR', enrollmentNumber: '32', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_33', name: 'CLAUDEMIR RIAN BUENO', enrollmentNumber: '33', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_34', name: 'ENZO GARCIA AMARAL', enrollmentNumber: '34', turmaId: 'turma_04', active: true },
  { id: 'alu_5b_35', name: 'HELENA CAMARA', enrollmentNumber: '35', turmaId: 'turma_04', active: true },
];

export const initialAssessments: Assessment[] = [];

export const initialCorrections: CorrectionRecord[] = [];
