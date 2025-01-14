import {getFont} from '../../draw/fonts';
import {Font} from '../../draw/fonts/font';
import {TPlatformFeatures} from '../../platforms/platform';
import {Point} from '../point';
import {Rect} from '../rect';
import {AbstractLayer, EditMode, TLayerModifiers, TLayerState, TModifierType} from './abstract.layer';

type TTextState = TLayerState & {
    p: number[]; // position [x, y]
    f: string; // font
    d: string; // data
    z: number; // scale factor
};

export class TextLayer extends AbstractLayer {
    protected type: ELayerType = 'string';
    protected state: TTextState;
    protected editState: {
        firstPoint: Point;
        position: Point;
        text: string;
    } = null;

    public position: Point = new Point();
    public text: string = 'Text';
    public scaleFactor: number = 1;

    modifiers: TLayerModifiers = {
        x: {
            getValue: () => this.position.x,
            setValue: (v: number) => {
                this.position.x = v;
                this.updateBounds();
                this.saveState();
                this.draw();
            },
            type: TModifierType.number
        },
        y: {
            getValue: () => this.position.y,
            setValue: (v: number) => {
                this.position.y = v;
                this.updateBounds();
                this.saveState();
                this.draw();
            },
            type: TModifierType.number
        },
        fontSize: {
            getValue: () => this.scaleFactor,
            setValue: (v: string) => {
                this.scaleFactor = Math.max(parseInt(v), 1);
                this.updateBounds();
                this.saveState();
                this.draw();
            },
            type: TModifierType.number
        },
        font: {
            getValue: () => this.font?.name,
            setValue: (v: string) => {
                this.font = getFont(v);
                this.updateBounds();
                this.saveState();
                this.draw();
            },
            type: TModifierType.font
        },
        text: {
            getValue: () => this.text,
            setValue: (v: string) => {
                this.text = v;
                this.updateBounds();
                this.saveState();
                this.draw();
            },
            type: TModifierType.string
        },
        color: {
            getValue: () => this.color,
            setValue: (v: string) => {
                this.color = v;
                this.updateBounds();
                this.saveState();
                this.draw();
            },
            type: TModifierType.color
        }
    };

    constructor(
        protected features: TPlatformFeatures,
        public font: Font
    ) {
        super(features);
        if (!this.features.hasCustomFontSize) {
            delete this.modifiers.fontSize;
        }
        if (!this.features.hasRGBSupport) {
            delete this.modifiers.color;
        }
        this.color = this.features.defaultColor;
    }

    startEdit(mode: EditMode, point: Point) {
        this.mode = mode;
        if (mode == EditMode.CREATING) {
            this.position = point.clone();
            this.updateBounds();
            this.draw();
        }
        this.editState = {
            firstPoint: point,
            position: this.position.clone(),
            text: this.text
        };
    }

    edit(point: Point, originalEvent: MouseEvent) {
        const {position, text, firstPoint} = this.editState;
        switch (this.mode) {
            case EditMode.MOVING:
                this.position = position.clone().add(point.clone().subtract(firstPoint)).round();
                break;
            case EditMode.RESIZING:
                // this.size = size.clone().add(point.clone().subtract(firstPoint)).round();
                // todo
                break;
            case EditMode.CREATING:
                this.position = point.clone();
                break;
        }
        this.updateBounds();
        this.draw();
    }

    stopEdit() {
        this.mode = EditMode.NONE;
        this.editState = null;
        this.saveState();
        this.history.push(this.state);
    }

    draw() {
        const {dc, position, text, font, bounds} = this;
        dc.clear();
        dc.ctx.fillStyle = this.color;
        dc.ctx.strokeStyle = this.color;
        font.drawText(dc, text, position.clone().subtract(0, bounds.size.y), this.scaleFactor);
        dc.ctx.save();
        dc.ctx.fillStyle = 'rgba(0,0,0,0)';
        dc.ctx.beginPath();
        dc.ctx.rect(bounds.x, bounds.y, bounds.w, bounds.h);
        dc.ctx.fill();
        dc.ctx.restore();
    }

    saveState() {
        const state: TTextState = {
            p: this.position.xy,
            d: this.text,
            f: this.font.name,
            n: this.name,
            i: this.index,
            g: this.group,
            t: this.type,
            u: this.uid,
            z: this.scaleFactor,
            c: this.color
        };
        this.state = state;
    }

    loadState(state: TTextState) {
        this.position = new Point(state.p);
        this.text = state.d;
        this.font = getFont(state.f);
        this.name = state.n;
        this.index = state.i;
        this.group = state.g;
        this.uid = state.u;
        this.scaleFactor = state.z;
        this.color = state.c;
        this.updateBounds();
        this.mode = EditMode.NONE;
    }

    updateBounds(): void {
        const {dc, font, position, text} = this;
        const size = font.getSize(dc, text, this.scaleFactor);
        this.bounds = new Rect(position.clone().subtract(0, size.y), size);
    }
}
