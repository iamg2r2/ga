import {dashboard as renderFacultyDashboard,studentDashboard as renderStudentDashboard} from './pages/dashboards.js';
import {facultyPage as renderFacultyPage,recordsPage as renderRecordsPage} from './pages/administration.js';
import {AcademyApi} from './api.js';
import {icons} from './components/icons.js';
import {myCoursesPage,courseAlertCount,markCourseVisited} from './my-courses.js';

const cfg=window.ACADEMY_CONFIG||{};
const demoMode=!(cfg.supabaseUrl&&cfg.supabasePublishableKey);
const api=demoMode?null:new AcademyApi(cfg);
const root=document.getElementById('root');
const $=s=>document.querySelector(s);
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const A=(s,n=90)=>E(String(s??'').slice(0,n));
const day=x=>x?new Date(x).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—';
const savedSidebarCollapsed=()=>{try{return localStorage.getItem('g2r2-academy-sidebar-collapsed')==='1'}catch{return false}};
let state={manualUnit:1,manualTopic:null,manualSearch:'',manualTopicsOpen:false,manualAnswers:{},labNo:0,labTab:'aim',labSearch:'',selectedLabs:[],demoGate:!!window.ACADEMY_PREVIEW_LOGIN&&!sessionStorage.getItem('academy-preview-session'),sidebarCollapsed:savedSidebarCollapsed(),courseEntered:false,page:'courses',unit:1,hour:1,choice:null,ordering:[],showHint:false,modal:'',loginMode:'signin',notice:'',busy:false,smallMenu:false,offeringId:null,sessionLesson:null,selectedActivity:null,deviceBlocked:false,authResult:'',filter:'',topicsOpen:false,selectedLessons:[]};
let data=null,demo=null,rawLessons=[],rawLabs=[];let timer=null;
const demoKey='g2r2-academy-DEMO-v3-labs';
const manualProgressKey='g2r2-academy-manual-understood-v1';
let manualUnderstood=new Set();try{manualUnderstood=new Set(JSON.parse(localStorage.getItem(manualProgressKey)||'[]'))}catch{}
let previewState={count:0,themeDark:false,route:'home',api:'idle',auth:'out',notes:['Revise Flutter widgets','Practice Dart every day']};
const esc=E;
// Original Academy icon language: restrained line icons, not emoji navigation.
const dartUnitNames=['Basics of Dart','Fundamentals of Flutter','Widgets','Theming and Styling','Firebase Plugins'];
const unitNames=new Proxy(dartUnitNames,{get(target,key){if(key==='map')return (callback)=>((data?.courseUnits?.length?Array.from({length:5},(_,i)=>data.courseUnits.find(u=>u.unit_no===i+1)?.title||'Unit '+(i+1)):target)).map(callback);if(typeof key==='string'&&/^\d+$/.test(key))return data?.courseUnits?.find(u=>u.unit_no===Number(key)+1)?.title||target[Number(key)];return target[key]}});
const activeCourse=()=>data?.courses?.find(c=>c.id===data?.offerings?.find(o=>o.id===data?.offeringId)?.course_id);
const isSmartDevices=()=>!activeCourse()||activeCourse()?.code==='25PCA2CC04';
const uuid=()=>crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now();
const deviceId=()=>{let id=localStorage.getItem('academy-device');if(!id){id=uuid();localStorage.setItem('academy-device',id)}return id};
const notice=s=>{let t=$('#toast');if(!t)return;t.textContent=s;t.classList.add('show');clearTimeout(notice.handle);notice.handle=setTimeout(()=>t.classList.remove('show'),3600)};
const getLesson=h=>data?.lessons?.find(l=>Number(l.teaching_hour)===Number(h)&&topicIsUnlocked(l));
const currentLesson=()=>getLesson(state.hour)||data?.lessons?.find(topicIsUnlocked);
const isFaculty=()=>data?.me?.account_role==='faculty'||data?.me?.account_role==='admin';
const isAdmin=()=>!demoMode&&data?.me?.account_role==='admin';
let platformStatus={maintenance_enabled:false,message:'We are improving g2r2 Academy. Please check back shortly.',is_admin:false};
let importPreview=[];let importFilename='';let importResults=[];

let facultyData={faculty:[],courses:[],offerings:[],assignments:[]};
async function loadFacultyData(){facultyData=await api.request('/functions/v1/academy-admin-courses',{method:'POST',body:{action:'list'}})}
async function facultyAction(action,fields){const result=await api.request('/functions/v1/academy-admin-courses',{method:'POST',body:{action,...fields}});await loadFacultyData();await refresh();return result}

let studentRoster={students:[],count:0,page:0,page_size:30};let studentSearch='';let studentFilter='all';let studentLoading=false;let studentError='';

let selectedStudentIds=new Set(),selectedStudentRows=new Map(),studentBulkProgress=null,studentBulkResult='';
const studentBulkActions={enroll:'Enroll in class',withdraw:'Remove from class',suspend:'Suspend accounts',restore:'Restore accounts',delete:'Permanently delete accounts'};
function clearStudentSelection(){selectedStudentIds.clear();selectedStudentRows.clear();studentBulkProgress=null;studentBulkResult=''}
function selectStudent(student,selected){
 if(!student)return;
 if(selected){selectedStudentIds.add(student.user_id);selectedStudentRows.set(student.user_id,student)}
 else{selectedStudentIds.delete(student.user_id);selectedStudentRows.delete(student.user_id)}
 studentBulkResult='';
}
function syncStudentSelectionHeader(){
 const control=$('#students-select-page');if(!control)return;
 const rows=studentRoster.students||[];
 const n=rows.filter(s=>selectedStudentIds.has(s.user_id)).length;
 control.checked=rows.length>0&&n===rows.length;
 control.indeterminate=n>0&&n<rows.length;
}
function studentSelectionToolbar(total){
 const count=selectedStudentIds.size;
 const progress=studentBulkProgress?'<p class="student-bulk-progress" role="status">Processing '+E(studentBulkProgress.label)+' — '+studentBulkProgress.done+' of '+studentBulkProgress.total+' completed</p>':'';
 const result=studentBulkResult?'<p class="student-bulk-result" role="status">'+E(studentBulkResult)+'</p>':'';
 const options=Object.entries(studentBulkActions).map(([key,label])=>'<option value="'+key+'">'+E(label)+'</option>').join('');
 return '<section class="student-selection-bar" aria-label="Select and manage multiple students">'+
 '<div class="student-selection-summary"><strong>'+count+' selected</strong><span>Select individual students, the current page, or every matching student across pages.</span></div>'+
 '<div class="student-selection-controls">'+
 '<button class="btn small outline" data-action="student-select-matching" '+(!total||studentBulkProgress?'disabled':'')+'>Select all '+total+' matching</button>'+
 '<button class="btn small outline" data-action="student-clear-selection" '+(!count||studentBulkProgress?'disabled':'')+'>Clear selection</button>'+
 '<label class="student-bulk-label">Bulk action <select id="student-bulk-action" '+(!count||studentBulkProgress?'disabled':'')+'><option value="">Choose an action…</option>'+options+'</select></label>'+
 '<button class="btn small primary" data-action="student-bulk-apply" '+(!count||studentBulkProgress?'disabled':'')+'>Apply to '+count+'</button></div>'+progress+result+'</section>';
}
async function selectAllMatchingStudents(){
 if(!isAdmin())throw Error('Administrator access required');
 const count=Number(studentRoster.count)||0;if(!count)return;
 if(count>500)throw Error('Select all matching supports up to 500 students at once. Narrow the search or filter first.');
 const pageSize=studentRoster.page_size||30,pages=Math.ceil(count/pageSize),collected=[];
 for(let start=0;start<pages;start+=3){
  const indices=Array.from({length:Math.min(3,pages-start)},(_,i)=>start+i);
  const responses=await Promise.all(indices.map(page=>api.request('/functions/v1/academy-admin-students',{method:'POST',body:{action:'list',offering_id:data.offeringId,search:studentSearch,status:studentFilter,page}})));
  for(const response of responses){
   if(Number(response.count)!==count)throw Error('Student directory changed during selection. Refresh the list and try again.');
   collected.push(...(response.students||[]));
  }
 }
 if(collected.length!==count)throw Error('Not all matching students were loaded. Refresh the list and try again.');
 for(const student of collected)selectStudent(student,true);
 render();
 notice('Selected all '+count+' matching students across '+pages+' page'+(pages===1?'':'s'));
}
function studentEligibleFor(action,student){
 if(action==='enroll')return !student.account_disabled&&student.enrollment_status!=='active';
 if(action==='withdraw')return student.enrollment_status==='active';
 if(action==='suspend')return !student.account_disabled;
 if(action==='restore')return !!student.account_disabled;
 return action==='delete';
}
async function applyStudentBulkAction(action){
 if(!isAdmin()||!Object.hasOwn(studentBulkActions,action))throw Error('Choose a bulk action first');
 const selected=[...selectedStudentIds].map(id=>selectedStudentRows.get(id)).filter(Boolean);
 if(!selected.length)throw Error('Select at least one student');
 const eligible=selected.filter(s=>studentEligibleFor(action,s));
 const skipped=selected.length-eligible.length;
 if(!eligible.length)throw Error('No selected students are eligible for this action');
 const label=studentBulkActions[action],count=eligible.length;
 const suffix=skipped?' ('+skipped+' ineligible selection'+(skipped===1?'':'s')+' will be skipped)':'';
 if(action==='delete'){
  const phrase='DELETE '+count+' STUDENTS';
  const typed=prompt('PERMANENT DELETION: '+count+' student account'+(count===1?'':'s')+' and all associated learning records will be removed. This cannot be undone.\n\nType exactly '+phrase+' to continue:');
  if(typed!==phrase){if(typed!==null)notice('Confirmation did not match; no students were deleted');return}
  if(!confirm('Final confirmation: permanently delete '+count+' student account'+(count===1?'':'s')+' and their learning records?'))return;
 }else{
  const detail=action==='withdraw'?'Their accounts and learning history will be kept.':action==='suspend'?'These students will lose Academy access until restored.':'';
  if(!confirm(label+' for '+count+' selected student'+(count===1?'':'s')+'?'+suffix+(detail?'\n'+detail:'')))return;
 }
 studentBulkResult='';
 studentBulkProgress={label,done:0,total:count};
 render();
 const failures=[];
 for(let start=0;start<count;start+=3){
  const batch=eligible.slice(start,start+3);
  const results=await Promise.allSettled(batch.map(student=>api.request('/functions/v1/academy-admin-students',{method:'POST',body:{action,student_id:student.user_id,offering_id:data.offeringId,...(action==='delete'?{confirmation:student.registration_no}:{})}})));
  results.forEach((r,i)=>{
   const student=batch[i];
   if(r.status==='fulfilled'){selectedStudentIds.delete(student.user_id);selectedStudentRows.delete(student.user_id)}
   else failures.push((student.display_name||student.registration_no||student.user_id)+': '+(r.reason?.message||'Request failed'));
  });
  studentBulkProgress.done=Math.min(start+batch.length,count);
  render();
 }
 studentBulkProgress=null;
 studentBulkResult=(count-failures.length)+' succeeded, '+failures.length+' failed'+(skipped?', '+skipped+' skipped':'')+'.'+(failures.length?' Failed: '+failures.slice(0,3).join('; ')+(failures.length>3?' (and '+(failures.length-3)+' more)':''):'');
 await loadStudentRoster();
 const maxPage=Math.max(0,Math.ceil((studentRoster.count||0)/(studentRoster.page_size||30))-1);
 if(studentRoster.page>maxPage){studentRoster.page=maxPage;await loadStudentRoster()}
 render();
 notice(failures.length?'Bulk action finished with '+failures.length+' errors':count+' student'+(count===1?'':'s')+' updated');
}


