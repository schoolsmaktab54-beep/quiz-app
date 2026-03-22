import { useState, useEffect } from 'react';
import { 
  Users, ClipboardList, CheckSquare, Plus, Trash2, Edit, Save, 
  X, User, LogOut, Check, BarChart3, Upload, Download, 
  Search, Lock, Unlock, PlusCircle, AlertCircle, Menu
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Question {
  id: string;
  type: 'single' | 'multiple' | 'true-false' | 'yes-no' | 'image';
  text: string;
  options: string[];
  correctAnswers: number[];
  imageUrl?: string;
}
interface Test {
  id: string; title: string; description: string;
  questions: Question[]; timeLimit: number; createdAt: string;
}
interface UserAccount {
  id: string; fullName: string; email: string;
  role: 'admin' | 'user'; isBlocked: boolean; createdAt: string;
}
interface TestResult {
  id: string; userId: string; userName: string;
  testId: string; testTitle: string; score: number;
  totalQuestions: number; correctCount: number; date: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<'login'|'admin'|'user'>('login');
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [users, setUsers] = useState<UserAccount[]>([
    { id:'u1', fullName:'Alisher Navoiy', email:'user@test.uz', role:'user', isBlocked:false, createdAt:'2025-01-15' },
    { id:'u2', fullName:'Zuhra Kenjayeva', email:'zuhra@test.uz', role:'user', isBlocked:true, createdAt:'2025-01-20' },
    { id:'u3', fullName:'Admin Quiz', email:'admin@test.uz', role:'admin', isBlocked:false, createdAt:'2025-01-01' },
  ]);
  const [tests, setTests] = useState<Test[]>([
    { id:'t1', title:'Matematika Asoslari', description:"Matematikadan boshlang'ich tushunchalar testi", timeLimit:15, createdAt:'2025-02-01',
      questions:[
        { id:'q1', type:'single', text:'2 + 2 = ?', options:['3','4','5','6'], correctAnswers:[1] },
        { id:'q2', type:'multiple', text:'Qaysilar tub sonlar?', options:['2','4','7','9'], correctAnswers:[0,2] },
        { id:'q3', type:'true-false', text:'0 musbat son', options:["Rost","Yolg'on"], correctAnswers:[1] },
      ]
    },
    { id:'t2', title:'Dasturlash tarixi va IT', description:'Axborot texnologiyalari va dasturlash tillari haqida test', timeLimit:20, createdAt:'2025-02-10',
      questions:[
        { id:'q4', type:'single', text:'Python tilining asoschisi kim?', options:['Brendan Eich','Guido van Rossum','Bjarne Stroustrup','Denis Richie'], correctAnswers:[1] },
        { id:'q5', type:'image', text:'Ushbu logotip qaysi dasturlash tiliga tegishli?', options:['React','Vue','Angular','Svelte'], correctAnswers:[0], imageUrl:'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=300&q=80' },
        { id:'q6', type:'yes-no', text:"HTML dasturlash tilimi?", options:['Ha',"Yo'q"], correctAnswers:[1] },
      ]
    }
  ]);
  const [results, setResults] = useState<TestResult[]>([
    { id:'r1', userId:'u1', userName:'Alisher Navoiy', testId:'t1', testTitle:'Matematika Asoslari', score:66, totalQuestions:3, correctCount:2, date:'2025-02-15 14:30' },
  ]);

  const [adminTab, setAdminTab] = useState<'users'|'tests'|'analytics'|'solve'>('users');
  const [userTab, setUserTab] = useState<'available'|'results'>('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTest, setActiveTest] = useState<Test | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string,number[]>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [testFinished, setTestFinished] = useState(false);
  const [lastScore, setLastScore] = useState<TestResult | null>(null);
  const [isEditingTest, setIsEditingTest] = useState(false);
  const [editingTestId, setEditingTestId] = useState<string | null>(null);
  const [editTestTitle, setEditTestTitle] = useState('');
  const [editTestDescription, setEditTestDescription] = useState('');
  const [editTestTime, setEditTestTime] = useState(15);
  const [editQuestions, setEditQuestions] = useState<Question[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (activeTest && timeLeft > 0 && !testFinished) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    } else if (activeTest && timeLeft === 0 && !testFinished) { finishTest(); }
    return () => clearTimeout(timer);
  }, [activeTest, timeLeft, testFinished]);

  const handleLogin = (email: string) => {
    const foundUser = users.find(u => u.email === email);
    if (!foundUser) { alert("Foydalanuvchi topilmadi!"); return; }
    if (foundUser.isBlocked) { alert("Sizning hisobingiz bloklangan!"); return; }
    setCurrentUser(foundUser);
    setCurrentView(foundUser.role === 'admin' ? 'admin' : 'user');
    setUserTab('available'); setAdminTab('users');
  };
  const handleLogout = () => {
    setCurrentUser(null); setCurrentView('login');
    setActiveTest(null); setTestFinished(false); setSidebarOpen(false);
  };
  const addUser = () => {
    if (!newUserName || !newUserEmail) return;
    setUsers([...users, { id:'u'+(users.length+1), fullName:newUserName, email:newUserEmail, role:'user', isBlocked:false, createdAt:new Date().toISOString().split('T')[0] }]);
    setNewUserName(''); setNewUserEmail('');
  };
  const toggleBlockUser = (id: string) => setUsers(users.map(u => u.id===id ? {...u,isBlocked:!u.isBlocked} : u));
  const deleteUser = (id: string) => setUsers(users.filter(u => u.id!==id));
  const startTest = (test: Test) => {
    setActiveTest(test); setCurrentQuestionIndex(0); setUserAnswers({});
    setTimeLeft(test.timeLimit*60); setTestFinished(false); setLastScore(null);
  };
  const handleAnswerChange = (questionId: string, type: string, optionIndex: number) => {
    const currentAns = userAnswers[questionId] || [];
    if (type === 'multiple') {
      setUserAnswers({...userAnswers, [questionId]: currentAns.includes(optionIndex) ? currentAns.filter(i=>i!==optionIndex) : [...currentAns, optionIndex]});
    } else { setUserAnswers({...userAnswers, [questionId]: [optionIndex]}); }
  };
  const finishTest = () => {
    if (!activeTest || !currentUser) return;
    let correctCount = 0;
    activeTest.questions.forEach(q => {
      const uAns = userAnswers[q.id] || []; const cAns = q.correctAnswers;
      if (uAns.length===cAns.length && uAns.every(v=>cAns.includes(v))) correctCount++;
    });
    const score = Math.round((correctCount/activeTest.questions.length)*100);
    const newResult: TestResult = { id:'r'+(results.length+1), userId:currentUser.id, userName:currentUser.fullName, testId:activeTest.id, testTitle:activeTest.title, score, totalQuestions:activeTest.questions.length, correctCount, date:new Date().toLocaleString() };
    setResults([newResult,...results]); setLastScore(newResult); setTestFinished(true);
    if (score>=70) confetti({ particleCount:150, spread:100, origin:{y:0.6} });
  };
  const closeTest = () => { setActiveTest(null); setTestFinished(false); setLastScore(null); setUserTab('results'); };
  const openTestEditor = (test: Test | null) => {
    if (test) { setEditingTestId(test.id); setEditTestTitle(test.title); setEditTestDescription(test.description); setEditTestTime(test.timeLimit); setEditQuestions([...test.questions]); }
    else { setEditingTestId(null); setEditTestTitle(''); setEditTestDescription(''); setEditTestTime(15); setEditQuestions([]); }
    setIsEditingTest(true);
  };
  const addQuestionInEditor = (type: Question['type']) => {
    setEditQuestions([...editQuestions, { id:'q'+Date.now(), type, text: type==='true-false'?'Bayonot...':type==='yes-no'?'Savol...':'Yangi savol...', options:type==='true-false'?["Rost","Yolg'on"]:type==='yes-no'?['Ha',"Yo'q"]:['Variant A','Variant B','Variant C','Variant D'], correctAnswers:[0], imageUrl:type==='image'?'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&w=300&q=80':undefined }]);
  };
  const updateQuestionInEditor = (id: string, updated: Question) => setEditQuestions(editQuestions.map(q=>q.id===id?updated:q));
  const deleteQuestionInEditor = (id: string) => setEditQuestions(editQuestions.filter(q=>q.id!==id));
  const saveTest = () => {
    if (!editTestTitle || editQuestions.length===0) { alert("Sarlavha va kamida 1 ta savol bo'lishi kerak!"); return; }
    if (editingTestId) { setTests(tests.map(t=>t.id===editingTestId?{...t,title:editTestTitle,description:editTestDescription,timeLimit:editTestTime,questions:editQuestions}:t)); }
    else { setTests([...tests, { id:'t'+(tests.length+1), title:editTestTitle, description:editTestDescription, timeLimit:editTestTime, questions:editQuestions, createdAt:new Date().toISOString().split('T')[0] }]); }
    setIsEditingTest(false);
  };
  const deleteTest = (id: string) => setTests(tests.filter(t=>t.id!==id));
  const handleExportPDF = (result: TestResult) => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text('Quiz Bot - Test Natijasi', 14, 22);
    doc.setFontSize(11); doc.setTextColor(100); doc.text(`Sana: ${result.date}`, 14, 30);
    autoTable(doc, { startY:40, head:[['Kategoriya','Tafsilot']], body:[['Talaba',result.userName],['Test',result.testTitle],['Jami savollar',result.totalQuestions.toString()],["To'g'ri javoblar",result.correctCount.toString()],['Ball',`${result.score}%`],['Holat',result.score>=70?'Muvaffaqiyatli':'Yiqildi']], theme:'grid', headStyles:{fillColor:[79,70,229]} });
    doc.save(`${result.userName}_${result.testTitle}.pdf`);
  };
  const handleExportAnalyticsPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18); doc.text('Quiz Bot - Umumiy Tahliliy Hisobot', 14, 22);
    const avgScore = results.length>0?Math.round(results.reduce((a,c)=>a+c.score,0)/results.length):0;
    const passCount = results.filter(r=>r.score>=70).length;
    autoTable(doc, { startY:40, head:[['Talaba','Test','Ball','Holat','Sana']], body:results.map(r=>[r.userName,r.testTitle,`${r.score}%`,r.score>=70?'Muvaffaqiyatli':'Yiqildi',r.date]), theme:'grid', headStyles:{fillColor:[79,70,229]} });
    doc.save('Umumiy_Tahlil.pdf');
  };
  const downloadExcelTemplate = () => {
    const csv = "data:text/csv;charset=utf-8,Savol matni,Turi,Variant 1,Variant 2,Variant 3,Variant 4,To'g'ri javob\n2+2=?,single,3,4,5,6,1\n";
    const link = document.createElement('a'); link.setAttribute('href',encodeURI(csv)); link.setAttribute('download','shablon.csv'); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };
  const simulateExcelImport = () => {
    setEditQuestions([...editQuestions, { id:'ex1', type:'single', text:'Yer Quyoshdan nechanchi sayyora?', options:['1-chi','2-chi','3-chi','4-chi'], correctAnswers:[2] }]);
    alert("Excel fayldan savollar yuklandi (Mock).");
  };

  const navAdmin = [
    { key:'users', label:'Foydalanuvchilar', icon:<Users className="w-5 h-5"/> },
    { key:'tests', label:'Testlar banki', icon:<ClipboardList className="w-5 h-5"/> },
    { key:'analytics', label:'Natijalar', icon:<BarChart3 className="w-5 h-5"/> },
    { key:'solve', label:'Test yechish', icon:<CheckSquare className="w-5 h-5"/> },
  ];
  const navUser = [
    { key:'available', label:'Testlar', icon:<ClipboardList className="w-5 h-5"/> },
    { key:'results', label:'Natijalarim', icon:<BarChart3 className="w-5 h-5"/> },
  ];

  const formatTime = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* LOGIN */}
      {currentView==='login' && (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-4">
          <div className="bg-white/95 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-12 mb-4">
                <ClipboardList className="w-7 h-7 sm:w-8 sm:h-8 text-white transform -rotate-12" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Quiz Bot Pro</h1>
              <p className="text-slate-500 text-sm mt-1 text-center">Zamonaviy test va baholash tizimi</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email manzili</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400"><User className="w-5 h-5"/></span>
                  <input type="email" placeholder="user@test.uz yoki admin@test.uz" id="email-input"
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                    onKeyDown={(e)=>{ if(e.key==='Enter') handleLogin((e.target as HTMLInputElement).value); }}
                  />
                </div>
              </div>
              <button onClick={()=>handleLogin((document.getElementById('email-input') as HTMLInputElement).value)}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg transition-all">
                Tizimga kirish
              </button>
              <div className="border-t border-slate-100 pt-4 text-center">
                <p className="text-xs text-slate-400 mb-2">Sinov uchun test ma'lumotlari:</p>
                <div className="flex flex-col sm:flex-row justify-center gap-2 text-xs text-slate-500">
                  <span className="bg-slate-50 px-3 py-1 rounded-lg">👑 admin@test.uz</span>
                  <span className="bg-slate-50 px-3 py-1 rounded-lg">👤 user@test.uz</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN APP */}
      {currentView!=='login' && currentUser && (
        <div className="flex h-screen overflow-hidden">

          {/* SIDEBAR OVERLAY (mobile) */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={()=>setSidebarOpen(false)}/>
          )}

          {/* SIDEBAR */}
          <aside className={`
            fixed lg:static inset-y-0 left-0 z-50 w-64 sm:w-72 bg-white border-r border-slate-100 flex flex-col justify-between h-full flex-shrink-0
            transform transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}>
            <div className="p-5 sm:p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-md">
                    <CheckSquare className="w-4 h-4 text-white"/>
                  </div>
                  <span className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Quiz Bot</span>
                </div>
                <button onClick={()=>setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-slate-100">
                  <X className="w-5 h-5 text-slate-500"/>
                </button>
              </div>

              <div className="mb-6 p-3 sm:p-4 bg-slate-50 rounded-2xl flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-600 font-bold border border-slate-100 text-sm flex-shrink-0">
                  {currentUser.fullName.split(' ').map(n=>n[0]).join('')}
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-semibold text-sm text-slate-800 truncate">{currentUser.fullName}</h3>
                  <span className="text-xs text-slate-400 capitalize">{currentUser.role}</span>
                </div>
              </div>

              <nav className="space-y-1.5">
                {(currentUser.role==='admin' ? navAdmin : navUser).map(item=>(
                  <button key={item.key}
                    onClick={()=>{ 
                      if(currentUser.role==='admin') setAdminTab(item.key as any);
                      else setUserTab(item.key as any);
                      setIsEditingTest(false); setActiveTest(null); setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-3 sm:p-3.5 rounded-xl font-medium text-sm transition-colors ${
                      ((currentUser.role==='admin'?adminTab:userTab)===item.key && !isEditingTest && !activeTest)
                        ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'
                    }`}>
                    {item.icon}<span>{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
            <div className="p-5 sm:p-6 border-t border-slate-100">
              <button onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-medium text-sm transition-colors">
                <LogOut className="w-5 h-5"/><span>Chiqish</span>
              </button>
            </div>
          </aside>

          {/* MAIN */}
          <div className="flex-1 flex flex-col h-full overflow-hidden">

            {/* TOP BAR (mobile) */}
            <header className="lg:hidden bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between flex-shrink-0">
              <button onClick={()=>setSidebarOpen(true)} className="p-2 rounded-xl hover:bg-slate-100">
                <Menu className="w-5 h-5 text-slate-600"/>
              </button>
              <span className="font-bold text-slate-800">Quiz Bot</span>
              <div className="w-9 h-9 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 font-bold text-sm">
                {currentUser.fullName.split(' ').map(n=>n[0]).join('')}
              </div>
            </header>

            <main className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 lg:p-8">

              {/* 1. ADMIN - USERS */}
              {currentUser.role==='admin' && adminTab==='users' && !isEditingTest && !activeTest && (
                <div className="max-w-5xl mx-auto">
                  <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Foydalanuvchilar Boshqaruvi</h1>
                    <p className="text-slate-500 text-sm mt-1">Ro'yxatdan o'tgan talabalarni boshqaring.</p>
                  </div>

                  <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input type="text" value={newUserName} onChange={e=>setNewUserName(e.target.value)} placeholder="F.I.O"
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
                      <input type="email" value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} placeholder="Email"
                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
                      <button onClick={addUser} disabled={!newUserName||!newUserEmail}
                        className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-colors">
                        <Plus className="w-4 h-4"/><span>Qo'shish</span>
                      </button>
                    </div>
                  </div>

                  {/* Mobile cards / Desktop table */}
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    {/* Desktop table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="bg-slate-50/70 border-b border-slate-100">
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Foydalanuvchi</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Roli</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Sana</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Amallar</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {users.map(u=>(
                            <tr key={u.id} className="hover:bg-slate-50/50">
                              <td className="p-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-semibold text-indigo-600 text-xs flex-shrink-0">
                                    {u.fullName.split(' ').map(n=>n[0]).join('')}
                                  </div>
                                  <div><p className="font-semibold text-slate-800">{u.fullName}</p><p className="text-xs text-slate-400">{u.email}</p></div>
                                </div>
                              </td>
                              <td className="p-4 text-slate-600 capitalize">{u.role}</td>
                              <td className="p-4 text-slate-600">{u.createdAt}</td>
                              <td className="p-4">
                                {u.isBlocked
                                  ? <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Bloklangan</span>
                                  : <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Faol</span>}
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  <button onClick={()=>toggleBlockUser(u.id)} className="p-1.5 hover:bg-slate-100 text-slate-500 rounded-lg transition-colors">
                                    {u.isBlocked ? <Unlock className="w-4 h-4"/> : <Lock className="w-4 h-4"/>}
                                  </button>
                                  <button onClick={()=>deleteUser(u.id)} className="p-1.5 hover:bg-red-50 text-red-400 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4"/>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                      {users.map(u=>(
                        <div key={u.id} className="p-4 flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center font-bold text-indigo-600 text-sm flex-shrink-0">
                              {u.fullName.split(' ').map(n=>n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-slate-800">{u.fullName}</p>
                              <p className="text-xs text-slate-400">{u.email}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${u.isBlocked?'bg-red-100 text-red-600':'bg-green-100 text-green-600'}`}>
                                {u.isBlocked?'Bloklangan':'Faol'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-1">
                            <button onClick={()=>toggleBlockUser(u.id)} className="p-2 hover:bg-slate-100 text-slate-500 rounded-lg">
                              {u.isBlocked?<Unlock className="w-4 h-4"/>:<Lock className="w-4 h-4"/>}
                            </button>
                            <button onClick={()=>deleteUser(u.id)} className="p-2 hover:bg-red-50 text-red-400 rounded-lg">
                              <Trash2 className="w-4 h-4"/>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. ADMIN - TESTS BANK */}
              {currentUser.role==='admin' && adminTab==='tests' && !isEditingTest && !activeTest && (
                <div className="max-w-5xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Testlar Banki</h1>
                      <p className="text-slate-500 text-sm mt-1">Siz yaratgan barcha testlar.</p>
                    </div>
                    <button onClick={()=>openTestEditor(null)}
                      className="flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 px-5 rounded-xl transition-colors shadow-md">
                      <PlusCircle className="w-5 h-5"/><span>Yangi Test</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {tests.map(test=>(
                      <div key={test.id} className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><ClipboardList className="w-5 h-5"/></div>
                            <span className="text-xs text-slate-400">{test.createdAt}</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2 truncate">{test.title}</h3>
                          <p className="text-sm text-slate-500 mb-4 line-clamp-2">{test.description}</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">⏱ {test.timeLimit} daqiqa</span>
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">📝 {test.questions.length} ta savol</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                          <button onClick={()=>openTestEditor(test)} className="flex items-center space-x-1.5 text-indigo-600 font-medium text-sm hover:underline">
                            <Edit className="w-4 h-4"/><span>Tahrirlash</span>
                          </button>
                          <button onClick={()=>deleteTest(test.id)} className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4"/>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. ADMIN - TEST EDITOR */}
              {currentUser.role==='admin' && isEditingTest && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{editingTestId?'Testni Tahrirlash':"Yangi Test Qo'shish"}</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button onClick={()=>setIsEditingTest(false)}
                        className="flex items-center space-x-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-sm py-2.5 px-4 rounded-xl transition-colors">
                        <X className="w-4 h-4"/><span>Bekor</span>
                      </button>
                      <button onClick={saveTest}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 px-5 rounded-xl transition-colors shadow-md">
                        <Save className="w-4 h-4"/><span>Saqlash</span>
                      </button>
                    </div>
                  </div>
                  <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 mb-6 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-semibold text-slate-600 mb-1">Test sarlavhasi</label>
                        <input type="text" value={editTestTitle} onChange={e=>setEditTestTitle(e.target.value)} placeholder="Test nomi"
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-600 mb-1">Vaqt (daqiqa)</label>
                        <input type="number" value={editTestTime} onChange={e=>setEditTestTime(parseInt(e.target.value)||15)}
                          className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-600 mb-1">Tavsif</label>
                      <textarea value={editTestDescription} onChange={e=>setEditTestDescription(e.target.value)} rows={2} placeholder="Test haqida..."
                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
                    </div>
                  </div>
                  <div className="mb-6 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600"><Upload className="w-4 h-4"/></div>
                        <div>
                          <h4 className="font-semibold text-sm text-indigo-900">Excel orqali yuklash</h4>
                          <p className="text-xs text-indigo-700">Shablonga muvofiq import qiling.</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button onClick={downloadExcelTemplate}
                          className="flex items-center space-x-1.5 bg-white text-indigo-600 border border-indigo-200 font-medium text-xs py-2 px-3 rounded-xl">
                          <Download className="w-3.5 h-3.5"/><span>Shablon</span>
                        </button>
                        <button onClick={simulateExcelImport}
                          className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2 px-3 rounded-xl">
                          <span>Yuklash (.xlsx)</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4 sm:space-y-6">
                    {editQuestions.map((q, qIndex)=>(
                      <div key={q.id} className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 relative">
                        <button onClick={()=>deleteQuestionInEditor(q.id)}
                          className="absolute top-4 right-4 p-1.5 hover:bg-red-50 text-red-400 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                        <div className="flex items-center space-x-2 mb-4">
                          <span className="w-7 h-7 bg-indigo-100 text-indigo-600 rounded-lg font-bold text-sm flex items-center justify-center">{qIndex+1}</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-xs uppercase">{q.type}</span>
                        </div>
                        <div className="space-y-3 pr-8">
                          <input type="text" value={q.text} onChange={e=>updateQuestionInEditor(q.id,{...q,text:e.target.value})} placeholder="Savol matni"
                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
                          {q.type==='image' && (
                            <input type="text" value={q.imageUrl||''} onChange={e=>updateQuestionInEditor(q.id,{...q,imageUrl:e.target.value})} placeholder="Rasm URL"
                              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"/>
                          )}
                          <div className="space-y-2">
                            {q.options.map((opt,oIndex)=>(
                              <div key={oIndex} className="flex items-center space-x-2 sm:space-x-3">
                                {(q.type==='true-false'||q.type==='yes-no') ? (
                                  <div className="flex space-x-1 flex-shrink-0">
                                    <button onClick={()=>{ if(!q.correctAnswers.includes(oIndex)) updateQuestionInEditor(q.id,{...q,correctAnswers:[...q.correctAnswers,oIndex]}); }}
                                      className={`px-2 py-1 text-xs font-semibold rounded-md ${q.correctAnswers.includes(oIndex)?'bg-emerald-600 text-white':'bg-slate-100 text-slate-500'}`}>
                                      {q.type==='true-false'?'True':'Yes'}
                                    </button>
                                    <button onClick={()=>{ if(q.correctAnswers.includes(oIndex)) updateQuestionInEditor(q.id,{...q,correctAnswers:q.correctAnswers.filter(v=>v!==oIndex)}); }}
                                      className={`px-2 py-1 text-xs font-semibold rounded-md ${!q.correctAnswers.includes(oIndex)?'bg-red-600 text-white':'bg-slate-100 text-slate-500'}`}>
                                      {q.type==='true-false'?'False':'No'}
                                    </button>
                                  </div>
                                ) : (
                                  <input type={q.type==='multiple'?'checkbox':'radio'} name={`q-${q.id}`} checked={q.correctAnswers.includes(oIndex)}
                                    onChange={()=>{ if(q.type==='multiple'){ const n=q.correctAnswers.includes(oIndex)?q.correctAnswers.filter(v=>v!==oIndex):[...q.correctAnswers,oIndex]; updateQuestionInEditor(q.id,{...q,correctAnswers:n}); } else updateQuestionInEditor(q.id,{...q,correctAnswers:[oIndex]}); }}
                                    className="w-4 h-4 text-indigo-600 rounded flex-shrink-0"/>
                                )}
                                <input type="text" value={opt} onChange={e=>{ const opts=[...q.options]; opts[oIndex]=e.target.value; updateQuestionInEditor(q.id,{...q,options:opts}); }}
                                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl outline-none text-sm focus:ring-1 focus:ring-indigo-400"/>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-100/70 rounded-2xl border border-dashed border-slate-200 justify-center">
                      {(['single','multiple','true-false','yes-no','image'] as const).map(type=>(
                        <button key={type} onClick={()=>addQuestionInEditor(type)}
                          className="flex items-center space-x-1.5 text-xs bg-white hover:bg-slate-50 text-slate-700 py-2 px-3 rounded-lg border shadow-sm transition-colors">
                          <Plus className="w-3.5 h-3.5"/>
                          <span>{{single:"1 ta tanlovli",multiple:"Ko'p tanlovli",'true-false':"True/False",'yes-no':"Ha/Yo'q",image:"Rasmli"}[type]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 4. ADMIN - ANALYTICS */}
              {currentUser.role==='admin' && adminTab==='analytics' && !isEditingTest && !activeTest && (
                <div className="max-w-5xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
                    <div>
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Natijalar Tahlili</h1>
                      <p className="text-slate-500 text-sm mt-1">Talabalar natijalari va hisobotlar.</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                    {[
                      { label:'Urunishlar', value:`${results.length} ta`, icon:<ClipboardList className="w-6 h-6"/>, color:'indigo' },
                      { label:'Muvaffaqiyatli', value:`${Math.round((results.filter(r=>r.score>=70).length/Math.max(results.length,1))*100)}%`, icon:<CheckSquare className="w-6 h-6"/>, color:'green' },
                      { label:"O'rtacha ball", value:`${results.length>0?Math.round(results.reduce((a,c)=>a+c.score,0)/results.length):0}%`, icon:<BarChart3 className="w-6 h-6"/>, color:'amber' },
                    ].map((stat,i)=>(
                      <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
                        <div className={`p-3 bg-${stat.color}-50 rounded-xl text-${stat.color}-600`}>{stat.icon}</div>
                        <div><p className="text-xs text-slate-500 uppercase font-semibold">{stat.label}</p><p className="text-2xl font-bold text-slate-900">{stat.value}</p></div>
                      </div>
                    ))}
                  </div>
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                      <h3 className="font-bold text-slate-800">Barcha natijalar</h3>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative">
                          <input type="text" placeholder="Qidiruv..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)}
                            className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500 w-36 sm:w-auto"/>
                          <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400"/>
                        </div>
                        <button onClick={()=>{ if(window.confirm("O'chirish?")) setResults([]); }}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-semibold hover:bg-red-100">
                          <Trash2 className="w-3.5 h-3.5"/><span>Tozalash</span>
                        </button>
                        <button onClick={handleExportAnalyticsPDF}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-semibold hover:bg-indigo-100">
                          <Download className="w-3.5 h-3.5"/><span>PDF</span>
                        </button>
                      </div>
                    </div>
                    {/* Desktop table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <table className="w-full text-left">
                        <thead><tr className="bg-slate-50/70 border-b border-slate-100">
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Foydalanuvchi</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Test</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Ball</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Sana</th>
                          <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">PDF</th>
                        </tr></thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {results.filter(r=>r.userName.toLowerCase().includes(searchTerm.toLowerCase())||r.testTitle.toLowerCase().includes(searchTerm.toLowerCase())).map(res=>(
                            <tr key={res.id} className="hover:bg-slate-50/50">
                              <td className="p-4 font-semibold">{res.userName}</td>
                              <td className="p-4 text-slate-600">{res.testTitle}</td>
                              <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${res.score>=70?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{res.score}%</span></td>
                              <td className="p-4 text-slate-500 text-xs">{res.date}</td>
                              <td className="p-4 text-right"><button onClick={()=>handleExportPDF(res)} className="p-1.5 hover:bg-slate-100 rounded-lg border text-xs flex items-center space-x-1 ml-auto"><Download className="w-3.5 h-3.5"/><span>PDF</span></button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="sm:hidden divide-y divide-slate-100">
                      {results.filter(r=>r.userName.toLowerCase().includes(searchTerm.toLowerCase())||r.testTitle.toLowerCase().includes(searchTerm.toLowerCase())).map(res=>(
                        <div key={res.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-sm text-slate-800">{res.userName}</p>
                            <p className="text-xs text-slate-500">{res.testTitle}</p>
                            <p className="text-xs text-slate-400">{res.date}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${res.score>=70?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{res.score}%</span>
                            <button onClick={()=>handleExportPDF(res)} className="p-2 hover:bg-slate-100 rounded-lg"><Download className="w-4 h-4 text-slate-500"/></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. AVAILABLE TESTS */}
              {((currentUser.role==='user' && userTab==='available')||(currentUser.role==='admin' && adminTab==='solve')) && !activeTest && (
                <div className="max-w-5xl mx-auto">
                  <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mavjud Testlar</h1>
                    <p className="text-slate-500 text-sm mt-1">O'z bilimingizni sinab ko'ring.</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {tests.map(test=>(
                      <div key={test.id} className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><ClipboardList className="w-5 h-5"/></div>
                            <span className="text-xs text-slate-400">{test.createdAt}</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-2">{test.title}</h3>
                          <p className="text-sm text-slate-500 mb-4 line-clamp-2">{test.description}</p>
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">⏱ {test.timeLimit} daqiqa</span>
                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-lg">📝 {test.questions.length} ta savol</span>
                          </div>
                        </div>
                        <button onClick={()=>startTest(test)}
                          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm py-2.5 rounded-xl transition-colors shadow-sm">
                          Testni boshlash
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 6. MY RESULTS */}
              {currentUser.role==='user' && userTab==='results' && !activeTest && (
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6 sm:mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Mening Natijalarim</h1>
                    <p className="text-slate-500 text-sm mt-1">O'tilgan testlar tarixi.</p>
                  </div>
                  {results.filter(r=>r.userId===currentUser.id).length===0 ? (
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 text-center">
                      <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4"><BarChart3 className="w-8 h-8"/></div>
                      <h3 className="text-lg font-bold text-slate-800 mb-1">Hozircha natijalar yo'q</h3>
                      <button onClick={()=>setUserTab('available')} className="mt-4 bg-indigo-600 text-white font-medium text-sm py-2 px-4 rounded-xl">Testlarga qaytish</button>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      {/* Desktop */}
                      <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left">
                          <thead><tr className="bg-slate-50/70 border-b border-slate-100">
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Test</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Ball</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Sana</th>
                            <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Eksport</th>
                          </tr></thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {results.filter(r=>r.userId===currentUser.id).map(res=>(
                              <tr key={res.id} className="hover:bg-slate-50/50">
                                <td className="p-4 font-semibold">{res.testTitle}</td>
                                <td className="p-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${res.score>=70?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{res.score}%</span></td>
                                <td className="p-4 text-slate-500 text-xs">{res.date}</td>
                                <td className="p-4 text-right"><button onClick={()=>handleExportPDF(res)} className="p-1.5 hover:bg-slate-100 rounded-lg border text-xs flex items-center space-x-1 ml-auto"><Download className="w-3.5 h-3.5"/><span>PDF</span></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {/* Mobile */}
                      <div className="sm:hidden divide-y divide-slate-100">
                        {results.filter(r=>r.userId===currentUser.id).map(res=>(
                          <div key={res.id} className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-sm">{res.testTitle}</p>
                              <p className="text-xs text-slate-400">{res.date}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${res.score>=70?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{res.score}%</span>
                              <button onClick={()=>handleExportPDF(res)} className="p-2 hover:bg-slate-100 rounded-lg"><Download className="w-4 h-4 text-slate-500"/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 7. ACTIVE QUIZ */}
              {activeTest && (
                <div className="fixed inset-0 bg-slate-50 z-50 flex flex-col overflow-hidden">
                  {!testFinished ? (
                    <>
                      {/* Quiz Header */}
                      <div className="bg-white border-b border-slate-100 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
                        <div className="min-w-0">
                          <h2 className="text-base sm:text-xl font-bold text-slate-900 truncate">{activeTest.title}</h2>
                          <p className="text-xs sm:text-sm text-slate-500">Savol {currentQuestionIndex+1} / {activeTest.questions.length}</p>
                        </div>
                        <div className="flex items-center space-x-3 flex-shrink-0 ml-3">
                          <div className={`px-3 py-1.5 rounded-xl text-sm font-bold tabular-nums ${timeLeft<60?'bg-red-100 text-red-600':'bg-indigo-50 text-indigo-600'}`}>
                            ⏱ {formatTime(timeLeft)}
                          </div>
                          <button onClick={()=>{ if(window.confirm("Testni tark etasizmi?")) { setActiveTest(null); setTestFinished(false); } }}
                            className="p-2 hover:bg-slate-100 rounded-lg text-slate-500">
                            <X className="w-5 h-5"/>
                          </button>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="bg-white h-1.5 flex-shrink-0">
                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{width:`${((currentQuestionIndex+1)/activeTest.questions.length)*100}%`}}/>
                      </div>

                      {/* Question area */}
                      <div className="flex-1 overflow-y-auto p-4 sm:p-8">
                        <div className="max-w-2xl mx-auto">
                          {(() => {
                            const q = activeTest.questions[currentQuestionIndex];
                            const qId = q.id; const qType = q.type;
                            return (
                              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 sm:p-8">
                                <div className="mb-2">
                                  <span className="text-xs font-semibold text-indigo-500 uppercase tracking-wider">
                                    {{'single':'Bitta to\'g\'ri','multiple':'Bir nechta to\'g\'ri','true-false':'To\'g\'ri/Noto\'g\'ri','yes-no':'Ha/Yo\'q','image':'Rasmga qarab'}[qType]}
                                  </span>
                                </div>
                                {q.imageUrl && <img src={q.imageUrl} alt="savol" className="w-full max-h-48 sm:max-h-64 object-cover rounded-xl mb-4"/>}
                                <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-5 sm:mb-6">{q.text}</h3>
                                <div className="space-y-3">
                                  {q.options.map((option, oIdx)=>{
                                    const isChecked = (userAnswers[qId]||[]).includes(oIdx);
                                    if (qType==='true-false'||qType==='yes-no') {
                                      return (
                                        <div key={oIdx} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white">
                                          <span className="text-slate-800 text-sm font-medium">{option}</span>
                                          <div className="flex items-center space-x-2">
                                            <button onClick={()=>{ if(!isChecked) handleAnswerChange(qId,qType,oIdx); }}
                                              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${isChecked?'bg-emerald-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                              {qType==='true-false'?'True':'Yes'}
                                            </button>
                                            <button onClick={()=>{ if(isChecked) handleAnswerChange(qId,qType,oIdx); }}
                                              className={`px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${!isChecked?'bg-red-600 text-white':'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                              {qType==='true-false'?'False':'No'}
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    }
                                    return (
                                      <label key={oIdx}
                                        className={`flex items-center space-x-4 p-4 rounded-xl border cursor-pointer transition-colors ${isChecked?'border-indigo-600 bg-indigo-50/50':'border-slate-200 hover:bg-slate-50'}`}>
                                        <input type={qType==='multiple'?'checkbox':'radio'} name={`question-${qId}`} checked={isChecked}
                                          onChange={()=>handleAnswerChange(qId,qType,oIdx)}
                                          className="w-5 h-5 text-indigo-600 rounded flex-shrink-0"/>
                                        <span className="text-slate-800 text-sm font-medium">{option}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Quiz Footer */}
                      <div className="bg-white border-t border-slate-100 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
                        <button onClick={()=>setCurrentQuestionIndex(Math.max(0,currentQuestionIndex-1))} disabled={currentQuestionIndex===0}
                          className="px-4 sm:px-5 py-2.5 border rounded-xl hover:bg-slate-50 text-slate-600 font-medium text-sm disabled:opacity-40 transition-colors">
                          ← Avvalgi
                        </button>
                        {/* Question dots (hidden on very small screens) */}
                        <div className="hidden sm:flex flex-wrap justify-center gap-1 max-w-xs">
                          {activeTest.questions.map((_,i)=>(
                            <button key={i} onClick={()=>setCurrentQuestionIndex(i)}
                              className={`w-7 h-7 rounded-lg text-xs font-semibold transition-colors ${i===currentQuestionIndex?'bg-indigo-600 text-white':userAnswers[activeTest.questions[i].id]?.length>0?'bg-indigo-100 text-indigo-600':'bg-slate-100 text-slate-500'}`}>
                              {i+1}
                            </button>
                          ))}
                        </div>
                        {currentQuestionIndex===activeTest.questions.length-1 ? (
                          <button onClick={finishTest}
                            className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm rounded-xl shadow-lg">
                            🏁 Tugatish
                          </button>
                        ) : (
                          <button onClick={()=>setCurrentQuestionIndex(Math.min(activeTest.questions.length-1,currentQuestionIndex+1))}
                            className="px-4 sm:px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl transition-colors">
                            Keyingi →
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 overflow-y-auto">
                      <div className="max-w-sm w-full bg-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center text-center">
                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 ${lastScore&&lastScore.score>=70?'bg-green-100 text-green-600':'bg-red-100 text-red-600'}`}>
                          {lastScore&&lastScore.score>=70 ? <Check className="w-8 h-8 sm:w-10 sm:h-10"/> : <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10"/>}
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-1">Test Tugadi!</h2>
                        <p className="text-sm text-slate-500 mb-6">Hisobotingiz bilan tanishing.</p>
                        <div className="w-full bg-slate-50 p-4 rounded-xl mb-6 flex justify-around">
                          <div>
                            <span className="text-xs text-slate-400">Ball</span>
                            <p className={`text-2xl sm:text-3xl font-extrabold ${lastScore&&lastScore.score>=70?'text-green-600':'text-red-600'}`}>{lastScore?.score||0}%</p>
                          </div>
                          <div className="border-l border-slate-200"/>
                          <div>
                            <span className="text-xs text-slate-400">To'g'ri</span>
                            <p className="text-2xl sm:text-3xl font-bold text-slate-800">{lastScore?.correctCount||0}/{lastScore?.totalQuestions||0}</p>
                          </div>
                        </div>
                        <div className="w-full space-y-3">
                          {lastScore && (
                            <button onClick={()=>handleExportPDF(lastScore)}
                              className="w-full flex items-center justify-center space-x-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl text-sm">
                              <Download className="w-4 h-4"/><span>PDF Yuklash</span>
                            </button>
                          )}
                          <button onClick={closeTest}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl text-sm">
                            Natijalarni ko'rish
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </main>
          </div>
        </div>
      )}
    </div>
  );
}
