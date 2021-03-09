//

import execa from "execa";
import {
  promises as fs
} from "fs";
import {
  Project,
  Size
} from "paper";
import {
  Font
} from "./font";
import {
  Glyph
} from "./glyph";


export class FontWriter {

  private font: Font;
  private path: string;

  public constructor(font: Font) {
    this.font = font;
    this.path = "out/" + font.fullName.replace(/\s+/g, "-").toLowerCase();
  }

  public async generate(): Promise<void> {
    let codePath = this.path + "/generate.py";
    await this.writeFont();
    await this.writeCode();
    await execa("ffpython", [codePath]);
  }

  private async writeCode(): Promise<void> {
    let fontPath = this.path + ".ttf";
    let codePath = this.path + "/generate.py";
    let code = await fs.readFile("resource/generate.py", "utf-8");
    code = code.replace("__familyname__", "\"" + this.font.extendedFamilyName + "\"");
    code = code.replace("__fontname__", "\"" + this.font.postScriptName + "\"");
    code = code.replace("__fullname__", "\"" + this.font.fullName + "\"");
    code = code.replace("__weight__", "\"" + Font.stringifyFontWeight(this.font.style.weight) + "\"");
    code = code.replace("__version__", "\"" + this.font.version + "\"");
    code = code.replace("__copyright__", "\"" + this.font.copyright + "\"");
    code = code.replace("__em__", this.font.generator.metrics.em.toString());
    code = code.replace("__ascent__", this.font.generator.metrics.ascent.toString());
    code = code.replace("__descent__", this.font.generator.metrics.descent.toString());
    code = code.replace("__autohint__", "True");
    code = code.replace("__svgdir__", "\"" + this.path + "\"");
    code = code.replace("__fontfilename__", "\"" + fontPath + "\"");
    await fs.writeFile(codePath, code);
  }

  public async writeFont(): Promise<void> {
    await fs.mkdir(this.path, {recursive: true});
    let chars = this.font.generator.getChars();
    let promises = chars.map(async (char) => {
      await this.writeGlyph(char);
    });
    await Promise.all(promises);
  }

  public async writeGlyph(char: string): Promise<void> {
    let glyph = this.font.generator.glyph(char);
    let glyphPath = this.path + "/" + char.charCodeAt(0) + ".svg";
    if (glyph !== null) {
      let size = new Size(glyph.metrics.em, glyph.metrics.em);
      let project = new Project(size);
      project.activeLayer.addChild(glyph.part);
      let svgString = project.exportSVG({asString: true}) as string;
      let addedSvgString = svgString.replace(/<svg(.+?)>/, `<svg$1 glyph-width="${glyph.width}">`);
      await fs.writeFile(glyphPath, addedSvgString);
      project.remove();
    }
  }

}