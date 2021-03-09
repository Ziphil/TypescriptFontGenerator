//

import {
  Font,
  FontInfo,
  FontStyle
} from "../../module";
import {
  VekosGenerator
} from "./generator";


export class VekosFont extends Font {

  public static create(style: FontStyle, high: boolean): Font {
    let weightNumber = style.getWeightNumber();
    let stretchNumber = style.getStretchNumber();
    let weightConst = (weightNumber * 0.5 + 100) / 300;
    let stretchConst = (stretchNumber < 300) ? (stretchNumber * 0.15 + 55) / 100 : (stretchNumber * 0.25 + 25) / 100;
    let contrastRatio = (high) ? 0.2 : 0.75;
    let generator = new VekosGenerator({weightConst, stretchConst, contrastRatio});
    let info = new FontInfo("Copyright 2019 Ziphil", "1.2.0");
    let font = new Font(generator, "Vekos", style, info);
    return font;
  }

}