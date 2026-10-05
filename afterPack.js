const fs = require('fs'), path = require('path'), ResEdit = require('resedit');
exports.default = async function (ctx) {
  const exe = fs.readdirSync(ctx.appOutDir).filter(f => f.toLowerCase().endsWith('.exe') && !/uninstall|elevate/i.test(f))[0];
  if (!exe) return;
  const file = path.join(ctx.appOutDir, exe);
  const nt = ResEdit.NtExecutable.from(fs.readFileSync(file));
  const res = ResEdit.NtExecutableResource.from(nt);
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const gid = groups.length ? groups[0].id : 1, lang = groups.length ? groups[0].lang : 1033;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, gid, lang, ico.icons.map(i => i.data));
  res.outputResource(nt);
  fs.writeFileSync(file, Buffer.from(nt.generate()));
  console.log('  • icon embedded into', exe);
};
