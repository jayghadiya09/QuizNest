import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { io, Socket } from 'socket.io-client';
import { ShieldAlert, Clock, AlertTriangle, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface Question {
  _id: string;
  type: 'SINGLE_MCQ' | 'MULTI_MCQ' | 'SHORT_ANSWER';
  questionText: string;
  options: string[];
  difficulty: string;
  marks: number;
}

export const ExamPage: React.FC = () => {
  const { id: templateId } = useParams<{ id: string }>();
  const { user, api } = useAuth();
  const navigate = useNavigate();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Security Proctoring Hardware
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [mediaGranted, setMediaGranted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Active navigation & responses state
  // Map of questionId -> answers string array
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responsesMap, setResponsesMap] = useState<Record<string, string[]>>({});

  // Security Flags
  const [warnings, setWarnings] = useState(0);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertType, setAlertType] = useState<'TAB_SWITCH' | 'WINDOW_BLUR' | null>(null);
  const [currentWarningNum, setCurrentWarningNum] = useState(0);

  // Time remaining (seconds)
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<any>(null);
  const autosaveRef = useRef<any>(null);

  // Submission Results
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    score: number;
    maxScore: number;
    warningsCount: number;
    completedAt: string;
  } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const disqualifyingRef = useRef(false);
  const lastAlertTimeRef = useRef<number>(0);

  // Device Selection & Audio Visualizer hooks
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoId, setSelectedVideoId] = useState<string>('');
  const [selectedAudioId, setSelectedAudioId] = useState<string>('');
  const [volume, setVolume] = useState<number>(0);
  const [setupActive, setSetupActive] = useState<boolean>(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const initDevices = async () => {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const video = allDevices.filter(d => d.kind === 'videoinput');
      const audio = allDevices.filter(d => d.kind === 'audioinput');
      setVideoDevices(video);
      setAudioDevices(audio);
      if (video.length > 0) setSelectedVideoId(video[0].deviceId);
      if (audio.length > 0) setSelectedAudioId(audio[0].deviceId);
      setSetupActive(true);
    } catch (err) {
      console.error('Failed to list media devices:', err);
    }
  };

  const startVolumeMeter = (stream: MediaStream) => {
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        setVolume(Math.min(100, Math.round((average / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(checkVolume);
      };

      checkVolume();
    } catch (e) {
      console.error('Failed to start audio visualizer:', e);
    }
  };

  const handleDeviceChange = async (videoId: string, audioId: string) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: videoId ? { deviceId: { exact: videoId } } : true,
        audio: audioId ? { deviceId: { exact: audioId } } : true
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setMediaStream(stream);
      startVolumeMeter(stream);
    } catch (err) {
      console.error('Failed to swap media devices:', err);
    }
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // 1. Initialize and Start Exam Attempt
  useEffect(() => {
    const startExam = async () => {
      try {
        const res = await api.post('/attempts/start', { templateId });
        const { attemptId: attId, timeLeft: tLeft, questions: qList, title: tTitle, description: tDesc } = res.data;
        
        setAttemptId(attId);
        setTimeLeft(tLeft);
        setQuestions(qList);
        setTitle(tTitle);
        setDescription(tDesc);

        // Prepopulate responsesMap with empty arrays for each question
        const initialMap: Record<string, string[]> = {};
        qList.forEach((q: Question) => {
          initialMap[q._id] = [];
        });
        setResponsesMap(initialMap);
      } catch (err: any) {
        setError(err.message || 'Failed to start examination session');
      } finally {
        setLoading(false);
      }
    };
    startExam();
  }, [templateId]);

  // 2. WebSockets connection & events
  useEffect(() => {
    if (!attemptId || !user) return;

    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');

    socketRef.current.emit('join-exam', {
      studentId: user.id,
      studentName: user.name,
      examId: templateId
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [attemptId, user, templateId]);

  // 3. Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 && attemptId) {
      if (timeLeft === 0 && !submitting && !result) {
        triggerAutoSubmit();
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft, attemptId]);

  // 4. Auto-save answers periodically (Every 30 seconds)
  useEffect(() => {
    if (!attemptId || result) return;

    autosaveRef.current = setInterval(() => {
      autoSaveProgress();
    }, 30000);

    return () => {
      if (autosaveRef.current) clearInterval(autosaveRef.current);
    };
  }, [attemptId, responsesMap, result]);

  // 5. Hardware proctoring stream cleanup
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [mediaStream]);

  // 6. Fullscreen state tracker change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFull = !!document.fullscreenElement;
      setIsFullscreen(isCurrentlyFull);
      if (attemptId && !result && !isCurrentlyFull) {
        reportCheatAlert('WINDOW_BLUR'); // log suspicion trigger
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [attemptId, result]);

  // 7. Session Warden monitoring listeners
  useEffect(() => {
    if (!attemptId || result || !mediaGranted) return;

    // Grace period: wait 2.5 seconds after media setup confirmed before monitoring focus switches
    let activeWarden = false;
    const wardenTimer = setTimeout(() => {
      activeWarden = true;
    }, 2500);

    const handleVisibilityChange = () => {
      if (!activeWarden) return;
      if (document.visibilityState === 'hidden') {
        reportCheatAlert('TAB_SWITCH');
      } else {
        resumeFocus();
      }
    };

    const handleWindowBlur = () => {
      if (!activeWarden) return;
      reportCheatAlert('WINDOW_BLUR');
    };

    const handleWindowFocus = () => {
      if (!activeWarden) return;
      resumeFocus();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeWarden) return;
      if (
        e.key === 'F5' ||
        e.key === 'F11' ||
        e.key === 'F12' ||
        e.key === 'Tab' ||
        e.key === 'Alt' ||
        e.key === 'Meta' ||
        ((e.ctrlKey || e.metaKey) && e.key === 'r') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'i')
      ) {
        e.preventDefault();
        reportCheatAlert('WINDOW_BLUR');
      }
    };

    const preventDefault = (e: any) => {
      if (activeWarden) e.preventDefault();
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', preventDefault);
    document.addEventListener('copy', preventDefault);
    document.addEventListener('paste', preventDefault);

    return () => {
      clearTimeout(wardenTimer);
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', preventDefault);
      document.removeEventListener('copy', preventDefault);
      document.removeEventListener('paste', preventDefault);
    };
  }, [attemptId, result, mediaGranted]);


  const triggerDisqualification = async (finalWarnings: number, finalTabSwitches: number) => {
    if (disqualifyingRef.current) return;
    disqualifyingRef.current = true;

    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (autosaveRef.current) clearInterval(autosaveRef.current);

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }

    try {
      const payload = compileResponsesPayload();
      const res = await api.post(`/attempts/${attemptId}/submit`, {
        responses: payload,
        warningsCount: finalWarnings,
        tabSwitchesCount: finalTabSwitches,
        cheatingDetected: true
      });

      setResult(res.data.attempt);

      if (socketRef.current) {
        socketRef.current.emit('submit-exam', {
          studentId: user?.id,
          studentName: user?.name,
          examId: templateId
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit exam attempt');
    } finally {
      setSubmitting(false);
    }
  };

  const reportCheatAlert = (alertTypeStr: 'TAB_SWITCH' | 'WINDOW_BLUR') => {
    if (result || disqualifyingRef.current) return;

    const now = Date.now();
    if (now - lastAlertTimeRef.current < 1000) {
      // Ignore duplicate focus events (e.g. blur right after visibilitychange)
      return;
    }
    lastAlertTimeRef.current = now;

    setTabSwitches((prev) => {
      const nextSwitches = prev + 1;
      setWarnings((wPrev) => {
        const nextWarnings = wPrev + 1;
        if (nextSwitches > 2) {
          triggerDisqualification(nextWarnings, nextSwitches);
        }
        return nextWarnings;
      });

      if (socketRef.current) {
        socketRef.current.emit('cheat-alert', {
          studentId: user?.id,
          studentName: user?.name,
          examId: templateId,
          alertType: alertTypeStr
        });
      }

      if (nextSwitches <= 2) {
        setCurrentWarningNum(nextSwitches);
        setAlertType(alertTypeStr);
        setShowAlertModal(true);
      }
      return nextSwitches;
    });
  };

  const resumeFocus = () => {
    if (socketRef.current) {
      socketRef.current.emit('resume-focus', {
        studentId: user?.id,
        studentName: user?.name,
        examId: templateId
      });
    }
  };

  const compileResponsesPayload = () => {
    return Object.keys(responsesMap).map((questionId) => ({
      questionId,
      answers: responsesMap[questionId]
    }));
  };

  const autoSaveProgress = async () => {
    if (!attemptId) return;
    try {
      const payload = compileResponsesPayload();
      await api.post(`/attempts/${attemptId}/progress`, { responses: payload });
      console.log('Background autosave successful.');
    } catch (err) {
      console.error('Autosave failed:', err);
    }
  };

  const handleSubmitExam = async (confirm = true) => {
    if (confirm && !window.confirm('Are you sure you want to finalize and submit this exam attempt?')) {
      return;
    }

    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (autosaveRef.current) clearInterval(autosaveRef.current);

    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      setMediaStream(null);
    }

    try {
      const payload = compileResponsesPayload();
      const res = await api.post(`/attempts/${attemptId}/submit`, {
        responses: payload,
        warningsCount: warnings,
        tabSwitchesCount: tabSwitches
      });

      setResult(res.data.attempt);

      if (socketRef.current) {
        socketRef.current.emit('submit-exam', {
          studentId: user?.id,
          studentName: user?.name,
          examId: templateId
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit exam attempt');
    } finally {
      setSubmitting(false);
    }
  };

  const triggerAutoSubmit = () => {
    alert('Time limit reached! System will auto-submit your attempt.');
    handleSubmitExam(false);
  };

  // Response inputs handlers
  const handleSingleMCQSelect = (questionId: string, optionIdxStr: string) => {
    setResponsesMap((prev) => ({
      ...prev,
      [questionId]: [optionIdxStr]
    }));
  };

  const handleMultiMCQSelect = (questionId: string, optionIdxStr: string) => {
    setResponsesMap((prev) => {
      const current = prev[questionId] || [];
      const updated = current.includes(optionIdxStr)
        ? current.filter((v) => v !== optionIdxStr)
        : [...current, optionIdxStr];
      return {
        ...prev,
        [questionId]: updated
      };
    });
  };

  const handleShortAnswerChange = (questionId: string, textVal: string) => {
    setResponsesMap((prev) => ({
      ...prev,
      [questionId]: [textVal]
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (attemptId && (!mediaGranted || !isFullscreen) && !result) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/95 backdrop-blur-md text-xs overflow-y-auto">
        <div className="glass-panel max-w-lg w-full rounded-2xl p-6 md:p-8 space-y-6 shadow-2xl border-brand-500/30 my-8">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-xl flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-lg font-bold text-white">Security Warden Initialization</h2>
            <p className="text-slate-400 text-[10px] leading-relaxed max-w-sm mx-auto">
              This exam requires camera and microphone telemetry. Select and test your proctoring hardware setup before entering.
            </p>
          </div>

          {!setupActive ? (
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-850 text-slate-350 space-y-2">
                <p className="font-bold text-white">Hardware Telemetry Consents</p>
                <ul className="list-disc pl-4 space-y-1 text-slate-400 text-[10px]">
                  <li>You must grant camera and microphone recording access.</li>
                  <li>Real-time visual feeds are broadcast directly to the examiner.</li>
                  <li>A volume monitor logs suspicious room noises.</li>
                </ul>
              </div>
              <button
                onClick={async () => {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    streamRef.current = stream;
                    setMediaStream(stream);
                    await initDevices();
                    startVolumeMeter(stream);
                  } catch (e) {
                    alert('Webcam and Microphone authorization are strictly required to start the exam.');
                  }
                }}
                className="w-full py-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-extrabold shadow-lg transition-all cursor-pointer text-xs"
              >
                Request Device Access
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Webcam Preview */}
              <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-inner flex items-center justify-center">
                <video
                  ref={(video) => {
                    if (video && mediaStream) {
                      video.srcObject = mediaStream;
                      video.play().catch((e) => console.log('Video autoplay blocked:', e));
                    }
                  }}
                  muted
                  playsInline
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[9px] text-brand-400 font-bold uppercase tracking-wider font-mono">
                  Live Preview
                </span>
              </div>

              {/* Volume meter */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-slate-400 text-[9px] uppercase tracking-wider font-bold">
                  <span>Microphone Activity</span>
                  <span className="font-mono text-brand-400">{volume}%</span>
                </div>
                <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-75"
                    style={{ width: `${volume}%` }}
                  />
                </div>
              </div>

              {/* Hardware Selection Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">
                    Webcam Source
                  </label>
                  <select
                    value={selectedVideoId}
                    onChange={(e) => {
                      setSelectedVideoId(e.target.value);
                      handleDeviceChange(e.target.value, selectedAudioId);
                    }}
                    className="block w-full px-2.5 py-2 border border-slate-800 rounded-lg bg-slate-900/60 text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    {videoDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 text-[9px] font-bold uppercase tracking-wider block">
                    Microphone Source
                  </label>
                  <select
                    value={selectedAudioId}
                    onChange={(e) => {
                      setSelectedAudioId(e.target.value);
                      handleDeviceChange(selectedVideoId, e.target.value);
                    }}
                    className="block w-full px-2.5 py-2 border border-slate-800 rounded-lg bg-slate-900/60 text-white text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-500 cursor-pointer"
                  >
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label || `Microphone ${d.deviceId.slice(0, 5)}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Trigger */}
              <button
                onClick={async () => {
                  // Clean up visualizer resources
                  if (audioContextRef.current) {
                    audioContextRef.current.close().catch(() => {});
                  }
                  if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                  }

                  // 2. Request Fullscreen
                  try {
                    if (document.documentElement.requestFullscreen) {
                      await document.documentElement.requestFullscreen();
                    } else if ((document.documentElement as any).webkitRequestFullscreen) {
                      await (document.documentElement as any).webkitRequestFullscreen();
                    } else if ((document.documentElement as any).msRequestFullscreen) {
                      await (document.documentElement as any).msRequestFullscreen();
                    }
                    setIsFullscreen(true);
                  } catch (e) {
                    console.error('Fullscreen access denied:', e);
                  }

                  setMediaGranted(true);
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-violet-600 hover:from-brand-500 hover:to-violet-500 text-white font-extrabold shadow-lg transition-all cursor-pointer text-xs uppercase tracking-wider"
              >
                Confirm Setup & Enter Exam
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-950">
        <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || questions.length === 0) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 glass-panel rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto" />
        <h2 className="text-xl font-bold text-white">Access Violation / Error</h2>
        <p className="text-xs text-slate-400">{error || 'Could not launch exam session.'}</p>
        <button
          onClick={() => navigate('/student')}
          className="w-full py-2.5 px-4 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-brand-600/20"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }



  if (result) {
    const percentage = result.maxScore > 0 ? Math.round((result.score / result.maxScore) * 100) : 0;
    const isDisqualified = (result as any).cheatingDetected === true;
    const passPercent = (result as any).templateId?.passingPercentage ?? 50;
    const isPassing = !isDisqualified && percentage >= passPercent;

    return (
      <div className="max-w-lg mx-auto my-12 p-8 glass-panel rounded-2xl text-center space-y-6 relative overflow-hidden text-xs">
        {isDisqualified ? (
          <>
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-rose-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-600/10 rounded-full blur-3xl"></div>

            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-rose-500 uppercase tracking-wide">Disqualified - Cheating Detected</h2>
              <p className="text-rose-450 font-semibold bg-rose-500/10 border border-rose-500/15 p-3.5 rounded-xl text-xs mt-3 leading-relaxed">
                Your examination session was terminated because you left the browser window more than 2 times. 
                Under security guidelines, you have been graded 0 marks for this paper.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-650/10 rounded-full blur-3xl"></div>

            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <Check className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-2xl font-black text-white">Exam Session Closed</h2>
              <p className="text-slate-400 text-xs mt-1">Your responses have been successfully graded.</p>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4 py-4 text-xs">
          <div className={`${isDisqualified ? 'bg-rose-500/5 border-rose-500/10' : 'bg-slate-900/60 border-slate-800'} p-4 rounded-xl border`}>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Final Score</div>
            <div className={`text-xl font-black mt-1 ${isDisqualified ? 'text-rose-500' : 'text-white'}`}>
              {result.score} / {result.maxScore}
            </div>
            <div className="text-[10px] text-slate-400">({isDisqualified ? 0 : percentage}% score, required {passPercent}%)</div>
          </div>
          <div className={`${isDisqualified ? 'bg-rose-500/5 border-rose-500/10' : isPassing ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-rose-500/5 border-rose-500/10'} p-4 rounded-xl border`}>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</div>
            <div className={`text-xl font-black mt-1 ${isDisqualified ? 'text-rose-500' : isPassing ? 'text-emerald-450 font-black' : 'text-rose-500'}`}>
              {isDisqualified ? 'DISQUALIFIED' : isPassing ? 'PASSED' : 'FAILED'}
            </div>
            <div className="text-[10px] text-slate-400">{isDisqualified ? 'Security violations' : isPassing ? 'Exam cleared successfully' : 'Below passing score'}</div>
          </div>
        </div>

        <button
          onClick={() => navigate('/student')}
          className="w-full py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition-colors shadow-lg"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const activeQuestion = questions[currentIdx];
  const activeAnswers = responsesMap[activeQuestion._id] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-6 relative text-xs">
      {/* Top Header */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="text-[9px] font-bold text-brand-400 bg-brand-500/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Exam Terminal
          </span>
          <h1 className="text-lg font-bold text-white mt-1">{title}</h1>
          {description && <p className="text-[10px] text-slate-450 mt-1 max-w-md line-clamp-1">{description}</p>}
        </div>

        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="text-slate-550 text-[10px] uppercase font-bold">Warden Warnings:</span>
            <span
              className={`font-black flex items-center gap-1 px-2.5 py-0.5 rounded-md ${
                warnings > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-950/60 text-slate-550'
              }`}
            >
              <ShieldAlert className="w-4 h-4" /> {warnings}
            </span>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2 text-white font-bold tracking-wider">
            <Clock className={`w-4 h-4 ${timeLeft < 60 ? 'text-rose-500' : 'text-brand-400'}`} />
            <span className={timeLeft < 60 ? 'text-rose-500 font-extrabold' : ''}>{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => handleSubmitExam(true)}
            className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-xl font-bold transition-all"
          >
            Submit Exam
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 items-start">
        {/* Navigator Panel */}
        <div className="lg:col-span-1 glass-panel rounded-2xl p-4 space-y-4">
          {/* Live Proctor Viewport */}
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500"></span>
              Live Proctor Stream
            </div>
            <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-900 overflow-hidden flex items-center justify-center text-slate-650">
              {mediaStream ? (
                <video
                  ref={(video) => {
                    if (video && mediaStream) {
                      video.srcObject = mediaStream;
                      video.play().catch(e => console.log('Video play error:', e));
                    }
                  }}
                  muted
                  playsInline
                  className="w-full h-full object-cover transform -scale-x-100"
                />
              ) : (
                <span className="text-[10px]">Camera Offline</span>
              )}
            </div>
          </div>

          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exam Navigator</h2>
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIdx;
              const isAnswered = responsesMap[q._id] && responsesMap[q._id].length > 0;

              return (
                <button
                  key={q._id}
                  onClick={() => {
                    autoSaveProgress();
                    setCurrentIdx(idx);
                  }}
                  className={`aspect-square flex items-center justify-center font-bold rounded-lg border transition-all ${
                    isCurrent
                      ? 'bg-brand-500 border-brand-400 text-white shadow-lg shadow-brand-500/20 scale-105'
                      : isAnswered
                      ? 'bg-slate-900 border-emerald-500/40 text-emerald-400'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* Question Panel */}
        <div className="lg:col-span-3 glass-panel rounded-2xl p-6 md:p-8 space-y-6 flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex justify-between items-center gap-2 mb-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                Question {currentIdx + 1} of {questions.length}
              </span>
              <span className="text-[9px] font-extrabold text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {activeQuestion.difficulty} ({activeQuestion.marks} Marks)
              </span>
            </div>

            <h3 className="text-base font-bold text-white whitespace-pre-wrap leading-relaxed">
              {activeQuestion.questionText}
            </h3>

            {/* SINGLE_MCQ Inputs */}
            {activeQuestion.type === 'SINGLE_MCQ' && (
              <div className="mt-6 space-y-3">
                {activeQuestion.options.map((opt, optIdx) => {
                  const idxStr = String(optIdx);
                  const isSelected = activeAnswers.includes(idxStr);

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleSingleMCQSelect(activeQuestion._id, idxStr)}
                      className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500 text-white'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                        isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-700 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* MULTI_MCQ Inputs */}
            {activeQuestion.type === 'MULTI_MCQ' && (
              <div className="mt-6 space-y-3">
                {activeQuestion.options.map((opt, optIdx) => {
                  const idxStr = String(optIdx);
                  const isSelected = activeAnswers.includes(idxStr);

                  return (
                    <button
                      key={optIdx}
                      onClick={() => handleMultiMCQSelect(activeQuestion._id, idxStr)}
                      className={`w-full text-left p-3.5 rounded-xl border flex items-center gap-3 transition-all ${
                        isSelected
                          ? 'bg-brand-500/10 border-brand-500 text-white'
                          : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <span className={`w-4.5 h-4.5 rounded border flex items-center justify-center text-[10px] font-bold ${
                        isSelected ? 'border-brand-500 bg-brand-500 text-white' : 'border-slate-700 text-slate-500'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* SHORT_ANSWER Inputs */}
            {activeQuestion.type === 'SHORT_ANSWER' && (
              <div className="mt-6 space-y-2">
                <label className="text-slate-500 text-[10px] uppercase font-bold block mb-1">Type your response below:</label>
                <input
                  type="text"
                  value={activeAnswers[0] || ''}
                  onChange={(e) => handleShortAnswerChange(activeQuestion._id, e.target.value)}
                  className="block w-full px-4 py-3 border border-slate-800 rounded-xl bg-slate-900/50 text-white placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Type answer here (e.g. O(log n))"
                />
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="pt-6 border-t border-slate-800/80 flex justify-between items-center mt-8">
            <button
              onClick={() => {
                autoSaveProgress();
                setCurrentIdx((p) => Math.max(0, p - 1));
              }}
              disabled={currentIdx === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-slate-400 hover:text-slate-200 disabled:opacity-30 font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>

            {currentIdx < questions.length - 1 ? (
              <button
                onClick={() => {
                  autoSaveProgress();
                  setCurrentIdx((p) => Math.min(questions.length - 1, p + 1));
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 font-semibold text-white transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => handleSubmitExam(true)}
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-semibold text-white transition-colors shadow-lg"
              >
                Finish Exam
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Cheating Alert Screen Overlay */}
      {showAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="glass-panel max-w-md w-full rounded-2xl p-8 space-y-6 shadow-2xl border-rose-500/50 text-center relative overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-rose-500/15 rounded-full blur-3xl"></div>

            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 mx-auto relative">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2 relative">
              <h3 className="text-xl font-extrabold text-white">Security Flag Logged</h3>
              <p className="text-slate-450 leading-relaxed font-semibold">
                {alertType === 'TAB_SWITCH' 
                  ? `Tab Switch: Warning ${currentWarningNum} of 2 (Strike ${currentWarningNum}).` 
                  : 'We detected that you lost focus on the test window.'}
              </p>
              <p className="text-rose-450 font-bold bg-rose-500/10 py-1.5 px-3 rounded-lg border border-rose-500/20 inline-block mt-2">
                {alertType === 'TAB_SWITCH'
                  ? (currentWarningNum === 1 
                      ? 'WARNING: Swapping browser tabs again will trigger your final Warning (2 of 2).' 
                      : 'CRITICAL WARNING: Swapping browser tabs once more will disqualify you and submit a 0 mark result!')
                  : 'This event has been logged to your exam audit records.'}
              </p>
            </div>

            <div className="relative pt-2">
              <button
                onClick={() => setShowAlertModal(false)}
                className="w-full py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-350 font-bold transition-colors border border-slate-750"
              >
                I Understand, Resume Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
