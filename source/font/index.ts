//

import {
  Font
} from "../module";
import {
  VekosFont
} from "./vekos/font";


const FONTS = {
  vkr: VekosFont.create("regular", "normal", false),
  vkb: VekosFont.create("bold", "normal", false),
  vkt: VekosFont.create("thin", "normal", false),
  vkcr: VekosFont.create("regular", "condensed", false),
  vkcb: VekosFont.create("bold", "condensed", false),
  vkct: VekosFont.create("thin", "condensed", false),
  vker: VekosFont.create("regular", "expanded", false),
  vkeb: VekosFont.create("bold", "expanded", false),
  vket: VekosFont.create("thin", "expanded", false),
  vkhr: VekosFont.create("regular", "normal", true),
  vkhb: VekosFont.create("bold", "normal", true)
};


export class FontManager {

  public static getAll(): Array<Font> {
    let fonts = Object.values(FONTS);
    return fonts;
  }

  public static getById(id: string): Font | undefined {
    let anyFonts = FONTS as any;
    let font = anyFonts[id];
    return font;
  }

}