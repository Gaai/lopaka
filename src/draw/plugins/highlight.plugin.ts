import {Point} from '../../core/point';
import {DrawPlugin} from './draw.plugin';

export class HighlightPlugin extends DrawPlugin {
    public update(ctx: CanvasRenderingContext2D, point: Point): void {
        if (this.session.editor.state.activeTool) return;
        const {scale, layers} = this.session.state;
        ctx.save();
        ctx.beginPath();
        layers.forEach((layer) => {
            const bounds = layer.bounds.clone().multiply(scale).round().add(-0.5, -0.5, 1, 1);
            if (layer.selected) {
                ctx.save();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.lineWidth = 1;
                ctx.setLineDash([5, 5]);
                ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
                ctx.restore();
            }
        });
        if (point) {
            const hovered = layers
                .filter((l) => l.contains(point.clone().divide(scale).round()))
                .sort((a, b) => b.index - a.index);
            if (hovered.length) {
                const upperLayer = hovered[0];
                if (!upperLayer.selected) {
                    const bounds = upperLayer.bounds.clone().multiply(scale).round().add(-0.5, -0.5, 1, 1);
                    ctx.save();
                    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(bounds.x, bounds.y, bounds.w, bounds.h);
                    ctx.restore();
                }
            }
        }
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
    }
}