const workspaceKey='g2r2-academy-workspace-v1';
const workspacePages=new Set(['courses','dashboard','admin','students','faculty','records','lessons','manual','lab','classroom','practice','requests','revisions','reports','settings']);
let pendingWorkspaceScroll=null;
// Per-tab workspace state: never store credentials, server answers, or account data.
function storeWorkspace(){
 // Persist on navigation, not just pagehide: installed PWAs can terminate without pagehide.

 if(demoMode||!api?.userId||!data||!workspacePages.has(state.page))return;
 try{
  const snapshot={
   userId:api.userId,offeringId:data.offeringId,page:state.page,courseEntered:state.courseEntered,
   unit:state.unit,hour:state.hour,manualUnit:state.manualUnit,manualTopic:state.manualTopic,
   labNo:state.labNo,labTab:state.labTab,sessionLesson:state.sessionLesson,
   selectedActivity:state.selectedActivity,selectedLessons:state.selectedLessons,
   manualAnswers:state.manualAnswers,choice:state.choice,ordering:state.ordering,
   draftReleaseId:selectedRelease()?.id||null,
   scrollY:pendingWorkspaceScroll??window.scrollY
  };
  sessionStorage.setItem(workspaceKey,JSON.stringify(snapshot));
  const route='#/'+encodeURIComponent(state.page)+(state.courseEntered?'?course='+encodeURIComponent(data.offeringId||''):'');
  if(location.hash!==route)history.replaceState(null,'',location.pathname+location.search+route);
 }catch(err){console.warn('Could not save workspace position',err)}
}
function restoreWorkspace(){
 // A browser refresh resumes the current tab; a fresh sign-in still starts at My Courses.
 state.page='courses';
 state.courseEntered=false;
 pendingWorkspaceScroll=null;
 if(demoMode||!api?.userId)return;
 try{
  const saved=JSON.parse(sessionStorage.getItem(workspaceKey)||'null');
  const route=location.hash.match(/^#\/([a-z]+)(?:\?course=([^&]+))?/);
  if(!saved||saved.userId!==api.userId||!workspacePages.has(saved.page)){
   // URL-based fallback when browser/PWA session storage was discarded.
   if(route&&workspacePages.has(route[1])&&route[2]&&route[1]!=='courses'){
    state.page=route[1];state.courseEntered=true;
    state.restoredOfferingId=decodeURIComponent(route[2]);
    localStorage.setItem('g2r2-offering',state.restoredOfferingId);
   }
   return;
  }
  // The URL route survives a browser reload even when a PWA loses its pagehide event.
  if(route&&workspacePages.has(route[1])&&route[1]!=='courses'&&route[2]===saved.offeringId){saved.page=route[1];saved.courseEntered=true;}
  state.page=saved.page;
  state.courseEntered=!!saved.courseEntered&&saved.page!=='courses';
  for(const key of ['unit','hour','manualUnit','manualTopic','labNo','labTab','sessionLesson','selectedActivity','selectedLessons','manualAnswers','choice','ordering','draftReleaseId']){
   if(Object.prototype.hasOwnProperty.call(saved,key))state[key]=saved[key];
  }
  if(saved.offeringId){state.restoredOfferingId=saved.offeringId;localStorage.setItem('g2r2-offering',saved.offeringId);}
  pendingWorkspaceScroll=Number.isFinite(saved.scrollY)&&saved.scrollY>=0?saved.scrollY:null;
 }catch(err){console.warn('Could not restore workspace',err)}
}
function finishWorkspaceRestore(){
 if(pendingWorkspaceScroll===null)return;
 const y=pendingWorkspaceScroll;
 pendingWorkspaceScroll=null;
 requestAnimationFrame(()=>{window.scrollTo(0,y);storeWorkspace()});
}
function clearWorkspace(){
 try{sessionStorage.removeItem(workspaceKey)}catch{}
 history.replaceState(null,'',location.pathname+location.search+'#/courses');
 pendingWorkspaceScroll=null;
 state.page='courses';state.courseEntered=false;state.manualTopic=null;state.labNo=0;state.selectedActivity=null;
 state.choice=null;state.ordering=[];state.draftReleaseId=null;state.offeringId=null;
}
window.addEventListener('pagehide',storeWorkspace);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')storeWorkspace()});
// Only repaint live screens when server data actually changed, not every polling tick.
function liveFingerprint(d){
 if(!d)return '';
 return JSON.stringify({
  offeringId:d.offeringId,courseAlerts:d.courseAlerts,sessions:d.sessions,attendance:d.attendance,
  releases:d.releases,attempts:d.attempts,activities:d.activities,
  unlocks:d.unlocks,grants:d.grants,labUnlocks:d.labUnlocks,
  labCompletions:d.labCompletions,requests:d.requests,revisions:d.revisions,
  enrollments:d.enrollments
 });
}

const material=l=>data?.materials?.find(m=>m.lesson_id===l?.id)?.content||null;
const offered=()=>data?.offerings?.find(o=>o.id===data.offeringId);
const currentCourse=()=>data?.courses?.find(c=>c.id===offered()?.course_id);
const liveSession=()=>data?.sessions?.find(s=>s.status==='live');
const myAttendance=sid=>data?.attendance?.some(a=>a.session_id===sid&&a.student_id===data.me.user_id);
const topicIsUnlocked=l=>isFaculty()||data?.unlocks?.some(x=>x.lesson_id===l?.id&&!x.revoked_at)||data?.grants?.some(g=>g.lesson_id===l?.id&&g.student_id===data.me.user_id&&!g.revoked_at&&(!g.expires_at||new Date(g.expires_at)>new Date()));
const getActivityForLesson=l=>data?.activities?.filter(a=>a.lesson_id===l?.id&&a.approved!==false)||[];
const displayRole=()=>isAdmin()?'Administrator':isFaculty()?'Faculty':'Student';
const activeRelease=()=>{let s=liveSession();return s?data?.releases?.find(r=>r.session_id===s.id&&!r.revealed_at)||data?.releases?.find(r=>r.session_id===s.id):null};
const selectedRelease=()=>data?.releases?.find(r=>r.id===state.selectedActivity)||activeRelease();
const rowName=id=>data?.profiles?.find(p=>p.user_id===id)?.display_name||data?.me?.display_name||'Student';
const isoNow=()=>new Date().toISOString();
const canAccess=()=>Boolean(data?.offeringId);
const visibleLabs=()=>data?.labs||[];
const labUnlocked=lab=>isFaculty()||data?.labUnlocks?.some(x=>x.lab_id===lab.id&&!x.revoked_at);
const isLabDone=lab=>data?.labCompletions?.some(x=>x.lab_id===lab.id&&x.student_id===data.me.user_id&&x.completed);
const labByNo=no=>visibleLabs().find(x=>Number(x.experiment_no)===Number(no));

async function checkPlatform(){
 if(demoMode)return platformStatus;
 try{platformStatus=await api.rpc('academy_platform_status',{});return platformStatus}
 catch(err){console.warn('Academy status unavailable',err);return platformStatus}
}
function maintenanceScreen(){root.innerHTML=`<section class="auth"><img alt="g2r2 Academy" class="auth-logo" src="./assets/academy-logo.webp"><div class="card"><span class="eyebrow">DEVELOPMENT MODE</span><h1>We're making Academy better.</h1><p>${E(platformStatus.message)}</p><p class="hint">Your learning records are safe. Please check back later.</p><button class="btn outline" data-action="maintenance-refresh">Check again</button>${api?.session?'<button class="btn outline" data-action="logout">Sign out</button>':''}</div></section>`}
async function init(){
  try{
    if(window.ACADEMY_GITHUB_PAGES && demoMode){
      root.innerHTML=`<section class="auth"><img class="auth-logo" src="./assets/academy-logo.webp" alt="g2r2 Academy"><h1>g2r2 Academy</h1><p class="sub">Programming Smart Devices · MCA Semester II</p><div class="card"><h2>Academy setup in progress</h2><p>The website is published, but its dedicated Supabase connection has not yet been configured.</p><p>The faculty will enable student sign-in when setup is complete.</p></div><p class="venture">a g2r2 venture</p></section>`;
      return;
    }
    if(!demoMode&&api.session)restoreWorkspace();
    if(demoMode){rawLabs=window.ACADEMY_DEMO_LABS||[];rawLessons=await fetch('./content/lessons.json').then(r=>{if(!r.ok)throw Error('Course content unavailable');return r.json()});
      try{demo=JSON.parse(localStorage.getItem(demoKey)||'null')}catch{}
      if(!demo) demo={role:'faculty',labsUnlocked:[1,2],labDone:[],unlocks:[1,2],session:null,attendance:[],releases:[],attempts:[],requests:[],grants:[],revisions:[],notes:{},enrolled:[{id:'student-demo',display_name:'Demo Student',registration_no:'MCA26001'},{id:'student-2',display_name:'Asha',registration_no:'MCA26002'}],registered:true};
      demo.labsUnlocked??=[1,2];demo.labDone??=[];await refresh();
    }else if(api.session){await checkPlatform();if(platformStatus.account_disabled){root.innerHTML='<section class="auth"><div class="card"><h2>Account suspended</h2><p>Contact your Academy administrator to restore access.</p><button class="btn outline" data-action="logout">Sign out</button></div></section>'}else if(platformStatus.maintenance_enabled&&!platformStatus.is_admin)maintenanceScreen();else{await claimDevice();await refresh();if(state.page==='students'&&isAdmin()){await loadStudentRoster();render()}if(state.page==='faculty'&&isAdmin()){await loadFacultyData();render()}finishWorkspaceRestore()}}else{await checkPlatform();render()};
    if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
    if(!demoMode)setInterval(async()=>{const before=platformStatus.maintenance_enabled,wasDisabled=platformStatus.account_disabled;await checkPlatform();if(before!==platformStatus.maintenance_enabled||wasDisabled!==platformStatus.account_disabled){if(api.session&&platformStatus.account_disabled){render()}else if(api.session&&platformStatus.maintenance_enabled&&!platformStatus.is_admin)maintenanceScreen();else if(api.session){try{await refresh()}catch(e){notice(e.message)}}else render()}},30000);
    let pollingInFlight=false;
    let lastWorkspaceRefresh=0;
    timer=setInterval(async()=>{
      if(pollingInFlight||document.hidden||demoMode||!api.session||state.busy||state.modal||!data?.offerings)return;
      if(!['classroom','reports','requests','dashboard','courses'].includes(state.page))return;
      pollingInFlight=true;
      try{
        // Poll lightweight course status first. The full workspace is only reloaded
        // when live classroom state changes or when its periodic refresh is due.
        const previous=data.courseAlerts||[];
        const next=await api.loadCourseAlerts(data.offerings);
        const changed=JSON.stringify(next)!==JSON.stringify(previous);
        const currentBefore=previous.find(a=>a.offeringId===data.offeringId);
        const currentAfter=next.find(a=>a.offeringId===data.offeringId);
        const currentChanged=JSON.stringify(currentBefore)!==JSON.stringify(currentAfter);
        data.courseAlerts=next;
        if(state.page==='courses'){
          if(changed)render();
        }else{
          const now=Date.now();
          const due=now-lastWorkspaceRefresh>=30000;
          if(state.page==='classroom'||currentChanged||due){
            await refresh(false);
            lastWorkspaceRefresh=Date.now();
          }else if(changed)render();
        }
      }catch(error){console.warn('Academy status refresh failed',error)}
      finally{pollingInFlight=false}
    },9500);
  }catch(e){root.innerHTML='<div class="auth"><div class="card"><h2>Academy needs a web server</h2><p>'+E(e.message)+'</p><p>Run <code>python -m http.server 8080</code> in the unzipped project folder, then open <code>http://localhost:8080</code>.</p></div></div>'}
}
function saveDemo(){localStorage.setItem(demoKey,JSON.stringify(demo))}
function demoData(){const courseId='course-demo',offeringId='offering-demo';
 const lessons=rawLessons.map(l=>({id:'lesson-'+l.hour,course_id:courseId,teaching_hour:l.hour,unit_no:l.unit,title:l.title,chapters:l.chapters}));
 const materials=rawLessons.map(l=>({lesson_id:'lesson-'+l.hour,content:l,published:true}));
 const unlocks=demo.unlocks.map(h=>({lesson_id:'lesson-'+h,offering_id:offeringId,revoked_at:null}));
 const activities=rawLessons.map(l=>({id:'act-'+l.hour,lesson_id:'lesson-'+l.hour,kind:'quick_check',prompt:l.question,options:l.options,explanation:l.rationale,correct:l.correct_index}));
 if(demo.session)for(const l of [3,18,28,44,53])if(demo.session.lesson_id==='lesson-'+l){
  const lines={3:['  print("Hello, Dart!");','}','void main() {','  final year = 2026;'],18:['    return const Text("Hi");','  @override','}', '  Widget build(BuildContext context) {','class Welcome extends StatelessWidget {','  const Welcome({super.key});','  }'],28:['  children: [const Text("Name"), const Icon(Icons.star)],','Row(',')'],44:['  Navigator.pop(context);','onPressed: () {','}'],53:['    email: email, password: password,','await FirebaseAuth.instance.signInWithEmailAndPassword(',');']}[l];
  const answers={3:[2,3,0,1],18:[4,5,1,3,0,6,2],28:[1,0,2],44:[1,0,2],53:[1,0,2]};
  activities.push({id:'arr-'+l,lesson_id:'lesson-'+l,kind:'arrange_code',prompt:'Arrange the code fragments into the correct order.',options:lines,correct:answers[l],explanation:'Begin with the declaration, then write the statement body and close braces.'});
 }
 const allLabs=rawLabs.map(l=>({...l,id:'lab-'+l.number,course_id:courseId,experiment_no:l.number}));
 const labs=allLabs.filter(l=>demo.role==='faculty'||demo.labsUnlocked.includes(l.number));
 const labUnlocks=demo.labsUnlocked.map(n=>({offering_id:offeringId,lab_id:'lab-'+n,revoked_at:null}));
 const labCompletions=demo.labDone.filter(n=>demo.role==='faculty'||demo.labsUnlocked.includes(n)).map(n=>({offering_id:offeringId,lab_id:'lab-'+n,student_id:'student-demo',completed:true,completed_at:isoNow()}));
 const me=demo.role==='faculty'?{user_id:'faculty-demo',display_name:'Faculty Demo',account_role:'faculty',email:'faculty@example.test'}:{user_id:'student-demo',display_name:'Demo Student',account_role:'student',email:'student@example.test',registration_no:'MCA26001'};
 const visibleIds=new Set(lessons.filter(l=>demo.role==='faculty'||unlocks.some(u=>u.lesson_id===l.id&&!u.revoked_at)||demo.grants.some(g=>g.lesson_id===l.id&&g.student_id==='student-demo'&&!g.revoked_at&&(!g.expires_at||new Date(g.expires_at)>new Date()))).map(l=>l.id));
 return {labs,labUnlocks,labCompletions,me,offerings:[{id:offeringId,course_id:courseId,batch:'MCA Semester II',academic_year:'2026-27',semester:'II'}],courses:[{id:courseId,code:'25PCA2CC04',title:'Programming Smart Devices'}],offeringId,lessons:lessons.filter(l=>visibleIds.has(l.id)),materials:materials.filter(m=>visibleIds.has(m.lesson_id)),unlocks,
 sessions:demo.session?[demo.session]:[],attendance:demo.attendance,activities,releases:demo.releases,attempts:demo.attempts,
 requests:demo.requests,grants:demo.grants,revisions:demo.revisions,enrollments:demo.enrolled.map(e=>({student_id:e.id,offering_id:offeringId,status:'active'})),profiles:[me,...demo.enrolled.map(x=>({...x,user_id:x.id}))],
 notes:Object.entries(demo.notes).map(([h,n])=>({lesson_id:'lesson-'+h,student_id:'student-demo',note_text:n})),devices:[{device_id:'demo',label:'Current demo browser'}]};
}
async function claimDevice(){const valid=await api.rpc('academy_claim_device',{p_device:deviceId(),p_label:navigator.platform||'Browser'});state.deviceBlocked=valid===false;return valid}
async function refresh(paint=true){
 const previousFingerprint=paint?null:liveFingerprint(data);
 const previousScroll=paint?null:window.scrollY;
 if(demoMode){data=demoData()}else{await checkPlatform();if(platformStatus.account_disabled)throw Error('Your Academy account has been suspended. Contact the administrator.');if(platformStatus.maintenance_enabled&&!platformStatus.is_admin){maintenanceScreen();return}data=await api.load({coursesOnly:state.page==='courses'})}
 if(state.offeringId&&state.offeringId!==data.offeringId){
  state.hour=1;state.unit=1;state.manualUnit=1;state.manualTopic=null;state.labNo=0;
  state.sessionLesson=null;state.selectedActivity=null;state.choice=null;state.ordering=[];state.draftReleaseId=null;
 }
 state.offeringId=data.offeringId;
 // Never restore a course page if its enrollment or assignment is no longer available.
 if(state.page!=='courses'&&((state.restoredOfferingId&&state.restoredOfferingId!==data.offeringId)||(!isFaculty()&&(!state.courseEntered||!data.offerings.some(o=>o.id===data.offeringId))))){state.page='courses';state.courseEntered=false;pendingWorkspaceScroll=null;}
 state.restoredOfferingId=null;
 if(['admin','students','faculty'].includes(state.page)&&!isAdmin())state.page='courses';
 if(!isFaculty()&&!state.courseEntered&&!['courses','settings'].includes(state.page))state.page='courses';
 if(state.hour&&!getLesson(state.hour))state.hour=accessibleLessons()[0]?.teaching_hour||1;
 if(!isFaculty()){state.selectedLessons=[];state.topicsOpen=false;}
 if(!accessibleLessons().some(l=>l.unit_no===state.unit))state.unit=accessibleLessons()[0]?.unit_no||1;
 if(state.labNo&&!labByNo(state.labNo))state.labNo=0;
 if(!state.sessionLesson||!data.lessons.some(l=>l.id===state.sessionLesson))state.sessionLesson=currentLesson()?.id||null;
 if(state.selectedActivity&&!data.releases.some(r=>r.id===state.selectedActivity&&r.session_id===liveSession()?.id))state.selectedActivity=null;
 const releaseId=selectedRelease()?.id||null;
 if(state.draftReleaseId!==releaseId){state.choice=null;state.ordering=[];}
 state.draftReleaseId=releaseId;
 if(!demoMode)await loadRevealedAnswer();
 if(paint)render();
 else if(['classroom','reports','requests','dashboard','courses'].includes(state.page)&&previousFingerprint!==liveFingerprint(data)){
  render();window.scrollTo(0,previousScroll);storeWorkspace();
 }
}
function render(){
 if(!demoMode&&!api.session){renderAuth();return}
 if(!demoMode&&platformStatus.account_disabled){root.innerHTML='<section class="auth"><div class="card"><h2>Account suspended</h2><p>Contact your Academy administrator.</p><button class="btn outline" data-action="logout">Sign out</button></div></section>';return}
 if(!demoMode&&platformStatus.maintenance_enabled&&!platformStatus.is_admin){maintenanceScreen();return}
 if(demoMode&&state.demoGate){renderPreviewLogin();return}
 if(!data){root.innerHTML='<main class="boot"><div class="spinner"></div>Loading…</main>';return}
 const choosingCourse=!isFaculty()&&!state.courseEntered;
 const visibleNav=choosingCourse?['courses','settings']:isAdmin()?['courses','dashboard','admin','students','faculty','records','lessons','manual','lab','classroom','practice','requests','revisions','reports','settings']:isFaculty()?['courses','dashboard','records','lessons','manual','lab','classroom','practice','requests','revisions','reports','settings']:['courses','dashboard','lessons','manual','lab','classroom','practice','requests','revisions','reports','settings'];
 const navNames=isAdmin()?{courses:'My Courses',faculty:'Faculty & courses',records:'Class records',students:'Students',admin:'Administration',dashboard:'Dashboard',lessons:'Course notes',manual:'Study Manual',lab:'Lab Record Studio',classroom:'Classroom',practice:'Practice',requests:'Requests',revisions:'Revision',reports:'Reports',settings:'Settings'}:isFaculty()?{courses:'My Courses',records:'Class records',dashboard:'Dashboard',lessons:'Course notes',manual:'Study Manual',lab:'Lab Record Studio',classroom:'Classroom',practice:'Practice',requests:'Requests',revisions:'Revision',reports:'Reports',settings:'Settings'}:{courses:'My Courses',dashboard:'My desk',lessons:'Study notes',manual:'Study Manual',lab:'Lab Record Studio',classroom:'Live class',practice:'Practice',requests:'Ask faculty',revisions:'Revision',reports:'My record',settings:'My account'};
 const menu=visibleNav.map(page=>{const emoji=page==='courses'?icons.dashboard:page==='students'?icons.requests:page==='admin'||page==='faculty'?icons.settings:page==='records'?icons.reports:icons[page];const label=navNames[page];return `<button data-page="${page}" title="${label}" aria-label="${label}" class="${state.page===page?'active':''}" ${state.page===page?'aria-current="page"':''}><span class="emoji">${emoji}</span><span class="nav-label">${label}</span></button>`}).join('');
 const switcher=demoMode?`<button class="btn small outline" data-action="switch-role">${isFaculty()?'Student preview':'Faculty preview'}</button>`:'';
 const head=`<div class="brandline"><button class="btn small outline mobile-menu" data-action="toggle-menu" aria-label="${state.smallMenu?'Close navigation menu':'Open navigation menu'}" aria-controls="academy-sidebar" aria-expanded="${state.smallMenu}" title="Menu">☰</button><div><strong>${choosingCourse?'g2r2 Academy':E(data.courses.find(c=>c.id===data.offerings.find(o=>o.id===data.offeringId)?.course_id)?.title||cfg.title||'g2r2 Academy')}</strong><small>${choosingCourse?'My Courses':`${E(data.courses.find(c=>c.id===data.offerings.find(o=>o.id===data.offeringId)?.course_id)?.code||'Academy')} · ${E(data.offerings.find(o=>o.id===data.offeringId)?.batch||'Class')}`}</small></div></div><div class="actions">${!choosingCourse?'<button class="btn small outline course-home-button" data-page="courses">My Courses</button>':''}${!isFaculty()&&courseAlertCount(data)?`<button class="btn small outline course-bell" data-page="courses" aria-label="${courseAlertCount(data)} course alerts">🔔 <span class="course-bell-count">${courseAlertCount(data)}</span></button>`:''}${!choosingCourse&&data.offerings.length>1?`<select id="offering-select" aria-label="Choose class">${data.offerings.map(o=>`<option value="${o.id}" ${data.offeringId===o.id?'selected':''}>${A(data.courses.find(c=>c.id===o.course_id)?.code||'Course',20)} · ${A(o.batch,25)}</option>`).join('')}</select>`:''}${!isFaculty()&&!choosingCourse?'<button class="btn small primary" data-page="lab">Lab practicals →</button>':''}${switcher}<span class="tiny">${E(data.me.display_name)}</span><span class="badge">${displayRole()}</span></div>`;
 let page='';if(state.deviceBlocked)page=deviceLimit();else if(state.page==='courses')page=myCoursesPage(data,isFaculty());else if(!canAccess())page=unassigned();else{
  page=state.page==='faculty'&&isAdmin()?renderFacultyPage({facultyData,title,E}):state.page==='records'&&isFaculty()?renderRecordsPage({data,title,E,isAdmin}):state.page==='students'&&isAdmin()?studentsPage():state.page==='admin'&&isAdmin()?adminPage():state.page==='dashboard'?(isFaculty()?renderFacultyDashboard({isSmartDevices,title,activeCourse,data,liveSession,topicIsUnlocked,currentLesson,isFaculty,E,unitNames,A,resourceCards}):renderStudentDashboard({isSmartDevices,title,activeCourse,data,liveSession,accessibleLessons,visibleLabs,E,resourceCards})):state.page==='lessons'?lessonsPage():state.page==='manual'?manualPage():state.page==='lab'?labPage():state.page==='classroom'?classroom():state.page==='practice'?practice():state.page==='requests'?requests():state.page==='revisions'?revisions():state.page==='reports'?reports():settings();
 }
 root.innerHTML=(!demoMode&&platformStatus.maintenance_enabled&&isAdmin()?'<div class="preview-banner">Development Mode is ON — student and faculty access is temporarily paused.</div>':'')+(demoMode?'<div class="preview-banner">Interactive demo only — simulated class data. No real student account, attendance or grades are stored on a server.</div>':'')+`<div class="layout ${state.sidebarCollapsed?'sidebar-collapsed':''}"><button type="button" class="sidebar-scrim ${state.smallMenu?'visible':''}" data-action="close-menu" aria-label="Close navigation"></button><aside id="academy-sidebar" class="sidebar ${state.smallMenu?'open':''}" aria-label="Main navigation"><div class="side-top"><div class="side-logo"><img alt="g2r2 Academy" src="./assets/academy-logo.webp"></div><button type="button" class="sidebar-toggle-desktop" data-action="toggle-sidebar" aria-label="${state.sidebarCollapsed?'Expand sidebar':'Collapse sidebar'}" aria-expanded="${!state.sidebarCollapsed}" aria-controls="academy-sidebar" title="${state.sidebarCollapsed?'Expand sidebar':'Collapse sidebar'}">${state.sidebarCollapsed?'→':'←'}</button><button type="button" class="sidebar-close-mobile" data-action="close-menu" aria-label="Close navigation menu" title="Close menu">✕</button></div><div class="side-group">WORKSPACE</div><nav class="nav">${menu}</nav><div class="side-bottom"><div class="side-account">${E(data.me.display_name)}<br><small>${E(data.me.registration_no||data.me.email)}</small></div><strong>a g2r2 venture</strong></div></aside><div class="shell"><header class="topbar">${head}</header><main class="page">${page}</main><footer class="footer">Made for curious minds · a g2r2 venture</footer></div></div><nav class="bottomnav">${(choosingCourse?['courses','settings']:['courses','manual','lab','classroom','settings']).map(p=>`<button data-page="${p}"><span>${icons[p]||icons.dashboard}</span>${p==='classroom'?'Class':p==='lab'?'Lab':p==='manual'?'Manual':p==='courses'?'Courses':p==='dashboard'?'Home':p[0].toUpperCase()+p.slice(1)}</button>`).join('')}</nav>`+(state.modal?renderModal(): '');
 if(state.page==='students'&&isAdmin())syncStudentSelectionHeader();
 storeWorkspace();
}
function renderPreviewLogin(){root.innerHTML=`<section class="academy-login"><div class="preview-banner">Offline interaction preview · no actual login or database connection</div><div class="login-container"><div class="login-identity"><img src="./assets/academy-logo.webp" alt="g2r2 Academy"><span class="eyebrow">MCA · SEMESTER II · 25PCA2CP03</span><h1>Make something brilliant.</h1><p>Welcome to g2r2 Academy. Study Dart and Flutter, and explore practical experiments in a focused learning space.</p><div class="login-art"><span>YOUR CLASSROOM. YOUR LAB.</span><strong>Build • Explore • Create</strong></div></div><div class="login-panel"><span class="eyebrow">ACADEMY ACCESS</span><h2>Welcome back.</h2><p>In the live Academy, students sign in using their registration number or verified email and password. Preview below without entering credentials.</p><div class="login-demo-fields"><label>Registration number / email<input aria-label="Registration number or email" value="" placeholder="e.g. MCA26001" disabled></label><label>Password<input aria-label="Password" type="password" placeholder="••••••••" disabled></label></div><button class="btn primary login-btn" data-action="preview-student">Explore student dashboard →</button><button class="btn outline login-btn" data-action="preview-faculty">Explore faculty dashboard →</button><p class="login-disclaimer">No credentials are collected in this offline demonstration.</p><span class="venture">a g2r2 venture</span></div></div></section>`}
function title(eyebrow,name,subtitle){return `<div class="eyebrow">${E(eyebrow)}</div><h1 class="page-title">${E(name)}</h1><p class="subtitle">${E(subtitle)}</p>`}
function unassigned(){return title('ACCOUNT READY','No class assigned yet',isFaculty()?'Your faculty account must be allocated to a course offering.':'Your account is verified, but a faculty member must enrol your registration number.')+`<div class="card"><p>Once assigned, your lessons and classroom companion will appear here.</p><button class="btn outline" data-action="logout">Sign out</button></div>`}
function deviceLimit(){return title('ACCOUNT ACCESS','Four-device limit reached','Your account already has four registered browsers. Remove an old browser before continuing.')+`<div class="card"><h3>Registered devices</h3>${data.devices.map(d=>`<div class="list-entry"><span>${A(d.label)} · ${day(d.last_seen)}</span><button class="btn small danger" data-action="remove-device" data-id="${E(d.device_id)}">Remove</button></div>`).join('')}<div class="buttons"><button data-action="claim-device" class="btn primary">Use this device</button><button data-action="logout" class="btn outline">Sign out</button></div></div>`}

function accessibleLessons(){return (data?.lessons||[]).filter(topicIsUnlocked)}
function lessonRows(){const q=state.filter.trim().toLowerCase(),terms=q.split(/\s+/).filter(Boolean);return accessibleLessons().filter(l=>!terms.length?l.unit_no===state.unit:terms.every(term=>[l.title,l.teaching_hour,l.unit_no,l.chapters,material(l)?.concept,material(l)?.nuance,material(l)?.summary,material(l)?.code,...Object.values(material(l)?.deep_notes||{})].join(' ').toLowerCase().includes(term)))}
function selectionCount(){return (state.selectedLessons||[]).filter(id=>data.lessons.some(l=>l.id===id)).length}
function indexEntry(t){const checked=(state.selectedLessons||[]).includes(t.id);return `<div class="index-entry">${isFaculty()?`<label class="lesson-pick" title="Select ${E(t.title)}"><input type="checkbox" data-select-lesson="${E(t.id)}" ${checked?'checked':''} aria-label="Select hour ${t.teaching_hour}"></label>`:''}<button data-action="lesson" data-hour="${t.teaching_hour}" class="${t.teaching_hour===state.hour?'active':''}"><span class="ok">${isFaculty()?(data.unlocks.some(u=>u.lesson_id===t.id&&!u.revoked_at)?'●':'○'):'●'}</span>Hour ${String(t.teaching_hour).padStart(2,'0')} · ${A(t.title,65)}</button></div>`}
function indexListHTML(){const rows=lessonRows();return rows.length?rows.map(indexEntry).join(''):'<p class="empty-index">No released topics in this unit. Choose another unit or wait for your teacher to release notes.</p>'}
function lessonSearchResults(){
 if(!state.filter.trim())return '';
 const rows=lessonRows();
 return `<div class="search-result-list" role="list">${rows.length?rows.map(l=>`<button type="button" role="listitem" data-action="lesson" data-hour="${l.teaching_hour}"><span>Hour ${String(l.teaching_hour).padStart(2,'0')} · Unit ${l.unit_no}</span><strong>${A(l.title,90)}</strong></button>`).join(''):'<div class="empty-index">No matching released topics</div>'}</div>`;
}
function lessonUnitTabs(){return unitNames.map((n,i)=>{const has=accessibleLessons().some(l=>l.unit_no===i+1);return !has?'':`<button class="btn small ${state.unit===i+1?'primary':'outline'}" data-action="unit" data-unit="${i+1}">Unit ${['I','II','III','IV','V'][i]}</button>`}).join('')}
function bulkControls(){if(!isFaculty())return '';const count=selectionCount(),all=data.lessons.length;const currentUnitCount=data.lessons.filter(l=>l.unit_no===state.unit).length;return `<section class="card access-manager" aria-label="Faculty release controls"><div class="access-head"><div><strong>Release notes to students</strong><p>Only released topics appear in a student's study reader or search.</p></div><span class="badge" id="selected-count">${count} selected</span></div><div class="buttons"><button class="btn small outline" data-action="select-visible">Select all results</button><button class="btn small outline" data-action="clear-selected">Clear selection</button><button class="btn small primary" data-action="bulk-unlock" data-scope="selected" data-unlock="true" ${!count?'disabled':''}>Unlock selected</button><button class="btn small outline" data-action="bulk-unlock" data-scope="selected" data-unlock="false" ${!count?'disabled':''}>Lock selected</button></div><div class="access-divider"></div><div class="buttons"><button class="btn small blue" data-action="bulk-unlock" data-scope="unit" data-unit="${state.unit}" data-unlock="true" ${!currentUnitCount?'disabled':''}>Unlock Unit ${['I','II','III','IV','V'][state.unit-1]}</button><button class="btn small outline" data-action="bulk-unlock" data-scope="unit" data-unit="${state.unit}" data-unlock="false" ${!currentUnitCount?'disabled':''}>Lock this unit</button><button class="btn small primary" data-action="bulk-unlock" data-scope="all" data-unlock="true" ${!all?'disabled':''}>Unlock all ${all}</button><button class="btn small outline" data-action="bulk-unlock" data-scope="all" data-unlock="false" ${!all?'disabled':''}>Lock all</button></div></section>`}
function lessonNeighbors(l){
 const available=accessibleLessons().slice().sort((a,b)=>a.teaching_hour-b.teaching_hour);
 const i=available.findIndex(x=>x.id===l.id);
 return {previous:i>0?available[i-1]:null,next:i>=0&&i<available.length-1?available[i+1]:null,index:i+1,total:available.length};
}
function lessonPager(l){
 const n=lessonNeighbors(l);
 return `<nav class="lesson-pager" aria-label="Study note pages"><button class="btn outline" data-action="lesson" data-hour="${n.previous?.teaching_hour||''}" ${n.previous?'':'disabled'}>← Previous lesson</button><span>Lesson ${n.index} of ${n.total} released<br><small>Hour ${l.teaching_hour} · Unit ${l.unit_no}</small></span><button class="btn primary" data-action="lesson" data-hour="${n.next?.teaching_hour||''}" ${n.next?'':'disabled'}>Next lesson →</button></nav>`;
}
function lessonsPage(){const available=accessibleLessons();const l=currentLesson();if(!available.length&&!isFaculty())return title('STUDY NOTES · DIGITAL MANUAL','Your notes will appear here','Your teacher has not released any lessons yet. Locked topics are completely hidden until they are made available.')+`<div class="card empty"><h3>No released topics yet</h3><p>You can send a general learning request from the Requests page.</p><button class="btn blue" data-page="requests">Ask your teacher</button></div>`;
if(!l)return title('STUDY NOTES','No lessons available','A faculty member has not prepared this course yet.');
const body=material(l),unlocked=topicIsUnlocked(l),hasNote=!!body&&unlocked;
return title('STUDY NOTES · DIGITAL MANUAL','Learn by unit','Read one lesson at a time, follow the example and continue with Next lesson.')+
 `<div class="study-shortcuts"><button class="btn primary" data-page="manual">Open complete Study Manual →</button><button class="btn blue" data-page="lab">Lab Record Studio →</button><button class="btn outline" data-page="dashboard">My dashboard</button></div>`+
 `<div class="toolbar"><div class="buttons">${lessonUnitTabs()}</div><div class="study-find"><label class="field">Find a topic<input data-filter="lessons" placeholder="Search released notes and examples…" autocomplete="off" value="${E(state.filter)}"></label><div id="lesson-search-results" class="search-result-panel">${lessonSearchResults()}</div></div></div>`+
 bulkControls()+
 `<div class="note-grid"><button class="topic-float" data-action="toggle-topics" aria-controls="lesson-topics" aria-expanded="${state.topicsOpen?'true':'false'}" aria-label="${state.topicsOpen?'Close topics':'Open topics'}">${icons.lessons} <span>Topics</span></button><div class="topics-scrim ${state.topicsOpen?'visible':''}" data-action="close-topics" aria-hidden="true"></div><aside id="lesson-topics" class="card index topics-drawer ${state.topicsOpen?'open':''}" aria-label="Topic navigation"><div class="index-heading"><div class="row"><strong>Browse lessons</strong><button class="btn small outline drawer-x" data-action="close-topics" aria-label="Close topics">✕</button></div><p class="hint" id="lesson-match-count">${state.filter?`Search results · ${lessonRows().length} topics`:`Unit ${['I','II','III','IV','V'][state.unit-1]} · ${lessonRows().length} topics`}</p></div><div id="lesson-index-items">${indexListHTML()}</div></aside>
 <article class="card reader"><div class="row wrap"><span class="eyebrow">UNIT ${['I','II','III','IV','V'][l.unit_no-1]} · HOUR ${l.teaching_hour}</span><span class="badge">${isFaculty()?(data.unlocks.some(u=>u.lesson_id===l.id&&!u.revoked_at)?'Released to class':'Faculty preview'):'Available'}</span></div><h2>${E(l.title)}</h2><p class="hint">Reference chapter(s): ${E(l.chapters)}</p>${lessonPager(l)}
 ${isFaculty()?`<div class="buttons"><button class="btn ${data.unlocks.some(u=>u.lesson_id===l.id&&!u.revoked_at)?'outline':'primary'} small" data-action="toggle-unlock" data-id="${l.id}">${data.unlocks.some(u=>u.lesson_id===l.id&&!u.revoked_at)?'Lock for class':'Unlock for class'}</button><button class="btn outline small" data-action="edit-note" data-id="${l.id}">Edit lesson</button></div>`:''}
 ${hasNote?`<button class="btn blue small" data-action="open-manual-for-lesson" data-hour="${l.teaching_hour}">Read this topic in the Study Manual →</button>`+renderStudyBody(l,body):`<div class="empty"><h3>${unlocked?'Lesson material is being prepared':'This lesson is not unlocked yet'}</h3><p>${isFaculty()?'You can publish and edit the material from this page.':'Your teacher can release these notes after class.'}</p></div>`}${lessonPager(l)}</article></div>`}
function renderStudyBody(l,b){const points=b.key_points||[], mistakes=b.common_mistakes||[], qs=b.revision_questions||[],n=data.notes.find(x=>x.lesson_id===l.id)?.note_text||'';
 return `<div class="tip"><strong>What you will learn</strong><p>${E(b.concept)}</p></div><h3>How it works</h3><p>${E(b.nuance||b.summary||'')}</p>
 <h3>Complete teaching notes</h3>${Object.entries(b.deep_notes||{}).filter(([heading])=>heading!=='Try it yourself').map(([heading,body])=>`<section class="deep-note"><h4>${E(heading)}</h4><p>${E(body)}</p></section>`).join('')}
 <h3>Syntax and annotated example</h3><pre><code>${E(b.code||'// Example will be added by faculty')}</code></pre><div class="buttons"><button class="btn outline small" data-action="copy-code" data-id="${l.id}">Copy code</button></div>
 <h3>Expected result</h3><div class="reader-output">${E(b.output||'Observe the output when you run the example.')}</div>
 <h3>Important points</h3><ul>${points.map(x=>`<li>${E(x)}</li>`).join('')||'<li>Try the example and explain the result.</li>'}</ul>
 <h3>Common mistakes</h3><div class="mistake"><ul>${mistakes.map(x=>`<li>${E(x)}</li>`).join('')||'<li>Remember required imports, types, and syntax.</li>'}</ul></div>
 <h3>Try it in class</h3><p>${E(b.activity||'Change a value, predict the behavior, and test your prediction.')}</p>
 <details><summary>Examination questions and revision</summary><ol>${qs.map(x=>`<li>${E(x)}</li>`).join('')}</ol></details>
 ${!isFaculty()?`<h3>My learning notebook</h3><label class="field">Your notes for this hour<textarea id="personal-note" placeholder="Write your own explanation…">${E(n)}</textarea></label><button class="btn blue" data-action="save-note" data-id="${l.id}">Save notes</button>`:''}`}
// The full manual is stored WITH each lesson's RLS-protected material, never as a public HTML file.
function resourceCards(){return `<div class="section-title"><h2>Course library</h2><span class="hint">Study and practise at your pace</span></div><div class="resource-grid"><button class="resource-tile" data-page="manual"><span class="resource-icon">${icons.manual}</span><span class="eyebrow">FIVE UNITS · 61 TOPICS</span><strong>Dart & Flutter Study Manual</strong><span>Detailed explanations, syntax, annotated code, output, self-checks and exam revision.</span><b>Open Study Manual →</b></button><button class="resource-tile lab-resource" data-page="lab"><span class="resource-icon">${icons.lab}</span><span class="eyebrow">12 PRESCRIBED + 12 EXTRA</span><strong>Lab Record Studio</strong><span>Aim, procedure, program, output, result, viva and interactive Flutter UI previews.</span><b>Open Lab Record →</b></button></div>`}
function allManualTopics(){return accessibleLessons().flatMap(l=>(material(l)?.manual_topics||[]).map(t=>({...t,lessonHour:l.teaching_hour,lessonId:l.id}))).sort((a,b)=>a.unit-b.unit||Number(a.id.split('.')[1])-Number(b.id.split('.')[1]))}
function manualTopicMatch(t,q){const words=q.toLowerCase().trim().split(/\s+/).filter(Boolean);return words.every(w=>[t.title,t.id,...(t.explanation||[]).map(x=>x.text||(x.items||[]).join(' ')),t.syntax,t.code,t.how,t.output,(t.key_points||[]).join(' '),t.practice].join(' ').toLowerCase().includes(w))}
function manualCurrent(topics){return topics.find(t=>t.id===state.manualTopic)||topics.find(t=>t.unit===state.manualUnit)||topics[0]}
function manualFold(title,content,open=true,cls=''){return `<details class="manual-fold ${cls}" ${open?'open':''}><summary><span>${title}</span><span class="manual-chevron" aria-hidden="true">⌄</span></summary><div class="manual-fold-body">${content}</div></details>`}
function manualPage(){if(!isSmartDevices())return title('STUDY MANUAL · '+(activeCourse()?.code||''),'Course study notes','The study manual for this course is being prepared. Your faculty can edit and release individual lesson notes from Course notes.')+'<div class="card"><p>Use Course notes to browse released teaching hours. The Flutter and Dart manual belongs to Programming Smart Devices and is not shared with this course.</p><button class="btn primary" data-page="lessons">Open course notes</button></div>';const all=allManualTopics(),availableUnits=new Set(all.map(t=>t.unit));const selected=manualCurrent(all);if(!all.length)return title('COMPLETE STUDY MANUAL · FIVE UNITS','Your manual is being prepared','The complete Study Manual follows your faculty’s lesson-release settings.')+`<div class="card empty"><h3>No released topics yet</h3><p>Only released lessons and their full manual content are visible to students.</p><button class="btn blue" data-page="requests">Request a topic</button></div>`;
 const t=selected,idx=all.findIndex(x=>x.id===t.id),answer=state.manualAnswers[t.id],checked=manualUnderstood.has(t.id),q=state.manualSearch.trim();
 const matches=q?all.filter(x=>manualTopicMatch(x,q)):all.filter(x=>x.unit===t.unit);
 const explanation=(t.explanation||[]).map(p=>p.type==='list'?`<ul>${p.items.map(x=>`<li>${E(x)}</li>`).join('')}</ul>`:`<p>${E(p.text)}</p>`).join('');
 const quiz=t.quiz||{};const quizContent=`<p class="manual-question">${E(quiz.question)}</p><div class="manual-answers">${(quiz.options||[]).map((opt,i)=>`<button class="manual-answer ${answer===i?(i===quiz.correct?'correct':'wrong'):''} ${answer!==undefined&&i===quiz.correct?'correct':''}" data-action="manual-answer" data-id="${E(t.id)}" data-choice="${i}" ${answer!==undefined?'disabled':''}>${E(opt)}</button>`).join('')}</div>${answer!==undefined?`<p class="manual-feedback">${answer===quiz.correct?'✓ Correct.':'Review the correct answer.'} ${E(quiz.rationale)}</p>`:''}`;
 const card=`<article class="manual-reader" id="manual-reader"><div class="manual-reader-head"><div><span class="eyebrow">UNIT ${['I','II','III','IV','V'][t.unit-1]} · TOPIC ${E(t.id)}</span><h2>${E(t.title)}</h2><p>Associated with teaching hour ${t.lessonHour} · 25PCA2CC04</p></div><button class="manual-understood ${checked?'is-done':''}" data-action="manual-understood" data-id="${E(t.id)}" aria-pressed="${checked}">${checked?'✓ Understood':'○ Mark understood'}</button></div>
 <div class="manual-fold-controls"><button class="btn small outline" data-action="manual-expand">Expand sections</button><button class="btn small outline" data-action="manual-collapse">Collapse sections</button></div>
 ${manualFold('Explanation',explanation,true)}
 ${manualFold('Syntax',`<pre class="manual-code light"><code>${E(t.syntax)}</code></pre>`,true)}
 ${manualFold('Annotated program',`<div class="manual-code-head"><span>CODE EXAMPLE</span><button class="btn small outline" data-action="manual-copy" data-id="${E(t.id)}">Copy program</button></div><pre class="manual-code"><code>${E(t.code)}</code></pre><h4>How this code works</h4><p>${E(t.how)}</p>`,true)}
 ${manualFold('Expected output / behaviour',`<pre class="manual-output">${E(t.output)}</pre>`,true)}
 ${manualFold('Key points',`<ul>${(t.key_points||[]).map(x=>`<li>${E(x)}</li>`).join('')}</ul>`,false,'good')}
 ${manualFold('Common mistakes',`<ul>${(t.pitfalls||[]).map(x=>`<li>${E(x)}</li>`).join('')}</ul>`,false,'warning')}
 ${manualFold('Try it yourself',`<p>${E(t.practice)}</p>`,false)}
 ${manualFold('Quick check · ungraded',quizContent,true,'quick')}
 ${manualFold('Examination practice',`<ol>${(t.exam||[]).map(x=>`<li>${E(x)}</li>`).join('')}</ol>`,false)}
 <div class="manual-pager"><button class="btn outline" data-action="manual-topic" data-id="${all[idx-1]?.id||''}" ${idx?'':'disabled'}>← Previous topic</button><span>${idx+1} of ${all.length} available</span><button class="btn primary" data-action="manual-topic" data-id="${all[idx+1]?.id||''}" ${idx<all.length-1?'':'disabled'}>Next topic →</button></div></article>`;
 const unitButtons=unitNames.map((name,i)=>!availableUnits.has(i+1)?'':`<button class="manual-unit ${t.unit===i+1?'active':''}" data-action="manual-unit" data-unit="${i+1}"><strong>UNIT ${['I','II','III','IV','V'][i]}</strong><span>${E(name)}</span><small>${all.filter(x=>x.unit===i+1).length} topics</small></button>`).join('');
 const results=matches.map(x=>`<button class="manual-index-item ${x.id===t.id?'current':''}" data-action="manual-topic" data-id="${E(x.id)}"><span class="manual-number">${E(x.id)}</span><span>${E(x.title)}</span>${manualUnderstood.has(x.id)?'<b>✓</b>':''}</button>`).join('')||'<p class="hint">No matching released topics.</p>';
 return title('STUDY MANUAL · 25PCA2CC04','Dart & Flutter · Five Units','The complete 61-topic course reference. Only faculty-released lessons appear for students.')+
 `<div class="manual-summary"><div><strong>${all.length} topics available</strong><span>${all.filter(x=>manualUnderstood.has(x.id)).length} marked understood on this device</span></div><button class="btn small blue" data-page="lab">Go to Lab Record Studio →</button></div>`+
 `<nav class="manual-unit-tabs" aria-label="Study Manual units">${unitButtons}</nav><div class="manual-find"><label class="field">Find a topic across your available units<input id="manual-filter" type="search" value="${E(state.manualSearch)}" placeholder="Search concepts, programs, or topics…" autocomplete="off"></label>${q?`<p class="hint">${matches.length} matching topic(s)</p>`:''}<div id="manual-mobile-results" class="manual-mobile-results">${q?results:''}</div></div>`+
 `<div class="manual-layout"><aside class="manual-index card"><div class="manual-index-head"><strong>Browse topics</strong><span class="hint">Unit ${t.unit}</span></div><div id="manual-results">${results}</div></aside>${card}</div>`+
 `<button class="manual-float" data-action="manual-toggle-drawer" aria-label="Browse Study Manual topics" aria-expanded="${state.manualTopicsOpen}">${icons.manual} <span>Topics</span></button><button class="manual-scrim ${state.manualTopicsOpen?'visible':''}" data-action="manual-close-drawer" aria-label="Close manual topics"></button><aside class="manual-drawer ${state.manualTopicsOpen?'open':''}" aria-label="Study Manual topic drawer"><div class="manual-drawer-head"><strong>Browse Study Manual</strong><button class="btn small outline" data-action="manual-close-drawer">✕</button></div><p class="hint">Only your available lessons are listed.</p>${unitNames.map((name,i)=>{const items=all.filter(x=>x.unit===i+1);return items.length?`<details class="manual-drawer-group" ${i+1===t.unit?'open':''}><summary>UNIT ${['I','II','III','IV','V'][i]} · ${E(name)} <small>${items.length}</small></summary>${items.map(x=>`<button class="manual-index-item ${x.id===t.id?'current':''}" data-action="manual-topic" data-id="${E(x.id)}"><span class="manual-number">${E(x.id)}</span><span>${E(x.title)}</span></button>`).join('')}</details>`:''}).join('')}</aside>`;
}

function classroom(){const live=liveSession(),sessionLesson=live?data.lessons.find(l=>l.id===live.lesson_id):data.lessons.find(l=>l.id===state.sessionLesson)||data.lessons[0];
 const releases=live?data.releases.filter(r=>r.session_id===live.id):[];const latest=selectedRelease();const activity=data.activities.find(a=>a.id===latest?.activity_id), joined=live&&myAttendance(live.id);
 const attendees=live?data.attendance.filter(a=>a.session_id===live.id):[];
 let p=title('CLASSROOM COMPANION',isFaculty()?'Run today’s class':'Join the conversation','One-hour lessons, teacher-controlled activities and attendance. Presentations remain in PowerPoint, Canva or on the board.');
 if(isFaculty()){
  p+=`<div class="split"><article class="card"><h3>Session controls</h3><p>Select an hour, start a session, then release one activity at a time.</p><label class="field">Teaching hour<select id="class-lesson" ${live?'disabled':''}>${data.lessons.map(l=>`<option value="${l.id}" ${sessionLesson?.id===l.id?'selected':''}>Hour ${String(l.teaching_hour).padStart(2,'0')} — ${A(l.title,75)}</option>`).join('')}</select></label><label class="field">Teaching date<input type="date" id="class-date" value="${E(live?.session_date||data.schedule?.find(x=>x.lesson_id===sessionLesson?.id)?.scheduled_on||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}))}" ${live?'disabled':''}></label>${live?`<p class="hint">${E(live.session_kind==='revision'?'Revision':'First teaching')} · ${E(live.session_date||'')}</p>`:''}<div class="buttons">${live?`<button class="btn danger" data-action="end-class">End class</button>`:`<button class="btn primary" data-action="start-class">Start today's class</button>`}<span class="badge ${live?'live':''}">${live?'LIVE':'NOT STARTED'}</span></div><div class="cards" style="grid-template-columns:1fr 1fr"><div class="card"><div class="stat">${attendees.length}</div><small>Students joined</small></div><div class="card"><div class="stat">${latest?data.attempts.filter(a=>a.release_id===latest.id).length:0}</div><small>Submissions</small></div></div>${sessionLesson?`<button class="btn outline small" data-action="lesson" data-hour="${sessionLesson.teaching_hour}">Preview study notes →</button>`:''}</article>`+
 `<article class="card"><h3>Release an activity</h3><p>Graded responses accept one attempt per student; solutions are revealed only when you choose.</p>${live?`<label class="field">Activity<select id="release-select">${getActivityForLesson(sessionLesson).map(a=>`<option value="${a.id}" ${state.selectedActivity===a.id?'selected':''}>${E(a.kind.replace('_',' '))}: ${A(a.prompt,75)}</option>`).join('')}</select></label><div class="buttons"><button class="btn primary" data-action="release">Release activity</button><button class="btn outline" data-action="create-activity">Create activity</button></div>`:`<p class="hint">Start a class to release a challenge.</p>`}${releases.length?`<hr style="border:0;border-top:1px solid #e3edf2"><strong>Released activities</strong>${releases.map(r=>{const a=data.activities.find(x=>x.id===r.activity_id);return `<div class="list-entry"><div><h4>${A(a?.prompt||'Activity',90)}</h4><p>${day(r.released_at)} · ${r.revealed_at?'Answer revealed':'Hidden'}</p></div><div class="buttons"><button class="btn small outline" data-action="select-release" data-id="${r.id}">Inspect</button>${!r.revealed_at?`<button class="btn small orange" data-action="reveal" data-id="${r.id}">Reveal answer</button>`:''}</div></div>`}).join('')}`:''}</article></div>`;
  if(latest&&activity)p+=`<div class="card" style="margin-top:18px"><div class="row"><h3>Current activity</h3><span class="badge">${E(activity.kind)}</span></div><p><strong>${E(activity.prompt)}</strong></p><ol>${activity.options.map(o=>`<li>${E(o)}</li>`).join('')}</ol><p class="hint">${data.attempts.filter(a=>a.release_id===latest.id).length} recorded attempt(s). ${latest.revealed_at?'Answer shown to participants.':'No answer visible to students until reveal.'}</p></div>`;
  if(live)p+=`<div class="card" style="margin-top:18px"><h3>Attendance register</h3>${attendees.length?`<div class="list">${attendees.map(a=>`<div class="list-entry"><span>${E(rowName(a.student_id))}</span><small>${day(a.joined_at)}</small></div>`).join('')}</div>`:'<p>No students have joined yet.</p>'}</div>`;
 }else{
  p+=`<div class="split"><div class="card"><h3>Today’s lesson</h3><span class="badge ${live?'live':''}">${live?'LIVE':'WAITING'}</span><h3>${E(sessionLesson&&topicIsUnlocked(sessionLesson)?sessionLesson.title:'Classroom session')}</h3><p>${live?'Join the session to record attendance and take part in activities.':'Your teacher has not started a class.'}</p>${live&&!joined?`<button class="btn primary" data-action="join-class">Join class & record attendance</button>`:joined?`<div class="success">✓ You are marked present for this class.</div>`:''}</div><div class="card"><h3>Class activity</h3>${!joined?'<p>Join the class to participate.</p>':!latest?'<p>Waiting for your teacher to release an activity.</p>':activity?studentActivity(activity,latest):'<p>Fetching activity…</p>'}</div></div>`;
 }
 return p;
}
const labTabs=[['aim','Aim'],['procedure','Procedure'],['program','Program'],['output','Output'],['result','Result'],['viva','Viva & extension']];
function labArt(l){const n=l.experiment_no,accent=['#dceeff','#ffeadc','#dff3ea','#efeaff'][Math.floor((n-1)/3)%4];
 const glyph=n<=3?'{}':n<=6?'<>':n<=9?'UI':'DB';return `<svg viewBox="0 0 320 150" aria-hidden="true"><rect width="320" height="150" fill="${accent}"/><circle cx="270" cy="19" r="38" fill="#ffffff70"/><rect x="60" y="29" width="202" height="100" rx="14" fill="#fff" stroke="#c9dbe9" stroke-width="2"/><rect x="60" y="29" width="202" height="23" rx="12" fill="#d0eaf9"/><circle cx="74" cy="40" r="4" fill="#ff985e"/><circle cx="87" cy="40" r="4" fill="#79c7a6"/><path d="M85 75h48M85 89h80M85 103h62" stroke="#aad2e8" stroke-width="5" stroke-linecap="round"/><text x="214" y="101" text-anchor="middle" font-family="ui-monospace,monospace" font-size="29" font-weight="800" fill="#387bb2">${glyph}</text></svg>`}
function labManage(){if(!isFaculty())return '';const selected=state.selectedLabs.filter(id=>visibleLabs().some(l=>l.id===id));const open=visibleLabs().filter(l=>data.labUnlocks.some(x=>x.lab_id===l.id&&!x.revoked_at)).length;
 return `<section class="card lab-manager"><div class="row wrap"><div><span class="eyebrow">FACULTY RELEASE CONTROLS</span><h3>Control practical access</h3><p class="muted">Only released practicals appear on a student's dashboard or lab page.</p></div><span class="badge">${open} / ${visibleLabs().length} released</span></div><div class="buttons lab-manager-actions"><button class="btn small outline" data-action="select-all-labs">Select all ${visibleLabs().length}</button><button class="btn small outline" data-action="clear-labs">Clear selection</button><button class="btn small primary" data-action="bulk-labs" data-open="true" data-scope="selected" ${selected.length?'':'disabled'}>Unlock selected (${selected.length})</button><button class="btn small outline" data-action="bulk-labs" data-open="false" data-scope="selected" ${selected.length?'':'disabled'}>Lock selected</button><button class="btn small blue" data-action="bulk-labs" data-open="true" data-scope="all">Unlock all practicals</button><button class="btn small outline" data-action="bulk-labs" data-open="false" data-scope="all">Lock all</button></div></section>`}
function phoneShell(title,body,bottom='',dark=false){return `<div class="phone ${dark?'dark':''}" aria-label="Target mobile UI design"><div class="phone-status"><span>9:41</span><span>●●● 100%</span></div><div class="phone-appbar">${title}<span style="font-size:11px;opacity:.65">•••</span></div><div class="phone-body">${body}</div>${bottom?`<div class="p-bottombar">${bottom}</div>`:''}</div>`}
function phoneDesign(l){switch(l.number){
case 4:return phoneShell('Hello Flutter',`<div class="p-center"><div class="p-icon">F</div><span class="p-chip">YOUR FIRST APP</span><h3 style="font-size:22px">Hello, Flutter!</h3><p>One widget at a time.<br>Welcome to mobile development.</p><div class="p-divider" style="width:120px"></div><p class="p-muted">MaterialApp · Scaffold · Text</p></div>`,'Build · Learn · Repeat');
case 5:return phoneShell('My Study Topics',`<div class="p-hero"><span class="p-chip">LEARNING TODAY</span><h3>Explore Flutter widgets</h3><p>Tap a topic to mark it as explored.</p></div>${['Text and icons','Buttons and actions','Layouts and lists'].map((s,i)=>`<label class="p-card p-row"><span style="font-size:11px;font-weight:750">${s}</span><input class="p-check" type="checkbox" ${i===0?'checked':''}></label>`).join('')}<button class="p-button" style="width:100%;margin-top:12px" data-demo="snack">Keep experimenting!</button><div class="p-feedback" id="demo-feedback"></div>`,'Widgets · Layout · Interaction');
case 6:return phoneShell('Tap Tracker',`<div class="p-center"><span class="p-chip">STATEFUL WIDGET</span><div class="p-hero" style="width:100%;padding:26px 10px"><p>Your current taps</p><div class="p-big" id="demo-count">${previewState.count}</div><p>Every tap rebuilds this value</p></div><button class="p-button" data-demo="increment" style="width:88%">+ Add a tap</button><button class="p-small-link" data-demo="reset" style="margin-top:13px">Reset counter</button></div>`,'State changes with setState()');
case 7:return phoneShell('Student Registration',`<div class="p-hero"><span class="p-chip">FORM VALIDATION</span><h3>Join the workshop</h3><p>Complete both fields to continue.</p></div><label class="p-muted">Full name</label><input id="demo-name" class="p-input" placeholder="e.g. Asha Rani"><label class="p-muted">Email address</label><input id="demo-email" class="p-input" type="email" placeholder="name@example.com"><button class="p-button" style="width:100%;margin-top:14px" data-demo="form">Submit details</button><div class="p-feedback" id="demo-feedback"></div>`,'Form · TextFormField · Validator');
case 8:return phoneShell('Theme Studio',`<div class="p-hero"><span class="p-chip">MATERIAL 3</span><h3>Hello, designer!</h3><p>One app, two themes.</p></div><div class="p-card p-row"><div><strong style="font-size:12px">Dark mode</strong><p class="p-muted">Switch the theme</p></div><input type="checkbox" class="p-check" id="demo-dark" data-demo="theme" ${previewState.themeDark?'checked':''}></div><div class="p-card"><span class="p-chip">TYPOGRAPHY</span><h3>Make it readable.</h3><p>Use a consistent font and color scheme.</p></div><div class="p-row" style="justify-content:flex-start;margin-top:12px"><span style="width:22px;height:22px;background:#267cb5;border-radius:50%"></span><span style="width:22px;height:22px;background:#f4761b;border-radius:50%"></span><span style="width:22px;height:22px;background:#68b6a4;border-radius:50%"></span></div>`,'ThemeData · ColorScheme · Fonts',previewState.themeDark);
case 9:return previewState.route==='details'?phoneShell(`<button class="back" data-demo="route-back">←</button> Course Details`,`<div class="p-hero"><span class="p-chip">DETAIL SCREEN</span><h3>Flutter Development</h3><p>Choose this topic to return to Home.</p></div><div class="p-card"><strong style="font-size:12px">Learn to build mobile apps</strong><p>Navigation carries information between pages.</p></div><button class="p-button" style="width:100%;margin-top:13px" data-demo="route-select">Select Flutter</button>`,'Navigator.pop(context, result)'):phoneShell('Course Explorer',`<div class="p-hero"><span class="p-chip">HOME SCREEN</span><h3>Where will you go?</h3><p>Open the details page and return with a result.</p></div><div class="p-card p-row"><span style="font-size:12px;font-weight:750">Flutter Development</span><span class="p-chip">Course</span></div><button class="p-button" style="width:100%;margin-top:15px" data-demo="route-open">Open details →</button><div class="p-feedback" id="demo-feedback">${previewState.route==='chosen'?'Selected: Flutter':''}</div>`,'Navigator.push() / pop()');
case 10:return phoneShell('API Explorer',`<div class="p-hero"><span class="p-chip">FUTURE BUILDER</span><h3>Discover a post</h3><p>Fetching remote JSON asynchronously.</p></div><div class="p-card" id="api-card">${previewState.api==='loading'?'<p>Loading…</p><div style="height:5px;background:#b5def4;border-radius:9px;width:70%"></div>':previewState.api==='loaded'?'<span class="p-chip">POST #1</span><h3>Example article</h3><p>This is simulated preview content; the Flutter code fetches a real sample API.</p>':'<h3>Ready to fetch</h3><p>Tap below to simulate the API response.</p>'}</div><button class="p-button" style="width:100%;margin-top:12px" data-demo="api">${previewState.api==='loading'?'Loading…':'Load sample post'}</button>`,'http · FutureBuilder · JSON');
case 11:return previewState.auth==='in'?phoneShell('My Account',`<div class="p-center"><div class="p-avatar" style="margin-bottom:15px">A</div><h3>Signed in</h3><p>Preview session for a student.</p><span class="p-chip">DEMO ONLY</span><button class="p-button outline" style="margin-top:22px" data-demo="signout">Sign out</button></div>`,'Firebase Authentication · UI mockup'):phoneShell('Firebase Auth',`<div class="p-hero"><span class="p-chip">ACCOUNT ACCESS</span><h3>Welcome back</h3><p>Sign in to continue your learning.</p></div><label class="p-muted">Email</label><input class="p-input" placeholder="student@example.com" type="email"><label class="p-muted">Password</label><input class="p-input" type="password" placeholder="••••••••"><button class="p-button" style="width:100%;margin-top:13px" data-demo="signin">Sign in (preview)</button><button class="p-small-link" style="width:100%;margin-top:7px" data-demo="signin">Create account (preview)</button><p class="p-muted" style="text-align:center">Mockup only — no credentials are sent.</p>`,'FirebaseAuth · Register · Sign in');
case 12:return phoneShell('My Notes',`<div class="p-hero"><span class="p-chip">CLOUD FIRESTORE</span><h3>My learning notes</h3><p>Save small reminders and review them later.</p></div><input class="p-input" id="demo-note" placeholder="Write a new note…"><button class="p-button" style="width:100%;margin:6px 0 10px" data-demo="addnote">+ Add note (preview)</button><div class="p-notes">${previewState.notes.map((note,i)=>`<div class="p-card p-row" style="margin:0"><span style="font-size:11px">${esc(note)}</span><button class="p-small-link" data-demo="deletenote" data-index="${i}" aria-label="Delete note">×</button></div>`).join('')}</div><p class="p-muted" style="margin-top:12px">This mockup does not write to Firestore.</p>`,'Firestore · Documents · Snapshots');
default:return phoneShell('Flutter Lab',`<div class="p-center"><h3>UI Design Preview</h3><p>Follow the lab record to implement the screen.</p></div>`)
}}

function labKind(l){return Number(l.experiment_no)>12?'extra':Number(l.experiment_no)<=3?'dart':'flutter'}
function labLabel(l){return Number(l.experiment_no)>12?'D'+String(Number(l.experiment_no)-12).padStart(2,'0'):String(l.experiment_no).padStart(2,'0')}
function labOrder(){return visibleLabs().slice().sort((a,b)=>{const rank=x=>{const n=Number(x.experiment_no);return n<=3?n:n>12?n-9:n+12};return rank(a)-rank(b)})}
function labDetails(l){return l.manual_details&&typeof l.manual_details==='object'?l.manual_details:{}}
function labGroupBlock(key,name,desc,arr){if(!arr.length)return '';return `<details class="lab-group" data-lab-group="${key}" open><summary><span><strong>${name}</strong><small>${desc}</small></span><span class="lab-group-count">${arr.length} programs <b>⌄</b></span></summary><div class="lab-grid">${arr.map(l=>`<article class="lab-card"><button data-action="open-lab" data-lab="${l.experiment_no}" class="lab-card-open"><div class="lab-art">${labArt(l)}</div><div class="lab-card-body"><div class="eyebrow">${labKind(l)==='extra'?'EXTRA DART':'EXPERIMENT'} ${labLabel(l)}</div><h3>${E(l.title)}</h3><p>${E(l.subtitle)}</p><div class="lab-card-foot"><span>${isFaculty()?(data.labUnlocks.some(x=>x.lab_id===l.id&&!x.revoked_at)?'Released':'Not released'):isLabDone(l)?'✓ Written':'Open practical'}</span><span>View →</span></div></div></button>${isFaculty()?`<label class="lab-select"><input type="checkbox" data-select-lab="${E(l.id)}" ${state.selectedLabs.includes(l.id)?'checked':''} aria-label="Select ${labLabel(l)}"> Select</label><button class="lab-single" data-action="single-lab" data-lab="${l.id}">${data.labUnlocks.some(x=>x.lab_id===l.id&&!x.revoked_at)?'Lock experiment':'Unlock experiment'}</button>`:''}</article>`).join('')}</div></details>`}
function labPage(){if(!isSmartDevices())return title('PRACTICALS','No practical record for this course','The Dart and Flutter lab belongs to Programming Smart Devices.')+'<div class="card"><button class="btn primary" data-page="lessons">Open course notes</button></div>';const labs=labOrder(),selected=labByNo(state.labNo);const q=state.labSearch.trim().toLowerCase();const filtered=labs.filter(l=>!q||[l.title,l.subtitle,l.category,l.aim,l.code].join(' ').toLowerCase().includes(q));
 let result=title('CORE PRACTICAL – 3 · 25PCA2CP03','Lab Record Studio','12 prescribed experiments, 12 additional Dart programs, and nine interactive Flutter UI previews.')+labManage();
 if(selected){const done=isLabDone(selected),flutter=labKind(selected)==='flutter',label=labLabel(selected),tabName=labTabs.find(t=>t[0]===state.labTab)?.[1]||'Lab record';
 return result+`<div class="lab-workspace"><button class="btn outline small" data-action="close-lab">← All experiments</button><div class="lab-work-header"><div class="eyebrow">${labKind(selected)==='extra'?'EXTRA DART PROGRAM':'EXPERIMENT'} ${label} · ${E(selected.category)}</div><h2>${E(selected.title)}</h2><p>${E(selected.subtitle)}</p></div><div class="lab-studio-grid"><div class="lab-record-column"><div class="lab-tablist" role="tablist" aria-label="Lab record sections">${labTabs.map(([key,name])=>`<button role="tab" aria-selected="${state.labTab===key}" data-action="lab-tab" data-tab="${key}" class="${state.labTab===key?'active':''}">${name}</button>`).join('')}</div><div class="lab-tabcontent"><details class="lab-section-fold" open><summary><span>${E(tabName)}</span><small>Collapse / expand ⌄</small></summary><div class="lab-section-fold-body">${labSection(selected)}</div></details></div><div class="lab-section-nav"><button class="btn outline small" data-action="lab-section-step" data-dir="-1" ${state.labTab===labTabs[0][0]?'disabled':''}>← Previous section</button><span>${labTabs.findIndex(t=>t[0]===state.labTab)+1} / ${labTabs.length} sections</span><button class="btn primary small" data-action="lab-section-step" data-dir="1" ${state.labTab===labTabs[labTabs.length-1][0]?'disabled':''}>Next section →</button></div></div><aside class="lab-preview-column"><div class="lab-preview-heading"><strong>${flutter?'Target mobile UI':'Expected console output'}</strong><span>${flutter?'INTERACTIVE MOCKUP':'DART TERMINAL'}</span></div><div class="lab-preview-body">${flutter?phoneDesign({number:selected.experiment_no}):`<div class="console-card"><div class="console-top"><i></i><i></i><i></i></div><div class="console-text">${E(selected.output)}</div></div>`}</div><p class="lab-preview-caption">${flutter?'This is a UI design reference; buttons simulate the screen and do not execute Flutter code or connect to Firebase.':'Run the Dart program on your computer and compare its output.'}</p></aside></div><div class="lab-work-bottom"><div class="lab-record-status">${!isFaculty()?`<label><input type="checkbox" data-lab-complete="${selected.experiment_no}" ${done?'checked':''}> I have written this ${labKind(selected)==='extra'?'extra program':'experiment'}</label>`:'<span class="muted">Faculty preview · students can mark completion</span>'}</div><div class="buttons"><button class="btn small outline" data-action="lab-step" data-dir="-1">← Previous</button><button class="btn small primary" data-action="lab-step" data-dir="1">Next →</button></div></div></div>`}
 result+=`<div class="lab-overview"><div><h2>Choose your experiment</h2><p>Study the aim, procedure, code, expected result and viva. Open a Flutter practical to explore its interactive screen.</p></div><div class="lab-progress"><span>${isFaculty()?'Faculty preview':'Record progress'} <strong>${isFaculty()?labs.length+' programs':data.labCompletions.filter(c=>c.student_id===data.me.user_id&&c.completed).length+' of '+labs.length+' practised'}</strong></span><div class="lab-track"><div style="width:${isFaculty()?100:labs.length?Math.min(100,100*data.labCompletions.filter(c=>c.student_id===data.me.user_id&&c.completed).length/labs.length):0}%"></div></div></div></div><div class="lab-search-row"><label class="lab-search"><span class="eyebrow">FIND AN EXPERIMENT</span><input type="search" id="lab-filter" value="${E(state.labSearch)}" placeholder="Search available practicals…" autocomplete="off"></label><div class="buttons"><button class="btn small outline" data-action="lab-expand-groups">Expand all</button><button class="btn small outline" data-action="lab-collapse-groups">Collapse all</button></div></div>`+
 (labs.length?`<div class="lab-groups">${labGroupBlock('dart','Dart · Prescribed exercises','Experiments 1–3 from the practical syllabus',filtered.filter(l=>labKind(l)==='dart'))}${labGroupBlock('extra','Extra Dart programs','12 supplementary console programs',filtered.filter(l=>labKind(l)==='extra'))}${labGroupBlock('flutter','Flutter · UI and app development','Experiments 4–12, with target mobile-screen designs',filtered.filter(l=>labKind(l)==='flutter'))}</div>${filtered.length?'':'<div class="card empty">No matching available experiments.</div>'}`:`<div class="card empty"><h3>No practicals released yet</h3><p>Experiments become visible when your teacher unlocks them.</p></div>`)+`<div class="footer">a g2r2 venture · Lab record progress is ${demoMode?'stored only in this preview':'saved to your Academy account'}.</div>`;
 return result;
}

function labSection(l){switch(state.labTab){
 case 'aim':return `<h3>Aim</h3><p>${E(l.aim)}</p>${labDetails(l).concept?`<div class="lab-info"><strong>Concept</strong><p>${E(labDetails(l).concept)}</p></div>`:''}<div class="lab-info"><strong>Requirements</strong><p>${E(l.requirements||'Dart and Flutter SDK')}</p></div>`;
 case 'procedure':return `<h3>Procedure</h3><ol class="lab-steps">${(l.procedure||[]).map(step=>`<li>${E(step)}</li>`).join('')}</ol>${labDetails(l).walkthrough?.length?`<div class="lab-info"><strong>How the program works</strong><ol>${labDetails(l).walkthrough.map(x=>`<li>${E(x)}</li>`).join('')}</ol></div>`:''}`;
 case 'program':return `${labDetails(l).syntax?`<div class="lab-info"><strong>Syntax reference</strong><pre class="lab-syntax">${E(labDetails(l).syntax)}</pre></div>`:''}<div class="codebar"><h3>Program</h3><button class="btn small outline" data-action="copy-lab" data-lab="${l.experiment_no}">Copy code</button></div><pre class="lab-code"><code>${E(l.code)}</code></pre>`;
 case 'output':return `<h3>Expected output / observation</h3><p>Observe the output on a supported device. Interactive programs may display a screen rather than console text.</p><div class="lab-output">${E(l.output)}</div>`;
 case 'result':return `<h3>Result</h3><div class="lab-result">${E(l.result)}</div>${labDetails(l).pitfalls?.length?`<div class="lab-pitfalls"><strong>Common mistakes</strong><ul>${labDetails(l).pitfalls.map(x=>`<li>${E(x)}</li>`).join('')}</ul></div>`:''}<div class="lab-info"><strong>Lab record checklist</strong><p>Include aim, procedure, source code, observed output and result in your written record.</p></div>`;
 default:return `<h3>Viva question</h3><p>${E(l.viva)}</p><h3>Extension challenge</h3><p>${E(l.challenge)}</p>`;
}}
function studentActivity(a,r){const mine=data.attempts.find(t=>t.release_id===r.id&&t.student_id===data.me.user_id);
 let h=`<div class="eyebrow">${E(a.kind.replaceAll('_',' '))}</div><p><strong>${E(a.prompt)}</strong></p>`;
 if(a.kind==='arrange_code'){
  let order=state.ordering.filter(i=>i>=0&&i<a.options.length);
  h+=`<div class="hint">Tap code fragments in order to build the program.</div><div class="answers">${a.options.map((line,i)=>`<button class="answer ${order.includes(i)?'selected':''}" data-action="add-order" data-index="${i}" ${(mine||order.includes(i))?'disabled':''}>${E(line)}</button>`).join('')}</div><div class="tip">Your order: ${order.map(i=>E(a.options[i])).join(' → ')||'Nothing selected yet'}</div><div class="buttons"><button class="btn outline small" data-action="reset-order" ${mine?'disabled':''}>Reset</button></div>`;
 }else h+=`<div class="answers">${a.options.map((opt,i)=>`<button class="answer ${state.choice===i?'selected':''}" data-action="choose" data-index="${i}" ${mine?'disabled':''}>${E(opt)}</button>`).join('')}</div>`;
 if(!mine)h+=`<button class="btn primary" data-action="submit-attempt" data-release="${r.id}">Submit final answer</button><p class="smallprint">Only one graded attempt is permitted.</p>`;
 else h+=`<div class="success">Answer submitted on ${day(mine.submitted_at)}. ${r.revealed_at?(mine.is_correct?'Correct answer!':'Check the teacher’s explanation below.'):'Waiting for your teacher to reveal the solution.'}</div>`;
 if(r.revealed_at){const ans=demoMode?a.correct:state.revealAnswers?.[r.id];
  h+=`<div class="tip"><strong>Revealed solution:</strong> ${ans===undefined?'Refresh to see the answer':a.kind==='arrange_code'?Array.isArray(ans)?ans.map(i=>E(a.options[i])).join(' → '):E(ans):E(a.options[ans])}<p>${E(a.explanation||'Discuss the reasoning with your teacher.')}</p></div>`}
 return h;
}
function practice(){const allowed=data.lessons.filter(l=>topicIsUnlocked(l)&&material(l));const l=allowed.find(x=>x.teaching_hour===state.hour)||allowed[0];
 return title('LEARN AT YOUR PACE','Unlimited practice','No grades, no ranks, no time pressure. Think through an example and check the key points as often as you like.')+
 `<div class="card"><label class="field">Choose an unlocked topic<select id="practice-lesson">${allowed.map(x=>`<option value="${x.teaching_hour}" ${x.teaching_hour===l?.teaching_hour?'selected':''}>Hour ${x.teaching_hour} · ${A(x.title,90)}</option>`).join('')}</select></label></div>`+
 (allowed.length?`<div class="card" style="margin-top:16px"><h3>${E(l?.title||allowed[0].title)}</h3><p>${E(material(l||allowed[0])?.activity||'Describe the example and suggest a modification.')}</p><label class="field">My prediction / explanation<textarea id="practice-response" placeholder="Write what you think will happen…"></textarea></label><div class="buttons"><button class="btn primary" data-action="check-practice">Check reasoning</button><button class="btn outline" data-action="reset-practice">Try again</button></div>${state.showHint?`<div class="tip"><strong>Key ideas to compare</strong><ul>${(material(l||allowed[0])?.key_points||[]).map(x=>`<li>${E(x)}</li>`).join('')}</ul></div>`:''}</div>`:`<div class="card empty"><h3>No unlocked topics yet</h3><p>Request a lesson or join your teacher’s class.</p><button class="btn blue" data-page="requests">Make a learning request</button></div>`);
}
function requests(){const l=currentLesson(),pending=data.requests.filter(r=>r.status==='pending');let h=title('ASK FOR WHAT YOU NEED',isFaculty()?'Learning requests':'Ask your teacher','Students can request lessons, revision, practice or help. Faculty can approve for selected students until manually revoked.');
 if(!isFaculty())h+=`<div class="card"><h3>New learning request</h3><form data-form="request" class="fields"><label class="field">Request type<select name="request_type"><option value="lesson_unlock">Unlock study notes</option><option value="revision">Revision material</option><option value="extra_practice">Extra practice</option><option value="help">Need help</option></select></label><label class="field">Topic<select name="lesson_id"><option value="">General request</option>${data.lessons.map(l=>`<option value="${l.id}" ${l.teaching_hour===state.hour?'selected':''}>Hour ${l.teaching_hour}: ${A(l.title,75)}</option>`).join('')}</select></label><label class="field">What would help?<textarea name="message" maxlength="1000" placeholder="I would like to revise…" required></textarea></label><button class="btn primary" type="submit">Send request</button></form></div>`;
 h+=`<div class="section-title"><h2>${isFaculty()?'Requests to review':'My requests'}</h2><span class="badge">${pending.length} pending</span></div><div class="list">${data.requests.map(r=>{const student=rowName(r.student_id),lesson=data.lessons.find(l=>l.id===r.lesson_id);
  return `<div class="list-entry"><div><span class="eyebrow">${A(r.request_type.replaceAll('_',' '),40)} · ${E(r.status)}</span><h4>${isFaculty()?E(student)+' · ':''}${lesson?E(lesson.title):'General request'}</h4><p>${E(r.message)} · ${day(r.created_at)}</p></div>${isFaculty()&&r.status==='pending'?`<div class="buttons"><button class="btn small blue" data-action="approve-request" data-id="${r.id}">Approve</button><button class="btn small danger" data-action="decline-request" data-id="${r.id}">Decline</button></div>`:''}</div>`}).join('')||'<div class="card empty">No requests yet.</div>'}</div>`;
 if(isFaculty()){h+=`<div class="section-title"><h2>Active special access</h2></div><div class="list">${data.grants.filter(g=>!g.revoked_at).map(g=>`<div class="list-entry"><div><strong>${E(rowName(g.student_id))}</strong><p>${E(data.lessons.find(l=>l.id===g.lesson_id)?.title||'Lesson')} · Until manually revoked</p></div><button class="btn small danger" data-action="revoke-grant" data-id="${g.id}">Revoke</button></div>`).join('')||'<div class="card empty">No special grants.</div>'}</div>`}
 return h;
}
function revisions(){let h=title('REVISE WITH CONFIDENCE','Revision resources',isFaculty()?'Create focused revision sets and release them to selected students or the entire class.':'Faculty-approved revision material appears here when released to you.');
 if(isFaculty())h+=`<div class="card"><h3>Create a revision set</h3><form data-form="revision" class="fields"><label class="field">Title<input name="title" required placeholder="Mid I · Dart Fundamentals" maxlength="120"></label><label class="field">Revision material<textarea name="content" required placeholder="Important topics, questions, practice tasks…" style="min-height:160px"></textarea></label><label class="field"><span>Recipients (registration numbers separated by commas; leave blank to keep as draft)</span><input name="recipients" placeholder="MCA26001, MCA26002"></label><label><input type="checkbox" name="released_all"> Release to the entire class</label><button class="btn primary">Create revision</button></form></div>`;
 h+=`<div class="section-title"><h2>Revision sets</h2></div><div class="list">${data.revisions.map(x=>`<div class="card"><div class="row wrap"><h3>${E(x.title)}</h3><span class="badge">${x.released_all?'Whole class':'Selected students'}</span></div><p style="white-space:pre-wrap">${E(x.content)}</p><span class="smallprint">Updated ${day(x.updated_at)}</span></div>`).join('')||'<div class="card empty">No revision sets released yet.</div>'}</div>`;return h;
}
function reports(){if(!isFaculty())return title('LEARNING RECORD','My classroom attempts','Only faculty see whole-class attendance and grades.')+`<div class="card">${data.attempts.filter(a=>a.student_id===data.me.user_id).map(a=>`<div class="list-entry"><strong>${day(a.submitted_at)}</strong><span>${a.is_correct?'Correct':'Submitted'}</span></div>`).join('')||'<div class="empty">No graded attempts yet.</div>'}</div>`;
 const sessions=data.sessions, attempts=data.attempts,att=data.attendance;
 let h=title('CLASSROOM INSIGHTS','Class reports','A factual overview for faculty. No leaderboards or compulsory progress tracking.')+`<div class="cards"><div class="card"><div class="stat">${data.enrollments.length}</div><small>Enrolled students</small></div><div class="card"><div class="stat">${sessions.length}</div><small>Recorded sessions</small></div><div class="card"><div class="stat">${att.length}</div><small>Attendance entries</small></div></div><div class="buttons"><button class="btn primary" data-action="export-attendance">Download attendance CSV</button><button class="btn outline" data-action="export-attempts">Download activity CSV</button></div>`;
 h+=`<div class="list">${sessions.map(s=>{const lesson=data.lessons.find(x=>x.id===s.lesson_id),joined=att.filter(a=>a.session_id===s.id).length,subs=attempts.filter(a=>data.releases.some(r=>r.id===a.release_id&&r.session_id===s.id)).length;
 return `<div class="list-entry"><div><h4>Hour ${lesson?.teaching_hour||'?'} · ${E(lesson?.title||'Lesson')}</h4><p>${day(s.started_at)} · ${s.status}</p></div><div class="buttons"><span class="badge">${joined} joined</span><span class="badge">${subs} answers</span></div></div>`}).join('')||'<div class="card empty">Start a class to see session reports.</div>'}</div>`;return h;
}
async function loadStudentRoster(){
 if(!isAdmin())throw Error('Administrator access required');
 studentLoading=true;studentError='';
 try{studentRoster=await api.request('/functions/v1/academy-admin-students',{method:'POST',body:{action:'list',offering_id:data.offeringId,search:studentSearch,status:studentFilter,page:studentRoster.page}});for(const student of studentRoster.students||[])if(selectedStudentIds.has(student.user_id))selectedStudentRows.set(student.user_id,student)}
 catch(err){studentError=err.message;studentRoster={students:[],count:0,page:0,page_size:30};}
 finally{studentLoading=false}
}
function studentsPage(){
 if(!isAdmin())return '<div class="card">Administrator access required.</div>';
 const rows=studentRoster.students||[];const total=studentRoster.count||0;const page=studentRoster.page||0;const pages=Math.max(1,Math.ceil(total/(studentRoster.page_size||30)));
 const body=rows.map(s=>{const status=s.account_disabled?'Suspended':'Active',en=s.enrollment_status||'not_enrolled';
 return `<tr class="${selectedStudentIds.has(s.user_id)?'student-row-selected':''}"><td class="student-select-cell"><input type="checkbox" data-select-student="${E(s.user_id)}" aria-label="Select ${E(s.display_name)}" ${selectedStudentIds.has(s.user_id)?'checked':''}></td><td><strong>${E(s.display_name)}</strong><small class="student-sub">${E(s.registration_no||'No registration number')}</small></td><td><span class="badge ${s.account_disabled?'locked':'live'}">${status}</span></td><td>${en==='active'?'Enrolled':en==='withdrawn'?'Withdrawn':'Not enrolled'}</td><td><div class="student-actions"><button class="btn small outline" data-action="student-edit" data-id="${E(s.user_id)}">Edit</button>${en==='active'?`<button class="btn small outline" data-action="student-withdraw" data-id="${E(s.user_id)}">Remove from class</button>`:`<button class="btn small blue" data-action="student-enroll" data-id="${E(s.user_id)}" ${s.account_disabled?'disabled':''}>Enroll</button>`}<button class="btn small ${s.account_disabled?'blue':'outline'}" data-action="${s.account_disabled?'student-restore':'student-suspend'}" data-id="${E(s.user_id)}">${s.account_disabled?'Restore':'Suspend'}</button><button class="btn small outline" data-action="student-password" data-id="${E(s.user_id)}">Reset password</button><button class="btn small danger" data-action="student-delete" data-id="${E(s.user_id)}">Delete</button></div></td></tr>`}).join('');
 return title('STUDENT DIRECTORY','Manage students','Select individual students, a full page, or all matching students to manage accounts together.')+
 `<div class="card"><div class="row wrap"><div><h2>Student directory</h2><p>Remove from class without deleting records, suspend access, edit details, reset passwords, or permanently delete an account.</p></div><button class="btn outline" data-action="student-refresh">Refresh list</button></div><div class="student-filters"><label class="field">Search name or registration number<input id="student-search" value="${E(studentSearch)}" placeholder="Search students" autocomplete="off"></label><label class="field">Filter<select id="student-status-filter">${[['all','All students'],['active','Active accounts'],['suspended','Suspended accounts'],['enrolled','Enrolled in class'],['withdrawn','Withdrawn from class']].map(([v,t])=>`<option value="${v}" ${studentFilter===v?'selected':''}>${t}</option>`).join('')}</select></label><button class="btn primary" data-action="student-search">Search</button></div>${studentSelectionToolbar(total)}${studentError?`<div class="warning">${E(studentError)}</div>`:''}<p class="hint">${total} matching students · Showing page ${page+1} of ${pages}. Permanent deletion removes the account and its learning records; use “Remove from class” when you only want to unenroll.</p><div class="admin-preview-scroll"><table class="admin-table student-directory-table"><thead><tr><th class="student-select-cell"><input type="checkbox" id="students-select-page" aria-label="Select all students on this page" ${rows.length&&rows.every(s=>selectedStudentIds.has(s.user_id))?'checked':''} ${rows.length?'':'disabled'}></th><th>Student</th><th>Account</th><th>Current class</th><th>Manage</th></tr></thead><tbody>${body||`<tr><td colspan="5">${studentLoading?'Loading students…':'No matching students.'}</td></tr>`}</tbody></table></div><div class="buttons"><button class="btn outline" data-action="student-page" data-dir="-1" ${page===0?'disabled':''}>Previous</button><button class="btn outline" data-action="student-page" data-dir="1" ${page+1>=pages?'disabled':''}>Next</button><button class="btn blue" data-page="admin">Import more students</button></div></div>`;
}
function rosterStudent(id){return studentRoster.students.find(x=>x.user_id===id)}
async function manageStudent(action,student,extra={}){
 if(!isAdmin()||!student)throw Error('Student not found');
 const response=await api.request('/functions/v1/academy-admin-students',{method:'POST',body:{action,student_id:student.user_id,offering_id:data.offeringId,...extra}});
 await loadStudentRoster();render();notice(response.message||'Student updated');return response;
}
function adminPage(){
 if(!isAdmin())return '<div class="card">Administrator access required.</div>';
 const status=platformStatus.maintenance_enabled;
 const stats=importResults.length?`<div class="card"><h3>Last import result</h3><p>${importResults.filter(x=>x.status==='created').length} created · ${importResults.filter(x=>x.status==='enrolled').length} enrolled · ${importResults.filter(x=>x.status==='failed'||x.status==='created_not_enrolled').length} failed</p><div class="admin-preview-scroll"><table class="admin-table"><thead><tr><th>Registration number</th><th>Status</th><th>Details</th></tr></thead><tbody>${importResults.map(x=>`<tr><td>${E(x.registration_no)}</td><td>${E(x.status)}</td><td>${E(x.message||'')}</td></tr>`).join('')}</tbody></table></div></div>`:'';
 const preview=importPreview.length?`<div class="card"><h3>Preview: ${E(importFilename)} · ${importPreview.length} students</h3><p class="hint">Passwords are hidden. The file is checked for missing fields and duplicates before import. Import at most 100 students per batch.</p><div class="admin-preview-scroll"><table class="admin-table"><thead><tr><th>Name</th><th>Registration number</th><th>Password</th></tr></thead><tbody>${importPreview.slice(0,15).map(x=>`<tr><td>${E(x.name)}</td><td>${E(x.registration_no)}</td><td>••••••••</td></tr>`).join('')}</tbody></table></div>${importPreview.length>15?'<p class="hint">Showing the first 15 rows.</p>':''}<div class="buttons"><button class="btn primary" data-action="import-students">Confirm and import ${importPreview.length} students</button><button class="btn outline" data-action="clear-import">Discard file</button></div></div>`:'';
 return title('PLATFORM CONTROL','Administration','Manage Academy access, student accounts, and imports.')+
 `<div class="card"><div class="row wrap"><div><h2>Faculty and courses</h2><p>Add faculty and semester courses.</p></div><button class="btn primary" data-page="faculty">Manage faculty</button></div></div>`+`<div class="card"><div class="row wrap"><div><h2>Class records</h2><p>Session history, revision and cleanup.</p></div><button class="btn outline" data-page="records">Open records</button></div></div>`+`<div class="card"><div class="row wrap"><div><h2>Manage students</h2><p>Search students, edit registration numbers, withdraw from class, suspend or restore accounts, and reset passwords.</p></div><button class="btn primary" data-page="students">Open student directory</button></div></div>`+
 `<div class="card"><div class="row wrap"><div><span class="eyebrow">PLATFORM ACCESS</span><h2>${status?'Development Mode':'Academy is live'}</h2><p>${status?'Only administrators can access the Academy. Student and faculty access is paused.':'Students and faculty can sign in and use their released lessons.'}</p></div><span class="badge">${status?'DEVELOPMENT':'LIVE'}</span></div><form data-form="maintenance" class="fields"><input type="hidden" name="enabled" value="${status?'false':'true'}"><label class="field">Message shown during updates<textarea name="message" maxlength="240">${E(platformStatus.message)}</textarea></label><div class="buttons"><button class="btn ${status?'blue':'danger'}" name="enabled" value="${status?'false':'true'}">${status?'Return to Live Mode':'Enable Development Mode'}</button></div></form><p class="hint">Development Mode does not deploy code. GitHub Pages updates continue normally; this switch controls access while you test.</p></div>`+
 `<div class="card"><h2>Import students</h2><p>Upload a CSV or Excel (.xlsx) file with <strong>Name, Registration Number, Password</strong>. Students can then sign in with their registration number. Existing students are enrolled without resetting their password.</p><div class="buttons"><button class="btn outline" data-action="student-template">Download CSV template</button></div><label class="field">Student roster file<input id="student-import-file" type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"></label><p class="hint">Passwords must contain at least 6 characters. Import files are processed only in this browser and sent to the protected administrator service. Delete the source file securely after import.</p></div>`+preview+stats;
}
function parseCSV(text){
 text=text.replace(/^\uFEFF/,'');const rows=[];let row=[],field='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(quoted){if(c==='"'&&text[i+1]==='"'){field+='"';i++}else if(c==='"')quoted=false;else field+=c}
 else if(c==='"')quoted=true;else if(c===','){row.push(field);field=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()))rows.push(row);row=[];field=''}else field+=c}
 if(quoted)throw Error('CSV has an unclosed quote');row.push(field);if(row.some(x=>x.trim()))rows.push(row);return rows;
}
function normalizeImport(rows){
 if(rows.length<2)throw Error('The file needs a header and at least one student');
 const key=x=>String(x||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const header=rows[0].map(key);const n=header.findIndex(x=>x==='name'||x==='studentname'||x==='fullname');const r=header.findIndex(x=>x==='regnumber'||x==='registrationnumber'||x==='registrationno'||x==='regno');const p=header.findIndex(x=>x==='password'||x==='initialpassword');
 if([n,r,p].some(i=>i<0))throw Error('Required columns: Name, Registration Number, Password');
 const items=rows.slice(1).filter(x=>x.some(y=>String(y||'').trim())).map(x=>({name:String(x[n]||'').trim(),registration_no:String(x[r]||'').trim().toUpperCase(),password:String(x[p]||'')}));
 if(items.length>100)throw Error('Import up to 100 students per batch');const seen=new Set();
 for(const [i,x] of items.entries()){if(x.name.length<2||x.name.length>120)throw Error('Invalid name in row '+(i+2));if(!/^[A-Z0-9][A-Z0-9_\/-]{2,39}$/.test(x.registration_no))throw Error('Invalid registration number in row '+(i+2));if(x.password.length<6||x.password.length>128)throw Error('Password must be 6–128 characters in row '+(i+2));if(seen.has(x.registration_no))throw Error('Duplicate registration number: '+x.registration_no);seen.add(x.registration_no)}
 return items;
}
async function readStudentFile(file){
 if(!isAdmin())throw Error('Administrator access required');if(file.size>2_000_000)throw Error('Maximum file size is 2 MB');
 let rows;if(/\.csv$/i.test(file.name))rows=parseCSV(await file.text());
 else if(/\.xlsx$/i.test(file.name)){if(!window.XLSX)throw Error('Excel reader unavailable. Save as CSV and try again.');const book=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});rows=window.XLSX.utils.sheet_to_json(book.Sheets[book.SheetNames[0]],{header:1,raw:false,defval:''})}
 else throw Error('Please select a .csv or .xlsx file');
 importPreview=normalizeImport(rows);importFilename=file.name;importResults=[];state.page='admin';render();
}
function settings(){let h=title('MY ACCOUNT','Settings','Update your details and manage your connected browsers.');
 h+=`<div class="split"><div class="card"><h3>My profile</h3><form data-form="profile" class="fields"><label class="field">Display name<input name="display_name" value="${A(data.me.display_name,100)}" required></label><label class="field">Registration number<input value="${E(data.me.registration_no||'Faculty')}" disabled></label><label class="field">Email<input value="${E(data.me.email||'')}" disabled></label>${!demoMode?'<button class="btn primary">Save profile</button>':'<p class="hint">Demo profile is simulated.</p>'}</form></div><div class="card"><h3>Account and devices</h3>${!demoMode?`<form data-form="password" class="fields"><label class="field">New password<input type="password" name="password" minlength="6" required></label><button class="btn outline">Change password</button></form><h4>Authorized browsers</h4>${data.devices.map(d=>`<div class="list-entry"><span>${A(d.label)}${d.device_id===deviceId()?' · This browser':''}</span><button class="btn small danger" data-action="remove-device" data-id="${E(d.device_id)}">Remove</button></div>`).join('')}`:'<p>Demo mode keeps sample data in local browser storage only.</p>'}<div class="buttons"><button class="btn danger" data-action="logout">${demoMode?'Reset demo':'Sign out'}</button></div></div></div>`;
 if(isFaculty())h+=`<div class="card" style="margin-top:18px"><h3>Enrol a registered student</h3><p>Students register with a verified email and their registration number. Enrol them into this assigned course.</p><form data-form="enroll" class="fields"><label class="field">Student registration number<input name="registration_no" required placeholder="MCA26001"></label><button class="btn blue">Enrol student</button></form></div>`;
 return h;
}
function renderAuth(){const isSign=state.loginMode==='signin',isReset=state.loginMode==='reset';root.innerHTML=`<div class="auth"><img alt="g2r2 Academy" class="auth-logo" src="./assets/academy-logo.webp"><h1>${isReset?'Recover account':isSign?'Welcome back':'Join g2r2 Academy'}</h1><p class="sub">Programming Smart Devices · MCA Semester II</p><div class="card">${platformStatus.maintenance_enabled?'<div class="success">Development Mode is active. Only administrators may access the Academy.</div>':''}<form data-form="${isReset?'reset':isSign?'signin':'signup'}" class="fields">
 ${!isSign&&!isReset?`<label class="field">Full name<input name="display_name" required maxlength="120" autocomplete="name"></label><label class="field">Registration number<input name="registration_no" required maxlength="40" placeholder="MCA26001"></label>`:''}
 <label class="field">${isSign?'Email or registration number':'Verified college email'}<input name="email" ${isSign?'':'type="email"'} required autocomplete="username" placeholder="${isSign?'Email or registration number':'you@college.edu'}"></label>
 ${!isReset?'<label class="field">Password<input name="password" type="password" required minlength="6" autocomplete="'+(isSign?'current-password':'new-password')+'"></label>':''}
 <button class="btn primary">${isReset?'Send recovery email':isSign?'Sign in':'Create student account'}</button></form>
 ${state.authResult?`<div class="success">${E(state.authResult)}</div>`:''}
 <button data-action="auth-switch" data-mode="${isSign?'signup':'signin'}" class="btn outline auth-switch">${isSign?'Create a new student account':'Back to sign in'}</button>
 ${isSign?'<button data-action="auth-switch" data-mode="reset" class="btn auth-switch">Forgot password?</button>':''}
 </div><p class="smallprint" style="text-align:center;margin-top:15px">Faculty access is assigned by an Academy administrator. Account verification is required.</p></div>`}
