import React, { useState, useRef, useMemo } from 'react';
import { 
  Users, 
  Plus, 
  GraduationCap, 
  Search, 
  UserCheck, 
  UserX,
  Trash2, 
  Pencil,
  BookOpen, 
  Calendar, 
  Sparkles, 
  ArrowRight, 
  School,
  Sun,
  Sunset,
  Moon,
  Clock,
  Filter,
  CheckCircle2,
  AlertTriangle,
  X,
  Upload,
  FileSpreadsheet
} from 'lucide-react';
import { Turma, Student, TurnoTurma } from '../../types';
import { sortStudentsByNumber } from '../../utils/studentSort';

interface TurmasViewProps {
  turmas: Turma[];
  students: Student[];
  onAddTurma: (newTurma: Omit<Turma, 'id' | 'createdAt'>) => void;
  onUpdateTurma: (updatedTurma: Turma) => void;
  onDeleteTurma: (id: string) => void;
  onAddStudent: (newStudent: Omit<Student, 'id'>) => void;
  onAddStudents?: (newStudentsList: (Omit<Student, 'id'> & { id?: string })[]) => void;
  onUpdateStudent: (updatedStudent: Student) => void;
  onDeleteStudent: (studentId: string) => void;
  onSelectTurmaForExam: (turmaId: string) => void;
}

export const TURNO_OPTIONS: {
  value: TurnoTurma;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeClass: string;
  activeRing: string;
}[] = [
  {
    value: 'Manhã',
    label: 'Manhã',
    sublabel: 'Matutino',
    icon: Sun,
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
    activeRing: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/50',
  },
  {
    value: 'Tarde',
    label: 'Tarde',
    sublabel: 'Vespertino',
    icon: Sunset,
    badgeClass: 'bg-orange-50 text-orange-800 border-orange-200',
    activeRing: 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50',
  },
  {
    value: 'Noite',
    label: 'Noite',
    sublabel: 'Noturno',
    icon: Moon,
    badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    activeRing: 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/50',
  },
  {
    value: 'Integral',
    label: 'Integral',
    sublabel: 'Período Integral',
    icon: Clock,
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
    activeRing: 'border-teal-500 ring-2 ring-teal-500/20 bg-teal-50/50',
  },
];

