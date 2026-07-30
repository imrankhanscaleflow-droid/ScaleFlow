/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { createGoogleCalendarEvent } from '../lib/googleCalendar';
import { 
  Phone, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  Play, 
  Pause, 
  Trash2, 
  Download, 
  Check, 
  Calendar, 
  User, 
  Bot, 
  Sliders, 
  Settings2, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Radio, 
  History,
  FileText,
  UserCheck,
  RotateCcw,
  VolumeX,
  PhoneCall,
  UserPlus,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Appointment, Lead } from '../types';

interface VoiceReceptionistConsoleProps {
  businessInfo: any;
  faqs: any[];
  articles: any[];
  behaviourSettings: any;
  appointments: Appointment[];
  setAppointments: (appts: Appointment[]) => void;
  addToast: (text: string, type: 'success' | 'info' | 'warning' | 'danger') => void;
}

interface CallRecord {
  id: string;
  date: string;
  time: string;
  duration: string;
  audioUrl?: string;
  transcript: { sender: 'user' | 'agent' | 'system'; text: string; timestamp: string }[];
  extractedLead: {
    name: string | null;
    phone: string | null;
    email: string | null;
    service: string | null;
    question: string | null;
    appointmentDate: string | null;
    appointmentTime: string | null;
    appointmentConfirmed: boolean;
    handoffTriggered: boolean;
    handoffReason: string | null;
    handoffPriority: string | null;
  };
  outcome: 'Lead Captured' | 'Appointment Booked' | 'Handoff Triggered' | 'Inquiry Logged' | 'No Input';
}

