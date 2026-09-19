const express=require("express"),multer=require("multer"),path=require("path"),fs=require("fs"),crypto=require("crypto"),{spawn}=require("child_process");
const app=express(),PORT=process.env.PORT||3000,ROOT=__dirname,JOBS="/app/jobs";
fs.mkdirSync(JOBS,{recursive:true});
const upload=multer({dest:"/tmp/web2apk-upload",limits:{fileSize:5*1024*1024},fileFilter:(r,f,c)=>/^image\/(png|jpeg|webp)$/.test(f.mimetype)?c(null,true):c(new Error("PNG/JPG/WEBP uniquement."))});
app.use(express.static(path.join(ROOT,"public")));
const safe=s=>String(s||"Web App").replace(/[^a-zA-Z0-9 _-]/g,"").trim().slice(0,30)||"Web App";
const pkg=s=>"com.kawaki227.web2apk."+safe(s).toLowerCase().replace(/[^a-z0-9]/g,"").slice(0,18);
function cmd(c,a,cwd){return new Promise((ok,no)=>{let o="";let p=spawn(c,a,{cwd,env:process.env});p.stdout.on("data",d=>o+=d);p.stderr.on("data",d=>o+=d);p.on("close",x=>x?no(Error(o.slice(-5000)||"Build error")):ok(o))})}
function project(d,url,name,id){
 let p=pkg(name),src=path.join(d,"app/src/main/java",p.replace(/\./g,"/")),rv=path.join(d,"app/src/main/res");
 fs.mkdirSync(src,{recursive:true});["drawable","values"].forEach(x=>fs.mkdirSync(path.join(rv,x),{recursive:true}));
 fs.writeFileSync(path.join(d,"settings.gradle"),`pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }\nrootProject.name="WEB2APK"; include(":app")`);
 fs.writeFileSync(path.join(d,"build.gradle"),`plugins { id 'com.android.application' version '8.7.3' apply false }`);
 fs.writeFileSync(path.join(d,"gradle.properties"),"org.gradle.jvmargs=-Xmx1536m\nandroid.useAndroidX=true\n");
 fs.mkdirSync(path.join(d,"app"),{recursive:true});
 fs.writeFileSync(path.join(d,"app/build.gradle"),`plugins { id 'com.android.application' }\nandroid { namespace '${p}'; compileSdk 35\n defaultConfig { applicationId '${p}'; minSdk 23; targetSdk 35; versionCode 1; versionName '1.0' }\n}\ndependencies { implementation 'androidx.appcompat:appcompat:1.7.0' }`);
 fs.writeFileSync(path.join(rv,"values/strings.xml"),`<resources><string name="app_name">${name.replace(/&/g,"&amp;").replace(/</g,"&lt;")}</string></resources>`);
 fs.writeFileSync(path.join(rv,"values/styles.xml"),`<resources><style name="AppTheme" parent="android:style/Theme.Material.Light.NoActionBar"><item name="android:colorAccent">#00ff88</item><item name="android:navigationBarColor">#02040a</item></style></resources>`);
 fs.mkdirSync(path.join(d,"app/src/main"),{recursive:true});
 fs.writeFileSync(path.join(d,"app/src/main/AndroidManifest.xml"),`<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><application android:theme="@style/AppTheme" android:label="@string/app_name"><activity android:name=".MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity></application></manifest>`);
 fs.writeFileSync(path.join(src,"MainActivity.java"),`package ${p}; import android.app.*; import android.os.*; import android.webkit.*; import android.graphics.Color; import android.view.*; import android.widget.*;
public class MainActivity extends Activity { WebView w; public void onCreate(Bundle b){super.onCreate(b); LinearLayout l=new LinearLayout(this);l.setOrientation(LinearLayout.VERTICAL);w=new WebView(this);w.getSettings().setJavaScriptEnabled(true);w.getSettings().setDomStorageEnabled(true);w.setWebViewClient(new WebViewClient());w.loadUrl("${url.replace("\\","\\\\").replace('"','\\"')}");l.addView(w,new LinearLayout.LayoutParams(-1,0,1));TextView t=new TextView(this);t.setText("by kawaki");t.setTextColor(Color.GRAY);t.setTextSize(8);t.setGravity(Gravity.CENTER);l.addView(t,new LinearLayout.LayoutParams(-1,22));setContentView(l);} }`);
}
async function build(id,url,name,icon){
 const d=path.join(JOBS,id),jf=path.join(d,"job.json");let j={id,url,name,status:"building"};fs.writeFileSync(jf,JSON.stringify(j));
 try{project(d,url,name,id); if(icon){await cmd("convert",[icon,"-resize","512x512",path.join(d,"app/src/main/res/drawable/app_icon.png")],d);let m=fs.readFileSync(path.join(d,"app/src/main/AndroidManifest.xml"),"utf8").replace("<application ","<application android:icon=\"@drawable/app_icon\" ");fs.writeFileSync(path.join(d,"app/src/main/AndroidManifest.xml"),m)}
 await cmd("/opt/gradle/bin/gradle",["assembleDebug","--no-daemon"],d);fs.copyFileSync(path.join(d,"app/build/outputs/apk/debug/app-debug.apk"),path.join(d,id+".apk"));j.status="done";j.download="/api/download/"+id;fs.writeFileSync(jf,JSON.stringify(j))
 }catch(e){j.status="error";j.error=e.message;fs.writeFileSync(jf,JSON.stringify(j))}
}
app.post("/api/create",upload.single("icon"),(req,res)=>{let url=String(req.body.url||"").trim(),name=safe(req.body.name),id=crypto.randomBytes(7).toString("hex");if(!/^https?:\/\/\S+$/i.test(url))return res.status(400).json({error:"URL invalide"});let d=path.join(JOBS,id);fs.mkdirSync(d,{recursive:true});res.json({jobId:id,status:"queued"});build(id,url,name,req.file?.path)});
app.get("/api/status/:id",(q,r)=>{let p=path.join(JOBS,q.params.id,"job.json");if(!fs.existsSync(p))return r.status(404).json({error:"Introuvable"});r.json(JSON.parse(fs.readFileSync(p)))});
app.get("/api/download/:id",(q,r)=>{let p=path.join(JOBS,q.params.id,q.params.id+".apk");fs.existsSync(p)?r.download(p,"WEB2APK-"+q.params.id+".apk"):r.status(404).send("APK pas encore prêt.")});
app.get("/health",(q,r)=>r.json({ok:true}));
app.use((e,q,r,n)=>r.status(400).json({error:e.message}));
app.listen(PORT,()=>console.log("WEB2APK KAWAKI227 V3 on "+PORT));