function renderModal(){const m=state.modal;if(!m)return'';let content='';if(m.startsWith('approve:')){const r=data.requests.find(x=>x.id===m.split(':')[1]);content=`<h2>Approve learning request</h2><p>By default only <strong>${E(rowName(r?.student_id))}</strong> receives access. Additional students are optional; access lasts until manually revoked.</p><form data-form="approve"><input type="hidden" name="request" value="${E(r?.id)}"><label class="field">Additional registration numbers (comma-separated)<input name="recipients" placeholder="Optional"></label><div class="buttons"><button class="btn primary">Approve selected students</button><button type="button" class="btn outline" data-action="close-modal">Cancel</button></div></form>`}
 else if(m.startsWith('student-edit:')){const student=rosterStudent(m.slice('student-edit:'.length));content=student?`<h2>Edit student</h2><p>Update the student's name and registration number. Their password is unchanged.</p><form class="fields" data-form="student-edit"><input type="hidden" name="student_id" value="${E(student.user_id)}"><label class="field">Student name<input name="name" maxlength="120" required value="${E(student.display_name)}"></label><label class="field">Registration number<input name="registration_no" maxlength="40" required value="${E(student.registration_no||'')}"></label><div class="buttons"><button class="btn primary">Save changes</button><button type="button" class="btn outline" data-action="close-modal">Cancel</button></div></form>`:'<p>Student no longer in list.</p>'}
 else if(m.startsWith('student-password:')){const student=rosterStudent(m.slice('student-password:'.length));content=student?`<h2>Reset student password</h2><p>Set a temporary password for <strong>${E(student.display_name)}</strong> (${E(student.registration_no)}). Share it privately; it will not be displayed again.</p><form class="fields" data-form="student-password"><input type="hidden" name="student_id" value="${E(student.user_id)}"><label class="field">Temporary password<input type="password" name="password" minlength="6" maxlength="128" autocomplete="new-password" required></label><div class="buttons"><button class="btn primary">Set password</button><button type="button" class="btn outline" data-action="close-modal">Cancel</button></div></form>`:'<p>Student no longer in list.</p>'}
 else if(m.startsWith('edit:')){const l=data.lessons.find(x=>x.id===m.split(':')[1]),b=material(l)||{};content=`<h2>Edit lesson: ${E(l?.title)}</h2><p>Faculty can update the concept, code and lesson exercise. All material stays hidden from students until unlocked.</p><form data-form="edit"><input type="hidden" name="lesson_id" value="${E(l?.id)}"><label class="field">Concept<textarea name="concept">${E(b.concept||'')}</textarea></label><label class="field">How it works<textarea name="nuance">${E(b.nuance||'')}</textarea></label><label class="field">Code example<textarea name="code" style="min-height:160px">${E(b.code||'')}</textarea></label><label class="field">Activity<textarea name="activity">${E(b.activity||'')}</textarea></label><button class="btn primary">Save lesson</button></form>`}
 else if(m==='create-activity'){content=`<h2>Create a graded activity</h2><p>Answers are stored privately. Choose Quick Check or Arrange Code, then release it during class.</p><form class="fields" data-form="create-activity"><label class="field">Activity type<select name="kind"><option value="quick_check">Quick Check · multiple choice</option><option value="arrange_code">Arrange Code · order fragments</option></select></label><label class="field">Question / instructions<input name="prompt" minlength="8" required placeholder="What does setState do? / Arrange these code lines"></label>${[0,1,2,3].map(i=>`<label class="field">Option or fragment ${i+1}<input name="option${i}" required></label>`).join('')}<label class="field">Correct Quick Check option (ignored for Arrange Code)<select name="correct"><option value="0">Option 1</option><option value="1">Option 2</option><option value="2">Option 3</option><option value="3">Option 4</option></select></label><label class="field">For Arrange Code: correct fragment order (1–4, comma-separated)<input name="order" placeholder="3, 1, 4, 2"></label><label class="field">Explanation<textarea name="explanation"></textarea></label><button class="btn primary">Save activity</button></form>`}
 return `<div class="modal-bg" data-action="close-modal-bg"><div class="modal"><div class="row"><span class="eyebrow">g2r2 Academy</span><button data-action="close-modal" class="btn small outline">✕</button></div>${content}</div></div>`;
}
const actions={
 'open-course':async el=>{const id=el.dataset.id;if(!data.offerings.some(o=>o.id===id))throw Error('Course not assigned to this account');clearStudentSelection();localStorage.setItem('g2r2-offering',id);markCourseVisited(data.me.user_id,id);state.courseEntered=true;state.page='dashboard';await refresh();window.scrollTo(0,0)},
 'join-course':async el=>{const id=el.dataset.id;if(!data.offerings.some(o=>o.id===id))throw Error('Course not assigned to this account');clearStudentSelection();localStorage.setItem('g2r2-offering',id);markCourseVisited(data.me.user_id,id);state.courseEntered=true;state.page='classroom';await refresh();window.scrollTo(0,0)},


 'faculty-rename':async el=>{const f=facultyData.faculty.find(x=>x.user_id===el.dataset.id);const name=prompt('Faculty name',f?.display_name||'');if(name===null)return;await facultyAction('update_faculty',{faculty_id:el.dataset.id,name})},
 'faculty-assign':async el=>{const code=prompt('Course code to assign');if(code===null)return;const c=facultyData.courses.find(x=>x.code===code.trim().toUpperCase());const o=facultyData.offerings.find(x=>x.course_id===c?.id);if(!o)throw Error('Course not found');await facultyAction('assign',{faculty_id:el.dataset.id,offering_id:o.id})},
 'faculty-unassign':async el=>{const code=prompt('Course code to unassign');if(code===null)return;const c=facultyData.courses.find(x=>x.code===code.trim().toUpperCase());const o=facultyData.offerings.find(x=>x.course_id===c?.id);if(!o||!confirm('Remove assignment?'))return;await facultyAction('unassign',{faculty_id:el.dataset.id,offering_id:o.id})},
 'faculty-toggle':async el=>{const f=facultyData.faculty.find(x=>x.user_id===el.dataset.id);if(!f||!confirm((f.account_disabled?'Restore':'Suspend')+' '+f.display_name+'?'))return;await facultyAction(f.account_disabled?'restore_faculty':'suspend_faculty',{faculty_id:f.user_id})},
 'session-date':async el=>{const x=data.sessions.find(s=>s.id===el.dataset.id);const date=prompt('Session date YYYY-MM-DD',x?.session_date||'');if(date===null)return;await api.rpc('academy_update_session_date',{p_session:el.dataset.id,p_date:date});await refresh()},
 'activity-archive':async el=>{if(!confirm('Archive this activity?'))return;await api.rpc('academy_manage_activity',{p_activity:el.dataset.id,p_archive:true});await refresh()},
 'activity-delete':async el=>{if(!confirm('Permanently delete this unreleased activity?'))return;await api.rpc('academy_manage_activity',{p_activity:el.dataset.id,p_archive:false});await refresh()},
 'class-reset':async()=>{const c=data.courses.find(x=>x.id===data.offerings.find(o=>o.id===data.offeringId)?.course_id);const expected='RESET '+c?.code;if(prompt('Delete class history? Type '+expected)!==expected)return;if(!confirm('Final confirmation to reset '+c.code+'?'))return;await api.rpc('academy_admin_reset_class',{p_offering:data.offeringId,p_confirmation:expected});await refresh()},
 'logs-clear':async()=>{if(prompt('Type CLEAR OPERATIONAL LOGS')!=='CLEAR OPERATIONAL LOGS')return;await api.rpc('academy_admin_clear_operational_logs',{p_confirmation:'CLEAR OPERATIONAL LOGS'});await refresh()},

 'student-select-matching':async()=>{await selectAllMatchingStudents()},
 'student-clear-selection':async()=>{clearStudentSelection();render()},
 'student-bulk-apply':async()=>{await applyStudentBulkAction($('#student-bulk-action')?.value||'')},
 'student-refresh':async()=>{await loadStudentRoster();render()},
 'student-search':async()=>{const query=($('#student-search')?.value||'').trim();if(query!==studentSearch)clearStudentSelection();studentSearch=query;studentRoster.page=0;await loadStudentRoster();render()},
 'student-page':async el=>{studentRoster.page=Math.max(0,studentRoster.page+Number(el.dataset.dir));await loadStudentRoster();render()},
 'student-edit':async el=>{state.modal='student-edit:'+el.dataset.id;render()},
 'student-password':async el=>{state.modal='student-password:'+el.dataset.id;render()},
 'student-enroll':async el=>{await manageStudent('enroll',rosterStudent(el.dataset.id))},
 'student-withdraw':async el=>{const student=rosterStudent(el.dataset.id);if(!student)return;if(!confirm(`Remove ${student.display_name} (${student.registration_no}) from this class? Their account and learning history will be kept.`))return;await manageStudent('withdraw',student)},
 'student-suspend':async el=>{const student=rosterStudent(el.dataset.id);if(!student)return;if(!confirm(`Suspend ${student.display_name} (${student.registration_no})? They will not be able to sign in or access Academy content.`))return;await manageStudent('suspend',student)},
 'student-restore':async el=>{await manageStudent('restore',rosterStudent(el.dataset.id))},
 'student-delete':async el=>{const student=rosterStudent(el.dataset.id);if(!student)return;const confirmation=prompt(`PERMANENTLY DELETE ${student.display_name} (${student.registration_no})? This removes the account and all associated learning history and cannot be undone.

Type the exact registration number to confirm:`);if(confirmation===null)return;if(confirmation.trim().toUpperCase()!==student.registration_no){notice('Registration number does not match; nothing deleted');return}if(!confirm('Final confirmation: permanently delete this student and their learning records?'))return;await manageStudent('delete',student,{confirmation})},
 'student-template':async()=>downloadCSV('g2r2-academy-student-import-template.csv',[['Name','Registration Number','Password'],['Sample Student','MCA26001','ReplaceWithSecurePassword']]),
 'clear-import':async()=>{importPreview=[];importFilename='';render()},
 'import-students':async()=>{if(!isAdmin())throw Error('Administrator access required');if(!importPreview.length)throw Error('Choose a file first');if(!confirm('Create and enroll '+importPreview.length+' student accounts?'))return;const response=await api.request('/functions/v1/academy-admin-import',{method:'POST',body:{offering_id:data.offeringId,students:importPreview}});importResults=response.results||[];importPreview=[];importFilename='';await refresh();notice('Student import finished')},

 'manual-unit':async el=>{state.manualUnit=Number(el.dataset.unit);state.manualTopic=null;state.manualSearch='';render();},
 'manual-topic':async el=>{const t=allManualTopics().find(x=>x.id===el.dataset.id);if(!t)return;state.manualTopic=t.id;state.manualUnit=t.unit;state.manualTopicsOpen=false;state.manualSearch='';render();document.getElementById('manual-reader')?.scrollIntoView({block:'start',behavior:'smooth'});},
 'manual-answer':async el=>{const t=allManualTopics().find(x=>x.id===el.dataset.id);if(!t||state.manualAnswers[t.id]!==undefined)return;state.manualAnswers[t.id]=Number(el.dataset.choice);render();},
 'manual-understood':async el=>{const t=allManualTopics().find(x=>x.id===el.dataset.id);if(!t)return;if(manualUnderstood.has(t.id))manualUnderstood.delete(t.id);else manualUnderstood.add(t.id);try{localStorage.setItem(manualProgressKey,JSON.stringify([...manualUnderstood]))}catch{}render();},
 'manual-copy':async el=>{const t=allManualTopics().find(x=>x.id===el.dataset.id);if(!t)return;await navigator.clipboard.writeText(t.code);notice('Program copied');},
 'manual-expand':async()=>{document.querySelectorAll('.manual-reader .manual-fold').forEach(x=>x.open=true);},
 'manual-collapse':async()=>{document.querySelectorAll('.manual-reader .manual-fold').forEach(x=>x.open=false);},
 'manual-toggle-drawer':async()=>{state.manualTopicsOpen=!state.manualTopicsOpen;document.querySelector('.manual-drawer')?.classList.toggle('open',state.manualTopicsOpen);document.querySelector('.manual-scrim')?.classList.toggle('visible',state.manualTopicsOpen);},
 'manual-close-drawer':async()=>{state.manualTopicsOpen=false;document.querySelector('.manual-drawer')?.classList.remove('open');document.querySelector('.manual-scrim')?.classList.remove('visible');},
 'open-manual-for-lesson':async el=>{const l=getLesson(Number(el.dataset.hour));const t=material(l)?.manual_topics?.[0];if(!t)return notice('Manual content is not yet available');state.page='manual';state.manualUnit=t.unit;state.manualTopic=t.id;render();},
 'lab-expand-groups':async()=>{document.querySelectorAll('.lab-group').forEach(x=>x.open=true);},
 'lab-collapse-groups':async()=>{document.querySelectorAll('.lab-group').forEach(x=>x.open=false);},

 'preview-student':async()=>{demo.role='student';state.demoGate=false;sessionStorage.setItem('academy-preview-session','1');saveDemo();await refresh()},
 'preview-faculty':async()=>{demo.role='faculty';state.demoGate=false;sessionStorage.setItem('academy-preview-session','1');saveDemo();await refresh()},
 'open-lab':async el=>{if(!labByNo(Number(el.dataset.lab)))throw Error('Lab not released');state.labNo=Number(el.dataset.lab);state.labTab='aim';previewState={count:0,themeDark:false,route:'home',api:'idle',auth:'out',notes:['Revise Flutter widgets','Practice Dart every day']};state.page='lab';render()},
 'close-lab':async()=>{state.labNo=0;state.labTab='aim';render()},
 'lab-tab':async el=>{state.labTab=el.dataset.tab;render()},
 'lab-section-step':async el=>{const i=labTabs.findIndex(t=>t[0]===state.labTab);const next=labTabs[i+Number(el.dataset.dir)];if(next){state.labTab=next[0];render();document.querySelector('.lab-workspace')?.scrollIntoView({block:'start',behavior:'smooth'})}},
 'lab-step':async el=>{const items=labOrder();const index=items.findIndex(l=>l.experiment_no===state.labNo);const next=items[index+Number(el.dataset.dir)];if(next){state.labNo=next.experiment_no;state.labTab='aim';render()}else{state.labNo=0;render()}},
 'copy-lab':async el=>{const l=labByNo(el.dataset.lab);if(!l)return;await navigator.clipboard.writeText(l.code||'');notice('Lab program copied')},
 'select-all-labs':async()=>{if(!isFaculty())throw Error('Faculty access required');state.selectedLabs=visibleLabs().map(l=>l.id);render()},
 'clear-labs':async()=>{state.selectedLabs=[];render()},
 'single-lab':async el=>{if(!isFaculty())throw Error('Faculty access required');const lab=visibleLabs().find(l=>l.id===el.dataset.lab);if(!lab)throw Error('Lab not found');const open=!data.labUnlocks.some(x=>x.lab_id===lab.id&&!x.revoked_at);if(demoMode){demo.labsUnlocked=open?[...new Set([...demo.labsUnlocked,lab.experiment_no])]:demo.labsUnlocked.filter(n=>n!==lab.experiment_no);saveDemo()}else await api.rpc('academy_bulk_unlock_labs',{p_offering:data.offeringId,p_lab_ids:[lab.id],p_unlock:open,p_scope:'selected'});await refresh();notice(open?'Lab released':'Lab locked')},
 'bulk-labs':async el=>{if(!isFaculty())throw Error('Faculty access required');const scope=el.dataset.scope,open=el.dataset.open==='true';if(!['all','selected'].includes(scope))throw Error('Invalid selection');const ids=scope==='all'?visibleLabs().map(l=>l.id):state.selectedLabs.filter(id=>visibleLabs().some(l=>l.id===id));if(!ids.length)throw Error('Select experiments first');if(scope==='all'&&!window.confirm(`${open?'Unlock':'Lock'} all ${ids.length} practicals?`))return;
  if(demoMode){const nums=visibleLabs().filter(l=>ids.includes(l.id)).map(l=>l.experiment_no);demo.labsUnlocked=open?[...new Set([...demo.labsUnlocked,...nums])]:demo.labsUnlocked.filter(n=>!nums.includes(n));saveDemo()}else await api.rpc('academy_bulk_unlock_labs',{p_offering:data.offeringId,p_lab_ids:scope==='selected'?ids:null,p_unlock:open,p_scope:scope});state.selectedLabs=[];await refresh();notice((open?'Released ':'Locked ')+ids.length+' practicals')},
 'unit':async el=>{const unit=Number(el.dataset.unit),first=accessibleLessons().find(l=>l.unit_no===unit);if(!first&&!isFaculty()){notice('No released lessons in that unit');return;}state.unit=unit;state.hour=first?.teaching_hour||1;state.page='lessons';state.topicsOpen=false;state.filter='';render()},
 'lesson':async el=>{const target=getLesson(Number(el.dataset.hour));if(!target){notice('This lesson is not released');return;}state.hour=target.teaching_hour;state.unit=target.unit_no;state.page='lessons';state.topicsOpen=false;render()},
 'switch-role':async()=>{demo.role=demo.role==='faculty'?'student':'faculty';state.labNo=0;state.labSearch='';saveDemo();await refresh();},
 'toggle-menu':async()=>{state.smallMenu=!state.smallMenu;render();if(state.smallMenu)$('#academy-sidebar .nav button')?.focus()},
 'close-menu':async()=>{state.smallMenu=false;render();$('.mobile-menu')?.focus()},
 'toggle-sidebar':async()=>{state.sidebarCollapsed=!state.sidebarCollapsed;try{localStorage.setItem('g2r2-academy-sidebar-collapsed',state.sidebarCollapsed?'1':'0')}catch{}render();$('.sidebar-toggle-desktop')?.focus()},
 'auth-switch':async el=>{state.loginMode=el.dataset.mode;state.authResult='';render()},
 'close-modal':async()=>{state.modal='';render()},
 'toggle-topics':async()=>{state.topicsOpen=!state.topicsOpen;const panel=$('#lesson-topics');panel?.classList.toggle('open',state.topicsOpen);$('.topics-scrim')?.classList.toggle('visible',state.topicsOpen);$('.topic-float')?.setAttribute('aria-expanded',String(state.topicsOpen));if(state.topicsOpen)panel?.querySelector('button')?.focus();},
 'close-topics':async()=>{state.topicsOpen=false;$('#lesson-topics')?.classList.remove('open');$('.topics-scrim')?.classList.remove('visible');$('.topic-float')?.setAttribute('aria-expanded','false');},
 'select-visible':async()=>{if(!isFaculty())throw Error('Faculty access required');state.selectedLessons=[...new Set([...(state.selectedLessons||[]),...lessonRows().map(l=>l.id)])];render();},
 'clear-selected':async()=>{state.selectedLessons=[];render();},
 'bulk-unlock':async el=>{if(!isFaculty())throw Error('Faculty access required');const scope=el.dataset.scope,unlock=el.dataset.unlock==='true';if(!['selected','unit','all'].includes(scope))throw Error('Invalid release scope');const ids=scope==='selected'?(state.selectedLessons||[]).filter(id=>data.lessons.some(l=>l.id===id)):scope==='unit'?data.lessons.filter(l=>l.unit_no===Number(el.dataset.unit||state.unit)).map(l=>l.id):data.lessons.map(l=>l.id);if(!ids.length){notice('Select at least one lesson');return}if(scope==='all'&&!window.confirm(`${unlock?'Release':'Hide'} all ${ids.length} lessons for students?`))return;
 if(demoMode){const hours=data.lessons.filter(l=>ids.includes(l.id)).map(l=>l.teaching_hour);if(unlock)demo.unlocks=[...new Set([...demo.unlocks,...hours])];else demo.unlocks=demo.unlocks.filter(h=>!hours.includes(h));saveDemo()}
 else await api.rpc('academy_bulk_unlock',{p_offering:data.offeringId,p_scope:scope,p_unlock:unlock,p_lesson_ids:scope==='selected'?ids:null,p_unit_no:scope==='unit'?Number(el.dataset.unit||state.unit):null});
 state.selectedLessons=[];state.topicsOpen=false;await refresh();notice(`${unlock?'Unlocked':'Locked'} ${ids.length} lesson${ids.length===1?'':'s'}`)},
 'toggle-unlock':async el=>{const id=el.dataset.id,l=data.lessons.find(x=>x.id===id),open=!data.unlocks.some(u=>u.lesson_id===id&&!u.revoked_at);if(demoMode){if(open&&!demo.unlocks.includes(l.teaching_hour))demo.unlocks.push(l.teaching_hour);if(!open)demo.unlocks=demo.unlocks.filter(x=>x!==l.teaching_hour);saveDemo()}else await api.rpc('academy_unlock_lesson',{p_offering:data.offeringId,p_lesson:id,p_unlock:open});await refresh();notice(open?'Notes unlocked':'Notes locked')},
 'request-lesson':async el=>{state.page='requests';state.hour=data.lessons.find(l=>l.id===el.dataset.id)?.teaching_hour||state.hour;render()},
 'copy-code':async el=>{const l=data.lessons.find(x=>x.id===el.dataset.id);await navigator.clipboard.writeText(material(l)?.code||'');notice('Code copied')},
 'save-note':async el=>{const l=data.lessons.find(x=>x.id===el.dataset.id),text=$('#personal-note')?.value||'';if(demoMode){demo.notes[l.teaching_hour]=text;saveDemo()}else await api.request('/rest/v1/personal_notes?on_conflict=student_id,lesson_id',{method:'POST',prefer:'resolution=merge-duplicates,return=minimal',body:{student_id:data.me.user_id,lesson_id:l.id,note_text:text,updated_at:isoNow()}});await refresh();notice('Notes saved')},
 'edit-note':async el=>{state.modal='edit:'+el.dataset.id;render()},
 'check-practice':async()=>{state.showHint=true;render()},
 'reset-practice':async()=>{state.showHint=false;render()},
 'start-class':async()=>{let lesson=$('#class-lesson')?.value||state.sessionLesson;const classDate=$('#class-date')?.value||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});if(demoMode){demo.session={id:'session-'+uuid(),offering_id:'offering-demo',lesson_id:lesson,started_at:isoNow(),status:'live'};demo.releases=[];demo.attendance=[];saveDemo()}else await api.rpc('academy_start_class_v2',{p_offering:data.offeringId,p_lesson:lesson,p_date:classDate});state.selectedActivity=null;await refresh();notice('Class started')},
 'end-class':async()=>{let s=liveSession();if(!s)return;if(demoMode){demo.session.status='ended';demo.session.ended_at=isoNow();saveDemo()}else await api.rpc('academy_end_class',{p_session:s.id});await refresh();notice('Class ended')},
 'join-class':async()=>{let s=liveSession();if(!s)return;if(demoMode){if(!myAttendance(s.id))demo.attendance.push({session_id:s.id,student_id:'student-demo',joined_at:isoNow()});saveDemo()}else await api.rpc('academy_join_class',{p_session:s.id,p_device:deviceId()});await refresh();notice('Attendance recorded')},
 'release':async()=>{const s=liveSession(),a=$('#release-select')?.value||getActivityForLesson(data.lessons.find(x=>x.id===s?.lesson_id))[0]?.id;if(!s||!a)throw Error('Choose an activity first');if(demoMode){if(demo.releases.some(r=>r.session_id===s.id&&r.activity_id===a))throw Error('Already released. Select another activity.');demo.releases.push({id:'release-'+uuid(),session_id:s.id,activity_id:a,released_at:isoNow(),revealed_at:null});saveDemo()}else await api.rpc('academy_release_activity',{p_session:s.id,p_activity:a});state.selectedActivity=null;await refresh();notice('Activity released')},
 'select-release':async el=>{state.selectedActivity=el.dataset.id;state.choice=null;state.ordering=[];await loadRevealedAnswer();render()},
 'reveal':async el=>{if(demoMode){demo.releases.find(r=>r.id===el.dataset.id).revealed_at=isoNow();saveDemo()}else await api.rpc('academy_reveal_activity',{p_release:el.dataset.id});await refresh();await loadRevealedAnswer();notice('Answer revealed')},
 'choose':async el=>{state.choice=Number(el.dataset.index);render()},
 'add-order':async el=>{let i=Number(el.dataset.index);if(!state.ordering.includes(i))state.ordering.push(i);render()},
 'reset-order':async()=>{state.ordering=[];render()},
 'submit-attempt':async el=>{const r=data.releases.find(x=>x.id===el.dataset.release),a=data.activities.find(x=>x.id===r?.activity_id);if(!a)throw Error('Activity unavailable');const answer=a.kind==='arrange_code'?state.ordering:state.choice;if(answer===null||Array.isArray(answer)&&answer.length!==a.options.length)throw Error('Complete your answer before submitting');
   if(demoMode){if(demo.attempts.some(t=>t.release_id===r.id&&t.student_id==='student-demo'))throw Error('Only one attempt allowed');demo.attempts.push({id:uuid(),release_id:r.id,student_id:'student-demo',answer,is_correct:JSON.stringify(answer)===JSON.stringify(a.correct),submitted_at:isoNow()});saveDemo()}
   else await api.rpc('academy_submit_attempt',{p_release:r.id,p_answer:answer,p_device:deviceId()});
   state.choice=null;state.ordering=[];await refresh();notice('Answer recorded')},
 'approve-request':async el=>{state.modal='approve:'+el.dataset.id;render()},
 'decline-request':async el=>{if(demoMode){demo.requests.find(r=>r.id===el.dataset.id).status='declined';saveDemo()}else await api.rpc('academy_decide_request',{p_request:el.dataset.id,p_approved:false,p_students:null});await refresh();notice('Request declined')},
 'revoke-grant':async el=>{if(demoMode){demo.grants.find(g=>g.id===el.dataset.id).revoked_at=isoNow();saveDemo()}else await api.rpc('academy_revoke_grant',{p_grant:el.dataset.id});await refresh();notice('Special access revoked')},
 'export-attendance':async()=>downloadCSV('attendance.csv',[['Class','Teaching hour','Student','Registration no.','Joined at'],...data.attendance.map(a=>{const s=data.sessions.find(x=>x.id===a.session_id),l=data.lessons.find(x=>x.id===s?.lesson_id),student=data.profiles.find(x=>x.user_id===a.student_id);return [s?.id,l?.teaching_hour,student?.display_name,student?.registration_no,a.joined_at]})]),
 'export-attempts':async()=>downloadCSV('activity-attempts.csv',[['Session','Student','Registration no.','Submitted at','Correct'],...data.attempts.map(a=>{const r=data.releases.find(x=>x.id===a.release_id),student=data.profiles.find(x=>x.user_id===a.student_id);return [r?.session_id,student?.display_name,student?.registration_no,a.submitted_at,a.is_correct?'Yes':'No']})]),
 'remove-device':async el=>{if(demoMode){notice('Not applicable to demo');return}await api.rpc('academy_release_device',{p_device:el.dataset.id});await refresh();notice('Device removed')},
 'claim-device':async()=>{if(!demoMode){await claimDevice();await refresh()}},
 'maintenance-refresh':async()=>{await checkPlatform();if(api.session&&platformStatus.maintenance_enabled&&!platformStatus.is_admin)maintenanceScreen();else if(api.session)await refresh();else render()},
 'logout':async()=>{clearStudentSelection();if(demoMode){state.demoGate=!!window.ACADEMY_PREVIEW_LOGIN;sessionStorage.removeItem('academy-preview-session');state.page='courses';render();return}else{clearWorkspace();await api.signOut();data=null;state.deviceBlocked=false;render()}},
 'create-activity':async()=>{state.modal='create-activity';render()},
};
async function loadRevealedAnswer(){if(demoMode)return;state.revealAnswers??={};const r=selectedRelease();if(r?.revealed_at){try{state.revealAnswers[r.id]=await api.rpc('academy_revealed_answer',{p_release:r.id})}catch{}}}
function downloadCSV(name,rows){const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replaceAll('"','""').replace(/^[=+\-@]/,'\'$&')+'"').join(',')).join('\r\n');const a=document.createElement('a'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
async function handleForm(form){const val=Object.fromEntries(new FormData(form).entries()),type=form.dataset.form;
 if(type==='faculty-add'){await facultyAction('create_faculty',{name:val.name,email:val.email,password:val.password});notice('Faculty created');return}
 if(type==='course-add'){const r=await facultyAction('create_course',{code:val.code,title:val.title,batch:val.batch,academic_year:val.academic_year,semester:val.semester});localStorage.setItem('g2r2-offering',r.offering_id);await refresh();notice('Course created');return}
 if(type==='course-hour'){await facultyAction('add_lesson',{offering_id:val.offering_id,hour:val.hour,unit:val.unit,title:val.title,chapters:val.chapters});notice('Hour added');return}
 if(type==='student-edit'){const student=rosterStudent(val.student_id);await manageStudent('edit',student,{name:val.name,registration_no:val.registration_no});state.modal='';render();return}
 if(type==='student-password'){const student=rosterStudent(val.student_id);await manageStudent('reset_password',student,{password:val.password});form.reset();state.modal='';render();return}
 if(type==='maintenance'){if(!isAdmin())throw Error('Administrator access required');const enable=val.enabled==='true';if(enable&&!confirm('Enable Development Mode? Students and faculty will temporarily lose access.'))return;platformStatus=await api.rpc('academy_admin_set_maintenance',{p_enabled:enable,p_message:val.message});await refresh();notice(enable?'Development Mode enabled':'Academy is live');return}
 if(type==='signin'){try{await api.signIn(val.email,val.password);clearWorkspace();await checkPlatform();if(platformStatus.account_disabled){await api.signOut();throw Error('Your Academy account is suspended. Contact the administrator.')}if(platformStatus.maintenance_enabled&&!platformStatus.is_admin){maintenanceScreen();return}await claimDevice();await refresh();if(state.page==='students'&&isAdmin()){await loadStudentRoster();render()}finishWorkspaceRestore()}catch(e){state.authResult=e.message;render()}return}
 if(type==='signup'){const r=await api.signUp(val);state.authResult=r.session?'Account created. You may sign in.':'Check your email to verify your account, then sign in.';state.loginMode='signin';render();return}
 if(type==='reset'){await api.resetPassword(val.email);state.authResult='If your email is registered, a recovery link has been sent.';state.loginMode='signin';render();return}
 if(type==='request'){let l=val.lesson_id||null;if(demoMode){demo.requests.unshift({id:'req-'+uuid(),offering_id:data.offeringId,student_id:data.me.user_id,lesson_id:l,request_type:val.request_type,message:val.message,status:'pending',created_at:isoNow()});saveDemo()}
 else await api.insert('learning_requests',{offering_id:data.offeringId,student_id:data.me.user_id,lesson_id:l,request_type:val.request_type,message:val.message});await refresh();notice('Request sent');return}
 if(type==='approve'){const req=data.requests.find(x=>x.id===val.request),nums=val.recipients.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean),ids=[req.student_id];for(const n of nums){const p=data.profiles.find(x=>x.registration_no?.toUpperCase()===n);if(!p)throw Error('Unknown registration number: '+n);if(!ids.includes(p.user_id))ids.push(p.user_id)}
 if(demoMode){demo.requests.find(x=>x.id===req.id).status='approved';for(const id of ids)if(req.lesson_id)demo.grants.push({id:'grant-'+uuid(),student_id:id,offering_id:data.offeringId,lesson_id:req.lesson_id,request_id:req.id,revoked_at:null,expires_at:null});saveDemo()}
 else await api.rpc('academy_decide_request',{p_request:req.id,p_approved:true,p_students:ids});state.modal='';await refresh();notice('Access approved for selected students');return}
 if(type==='revision'){const nums=val.recipients.split(',').map(x=>x.trim().toUpperCase()).filter(Boolean);if(demoMode){demo.revisions.unshift({id:uuid(),offering_id:data.offeringId,title:val.title,content:val.content,released_all:!!val.released_all,created_by:data.me.user_id,updated_at:isoNow()});saveDemo()}
 else {const response=await api.insert('revision_sets',{offering_id:data.offeringId,title:val.title,content:val.content,released_all:!!val.released_all,created_by:data.me.user_id});const revisionId=response?.[0]?.id;
 if(nums.length){const ids=nums.map(n=>{const p=data.profiles.find(x=>x.registration_no?.toUpperCase()===n);if(!p)throw Error('Unknown registration number: '+n);return p.user_id});await api.rpc('academy_revise_recipients',{p_revision:revisionId,p_students:ids})}}
 await refresh();notice('Revision created');return}
 if(type==='edit'){const l=data.lessons.find(x=>x.id===val.lesson_id);const b={...(material(l)||{}),concept:val.concept,nuance:val.nuance,code:val.code,activity:val.activity};if(demoMode){rawLessons[l.teaching_hour-1]={...rawLessons[l.teaching_hour-1],...b};}
 else await api.update('lesson_materials',{lesson_id:'eq.'+l.id},{content:b,updated_at:isoNow()});state.modal='';await refresh();notice('Lesson saved');return}
 if(type==='create-activity'){let options=[val.option0,val.option1,val.option2,val.option3];const kind=val.kind||'quick_check';let correct=Number(val.correct);if(kind==='arrange_code'){
    const order=String(val.order||'').split(',').map(x=>Number(x.trim())-1);
    if(order.length!==4||new Set(order).size!==4||order.some(x=>!Number.isInteger(x)||x<0||x>3))throw Error('Enter four different positions, for example 3,1,4,2');correct=order;}
 if(demoMode){notice('Custom graded authoring requires the live Academy backend.');state.modal='';render();return}
 await api.rpc('academy_create_activity',{p_lesson:liveSession().lesson_id,p_kind:kind,p_prompt:val.prompt,p_options:options,p_correct:correct,p_explanation:val.explanation||''});state.modal='';await refresh();notice('Activity saved');return}
 if(type==='profile'){if(demoMode){notice('Not available in demo');return}await api.update('profiles',{user_id:'eq.'+api.userId},{display_name:val.display_name});await refresh();notice('Profile updated');return}
 if(type==='password'){if(demoMode)return;await api.updatePassword(val.password);notice('Password changed');form.reset();return}
 if(type==='enroll'){if(demoMode){const r=val.registration_no.toUpperCase();if(!demo.enrolled.some(x=>x.registration_no===r))demo.enrolled.push({id:'student-'+uuid(),display_name:'Demo '+r,registration_no:r});saveDemo()}
 else await api.rpc('academy_enroll_by_reg',{p_offering:data.offeringId,p_registration:val.registration_no});await refresh();notice('Student enrolled');return}
}
root.addEventListener('click',async e=>{const demoButton=e.target.closest('[data-demo]');if(demoButton?.dataset?.demo){if(demoButton.dataset.demo!=='theme')e.preventDefault();handlePreviewClick(demoButton);return;}const b=e.target.closest('[data-action],[data-page]');if(!b)return;const action=b.dataset.action;
 if(action==='close-modal-bg'&&e.target!==b)return;
 e.preventDefault();if(state.busy)return;try{
  if(b.dataset.page){if(!isFaculty()&&!state.courseEntered&&!['courses','settings'].includes(b.dataset.page))throw Error('Choose a course first');if(b.dataset.page==='courses')state.courseEntered=false;if(['admin','students','faculty'].includes(b.dataset.page)&&!isAdmin())throw Error('Administrator access required');state.page=b.dataset.page;state.smallMenu=false;state.topicsOpen=false;state.filter='';state.showHint=false;if(state.page==='students'){await loadStudentRoster();}if(state.page==='faculty'){await loadFacultyData();}render();return}
  if(actions[action]){state.busy=true;b.disabled=true;await actions[action](b)}
 }catch(err){notice(err.message||'Something went wrong');render()}finally{state.busy=false}});
