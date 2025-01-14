import {AbstractImageLayer} from '../core/layers/abstract-image.layer';
import {AbstractLayer} from '../core/layers/abstract.layer';
import {CircleLayer} from '../core/layers/circle.layer';
import {DotLayer} from '../core/layers/dot.layer';
import {EllipseLayer} from '../core/layers/ellipse.layer';
import {IconLayer} from '../core/layers/icon.layer';
import {LineLayer} from '../core/layers/line.layer';
import {PaintLayer} from '../core/layers/paint.layer';
import {RectangleLayer} from '../core/layers/rectangle.layer';
import {TextLayer} from '../core/layers/text.layer';
import {fontTypes} from '../draw/fonts/fontTypes';
import {imgDataToXBMP, packedHexColor, toCppVariableName} from '../utils';
import {Platform} from './platform';

export class AdafruitPlatform extends Platform {
    public static id = 'adafruit_gfx';
    protected name = 'Adafruit GFX';
    protected description = 'Adafruit GFX';
    protected fonts: TPlatformFont[] = [fontTypes['adafruit']];

    constructor() {
        super();
        this.features.hasCustomFontSize = true;
        this.features.hasRGBSupport = true;
        this.features.hasInvertedColors = true;
        this.features.defaultColor = '#FFFFFF';
    }

    protected getColor(layer: AbstractLayer): string {
        return packedHexColor(layer.color);
    }

    addDot(layer: DotLayer, source: TSourceCode): void {
        source.code.push(`display.drawPixel(${layer.position.x}, ${layer.position.y},  ${this.getColor(layer)});`);
    }

    addText(layer: TextLayer, source: TSourceCode): void {
        source.code.push(`display.setTextColor(${this.getColor(layer)});
display.setTextSize(${layer.scaleFactor});
display.setCursor(${layer.position.x}, ${layer.position.y - layer.bounds.h});
display.setTextWrap(false);
display.print("${layer.text}");`);
    }

    addLine(layer: LineLayer, source: TSourceCode): void {
        const {p1, p2} = layer;
        source.code.push(`display.drawLine(${p1.x}, ${p1.y}, ${p2.x}, ${p2.y}, ${this.getColor(layer)});`);
    }

    addRect(layer: RectangleLayer, source: TSourceCode): void {
        if (layer.fill) {
            source.code.push(
                `display.fillRect(${layer.position.x}, ${layer.position.y}, ${layer.size.x}, ${
                    layer.size.y
                }, ${this.getColor(layer)});`
            );
        } else {
            source.code.push(
                `display.drawRect(${layer.position.x}, ${layer.position.y}, ${layer.size.x}, ${
                    layer.size.y
                }, ${this.getColor(layer)});`
            );
        }
    }

    addCircle(layer: CircleLayer, source: TSourceCode): void {
        const {radius, position, fill} = layer;
        const center = position.clone().add(radius);
        if (fill) {
            source.code.push(`display.fillCircle(${center.x}, ${center.y}, ${radius}, ${this.getColor(layer)});`);
        } else {
            source.code.push(`display.drawCircle(${center.x}, ${center.y}, ${radius},  ${this.getColor(layer)});`);
        }
    }

    addEllipse(layer: EllipseLayer, source: TSourceCode): void {}

    addImage(layer: IconLayer | PaintLayer, source: TSourceCode): void {
        let image;
        if (layer instanceof AbstractImageLayer) {
            if (!layer.data) return;
            image = layer.data;
        }
        const XBMP = imgDataToXBMP(image, 0, 0, layer.size.x, layer.size.y, true);
        const varName = `image_${toCppVariableName(layer.name)}_bits`;
        const varDeclaration = `static const unsigned char PROGMEM ${varName}[] = {${XBMP}};`;
        if (!source.declarations.includes(varDeclaration)) {
            source.declarations.push(varDeclaration);
        }
        source.code.push(
            `display.drawBitmap(${layer.position.x}, ${layer.position.y}, ${varName}, ${layer.size.x}, ${
                layer.size.y
            }, ${this.getColor(layer)});`
        );
    }

    addIcon(layer: IconLayer, source: TSourceCode): void {
        this.addImage(layer, source);
    }
}
