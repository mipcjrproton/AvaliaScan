import { Student } from '../types';

/**
 * Ordena os alunos de cada turma sempre em ordem numérica (Nº de Chamada / Matrícula).
 * Exemplos: 1, 2, 3, ... 9, 10, 11, ... 35, 2026011, etc.
 * Em caso de empate ou valores alfanuméricos, utiliza ordenação natural e alfabética.
 */
export const sortStudentsByNumber = (studentsList: Student[]): Student[] => {
  return [...studentsList].sort((a, b) => {
    const cleanA = (a.enrollmentNumber || '').trim();
    const cleanB = (b.enrollmentNumber || '').trim();

    const numA = parseInt(cleanA.replace(/\D/g, ''), 10);
    const numB = parseInt(cleanB.replace(/\D/g, ''), 10);

    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }

    const strCompare = cleanA.localeCompare(cleanB, undefined, { numeric: true, sensitivity: 'base' });
    if (strCompare !== 0) return strCompare;

    return (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' });
  });
};