root.addEventListener('submit',async e=>{const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();if(state.busy)return;state.busy=true;try{await handleForm(f)}catch(err){notice(err.message||'Unable to save');if(!api?.session){state.authResult=err.message;render()}}finally{state.busy=false}});
function refreshLabPreview(){const l=labByNo(state.labNo);if(!l||labKind(l)!=='flutter')return;const el=document.querySelector('.lab-preview-body');if(el)el.innerHTML=phoneDesign({number:l.experiment_no})}
function handlePreviewClick(b){const action=b.dataset.demo;if(action==='theme')return;
 if(action==='snack'){const x=document.getElementById('demo-feedback');if(x)x.textContent='Keep experimenting! ✓';return}
 if(action==='increment')previewState.count++;
 if(action==='reset')previewState.count=0;
 if(action==='form'){const name=document.getElementById('demo-name')?.value.trim(),email=document.getElementById('demo-email')?.value.trim(),x=document.getElementById('demo-feedback');if(x){x.textContent=!name?'Please enter your name.':!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)?'Enter a valid email.':'Form accepted (preview)!';x.style.color=name&&/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)?'#228360':'#b45c29'}return}
 if(action==='route-open')previewState.route='details';
 if(action==='route-back')previewState.route='home';
 if(action==='route-select')previewState.route='chosen';
 if(action==='api'){previewState.api='loaded';}
 if(action==='signin')previewState.auth='in';
 if(action==='signout')previewState.auth='out';
 if(action==='addnote'){const v=document.getElementById('demo-note')?.value.trim();if(!v)return notice('Enter a note first');previewState.notes.unshift(v.slice(0,90))}
 if(action==='deletenote')previewState.notes.splice(Number(b.dataset.index),1);
 refreshLabPreview();
}

