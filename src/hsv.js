function hsv2rgb(hue, sat, val) {
  // See
  //    http://en.wikipedia.org/wiki/HSL_and_HSV
  // from:
  //    http://www.actionscript.org/forums/archive/index.php3/t-15155.html
  // see also:
  //    http://www.webreference.com/programming/javascript/mk/column3/creating/cp_mini_gradient_details.png
  var red, grn, blu, i, f, p, q, t;
  hue%=360; // probably not needed
  if(val==0) {return("rgb(0,0,0)");}
  sat/=100;
  val/=100;
  hue/=60;
  i = Math.floor(hue);
  f = hue-i;
  p = val*(1-sat);
  q = val*(1-(sat*f));
  t = val*(1-(sat*(1-f)));
  if (i==0) {red=val; grn=t; blu=p;}
  else if (i==1) {red=q; grn=val; blu=p;}
  else if (i==2) {red=p; grn=val; blu=t;}
  else if (i==3) {red=p; grn=q; blu=val;}
  else if (i==4) {red=t; grn=p; blu=val;}
  else if (i==5) {red=val; grn=p; blu=q;}
  red = Math.floor(red*255);
  grn = Math.floor(grn*255);
  blu = Math.floor(blu*255);
  var r_g_b = [red,grn,blu];
  return "rgb(" + r_g_b.valueOf() + ")";
}
