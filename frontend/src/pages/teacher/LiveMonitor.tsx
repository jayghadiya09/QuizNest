import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { ShieldAlert, Users, Terminal } from 'lucide-react';

interface ExamTemplate {
  _id: string;
  title: string;
  duration: number;
}

interface StudentSession {
  studentId: string;
  studentName: string;
  status: 'ACTIVE' | 'AWAY' | 'SUBMITTED' | 'OFFLINE';
  warningsCount: number;
  tabSwitchesCount: number;
}

interface LiveLog {
  id: string;
  studentName: string;
  type: 'JOINED' | 'TAB_SWITCH' | 'WINDOW_BLUR' | 'FOCUS_RESUMED' | 'SUBMITTED' | 'DISCONNECTED';
  message: string;
  timestamp: Date;
}

export const LiveMonitor: React.FC = () => {
  const { api } = useAuth();
  const [searchParams] = useSearchParams();

  const [exams, setExams] = useState<ExamTemplate[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [activeStudents, setActiveStudents] = useState<StudentSession[]>([]);
  const [logs, setLogs] = useState<LiveLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  // 1. Fetch Teacher's templates list
  useEffect(() => {
    const fetchExams = async () => {
      try {
        const res = await api.get('/exams');
        setExams(res.data);
        
        const urlExamId = searchParams.get('exam');
        if (urlExamId) {
          setSelectedExamId(urlExamId);
        } else if (res.data.length > 0) {
          setSelectedExamId(res.data[0]._id);
        }
      } catch (err: any) {
        console.error('Failed to load templates list', err);
      }
    };
    fetchExams();
  }, [searchParams]);

  // 2. WebSockets setup on select
  useEffect(() => {
    if (!selectedExamId) {
      setActiveStudents([]);
      setLogs([]);
      return;
    }

    setActiveStudents([]);
    setLogs([
      {
        id: 'init',
        studentName: 'System',
        type: 'JOINED',
        message: 'Initializing proctor socket telemetry channel...',
        timestamp: new Date()
      }
    ]);

    socketRef.current = io('http://localhost:5001');

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      socketRef.current?.emit('join-proctor', { examId: selectedExamId });
      addLog('System', 'JOINED', `Connected to exam proctoring room.`);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      addLog('System', 'DISCONNECTED', 'Connection to socket host lost.');
    });

    socketRef.current.on('active-students-list', (list: any[]) => {
      // Map initial join list
      const mapped = list.map((item) => ({
        studentId: item.studentId,
        studentName: item.studentName,
        status: item.status as any,
        warningsCount: 0,
        tabSwitchesCount: 0
      }));
      setActiveStudents(mapped);
      addLog('System', 'JOINED', `Active students list loaded: ${list.length} student(s) currently online.`);
    });

    socketRef.current.on('student-status-changed', (session: StudentSession) => {
      setActiveStudents((prev) => {
        const index = prev.findIndex((s) => s.studentId === session.studentId);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            ...session
          };
          return updated;
        } else {
          return [...prev, session];
        }
      });

      if (session.status === 'SUBMITTED') {
        addLog(session.studentName, 'SUBMITTED', 'Exam submitted and finished.');
      } else if (session.status === 'ACTIVE') {
        addLog(session.studentName, 'FOCUS_RESUMED', 'Returned focus to exam window.');
      }
    });

    socketRef.current.on(
      'student-alert',
      (data: {
        studentId: string;
        studentName: string;
        alertType: 'TAB_SWITCH' | 'WINDOW_BLUR';
        timestamp: string;
        sessionInfo: StudentSession;
      }) => {
        setActiveStudents((prev) => {
          const index = prev.findIndex((s) => s.studentId === data.studentId);
          if (index > -1) {
            const updated = [...prev];
            updated[index] = data.sessionInfo;
            return updated;
          } else {
            return [...prev, data.sessionInfo];
          }
        });

        const label = data.alertType === 'TAB_SWITCH' ? 'switched browser tabs' : 'unfocused window';
        addLog(
          data.studentName,
          data.alertType,
          `Security Alert: Student ${label}. Warnings count: ${data.sessionInfo.warningsCount}`
        );
      }
    );

    socketRef.current.on('student-offline', (data: { studentId: string; studentName: string; status: string }) => {
      setActiveStudents((prev) =>
        prev.map((s) => (s.studentId === data.studentId ? { ...s, status: 'OFFLINE' as const } : s))
      );
      addLog(data.studentName, 'DISCONNECTED', 'Student closed exam tab or went offline.');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [selectedExamId]);

  const addLog = (
    studentName: string,
    type: LiveLog['type'],
    message: string
  ) => {
    setLogs((prev) => [
      {
        id: Math.random().toString(36).substring(7),
        studentName,
        type,
        message,
        timestamp: new Date()
      },
      ...prev.slice(0, 49)
    ]);
  };

  const getStatusBadge = (status: StudentSession['status']) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            ACTIVE
          </span>
        );
      case 'AWAY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            AWAY
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            SUBMITTED
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-500 border border-slate-700">
            OFFLINE
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col gap-6 text-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2.5">
            <ShieldAlert className="w-8 h-8 text-brand-400" /> Live Proctor Hub
          </h1>
          <p className="text-slate-400 mt-1">Watch active student sessions and detect exam violations in real-time.</p>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold border ${
              isConnected
                ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                : 'bg-red-500/10 border-red-500/25 text-red-400'
            }`}
          >
            {isConnected ? 'LIVE TELEMETRY' : 'OFFLINE'}
          </span>

          <select
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
            className="px-3 py-2 border border-slate-800 rounded-xl bg-slate-900 text-xs text-white focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <option value="" disabled>-- Select Exam Template --</option>
            {exams.map((e) => (
              <option key={e._id} value={e._id}>{e.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start flex-1">
        {/* Candidates Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-slate-350 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand-400" /> Monitored Candidates ({activeStudents.length})
          </h2>

          {activeStudents.length === 0 ? (
            <div className="glass-panel p-12 rounded-2xl text-center text-slate-500 border-dashed">
              No students are currently taking this exam. Telemetry is active; waiting for incoming connections.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {activeStudents.map((student) => {
                const hasAlerts = student.warningsCount > 0;

                return (
                  <div
                    key={student.studentId}
                    className={`glass-panel rounded-2xl p-4 space-y-4 border transition-all ${
                      student.status === 'AWAY'
                        ? 'border-amber-500/40 bg-amber-500/5 shadow-amber-500/5'
                        : student.status === 'ACTIVE' && hasAlerts
                        ? 'border-red-500/20 bg-slate-900/60'
                        : 'hover:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h3 className="font-bold text-white text-xs">{student.studentName}</h3>
                        <span className="text-[9px] text-slate-500">ID: {student.studentId}</span>
                      </div>
                      {getStatusBadge(student.status)}
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 text-center">
                      <div>
                        <div className="text-[8px] text-slate-500 uppercase font-bold">Total Warnings</div>
                        <div
                          className={`text-base font-black mt-0.5 ${
                            student.warningsCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-400'
                          }`}
                        >
                          {student.warningsCount}
                        </div>
                      </div>

                      <div>
                        <div className="text-[8px] text-slate-500 uppercase font-bold">Tab Switches</div>
                        <div
                          className={`text-base font-black mt-0.5 ${
                            student.tabSwitchesCount > 0 ? 'text-amber-500' : 'text-slate-400'
                          }`}
                        >
                          {student.tabSwitchesCount}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Log Stream */}
        <div className="glass-panel rounded-2xl p-4 flex flex-col h-[500px] border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between pb-3 border-b border-slate-900 mb-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-brand-400" /> Proctor Event Log
            </h3>
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-550 animate-pulse"></span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-[9px] leading-relaxed">
            {logs.length === 0 ? (
              <div className="text-center text-slate-600 mt-12">Waiting for event alerts...</div>
            ) : (
              logs.map((log) => {
                const timeStr = log.timestamp.toLocaleTimeString();
                
                let typeColor = 'text-blue-400';
                let messageColor = 'text-slate-400';

                if (log.type === 'TAB_SWITCH' || log.type === 'WINDOW_BLUR') {
                  typeColor = 'text-rose-500 font-bold';
                  messageColor = 'text-rose-450';
                } else if (log.type === 'FOCUS_RESUMED') {
                  typeColor = 'text-emerald-400';
                  messageColor = 'text-slate-350';
                } else if (log.type === 'SUBMITTED') {
                  typeColor = 'text-indigo-400';
                  messageColor = 'text-slate-500';
                } else if (log.type === 'DISCONNECTED') {
                  typeColor = 'text-amber-500';
                  messageColor = 'text-amber-400/90';
                }

                return (
                  <div key={log.id} className="border-b border-slate-900/60 pb-1.5">
                    <span className="text-slate-600">[{timeStr}]</span>{' '}
                    <span className={typeColor}>{log.studentName}</span>:{' '}
                    <span className={messageColor}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
