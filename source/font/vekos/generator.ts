//

import {
  $,
  Bearings,
  Generator,
  Glyph,
  Metrics,
  Part,
  PathUtil,
  generator,
  glyph,
  part
} from "../../module";


@generator()
export class VekosGenerator extends Generator<VekosConfig> {

  private get descent(): number {
    return 250;
  }

  private get mean(): number {
    return 500;
  }

  private get extraDescent(): number {
    return 40;
  }

  private get extraAscent(): number {
    return 10;
  }

  private get overshoot(): number {
    return 10;
  }

  private get bearing(): number {
    return this.bowlWidth * 0.09;
  }

  private get metrics(): Metrics {
    let ascent = this.mean + this.descent + this.extraAscent;
    let descent = this.descent + this.extraDescent;
    let em = descent + ascent;
    let metrics = {em, ascent, descent};
    return metrics;
  }

  private get bearings(): Bearings {
    let left = this.bearing;
    let right = this.bearing;
    let bearings = {left, right};
    return bearings;
  }

  private get horThickness(): number {
    return this.config.weightConst * 100;
  }

  private get verThickness(): number {
    return this.horThickness * this.config.contrastRatio;
  }

  private get bowlWidth(): number {
    return (this.config.weightConst * 80 + 370) * this.config.stretchConst;
  }

