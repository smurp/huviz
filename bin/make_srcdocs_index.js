process.stdin.resume();
process.stdin.setEncoding('ascii');

header_md = `
<a href="..">up</a> <a href="/srcdocs/index">srcdocs</a>

# HuViz Source Docs

`;

footer_md = ``;

var output = header_md;
process.stdin.on('data', function (data) {
  var s = data.split('-> ');
  if (s[1]) {
    var filebase = s[1].replace(/.html/,'').replace('\n','');
    var filelabel = filebase.replace('srcdocs/','');
    output += `* [${filelabel}](/${filebase}.html)\n`;
  }
});
process.stdin.on('end', function () {
  console.log(output);
  if (footer_md) {
    console.log(footer_md);
  }
});
