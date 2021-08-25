/*
 *   http://jsfiddle.net/EPWF6/9/
 *   https://en.wikipedia.org/wiki/HSL_and_HSV#Converting_to_RGB
 *     Unfortunately this is seriously buggy!
 */
export function hsl2rgb(H, S, L) {
  var input_s = "hsl2rgb(" + [H, S, L].toString() + ")";
  /*
   * H ∈ [0°, 360°)
   * S ∈ [0, 1]
   * L ∈ [0, 1]
   */
  if (H == 360) { H = 359.9999; };
  H %= 360;
  /* calculate chroma */
  var C = (1 - Math.abs((2 * L) - 1)) * S;
  /* Find a point (R1, G1, B1) along the bottom three faces of the RGB cube, with the same hue and chroma as our color (using the intermediate value X for the second largest component of this color) */
  var H_ = H / 60;
  var X = C * (1 - Math.abs((H_ % 2) - 1));
  var R1, G1, B1;
  if (H === undefined || isNaN(H) || H === null) {
    R1 = G1 = B1 = 0;
  }
  else {
    if (H_ >= 0 && H_ < 1) {
      R1 = C;
      G1 = X;
      B1 = 0;
    }
    else if (H_ >= 1 && H_ < 2) {
      R1 = X;
      G1 = C;
      B1 = 0;
    } else if (H_ >= 2 && H_ < 3) {
      R1 = 0;
      G1 = C;
      B1 = X;
    } else if (H_ >= 3 && H_ < 4) {
      R1 = 0;
      G1 = X;
      B1 = C;
    } else if (H_ >= 4 && H_ < 5) {
      R1 = X;
      G1 = 0;
      B1 = C;
    }
    else if (H_ >= 5 && H_ < 6) {
      R1 = C;
      G1 = 0;
      B1 = X;
    }
  }

  /* Find R, G, and B by adding the same amount to each component, to match lightness */

  var m = L - (C / 2);

  var R, G, B;

  /* Normalise to range [0,255] by multiplying 255 */
  R = (R1 + m) * 255;
  G = (G1 + m) * 255;
  B = (B1 + m) * 255;

  R = Math.round(R);
  G = Math.round(G);
  B = Math.round(B);

  const retval = "rgb(" + R + ", " + G + ", " + B + ")";
  //    console.info(input_s,retval);
  return retval;
}
