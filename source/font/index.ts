//

import {
  FontManager
} from "../module";
import {
  KalegFont
} from "./kaleg/font";
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
  vkhb: VekosFont.create("bold", "normal", true),
  klmr: KalegFont.create("regular", "normal", "miter", false),
  klmb: KalegFont.create("bold", "normal", "miter", false),
  klbr: KalegFont.create("regular", "normal", "bevel", false),
  klbb: KalegFont.create("bold", "normal", "bevel", false),
  klrr: KalegFont.create("regular", "normal", "round", false),
  klrb: KalegFont.create("bold", "normal", "round", false),
  klmbr: KalegFont.create("regular", "normal", "miter", true),
  klmbb: KalegFont.create("bold", "normal", "miter", true),
  klbbr: KalegFont.create("regular", "normal", "bevel", true),
  klbbb: KalegFont.create("bold", "normal", "bevel", true),
  klrbr: KalegFont.create("regular", "normal", "round", true),
  klrbb: KalegFont.create("bold", "normal", "round", true)
};

export const FONT_MANAGER = new FontManager(FONTS);