export function VoiceReceptionistConsole({
  businessInfo,
  faqs,
  articles,
  behaviourSettings,
  appointments,
  setAppointments,
  addToast
}: VoiceReceptionistConsoleProps) {
  // Tabs within the Voice Console
  const [subTab, setSubTab] = useState<'call' | 'history' | 'recordings' | 'settings'>('call');

  // Call States
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [callTranscript, setCallTranscript] = useState<{ id: string; sender: 'user' | 'agent' | 'system'; text: string; timestamp: string }[]>([]);
  const [callOutcome, setCallOutcome] = useState<string>('Connected');
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);

  // Audio Recording states
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  const [savedRecordings, setSavedRecordings] = useState<CallRecord[]>(() => {
    const saved = localStorage.getItem('scaleflow_voice_recordings');
    return saved ? JSON.parse(saved) : [];
  });

  // Saved Call History
  const [callHistory, setCallHistory] = useState<CallRecord[]>(() => {
    const saved = localStorage.getItem('scaleflow_call_history');
    return saved ? JSON.parse(saved) : [];
  });

  // Selected Call Log for Viewing Detail
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);

  // Web Speech API references
  const recognitionRef = useRef<any>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState<string>(() => {
    return localStorage.getItem('scaleflow_selected_voice') || '';
  });
  
  // Voice Settings
  const [voiceSettings, setVoiceSettings] = useState(() => {
    const saved = localStorage.getItem('scaleflow_voice_settings');
    return saved ? JSON.parse(saved) : {
      pitch: 1.0,
      rate: 1.0,
      volume: 1.0,
      interruptOnVoice: true,
      autoRecord: true,
      isMuted: false
    };
  });

  // Live Extracted Lead Status (specifically for the active call)
  const [liveLead, setLiveLead] = useState<{
    name: string | null;
    phone: string | null;
    email: string | null;
    service: string | null;
    question: string | null;
    appointmentDate: string | null;
    appointmentTime: string | null;
    appointmentConfirmed: boolean;
    handoffTriggered: boolean;
    handoffReason: string | null;
    handoffPriority: string | null;
  }>({
    name: null,
    phone: null,
    email: null,
    service: null,
    question: null,
    appointmentDate: null,
    appointmentTime: null,
    appointmentConfirmed: false,
    handoffTriggered: false,
    handoffReason: null,
    handoffPriority: null
  });

  const liveLeadRef = useRef(liveLead);
  useEffect(() => {
    liveLeadRef.current = liveLead;
  }, [liveLead]);

  // Debug Log State for Voice Pipeline
  const [voiceDebugLogs, setVoiceDebugLogs] = useState<{ id: string; timestamp: string; text: string }[]>([]);
  const addDebugLogRef = useRef<any>(null);

  // Debug logging helper
  const addDebugLog = (text: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    console.log(`[VOICE DEBUG] [${timestamp}] ${text}`);
    setVoiceDebugLogs(prev => [{ id: `log-${Date.now()}-${Math.random()}`, timestamp, text }, ...prev].slice(0, 50));
  };

  useEffect(() => {
    addDebugLogRef.current = addDebugLog;
  });

  const triggerDebugLog = (text: string) => {
    if (addDebugLogRef.current) {
      addDebugLogRef.current(text);
    } else {
      console.log(`[VOICE DEBUG] ${text}`);
    }
  };

  // Handoff states
  const [isHandoffActive, setIsHandoffActive] = useState(false);
  const [isHandoffAnswered, setIsHandoffAnswered] = useState(false);

  // Audio elements for sounds
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  const speechSynthesisRef = useRef<any>(null);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const [ttsWarning, setTtsWarning] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [loadingMessageId, setLoadingMessageId] = useState<string | null>(null);

  // Sync references to avoid stale closures in event listeners
  const isCallActiveRef = useRef(isCallActive);
  const isAiSpeakingRef = useRef(isAiSpeaking);
  const isProcessingResponseRef = useRef(isProcessingResponse);
  const isTtsLoadingRef = useRef(isTtsLoading);
  const voiceSettingsRef = useRef(voiceSettings);
  const callTranscriptRef = useRef(callTranscript);

  useEffect(() => { isCallActiveRef.current = isCallActive; }, [isCallActive]);
  useEffect(() => { isAiSpeakingRef.current = isAiSpeaking; }, [isAiSpeaking]);
  useEffect(() => { isProcessingResponseRef.current = isProcessingResponse; }, [isProcessingResponse]);
  useEffect(() => { isTtsLoadingRef.current = isTtsLoading; }, [isTtsLoading]);
  useEffect(() => { voiceSettingsRef.current = voiceSettings; }, [voiceSettings]);
  useEffect(() => { callTranscriptRef.current = callTranscript; }, [callTranscript]);

  // Load Speech Synthesis voices
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;
    
    const loadVoices = () => {
      const voices = synth.getVoices();
      setAvailableVoices(voices);
      
      const savedVoice = localStorage.getItem('scaleflow_selected_voice');
      if (savedVoice && voices.some(v => v.name === savedVoice)) {
        setSelectedVoiceName(savedVoice);
      } else if (voices.length > 0) {
        // Try to find a good English voice by default
        const defaultVoice = voices.find(v => v.lang.includes('en-US') && v.name.includes('Google')) ||
                             voices.find(v => v.lang.includes('en') && v.name.includes('Natural')) ||
                             voices.find(v => v.lang.includes('en')) || 
                             voices[0];
        setSelectedVoiceName(defaultVoice.name);
      }
    };

    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }, []);

  // Save Settings
  useEffect(() => {
    localStorage.setItem('scaleflow_voice_settings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  useEffect(() => {
    if (selectedVoiceName) {
      localStorage.setItem('scaleflow_selected_voice', selectedVoiceName);
    }
  }, [selectedVoiceName]);

  // Handle auto-scroll for transcripts
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [callTranscript, isProcessingResponse]);

  // Call timer running
  useEffect(() => {
    if (isCallActive) {
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      setCallDuration(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isCallActive]);

  // Format Timer Duration helper
  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  // Compile Gemini Instructions specifically for voice
  const buildVoiceSystemInstruction = () => {
    let instruction = `You are a professional, helpful, and highly articulate AI Voice Receptionist representing ${businessInfo.name || 'our company'}.\n`;
    instruction += `Your background: ${businessInfo.description || ''}\n`;
    instruction += `Your tone should be Warm, Professional, Energetic, and concise. Speak in short, easy-to-understand sentences of 1-3 clauses, because you are speaking over a phone call.\n\n`;
    
    instruction += `SERVICES OFFERED:\n`;
    businessInfo.services?.forEach((svc: string) => {
      instruction += `- ${svc}\n`;
    });
    
    instruction += `\nBUSINESS HOURS: ${businessInfo.hours || 'Always Open'}\n`;
    instruction += `CONTACT DETAILS: Phone: ${businessInfo.phone}, Email: ${businessInfo.email}\n`;
    if (businessInfo.website) instruction += `WEBSITE: ${businessInfo.website}\n`;
    if (businessInfo.address) instruction += `OFFICE ADDRESS: ${businessInfo.address}\n`;

    if (articles && articles.length > 0) {
      instruction += `\nKNOWLEDGE BASE FOR QUERIES:\n`;
      articles.forEach(art => {
        instruction += `- [${art.category}] ${art.title}: ${art.content}\n`;
      });
    }

    if (faqs && faqs.length > 0) {
      instruction += `\nFREQUENTLY ASKED QUESTIONS:\n`;
      faqs.forEach(f => {
        instruction += `Q: ${f.question}\nA: ${f.answer}\n`;
      });
    }

    instruction += `\nINTERACTION GUIDELINES:\n`;
    if (behaviourSettings.collectName) {
      instruction += `- Politely ask for their name early in the call if not provided.\n`;
    }
    if (behaviourSettings.collectPhone) {
      instruction += `- Secure their callback phone number so we can reach them if disconnected.\n`;
    }
    if (behaviourSettings.collectEmail) {
      instruction += `- Ask for their email address to forward booking links or detailed quotes.\n`;
    }
    if (behaviourSettings.offerBooking) {
      instruction += `- If they are interested in scheduling or appointment booking, ask for their preferred date and time. Let them know we can schedule them for any working day between 9:00 AM and 6:00 PM EST.\n`;
    } else {
      instruction += `- Do NOT offer appointment booking. If they ask, tell them scheduling is handled via email.\n`;
    }
    if (behaviourSettings.transferHuman) {
      instruction += `- If the customer explicitly requests a human, support specialist, or live operator, say "I am transferring your call to a live support specialist right now. Please hold one second." and trigger the human handoff.\n`;
    } else {
      instruction += `- If they request a human, politely inform them that no live agent is currently available, but you will log their inquiry and a human will follow up soon.\n`;
    }

    instruction += `\nCRITICAL VOICE DIRECTIVES:\n`;
    instruction += `- KEEP RESPONSES EXTREMELY BRIEF (under 35 words). Avoid listicles, long markdown tables, bullet lists, or complex punctuation since the TTS model reads everything literally.\n`;
    instruction += `- Use natural phone greetings (e.g. "I can help with that!", "Sure, let me check that for you."). No robotic symbols or emojis.\n`;

    return instruction;
  };

  // Sync a ref for the voice input handler to prevent stale closures
  const handleUserVoiceInputRef = useRef<any>(null);

  // Web Speech API Text-to-Speech Synthesis (Output)
  const speakResponse = (text: string, msgId?: string) => {
    if (voiceSettings.isMuted) {
      if (msgId) {
        setLoadingMessageId(null);
        setSpeakingMessageId(null);
      }
      // Resume listening immediately if muted and call is active
      if (isCallActive && recognitionRef.current) {
        triggerDebugLog("recognition.start() called (resuming listening because voice output is muted).");
        try { recognitionRef.current.start(); } catch (e) {}
      }
      return;
    }

    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth) {
      if (msgId) {
        setLoadingMessageId(null);
        setSpeakingMessageId(null);
      }
      setTtsWarning("Speech synthesis is not supported in this browser.");
      if (isCallActive && recognitionRef.current) {
        triggerDebugLog("recognition.start() called (resuming listening because synthesis is unsupported).");
        try { recognitionRef.current.start(); } catch (e) {}
      }
      return;
    }

    setTtsWarning(null);

    // Cancel any ongoing speech first
    synth.cancel();

    // Pause recognition while AI speaks to avoid self-feedback, unless interruption is active
    if (recognitionRef.current && !voiceSettings.interruptOnVoice) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    // Clean text of markdown formatting
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/_(_)?/g, '')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[-*#]/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // remove markdown links
      .trim();

    if (!cleanText) {
      if (msgId) {
        setLoadingMessageId(null);
        setSpeakingMessageId(null);
      }
      if (isCallActive && recognitionRef.current) {
        triggerDebugLog("recognition.start() called (resuming listening because text is empty).");
        try { recognitionRef.current.start(); } catch (e) {}
      }
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Set voice
    const voices = synth.getVoices();
    const activeVoice = voices.find(v => v.name === selectedVoiceName);
    if (activeVoice) {
      utterance.voice = activeVoice;
    }

    // Apply settings
    utterance.pitch = voiceSettings.pitch ?? 1.0;
    utterance.rate = voiceSettings.rate ?? 1.0;
    utterance.volume = voiceSettings.volume ?? 1.0;

    utterance.onstart = () => {
      triggerDebugLog(`Text-to-Speech started: "${cleanText}"`);
      setIsTtsLoading(false);
      setIsAiSpeaking(true);
      if (msgId) {
        setLoadingMessageId(null);
        setSpeakingMessageId(msgId);
      }
    };

    utterance.onend = () => {
      triggerDebugLog("Text-to-Speech finished.");
      setIsAiSpeaking(false);
      if (msgId) {
        setSpeakingMessageId(null);
        setLoadingMessageId(null);
      }
      // Resume listening
      if (isCallActive && recognitionRef.current && !voiceSettings.isMuted) {
        triggerDebugLog("recognition restarted after AI finished speaking.");
        triggerDebugLog("recognition.start() called.");
        try {
          recognitionRef.current.start();
        } catch (e: any) {
          triggerDebugLog(`recognition.start() failed: ${e.message || e}`);
        }
      }
    };

    utterance.onerror = (err) => {
      triggerDebugLog(`Text-to-Speech error event: ${err.error || 'unknown speech synthesis error'}`);
      console.error("Speech synthesis failed:", err);
      setIsAiSpeaking(false);
      if (msgId) {
        setSpeakingMessageId(null);
        setLoadingMessageId(null);
      }
      // Resume listening
      if (isCallActive && recognitionRef.current) {
        triggerDebugLog("recognition restarted after AI finished speaking.");
        triggerDebugLog("recognition.start() called.");
        try {
          recognitionRef.current.start();
        } catch (e: any) {
          triggerDebugLog(`recognition.start() failed: ${e.message || e}`);
        }
      }
    };

    if (msgId) {
      setLoadingMessageId(msgId);
    } else {
      setIsTtsLoading(true);
    }
    synth.speak(utterance);
  };

  const togglePlayMessage = (msgId: string, text: string) => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth) return;

    if (speakingMessageId === msgId || loadingMessageId === msgId) {
      synth.cancel();
      setIsAiSpeaking(false);
      setIsTtsLoading(false);
      setSpeakingMessageId(null);
      setLoadingMessageId(null);
      return;
    }

    synth.cancel();
    setIsAiSpeaking(false);
    setIsTtsLoading(false);
    setSpeakingMessageId(null);
    setLoadingMessageId(msgId);

    speakResponse(text, msgId);
  };

  // Initialize Speech Recognition ONCE on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    triggerDebugLog("SpeechRecognition instance created.");
    const rec = new SpeechRecognitionAPI();
    rec.continuous = false; // Capture speech in turns
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onstart = () => {
      triggerDebugLog("recognition.onstart fired.");
      setIsUserSpeaking(true);
    };

    rec.onspeechstart = () => {
      triggerDebugLog("recognition.onspeechstart fired.");
    };

    rec.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript.trim()) {
        triggerDebugLog(`recognition.onresult fired with transcript: "${finalTranscript.trim()}"`);
      }

      // If AI is speaking and user is talking, interrupt
      if (isAiSpeakingRef.current && voiceSettingsRef.current.interruptOnVoice && (interimTranscript || finalTranscript)) {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
        setIsAiSpeaking(false);
        setIsTtsLoading(false);
      }

      if (finalTranscript.trim()) {
        try {
          rec.stop(); // Stop temporarily to process
        } catch (e) {}

        // Synchronously set refs to prevent race conditions during state transition
        isProcessingResponseRef.current = true;
        setIsProcessingResponse(true);

        if (handleUserVoiceInputRef.current) {
          handleUserVoiceInputRef.current(finalTranscript.trim());
        }
      }
    };

    rec.onerror = (event: any) => {
      triggerDebugLog(`SpeechRecognition error event: "${event.error}"`);
      if (event.error === 'not-allowed') {
        console.warn("SpeechRecognition warning: Microphone permission is not allowed. Check browser settings.");
      } else if (event.error !== 'no-speech') {
        console.error("SpeechRecognition error:", event.error);
      }
      setIsUserSpeaking(false);
    };

    rec.onend = () => {
      setIsUserSpeaking(false);
      // Keep listening if we should be listening
      if (
        isCallActiveRef.current && 
        !voiceSettingsRef.current.isMuted && 
        !isProcessingResponseRef.current && 
        !isTtsLoadingRef.current &&
        (!isAiSpeakingRef.current || voiceSettingsRef.current.interruptOnVoice)
      ) {
        triggerDebugLog("recognition.start() called (automatic restart on onend).");
        try {
          rec.start();
        } catch (e) {
          // Ignore if already started
        }
      }
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, []);

  // Active/Passive control of Speech Recognition based on voice call state changes
  useEffect(() => {
    const rec = recognitionRef.current;
    if (!rec) return;

    const shouldBeListening = 
      isCallActive && 
      !voiceSettings.isMuted && 
      !isProcessingResponse && 
      !isTtsLoading &&
      (!isAiSpeaking || voiceSettings.interruptOnVoice);

    if (shouldBeListening) {
      triggerDebugLog("recognition.start() called (state changed to listening).");
      try {
        rec.start();
      } catch (e) {
        // Safe to ignore if already running
      }
    } else {
      triggerDebugLog("recognition.stop() called (state changed to non-listening).");
      try {
        rec.stop();
      } catch (e) {
        // Safe to ignore if already stopped
      }
    }
  }, [isCallActive, isAiSpeaking, isProcessingResponse, isTtsLoading, voiceSettings.isMuted, voiceSettings.interruptOnVoice]);

  // Execute Gemini Query based on voice input
  const handleUserVoiceInput = async (inputText: string) => {
    if (!inputText) return;

    // Synchronously set state and reference to prevent race conditions
    isProcessingResponseRef.current = true;
    setIsProcessingResponse(true);

    // Append user message to live transcript using local variables to prevent state lag
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `v-msg-user-${Date.now()}`;
    const userMessage = { id: userMsgId, sender: 'user' as const, text: inputText, timestamp };
    
    const currentHistoryWithUser = [...callTranscriptRef.current, userMessage];
    setCallTranscript(currentHistoryWithUser);

    try {
      const systemInstruction = buildVoiceSystemInstruction();
      
      // Build history payload
      const contents = currentHistoryWithUser
         .filter(msg => msg.sender === 'user' || msg.sender === 'agent')
         .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

      triggerDebugLog(`Transcript sent to AI: "${inputText}"`);

      // Query server API
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction,
          contents,
          stream: false
        })
      });

      if (!response.ok) throw new Error(`HTTP error ${response.status}`);
      const data = await response.json();
      const aiReply = data.text || "I'm sorry, I missed that. Could you repeat?";

      triggerDebugLog(`AI response received: "${aiReply}"`);

      // Append AI response
      const agentMsgId = `v-msg-agent-${Date.now()}`;
      const agentMessage = { id: agentMsgId, sender: 'agent' as const, text: aiReply, timestamp };
      const currentHistoryWithAgent = [...currentHistoryWithUser, agentMessage];
      setCallTranscript(currentHistoryWithAgent);

      // Speak response automatically only if in active Voice Call mode
      if (isCallActive) {
        speakResponse(aiReply, agentMsgId);
      }

      // Run lead extraction & handoff analyzer
      runLiveLeadExtraction(currentHistoryWithAgent);

    } catch (err: any) {
      triggerDebugLog(`AI query exception or connection error: ${err.message || err}`);
      console.error("Voice chat error:", err);
      const errMessage = {
        id: `v-msg-err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender: 'system' as const,
        text: `Network interruption: failed to contact voice router.`,
        timestamp
      };
      setCallTranscript(prev => [...prev, errMessage]);
    } finally {
      setIsProcessingResponse(false);
      isProcessingResponseRef.current = false;
    }
  };

  // Sync the ref for the voice input handler on every render
  useEffect(() => {
    handleUserVoiceInputRef.current = handleUserVoiceInput;
  });

  // Live Lead Extraction synchronized with the active voice call
  const runLiveLeadExtraction = async (history: any[]) => {
    try {
      const contents = history
        .filter(msg => msg.sender === 'user' || msg.sender === 'agent')
        .map(msg => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }]
        }));

      const res = await fetch("/api/extract-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents })
      });

      if (res.ok) {
        const extracted = await res.json();
        const currentLead = liveLeadRef.current;
        
        // Detect changes to show satisfying UI cues
        if (extracted.name && !currentLead.name) addToast(`Captured Caller Name: ${extracted.name}`, 'success');
        if (extracted.phone && !currentLead.phone) addToast(`Captured Phone Number: ${extracted.phone}`, 'success');
        if (extracted.email && !currentLead.email) addToast(`Captured Email: ${extracted.email}`, 'success');
        
        // Trigger Appointment Booking
        if (extracted.appointmentDate && extracted.appointmentTime && extracted.appointmentConfirmed && !currentLead.appointmentConfirmed) {
          handleVoiceAppointmentBooking(extracted);
        }

        // Trigger Human Handoff
        if (extracted.handoffTriggered && !currentLead.handoffTriggered) {
          triggerHumanHandoff(extracted);
        }

        setLiveLead({
          name: extracted.name || currentLead.name,
          phone: extracted.phone || currentLead.phone,
          email: extracted.email || currentLead.email,
          service: extracted.service || currentLead.service,
          question: extracted.question || currentLead.question,
          appointmentDate: extracted.appointmentDate || currentLead.appointmentDate,
          appointmentTime: extracted.appointmentTime || currentLead.appointmentTime,
          appointmentConfirmed: extracted.appointmentConfirmed || currentLead.appointmentConfirmed,
          handoffTriggered: extracted.handoffTriggered || currentLead.handoffTriggered,
          handoffReason: extracted.handoffReason || currentLead.handoffReason,
          handoffPriority: extracted.handoffPriority || currentLead.handoffPriority
        });
      }
    } catch (err) {
      console.error("Live lead extraction failed:", err);
    }
  };

  // Appointment Booking directly from Voice Captured variables
  const handleVoiceAppointmentBooking = async (extracted: any) => {
    // Add appointment to Database
    const savedAppts = localStorage.getItem('scaleflow_appointments');
    let currentAppts: Appointment[] = [];
    if (savedAppts) {
      try { currentAppts = JSON.parse(savedAppts); } catch (e) {}
    }

    // Check duplicate
    const isDup = currentAppts.some(app => 
      app.date === extracted.appointmentDate && 
      app.time === extracted.appointmentTime && 
      app.status !== 'cancelled'
    );
    if (isDup) return;

    const targetLeadId = `LD-${Math.floor(100 + Math.random() * 900)}`;
    const apptId = `AP-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Save Lead to CRM
    const savedLeadsText = localStorage.getItem('scaleflow_leads');
    let currentLeads = [];
    if (savedLeadsText) {
      try { currentLeads = JSON.parse(savedLeadsText); } catch (e) {}
    }

    const newLead: Lead = {
      id: targetLeadId,
      name: extracted.name || 'Voice Guest',
      company: 'Inbound Voice Call',
      status: 'qualified' as const,
      value: '$1,800/mo',
      source: 'Automated AI Voice Receptionist',
      date: new Date().toISOString().split('T')[0],
      phone: extracted.phone || undefined,
      email: extracted.email || undefined,
      service: extracted.service || undefined,
      message: extracted.question || 'Booked appointment by voice call',
      appointmentDate: extracted.appointmentDate,
      appointmentTime: extracted.appointmentTime,
      conversationId: `voice-${Date.now()}`,
      conversation: callTranscript.map(m => ({ id: m.id, sender: m.sender, text: m.text, timestamp: m.timestamp }))
    };

    const updatedLeads = [newLead, ...currentLeads];
    localStorage.setItem('scaleflow_leads', JSON.stringify(updatedLeads));

    // Save Appointment
    let newAppt: Appointment = {
      id: apptId,
      leadId: targetLeadId,
      customerName: extracted.name || 'Voice Guest',
      phone: extracted.phone || '+1 (555) Call-In',
      email: extracted.email || 'guest@voice.io',
      service: extracted.service || 'AI Receptionist Voice Booking',
      date: extracted.appointmentDate,
      time: extracted.appointmentTime,
      status: 'pending' as const,
      createdTime: new Date().toLocaleString()
    };

    // Execute Google Calendar event creation call
    const gcalRes = await createGoogleCalendarEvent(newAppt);
    if (gcalRes.success) {
      newAppt.status = 'confirmed' as const;
      newAppt.googleCalendarEventId = gcalRes.eventId;
      newAppt.googleCalendarHtmlLink = gcalRes.htmlLink;
      addToast(`📅 Google Calendar event created via Voice! Event ID: ${gcalRes.eventId}`, 'success');
    } else {
      newAppt.status = 'pending' as const;
      newAppt.googleCalendarSyncError = gcalRes.error;
      addToast(`⚠️ Google Calendar Voice Sync Error: ${gcalRes.error}`, 'warning');
    }

    const updatedAppts = [newAppt, ...currentAppts];
    setAppointments(updatedAppts);
    localStorage.setItem('scaleflow_appointments', JSON.stringify(updatedAppts));

    setCallOutcome('Appointment Booked');
    addToast(`📅 Appointment successfully booked by voice: ${extracted.appointmentDate} at ${extracted.appointmentTime}`, 'success');

    // Synthesis voice prompt confirming booking
    speakResponse(`Excellent, I have successfully scheduled and confirmed your appointment for ${extracted.appointmentDate} at ${extracted.appointmentTime}. A confirmation SMS has been sent.`);
  };

  // Trigger Human Handoff Mode
  const triggerHumanHandoff = (extracted: any) => {
    setIsHandoffActive(true);
    setCallOutcome('Handoff Triggered');
    addToast(`🚨 Human Handoff Triggered! Reason: ${extracted.handoffReason || "Support Required"}`, 'warning');
    
    // Play Ringtone using synthetic Web Audio API oscillator!
    playHandoffBeepLoop();
  };

  // Web Audio Synth Handoff Beeping Ringtone
  const playHandoffBeepLoop = () => {
    if (typeof window === 'undefined') return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      let beepCount = 0;

      const playBeep = () => {
        if (!isHandoffActive || isHandoffAnswered || beepCount > 6) {
          audioCtx.close();
          return;
        }

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4 note
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.3); // Sweep up

        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);

        beepCount++;
        setTimeout(playBeep, 1500); // Ring every 1.5 seconds
      };

      playBeep();
    } catch (e) {
      console.warn("Could not play synthesized ringtone:", e);
    }
  };

  // Initiate Inbound call
  const startVoiceCall = async () => {
    if (typeof window === 'undefined') return;
    
    // Check if voice synthesis / recognition are supported
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      addToast("Speech Recognition is not supported on this browser. Please try Chrome or Safari.", "danger");
      return;
    }

    triggerDebugLog("Voice call started.");

    // Check environment context (iframe vs top-level window)
    const isIframe = typeof window !== 'undefined' && window.self !== window.top;
    triggerDebugLog(`Environment check: running inside iframe = ${isIframe}`);

    // 1. Query navigator.permissions for microphone status
    let permState: string | null = null;
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const permResult = await navigator.permissions.query({ name: 'microphone' as any });
        permState = permResult.state;
        triggerDebugLog(`navigator.permissions.query({ name: 'microphone' }) state: "${permResult.state}"`);
        console.log('[MIC DEBUG] permissions.query result:', permResult);
      } else {
        triggerDebugLog("navigator.permissions.query is not supported in this browser.");
      }
    } catch (permErr: any) {
      triggerDebugLog(`navigator.permissions.query error: ${permErr.name || permErr.message || permErr}`);
      console.log('[MIC DEBUG] permissions.query error:', permErr);
    }

    // 2. Test getUserMedia audio stream
    let testStream: MediaStream | null = null;
    let gUMError: any = null;

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        triggerDebugLog("Calling navigator.mediaDevices.getUserMedia({ audio: true })...");
        testStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        triggerDebugLog(`navigator.mediaDevices.getUserMedia() succeeded! Stream ID: ${testStream.id}, active audio tracks: ${testStream.getAudioTracks().length}`);
        console.log('[MIC DEBUG] getUserMedia result stream:', testStream);
      } catch (err: any) {
        gUMError = err;
        triggerDebugLog(`navigator.mediaDevices.getUserMedia() failed: name="${err.name}", message="${err.message}"`);
        console.log('[MIC DEBUG] getUserMedia error:', err);
      }
    } else {
      triggerDebugLog("navigator.mediaDevices.getUserMedia is not available on this navigator object.");
    }

    // 3. Evaluate whether microphone permission is explicitly denied
    const isExplicitlyDenied = permState === 'denied' || (gUMError && (gUMError.name === 'NotAllowedError' || gUMError.name === 'PermissionDeniedError') && permState !== 'granted');

    if (isExplicitlyDenied) {
      triggerDebugLog("Microphone permission explicitly denied by user or browser policy.");
      addToast("Microphone access is required for voice call receptionist.", "danger");
      if (testStream) {
        testStream.getTracks().forEach(track => track.stop());
      }
      return;
    } else {
      if (testStream) {
        triggerDebugLog("Microphone permission granted and stream acquired.");
        if (!voiceSettings.autoRecord) {
          testStream.getTracks().forEach(track => track.stop());
        }
      } else if (permState === 'granted') {
        triggerDebugLog("Microphone permission state is 'granted' via permissions query.");
      } else {
        triggerDebugLog("Microphone status uncertain in iframe or browser context; proceeding to allow Web Speech API handling.");
      }
    }

    // Reset States
    setCallTranscript([]);
    setLiveLead({
      name: null,
      phone: null,
      email: null,
      service: null,
      question: null,
      appointmentDate: null,
      appointmentTime: null,
      appointmentConfirmed: false,
      handoffTriggered: false,
      handoffReason: null,
      handoffPriority: null
    });
    setCallOutcome('Connected');
    setIsHandoffActive(false);
    setIsHandoffAnswered(false);
    setIsCallActive(true);

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Start Audio Recording if configured
    if (voiceSettings.autoRecord) {
      try {
        const stream = (testStream && testStream.active) ? testStream : await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          // Convert recording chunks into a usable URL
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const audioUrl = URL.createObjectURL(blob);
          
          // Save call details to lists upon completion
          const durationStr = formatDuration(callDuration);
          const outcome = liveLead.appointmentConfirmed 
            ? 'Appointment Booked' as const
            : liveLead.handoffTriggered 
            ? 'Handoff Triggered' as const
            : liveLead.name 
            ? 'Lead Captured' as const
            : 'Inquiry Logged' as const;

          const record: CallRecord = {
            id: `CALL-${Math.floor(1000 + Math.random() * 9000)}`,
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            duration: durationStr,
            audioUrl,
            transcript: callTranscript,
            extractedLead: liveLead,
            outcome
          };

          // Save call history and record to localStorage
          setSavedRecordings(prev => {
            const updated = [record, ...prev];
            localStorage.setItem('scaleflow_voice_recordings', JSON.stringify(updated));
            return updated;
          });

          // Also save in full Call History
          setCallHistory(prev => {
            const updated = [record, ...prev];
            localStorage.setItem('scaleflow_call_history', JSON.stringify(updated));
            return updated;
          });

          // Push new lead to leads list if lead collection settings are met
          if (behaviourSettings.createLead && (liveLead.name || liveLead.phone || liveLead.email)) {
            saveLeadToCRM(liveLead, callTranscript);
          }
        };

        recorder.start();
        setMediaRecorder(recorder);
        setAudioChunks(chunks);
      } catch (err) {
        console.warn("Could not start recording mic stream:", err);
        addToast("Mic recording failed. Live call will continue without file archive.", "warning");
      }
    }

    // Greet the customer out loud
    const greeting = businessInfo.welcomeMessage || "Hello, thanks for calling. How can I help you today?";
    setCallTranscript([{ id: 'v-msg-0', sender: 'agent', text: greeting, timestamp }]);
    speakResponse(greeting);

    addToast("📞 Live AI Voice Receptionist Connected!", "success");
  };

  // Helper to save a qualified lead directly to storage CRM
  const saveLeadToCRM = (leadData: any, transcript: any[]) => {
    const savedLeadsText = localStorage.getItem('scaleflow_leads');
    let currentLeads = [];
    if (savedLeadsText) {
      try { currentLeads = JSON.parse(savedLeadsText); } catch (e) {}
    }

    // Avoid duplicate
    const isDup = currentLeads.some((l: any) => l.phone === leadData.phone && leadData.phone !== null);
    if (isDup) return;

    const newLead: Lead = {
      id: `LD-${Math.floor(100 + Math.random() * 900)}`,
      name: leadData.name || 'Voice Inbound Caller',
      company: leadData.service || 'Inbound Voice Pipeline',
      status: 'new' as const,
      value: '$1,200/mo',
      source: 'Automated AI Voice Receptionist',
      date: new Date().toISOString().split('T')[0],
      phone: leadData.phone || undefined,
      email: leadData.email || undefined,
      service: leadData.service || undefined,
      message: leadData.question || 'Lead details qualifications captured via live call.',
      conversation: transcript.map(m => ({ id: m.id, sender: m.sender, text: m.text, timestamp: m.timestamp }))
    };

    const updated = [newLead, ...currentLeads];
    localStorage.setItem('scaleflow_leads', JSON.stringify(updated));
    addToast(`👤 Qualified Lead '${newLead.name}' successfully captured & exported to CRM Database!`, 'success');
  };

  // End voice call
  const endVoiceCall = () => {
    setIsCallActive(false);
    setIsAiSpeaking(false);
    setIsUserSpeaking(false);

    // Stop MediaRecorder
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      try { mediaRecorder.stop(); } catch (e) {}
    }

    // Cancel Speech Synthesis
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    // Stop Speech Recognition
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    addToast("☎️ Call ended. Compiling final voice transcript & recording metrics...", "info");
  };

  // Mute / Unmute mic
  const toggleMute = () => {
    setVoiceSettings(prev => {
      const isMuted = !prev.isMuted;
      if (isMuted && recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch (e) {}
      } else if (!isMuted && isCallActive && !isAiSpeaking) {
        try { recognitionRef.current.start(); } catch (e) {}
      }
      addToast(isMuted ? "🎤 Microphone muted." : "🎤 Microphone active.", "info");
      return { ...prev, isMuted };
    });
  };

  // Test configured system voice
  const testSelectedVoice = () => {
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
    if (!synth) {
      addToast("⚠️ Speech synthesis is not supported in this browser.", "info");
      return;
    }

    const text = `Hello, this is a test of the receptionist voice named ${selectedVoiceName || 'Default'}. Speed and volume are fully adjusted.`;
    addToast("🔊 Requesting voice preview...", "info");

    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    const activeVoice = voices.find(v => v.name === selectedVoiceName);
    if (activeVoice) {
      utterance.voice = activeVoice;
    }

    utterance.pitch = voiceSettings.pitch ?? 1.0;
    utterance.rate = voiceSettings.rate ?? 1.0;
    utterance.volume = voiceSettings.volume ?? 1.0;

    utterance.onstart = () => {
      setIsTtsLoading(false);
      addToast("🔊 Previewing system voice...", "success");
    };

    utterance.onerror = (err) => {
      setIsTtsLoading(false);
      addToast("⚠️ Speech Synthesis Preview failed.", "info");
    };

    setIsTtsLoading(true);
    synth.speak(utterance);
  };

  // Answer live support handoff
  const answerHandoff = () => {
    setIsHandoffAnswered(true);
    addToast("🟢 Bridged Live support call. You are now communicating directly as a human specialist!", "success");
    speakResponse("Connecting you to a live representative. Please hold.");
  };

  // Delete Recording
  const deleteRecording = (id: string) => {
    const updated = savedRecordings.filter(rec => rec.id !== id);
    setSavedRecordings(updated);
    localStorage.setItem('scaleflow_voice_recordings', JSON.stringify(updated));
    addToast("Recording deleted successfully.", "info");
  };

  return (
    <div className="bg-[#070810]/90 border border-indigo-500/15 rounded-3xl overflow-hidden shadow-2xl shadow-black/60 relative flex flex-col md:flex-row min-h-[580px] backdrop-blur-2xl">
      
      {/* LEFT SIDEBAR: Voice Panel Navigation */}
      <div className="w-full md:w-60 bg-[#05060b] border-r border-indigo-500/10 p-5 flex flex-col justify-between">
        <div className="space-y-5">
          <div className="flex items-center gap-2 px-1">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-[10px] font-mono text-indigo-300/60 uppercase tracking-widest font-bold">Voice Console Node</span>
          </div>

          <nav className="space-y-1.5">
            <button
              onClick={() => setSubTab('call')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                subTab === 'call'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/30 shadow-md shadow-emerald-500/10'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Phone className="w-4 h-4" />
              Live Phone Node
            </button>

            <button
              onClick={() => setSubTab('history')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                subTab === 'history'
                  ? 'bg-gradient-to-r from-indigo-600/25 to-violet-600/15 text-white border-indigo-500/30 shadow-md shadow-indigo-500/10'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <History className="w-4 h-4" />
              Call History
            </button>

            <button
              onClick={() => setSubTab('recordings')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                subTab === 'recordings'
                  ? 'bg-gradient-to-r from-indigo-600/25 to-violet-600/15 text-white border-indigo-500/30 shadow-md shadow-indigo-500/10'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <FileText className="w-4 h-4" />
              Recordings ({savedRecordings.length})
            </button>

            <button
              onClick={() => setSubTab('settings')}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold font-mono uppercase tracking-wider transition-all cursor-pointer border ${
                subTab === 'settings'
                  ? 'bg-gradient-to-r from-indigo-600/25 to-violet-600/15 text-white border-indigo-500/30 shadow-md shadow-indigo-500/10'
                  : 'bg-transparent text-gray-400 border-transparent hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Settings2 className="w-4 h-4" />
              Voice Config
            </button>
          </nav>
        </div>

        {/* Live System Info Status Badge */}
        <div className="pt-4 border-t border-indigo-500/10 mt-6">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-indigo-500/5 rounded-2xl border border-indigo-500/15 text-[10px] text-gray-400 font-mono leading-tight">
            <Activity className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <p className="font-bold text-white uppercase text-[8px] tracking-widest">STT / TTS Router</p>
              <p className="text-[9px] text-indigo-300/60">SLA SLA delay &lt; 400ms</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR/PANEL: Main Content Workspace */}
      <div className="flex-1 flex flex-col min-h-[500px]">
        
        {/* TAB 1: Live Phone Call Node */}
        {subTab === 'call' && (
          <div className="flex-1 flex flex-col lg:flex-row">
            
            {/* Live Visual Dialer & Waveform View */}
            <div className="flex-1 p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-[#151520] relative bg-[#040407]/10">
              
              {/* Voice Header info */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Live Dialer Channel</h4>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">Stream live conversation parameters securely</p>
                </div>
                {isCallActive && (
                  <span className="flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded font-mono font-bold uppercase animate-pulse">
                    <Radio className="w-3.5 h-3.5" />
                    LIVE call {formatDuration(callDuration)}
                  </span>
                )}
              </div>

              {/* Pulsing Core Waveform Animation */}
              <div className="flex-1 flex flex-col items-center justify-center py-8">
                <div className="relative w-40 h-40 rounded-full flex items-center justify-center bg-[#07070a] border border-[#1a1a29]">
                  
                  {/* Expansion Pulsing rings depending on speech status */}
                  <AnimatePresence>
                    {isCallActive && isAiSpeaking && (
                      <motion.div 
                        initial={{ scale: 1, opacity: 0.4 }}
                        animate={{ scale: 1.6, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border-2 border-brand-500/30"
                      />
                    )}
                    {isCallActive && isUserSpeaking && (
                      <motion.div 
                        initial={{ scale: 1, opacity: 0.4 }}
                        animate={{ scale: 1.7, opacity: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                        className="absolute inset-0 rounded-full border-2 border-emerald-500/30"
                      />
                    )}
                  </AnimatePresence>

                  {/* Ring inner visual status */}
                  <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center border transition-all ${
                    isCallActive 
                      ? isAiSpeaking 
                        ? 'border-brand-500/50 bg-brand-950/10 shadow-[0_0_30px_rgba(124,58,237,0.1)]'
                        : isUserSpeaking 
                        ? 'border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                        : 'border-[#232335] bg-[#0c0c12]'
                      : 'border-[#13131d] bg-[#030305]'
                  }`}>
                    {isCallActive ? (
                      isAiSpeaking ? (
                        <>
                          <Bot className="w-8 h-8 text-brand-400 animate-bounce" />
                          <span className="text-[9px] font-mono font-bold text-brand-300 uppercase tracking-widest mt-1">Speaking</span>
                        </>
                      ) : isUserSpeaking ? (
                        <>
                          <Mic className="w-8 h-8 text-emerald-400 animate-pulse" />
                          <span className="text-[9px] font-mono font-bold text-emerald-300 uppercase tracking-widest mt-1">Listening</span>
                        </>
                      ) : (
                        <>
                          <Activity className="w-8 h-8 text-gray-500" />
                          <span className="text-[9px] font-mono font-bold text-gray-400 uppercase tracking-widest mt-1">Silent waiting</span>
                        </>
                      )
                    ) : (
                      <>
                        <PhoneCall className="w-8 h-8 text-gray-600" />
                        <span className="text-[9px] font-mono font-bold text-gray-500 uppercase tracking-widest mt-1">Inactive Node</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Simulated Custom CSS Equalizer Waveform */}
                <div className="flex items-center gap-1.5 h-12 mt-6">
                  {Array.from({ length: 14 }).map((_, idx) => {
                    // Set variable heights based on speech state
                    const heightClass = isCallActive 
                      ? isAiSpeaking 
                        ? `h-${[6, 12, 8, 10, 4, 8, 12, 10, 6, 8, 4, 10, 6, 8][idx % 14]}`
                        : isUserSpeaking 
                        ? `h-${[8, 4, 10, 6, 12, 8, 10, 4, 8, 12, 10, 6, 8, 4][idx % 14]}`
                        : 'h-1.5'
                      : 'h-1';
                    
                    const colorClass = isCallActive 
                      ? isAiSpeaking 
                        ? 'bg-brand-500' 
                        : isUserSpeaking 
                        ? 'bg-emerald-500' 
                        : 'bg-gray-700' 
                      : 'bg-gray-800';

                    return (
                      <div 
                        key={idx} 
                        className={`w-1 rounded transition-all duration-300 ${heightClass} ${colorClass}`}
                      />
                    );
                  })}
                </div>

                {/* Puter.js TTS Status Indicators */}
                {isTtsLoading && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[10px] font-mono text-brand-400 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
                    <span>Puter generating voice...</span>
                  </div>
                )}
                {ttsWarning && (
                  <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-mono text-yellow-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                    <span>{ttsWarning}</span>
                  </div>
                )}
              </div>

              {/* Call Control Footer Area */}
              <div className="flex flex-col items-center gap-4 border-t border-[#12121a] pt-4">
                <div className="flex items-center gap-3">
                  {/* Start / End Call Button */}
                  {!isCallActive ? (
                    <button
                      onClick={startVoiceCall}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2 transition-all cursor-pointer border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)] animate-pulse"
                    >
                      <Phone className="w-4 h-4" />
                      Answer Incoming Call
                    </button>
                  ) : (
                    <button
                      onClick={endVoiceCall}
                      className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-bold text-xs uppercase tracking-wider font-mono flex items-center gap-2 transition-all cursor-pointer border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                    >
                      <PhoneOff className="w-4 h-4" />
                      End Live Call Session
                    </button>
                  )}

                  {/* Mic Mute Toggle */}
                  {isCallActive && (
                    <button
                      onClick={toggleMute}
                      className={`p-3 rounded-full transition-all cursor-pointer border ${
                        voiceSettings.isMuted 
                          ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                          : 'bg-[#12121e] text-white border-[#222232] hover:bg-[#1d1d2b]'
                      }`}
                      title={voiceSettings.isMuted ? "Unmute microphone" : "Mute microphone"}
                    >
                      {voiceSettings.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    </button>
                  )}
                </div>

                {/* Handoff Status panel if triggered */}
                {isHandoffActive && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-full p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3 shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                        <div>
                          <p className="text-xs font-bold text-white">Live Human Handoff Requested!</p>
                          <p className="text-[10px] text-gray-400 font-sans">Reason: AI exceeded threshold scope</p>
                        </div>
                      </div>
                      <span className="text-[9px] bg-amber-500/20 text-amber-300 font-sans font-semibold px-1.5 py-0.5 rounded border border-amber-500/30 animate-pulse">
                        RINGING AGENT
                      </span>
                    </div>

                    {!isHandoffAnswered ? (
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          onClick={answerHandoff}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-medium uppercase tracking-wider font-sans flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          Bridge Agent Call
                        </button>
                        <button
                          onClick={() => {
                            setIsHandoffActive(false);
                            addToast("Handoff cancelled. Returning to AI router.", "info");
                          }}
                          className="px-3 py-1.5 bg-transparent hover:bg-white/5 text-gray-400 hover:text-white rounded-lg text-[10px] font-semibold font-sans border border-transparent transition-all cursor-pointer"
                        >
                          Decline / Route Mailbox
                        </button>
                      </div>
                    ) : (
                      <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] text-emerald-400 font-sans font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        Human Specialist Connected! Voice Receptionist bypassed.
                      </div>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Real-time Voice Pipeline Debug Panel */}
              <div className="mt-4 border-t border-[#12121a] pt-4 w-full">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400 font-bold uppercase tracking-wider">
                    <span className="inline-block w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
                    <span>Voice Pipeline Debugger</span>
                  </div>
                  <button
                    onClick={() => setVoiceDebugLogs([])}
                    className="text-[9px] font-sans font-semibold text-gray-500 hover:text-white px-2 py-0.5 rounded bg-[#12121e] border border-[#222232] transition-all cursor-pointer"
                  >
                    Clear Logs
                  </button>
                </div>
                <div className="bg-[#030305] border border-[#12121e] rounded-xl p-3 h-28 overflow-y-auto font-mono text-[10px] space-y-1.5 scrollbar-thin scrollbar-thumb-gray-800">
                  {voiceDebugLogs.length === 0 ? (
                    <div className="text-gray-600 text-center py-6 font-sans">
                      No events captured yet. Initiate a call to stream pipeline logs.
                    </div>
                  ) : (
                    voiceDebugLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-2 leading-relaxed text-gray-300">
                        <span className="text-gray-600 shrink-0 font-sans">[{log.timestamp}]</span>
                        <span className="text-emerald-400 shrink-0">▶</span>
                        <span className="break-all">{log.text}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Live Streaming Call Transcripts Area */}
            <div className="w-full lg:w-72 bg-[#040407]/40 flex flex-col justify-between">
              
              {/* Transcript Header bar */}
              <div className="px-5 py-4 border-b border-[#151520] flex items-center justify-between bg-[#050508]/40">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Live Transcript</h4>
                  <p className="text-[10px] text-gray-500 font-sans">Real-time STT streaming logs</p>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] font-sans font-semibold text-emerald-400 bg-emerald-500/5 px-2 py-0.5 border border-emerald-500/10 rounded">
                  <Activity className="w-3 h-3" />
                  STT ON
                </div>
              </div>

              {/* Scrollable Transcript timeline */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[350px] lg:max-h-[380px]">
                {callTranscript.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
                    <VolumeX className="w-6 h-6 text-gray-600" />
                    <p className="text-[10px] text-gray-500 font-sans">Call history is currently clear. Press the Answer button above to initiate incoming simulation.</p>
                  </div>
                ) : (
                  callTranscript.map((msg) => {
                    const isAgent = msg.sender === 'agent';
                    if (msg.sender === 'system') {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <span className="px-2.5 py-1 bg-red-500/5 border border-red-500/10 rounded-lg text-[9px] text-red-400 font-sans font-semibold text-center leading-tight">
                            {msg.text}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div key={msg.id} className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-sans font-semibold uppercase tracking-wider ${
                              isAgent ? 'text-brand-400' : 'text-emerald-400'
                            }`}>
                              {isAgent ? 'Receptionist' : 'Caller'}
                            </span>
                            {isAgent && (
                              <button
                                type="button"
                                onClick={() => togglePlayMessage(msg.id, msg.text)}
                                className={`p-1 rounded-md transition-all cursor-pointer ${
                                  speakingMessageId === msg.id
                                    ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 animate-pulse'
                                    : loadingMessageId === msg.id
                                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                                title={
                                  speakingMessageId === msg.id
                                    ? 'Stop reading'
                                    : loadingMessageId === msg.id
                                    ? 'Preparing speech...'
                                    : 'Read message aloud'
                                }
                              >
                                {loadingMessageId === msg.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-brand-400" />
                                ) : speakingMessageId === msg.id ? (
                                  <VolumeX className="w-3 h-3 text-brand-300" />
                                ) : (
                                  <Volume2 className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                          <span className="text-[8px] font-mono text-gray-600">{msg.timestamp}</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed p-2.5 rounded-xl border ${
                          isAgent 
                            ? 'bg-[#0c0c14] border-[#1b1b2a] text-gray-200' 
                            : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300'
                        }`}>
                          {msg.text}
                        </p>
                      </div>
                    );
                  })
                )}

                {/* Processing reply bubble */}
                {isProcessingResponse && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-sans text-brand-400 uppercase tracking-wider font-semibold">Receptionist thinking</span>
                    <div className="bg-[#0c0c14] border border-[#1b1b2a] rounded-xl p-3 flex items-center gap-1 w-fit">
                      <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>

              {/* CRM Lead Extractor sync metrics */}
              <div className="p-4 border-t border-[#151520] bg-[#050508]/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-emerald-400 font-sans uppercase tracking-wider font-semibold">Lead Sync variables</span>
                  <span className="text-[8px] font-sans text-gray-500">Auto CRM Export</span>
                </div>
                <div className="space-y-1.5 text-[10px] font-sans">
                  <div className="flex justify-between border-b border-[#12121a] pb-1">
                    <span className="text-gray-500">Name:</span>
                    <span className={liveLead.name ? "text-emerald-400 font-semibold" : "text-gray-600"}>
                      {liveLead.name || 'missing'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#12121a] pb-1">
                    <span className="text-gray-500">Phone:</span>
                    <span className={liveLead.phone ? "text-emerald-400 font-semibold" : "text-gray-600"}>
                      {liveLead.phone || 'missing'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#12121a] pb-1">
                    <span className="text-gray-500">Email:</span>
                    <span className={liveLead.email ? "text-emerald-400 font-semibold" : "text-gray-600"}>
                      {liveLead.email || 'missing'}
                    </span>
                  </div>
                  {liveLead.appointmentDate && (
                    <div className="flex justify-between pt-1">
                      <span className="text-brand-400">📅 Appt Booked:</span>
                      <span className="text-brand-300 font-semibold">{liveLead.appointmentDate} @ {liveLead.appointmentTime}</span>
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: Historical Call Logs */}
        {subTab === 'history' && (
          <div className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#151520] pb-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Call History Logs</h4>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">Audit previous simulated call outcomes & transcripts</p>
              </div>
              <span className="text-[10px] font-sans font-semibold px-2.5 py-1 rounded bg-brand-600/10 text-brand-400 border border-brand-500/15">
                TOTAL RUNS: {callHistory.length}
              </span>
            </div>

            {callHistory.length === 0 ? (
              <div className="bg-[#040407]/40 border border-[#13131b] rounded-xl p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#12121e] border border-[#1e1e2d] flex items-center justify-center mx-auto">
                  <History className="w-5 h-5 text-gray-600" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white uppercase tracking-wider font-sans">No voice call runs found</p>
                  <p className="text-[10px] text-gray-500 max-w-xs mx-auto">Your call logs will compile here in real time as simulation calls are completed.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {callHistory.map((call) => (
                  <div 
                    key={call.id} 
                    className="bg-[#040407]/40 border border-[#1a1a24] hover:border-brand-500/20 rounded-xl p-4 space-y-3 transition-all relative flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-mono text-brand-400 uppercase tracking-widest">{call.id}</span>
                          <h5 className="text-xs font-bold text-white font-display mt-0.5">
                            {call.extractedLead.name || 'Anonymous Caller'}
                          </h5>
                        </div>
                        <span className={`text-[9px] font-sans font-semibold px-2 py-0.5 rounded border ${
                          call.outcome === 'Appointment Booked'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : call.outcome === 'Handoff Triggered'
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-brand-500/10 text-brand-400 border-brand-500/20'
                        }`}>
                          {call.outcome}
                        </span>
                      </div>

                      <div className="space-y-1 text-[10px] font-sans text-gray-400">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Call Date:</span>
                          <span className="text-gray-300">{call.date} @ {call.time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Duration:</span>
                          <span className="text-gray-300">{call.duration}</span>
                        </div>
                        {call.extractedLead.phone && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Phone:</span>
                            <span className="text-emerald-400 font-semibold">{call.extractedLead.phone}</span>
                          </div>
                        )}
                        {call.extractedLead.email && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Email:</span>
                            <span className="text-emerald-400 font-semibold truncate max-w-[130px]">{call.extractedLead.email}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#12121a]/60 flex justify-between items-center">
                      <button
                        onClick={() => setSelectedCall(call)}
                        className="text-[10px] text-brand-400 hover:text-white font-semibold font-sans flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        View Transcript ({call.transcript.length} turns)
                      </button>
                      {call.audioUrl && (
                        <a 
                          href={call.audioUrl} 
                          download={`scaleflow_call_${call.id}.webm`}
                          className="p-1.5 bg-[#12121e] hover:bg-brand-600 text-gray-400 hover:text-white rounded-lg transition-all border border-[#222232]"
                          title="Download Call Audio"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Transcript Modal detail view */}
            <AnimatePresence>
              {selectedCall && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 bg-[#030305]/80 backdrop-blur-sm flex items-center justify-center p-4"
                >
                  <motion.div 
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    className="bg-[#08080c] border border-[#1a1a24] rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
                  >
                    <div className="flex justify-between items-start border-b border-[#151520] pb-3">
                      <div>
                        <span className="text-[9px] font-mono text-brand-400">{selectedCall.id}</span>
                        <h4 className="text-sm font-bold text-white font-display mt-0.5">
                          Transcript: {selectedCall.extractedLead.name || 'Anonymous Caller'}
                        </h4>
                      </div>
                      <button 
                        onClick={() => setSelectedCall(null)}
                        className="p-1.5 hover:bg-white/5 text-gray-500 hover:text-white rounded-lg transition-all cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[50vh]">
                      {selectedCall.transcript.map((msg, idx) => {
                        const isAgent = msg.sender === 'agent';
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-[9px] font-sans font-semibold">
                              <div className="flex items-center gap-2">
                                <span className={isAgent ? 'text-brand-400' : 'text-emerald-400'}>
                                  {isAgent ? 'AI Receptionist' : 'Caller'}
                                </span>
                                {isAgent && (
                                  <button
                                    type="button"
                                    onClick={() => togglePlayMessage(`hist-${selectedCall.id}-${idx}`, msg.text)}
                                    className={`p-1 rounded-md transition-all cursor-pointer ${
                                      speakingMessageId === `hist-${selectedCall.id}-${idx}`
                                        ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30 animate-pulse'
                                        : loadingMessageId === `hist-${selectedCall.id}-${idx}`
                                        ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                                    }`}
                                    title={
                                      speakingMessageId === `hist-${selectedCall.id}-${idx}`
                                        ? 'Stop reading'
                                        : loadingMessageId === `hist-${selectedCall.id}-${idx}`
                                        ? 'Preparing speech...'
                                        : 'Read message aloud'
                                    }
                                  >
                                    {loadingMessageId === `hist-${selectedCall.id}-${idx}` ? (
                                      <Loader2 className="w-3 h-3 animate-spin text-brand-400" />
                                    ) : speakingMessageId === `hist-${selectedCall.id}-${idx}` ? (
                                      <VolumeX className="w-3 h-3 text-brand-300" />
                                    ) : (
                                      <Volume2 className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <span className="text-gray-600 font-mono">{msg.timestamp}</span>
                            </div>
                            <p className={`text-[11px] leading-relaxed p-2.5 rounded-xl border ${
                              isAgent 
                                ? 'bg-[#0c0c14] border-[#1b1b2a] text-gray-200' 
                                : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300'
                            }`}>
                              {msg.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-3 border-t border-[#151520] flex justify-end">
                      <button
                        onClick={() => setSelectedCall(null)}
                        className="px-4 py-2 bg-[#12121e] hover:bg-[#1d1d2b] border border-[#222232] text-white font-semibold font-sans text-xs rounded-lg cursor-pointer"
                      >
                        CLOSE
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* TAB 3: Saved Voice Recordings */}
        {subTab === 'recordings' && (
          <div className="flex-1 p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-[#151520] pb-4">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Call Recording Vault</h4>
                <p className="text-[10px] text-gray-500 font-sans mt-0.5">Listen to voice audio recordings saved locally on device</p>
              </div>
              <span className="text-[10px] font-sans font-semibold px-2.5 py-1 rounded bg-brand-600/10 text-brand-400 border border-brand-500/15">
                RECORDED FILE LIMIT: 20
              </span>
            </div>

            {savedRecordings.length === 0 ? (
              <div className="bg-[#040407]/40 border border-[#13131b] rounded-xl p-12 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-[#12121e] border border-[#1e1e2d] flex items-center justify-center mx-auto">
                  <Volume2 className="w-5 h-5 text-gray-600 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-white uppercase tracking-wider font-sans">No recordings archived</p>
                  <p className="text-[10px] text-gray-500 max-w-xs mx-auto font-sans">Toggling 'Auto-Record mic' inside voice settings will save audio logs here automatically.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {savedRecordings.map((rec) => (
                  <div 
                    key={rec.id} 
                    className="p-4 bg-[#040407]/40 border border-[#1a1a24] rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-sans font-semibold text-emerald-400">🔴 RECORDED FILE</span>
                        <span className="text-[9px] font-sans text-gray-500">{rec.date} @ {rec.time}</span>
                      </div>
                      <h5 className="text-xs font-bold text-white">
                        Inbound call: {rec.extractedLead.name || 'Anonymous Caller'}
                      </h5>
                      <p className="text-[10px] text-gray-500 font-sans">Call Length: {rec.duration}</p>
                    </div>

                    {/* Integrated Beautiful HTML Audio Player */}
                    {rec.audioUrl && (
                      <div className="w-full md:w-fit shrink-0 flex items-center gap-2">
                        <audio 
                          src={rec.audioUrl} 
                          controls 
                          className="h-9 w-full md:w-60 bg-transparent scale-95"
                        />
                        <a 
                          href={rec.audioUrl}
                          download={`scale_flow_call_${rec.id}.webm`}
                          className="p-2 bg-[#12121e] hover:bg-brand-600 text-gray-400 hover:text-white rounded-xl transition-colors border border-[#222232] cursor-pointer"
                          title="Download Audio File"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => deleteRecording(rec.id)}
                          className="p-2 bg-[#12121e] hover:bg-red-950 text-gray-400 hover:text-red-400 rounded-xl transition-colors border border-[#222232] cursor-pointer"
                          title="Delete Recording"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Voice Config / Settings */}
        {subTab === 'settings' && (
          <div className="flex-1 p-6 space-y-6">
            <div className="border-b border-[#151520] pb-4">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Voice & Speech Settings</h4>
              <p className="text-[10px] text-gray-500 mt-0.5 font-sans">Fine tune speech synthesis, recognition parameters, and model nodes</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Voice selector card */}
              <div className="bg-[#040407]/30 border border-[#151523] rounded-xl p-5 space-y-4">
                <h5 className="text-xs font-bold text-white font-display border-b border-[#12121a]/60 pb-2">Speech Synthesis Engine</h5>
                
                {/* Available voices dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] text-gray-400 font-sans font-semibold uppercase tracking-wider">Select Receptionist Voice</label>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => {
                      setSelectedVoiceName(e.target.value);
                      localStorage.setItem('scaleflow_selected_voice', e.target.value);
                    }}
                    className="block w-full px-3 py-2 bg-[#040407] border border-[#1d1d29] rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    {availableVoices.length === 0 ? (
                      <option value="">No voices detected</option>
                    ) : (
                      availableVoices.map((v, idx) => (
                        <option key={`${v.name}-${v.lang}-${idx}`} value={v.name}>
                          {v.name} ({v.lang})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Preview sound button */}
                {selectedVoiceName && (
                  <button
                    onClick={testSelectedVoice}
                    className="w-full py-2 bg-brand-600 hover:bg-brand-500 border border-brand-500/10 text-white font-medium font-sans text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Preview Configured Voice
                  </button>
                )}
              </div>

              {/* Sliders panel */}
              <div className="bg-[#040407]/30 border border-[#151523] rounded-xl p-5 space-y-4">
                <h5 className="text-xs font-bold text-white font-display border-b border-[#12121a]/60 pb-2">Voice Tone Parameters</h5>
                
                {/* Speed rate slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold uppercase text-gray-400">
                    <span>Speed / Speech Rate</span>
                    <span className="text-brand-400 font-mono font-bold">{voiceSettings.rate}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSettings.rate}
                    onChange={(e) => setVoiceSettings({ ...voiceSettings, rate: parseFloat(e.target.value) })}
                    className="w-full accent-brand-500 h-1.5 bg-[#12121a] rounded-lg cursor-pointer"
                  />
                </div>

                {/* Pitch Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold uppercase text-gray-400">
                    <span>Pitch Level</span>
                    <span className="text-brand-400 font-mono font-bold">{voiceSettings.pitch}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={voiceSettings.pitch}
                    onChange={(e) => setVoiceSettings({ ...voiceSettings, pitch: parseFloat(e.target.value) })}
                    className="w-full accent-brand-500 h-1.5 bg-[#12121a] rounded-lg cursor-pointer"
                  />
                </div>

                {/* Volume Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-sans font-semibold uppercase text-gray-400">
                    <span>Output Volume</span>
                    <span className="text-brand-400 font-mono font-bold">{Math.round(voiceSettings.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.1"
                    value={voiceSettings.volume}
                    onChange={(e) => setVoiceSettings({ ...voiceSettings, volume: parseFloat(e.target.value) })}
                    className="w-full accent-brand-500 h-1.5 bg-[#12121a] rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Behavior switches */}
              <div className="md:col-span-2 bg-[#040407]/30 border border-[#151523] rounded-xl p-5 space-y-4">
                <h5 className="text-xs font-bold text-white font-display border-b border-[#12121a]/60 pb-2">Interactive voice toggles</h5>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Enable/Disable Voice Toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-[#030305] border border-[#151523] rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-white block">Voice Output Enabled</span>
                      <span className="text-[10px] text-gray-500 font-sans block leading-tight">Enable or disable Text-to-Speech audio feedback</span>
                    </div>
                    <button
                      onClick={() => setVoiceSettings({ ...voiceSettings, isMuted: !voiceSettings.isMuted })}
                      className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                        !voiceSettings.isMuted ? 'bg-brand-600' : 'bg-gray-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        !voiceSettings.isMuted ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Natural Interruption handling toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-[#030305] border border-[#151523] rounded-xl">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-white block">Natural Interruption</span>
                      <span className="text-[10px] text-gray-500 font-sans block leading-tight">Stop AI speech immediately when caller voice is captured</span>
                    </div>
                    <button
                      onClick={() => setVoiceSettings({ ...voiceSettings, interruptOnVoice: !voiceSettings.interruptOnVoice })}
                      className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                        voiceSettings.interruptOnVoice ? 'bg-brand-600' : 'bg-gray-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        voiceSettings.interruptOnVoice ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Auto-record call session toggle */}
                  <div className="flex items-center justify-between p-3.5 bg-[#030305] border border-[#151523] rounded-xl col-span-1 sm:col-span-2 lg:col-span-1">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-white block">Auto-Record mic stream</span>
                      <span className="text-[10px] text-gray-500 font-sans block leading-tight">Create downloadable WAV logs of caller microphone</span>
                    </div>
                    <button
                      onClick={() => setVoiceSettings({ ...voiceSettings, autoRecord: !voiceSettings.autoRecord })}
                      className={`w-11 h-6 rounded-full p-1 transition-colors cursor-pointer ${
                        voiceSettings.autoRecord ? 'bg-brand-600' : 'bg-gray-800'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        voiceSettings.autoRecord ? 'translate-x-5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