root.addEventListener('change',async e=>{const el=e.target;
 if(el.id==='students-select-page'){for(const student of studentRoster.students||[])selectStudent(student,el.checked);render();return}
 if(el.dataset.selectStudent){selectStudent(rosterStudent(el.dataset.selectStudent),el.checked);render();return}
 if(el.id==='student-status-filter'){clearStudentSelection();studentFilter=el.value;studentRoster.page=0;await loadStudentRoster();render();return}
 if(el.id==='student-import-file'){try{await readStudentFile(el.files?.[0])}catch(err){importPreview=[];notice(err.message||'Cannot read file')}return}
 if(el.id==='demo-dark'){previewState.themeDark=el.checked;refreshLabPreview();return;}
 if(el.dataset.labComplete){if(isFaculty())return;const lab=labByNo(Number(el.dataset.labComplete));if(!lab)return;const done=el.checked;if(demoMode){demo.labDone=done?[...new Set([...demo.labDone,lab.experiment_no])]:demo.labDone.filter(n=>n!==lab.experiment_no);saveDemo()}else await api.request('/rest/v1/lab_completions?on_conflict=offering_id,lab_id,student_id',{method:'POST',body:{offering_id:data.offeringId,lab_id:lab.id,student_id:data.me.user_id,completed:done,completed_at:done?isoNow():null},prefer:'resolution=merge-duplicates,return=minimal'});await refresh();notice(done?'Lab record marked written':'Lab record marked pending');return;}
 if(el.dataset.selectLab){if(!isFaculty())return;state.selectedLabs=el.checked?[...new Set([...state.selectedLabs,el.dataset.selectLab])]:state.selectedLabs.filter(id=>id!==el.dataset.selectLab);render();return;}
 if(el.dataset.selectLesson){if(!isFaculty())return;state.selectedLessons=el.checked?[...new Set([...(state.selectedLessons||[]),el.dataset.selectLesson])]:state.selectedLessons.filter(id=>id!==el.dataset.selectLesson);const c=$('#selected-count');if(c)c.textContent=selectionCount()+' selected';document.querySelectorAll('[data-action="bulk-unlock"][data-scope="selected"]').forEach(b=>b.disabled=!selectionCount());return;}
 if(el.id==='class-lesson'){state.sessionLesson=el.value;render()}
 else if(el.id==='practice-lesson'){state.hour=Number(el.value);state.showHint=false;render()}
 else if(el.id==='release-select'){state.selectedActivity=null}
 else if(el.id==='offering-select'){if(!isFaculty()&&!state.courseEntered)throw Error('Choose a course first');markCourseVisited(data.me.user_id,el.value);clearStudentSelection();localStorage.setItem('g2r2-offering',el.value);await refresh();if(state.page==='students'&&isAdmin()){studentRoster.page=0;await loadStudentRoster();render()}}
});
root.addEventListener('input',e=>{if(e.target.id==='manual-filter'){state.manualSearch=e.target.value;const topics=allManualTopics().filter(t=>manualTopicMatch(t,state.manualSearch));const panel=document.getElementById('manual-results'),mobile=document.getElementById('manual-mobile-results');const results=topics.map(t=>`<button class="manual-index-item" data-action="manual-topic" data-id="${E(t.id)}"><span class="manual-number">${E(t.id)}</span><span>${E(t.title)}</span></button>`).join('')||'<p class="hint">No matching released topics.</p>';if(panel)panel.innerHTML=results;if(mobile)mobile.innerHTML=state.manualSearch.trim()?results:'';return;}if(e.target.id==='lab-filter'){state.labSearch=e.target.value;const cursor=e.target.selectionStart;render();const x=$('#lab-filter');x?.focus();x?.setSelectionRange(cursor,cursor);return;}
 if(e.target.dataset.filter==='lessons'){
 state.filter=e.target.value;
 const items=$('#lesson-index-items');if(items)items.innerHTML=indexListHTML();
 const match=$('#lesson-match-count');if(match)match.textContent=`${lessonRows().length} matching topics${state.filter?' across all units':''}`;
 const results=$('#lesson-search-results');if(results)results.innerHTML=lessonSearchResults();
}});
if(typeof document.addEventListener==='function') document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(state.smallMenu){state.smallMenu=false;render();$('.mobile-menu')?.focus();return}if(state.topicsOpen){state.topicsOpen=false;$('#lesson-topics')?.classList.remove('open');$('.topics-scrim')?.classList.remove('visible');$('.topic-float')?.focus();}if(state.manualTopicsOpen){state.manualTopicsOpen=false;document.querySelector('.manual-drawer')?.classList.remove('open');document.querySelector('.manual-scrim')?.classList.remove('visible');}}});

init();