  // k, p, c, l, a などの文字に共通する丸い部分の外側の曲線の 4 分の 1 を、左端から上端への向きで生成します。
  @part()
  public partOuterBowl(): Part {
    let width = this.bowlWidth / 2;
    let height = this.mean / 2 + this.overshoot;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // k, p, c, l, a などの文字に共通する丸い部分の内側の曲線の 4 分の 1 を、左端から上端への向きで生成します。
  @part()
  public partInnerBowl(): Part {
    let width = this.bowlWidth / 2 - this.horThickness;
    let height = this.mean / 2 - this.verThickness + this.overshoot;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // k, p, c, l, a などの文字に共通する丸い部分を生成します。
  // 原点は全体の中央にあるので、回転や反転で変化しません。
  @part()
  public partBowl(): Part {
    let outerPart = Part.seq(
      this.partOuterBowl().reflectVer(),
      this.partOuterBowl().rotateHalfTurn().reverse(),
      this.partOuterBowl().reflectHor(),
      this.partOuterBowl().reverse()
    );
    let innerPart = Part.seq(
      this.partInnerBowl().reflectVer(),
      this.partInnerBowl().rotateHalfTurn().reverse(),
      this.partInnerBowl().reflectHor(),
      this.partInnerBowl().reverse()
    );
    let part = Part.stack(
      outerPart,
      innerPart.reverse().translate($(this.horThickness, 0))
    );
    part.moveOrigin($(this.bowlWidth / 2, 0));
    return part;
  }

  // l の文字のディセンダー部分について、その先端の中央と上にある丸い部分の右端との水平距離を表します。
  private get lesTailBend(): number {
    return this.bowlWidth * 0.6;
  }

  private get lesTailCorrection(): number {
    return this.horThickness * 0.3;
  }

  private calcIdealThickness(angle: number): number {
    if (angle >= 0 && angle <= 90) {
      let horWeight = angle / 90;
      let verWeight = 1 - angle / 90;
      return horWeight * this.horThickness + verWeight * this.verThickness;
    } else {
      return 1 / 0;
    }
  }

  private calcTailError(innerHandle: number, outerHandle: number, bend: number, height: number): number {
    let path = PathUtil.bezier($(0, 0), $(0, innerHandle), $(0, -outerHandle), $(-bend, height));
    let basePoint = $(-bend / 2 + this.horThickness / 2, height / 2);
    let nearestPoint = path.getNearestPoint(basePoint);
    let angle = nearestPoint.subtract(basePoint).getAngle($(1, 0)) - 90;
    let error = Math.abs(nearestPoint.getDistance(basePoint) - this.calcIdealThickness(angle) / 2);
    return error;
  }

  private searchTailInnerHandle(outerHandle: number, bend: number, height: number): number {
    let interval = 0.5;
    let resultHandle = 0;
    let minimumError = 10000;
    for (let innerHandle = 0 ; innerHandle <= height ; innerHandle += interval) {
      let error = this.calcTailError(innerHandle, outerHandle, bend, height);
      if (error < minimumError) {
        minimumError = error;
        resultHandle = innerHandle;
      }
    }
    return resultHandle;
  }

  // l の文字のディセンダーの左側の曲線を、上端から下端への向きで生成します。
  @part()
  public partLeftLesTail(): Part {
    let bend = this.lesTailBend - this.horThickness / 2 + this.lesTailCorrection;
    let virtualBend = this.lesTailBend;
    let height = this.mean / 2 + this.descent;
    let bottomHandle = this.descent * 1.08;
    let topHandle = this.searchTailInnerHandle(bottomHandle, virtualBend, height);
    let part = Part.bezier($(0, 0), $(0, topHandle), $(0, -bottomHandle), $(-bend, height));
    return part;
  }

  // l の文字のディセンダーの右側の曲線を、上端から下端への向きで生成します。
  @part()
  public partRightLesTail(): Part {
    let bend = this.lesTailBend - this.horThickness / 2;
    let height = this.mean / 2 + this.descent;
    let topHandle = this.descent * 1.08;
    let bottomHandle = this.searchTailInnerHandle(topHandle, bend, height);
    let part = Part.bezier($(0, 0), $(0, topHandle), $(0, -bottomHandle), $(-bend, height));
    return part;
  }

  // 文字の書き始めや書き終わりの位置にある水平に切られた部分を、左端から右端への向きで生成します。
  @part()
  public partCut(): Part {
    let part = Part.line($(0, 0), $(this.horThickness, 0));
    return part;
  }

  // l の文字のディセンダーを生成します。
  // 反転や回転を施すことで、c などの文字のディセンダーや k, p などの文字のアセンダーとしても使えます。
  // 丸い部分と重ねたときに重なった部分が太く見えすぎないように、左側を少し細く補正してあります。
  // 原点は補正がないとしたときの左上の角にあります。
  @part()
  public partLesTail(): Part {
    let part = Part.seq(
      this.partLeftLesTail(),
      this.partCut(),
      this.partRightLesTail().reverse(),
      Part.line($(0, 0), $(-this.horThickness + this.lesTailCorrection, 0))
    );
    part.moveOrigin($(-this.lesTailCorrection, 0));
    return part;
  }

  // l の文字と同じ形を生成します。
  // 原点は丸い部分の中央にあるので、回転や反転で変化しません。
  @part()
  public partLes(): Part {
    let part = Part.union(
      this.partBowl(),
      this.partLesTail().translate($(this.bowlWidth / 2 - this.horThickness, 0))
    );
    return part;
  }

  private get transphoneThicknessRatio(): number {
    return 0.95;
  }

  // 変音符が左側もしくは右側に曲がる水平距離を表します。
  private get transphoneBend(): number {
    return this.bowlWidth * 0.15;
  }

  private get transphoneGap(): number {
    return this.bowlWidth * 0.18;
  }

  // 変音符の右に飛び出るように曲がる曲線の上半分を、下端から上端への向きで生成します。
  @part()
  public partTransphoneSegment(): Part {
    let bend = this.transphoneBend;
    let height = this.mean / 2;
    let rightHandle = height * 0.6;
    let part = Part.bezier($(0, 0), null, $(0, -rightHandle), $(bend, height));
    return part;
  }

  // 変音符の上下にある水平に切られた部分を、左端から右端への向きで生成します。
  @part()
  public partTransphoneCut(): Part {
    let width = this.horThickness * this.transphoneThicknessRatio;
    let part = Part.line($(0, 0), $(width, 0));
    return part;
  }

  // 変音符と同じ形を生成します。
  // 原点は右に飛び出る部分の左中央にあります。
  @part()
  public partTransphone(): Part {
    let part = Part.seq(
      this.partTransphoneSegment(),
      this.partTransphoneSegment().reflectVer().reverse(),
      this.partTransphoneCut(),
      this.partTransphoneSegment().reflectVer(),
      this.partTransphoneSegment().reverse(),
      this.partTransphoneCut().reverse()
    );
    part.moveOrigin($(this.transphoneBend, this.mean / 2));
    return part;
  }

  @glyph("l", "L")
  public glyphLes(): Glyph {
    let part = Part.union(
      this.partLes().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("r", "R")
  public glyphRes(): Glyph {
    let part = Part.union(
      this.partLes().translate($(this.bowlWidth / 2, -this.mean / 2)),
      this.partTransphone().translate($(this.bowlWidth + this.transphoneGap, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("p", "P")
  public glyphPal(): Glyph {
    let part = Part.union(
      this.partLes().rotateHalfTurn().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("b", "B")
  public glyphBol(): Glyph {
    let part = Part.union(
      this.partLes().rotateHalfTurn().translate($(this.bowlWidth / 2, -this.mean / 2)),
      this.partTransphone().translate($(this.bowlWidth + this.transphoneGap, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("c", "C")
  public glyphCal(): Glyph {
    let part = Part.union(
      this.partLes().reflectHor().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("q", "Q")
  public glyphQol(): Glyph {
    let part = Part.union(
      this.partLes().reflectHor().translate($(this.bowlWidth / 2, -this.mean / 2)),
      this.partTransphone().translate($(this.bowlWidth + this.transphoneGap, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("k", "K")
  public glyphKal(): Glyph {
    let part = Part.union(
      this.partLes().reflectVer().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("g", "G")
  public glyphGol(): Glyph {
    let part = Part.union(
      this.partLes().reflectVer().translate($(this.bowlWidth / 2, -this.mean / 2)),
      this.partTransphone().translate($(this.bowlWidth + this.transphoneGap, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  // y の文字の下半分の内側に曲がる部分について、その最下部の外側の端と丸い部分の端との水平距離を表します。
  // 曲線の外側の曲がり具合を指定しているので、線の太さが大きくなるとより内側に曲がることに注意してください。
  private get yesLegBend(): number {
    return this.bowlWidth * 0.15;
  }

  // y の文字の下半分にある曲線を、上端から下端への向きで生成します。
  @part()
  public partYesLeg(): Part {
    let bend = this.yesLegBend;
    let height = this.mean / 2;
    let leftHandle = height * 0.6;
    let part = Part.bezier($(0, 0), $(0, leftHandle), null, $(bend, height));
    return part;
  }

  // y の文字と同じ形を生成します。
  // 原点は全体の中央にあるので、回転や反転で変化しません。
  @part()
  public partYes(): Part {
    let part = Part.seq(
      this.partYesLeg(),
      this.partCut(),
      this.partYesLeg().reverse(),
      this.partInnerBowl(),
      this.partInnerBowl().reflectHor().reverse(),
      this.partYesLeg().reflectHor(),
      this.partCut(),
      this.partYesLeg().reflectHor().reverse(),
      this.partOuterBowl().reflectHor(),
      this.partOuterBowl().reverse()
    );
    part.moveOrigin($(this.bowlWidth / 2, 0));
    return part;
  }

  @glyph("y", "Y")
  public glyphYes(): Glyph {
    let part = Part.union(
      this.partYes().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("h", "H")
  public glyphHes(): Glyph {
    let part = Part.union(
      this.partYes().translate($(this.bowlWidth / 2, -this.mean / 2)),
      this.partTransphone().translate($(this.bowlWidth + this.transphoneGap, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("s", "S")
  public glyphSal(): Glyph {
    let part = Part.union(
      this.partYes().reflectVer().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("z", "Z")
  public glyphZol(): Glyph {
    let part = Part.union(
      this.partYes().reflectVer().translate($(this.bowlWidth / 2, -this.mean / 2)),
      this.partTransphone().translate($(this.bowlWidth + this.transphoneGap, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get talBeakWidth(): number {
    return this.bowlWidth / 2 * 0.95;
  }

  private get talBeakHeight(): number {
    return this.mean * 0.35;
  }

  private get talWidth(): number {
    return this.bowlWidth / 2 + this.talBeakWidth;
  }

  // t の文字の右上にある部分の外側の曲線を、右端から上端への向きで生成します。
  @part()
  public partOuterTalBeak(): Part {
    let width = this.talBeakWidth;
    let height = this.talBeakHeight + this.overshoot;
    let rightHandle = height * 0.05;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -rightHandle), $(topHandle, 0), $(-width, -height));
    return part;
  }

  // t の文字の右上にある部分の内側の曲線を、右端から上端への向きで生成します。
  @part()
  public partInnerTalBeak(): Part {
    let width = this.talBeakWidth - this.horThickness;
    let height = this.talBeakHeight - this.verThickness + this.overshoot;
    let rightHandle = height * 0.05;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -rightHandle), $(topHandle, 0), $(-width, -height));
    return part;
  }

  // t の文字と同じ形を生成します。
  // 原点は全体の中央にあるので、回転や反転で変化しません。
  @part()
  public partTal(): Part {
    let part = Part.seq(
      this.partOuterBowl().reflectVer(),
      this.partOuterTalBeak().reflectVer().reverse(),
      this.partCut().reverse(),
      this.partInnerTalBeak().reflectVer(),
      this.partInnerBowl().reflectVer().reverse(),
      this.partInnerBowl(),
      this.partInnerTalBeak().reverse(),
      this.partCut(),
      this.partOuterTalBeak(),
      this.partOuterBowl().reverse()
    );
    part.moveOrigin($(this.talWidth / 2, 0));
    return part;
  }

  @glyph("t", "T")
  public glyphTal(): Glyph {
    let part = Part.union(
      this.partTal().translate($(this.talWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("d", "D")
  public glyphDol(): Glyph {
    let part = Part.union(
      this.partTal().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partTransphone().translate($(this.talWidth + this.transphoneGap, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("f", "F")
  public glyphFal(): Glyph {
    let part = Part.union(
      this.partTal().reflectHor().translate($(this.talWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("v", "V")
  public glyphVol(): Glyph {
    let part = Part.union(
      this.partTal().reflectHor().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partTransphone().translate($(this.talWidth + this.transphoneGap, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  // x, j の文字に共通する細い丸い部分の見た目の幅を表します。
  // 実際に作られるパーツの幅は、2 つ重ねたときに重なった部分が太く見えないよう補正されるので、この値より小さくなります。
  private get narrowBowlVirtualWidth(): number {
    return this.bowlWidth * 0.9;
  }

  private get narrowBowlCorrection(): number {
    return this.horThickness * 0.15;
  }

  private get narrowBowlWidth(): number {
    return this.narrowBowlVirtualWidth - this.narrowBowlCorrection;
  }

  private get xalWidth(): number {
    return this.narrowBowlVirtualWidth * 2 - this.horThickness;
  }

  // x, j の文字に共通する細い丸い部分の外側の曲線の 4 分の 1 を、左端から上端への向きで生成します。
  @part()
  public partOuterLeftNarrowBowl(): Part {
    let width = this.narrowBowlVirtualWidth / 2;
    let height = this.mean / 2 + this.overshoot;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // x, j の文字に共通する細い丸い部分の外側の曲線の 4 分の 1 を、右端から上端への向きで生成します。
  // ただし、他のトレイルと使い方を揃えるため、左右反転してあります。
  @part()
  public partOuterRightNarrowBowl(): Part {
    let width = this.narrowBowlVirtualWidth / 2 - this.narrowBowlCorrection;
    let height = this.mean / 2 + this.overshoot;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // x, j の文字に共通する細い丸い部分の内側の曲線の 4 分の 1 を、左端から上端への向きで生成します。
  @part()
  public partInnerNarrowBowl(): Part {
    let width = this.narrowBowlVirtualWidth / 2 - this.horThickness;
    let height = this.mean / 2 - this.verThickness + this.overshoot;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // x, j の文字に共通する細い丸い部分を生成します。
  // 2 つ重ねたときに重なった部分が太く見えすぎないように、右側を少し細く補正してあります。
  // 原点は全体の中央にあります。
  @part()
  public partNarrowBowl(): Part {
    let outerPart = Part.seq(
      this.partOuterLeftNarrowBowl().reflectVer(),
      this.partOuterRightNarrowBowl().rotateHalfTurn().reverse(),
      this.partOuterRightNarrowBowl().reflectHor(),
      this.partOuterLeftNarrowBowl().reverse()
    );
    let innerPart = Part.seq(
      this.partInnerNarrowBowl().reflectVer(),
      this.partInnerNarrowBowl().rotateHalfTurn().reverse(),
      this.partInnerNarrowBowl().reflectHor(),
      this.partInnerNarrowBowl().reverse()
    );
    let part = Part.stack(
      outerPart,
      innerPart.reverse().translate($(this.horThickness, 0))
    );
    part.moveOrigin($(this.narrowBowlVirtualWidth / 2, 0));
    return part;
  }

  // x の文字と同じ形を生成します。
  // 原点は全体の中央にあります。
  @part()
  public partXal(): Part {
    let part = Part.union(
      this.partNarrowBowl(),
      this.partNarrowBowl().reflectHor().translate($(this.narrowBowlVirtualWidth - this.horThickness, 0))
    );
    part.moveOrigin($(this.xalWidth / 2 - this.narrowBowlVirtualWidth / 2, 0));
    return part;
  }

  @glyph("x", "X")
  public glyphXal(): Glyph {
    let part = Part.union(
      this.partXal().translate($(this.xalWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("j", "J")
  public glyphJol(): Glyph {
    let part = Part.union(
      this.partXal().translate($(this.xalWidth / 2, -this.mean / 2)),
      this.partTransphone().translate($(this.xalWidth + this.transphoneGap, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  // n の文字の書き終わりと書き始めの箇所について、その先端の外側の端と丸い部分の端との水平距離を表します。
  // 曲線の外側の曲がり具合を指定しているので、線の太さが大きくなるとより内側に曲がることに注意してください。
  private get nesLegBend(): number {
    return this.yesLegBend;
  }

  private get spineWidth(): number {
    return this.bowlWidth * 0.5;
  }

  private get nesWidth(): number {
    return this.narrowBowlVirtualWidth + this.spineWidth;
  }

  private calcSpineError(innerHandle: number, outerHandle: number, bend: number, width: number): number {
    let path = PathUtil.bezier($(0, 0), $(innerHandle, 0), $(-outerHandle, 0), $(width, -bend));
    let basePoint = $(width / 2, -bend / 2 + this.verThickness / 2);
    let nearestPoint = path.getNearestPoint(basePoint);
    let angle = nearestPoint.subtract(basePoint).getAngle($(1, 0)) - 90;
    let error = Math.abs(nearestPoint.getDistance(basePoint) - this.calcIdealThickness(angle) / 2);
    return error;
  }

  private searchSpineInnerHandle(outerHandle: number, bend: number, width: number): number {
    let interval = 0.5;
    let resultHandle = 0;
    let minimumError = 10000;
    for (let innerHandle = 0 ; innerHandle <= width ; innerHandle += interval) {
      let error = this.calcSpineError(innerHandle, outerHandle, bend, width);
      if (error < minimumError) {
        minimumError = error;
        resultHandle = innerHandle;
      }
    }
    return resultHandle;
  }

  // n の文字の書き終わりの箇所にある曲線を、上端から下端への向きで生成します。
  @part()
  public partNesLeg(): Part {
    let bend = this.nesLegBend;
    let height = this.mean / 2;
    let rightHandle = height * 0.6;
    let part = Part.bezier($(0, 0), $(0, rightHandle), null, $(-bend, height));
    return part;
  }

  // n の文字の中央部分の上側の曲線を、下端から上端への向きで生成します。
  @part()
  public partTopSpine(): Part {
    let width = this.spineWidth;
    let bend = this.mean - this.verThickness + this.overshoot * 2;
    let rightHandle = width * 1.05;
    let leftHandle = this.searchSpineInnerHandle(rightHandle, bend, width);
    let part = Part.bezier($(0, 0), $(leftHandle, 0), $(-rightHandle, 0) , $(width, -bend));
    return part;
  }

  // n の文字の中央部分の下側の曲線を、下端から上端への向きで生成します。
  @part()
  public partBottomSpine(): Part {
    let width = this.spineWidth;
    let bend = this.mean - this.verThickness + this.overshoot * 2;
    let leftHandle = width * 1.05;
    let rightHandle = this.searchSpineInnerHandle(leftHandle, bend, width);
    let part = Part.bezier($(0, 0), $(leftHandle, 0), $(-rightHandle, 0) , $(width, -bend));
    return part;
  }

  // n の文字と同じ形を生成します。
  // 原点は全体の中央にあります。
  @part()
  public partNes(): Part {
    let part = Part.seq(
      this.partOuterLeftNarrowBowl().reflectVer(),
      this.partBottomSpine(),
      this.partInnerNarrowBowl().reflectHor().reverse(),
      this.partNesLeg(),
      this.partCut(),
      this.partNesLeg().reverse(),
      this.partOuterLeftNarrowBowl().reflectHor(),
      this.partTopSpine().reverse(),
      this.partInnerNarrowBowl().reflectVer().reverse(),
      this.partNesLeg().rotateHalfTurn(),
      this.partCut().reverse(),
      this.partNesLeg().rotateHalfTurn().reverse()
    );
    part.moveOrigin($(this.nesWidth / 2, 0));
    return part;
  }

  @glyph("n", "N")
  public glyphNes(): Glyph {
    let part = Part.union(
      this.partNes().translate($(this.nesWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("m", "M")
  public glyphMes(): Glyph {
    let part = Part.union(
      this.partNes().translate($(this.nesWidth / 2, -this.mean / 2)),
      this.partTransphone().translate($(this.nesWidth + this.transphoneGap, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get acuteHorThickness(): number {
    return Math.min(this.config.weightConst * 90, this.config.weightConst * 40 + 35);
  }

  private get acuteVerThickness(): number {
    return this.acuteHorThickness * this.config.contrastRatio;
  }

  private get acuteWidth(): number {
    return this.bowlWidth * 0.6;
  }

  private get acuteHeight(): number {
    return this.descent * 0.55;
  }

  private get diacriticGap(): number {
    return this.descent * 0.25;
  }

  // アキュートアクセントの丸い部分の外側の曲線の半分を、左下端から上端への向きで生成します。
  @part()
  public partOuterAcute(): Part {
    let width = this.acuteWidth / 2;
    let height = this.acuteHeight;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // アキュートアクセントの丸い部分の内側の曲線の半分を、左下端から上端への向きで生成します。
  @part()
  public partInnerAcute(): Part {
    let width = this.acuteWidth / 2 - this.acuteHorThickness;
    let height = this.acuteHeight - this.acuteVerThickness;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // アキュートアクセントの下部にある水平に切られた部分を、左端から右端への向きで生成します。
  @part()
  public partAcuteCut(): Part {
    let part = Part.line($(0, 0), $(this.acuteHorThickness, 0));
    return part;
  }

  // アキュートアクセントと同じ形を生成します。
  // 原点は下部中央にあります。
  @part()
  public partAcute(): Part {
    let part = Part.seq(
      this.partAcuteCut(),
      this.partInnerAcute(),
      this.partInnerAcute().reflectHor().reverse(),
      this.partAcuteCut(),
      this.partOuterAcute().reflectHor(),
      this.partOuterAcute().reverse()
    );
    part.moveOrigin($(this.acuteWidth / 2, 0));
    return part;
  }

  private get circumflexHorThickness(): number {
    return Math.min(this.config.weightConst * 90, this.config.weightConst * 40 + 35);
  }

  private get circumflexVerThickness(): number {
    return this.circumflexHorThickness * this.config.contrastRatio;
  }

  private get circumflexWidth(): number {
    return this.bowlWidth * 0.5;
  }

  private get circumflexHeight(): number {
    return this.descent * 0.75;
  }

  // サーカムフレックスアクセントの外側の曲線の 4 分の 1 を、左端から上端への向きで生成します。
  @part()
  public partOuterCircumflex(): Part {
    let width = this.circumflexWidth / 2;
    let height = this.circumflexHeight / 2;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // サーカムフレックスアクセントの内側の曲線の 4 分の 1 を、左端から上端への向きで生成します。
  @part()
  public partInnerCircumflex(): Part {
    let width = this.circumflexWidth / 2 - this.circumflexHorThickness;
    let height = this.circumflexHeight / 2 - this.circumflexVerThickness;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // サーカムフレックスアクセントと同じ形を生成します。
  // 原点は下部中央にあります。
  @part()
  public partCircumflex(): Part {
    let outerPart = Part.seq(
      this.partOuterCircumflex().reflectVer(),
      this.partOuterCircumflex().rotateHalfTurn().reverse(),
      this.partOuterCircumflex().reflectHor(),
      this.partOuterCircumflex().reverse()
    );
    let innerPart = Part.seq(
      this.partInnerCircumflex().reflectVer(),
      this.partInnerCircumflex().rotateHalfTurn().reverse(),
      this.partInnerCircumflex().reflectHor(),
      this.partInnerCircumflex().reverse()
    );
    let part = Part.stack(
      outerPart,
      innerPart.reverse().translate($(this.circumflexHorThickness, 0))
    );
    part.moveOrigin($(this.circumflexWidth / 2, this.circumflexHeight / 2));
    return part;
  }

  @glyph("a", "A")
  public glyphAt(): Glyph {
    let part = Part.union(
      this.partBowl().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("á", "Á")
  public glyphAtAcute(): Glyph {
    let part = Part.union(
      this.partBowl().translate($(this.bowlWidth / 2, -this.mean / 2)),
      this.partAcute().translate($(this.bowlWidth / 2, -this.mean - this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("à", "À")
  public glyphAtGrave(): Glyph {
    let part = Part.union(
      this.partBowl().translate($(this.bowlWidth / 2, -this.mean / 2)),
      this.partAcute().reflectVer().translate($(this.bowlWidth / 2, -this.mean - this.acuteHeight - this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("â", "Â")
  public glyphAtCircumflex(): Glyph {
    let part = Part.union(
      this.partBowl().translate($(this.bowlWidth / 2, -this.mean / 2)),
      this.partCircumflex().translate($(this.bowlWidth / 2, -this.mean - this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  // i の文字のディセンダー部分について、その先端の中央と上にある丸い部分の左端との水平距離を表します。
  private get itTailBend(): number {
    return this.bowlWidth * 0.6;
  }

  private get linkWidth(): number {
    return this.bowlWidth * 0.8;
  }

  // i の文字のディセンダーの左側の曲線を、上端から下端への向きで生成します。
  @part()
  public partLeftItTail(): Part {
    let bend = this.itTailBend - this.horThickness / 2;
    let height = this.mean / 2 + this.descent;
    let topHandle = this.descent * 1.2;
    let bottomHandle = this.searchTailInnerHandle(topHandle, bend, height);
    let part = Part.bezier($(0, 0), $(0, topHandle), $(0, -bottomHandle), $(bend, height));
    return part;
  }

  // i の文字のディセンダーの右側の曲線を、上端から下端への向きで生成します。
  @part()
  public partRightItTail(): Part {
    let bend = this.itTailBend - this.horThickness / 2;
    let height = this.mean / 2 + this.descent;
    let bottomHandle = this.descent * 1.2;
    let topHandle = this.searchTailInnerHandle(bottomHandle, bend, height);
    let part = Part.bezier($(0, 0), $(0, topHandle), $(0, -bottomHandle), $(bend, height));
    return part;
  }

  // i の文字と同じ形を生成します。
  // 原点は上部の丸い部分の中央にあるので、回転や反転で変化しません。
  @part()
  public partIt(): Part {
    let part = Part.seq(
      this.partLeftItTail(),
      this.partCut(),
      this.partRightItTail().reverse(),
      this.partInnerBowl(),
      this.partInnerTalBeak().reverse(),
      this.partCut(),
      this.partOuterTalBeak(),
      this.partOuterBowl().reverse()
    );
    part.moveOrigin($(this.talWidth / 2, 0));
    return part;
  }

  @glyph("i", "I")
  public glyphIt(): Glyph {
    let part = Part.union(
      this.partIt().translate($(this.talWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("í", "Í")
  public glyphItAcute(): Glyph {
    let part = Part.union(
      this.partIt().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partAcute().translate($(this.bowlWidth / 2, -this.mean - this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("ì", "Ì")
  public glyphItGrave(): Glyph {
    let part = Part.union(
      this.partIt().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partAcute().reflectVer().translate($(this.bowlWidth / 2, -this.mean - this.acuteHeight - this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("î", "Î")
  public glyphItCircumflex(): Glyph {
    let part = Part.union(
      this.partIt().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partCircumflex().translate($(this.bowlWidth / 2, -this.mean - this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("e", "E")
  public glyphEt(): Glyph {
    let part = Part.union(
      this.partIt().rotateHalfTurn().translate($(this.talWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("é", "É")
  public glyphEtAcute(): Glyph {
    let part = Part.union(
      this.partIt().rotateHalfTurn().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partAcute().reflectVer().translate($(this.talBeakWidth, this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("è", "È")
  public glyphEtGrave(): Glyph {
    let part = Part.union(
      this.partIt().rotateHalfTurn().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partAcute().translate($(this.talBeakWidth, this.acuteHeight + this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("ê", "Ê")
  public glyphEtCircumflex(): Glyph {
    let part = Part.union(
      this.partIt().rotateHalfTurn().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partCircumflex().translate($(this.talBeakWidth, this.circumflexHeight + this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  // u の文字のディセンダー部分について、その先端の中央と上にある折れ曲がる部分の右端との水平距離を表します。
  private get utTailBend(): number {
    return this.bowlWidth * 0.45;
  }

  private get linkUpperCorrection(): number {
    return this.verThickness * 0.1;
  }

  private get linkLowerCorrection(): number {
    return this.verThickness * 0.1;
  }

  // u の文字のディセンダーと接続する部分の外側の曲線を、上端から下端への向きで生成します。
  @part()
  public partOuterLink(): Part {
    let width = this.linkWidth;
    let height = this.mean / 2 - this.linkLowerCorrection;
    let leftHandle = height * 0.02;
    let bottomHandle = width;
    let part = Part.bezier($(0, 0), $(0, leftHandle), $(-bottomHandle, 0), $(width, height));
    return part;
  }

  // u の文字のディセンダーと接続する部分の内側の曲線を、上端から下端への向きで生成します。
  @part()
  public partInnerLink(): Part {
    let width = this.linkWidth - this.horThickness;
    let height = this.mean / 2 - this.verThickness;
    let leftHandle = height * 0.02;
    let bottomHandle = width;
    let part = Part.bezier($(0, 0), $(0, leftHandle), $(-bottomHandle, 0), $(width, height));
    return part;
  }

  // u の文字のディセンダーの左側の曲線を、下端から上端への向きで生成します。
  @part()
  public partLeftUtTail(): Part {
    let bend = this.utTailBend + this.horThickness / 2;
    let height = this.descent + this.verThickness - this.linkUpperCorrection;
    let leftHandle = height * 0.1;
    let topHandle = bend;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(bend, -height));
    return part;
  }

  // u の文字のディセンダーの右側の曲線を、下端から上端への向きで生成します。
  @part()
  public partRightUtTail(): Part {
    let bend = this.utTailBend - this.horThickness / 2;
    let height = this.descent;
    let leftHandle = height * 0.1;
    let topHandle = bend;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(bend, -height));
    return part;
  }

  // u の文字のベースラインより上にある丸い部分を生成します。
  // ディセンダーと重ねたときに太く見えすぎないように、下側を少し細く補正してあります。
  // 原点は全体の中央にあるので、回転や反転で変化しません。
  @part()
  public partUpperUt(): Part {
    let part = Part.seq(
      this.partOuterLink(),
      Part.line($(0, 0), $(0, -this.verThickness + this.linkLowerCorrection)),
      this.partInnerLink().reverse(),
      this.partInnerBowl(),
      this.partInnerTalBeak().reverse(),
      this.partCut(),
      this.partOuterTalBeak(),
      this.partOuterBowl().reverse()
    );
    part.moveOrigin($(this.talWidth / 2, 0));
    return part;
  }

  // u の文字のディセンダーを生成します。
  // ベースラインより上の部分と重ねたときに太く見えすぎないように、上側を少し細く補正してあります。
  // 原点は右上の角にあります。
  @part()
  public partUtTail(): Part {
    let part  = Part.seq(
      this.partLeftUtTail().reverse(),
      this.partCut(),
      this.partRightUtTail(),
      Part.line($(0, 0), $(0, -this.verThickness + this.linkUpperCorrection))
    );
    return part;
  }

  // u の文字と同じ形を生成します。
  // 原点は丸い部分の中央にあるので、回転や反転で変化しません。
  @part()
  public partUt(): Part {
    let part = Part.union(
      this.partUpperUt(),
      this.partUtTail().translate($(-this.talWidth / 2 + this.linkWidth, this.mean / 2 - this.verThickness + this.linkUpperCorrection))
    );
    return part;
  }

  @glyph("u", "U")
  public glyphUt(): Glyph {
    let part = Part.union(
      this.partUt().translate($(this.talWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("ú", "Ú")
  public glyphUtAcute(): Glyph {
    let part = Part.union(
      this.partUt().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partAcute().translate($(this.bowlWidth / 2, -this.mean - this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("ù", "Ù")
  public glyphUtGrave(): Glyph {
    let part = Part.union(
      this.partUt().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partAcute().reflectVer().translate($(this.bowlWidth / 2, -this.mean - this.acuteHeight - this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("û", "Û")
  public glyphUtCircumflex(): Glyph {
    let part = Part.union(
      this.partUt().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partCircumflex().translate($(this.bowlWidth / 2, -this.mean - this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("o", "O")
  public glyphOt(): Glyph {
    let part = Part.union(
      this.partUt().rotateHalfTurn().translate($(this.talWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("ó", "Ó")
  public glyphOtAcute(): Glyph {
    let part = Part.union(
      this.partUt().rotateHalfTurn().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partAcute().reflectVer().translate($(this.talBeakWidth, this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("ò", "Ò")
  public glyphOtGrave(): Glyph {
    let part = Part.union(
      this.partUt().rotateHalfTurn().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partAcute().translate($(this.talBeakWidth, this.acuteHeight + this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("ô", "Ô")
  public glyphOtCircumflex(): Glyph {
    let part = Part.union(
      this.partUt().rotateHalfTurn().translate($(this.talWidth / 2, -this.mean / 2)),
      this.partCircumflex().translate($(this.talBeakWidth, this.circumflexHeight + this.diacriticGap))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  // 6 の文字と同じ形を生成します。
  // 原点は丸い部分の中央にあるので、回転や反転で変化しません。
  @part()
  public partRac(): Part {
    let part = Part.union(
      this.partYes().rotateHalfTurn(),
      this.partLesTail().translate($(this.bowlWidth / 2 - this.horThickness, 0))
    );
    return part;
  }

  @glyph("6")
  public glyphRac(): Glyph {
    let part = Part.union(
      this.partRac().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("4")
  public glyphPav(): Glyph {
    let part = Part.union(
      this.partRac().rotateHalfTurn().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("2")
  public glyphQic(): Glyph {
    let part = Part.union(
      this.partRac().reflectHor().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("8")
  public glyphKeq(): Glyph {
    let part = Part.union(
      this.partRac().reflectVer().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  // 0 の文字の斜線の部分の太さに乗算する係数を表します。
  private get solidusThicknessRatio(): number {
    return Math.min(-this.config.weightConst * 0.12 + 1.084, 1);
  }

  private get solidusGrade(): number {
    return this.mean / 2 * 0.8;
  }

  private get solidusLength(): number {
    let line = PathUtil.line($(0, 0), $(this.bowlWidth / 2, -this.solidusGrade));
    let rawLength = line.getIntersections(this.partBowl().item)[1].point.getDistance($(0, 0));
    let length = rawLength * 2 - this.horThickness;
    return length;
  }

  private get solidusThickness(): number {
    return this.calcIdealThickness(-this.solidusAngle) * this.solidusThicknessRatio;
  }

  private get solidusAngle(): number {
    return -$(this.bowlWidth / 2, -this.solidusGrade).getAngle($(1, 0));
  }

  // 0 の文字の斜線の部分の長い方の直線を、左端から右端への向きで生成します。
  // パーツを構成した後に回転することを想定しているので、このトレイルは水平です。
  @part()
  public partSolidusSegment(): Part {
    let part = Part.line($(0, 0), $(this.solidusLength, 0));
    return part;
  }

  // 0 の文字の斜線の部分の短い方の直線を、上端から下端への向きで生成します。
  // パーツを構成した後に回転することを想定しているので、このトレイルは鉛直です。
  @part()
  public partSolidusCut(): Part {
    let part = Part.line($(0, 0), $(0, this.solidusThickness));
    return part;
  }

  // 0 の文字の斜線の部分を生成します。
  // 原点は全体の中央にあります。
  @part()
  public partSolidus(): Part {
    let part = Part.seq(
      this.partSolidusCut(),
      this.partSolidusSegment(),
      this.partSolidusCut().reverse(),
      this.partSolidusSegment().reverse()
    );
    part.moveOrigin($(this.solidusLength / 2, this.solidusThickness / 2));
    part.rotate(this.solidusAngle);
    return part;
  }

  // 0 の文字と同じ形を生成します。
  // 原点は全体の中央にあります。
  @part()
  public partNuf(): Part {
    let part = Part.union(
      this.partBowl(),
      this.partSolidus()
    );
    return part;
  }

  @glyph("0")
  public glyphNuf(): Glyph {
    let part = Part.union(
      this.partNuf().translate($(this.bowlWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get xefBeakWidth(): number {
    return this.narrowBowlVirtualWidth / 2 * 0.95;
  }

  private get xefBeakHeight(): number {
    return this.mean * 0.35;
  }

  private get xefHalfVirtualWidth(): number {
    return this.narrowBowlVirtualWidth / 2 + this.xefBeakWidth;
  }

  private get xefWidth(): number {
    return this.xefHalfVirtualWidth * 2 - this.horThickness;
  }

  // 5 の文字の左上にある部分の外側の曲線を、右端から上端への向きで生成します。
  @part()
  public partOuterXefBeak(): Part {
    let width = this.xefBeakWidth;
    let height = this.xefBeakHeight + this.overshoot;
    let leftHandle = height * 0.05;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // 5 の文字の左上にある部分の内側の曲線を、右端から上端への向きで生成します。
  @part()
  public partInnerXefBeak(): Part {
    let width = this.xefBeakWidth - this.horThickness;
    let height = this.xefBeakHeight - this.verThickness + this.overshoot;
    let leftHandle = height * 0.05;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // 5 の文字の左半分を生成します。
  // 2 つ重ねたときに重なった部分が太く見えすぎないように、右側を少し細く補正してあります。
  // 原点は全体の中央にあります。
  @part()
  public partXefHalf(): Part {
    let part = Part.seq(
      this.partOuterRightNarrowBowl().reflectHor(),
      this.partOuterXefBeak().reverse(),
      this.partCut(),
      this.partInnerXefBeak(),
      this.partInnerNarrowBowl().reflectHor().reverse(),
      this.partInnerNarrowBowl().rotateHalfTurn(),
      this.partInnerXefBeak().reflectVer().reverse(),
      this.partCut().reverse(),
      this.partOuterXefBeak().reflectVer(),
      this.partOuterRightNarrowBowl().rotateHalfTurn().reverse()
    );
    part.moveOrigin($(-this.xefHalfVirtualWidth / 2 + this.narrowBowlCorrection, 0));
    return part;
  }

  // 5 の文字と同じ形を生成します。
  // 原点は全体の中央にあります。
  @part()
  public partXef(): Part {
    let part = Part.union(
      this.partXefHalf(),
      this.partXefHalf().reflectHor().translate($(this.xefHalfVirtualWidth - this.horThickness, 0))
    );
    part.moveOrigin($(this.xefWidth / 2 - this.xefHalfVirtualWidth / 2, 0));
    return part;
  }

  @glyph("5")
  public glyphXef(): Glyph {
    let part = Part.union(
      this.partXef().translate($(this.xefWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get tasBeakWidth(): number {
    return this.talBeakWidth;
  }

  private get tasBeakHeight(): number {
    return this.mean * 0.3;
  }

  private get tasShoulderWidth(): number {
    return this.bowlWidth / 2 * 1;
  }

  // 1 の文字の右下にある中央の横線と繋がる部分に含まれる直線部分の長さを表します。
  // この部分のアウトラインを単純に 1 つの曲線としてしまうと尖って見えてしまうため、途中から垂直な直線に連結させています。
  // その垂直な直線部分の長さを指定します。
  private get tasShoulderStraightHeight(): number {
    return this.verThickness * 0.5;
  }

  // 1 の文字の横棒について、その鉛直方向中央とベースラインとの鉛直距離を表します。
  private get tasCrossbarAltitude(): number {
    return this.mean * 0.45;
  }

  private get tasWidth(): number {
    return this.bowlWidth / 2 + Math.max(this.tasShoulderWidth, this.tasBeakWidth);
  }

  // 1 の文字の右上にある部分の外側の曲線を、右端から上端への向きで生成します。
  @part()
  public partOuterTasBeak(): Part {
    let width = this.tasBeakWidth;
    let height = this.tasBeakHeight + this.overshoot;
    let rightHandle = height * 0.05;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -rightHandle), $(topHandle, 0), $(-width, -height));
    return part;
  }

  // 1 の文字の右上にある部分の内側の曲線を、右端から上端への向きで生成します。
  @part()
  public partInnerTasBeak(): Part {
    let width = this.tasBeakWidth - this.horThickness;
    let height = this.tasBeakHeight - this.verThickness + this.overshoot;
    let rightHandle = height * 0.05;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -rightHandle), $(topHandle, 0), $(-width, -height));
    return part;
  }

  // 1 の文字の右下にある部分の外側の曲線を、上端から下端への向きで生成します。
  @part()
  public partOuterTasShoulder(): Part {
    let width = this.tasShoulderWidth;
    let height = this.tasCrossbarAltitude + this.verThickness / 2 - this.tasShoulderStraightHeight + this.overshoot;
    let rightHandle = height * 0.1;
    let bottomHandle = width;
    let part = Part.bezier($(0, 0), $(0, rightHandle), $(bottomHandle, 0), $(-width, height));
    return part;
  }

  // 1 の文字の右下にある部分の内側の曲線を、上端から下端への向きで生成します。
  @part()
  public partInnerTasShoulder(): Part {
    let width = this.tasShoulderWidth - this.horThickness;
    let height = this.tasCrossbarAltitude - this.verThickness / 2 - this.tasShoulderStraightHeight + this.overshoot;
    let rightHandle = height * 0.1;
    let bottomHandle = width;
    let part = Part.bezier($(0, 0), $(0, rightHandle), $(bottomHandle, 0), $(-width, height));
    return part;
  }

  // 1 の文字の右下にある部分に含まれる直線を、上端から下端への向きで生成します。
  @part()
  public partTasShoulderStraight(): Part {
    let part = Part.line($(0, 0), $(0, -this.tasShoulderStraightHeight));
    return part;
  }

  // 1 の文字の横線以外の部分を生成します。
  // 原点は全体の中央にあるので、回転や反転で変化しません。
  @part()
  public partTasFrame(): Part {
    let part = Part.seq(
      this.partOuterBowl().reflectVer(),
      this.partOuterTasShoulder().reverse(),
      this.partTasShoulderStraight(),
      this.partCut().reverse(),
      this.partTasShoulderStraight().reverse(),
      this.partInnerTasShoulder(),
      this.partInnerBowl().reflectVer().reverse(),
      this.partInnerBowl(),
      this.partInnerTasBeak().reverse(),
      this.partCut(),
      this.partOuterTasBeak(),
      this.partOuterBowl().reverse()
    );
    part.moveOrigin($(this.tasWidth / 2, 0));
    return part;
  }

  // 1 の文字の横線の部分の直線を、左端から右端への向きで生成します。
  @part()
  public partTasCrossbarSegment(): Part {
    let part = Part.line($(0, 0), $(this.bowlWidth / 2 + this.tasShoulderWidth - this.horThickness, 0));
    return part;
  }

  // 文字の書き始めや書き終わりの位置にある垂直に切られた部分を、上端から下端への向きで生成します。
  @part()
  public partVerticalCut(): Part {
    let part = Part.line($(0, 0), $(0, this.verThickness));
    return part;
  }

  // 1 の文字の横線の部分を生成します。
  // 原点は左上の角にあります。
  @part()
  public partTasCrossbar(): Part {
    let part = Part.seq(
      this.partVerticalCut(),
      this.partTasCrossbarSegment(),
      this.partVerticalCut().reverse(),
      this.partTasCrossbarSegment().reverse()
    );
    return part;
  }

  // 1 の文字と同じ形を生成します。
  // 原点は丸い部分の中央にあるので、回転や反転で変化しません。
  @part()
  public partTas(): Part {
    let part = Part.union(
      this.partTasFrame(),
      this.partTasCrossbar().translate($(this.horThickness / 2 - this.tasWidth / 2, -this.tasCrossbarAltitude + this.mean / 2 - this.verThickness / 2))
    );
    return part;
  }

  @glyph("1")
  public glyphTas(): Glyph {
    let part = Part.union(
      this.partTas().translate($(this.tasWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("9")
  public glyphVun(): Glyph {
    let part = Part.union(
      this.partTas().rotateHalfTurn().translate($(this.tasWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get yusWidth(): number {
    return this.bowlWidth * 1.3;
  }

  private get yusLegBend(): number {
    return this.yesLegBend;
  }

  private get yusShoulderStraightWidth(): number {
    return this.horThickness * this.yusCrossbarThicknessRatio * 0.7;
  }

  private get yusCrossbarThicknessRatio(): number {
    return 1;
  }

  private get yusCrossbarLatitude(): number {
    return this.yusWidth / 2 * 0.95;
  }

  // 3 の文字の左上にある丸い部分の外側の曲線を、左端から上端への向きで生成します。
  @part()
  public partOuterYusBowl(): Part {
    let width = this.yusWidth / 2;
    let height = this.mean / 2 + this.overshoot;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // 3 の文字の左上にある丸い部分の内側の曲線を、左端から上端への向きで生成します。
  @part()
  public partInnerYusBowl(): Part {
    let width = this.yusWidth / 2 - this.horThickness;
    let height = this.mean / 2 - this.verThickness + this.overshoot;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, -leftHandle), $(-topHandle, 0), $(width, -height));
    return part;
  }

  // 3 の文字の右下にある曲線を、上端から下端への向きで生成します。
  @part()
  public partYusLeg(): Part {
    let bend = this.yusLegBend;
    let height = this.mean / 2;
    let leftHandle = height * 0.6;
    let part = Part.bezier($(0, 0), $(0, leftHandle), null, $(-bend, height));
    return part;
  }

  // 3 の文字の左下にある部分の外側の曲線を、左端から下端への向きで生成します。
  @part()
  public partOuterYusShoulder(): Part {
    let width = this.yusCrossbarLatitude + this.horThickness * this.yusCrossbarThicknessRatio / 2 - this.yusShoulderStraightWidth;
    let height = this.mean / 2;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, leftHandle), $(-topHandle, 0), $(width, height));
    return part;
  }

  // 3 の文字の左下にある部分の内側の曲線を、左端から下端への向きで生成します。
  @part()
  public partInnerYusShoulder(): Part {
    let width = this.yusCrossbarLatitude + this.horThickness * (this.yusCrossbarThicknessRatio - 2) / 2 - this.yusShoulderStraightWidth;
    let height = this.mean / 2 - this.verThickness;
    let leftHandle = height * 0.1;
    let topHandle = width;
    let part = Part.bezier($(0, 0), $(0, leftHandle), $(-topHandle, 0), $(width, height));
    return part;
  }

  // 3 の文字の左下にある部分に含まれる直線を、左端から右端への向きで生成します。
  @part()
  public partYusShoulderStraight(): Part {
    let part = Part.line($(0, 0), $(this.yusShoulderStraightWidth, 0));
    return part;
  }

  // 3 の文字の縦線以外の部分を生成します。
  // 原点は全体の中央にあるので、回転や反転で変化しません。
  @part()
  public partYusFrame(): Part {
    let part = Part.seq(
      this.partOuterYusShoulder(),
      this.partYusShoulderStraight(),
      this.partVerticalCut().reverse(),
      this.partYusShoulderStraight().reverse(),
      this.partInnerYusShoulder().reverse(),
      this.partInnerYusBowl(),
      this.partInnerYusBowl().reflectHor().reverse(),
      this.partYusLeg(),
      this.partCut(),
      this.partYusLeg().reverse(),
      this.partOuterYusBowl().reflectHor(),
      this.partOuterYusBowl().reverse()
    );
    part.moveOrigin($(this.yusWidth / 2, 0));
    return part;
  }

  // 3 の文字の縦線の部分の直線を、上端から下端への向きで生成します。
  @part()
  public partYusCrossbarSegment(): Part {
    let part = Part.line($(0, 0), $(0, this.mean - this.verThickness));
    return part;
  }

  // 3 の文字の縦線の部分の水平に切られた部分を、左端から右端への向きで生成します。
  @part()
  public partYusCrossbarCut(): Part {
    let part = Part.line($(0, 0), $(this.horThickness * this.yusCrossbarThicknessRatio, 0));
    return part;
  }

  // 3 の文字と縦線の部分を生成します。
  // 原点は左上の角にあります。
  @part()
  public partYusCrossbar(): Part {
    let part = Part.seq(
      this.partYusCrossbarSegment(),
      this.partYusCrossbarCut(),
      this.partYusCrossbarSegment().reverse(),
      this.partYusCrossbarCut().reverse()
    );
    return part;
  }

  // 3 の文字と同じ形を生成します。
  // 原点は丸い部分の中央にあるので、回転や反転で変化しません。
  @part()
  public partYus(): Part {
    let part = Part.union(
      this.partYusFrame(),
      this.partYusCrossbar().translate($(this.yusCrossbarLatitude - this.yusWidth / 2 - this.horThickness * this.yusCrossbarThicknessRatio / 2, -this.mean / 2 + this.verThickness / 2))
    );
    return part;
  }

  @glyph("3")
  public glyphYus(): Glyph {
    let part = Part.union(
      this.partYus().translate($(this.yusWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("7")
  public glyphSiz(): Glyph {
    let part = Part.union(
      this.partYus().rotateHalfTurn().translate($(this.yusWidth / 2, -this.mean / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get dotWidth(): number {
    return Math.min(this.config.weightConst * 150, this.config.weightConst * 100 + 30);
  }

  private get dotGap(): number {
    return this.bowlWidth * 0.09;
  }

  // デックやパデックなどに含まれる円を生成します。
  // 原点は円に外接する矩形の左下の角からオーバーシュート分だけ上に移動した位置にあります。
  @part()
  public partDot(): Part {
    let part = Part.seq(
      Part.circle($(0, 0), this.dotWidth / 2)
    );
    part.moveOrigin($(-this.dotWidth / 2, this.dotWidth / 2 - this.overshoot));
    return part;
  }

  @glyph(",")
  public glyphTadek(): Glyph {
    let part = Part.union(
      this.partDot()
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph(".")
  public glyphDek(): Glyph {
    let part = Part.union(
      this.partDot(),
      this.partDot().translate($(this.dotWidth + this.dotGap, 0))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get kaltakBearing(): number {
    return this.bearing * 1.8;
  }

  private get upperKaltakAltitude(): number {
    return this.mean * 0.7;
  }

  private get middotAltitude(): number {
    return this.mean / 2;
  }

  // カルタックなどに含まれるベースラインより上に浮いた円を生成します。
  // partDot が返すパーツと形は同じですが、原点の位置が異なります。
  // 原点は左端にあります。
  @part()
  public partFloatingDot(): Part {
    let part = Part.seq(
      Part.circle($(0, 0), this.dotWidth / 2)
    );
    part.moveOrigin($(-this.dotWidth / 2, 0));
    return part;
  }

  @glyph(":")
  public glyphKaltak(): Glyph {
    let part = Part.union(
      this.partDot(),
      this.partFloatingDot().translate($(0, -this.upperKaltakAltitude))
    );
    let bearings = {left: this.kaltakBearing, right: this.kaltakBearing};
    let glyph = Glyph.byBearings(part, this.metrics, bearings);
    return glyph;
  }

  @glyph("·")
  public glyphMiddot(): Glyph {
    let part = Part.union(
      this.partFloatingDot().translate($(0, -this.middotAltitude))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get badekLeftBearing(): number {
    return this.bearing * 1.8;
  }

  private get badekGap(): number {
    return (this.mean + this.descent) * 0.13;
  }

  // バデックの棒状の部分の直線を、上端から下端への向きで生成します。
  @part()
  public partBadekStemSegment(): Part {
    let part = Part.line($(0, 0), $(0, this.mean + this.descent - this.dotWidth - this.badekGap + this.overshoot));
    return part;
  }

  // バデックの棒状の部分を生成します。
  // 原点は左下の角にあります。
  @part()
  public partBadekStem(): Part {
    let part = Part.seq(
      this.partCut(),
      this.partBadekStemSegment().reverse(),
      this.partCut().reverse(),
      this.partBadekStemSegment()
    );
    return part;
  }

  @glyph("!")
  public glyphBadek(): Glyph {
    let part = Part.union(
      this.partDot(),
      this.partDot().translate($(this.dotWidth + this.dotGap, 0)),
      this.partBadekStem().translate($(this.dotWidth / 2 - this.horThickness / 2, -this.dotWidth - this.badekGap + this.overshoot))
    );
    let bearings = {left: this.badekLeftBearing, right: this.bearing};
    let glyph = Glyph.byBearings(part, this.metrics, bearings);
    return glyph;
  }

  private get padekBend(): number {
    return Math.min(this.dotWidth + this.dotGap, this.bowlWidth * 0.3);
  }

  // パデックの棒状の部分の左側の曲線を、上端から下端への向きで生成します。
  @part()
  public partLeftPadekStem(): Part {
    let bend = this.padekBend;
    let height = this.mean + this.descent - this.dotWidth - this.badekGap + this.overshoot;
    let bottomHandle = height * 0.55;
    let topHandle = this.searchTailInnerHandle(bottomHandle, bend, height);
    let part = Part.bezier($(0, 0), $(0, topHandle), $(0, -bottomHandle), $(-bend, height));
    return part;
  }

  // パデックの棒状の部分の右側の曲線を、上端から下端への向きで生成します。
  @part()
  public partRightPadekStem(): Part {
    let bend = this.padekBend;
    let height = this.mean + this.descent - this.dotWidth - this.badekGap + this.overshoot;
    let topHandle = height * 0.55;
    let bottomHandle = this.searchTailInnerHandle(topHandle, bend, height);
    let part = Part.bezier($(0, 0), $(0, topHandle), $(0, -bottomHandle), $(-bend, height));
    return part;
  }

  // パデックの棒状の部分を生成します。
  // 原点は左下の角にあります。
  @part()
  public partPadekStem(): Part {
    let part = Part.seq(
      this.partCut(),
      this.partRightPadekStem().reverse(),
      this.partCut().reverse(),
      this.partLeftPadekStem()
    );
    return part;
  }

  @glyph("?")
  public glyphPadek(): Glyph {
    let part = Part.union(
      this.partDot(),
      this.partDot().translate($(this.dotWidth + this.dotGap, 0)),
      this.partPadekStem().translate($(this.dotWidth / 2 - this.horThickness / 2, -this.dotWidth - this.badekGap + this.overshoot))
    );
    let bearings = {left: this.badekLeftBearing, right: this.bearing};
    let glyph = Glyph.byBearings(part, this.metrics, bearings);
    return glyph;
  }

  private get nokHeight(): number {
    return (this.mean + this.descent) * 0.3;
  }

  // ノークの棒状の部分の縦の曲線を、上端から下端への向きで生成します。
  @part()
  public partNokStem(): Part {
    let part = Part.line($(0, 0), $(0, this.nokHeight));
    return part;
  }

  // ノークと同じ形を生成します。
  // 原点は左上の角にあります。
  @part()
  public partNok(): Part {
    let part = Part.seq(
      this.partNokStem(),
      this.partCut(),
      this.partNokStem().reverse(),
      this.partCut().reverse()
    );
    return part;
  }

  @glyph("'")
  public glyphNok(): Glyph {
    let part = Part.union(
      this.partNok().translate($(0, -this.mean - this.descent))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get dikakRightBearing(): number {
    return -this.bearing * 0.5;
  }

  private get dikakBend(): number {
    return this.bowlWidth * 0.15;
  }

  private get dikakHeight(): number {
    return (this.mean + this.descent) * 0.3;
  }

  // ディカックの棒状の部分の曲線を、上端から下端への向きで生成します。
  @part()
  public partDikakStem(): Part {
    let bend = this.dikakBend;
    let height = this.dikakHeight;
    let leftHandle = height * 0.6;
    let part = Part.bezier($(0, 0), null, $(0, -leftHandle), $(-bend, height));
    return part;
  }

  // ディカックと同じ形を生成します。
  // 原点は左上の角にあります。
  @part()
  public partDikak(): Part {
    let part = Part.seq(
      this.partDikakStem(),
      this.partCut(),
      this.partDikakStem().reverse(),
      this.partCut().reverse()
    );
    return part;
  }

  @glyph("ʻ")
  public glyphDikak(): Glyph {
    let part = Part.union(
      this.partDikak().translate($(this.dikakBend, -this.mean - this.descent))
    );
    let bearings = {left: this.bearing, right: this.dikakRightBearing};
    let glyph = Glyph.byBearings(part, this.metrics, bearings);
    return glyph;
  }

  // フェークの鉛直方向中央とベースラインとの鉛直距離を表します。
  private get fekAltitude(): number {
    return this.mean / 2;
  }

  private get fekWidth(): number {
    return this.bowlWidth * 0.6;
  }

  // フェークの直線を、左端から右端への向きで生成します。
  @part()
  public partFekHorizontal(): Part {
    let part = Part.line($(0, 0), $(this.fekWidth, 0));
    return part;
  }

  // フェークと同じ形を生成します。
  // 原点は左上の角にあります。
  @part()
  public partFek(): Part {
    let part = Part.seq(
      this.partVerticalCut(),
      this.partFekHorizontal(),
      this.partVerticalCut().reverse(),
      this.partFekHorizontal().reverse()
    );
    return part;
  }

  @glyph("-")
  public glyphFek(): Glyph {
    let part = Part.union(
      this.partFek().translate($(0, -this.fekAltitude - this.verThickness / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get fohakWidth(): number {
    return this.bowlWidth * 1.5;
  }

  // フォーハックの直線を、左端から右端への向きで生成します。
  @part()
  public partFohakHorizontal(): Part {
    let part = Part.line($(0, 0), $(this.fohakWidth, 0));
    return part;
  }

  // フォーハックと同じ形を生成します。
  // 原点は左上の角にあります。
  @part()
  public partFohak(): Part {
    let part = Part.seq(
      this.partVerticalCut(),
      this.partFohakHorizontal(),
      this.partVerticalCut().reverse(),
      this.partFohakHorizontal().reverse()
    );
    return part;
  }

  @glyph("…")
  public glyphFohak(): Glyph {
    let part = Part.union(
      this.partFohak().translate($(0, -this.verThickness))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get dashAltitude(): number {
    return this.mean / 2;
  }

  private get dashWidth(): number {
    return this.bowlWidth * 2;
  }

  // ダッシュの直線を、左端から右端への向きで生成します。
  @part()
  public partDashHorizontal(): Part {
    let part = Part.line($(0, 0), $(this.dashWidth, 0));
    return part;
  }

  // ダッシュと同じ形を生成します。
  // 原点は左上の角にあります。
  @part()
  public partDash(): Part {
    let part = Part.seq(
      this.partVerticalCut(),
      this.partDashHorizontal(),
      this.partVerticalCut().reverse(),
      this.partDashHorizontal().reverse()
    );
    return part;
  }

  @glyph("—")
  public glyphDash(): Glyph {
    let part = Part.union(
      this.partDash().translate($(0, -this.dashAltitude - this.verThickness / 2))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get rakutWidth(): number {
    return this.bowlWidth * 0.55;
  }

  private get rakutHeight(): number {
    return (this.mean + this.descent) * 0.6;
  }

  // ラクットの縦向きの棒状の部分の直線を、上端から下端への向きで生成します。
  @part()
  public partRakutVerticalSegment(): Part {
    let part = Part.line($(0, 0), $(0, this.rakutHeight));
    return part;
  }

  // ラクットの横向きの棒状の部分の直線を、左端から右端への向きで生成します。
  @part()
  public partRakutHorizontalSegment(): Part {
    let part = Part.line($(0, 0), $(this.rakutWidth, 0));
    return part;
  }

  // ラクットの縦向きの棒状の部分を生成します。
  // 原点は左上の角にあります。
  @part()
  public partRakutVertical(): Part {
    let part = Part.seq(
      this.partRakutVerticalSegment(),
      this.partCut(),
      this.partRakutVerticalSegment().reverse(),
      this.partCut().reverse()
    );
    return part;
  }

  // ラクットの横向きの棒状の部分を生成します。
  // 原点は左上の角にあります。
  @part()
  public partRakutHorizontal(): Part {
    let part = Part.seq(
      this.partVerticalCut(),
      this.partRakutHorizontalSegment(),
      this.partVerticalCut().reverse(),
      this.partRakutHorizontalSegment().reverse()
    );
    return part;
  }

  // 開きラクットと同じ形を生成します。
  // 原点は左上の角にあります。
  @part()
  public partOpeningRakut(): Part {
    let part = Part.union(
      this.partRakutVertical(),
      this.partRakutHorizontal()
    );
    return part;
  }

  @glyph("[", "«")
  public glyphOpeningRakut(): Glyph {
    let part = Part.union(
      this.partOpeningRakut().translate($(0, -this.mean - this.descent))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  @glyph("]", "»")
  public glyphClosingRakut(): Glyph {
    let part = Part.union(
      this.partOpeningRakut().reflectHor().translate($(this.rakutWidth, -this.mean - this.descent))
    );
    let glyph = Glyph.byBearings(part, this.metrics, this.bearings);
    return glyph;
  }

  private get spaceWidth(): number {
    return this.bowlWidth * 0.55;
  }

  @glyph(" ")
  public glyphSpace(): Glyph {
    let part = Part.empty();
    let bearings = {left: this.spaceWidth, right: 0};
    let glyph = Glyph.byBearings(part, this.metrics, bearings);
    return glyph;
  }

  public getMetrics(): Metrics {
    return this.metrics;
  }

}


export type VekosConfig = {weightConst: number, stretchConst: number, contrastRatio: number};