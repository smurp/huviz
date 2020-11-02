// Usage:
//   txtcrsr = new TextCursor(".graph_control input", "click input for fun")
class TextCursor {
  static initClass() {
    this.prototype.fontFillStyle = "black";
    this.prototype.bgFillStyle = "Yellow";
    this.prototype.bgGlobalAlpha = 0.6;
    this.prototype.borderStrokeStyle = "black";
    this.prototype.face = "sans-serif";
    this.prototype.width = 128;
    this.prototype.height = 32;
    this.prototype.scale = .3;
    this.prototype.pointer_height = 6;
  }
  constructor(elem, text) {
    this.elem = elem;
    this.cache = {};
    this.set_text(text);
    this.paused = false;
    this.last_text = "";
  }
  font_height() {
    return this.height * this.scale;
  }
  set_text(text, temp, bgcolor) {
    let cursor;
    this.bgFillStyle = bgcolor ? bgcolor : "yellow";
    if (text) {
      if ((this.cache[text] == null)) {
        this.cache[text] = this.make_img(text);
      }
      const url = this.cache[text];
      cursor = `url(${url}) ${this.pointer_height} 0, default`;
    } else {
      cursor = "default";
    }
    if ((temp == null)) {
      this.last_text = text;
    }
    if (!this.paused) {
      this.set_cursor(cursor);
    }
  }
  pause(cursor, text) {
    this.paused = false; // so @set_cursor will run if set_text called
    if (text != null) {
      this.set_text(text, true);
    } else {
      this.set_cursor(cursor);
    }
    this.paused = true;
  }
  continue() {
    this.paused = false;
    this.set_text(this.last_text);
  }
  set_cursor(cursor) {
    $(this.elem).css("cursor", cursor);
  }
  make_img(text) {
    // TODO make a speech bubble sort of thing of low opacity but text of high
    //    http://stackoverflow.com/a/8001254/1234699
    //    http://www.scriptol.com/html5/canvas/speech-bubble.php
    let i, line, voffset;
    const id = "temp_TextCursor_canvas";
    const sel = `#${id}`;
    $('<canvas>', {id}).appendTo("body");
    this.canvas = $(sel)[0];
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.ctx = this.canvas.getContext("2d");
    this.ctx.clearRect(0, 0, this.width, this.height);
    const inset = 3;
    const top = 10;

    this.ctx.translate(0, this.font_height());
    this.ctx.fillStyle = this.fontFillStyle;
    this.ctx.font = `${this.font_height()}px ${this.face}`;
    this.ctx.textAlign = 'left';
    const lines = text.split("\n");
    let max_width = 0;
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (line) {
        voffset = (this.font_height() * i) + top;
        max_width = Math.max(this.ctx.measureText(line).width, max_width);
      }
    }
    const height = (this.font_height() * lines.length) + inset;
    this.draw_bubble(inset, top,
                 max_width + (inset * 4), height,
                 this.pointer_height, this.font_height()/2);
    for (i = 0; i < lines.length; i++) {
      line = lines[i];
      if (line) {
        voffset = (this.font_height() * i) + top;
        this.ctx.fillText(line, top, voffset);
      }
    }
    const url = this.canvas.toDataURL("image/png");
    const cursor = `url(${url}), help`;
    $(this.canvas).remove();
    return url;
  }
  draw_bubble(x, y, w, h, pointer_height, radius) {
    /*
    http://www.scriptol.com/html5/canvas/speech-bubble.php
    */
    const r = x + w;
    const b = y + h;
    this.ctx.save();
    this.ctx.translate(0, this.font_height() * -1);
    this.ctx.beginPath();
    this.ctx.moveTo(x + radius, y);
    this.ctx.lineTo(x + (radius / 2), y - pointer_height);
    this.ctx.lineTo(x + (radius * 2), y);
    this.ctx.lineTo(r - radius, y);
    this.ctx.quadraticCurveTo(r, y, r, y + radius);
    this.ctx.lineTo(r, (y + h) - radius);
    this.ctx.quadraticCurveTo(r, b, r - radius, b);
    this.ctx.lineTo(x + radius, b);
    this.ctx.quadraticCurveTo(x, b, x, b - radius);
    this.ctx.lineTo(x, y + radius);
    this.ctx.quadraticCurveTo(x, y, x + radius, y);
    this.ctx.closePath();
    if (this.bgGlobalAlpha != null) {
      this.ctx.save();
      this.ctx.globalAlpha = this.bgGlobalAlpha;
      if (this.bgFillStyle != null) {
        this.ctx.fillStyle = this.bgFillStyle;
        this.ctx.fill();
      }
      this.ctx.restore();
    }
    this.ctx.lineWidth = 1;
    this.ctx.strokeStyle = this.borderStrokeStyle;
    this.ctx.stroke();
    this.ctx.restore();
  }
}
TextCursor.initClass();

// export {TextCursor}