export const TurmasView: React.FC<TurmasViewProps> = ({
  turmas,
  students,
  onAddTurma,
  onUpdateTurma,
  onDeleteTurma,
  onAddStudent,
  onAddStudents,
  onUpdateStudent,
  onDeleteStudent,
  onSelectTurmaForExam,
}) => {
  const [selectedTurmaId, setSelectedTurmaId] = useState<string>(turmas[0]?.id || '');

  React.useEffect(() => {
    if (turmas.length > 0 && (!selectedTurmaId || !turmas.some((t) => t.id === selectedTurmaId))) {
      setSelectedTurmaId(turmas[0].id);
    }
  }, [turmas, selectedTurmaId]);

  const [searchStudent, setSearchStudent] = useState('');
  const [shiftFilter, setShiftFilter] = useState<'Todos' | TurnoTurma>('Todos');
  const [studentStatusFilter, setStudentStatusFilter] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  
  // Modals state
  const [isAddingTurma, setIsAddingTurma] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [editingTurma, setEditingTurma] = useState<Turma | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [turmaToDelete, setTurmaToDelete] = useState<Turma | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setFeedbackToast(message);
    setTimeout(() => {
      setFeedbackToast(null);
    }, 3500);
  };

  // New Turma Form
  const [newTurmaName, setNewTurmaName] = useState('');
  const [newTurmaGrade, setNewTurmaGrade] = useState('Ensino Médio');
  const [newTurmaShift, setNewTurmaShift] = useState<TurnoTurma>('Manhã');
  const [newTurmaYear, setNewTurmaYear] = useState(2026);
  const [newTurmaSubject, setNewTurmaSubject] = useState('');
  const [newTurmaColor, setNewTurmaColor] = useState('bg-indigo-50 text-indigo-800 border-indigo-200');

  // Edit Turma Form
  const [editTurmaName, setEditTurmaName] = useState('');
  const [editTurmaGrade, setEditTurmaGrade] = useState('Ensino Médio');
  const [editTurmaShift, setEditTurmaShift] = useState<TurnoTurma>('Manhã');
  const [editTurmaYear, setEditTurmaYear] = useState(2026);
  const [editTurmaSubject, setEditTurmaSubject] = useState('');
  const [editTurmaColor, setEditTurmaColor] = useState('');

  // New Student Form
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentMatricula, setNewStudentMatricula] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentActive, setNewStudentActive] = useState<boolean>(true);

  // Edit Student Form
  const [editStudentName, setEditStudentName] = useState('');
  const [editStudentMatricula, setEditStudentMatricula] = useState('');
  const [editStudentEmail, setEditStudentEmail] = useState('');
  const [editStudentTurmaId, setEditStudentTurmaId] = useState('');
  const [editStudentActive, setEditStudentActive] = useState<boolean>(true);

  // Import Students Modal State
  const [isImportingStudents, setIsImportingStudents] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  const [importPreview, setImportPreview] = useState<{ number: string; name: string }[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter turmas by shift
  const filteredTurmas = turmas.filter((t) => {
    if (shiftFilter === 'Todos') return true;
    return (t.shift || 'Manhã') === shiftFilter;
  });

  // Numerical sort comparator for student lists (e.g. 1, 2, 3... 35)
  const sortStudentsNumerically = (a: Student, b: Student): number => {
    const numA = parseInt(a.enrollmentNumber?.replace(/\D/g, '') || '', 10);
    const numB = parseInt(b.enrollmentNumber?.replace(/\D/g, '') || '', 10);
    if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
      return numA - numB;
    }
    return (a.enrollmentNumber || '').localeCompare(b.enrollmentNumber || '', undefined, {
      numeric: true,
      sensitivity: 'base',
    });
  };

  const currentTurma = turmas.find((t) => t.id === selectedTurmaId) || filteredTurmas[0] || turmas[0];
  const turmaStudents = students
    .filter((s) => s.turmaId === currentTurma?.id)
    .sort(sortStudentsNumerically);
  
  const activeCount = turmaStudents.filter((s) => s.active !== false).length;
  const inactiveCount = turmaStudents.filter((s) => s.active === false).length;

  const filteredStudents = turmaStudents.filter((s) => {
    const matchesSearch = 
      s.name.toLowerCase().includes(searchStudent.toLowerCase()) ||
      s.enrollmentNumber.includes(searchStudent);
    
    if (!matchesSearch) return false;

    if (studentStatusFilter === 'ativos') return s.active !== false;
    if (studentStatusFilter === 'inativos') return s.active === false;
    return true;
  });

  // Handler to open edit turma modal
  const handleOpenEditTurma = (turma: Turma) => {
    setEditingTurma({ ...turma });
    setEditTurmaName(turma.name);
    setEditTurmaGrade(turma.grade);
    setEditTurmaShift(turma.shift || 'Manhã');
    setEditTurmaYear(turma.year);
    setEditTurmaSubject(turma.subjectDefault || '');
    setEditTurmaColor(turma.colorPastel);
  };

  // Handler to open edit student modal
  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent({ ...student });
    setEditStudentName(student.name);
    setEditStudentMatricula(student.enrollmentNumber);
    setEditStudentEmail(student.email || '');
    setEditStudentTurmaId(student.turmaId);
    setEditStudentActive(student.active !== false);
  };

  const handleCreateTurmaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTurmaName.trim()) return;

    onAddTurma({
      name: newTurmaName.trim(),
      grade: newTurmaGrade,
      shift: newTurmaShift,
      year: Number(newTurmaYear),
      subjectDefault: newTurmaSubject || 'Geral',
      studentCount: 0,
      colorPastel: newTurmaColor,
    });

    setNewTurmaName('');
    setNewTurmaShift('Manhã');
    setIsAddingTurma(false);
    showToast('Turma cadastrada com sucesso!');
  };

  const handleUpdateTurmaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTurma || !editTurmaName.trim()) return;

    const updated: Turma = {
      ...editingTurma,
      name: editTurmaName.trim(),
      grade: editTurmaGrade,
      shift: editTurmaShift,
      year: Number(editTurmaYear),
      subjectDefault: editTurmaSubject || 'Geral',
      colorPastel: editTurmaColor || editingTurma.colorPastel,
    };

    onUpdateTurma(updated);
    setEditingTurma(null);
    showToast(`Turma "${updated.name}" alterada com sucesso!`);
  };

  const handleConfirmDeleteTurma = () => {
    if (!turmaToDelete) return;
    const turmaName = turmaToDelete.name;
    onDeleteTurma(turmaToDelete.id);
    setTurmaToDelete(null);
    showToast(`Turma "${turmaName}" e seus alunos foram excluídos.`);
  };

  const handleCreateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !currentTurma) return;

    onAddStudent({
      name: newStudentName.trim(),
      enrollmentNumber: newStudentMatricula.trim() || `2026${Math.floor(100 + Math.random() * 900)}`,
      turmaId: currentTurma.id,
      email: newStudentEmail.trim() || undefined,
      active: newStudentActive,
    });

    setNewStudentName('');
    setNewStudentMatricula('');
    setNewStudentEmail('');
    setNewStudentActive(true);
    setIsAddingStudent(false);
    showToast(`Aluno cadastrado como ${newStudentActive ? 'Ativo' : 'Inativo'}!`);
  };

  const handleUpdateStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent || !editStudentName.trim()) return;

    const updated: Student = {
      ...editingStudent,
      id: editingStudent.id,
      name: editStudentName.trim(),
      enrollmentNumber: editStudentMatricula.trim(),
      email: editStudentEmail.trim() || undefined,
      turmaId: editStudentTurmaId,
      active: editStudentActive,
    };

    onUpdateStudent(updated);
    setEditingStudent(null);
    showToast(`Aluno "${updated.name}" atualizado com sucesso!`);
  };

  // Helper to parse student lines (supports "1 - Nome", "1\tNome", "1;Nome", or "1 Nome")
  const parseStudentLines = (rawText: string): { number: string; name: string }[] => {
    const lines = rawText.split('\n');
    const results: { number: string; name: string }[] = [];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Ignore common header lines
      if (/^(nº|no|n\.|numero|número|matricula|matrícula|aluno|nome)/i.test(line)) {
        continue;
      }

      // Pattern 1: Tab separated (from Excel / sheets paste)
      if (line.includes('\t')) {
        const parts = line.split('\t').map(p => p.trim()).filter(Boolean);
        if (parts.length >= 2) {
          const num = parts[0].replace(/[^0-9]/g, '');
          const name = parts.slice(1).join(' ').trim();
          if (num && name) {
            results.push({ number: num, name });
            continue;
          }
        }
      }

      // Pattern 2: Semicolon or comma separated (CSV)
      if (line.includes(';') || (line.includes(',') && !line.includes(' - '))) {
        const separator = line.includes(';') ? ';' : ',';
        const parts = line.split(separator).map(p => p.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
        if (parts.length >= 2) {
          const num = parts[0].replace(/[^0-9]/g, '');
          const name = parts.slice(1).join(' ').trim();
          if (num && name) {
            results.push({ number: num, name });
            continue;
          }
        }
      }

      // Pattern 3: Regex match: number at start followed by hyphen/dot/tab/space
      const match = line.match(/^(\d{1,8})\s*[-–—.:)]\s*(.+)$/) || line.match(/^(\d{1,8})\s+(.+)$/);
      if (match) {
        const num = match[1].trim();
        const name = match[2].trim();
        if (num && name) {
          results.push({ number: num, name });
          continue;
        }
      }
    }

    return results;
  };

  const handleImportTextChange = (text: string) => {
    setImportText(text);
    setImportError(null);
    const parsed = parseStudentLines(text);
    setImportPreview(parsed);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        handleImportTextChange(content);
      }
    };
    reader.onerror = () => {
      setImportError('Erro ao ler o arquivo selecionado.');
    };
    reader.readAsText(file);
    // Reset file input so same file can be chosen again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImportStudents = () => {
    if (!currentTurma) {
      setImportError('Nenhuma turma selecionada.');
      return;
    }
    if (importPreview.length === 0) {
      setImportError('Nenhum aluno identificado. Cole os dados no formato: "Número Nome" ou "Número - Nome"');
      return;
    }

    if (onAddStudents) {
      const batch = importPreview.map((item, idx) => ({
        id: `alu_${currentTurma.id}_${item.number}_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        name: item.name.toUpperCase(),
        enrollmentNumber: item.number,
        turmaId: currentTurma.id,
        active: true,
      }));
      onAddStudents(batch);
    } else {
      // Add all parsed students to current turma
      for (const item of importPreview) {
        onAddStudent({
          name: item.name.toUpperCase(),
          enrollmentNumber: item.number,
          turmaId: currentTurma.id,
          active: true,
        });
      }
    }

    const count = importPreview.length;
    setIsImportingStudents(false);
    setImportText('');
    setImportPreview([]);
    setImportError(null);
    showToast(`${count} alunos importados com sucesso para "${currentTurma.name}"!`);
  };

  const handleConfirmDeleteStudent = () => {
    if (!studentToDelete) return;
    const studentName = studentToDelete.name;
    onDeleteStudent(studentToDelete.id);
    setStudentToDelete(null);
    showToast(`Aluno "${studentName}" foi excluído.`);
  };

  const pastelColorOptions = [
    { label: 'Verde Pastel', class: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { label: 'Índigo Pastel', class: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
    { label: 'Âmbar Pastel', class: 'bg-amber-50 text-amber-800 border-amber-200' },
    { label: 'Azul Pastel', class: 'bg-sky-50 text-sky-800 border-sky-200' },
    { label: 'Lavanda Pastel', class: 'bg-purple-50 text-purple-800 border-purple-200' },
  ];

  const getShiftBadgeConfig = (shift: TurnoTurma = 'Manhã') => {
    return TURNO_OPTIONS.find((o) => o.value === shift) || TURNO_OPTIONS[0];
  };

  const currentShiftConfig = currentTurma ? getShiftBadgeConfig(currentTurma.shift || 'Manhã') : TURNO_OPTIONS[0];
  const CurrentShiftIcon = currentShiftConfig.icon;

  return (
    <div className="space-y-6 relative">
      
      {/* Feedback Toast */}
      {feedbackToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 flex items-center gap-2.5 text-xs font-medium animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header with Title & Action */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Gestão Pedagógica de Turmas & Alunos</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Turmas e Alunos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre, altere ou exclua turmas por turno e gerencie os alunos com situação ativa ou inativa em caixa de seleção
          </p>
        </div>

        <button
          onClick={() => setIsAddingTurma(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-[0.98] self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Nova Turma</span>
        </button>
      </div>

      {/* Filter Tabs by Shift (Manhã, Tarde, Noite, Integral) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setShiftFilter('Todos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
            shiftFilter === 'Todos'
              ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
          }`}
        >
          <Filter className="w-3 h-3" />
          <span>Todos os Turnos</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
            shiftFilter === 'Todos' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {turmas.length}
          </span>
        </button>

        {TURNO_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const count = turmas.filter((t) => (t.shift || 'Manhã') === opt.value).length;
          const isSelected = shiftFilter === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setShiftFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : opt.badgeClass.split(' ')[1]}`} />
              <span>{opt.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                isSelected ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Turmas Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {filteredTurmas.length > 0 ? (
          filteredTurmas.map((turma) => {
            const isSelected = turma.id === currentTurma?.id;
            const count = students.filter((s) => s.turmaId === turma.id).length;
            const shiftConfig = getShiftBadgeConfig(turma.shift || 'Manhã');
            const ShiftIcon = shiftConfig.icon;

            return (
              <div
                key={turma.id}
                onClick={() => setSelectedTurmaId(turma.id)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/10'
                    : 'bg-white/80 hover:bg-white border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className={`p-2.5 rounded-xl border ${turma.colorPastel}`}>
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* Shift Badge */}
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${shiftConfig.badgeClass}`}>
                      <ShiftIcon className="w-3 h-3" />
                      <span>{shiftConfig.label}</span>
                    </span>

                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {turma.year}
                    </span>

                    {/* Botão Alterar Turma */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditTurma(turma);
                      }}
                      title="Alterar dados da turma"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors ml-0.5"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>

                    {/* Botão Excluir Turma */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTurmaToDelete(turma);
                      }}
                      title="Excluir turma"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-sm mt-3">
                  {turma.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{turma.grade}</p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <strong className="text-slate-800">{count}</strong> alunos
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectTurmaForExam(turma.id);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold text-[11px] flex items-center gap-0.5"
                  >
                    <span>Avaliações</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">
              Nenhuma turma encontrada no turno selecionado ({shiftFilter}).
            </p>
            <p className="text-xs text-slate-500">
              Clique em "Cadastrar Nova Turma" para adicionar uma sala neste turno ou volte para "Todos os Turnos".
            </p>
            <button
              type="button"
              onClick={() => setShiftFilter('Todos')}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
            >
              Ver Todas as Turmas
            </button>
          </div>
        )}
      </div>

      {/* Selected Turma Details & Student List */}
      {currentTurma && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          
          {/* Turma Detail Header */}
          <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">
                  {currentTurma.name}
                </h2>
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${currentTurma.colorPastel}`}>
                  {currentTurma.grade}
                </span>
                
                {/* Shift tag in header */}
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${currentShiftConfig.badgeClass}`}>
                  <CurrentShiftIcon className="w-3.5 h-3.5" />
                  <span>Turno: {currentShiftConfig.label} ({currentShiftConfig.sublabel})</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Disciplina padrão: {currentTurma.subjectDefault || 'Geral'} • {turmaStudents.length} alunos ({activeCount} ativos, {inactiveCount} inativos) • Ano {currentTurma.year}
              </p>
            </div>

            {/* Turma Actions & Student Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botão Alterar Turma Selecionada */}
              <button
                type="button"
                onClick={() => handleOpenEditTurma(currentTurma)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all"
                title="Alterar nome, turno ou configurações desta turma"
              >
                <Pencil className="w-3.5 h-3.5 text-slate-600" />
                <span>Alterar Turma</span>
              </button>

              {/* Botão Excluir Turma Selecionada */}
              <button
                type="button"
                onClick={() => setTurmaToDelete(currentTurma)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all"
                title="Excluir esta turma e desvincular alunos"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Excluir Turma</span>
              </button>

              {/* Botão Importar Alunos */}
              <button
                type="button"
                onClick={() => {
                  setIsImportingStudents(true);
                  setImportText('');
                  setImportPreview([]);
                  setImportError(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 active:scale-98"
                title="Importar lista de alunos (arquivo TXT/CSV ou colar)"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Alunos</span>
              </button>

              {/* Botão Adicionar Aluno */}
              <button
                type="button"
                onClick={() => setIsAddingStudent(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all shrink-0 active:scale-98"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Aluno</span>
              </button>
            </div>
          </div>

          {/* Sub-bar: Search & Status Filter (Ativos / Inativos) */}
          <div className="px-6 py-3 bg-slate-50/70 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                placeholder="Buscar aluno por nome ou matrícula..."
                className="pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-hidden w-full bg-white"
              />
            </div>

            {/* Filter by Status: Todos / Ativos / Inativos */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto">
              <span className="text-[11px] font-medium text-slate-500 mr-1">Filtrar:</span>
              <button
                type="button"
                onClick={() => setStudentStatusFilter('todos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  studentStatusFilter === 'todos'
                    ? 'bg-slate-800 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Todos ({turmaStudents.length})
              </button>

              <button
                type="button"
                onClick={() => setStudentStatusFilter('ativos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  studentStatusFilter === 'ativos'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-slate-200 text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ativos ({activeCount})
              </button>

              <button
                type="button"
                onClick={() => setStudentStatusFilter('inativos')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                  studentStatusFilter === 'inativos'
                    ? 'bg-slate-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Inativos ({inactiveCount})
              </button>
            </div>
          </div>

          {/* Students Table with Caixa de Seleção for Ativo/Inativo and Alterar/Excluir */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-6">Nº / Matrícula</th>
                  <th className="py-3 px-6">Nome do Aluno</th>
                  <th className="py-3 px-6">E-mail Institucional</th>
                  <th className="py-3 px-6">Turno</th>
                  <th className="py-3 px-6">
                    Situação (Caixa de Seleção)
                  </th>
                  <th className="py-3 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((stu) => {
                    const isStudentActive = stu.active !== false;

                    return (
                      <tr 
                        key={stu.id} 
                        className={`transition-colors ${isStudentActive ? 'hover:bg-slate-50/60' : 'bg-slate-50/40 opacity-75 hover:opacity-100 hover:bg-slate-100/60'}`}
                      >
                        <td className="py-3.5 px-6 font-mono font-medium text-slate-700">
                          {stu.enrollmentNumber}
                        </td>
                        <td className="py-3.5 px-6 font-medium text-slate-900">
                          <div className="flex items-center gap-2">
                            <span>{stu.name}</span>
                            {!isStudentActive && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-200 text-slate-600 font-semibold">
                                Inativo
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-6 text-slate-500">
                          {stu.email || '—'}
                        </td>
                        <td className="py-3.5 px-6">
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                            <CurrentShiftIcon className="w-3 h-3 text-slate-400" />
                            <span>{currentTurma.shift || 'Manhã'}</span>
                          </span>
                        </td>
                        
                        {/* Caixa de Seleção para Ativo ou Não */}
                        <td className="py-3.5 px-6">
                          <select
                            value={isStudentActive ? 'ativo' : 'inativo'}
                            onChange={(e) => {
                              const newStatus = e.target.value === 'ativo';
                              onUpdateStudent({
                                ...stu,
                                active: newStatus,
                              });
                              showToast(`Situação de "${stu.name}" alterada para ${newStatus ? 'Ativo' : 'Inativo'}.`);
                            }}
                            aria-label={`Situação de ${stu.name}`}
                            className={`px-2.5 py-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer outline-hidden shadow-2xs ${
                              isStudentActive
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80 focus:ring-2 focus:ring-emerald-300'
                                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200 focus:ring-2 focus:ring-slate-300'
                            }`}
                          >
                            <option value="ativo">✅ Ativo</option>
                            <option value="inativo">⏸️ Inativo</option>
                          </select>
                        </td>

                        {/* Ações: Alterar ou Excluir Aluno */}
                        <td className="py-3.5 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Alterar Aluno */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditStudent(stu)}
                              title="Alterar dados do aluno"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg font-medium transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Alterar</span>
                            </button>

                            {/* Excluir Aluno */}
                            <button
                              type="button"
                              onClick={() => setStudentToDelete(stu)}
                              title="Excluir aluno da turma"
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg font-medium transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      Nenhum aluno encontrado com os filtros aplicados nesta turma.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* Modal: Cadastrar Nova Turma com Opções de Turno */}
      {isAddingTurma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 my-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Cadastrar Nova Turma</h3>
                <p className="text-xs text-slate-500 mt-0.5">Defina o nome, nível escolar e selecione o turno de aula</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingTurma(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTurmaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome da Turma</label>
                <input
                  type="text"
                  value={newTurmaName}
                  onChange={(e) => setNewTurmaName(e.target.value)}
                  placeholder="Ex: 1º Ano C - Ensino Médio"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-hidden"
                  required
                />
              </div>

              {/* OPÇÕES DE TURNO: MANHÃ, TARDE, NOITE, INTEGRAL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Turno da Turma
                  </label>
                  <span className="text-[11px] font-medium text-slate-500">
                    Selecionado: <strong className="text-emerald-700">{newTurmaShift}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TURNO_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = newTurmaShift === opt.value;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setNewTurmaShift(opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 relative ${
                          isSelected
                            ? `${opt.activeRing} shadow-2xs`
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`p-1.5 rounded-lg border ${opt.badgeClass}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-900 leading-tight">
                            {opt.label}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {opt.sublabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nível de Ensino</label>
                  <select
                    value={newTurmaGrade}
                    onChange={(e) => setNewTurmaGrade(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-hidden bg-white"
                  >
                    <option value="Ensino Fundamental II">Fundamental II</option>
                    <option value="Ensino Médio">Ensino Médio</option>
                    <option value="Pré-Vestibular / ENEM">Pré-Vestibular</option>
                    <option value="Ensino Superior">Ensino Superior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ano Letivo</label>
                  <input
                    type="number"
                    value={newTurmaYear}
                    onChange={(e) => setNewTurmaYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Disciplina Principal</label>
                <input
                  type="text"
                  value={newTurmaSubject}
                  onChange={(e) => setNewTurmaSubject(e.target.value)}
                  placeholder="Ex: Física e Matemática"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Cor de Identificação</label>
                <div className="flex gap-2.5">
                  {pastelColorOptions.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewTurmaColor(opt.class)}
                      className={`w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center ${opt.class.split(' ')[0]} ${
                        newTurmaColor === opt.class ? 'border-slate-800 scale-105 shadow-xs' : 'border-slate-200'
                      }`}
                      title={opt.label}
                    >
                      {newTurmaColor === opt.class && (
                        <span className="w-2 h-2 rounded-full bg-slate-800" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingTurma(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-all active:scale-98"
                >
                  Salvar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Alterar Turma Existente */}
      {editingTurma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 my-6 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Alterar Turma</h3>
                <p className="text-xs text-slate-500 mt-0.5">Edite o nome, turno, nível de ensino ou cor da turma</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTurma(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateTurmaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome da Turma</label>
                <input
                  type="text"
                  value={editTurmaName}
                  onChange={(e) => setEditTurmaName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-hidden"
                  required
                />
              </div>

              {/* OPÇÕES DE TURNO */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Turno da Turma
                  </label>
                  <span className="text-[11px] font-medium text-slate-500">
                    Selecionado: <strong className="text-emerald-700">{editTurmaShift}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TURNO_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = editTurmaShift === opt.value;

                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setEditTurmaShift(opt.value)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 relative ${
                          isSelected
                            ? `${opt.activeRing} shadow-2xs`
                            : 'bg-white hover:bg-slate-50/80 border-slate-200 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className={`p-1.5 rounded-lg border ${opt.badgeClass}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          {isSelected && (
                            <span className="w-2 h-2 rounded-full bg-emerald-600 ring-2 ring-emerald-200" />
                          )}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-slate-900 leading-tight">
                            {opt.label}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {opt.sublabel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nível de Ensino</label>
                  <select
                    value={editTurmaGrade}
                    onChange={(e) => setEditTurmaGrade(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-hidden bg-white"
                  >
                    <option value="Ensino Fundamental II">Fundamental II</option>
                    <option value="Ensino Médio">Ensino Médio</option>
                    <option value="Pré-Vestibular / ENEM">Pré-Vestibular</option>
                    <option value="Ensino Superior">Ensino Superior</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ano Letivo</label>
                  <input
                    type="number"
                    value={editTurmaYear}
                    onChange={(e) => setEditTurmaYear(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Disciplina Principal</label>
                <input
                  type="text"
                  value={editTurmaSubject}
                  onChange={(e) => setEditTurmaSubject(e.target.value)}
                  placeholder="Ex: Física e Matemática"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Cor de Identificação</label>
                <div className="flex gap-2.5">
                  {pastelColorOptions.map((opt, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setEditTurmaColor(opt.class)}
                      className={`w-8 h-8 rounded-xl border-2 transition-all flex items-center justify-center ${opt.class.split(' ')[0]} ${
                        editTurmaColor === opt.class ? 'border-slate-800 scale-105 shadow-xs' : 'border-slate-200'
                      }`}
                      title={opt.label}
                    >
                      {editTurmaColor === opt.class && (
                        <span className="w-2 h-2 rounded-full bg-slate-800" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingTurma(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-98"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adicionar Aluno */}
      {isAddingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Adicionar Aluno
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Turma: <strong>{currentTurma.name}</strong> • Turno: <strong>{currentTurma.shift || 'Manhã'}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingStudent(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStudentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome Completo do Aluno</label>
                <input
                  type="text"
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Ex: Matheus Guimarães Silva"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nº de Matrícula (opcional)</label>
                <input
                  type="text"
                  value={newStudentMatricula}
                  onChange={(e) => setNewStudentMatricula(e.target.value)}
                  placeholder="Ex: 2026045"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">E-mail Institucional (opcional)</label>
                <input
                  type="email"
                  value={newStudentEmail}
                  onChange={(e) => setNewStudentEmail(e.target.value)}
                  placeholder="aluno@escola.edu.br"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden"
                />
              </div>

              {/* Caixa de Seleção: Ativo ou Não */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Situação Cadastral (Caixa de Seleção)
                </label>
                <select
                  value={newStudentActive ? 'ativo' : 'inativo'}
                  onChange={(e) => setNewStudentActive(e.target.value === 'ativo')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden bg-white font-medium"
                >
                  <option value="ativo">✅ Ativo (Frequente e habilitado para avaliações)</option>
                  <option value="inativo">⏸️ Inativo (Transferido, trancado ou suspenso)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddingStudent(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-98"
                >
                  Cadastrar Aluno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Alterar Aluno */}
      {editingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Alterar Dados do Aluno
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Atualize o nome, matrícula, turma e situação
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateStudentSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nome do Aluno</label>
                <input
                  type="text"
                  value={editStudentName}
                  onChange={(e) => setEditStudentName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nº de Matrícula</label>
                <input
                  type="text"
                  value={editStudentMatricula}
                  onChange={(e) => setEditStudentMatricula(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">E-mail Institucional</label>
                <input
                  type="email"
                  value={editStudentEmail}
                  onChange={(e) => setEditStudentEmail(e.target.value)}
                  placeholder="aluno@escola.edu.br"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden"
                />
              </div>

              {/* Reatribuir Turma */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Turma de Vínculo</label>
                <select
                  value={editStudentTurmaId}
                  onChange={(e) => setEditStudentTurmaId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden bg-white"
                >
                  {turmas.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} • {t.shift || 'Manhã'} ({t.grade})
                    </option>
                  ))}
                </select>
              </div>

              {/* Caixa de Seleção: Ativo ou Não */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Situação do Aluno (Caixa de Seleção)
                </label>
                <select
                  value={editStudentActive ? 'ativo' : 'inativo'}
                  onChange={(e) => setEditStudentActive(e.target.value === 'ativo')}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 outline-hidden bg-white font-medium"
                >
                  <option value="ativo">✅ Ativo (Frequente e habilitado para avaliações)</option>
                  <option value="inativo">⏸️ Inativo (Transferido, trancado ou suspenso)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-all active:scale-98"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Turma */}
      {turmaToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-rose-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Excluir Turma?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Tem certeza de que deseja excluir a turma <strong className="text-slate-900">"{turmaToDelete.name}"</strong>? 
                  Esta ação removerá todos os alunos matriculados e dados vinculados a esta sala.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTurmaToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTurma}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all active:scale-98"
              >
                Sim, Excluir Turma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Exclusão de Aluno */}
      {studentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-rose-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                <UserX className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  Excluir Aluno?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Tem certeza que deseja excluir o aluno <strong className="text-slate-900">"{studentToDelete.name}"</strong> (Matrícula: {studentToDelete.enrollmentNumber})?
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStudentToDelete(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteStudent}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-all active:scale-98"
              >
                Sim, Excluir Aluno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Importar Alunos em Lote */}
      {isImportingStudents && currentTurma && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 flex flex-col max-h-[90vh] space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Importar Alunos para {currentTurma.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Importe de arquivo (.txt, .csv) ou cole a lista de números e nomes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsImportingStudents(false);
                  setImportText('');
                  setImportPreview([]);
                  setImportError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 overflow-y-auto pr-1">
              {/* File upload button */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".txt,.csv,.tsv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="students-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Carregar Arquivo (.txt / .csv)</span>
                </button>
                <span className="text-xs text-slate-400">ou cole o texto abaixo:</span>
              </div>

              {/* Textarea */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Lista de Alunos (Nº Matrícula e Nome Completo)
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => handleImportTextChange(e.target.value)}
                  placeholder={`Exemplo de formatos aceitos:\n1 - ÁGATHA GABRIELA SILVA DE OLIVEIRA\n2 ALICE VITORIA TOMAZ PEDROSO\n3\tALISON MIGUEL DOS SANTOS OLIVEIRA`}
                  rows={6}
                  className="w-full text-xs font-mono p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-100 focus:border-emerald-400 outline-hidden bg-slate-50/50"
                />
              </div>

              {/* Error Message */}
              {importError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Preview table if parsed */}
              {importPreview.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800">
                      Pré-visualização ({importPreview.length} alunos detectados):
                    </span>
                    <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      Prontos para importar
                    </span>
                  </div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                        <tr>
                          <th className="px-3 py-2 w-24">Nº Matrícula</th>
                          <th className="px-3 py-2">Nome Completo do Aluno</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {importPreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            <td className="px-3 py-1.5 font-mono font-bold text-emerald-700">
                              {item.number}
                            </td>
                            <td className="px-3 py-1.5 text-slate-800 font-medium">
                              {item.name.toUpperCase()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 flex items-center justify-between border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Turma destino: <strong className="text-slate-800">{currentTurma.name}</strong>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportingStudents(false);
                    setImportText('');
                    setImportPreview([]);
                    setImportError(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={importPreview.length === 0}
                  onClick={handleConfirmImportStudents}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-xs transition-all active:scale-98"
                >
                  Confirmar Importação ({importPreview.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

