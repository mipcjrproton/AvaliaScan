/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { MenuTab, UserProfile, Turma, Student, Assessment, CorrectionRecord, SystemSettings } from './types';
import { storageService } from './services/storage';
import { sortStudentsByNumber } from './utils/studentSort';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { PrintableAnswerSheetModal } from './components/PrintableAnswerSheetModal';
import { ShareModal } from './components/ShareModal';
import { ShieldCheck, Download, X, Check } from 'lucide-react';

// Views for the menu items
import { InicioView } from './components/views/InicioView';
import { TurmasView } from './components/views/TurmasView';
import { AvaliacoesView } from './components/views/AvaliacoesView';
import { GerarView } from './components/views/GerarView';
import { CorrecoesView } from './components/views/CorrecoesView';
import { BoletimView } from './components/views/BoletimView';
import { RelatoriosView } from './components/views/RelatoriosView';
import { ConsultasView } from './components/views/ConsultasView';
import { ConfiguracoesView } from './components/views/ConfiguracoesView';
import { ManutencaoView } from './components/views/ManutencaoView';
import { AjudaView } from './components/views/AjudaView';

export default function App() {
  // Navigation & UI state: default to 'inicio' (Página Inicial) on app load as requested
  const [activeTab, setActiveTab] = useState<MenuTab>('inicio');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [printableAssessment, setPrintableAssessment] = useState<Assessment | null>(null);
  const [preselectedScanAssessmentId, setPreselectedScanAssessmentId] = useState<string | undefined>(undefined);
  const [preselectedBoletimAssessmentId, setPreselectedBoletimAssessmentId] = useState<string | undefined>(undefined);

  // Core persistent data
  const [user, setUser] = useState<UserProfile | null>(() => storageService.getUser());
  const [settings, setSettings] = useState<SystemSettings>(() => storageService.getSettings());
  const [turmas, setTurmas] = useState<Turma[]>(() => storageService.getTurmas());
  const [students, setStudents] = useState<Student[]>(() => storageService.getStudents());
  const [assessments, setAssessments] = useState<Assessment[]>(() => storageService.getAssessments());
  const [corrections, setCorrections] = useState<CorrectionRecord[]>(() => storageService.getCorrections());
  const [systemVersion, setSystemVersion] = useState<string>(() => storageService.getVersion());
  const [autoBackupNotice, setAutoBackupNotice] = useState<{ visible: boolean; title: string; count: number } | null>(null);

  // Save changes to storage
  useEffect(() => {
    if (user) storageService.setUser(user);
  }, [user]);

  useEffect(() => {
    storageService.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    storageService.setTurmas(turmas);
  }, [turmas]);

  useEffect(() => {
    storageService.setStudents(students);
  }, [students]);

  useEffect(() => {
    storageService.setAssessments(assessments);
  }, [assessments]);

  useEffect(() => {
    storageService.setCorrections(corrections);
  }, [corrections]);

  // Global: Desativar qualquer câmera ao fechar o app, sair do navegador ou minimizar/trocar de aba
  useEffect(() => {
    const handleShutdownAllCameras = () => {
      try {
        document.querySelectorAll('video').forEach((vid) => {
          if (vid.srcObject && 'getTracks' in (vid.srcObject as MediaStream)) {
            (vid.srcObject as MediaStream).getTracks().forEach((track) => {
              track.stop();
              track.enabled = false;
            });
            vid.srcObject = null;
          }
        });
      } catch (e) {
        console.warn('Erro ao encerrar stream da câmera:', e);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleShutdownAllCameras();
      }
    };

    window.addEventListener('beforeunload', handleShutdownAllCameras);
    window.addEventListener('pagehide', handleShutdownAllCameras);
    window.addEventListener('unload', handleShutdownAllCameras);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      handleShutdownAllCameras();
      window.removeEventListener('beforeunload', handleShutdownAllCameras);
      window.removeEventListener('pagehide', handleShutdownAllCameras);
      window.removeEventListener('unload', handleShutdownAllCameras);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handlers for Turmas
  const handleAddTurma = (newTurmaData: Omit<Turma, 'id' | 'createdAt'>) => {
    const newTurma: Turma = {
      ...newTurmaData,
      id: `turma_${Date.now().toString(36)}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setTurmas((prev) => [newTurma, ...prev]);
  };

  const handleUpdateTurma = (updatedTurma: Turma) => {
    setTurmas((prev) => prev.map((t) => (t.id === updatedTurma.id ? updatedTurma : t)));
    // Sync turmaName across assessments and corrections
    setAssessments((prev) =>
      prev.map((a) => (a.turmaId === updatedTurma.id ? { ...a, turmaName: updatedTurma.name } : a))
    );
    setCorrections((prev) =>
      prev.map((c) => (c.turmaId === updatedTurma.id ? { ...c, turmaName: updatedTurma.name } : c))
    );
  };

  const handleDeleteTurma = (id: string) => {
    setTurmas((prev) => prev.filter((t) => t.id !== id));
    setStudents((prev) => prev.filter((s) => s.turmaId !== id));
  };

  // Handlers for Students
  const handleAddStudent = (newStudentData: Omit<Student, 'id'> & { id?: string }) => {
    const uniqueSuffix = `${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    const newStudent: Student = {
      ...newStudentData,
      active: newStudentData.active !== undefined ? newStudentData.active : true,
      id: newStudentData.id || `alu_${uniqueSuffix}`,
    };
    setStudents((prev) => sortStudentsByNumber([newStudent, ...prev]));
    // update studentCount in turma
    setTurmas((prev) =>
      prev.map((t) => (t.id === newStudentData.turmaId ? { ...t, studentCount: t.studentCount + 1 } : t))
    );
  };

  const handleAddStudents = (newStudentsList: (Omit<Student, 'id'> & { id?: string })[]) => {
    if (newStudentsList.length === 0) return;
    const addedStudents: Student[] = newStudentsList.map((stu, idx) => ({
      ...stu,
      active: stu.active !== undefined ? stu.active : true,
      id: stu.id || `alu_${Date.now().toString(36)}_${idx}_${Math.random().toString(36).substring(2, 8)}`,
    }));

    setStudents((prev) => sortStudentsByNumber([...addedStudents, ...prev]));

    // Group counts by turmaId
    const countsByTurma: Record<string, number> = {};
    for (const s of addedStudents) {
      countsByTurma[s.turmaId] = (countsByTurma[s.turmaId] || 0) + 1;
    }

    setTurmas((prev) =>
      prev.map((t) => {
        const added = countsByTurma[t.id];
        return added ? { ...t, studentCount: t.studentCount + added } : t;
      })
    );
  };

  const handleUpdateStudent = (updatedStudent: Student) => {
    if (!updatedStudent || !updatedStudent.id) return;

    setStudents((prev) => {
      let isUpdated = false;
      const oldStudent = prev.find((s) => s.id === updatedStudent.id);

      // Map with single-item update guard so duplicate IDs cannot overwrite everyone
      const newStudents = prev.map((s) => {
        if (!isUpdated && s.id === updatedStudent.id) {
          isUpdated = true;
          return { ...updatedStudent };
        }
        return s;
      });

      // If student was transferred to another turma, update counts
      if (oldStudent && oldStudent.turmaId !== updatedStudent.turmaId) {
        setTurmas((tPrev) =>
          tPrev.map((t) => {
            if (t.id === oldStudent.turmaId) {
              return { ...t, studentCount: Math.max(0, t.studentCount - 1) };
            }
            if (t.id === updatedStudent.turmaId) {
              return { ...t, studentCount: t.studentCount + 1 };
            }
            return t;
          })
        );
      }
      return sortStudentsByNumber(newStudents);
    });

    // Sync studentName in corrections
    setCorrections((prev) =>
      prev.map((c) => (c.studentId === updatedStudent.id ? { ...c, studentName: updatedStudent.name } : c))
    );
  };

  const handleDeleteStudent = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    setStudents((prev) => prev.filter((s) => s.id !== studentId));
    if (student) {
      setTurmas((prev) =>
        prev.map((t) => (t.id === student.turmaId ? { ...t, studentCount: Math.max(0, t.studentCount - 1) } : t))
      );
    }
  };

  // Handlers for Assessments
  const handleAddAssessment = (newAss: Assessment) => {
    setAssessments((prev) => [newAss, ...prev]);
    const nextVer = storageService.incrementVersion();
    setSystemVersion(nextVer);
  };

  const handleUpdateAssessment = (updatedAss: Assessment) => {
    setAssessments((prev) =>
      prev.map((a) => (a.id === updatedAss.id ? updatedAss : a))
    );
    const nextVer = storageService.incrementVersion();
    setSystemVersion(nextVer);
  };

  const handleDeleteAssessment = (assessmentId: string) => {
    setAssessments((prev) => prev.filter((a) => a.id !== assessmentId));
    const nextVer = storageService.incrementVersion();
    setSystemVersion(nextVer);
  };

  const handleSelectScanAssessment = (assessmentId: string) => {
    setPreselectedScanAssessmentId(assessmentId);
    setActiveTab('correcoes');
  };

  // Handlers for Corrections
  const handleSaveCorrection = (record: CorrectionRecord) => {
    setCorrections((prev) => {
      const filtered = prev.filter(
        (c) => !(c.assessmentId === record.assessmentId && c.studentId === record.studentId)
      );
      return [record, ...filtered];
    });
    const nextVer = storageService.incrementVersion();
    setSystemVersion(nextVer);

    // Verificação de rotina de Backup Automático de Dados Locais (JSON)
    if (settings.autoBackupEnabled !== false && settings.autoBackupFrequency === 'after_corrections') {
      setAutoBackupNotice({
        visible: true,
        title: 'Cópia de Segurança Disponível',
        count: corrections.length + 1,
      });
    }
  };

  const handleDeleteCorrection = (correctionId: string) => {
    setCorrections((prev) => prev.filter((c) => c.id !== correctionId));
    const nextVer = storageService.incrementVersion();
    setSystemVersion(nextVer);
  };

  // Auth & Profile Handlers
  const handleAuthSuccess = (newUser: UserProfile) => {
    setUser(newUser);
    storageService.setUser(newUser);
    storageService.setAuthenticated(true);
    setIsAuthModalOpen(false);
  };

  const handleUpdateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    storageService.setSettings(newSettings);
    if (user) {
      const updatedUser: UserProfile = {
        ...user,
        name: newSettings.teacherName || user.name,
        schoolName: newSettings.schoolName || user.schoolName,
      };
      setUser(updatedUser);
      storageService.setUser(updatedUser);
    }
  };

  const handleUpdateUser = (updatedUser: UserProfile) => {
    setUser(updatedUser);
    storageService.setUser(updatedUser);
    setSettings((prev) => {
      const updated: SystemSettings = {
        ...prev,
        schoolName: updatedUser.schoolName || prev.schoolName,
        teacherName: updatedUser.name || prev.teacherName,
      };
      storageService.setSettings(updated);
      return updated;
    });
  };

  const handleLogout = () => {
    storageService.setAuthenticated(false);
    setUser(null);
    setIsAuthModalOpen(true);
  };

  // Handlers for Reset / Clear Individual Files (Manutenção)
  const handleClearTurmas = () => {
    setTurmas([]);
  };

  const handleClearStudents = () => {
    setStudents([]);
    setTurmas((prev) => prev.map((t) => ({ ...t, studentCount: 0 })));
  };

  const handleClearAssessments = () => {
    setAssessments([]);
  };

  const handleClearCorrections = () => {
    setCorrections([]);
  };

  const handleClearSettings = () => {
    setSettings(storageService.getSettings());
  };

  const handleClearAllData = () => {
    setTurmas([]);
    setStudents([]);
    setAssessments([]);
    setCorrections([]);
  };

  const handleImportSingleFile = (fileKey: 'turmas' | 'students' | 'assessments' | 'corrections', items: any[]) => {
    if (fileKey === 'turmas') {
      setTurmas(items);
    } else if (fileKey === 'students') {
      setStudents(items);
    } else if (fileKey === 'assessments') {
      setAssessments(items);
    } else if (fileKey === 'corrections') {
      setCorrections(items);
    }
  };

  // Reset to initial sample state
  const handleResetData = () => {
    storageService.resetToDefault();
    setUser(storageService.getUser());
    setSettings(storageService.getSettings());
    setTurmas(storageService.getTurmas());
    setStudents(storageService.getStudents());
    setAssessments(storageService.getAssessments());
    setCorrections(storageService.getCorrections());
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-800 antialiased font-sans">
      
      {/* Top Navbar */}
      <Navbar
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        activeTab={activeTab}
      />

      {/* Main Application Shell with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto no-print">
        
        {/* Left Sidebar (The 8 requested items) */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
          turmasCount={turmas.length}
          avaliacoesCount={assessments.length}
          correcoesCount={corrections.length}
          onOpenShareModal={() => setIsShareModalOpen(true)}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto max-w-full no-print">
          
          {activeTab === 'inicio' && (
            <InicioView
              turmas={turmas}
              students={students}
              assessments={assessments}
              corrections={corrections}
              user={user}
              settings={settings}
              systemVersion={systemVersion}
              onNavigate={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenShareModal={() => setIsShareModalOpen(true)}
            />
          )}

          {activeTab === 'turmas' && (
            <TurmasView
              turmas={turmas}
              students={students}
              onAddTurma={handleAddTurma}
              onUpdateTurma={handleUpdateTurma}
              onDeleteTurma={handleDeleteTurma}
              onAddStudent={handleAddStudent}
              onAddStudents={handleAddStudents}
              onUpdateStudent={handleUpdateStudent}
              onDeleteStudent={handleDeleteStudent}
              onSelectTurmaForExam={(turmaId) => {
                setActiveTab('avaliacoes');
              }}
            />
          )}

          {activeTab === 'avaliacoes' && (
            <AvaliacoesView
              assessments={assessments}
              turmas={turmas}
              systemVersion={systemVersion}
              onAddAssessment={handleAddAssessment}
              onUpdateAssessment={handleUpdateAssessment}
              onDeleteAssessment={handleDeleteAssessment}
              onSelectScanAssessment={handleSelectScanAssessment}
              onPrintAssessment={(ass) => setPrintableAssessment(ass)}
              onOpenBoletim={(assessmentId) => {
                setPreselectedBoletimAssessmentId(assessmentId);
                setActiveTab('boletim');
              }}
              onNavigateToGerar={(assessmentId) => {
                setActiveTab('gerar');
              }}
            />
          )}

          {activeTab === 'gerar' && (
            <GerarView
              assessments={assessments}
              turmas={turmas}
              students={students}
              schoolName={settings.schoolName || user?.schoolName || 'Colégio Integrado Horizonte'}
              schoolLogo={settings.schoolLogo}
              onUpdateSchoolLogo={(logo) => {
                handleUpdateSettings({ ...settings, schoolLogo: logo });
              }}
              onNavigateTab={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}

          {activeTab === 'correcoes' && (
            <CorrecoesView
              assessments={assessments}
              students={students}
              corrections={corrections}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onSaveCorrection={handleSaveCorrection}
              onDeleteCorrection={handleDeleteCorrection}
              preselectedAssessmentId={preselectedScanAssessmentId}
              onNavigate={(tab) => {
                setActiveTab(tab);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onOpenShareModal={() => setIsShareModalOpen(true)}
            />
          )}

          {activeTab === 'boletim' && (
            <BoletimView
              assessments={assessments}
              turmas={turmas}
              students={students}
              corrections={corrections}
              initialAssessmentId={preselectedBoletimAssessmentId}
              onOpenCorrectionDetail={() => {
                setActiveTab('consultas');
              }}
              onNavigateToScanner={(assessmentId, studentId) => {
                setPreselectedScanAssessmentId(assessmentId);
                setActiveTab('correcoes');
              }}
            />
          )}

          {activeTab === 'relatorios' && (
            <RelatoriosView
              assessments={assessments}
              turmas={turmas}
              students={students}
              corrections={corrections}
            />
          )}

          {activeTab === 'consultas' && (
            <ConsultasView
              corrections={corrections}
              students={students}
              turmas={turmas}
              assessments={assessments}
              onDeleteCorrection={handleDeleteCorrection}
              onSaveCorrection={handleSaveCorrection}
            />
          )}

          {activeTab === 'configuracoes' && (
            <ConfiguracoesView
              user={user}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onUpdateUser={handleUpdateUser}
              onOpenAuth={() => setIsAuthModalOpen(true)}
              onRestoreData={(data) => {
                if (data.turmas) setTurmas(data.turmas);
                if (data.students) setStudents(data.students);
                if (data.assessments) setAssessments(data.assessments);
                if (data.corrections) setCorrections(data.corrections);
                if (data.settings) setSettings(data.settings);
                if (data.user) setUser(data.user);
                if (data.generatedExams && Array.isArray(data.generatedExams)) {
                  data.generatedExams.forEach((ge: any) => storageService.saveGeneratedExam(ge));
                }
              }}
            />
          )}

          {activeTab === 'manutencao' && (
            <ManutencaoView
              turmas={turmas}
              students={students}
              assessments={assessments}
              corrections={corrections}
              settings={settings}
              onClearTurmas={handleClearTurmas}
              onClearStudents={handleClearStudents}
              onClearAssessments={handleClearAssessments}
              onClearCorrections={handleClearCorrections}
              onClearSettings={handleClearSettings}
              onClearAll={handleClearAllData}
              onResetData={handleResetData}
              onRestoreData={(data) => {
                if (data.turmas) setTurmas(data.turmas);
                if (data.students) setStudents(data.students);
                if (data.assessments) setAssessments(data.assessments);
                if (data.corrections) setCorrections(data.corrections);
                if (data.settings) setSettings(data.settings);
                if (data.generatedExams && Array.isArray(data.generatedExams)) {
                  data.generatedExams.forEach((ge: any) => storageService.saveGeneratedExam(ge));
                }
              }}
              onImportFile={handleImportSingleFile}
            />
          )}

          {activeTab === 'ajuda' && (
            <AjudaView
              assessments={assessments}
              onOpenPrintModal={(ass) => setPrintableAssessment(ass)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

        </main>
      </div>

      {/* Authentication Modal (Google, Biometrics/Digital & Email) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        currentUser={user}
      />

      {/* Printable Sheet Modal (Gabarito Oficial A4) */}
      <PrintableAnswerSheetModal
        assessment={printableAssessment}
        students={students}
        isOpen={!!printableAssessment}
        onClose={() => setPrintableAssessment(null)}
        schoolName={settings.schoolName || user?.schoolName || 'Colégio Integrado Horizonte'}
        schoolLogo={settings.schoolLogo}
        onUpdateSchoolLogo={(logo) => {
          handleUpdateSettings({ ...settings, schoolLogo: logo });
        }}
      />

      {/* Modal de Compartilhamento do Aplicativo */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Notificação Flutuante de Backup Automático de Dados (JSON) */}
      {autoBackupNotice && autoBackupNotice.visible && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-indigo-500/30 flex items-start gap-3 animate-in slide-in-from-bottom-5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>{autoBackupNotice.title}</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-mono">JSON</span>
              </h4>
              <button
                type="button"
                onClick={() => setAutoBackupNotice(null)}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                title="Fechar aviso"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Novas correções foram registradas. Baixe uma cópia de segurança em JSON no seu dispositivo.
            </p>
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  storageService.downloadBackupFile(undefined, true);
                  setAutoBackupNotice(null);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Backup (JSON)</span>
              </button>
              <button
                type="button"
                onClick={() => setAutoBackupNotice(null)}
                className="px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Depois
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
