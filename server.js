// EduSphere ERP backend - Express + SQLite + JWT
const express=require('express'),path=require('path'),fs=require('fs'),crypto=require('crypto');
const {DatabaseSync}=require('node:sqlite'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),multer=require('multer'),helmet=require('helmet'),rateLimit=require('express-rate-limit');
const DATA=path.join(__dirname,'data'),UP=path.join(DATA,'uploads');fs.mkdirSync(UP,{recursive:true});
const db=new DatabaseSync(path.join(DATA,'erp.db'));db.exec('PRAGMA journal_mode=WAL;PRAGMA foreign_keys=ON;');
const SF=path.join(DATA,'secret.key');
const SECRET=process.env.JWT_SECRET||(fs.existsSync(SF)?fs.readFileSync(SF,'utf8'):(fs.writeFileSync(SF,crypto.randomBytes(48).toString('hex')),fs.readFileSync(SF,'utf8')));
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,role TEXT NOT NULL,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password_hash TEXT NOT NULL,phone TEXT,gender TEXT,dob TEXT,address TEXT,photo TEXT,
 course TEXT,year TEXT,semester TEXT,section TEXT,roll_no TEXT,guardian TEXT,department TEXT,designation TEXT,qualification TEXT,joining_date TEXT,subject TEXT,created_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS routines(id INTEGER PRIMARY KEY,course TEXT,year TEXT,day INTEGER,period INTEGER,time TEXT,subject TEXT,teacher TEXT);
