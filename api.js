// Browser-only Supabase REST adapter: publishable key, Auth tokens and server-enforced RLS.
// Does not trust user_metadata for roles; all authorization lives in Postgres.
const K='g2r2-academy-session-v1';
export class AcademyApi {
  constructor(config){this.base=config.supabaseUrl.replace(/\/$/,'');this.key=config.supabasePublishableKey;this.session=null;try{this.session=JSON.parse(localStorage.getItem(K)||'null')}catch{}}
  get userId(){return this.session?.user?.id||null}
  async request(path,{method='GET',body=null,authorized=true,query=null,prefer=null}={}){
    if(authorized) await this.ensureToken();
    let url=this.base+path;if(query){const q=new URLSearchParams(query);url+='?'+q}
    const headers={'apikey':this.key,'Content-Type':'application/json'};
    if(authorized&&this.session?.access_token)headers.Authorization='Bearer '+this.session.access_token;
    if(prefer)headers.Prefer=prefer;
    const response=await fetch(url,{method,headers,body:body===null?undefined:JSON.stringify(body)});
    const txt=await response.text();let data=null;try{data=txt?JSON.parse(txt):null}catch{data=txt}
    if(!response.ok){const message=(typeof data==='object'&&(data.message||data.msg||data.error_description||data.error))||`Request failed (${response.status})`;throw new Error(String(message))}
    return data;
  }
  async ensureToken(){if(!this.session?.refresh_token)return;if((this.session.expires_at||0)*1000-Date.now()>100000)return;
    try {const result=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:this.session.refresh_token},authorized:false});this.setSession(result)}catch{this.session=null;localStorage.removeItem(K);throw new Error('Session expired. Sign in again.')}}
  setSession(s){this.session={...s,expires_at:s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600)};localStorage.setItem(K,JSON.stringify(this.session))}
  async signIn(identifier,password){const isEmail=identifier.includes('@');const r=await this.request(isEmail?'/auth/v1/token?grant_type=password':'/functions/v1/academy-reg-login',{
    method:'POST',authorized:false,body:isEmail?{email:identifier.trim(),password}:{registration_no:identifier.trim().toUpperCase(),password}});
    if(!r.access_token)throw new Error('Email confirmation required, or registration-number login is not configured.');this.setSession(r);return r}
  async signUp({email,registration_no,display_name,password}){return this.request('/auth/v1/signup',{method:'POST',authorized:false,body:{email,password,data:{registration_no:registration_no.trim().toUpperCase(),display_name:display_name.trim()}}})}
  async resetPassword(email){return this.request('/auth/v1/recover',{method:'POST',authorized:false,body:{email}})}
  async signOut(){try{await this.request('/auth/v1/logout',{method:'POST'})}catch{}this.session=null;localStorage.removeItem(K)}
  async table(name,params={}){return this.request('/rest/v1/'+name,{query:{select:'*',...params}})}
  async insert(name,data){return this.request('/rest/v1/'+name,{method:'POST',body:data,query:{select:'*'},prefer:'return=representation'})}
  async update(name,query,data){return this.request('/rest/v1/'+name,{method:'PATCH',body:data,query,prefer:'return=minimal'})}
  async updatePassword(password){return this.request('/auth/v1/user',{method:'PUT',body:{password}})}
  async rpc(name,args){return this.request('/rest/v1/rpc/'+name,{method:'POST',body:args})}
  async load(){
    const self=(await this.table('profiles',{'user_id':'eq.'+this.userId}))[0];if(!self)throw new Error('No Academy profile exists for this account.');
    const [offerings,courses]=await Promise.all([this.table('offerings',{order:'created_at.desc'}),this.table('courses')]);
    const available=offerings.filter(o=>courses.some(c=>c.id===o.course_id));
    let selected=localStorage.getItem('g2r2-offering');if(!available.some(o=>o.id===selected))selected=available[0]?.id||null;
    let course=available.find(o=>o.id===selected);let labs=[],labUnlocks=[],labCompletions=[],lessons=[],materials=[],unlocks=[],sessions=[],attendance=[],activities=[],releases=[],attempts=[],requests=[],grants=[],revisions=[],enrollments=[],profiles=[],notes=[],devices=[];
    devices=await this.table('registered_devices');
    if(course){
      const courseLessons=await this.table('lessons',{'course_id':'eq.'+course.course_id,order:'teaching_hour.asc'});lessons=courseLessons;
      const items=await Promise.all([
        this.table('lab_practicals',{'course_id':'eq.'+course.course_id,order:'experiment_no.asc'}),this.table('lab_unlocks',{'offering_id':'eq.'+selected}),this.table('lab_completions',{'offering_id':'eq.'+selected}),
        this.table('lesson_materials'),this.table('lesson_unlocks',{'offering_id':'eq.'+selected}),
        this.table('class_sessions',{'offering_id':'eq.'+selected,order:'started_at.desc',limit:'40'}),
        this.table('activities'),this.table('activity_releases'),this.rpc('academy_list_attempts',{p_offering:selected}),
        this.table('learning_requests',{'offering_id':'eq.'+selected,order:'created_at.desc'}),
        this.table('access_grants',{'offering_id':'eq.'+selected}),
        this.table('revision_sets',{'offering_id':'eq.'+selected}),
        this.table('enrollments',{'offering_id':'eq.'+selected}),
        this.table('profiles'),this.table('personal_notes'),this.table('attendance')]);
      [labs,labUnlocks,labCompletions,materials,unlocks,sessions,activities,releases,attempts,requests,grants,revisions,enrollments,profiles,notes,attendance]=items;
    }
    return {me:self,offerings:available,courses,offeringId:selected,labs,labUnlocks,labCompletions,lessons,materials,unlocks,sessions,attendance,activities,releases,attempts,requests,grants,revisions,enrollments,profiles,notes,devices};
  }
}