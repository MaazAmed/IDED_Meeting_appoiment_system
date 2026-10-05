// Runs inside abro2706@gmail.com (Google Apps Script). Free, no hosting needed.
var CC_EMAIL = "abro2706@gmail.com";
var BRANDS = {
  edvisa: { to: "edvisa2008@gmail.com",       name: "Edvisa & Immigrations (Pvt) Ltd", note: "Thank you for choosing Edvisa & Immigrations - your trusted study & immigration partner." },
  travel: { to: "info@indusdeltatravels.com", name: "Indus Delta Travels & Tours (Pvt) Ltd", note: "Thank you for choosing Indus Delta Travels & Tours - wishing you a pleasant journey." }
};

// WhatsApp alerts (free via CallMeBot). Put each number's apikey after activation (see README).
var WHATSAPP = [
  { phone: "+923356603355", apikey: "" },   // 0335 6603355
  { phone: "+923343576644", apikey: "" }    // 0334 3576644
];
function sendWhatsApp(text) {
  WHATSAPP.forEach(function (w) {
    if (!w.apikey) return;
    try {
      UrlFetchApp.fetch("https://api.callmebot.com/whatsapp.php?phone=" + encodeURIComponent(w.phone) +
        "&text=" + encodeURIComponent(text) + "&apikey=" + encodeURIComponent(w.apikey), { muteHttpExceptions: true });
    } catch (x) {}
  });
}
// ===== Automatic WhatsApp to the CLIENT (Meta WhatsApp Cloud API) =====
// Fill these after Meta setup. While token/phoneId are empty, nothing is sent.
var WA_CLOUD = { token: "", phoneId: "", template: "booking_confirmation", lang: "en" };
function sendClientWhatsApp(brandName, d) {
  if (!WA_CLOUD.token || !WA_CLOUD.phoneId) return;
  var n = String(d.Phone).replace(/\D/g, ""); if (n.charAt(0) === "0") n = "92" + n.substring(1);
  function v(x) { return String(x || "-").replace(/[\r\n\t]+/g, " ").substring(0, 200); }
  var vals = [brandName, d.Service, d.Name, d.Date, d.Time, d.Meeting, d.Mode, d.Country, d.Message];
  try {
    var res = UrlFetchApp.fetch("https://graph.facebook.com/v20.0/" + WA_CLOUD.phoneId + "/messages", {
      method: "post", contentType: "application/json", muteHttpExceptions: true,
      headers: { Authorization: "Bearer " + WA_CLOUD.token },
      payload: JSON.stringify({ messaging_product: "whatsapp", to: n, type: "template",
        template: { name: WA_CLOUD.template, language: { code: WA_CLOUD.lang },
          components: [{ type: "body", parameters: vals.map(function (x) { return { type: "text", text: v(x) }; }) }] } })
    });
    PropertiesService.getScriptProperties().setProperty("lastWA", res.getResponseCode() + " " + res.getContentText().substring(0, 300));
  } catch (x) { PropertiesService.getScriptProperties().setProperty("lastWA", String(x)); }
}
var OFFICE = "Amber Pride, Office No 204, 2nd Floor, Main Shahrah-e-Faisal, Block 6, P.E.C.H.S., Karachi";
// ===== AUTOMATIC WhatsApp to clients via a gateway (UltraMsg-style API: your own number linked by QR; paid monthly) =====
var WA_GATEWAY = { instance: "", token: "" };   // e.g. instance: "instance12345", token: "xxxx"
function waAuto(to, text) {
  if (!WA_GATEWAY.instance || !WA_GATEWAY.token) return false;
  var n = String(to).replace(/\D/g, ""); if (n.charAt(0) === "0") n = "92" + n.substring(1);
  try {
    var res = UrlFetchApp.fetch("https://api.ultramsg.com/" + WA_GATEWAY.instance + "/messages/chat", {
      method: "post", muteHttpExceptions: true, payload: { token: WA_GATEWAY.token, to: "+" + n, body: text } });
    PropertiesService.getScriptProperties().setProperty("lastWA", res.getResponseCode() + " " + res.getContentText().substring(0, 300));
    return res.getResponseCode() === 200;
  } catch (x) { PropertiesService.getScriptProperties().setProperty("lastWA", String(x)); return false; }
}
function detailText(r, head, f) {
  var d = (f && f.Date) || r[7], t = (f && f.Time) || r[8];
  var L = [["Service", r[3]], ["Date", d], ["Time", t], ["Meeting", r[9]], ["Mode", r[10]], ["Country", r[12]]]
    .filter(function (x) { return x[1] && x[1] !== "-"; }).map(function (x) { return x[0] + ": " + x[1]; }).join("\n");
  return "Dear " + r[4] + ",\n" + head + "\n\n" + L + "\n\n📍 Office: " + OFFICE + "\n\n" + BRANDS[r[2]].note + "\n" + BRANDS[r[2]].name;
}
function bookingText(bn, d) {
  var L = [["Service", d.Service], ["Name", d.Name], ["Phone", d.Phone], ["Email", d.Email], ["Date", d.Date], ["Time", d.Time], ["Meeting", d.Meeting], ["Meeting Mode", d.Mode], ["Country", d.Country], ["Message", d.Message]]
    .filter(function (x) { return x[1] && x[1] !== "-"; }).map(function (x) { return x[0] + ": " + x[1]; }).join("\n");
  return "New Appointment Request – " + bn + "\n\n" + L + "\n\n📍 Office: " + OFFICE + "\nOur team will confirm shortly.";
}
function esc(v){return String(v).replace(/[&<>"]/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function clean(v,n){return String(v||"").replace(/[\r\n]+/g," ").trim().substring(0,n||300)}
function reply(ok,err){return ContentService.createTextOutput(JSON.stringify({ok:ok,error:err||""})).setMimeType(ContentService.MimeType.JSON)}


// ===== ADMIN: storage in Google Sheet, admin API, reminders =====
var ADMIN_PASSWORD = "2026";
var TZ = "Asia/Karachi";
var COLS = ["ID","Created","Brand","Service","Name","Phone","Email","Date","Time","Meeting","Mode","Departure","Country","Message","Status","Staff","Reminded"];
function sh(){var p=PropertiesService.getScriptProperties(),id=p.getProperty("SS"),ss,t;
  if(id){t=SpreadsheetApp.openById(id).getSheetByName("Bookings");try{t.getRange("A:A").setNumberFormat("@");t.getRange("H:I").setNumberFormat("@")}catch(x){}return t}
  ss=SpreadsheetApp.create("Bookings Database");p.setProperty("SS",ss.getId());t=ss.getSheets()[0];t.setName("Bookings");
  t.getRange("F:I").setNumberFormat("@");t.appendRow(COLS);return t}
// Sends mail; never throws. On failure writes a row in the "Email Log" sheet and returns the error text ("" = sent).
function sendMail(o){
  try{
    if(MailApp.getRemainingDailyQuota()<1)throw new Error("Daily email limit finished (Google allows about 100/day). It resets after 24 hours.");
    MailApp.sendEmail(o);return "";
  }catch(x){
    var m=String((x&&x.message)||x);
    try{var ss=sh().getParent(),t=ss.getSheetByName("Email Log")||ss.insertSheet("Email Log");if(t.getLastRow()===0)t.appendRow(["Time","To","Subject","Error"]);t.appendRow([new Date(),String(o.to),String(o.subject),m])}catch(y){}
    try{PropertiesService.getScriptProperties().setProperty("lastMailErr",m)}catch(y){}
    return m;
  }
}
function fx(v){for(var i=1;i<v.length;i++){if(v[i][7] instanceof Date)v[i][7]=Utilities.formatDate(v[i][7],TZ,"yyyy-MM-dd");if(v[i][8] instanceof Date)v[i][8]=Utilities.formatDate(v[i][8],TZ,"h:mm a")}return v}
function saveRow(brand,d){sh().appendRow(["B"+Utilities.getUuid().substring(0,7),new Date(),brand,d.Service,d.Name,d.Phone,d.Email,d.Date||"",d.Time||"",d.Meeting||"",d.Mode||"",d.Departure||"",d.Country,d.Message,"New","",""])}
function detailMail(r,head,f){var br=BRANDS[r[2]],d=(f&&f.Date)||r[7],t=(f&&f.Time)||r[8],
  rows=[["Service",r[3]],["Date",d],["Time",t],["Meeting",r[9]],["Mode",r[10]],["Country",r[12]]].filter(function(x){return x[1]&&x[1]!=="-"}).map(function(x){return"<tr><td><b>"+x[0]+"</b></td><td>"+esc(x[1])+"</td></tr>"}).join("");
  return "<p>Dear "+esc(r[4])+",</p><p>"+esc(head)+"</p><table cellpadding='6' border='1' style='border-collapse:collapse'>"+rows+"</table><p>For any change, please reply to this email or call us.</p><p>📍 <b>Office:</b> "+esc(OFFICE)+"</p><p>"+esc(br.note)+"</p><p>Regards,<br><b>"+esc(br.name)+"</b></p>"}
function admin(b){
  if(b.pw!==ADMIN_PASSWORD)return reply(false,"Wrong password");
  var s=sh(),p=PropertiesService.getScriptProperties(),v,i,k,c,waOK,mailErr="",mailSent=null;
  if(b.action==="wamsg")waOK=waAuto(b.to,String(b.text||"").substring(0,2000));
  if(b.action==="update"){v=fx(s.getDataRange().getValues());
    for(i=1;i<v.length;i++)if(String(v[i][0])===String(b.id)){
      for(k in b.fields){c=COLS.indexOf(k);if(["Status","Date","Time","Staff"].indexOf(k)>=0)s.getRange(i+1,c+1).setValue(b.fields[k])}
      if(b.notify&&v[i][6]){try{mailErr=sendMail({to:v[i][6],name:BRANDS[v[i][2]].name,subject:"Appointment update - "+BRANDS[v[i][2]].name,
        htmlBody:detailMail(v[i],b.notify,b.fields)})}catch(x){mailErr=String(x)}mailSent=!mailErr;
        try{waAuto(v[i][5],detailText(v[i],b.notify,b.fields))}catch(x){}}}}
  if(b.action==="mail"){mailErr=sendMail({to:clean(b.to,100),name:(BRANDS[b.brand]||BRANDS.edvisa).name,subject:clean(b.subject,150)||"Message",body:String(b.text||"").substring(0,2000)});mailSent=!mailErr}
  if(b.action==="mailtest"){mailErr=sendMail({to:CC_EMAIL,name:"Booking System",subject:"Test email - booking system",htmlBody:"<p>Test OK. Email system is working.</p>"});mailSent=!mailErr}
  if(b.action==="saveStaff")p.setProperty("staff",JSON.stringify(b.data));
  if(b.action==="saveTpl")p.setProperty("tpl",JSON.stringify(b.data));
  v=fx(s.getDataRange().getValues());var h=v.shift();
  var rows=v.map(function(r){var o={};h.forEach(function(c,i){o[c]=r[i] instanceof Date?Utilities.formatDate(r[i],TZ,"yyyy-MM-dd HH:mm"):String(r[i])});return o});
  return ContentService.createTextOutput(JSON.stringify({ok:true,ver:"v6",mailSent:mailSent,mailErr:mailErr,quota:(function(){try{return MailApp.getRemainingDailyQuota()}catch(x){return -1}})(),wa:waOK,sheet:s.getParent().getUrl(),err:p.getProperty("lastErr")||"",rows:rows,staff:JSON.parse(p.getProperty("staff")||"[]"),tpl:JSON.parse(p.getProperty("tpl")||"null")})).setMimeType(ContentService.MimeType.JSON);
}
// Daily reminders: run setupReminders() ONCE from the editor.
function sendReminders(){
  var t=Utilities.formatDate(new Date(Date.now()+864e5),TZ,"yyyy-MM-dd"),s=sh(),v=fx(s.getDataRange().getValues());
  for(var i=1;i<v.length;i++){var r=v[i];
    if(r[7]===t&&r[14]!=="Cancelled"&&!r[16]){
      try{sendMail({to:r[6],name:BRANDS[r[2]].name,subject:"Appointment reminder - tomorrow",htmlBody:"<p>Dear "+esc(r[4])+", this is a reminder of your appointment tomorrow, <b>"+esc(t)+(r[8]?" at "+esc(r[8]):"")+"</b>, for "+esc(r[3])+".</p><p>📍 <b>Office:</b> "+esc(OFFICE)+"</p><p>"+esc(BRANDS[r[2]].note)+"</p>"})}catch(x){}
      sendWhatsApp("Reminder: "+r[4]+" ("+r[5]+") tomorrow "+t+(r[8]?" at "+r[8]:"")+" - "+r[3]);
      try{waAuto(r[5],"Dear "+r[4]+", reminder: your appointment with "+BRANDS[r[2]].name+" is tomorrow, "+t+(r[8]?" at "+r[8]:"")+".\n📍 Office: "+OFFICE+"\n"+BRANDS[r[2]].note)}catch(x){}
      s.getRange(i+1,17).setValue("Yes")}}
}
// Run this ONCE from the editor (Run button) and click Allow: grants Sheets, Mail, Triggers, UrlFetch permissions.
function authorizeAll(){sh();MailApp.getRemainingDailyQuota();ScriptApp.getProjectTriggers();UrlFetchApp.fetch("https://api.telegram.org",{muteHttpExceptions:true});Logger.log("Authorized OK")}
function setupReminders(){ScriptApp.getProjectTriggers().forEach(function(t){ScriptApp.deleteTrigger(t)});ScriptApp.newTrigger("sendReminders").timeBased().everyDays(1).atHour(9).create()}

function feedback(b){
  var r=Math.max(0,Math.min(5,parseInt(b.rating)||0)),brand=BRANDS[b.brand];if(!brand||!r)return reply(false,"Invalid");
  var c=clean(b.comment,500),n=clean(b.name,100);
  try{var ss=sh().getParent(),t=ss.getSheetByName("Feedback")||ss.insertSheet("Feedback");if(t.getLastRow()===0)t.appendRow(["Date","Brand","Name","Rating","Comment"]);t.appendRow([new Date(),b.brand,n,r,c])}catch(x){}
  try{sendMail({to:brand.to+","+CC_EMAIL,name:brand.name+" Feedback",subject:"New Feedback ("+r+"/5) - "+n,htmlBody:"<p><b>"+esc(n)+"</b> rated <b>"+r+"/5</b></p><p>"+esc(c||"-")+"</p>"})}catch(x){}
  return reply(true);
}
function doPost(e) {
  try {
    var b = JSON.parse(e.postData.contents), brand = BRANDS[b.brand];
    if (b.feedback) return feedback(b);
    if (b.action) return admin(b);
    if (!brand) return reply(false, "Invalid brand");
    var d = {
      Service: clean(b.service), Name: clean(b.name,100), Phone: clean(b.phone,30), Email: clean(b.email,100),
      Date: clean(b.date,12), Time: clean(b.time,40), Meeting: clean(b.meeting), Mode: clean(b.mode),
      Departure: clean(b.departure,40), Country: clean(b.country,60) || "-", Message: String(b.msg||"").substring(0,1000) || "-"
    };
    if (!d.Name || !d.Phone || !/^\S+@\S+\.\S+$/.test(d.Email) || (d.Date && !/^\d{4}-\d{2}-\d{2}$/.test(d.Date))) return reply(false, "Missing fields");
    if (d.Date && new Date(d.Date + "T00:00:00").getDay() === 0) return reply(false, "Sunday closed");
    // Optional fields: only included in emails when filled
    if (!d.Date) delete d.Date;
    if (!d.Time) delete d.Time;
    if (!d.Meeting) delete d.Meeting;
    if (!d.Mode) delete d.Mode;
    if (!d.Departure) delete d.Departure;
    var when = d.Date ? (" on <b>" + esc(d.Date) + "</b>" + (d.Time ? ", <b>" + esc(d.Time) + "</b>" : "")) : "";

    try { saveRow(b.brand, d); } catch (x) { PropertiesService.getScriptProperties().setProperty("lastErr", String(x)); }  // booking email still goes out even if Sheet fails
    var rows = "";
    for (var k in d) rows += "<tr><td><b>" + k + "</b></td><td>" + esc(d[k]) + "</td></tr>";
    var mailErr1 = sendMail({
      to: brand.to + "," + CC_EMAIL, replyTo: d.Email, name: brand.name + " Bookings",
      subject: "Appointment Request - " + d.Service + " - " + d.Name,
      htmlBody: "<h2>New Appointment - " + esc(brand.name) + "</h2><table cellpadding='6' border='1' style='border-collapse:collapse'>" + rows + "</table>"
    });
    sendWhatsApp("*New Appointment - " + brand.name + "*\nService: " + d.Service + "\nName: " + d.Name + "\nPhone: " + d.Phone + "\nEmail: " + d.Email +
      (d.Date ? "\nDate: " + d.Date : "") + (d.Time ? "\nTime: " + d.Time : "") + (d.Meeting ? "\nMeeting: " + d.Meeting : "") + (d.Mode ? "\nMode: " + d.Mode : "") + (d.Departure ? "\nDeparture City: " + d.Departure : "") + "\nCountry: " + d.Country + "\nMessage: " + d.Message);
    sendClientWhatsApp(brand.name, d);
    try { waAuto(d.Phone, bookingText(brand.name, d)); } catch (x) {}
    var mailErr2 = "";
    try {
      mailErr2 = sendMail({ to: d.Email, name: brand.name, subject: "We received your appointment request - " + brand.name,
        htmlBody: "<p>Dear " + esc(d.Name) + ",</p><p>We received your request for <b>" + esc(d.Service) + "</b>" + when + ". Our team will confirm shortly.</p><p>📍 <b>Office:</b> " + esc(OFFICE) + "</p><p>" + esc(brand.note) + "</p><p>" + esc(brand.name) + "</p>" });
    } catch (x) {}
    return ContentService.createTextOutput(JSON.stringify({ ok: true, mailErr: (mailErr1 || mailErr2 || "") })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) { return reply(false, String(err)); }
}