CREATE TABLE IF NOT EXISTS exams(id INTEGER PRIMARY KEY,course TEXT,year TEXT,subject TEXT,exam_date TEXT,exam_time TEXT,room TEXT);
CREATE TABLE IF NOT EXISTS attendance(student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,date TEXT,status TEXT,marked_by INTEGER,PRIMARY KEY(student_id,date));
CREATE TABLE IF NOT EXISTS results(id INTEGER PRIMARY KEY,student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,semester TEXT,subject TEXT,max_marks REAL,obtained REAL,UNIQUE(student_id,semester,subject));
CREATE TABLE IF NOT EXISTS fees(id INTEGER PRIMARY KEY,student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,description TEXT,amount REAL,due_date TEXT,status TEXT DEFAULT 'Pending',paid_on TEXT,receipt_no TEXT);
CREATE TABLE IF NOT EXISTS notices(id INTEGER PRIMARY KEY,title TEXT,category TEXT,body TEXT,created_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS assignments(id INTEGER PRIMARY KEY,title TEXT,subject TEXT,course TEXT,year TEXT,due_date TEXT,created_by INTEGER);
CREATE TABLE IF NOT EXISTS submissions(id INTEGER PRIMARY KEY,assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,filename TEXT,original TEXT,submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(assignment_id,student_id));
CREATE TABLE IF NOT EXISTS feedback(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,rating INTEGER,message TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS downloads(id INTEGER PRIMARY KEY,title TEXT,filename TEXT,original TEXT,uploaded_by INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP);`);
// first run: default admin
if(!db.prepare("SELECT 1 FROM users WHERE role='admin'").get()){
 db.prepare("INSERT INTO users(role,name,email,password_hash,phone) VALUES('admin','Administrator','admin@edusphere.com',?,'')").run(bcrypt.hashSync('Admin@123',10));
 console.log('\n*** Default admin created: admin@edusphere.com / Admin@123  (change this password after logging in) ***\n');
}
const app=express();app.set('trust proxy',1);
app.use(helmet({contentSecurityPolicy:false,crossOriginResourcePolicy:false}));
app.use(express.json({limit:'1mb'}));
const A=(...roles)=>(req,res,next)=>{try{const p=jwt.verify((req.headers.authorization||'').slice(7),SECRET),u=db.prepare('SELECT * FROM users WHERE id=?').get(p.id);if(!u)throw 0;u.course=u.course||'';u.year=u.year||'';req.user=u}catch(e){return res.status(401).json({error:'Please log in'})}
 if(roles.length&&!roles.includes(req.user.role))return res.status(403).json({error:'You do not have permission'});next()};
const pub=u=>{if(!u)return u;const{password_hash,...r}=u;return r};
const bad=(res,m,c=400)=>res.status(c).json({error:m});
const today=()=>new Date().toISOString().slice(0,10);
const ALLOWED=/\.(pdf|docx?|xlsx?|pptx?|jpe?g|png|zip|txt|csv)$/i;
const up=multer({storage:multer.diskStorage({destination:UP,filename:(q,f,cb)=>cb(null,crypto.randomBytes(12).toString('hex')+path.extname(f.originalname).toLowerCase())}),limits:{fileSize:10*1024*1024},fileFilter:(q,f,cb)=>cb(ALLOWED.test(f.originalname)?null:new Error('This file type is not allowed'),ALLOWED.test(f.originalname))});
const sendFile=(res,fn,orig)=>{const p=path.join(UP,path.basename(fn||''));fs.existsSync(p)?res.download(p,orig):bad(res,'File not found',404)};

// ---------- AUTH ----------
const lim=rateLimit({windowMs:15*60*1000,max:30,message:{error:'Too many attempts. Please try again in 15 minutes'}});
app.post('/api/auth/login',lim,(req,res)=>{const{email='',password='',role=''}=req.body||{};
 const u=db.prepare('SELECT * FROM users WHERE email=? AND role=?').get(String(email).trim().toLowerCase(),role);
 if(!u||!bcrypt.compareSync(String(password),u.password_hash))return bad(res,'Incorrect email or password',401);
 res.json({token:jwt.sign({id:u.id},SECRET,{expiresIn:'30d'}),user:pub(u)})});
app.get('/api/auth/me',A(),(req,res)=>res.json({user:pub(req.user)}));
app.put('/api/me',A(),(req,res)=>{const{phone,address,photo}=req.body||{};
 if(photo&&(!/^data:image\/(jpeg|png|webp);base64,/.test(photo)||photo.length>400000))return bad(res,'Photo is invalid or too large');
 db.prepare('UPDATE users SET phone=COALESCE(?,phone),address=COALESCE(?,address),photo=COALESCE(?,photo) WHERE id=?').run(phone??null,address??null,photo??null,req.user.id);
 res.json({user:pub(db.prepare('SELECT * FROM users WHERE id=?').get(req.user.id))})});
app.post('/api/me/password',A(),(req,res)=>{const{old='',password=''}=req.body||{};
 if(!bcrypt.compareSync(old,req.user.password_hash))return bad(res,'Current password is incorrect');
 if(password.length<6)return bad(res,'New password must be at least 6 characters');
 db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(password,10),req.user.id);res.json({ok:1})});

// ---------- USERS (admin: staff+student, staff: students only) ----------
const COLS=['name','email','phone','gender','dob','address','photo','course','year','semester','section','roll_no','guardian','department','designation','qualification','joining_date','subject'];
const canManage=(me,role)=>me.role==='admin'?['student','staff'].includes(role):(me.role==='staff'&&role==='student');
app.get('/api/users',A('admin','staff'),(req,res)=>{const r=req.query.role==='staff'?'staff':'student';
 if(!canManage(req.user,r))return bad(res,'You do not have permission',403);
 res.json({users:db.prepare('SELECT * FROM users WHERE role=? ORDER BY name').all(r).map(pub)})});
const clean=b=>{const o={};COLS.forEach(k=>{if(b[k]!==undefined)o[k]=String(b[k]).trim().slice(0,300)});if(o.email)o.email=o.email.toLowerCase();
 if(o.photo!==undefined&&o.photo!==''&&(!/^data:image\/(jpeg|png|webp);base64,/.test(o.photo)||o.photo.length>400000))delete o.photo;return o};
app.post('/api/users',A('admin','staff'),(req,res)=>{const b=req.body||{},role=b.role;
 if(!canManage(req.user,role))return bad(res,'You do not have permission to add this role',403);
 const d=clean(b);if(!d.name||!d.email||!d.phone||!b.password)return bad(res,'Name, email, password and phone are required');
 if(!/^\S+@\S+\.\S+$/.test(d.email))return bad(res,'Email address is not valid');if(String(b.password).length<6)return bad(res,'Password must be at least 6 characters');
 if(db.prepare('SELECT 1 FROM users WHERE email=?').get(d.email))return bad(res,'This email already exists');
 const k=['role','password_hash','created_by',...Object.keys(d)];
 const r=db.prepare(`INSERT INTO users(${k}) VALUES(${k.map(()=>'?')})`).run(role,bcrypt.hashSync(String(b.password),10),req.user.id,...Object.values(d));
 res.json({user:pub(db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid))})});
app.put('/api/users/:id',A('admin','staff'),(req,res)=>{const t=db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
 if(!t||!canManage(req.user,t.role))return bad(res,'You do not have permission',403);
 const d=clean(req.body||{});if(d.email&&db.prepare('SELECT 1 FROM users WHERE email=? AND id<>?').get(d.email,t.id))return bad(res,'This email already exists');
 const k=Object.keys(d);if(k.length)db.prepare(`UPDATE users SET ${k.map(x=>x+'=?')} WHERE id=?`).run(...Object.values(d),t.id);
 if(req.body.password){if(String(req.body.password).length<6)return bad(res,'Password must be at least 6 characters');db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(String(req.body.password),10),t.id)}
 res.json({ok:1})});
app.delete('/api/users/:id',A('admin'),(req,res)=>{const t=db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
 if(!t||t.role==='admin')return bad(res,'This user cannot be deleted');db.prepare('DELETE FROM users WHERE id=?').run(t.id);res.json({ok:1})});

// ---------- DASHBOARD ----------
const pct=(sid)=>{const r=db.prepare("SELECT COUNT(*) n,SUM(status='Present') p FROM attendance WHERE student_id=?").get(sid);return r.n?Math.round(100*r.p/r.n):0};
app.get('/api/dashboard',A(),(req,res)=>{const u=req.user,c=q=>db.prepare(q).get(...(c.a||[]));let stats=[];const n=(q,...a)=>db.prepare(q).get(...a).n;
 const notices=db.prepare('SELECT title,category,created_at FROM notices ORDER BY id DESC LIMIT 4').all();
 let chart=db.prepare(`SELECT substr(date,1,7) m,ROUND(100.0*SUM(status='Present')/COUNT(*)) p FROM attendance ${u.role==='student'?'WHERE student_id='+u.id:''} GROUP BY m ORDER BY m DESC LIMIT 6`).all().reverse();
 if(u.role==='student'){stats=[['My Attendance',pct(u.id)+'%'],['Fees Pending','₹ '+(db.prepare("SELECT COALESCE(SUM(amount),0) s FROM fees WHERE student_id=? AND status='Pending'").get(u.id).s)],
  ['Upcoming Exams',n('SELECT COUNT(*) n FROM exams WHERE course=? AND year=? AND exam_date>=?',u.course,u.year,today())],
  ['Pending Assignments',n('SELECT COUNT(*) n FROM assignments a WHERE course=? AND year=? AND NOT EXISTS(SELECT 1 FROM submissions s WHERE s.assignment_id=a.id AND s.student_id=?)',u.course,u.year,u.id)]]}
 else if(u.role==='staff'){const d=new Date().getDay()||7;stats=[['Classes Today',n('SELECT COUNT(*) n FROM routines WHERE day=?',d)],['Students',n("SELECT COUNT(*) n FROM users WHERE role='student'")],['My Assignments',n('SELECT COUNT(*) n FROM assignments WHERE created_by=?',u.id)],['Notices',n('SELECT COUNT(*) n FROM notices')]]}
 else{const a=db.prepare("SELECT COUNT(*) n,SUM(status='Present') p FROM attendance WHERE date=?").get(today());
  stats=[['Total Students',n("SELECT COUNT(*) n FROM users WHERE role='student'")],['Total Staff',n("SELECT COUNT(*) n FROM users WHERE role='staff'")],
  ['Fees Collected','₹ '+db.prepare("SELECT COALESCE(SUM(amount),0) s FROM fees WHERE status='Paid'").get().s],['Fees Pending','₹ '+db.prepare("SELECT COALESCE(SUM(amount),0) s FROM fees WHERE status='Pending'").get().s],['Today Attendance',a.n?Math.round(100*a.p/a.n)+'%':'-']]}
 res.json({stats,chart,notices})});

// ---------- ROUTINES / EXAMS (admin) ----------
const own=u=>u.role==='student'?[u.course,u.year]:null;
const list=(table,order)=>(req,res)=>{const o=own(req.user),c=o?o[0]:req.query.course||'%',y=o?o[1]:req.query.year||'%';
 res.json({rows:db.prepare(`SELECT * FROM ${table} WHERE course LIKE ? AND year LIKE ? ORDER BY ${order}`).all(c,y)})};
app.get('/api/routines',A(),list('routines','day,period'));
app.post('/api/routines',A('admin'),(req,res)=>{const b=req.body||{};if(!b.course||!b.year||!b.day||!b.subject)return bad(res,'Course, year, day and subject are required');
 db.prepare('INSERT INTO routines(course,year,day,period,time,subject,teacher) VALUES(?,?,?,?,?,?,?)').run(b.course,b.year,+b.day,+b.period||1,b.time||'',b.subject,b.teacher||'');res.json({ok:1})});
app.delete('/api/routines/:id',A('admin'),(req,res)=>{db.prepare('DELETE FROM routines WHERE id=?').run(req.params.id);res.json({ok:1})});
app.get('/api/exams',A(),list('exams','exam_date'));
app.post('/api/exams',A('admin','staff'),(req,res)=>{const b=req.body||{};if(!b.course||!b.year||!b.subject||!b.exam_date)return bad(res,'Course, year, subject and date are required');
 db.prepare('INSERT INTO exams(course,year,subject,exam_date,exam_time,room) VALUES(?,?,?,?,?,?)').run(b.course,b.year,b.subject,b.exam_date,b.exam_time||'',b.room||'');res.json({ok:1})});
app.delete('/api/exams/:id',A('admin','staff'),(req,res)=>{db.prepare('DELETE FROM exams WHERE id=?').run(req.params.id);res.json({ok:1})});

// ---------- ATTENDANCE ----------
app.get('/api/attendance/me',A('student'),(req,res)=>{const m=/^\d{4}-\d{2}$/.test(req.query.month||'')?req.query.month:today().slice(0,7);
 res.json({rows:db.prepare('SELECT date,status FROM attendance WHERE student_id=? AND date LIKE ?').all(req.user.id,m+'%'),percent:pct(req.user.id)})});
app.get('/api/attendance',A('admin','staff'),(req,res)=>{const d=/^\d{4}-\d{2}-\d{2}$/.test(req.query.date||'')?req.query.date:today();
 res.json({date:d,rows:db.prepare("SELECT u.id,u.name,u.roll_no,u.course,u.year,a.status FROM users u LEFT JOIN attendance a ON a.student_id=u.id AND a.date=? WHERE u.role='student' AND u.course LIKE ? AND u.year LIKE ? ORDER BY u.name").all(d,req.query.course||'%',req.query.year||'%')})});
app.post('/api/attendance',A('admin','staff'),(req,res)=>{const{date,records}=req.body||{};if(!/^\d{4}-\d{2}-\d{2}$/.test(date||'')||!Array.isArray(records))return bad(res,'Date or records are invalid');
 const s=db.prepare('INSERT INTO attendance(student_id,date,status,marked_by) VALUES(?,?,?,?) ON CONFLICT(student_id,date) DO UPDATE SET status=excluded.status,marked_by=excluded.marked_by');
 db.exec('BEGIN');try{records.forEach(r=>['Present','Absent','Leave'].includes(r.status)&&s.run(+r.student_id,date,r.status,req.user.id));db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}res.json({ok:1})});

// ---------- RESULTS ----------
app.get('/api/results/me',A('student'),(req,res)=>res.json({rows:db.prepare('SELECT * FROM results WHERE student_id=? ORDER BY semester,subject').all(req.user.id)}));
app.get('/api/results/summary',A('admin','staff'),(req,res)=>res.json({rows:db.prepare("SELECT u.id,u.name,u.course,u.year,r.semester,ROUND(100.0*SUM(r.obtained)/SUM(r.max_marks),1) percent,COUNT(r.id) subjects FROM users u JOIN results r ON r.student_id=u.id GROUP BY u.id,r.semester ORDER BY u.name").all()}));
app.post('/api/results',A('admin','staff'),(req,res)=>{const b=req.body||{};if(!b.student_id||!b.semester||!b.subject||b.obtained===undefined)return bad(res,'Student, semester, subject and marks are required');
 const mx=+b.max_marks||100,ob=+b.obtained;if(!(ob>=0&&ob<=mx))return bad(res,'Marks must be between 0 and the maximum');
 db.prepare('INSERT INTO results(student_id,semester,subject,max_marks,obtained) VALUES(?,?,?,?,?) ON CONFLICT(student_id,semester,subject) DO UPDATE SET max_marks=excluded.max_marks,obtained=excluded.obtained').run(+b.student_id,String(b.semester),b.subject,mx,ob);res.json({ok:1})});

// ---------- FEES ----------
app.get('/api/fees/me',A('student'),(req,res)=>res.json({rows:db.prepare('SELECT * FROM fees WHERE student_id=? ORDER BY due_date DESC').all(req.user.id),student:pub(req.user)}));
app.get('/api/fees',A('admin'),(req,res)=>res.json({rows:db.prepare('SELECT f.*,u.name,u.course,u.roll_no FROM fees f JOIN users u ON u.id=f.student_id ORDER BY f.id DESC').all()}));
app.post('/api/fees',A('admin'),(req,res)=>{const b=req.body||{};if(!b.student_id||!b.description||!(+b.amount>0))return bad(res,'Student, description and amount are required');
 db.prepare('INSERT INTO fees(student_id,description,amount,due_date) VALUES(?,?,?,?)').run(+b.student_id,b.description,+b.amount,b.due_date||'');res.json({ok:1})});
app.put('/api/fees/:id/pay',A('admin'),(req,res)=>{db.prepare("UPDATE fees SET status='Paid',paid_on=?,receipt_no=? WHERE id=? AND status<>'Paid'").run(today(),'RCPT-'+Date.now().toString().slice(-8),req.params.id);res.json({ok:1})});
app.delete('/api/fees/:id',A('admin'),(req,res)=>{db.prepare('DELETE FROM fees WHERE id=?').run(req.params.id);res.json({ok:1})});

// ---------- NOTICES / FEEDBACK ----------
app.get('/api/notices',A(),(req,res)=>res.json({rows:db.prepare('SELECT * FROM notices ORDER BY id DESC').all()}));
app.post('/api/notices',A('admin','staff'),(req,res)=>{const b=req.body||{};if(!b.title)return bad(res,'Title is required');
 db.prepare('INSERT INTO notices(title,category,body,created_by) VALUES(?,?,?,?)').run(b.title,['Urgent','General','Holiday'].includes(b.category)?b.category:'General',b.body||'',req.user.id);res.json({ok:1})});
app.delete('/api/notices/:id',A('admin','staff'),(req,res)=>{const n=db.prepare('SELECT * FROM notices WHERE id=?').get(req.params.id);
 if(!n||(req.user.role==='staff'&&n.created_by!==req.user.id))return bad(res,'You do not have permission',403);db.prepare('DELETE FROM notices WHERE id=?').run(n.id);res.json({ok:1})});
app.post('/api/feedback',A(),(req,res)=>{const r=+req.body.rating;if(!(r>=1&&r<=5))return bad(res,'Please choose a rating from 1 to 5');
 db.prepare('INSERT INTO feedback(user_id,rating,message) VALUES(?,?,?)').run(req.user.id,r,String(req.body.message||'').slice(0,1000));res.json({ok:1})});
app.get('/api/feedback',A('admin'),(req,res)=>res.json({rows:db.prepare('SELECT f.*,u.name,u.role FROM feedback f JOIN users u ON u.id=f.user_id ORDER BY f.id DESC').all()}));

// ---------- ASSIGNMENTS ----------
app.get('/api/assignments',A(),(req,res)=>{const u=req.user;
 res.json({rows:u.role==='student'?db.prepare('SELECT a.*,s.id sub_id,s.submitted_at FROM assignments a LEFT JOIN submissions s ON s.assignment_id=a.id AND s.student_id=? WHERE a.course=? AND a.year=? ORDER BY a.due_date').all(u.id,u.course,u.year)
 :db.prepare('SELECT a.*,(SELECT COUNT(*) FROM submissions s WHERE s.assignment_id=a.id) subs FROM assignments a ORDER BY a.due_date').all()})});
app.post('/api/assignments',A('admin','staff'),(req,res)=>{const b=req.body||{};if(!b.title||!b.course||!b.year)return bad(res,'Title, course and year are required');
 db.prepare('INSERT INTO assignments(title,subject,course,year,due_date,created_by) VALUES(?,?,?,?,?,?)').run(b.title,b.subject||'',b.course,b.year,b.due_date||'',req.user.id);res.json({ok:1})});
app.delete('/api/assignments/:id',A('admin','staff'),(req,res)=>{db.prepare('DELETE FROM assignments WHERE id=?').run(req.params.id);res.json({ok:1})});
app.post('/api/assignments/:id/submit',A('student'),up.single('file'),(req,res)=>{if(!req.file)return bad(res,'Please choose a file');
 const a=db.prepare('SELECT * FROM assignments WHERE id=? AND course=? AND year=?').get(req.params.id,req.user.course,req.user.year);if(!a)return bad(res,'Assignment not found',404);
 db.prepare("INSERT INTO submissions(assignment_id,student_id,filename,original) VALUES(?,?,?,?) ON CONFLICT(assignment_id,student_id) DO UPDATE SET filename=excluded.filename,original=excluded.original,submitted_at=CURRENT_TIMESTAMP").run(a.id,req.user.id,req.file.filename,req.file.originalname);res.json({ok:1})});
app.get('/api/assignments/:id/submissions',A('admin','staff'),(req,res)=>res.json({rows:db.prepare('SELECT s.id,s.original,s.submitted_at,u.name,u.roll_no FROM submissions s JOIN users u ON u.id=s.student_id WHERE s.assignment_id=?').all(req.params.id)}));
app.get('/api/submissions/:id/file',A('admin','staff'),(req,res)=>{const s=db.prepare('SELECT * FROM submissions WHERE id=?').get(req.params.id);s?sendFile(res,s.filename,s.original):bad(res,'Not found',404)});

// ---------- DOWNLOADS ----------
app.get('/api/downloads',A(),(req,res)=>res.json({rows:db.prepare('SELECT id,title,original,created_at FROM downloads ORDER BY id DESC').all()}));
app.post('/api/downloads',A('admin','staff'),up.single('file'),(req,res)=>{if(!req.file)return bad(res,'Please choose a file');
 db.prepare('INSERT INTO downloads(title,filename,original,uploaded_by) VALUES(?,?,?,?)').run(req.body.title||req.file.originalname,req.file.filename,req.file.originalname,req.user.id);res.json({ok:1})});
app.get('/api/downloads/:id/file',A(),(req,res)=>{const d=db.prepare('SELECT * FROM downloads WHERE id=?').get(req.params.id);d?sendFile(res,d.filename,d.original):bad(res,'Not found',404)});
app.delete('/api/downloads/:id',A('admin','staff'),(req,res)=>{const d=db.prepare('SELECT * FROM downloads WHERE id=?').get(req.params.id);if(d){fs.rmSync(path.join(UP,path.basename(d.filename)),{force:true});db.prepare('DELETE FROM downloads WHERE id=?').run(d.id)}res.json({ok:1})});

app.use(express.static(path.join(__dirname,'public')));
app.use('/api',(q,res)=>bad(res,'Route not found',404));
app.use((e,q,res,n)=>bad(res,e.message||'Server error',e.status||400));
const PORT=process.env.PORT||3000;app.listen(PORT,()=>console.log('EduSphere ERP is running at http://localhost:'+PORT));
