import { useState, useCallback, useRef } from 'react';

export interface DragState {
    isDragging: boolean;
    isResizing: boolean;
    resizeHandle: string;
    startX: number;
    startY: number;
    startElX: number;
    startElY: number;
    startW: number;
    startH: number;
    elementId: string | null;
}

export interface SnapLine { axis: 'x' | 'y'; pos: number }

const SNAP_THRESHOLD = 6;

export function useCanvasDrag(
    scale: number,
    onUpdateElement: (id: string, updates: any) => void
) {
    const [dragState, setDragState] = useState<DragState>({
        isDragging: false, isResizing: false, resizeHandle: '',
        startX: 0, startY: 0, startElX: 0, startElY: 0,
        startW: 0, startH: 0, elementId: null,
    });
    const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
    const canvasSizeRef = useRef({ w: 1080, h: 1080 });

    const setCanvasSize = (w: number, h: number) => {
        canvasSizeRef.current = { w, h };
    };

    const snap = (val: number, targets: number[]): [number, number | null] => {
        for (const t of targets) {
            if (Math.abs(val - t) < SNAP_THRESHOLD) return [t, t];
        }
        return [val, null];
    };

    const startDrag = useCallback((e: React.MouseEvent, elId: string, elStyles: any) => {
        e.stopPropagation();
        e.preventDefault();
        setDragState({
            isDragging: true, isResizing: false, resizeHandle: '',
            startX: e.clientX, startY: e.clientY,
            startElX: parseFloat(elStyles?.left) || 0,
            startElY: parseFloat(elStyles?.top) || 0,
            startW: parseFloat(elStyles?.width) || 200,
            startH: parseFloat(elStyles?.height) || 100,
            elementId: elId,
        });
    }, []);

    const startResize = useCallback((e: React.MouseEvent, elId: string, handle: string, elStyles: any) => {
        e.stopPropagation();
        e.preventDefault();
        setDragState({
            isDragging: false, isResizing: true, resizeHandle: handle,
            startX: e.clientX, startY: e.clientY,
            startElX: parseFloat(elStyles?.left) || 0,
            startElY: parseFloat(elStyles?.top) || 0,
            startW: parseFloat(elStyles?.width) || 200,
            startH: parseFloat(elStyles?.height) || 100,
            elementId: elId,
        });
    }, []);

    const onMouseMove = useCallback((e: MouseEvent) => {
        if (!dragState.elementId) return;
        const dx = (e.clientX - dragState.startX) / scale;
        const dy = (e.clientY - dragState.startY) / scale;
        const { w: cw, h: ch } = canvasSizeRef.current;
        const centerX = cw / 2;
        const centerY = ch / 2;

        if (dragState.isDragging) {
            let newX = dragState.startElX + dx;
            let newY = dragState.startElY + dy;
            const lines: SnapLine[] = [];
            const [sx, snapXVal] = snap(newX + dragState.startW / 2, [centerX]);
            if (snapXVal !== null) { newX = sx - dragState.startW / 2; lines.push({ axis: 'x', pos: snapXVal }); }
            const [sy, snapYVal] = snap(newY + dragState.startH / 2, [centerY]);
            if (snapYVal !== null) { newY = sy - dragState.startH / 2; lines.push({ axis: 'y', pos: snapYVal }); }
            setSnapLines(lines);
            onUpdateElement(dragState.elementId, {
                styles: { left: `${newX}px`, top: `${newY}px`, width: `${dragState.startW}px`, height: `${dragState.startH}px` }
            });
        }

        if (dragState.isResizing) {
            let newW = dragState.startW;
            let newH = dragState.startH;
            let newX = dragState.startElX;
            let newY = dragState.startElY;
            const h = dragState.resizeHandle;
            if (h.includes('e')) newW = Math.max(30, dragState.startW + dx);
            if (h.includes('s')) newH = Math.max(30, dragState.startH + dy);
            if (h.includes('w')) { newW = Math.max(30, dragState.startW - dx); newX = dragState.startElX + dx; }
            if (h.includes('n')) { newH = Math.max(30, dragState.startH - dy); newY = dragState.startElY + dy; }
            onUpdateElement(dragState.elementId, {
                styles: { left: `${newX}px`, top: `${newY}px`, width: `${newW}px`, height: `${newH}px` }
            });
        }
    }, [dragState, scale, onUpdateElement]);

    const onMouseUp = useCallback(() => {
        setDragState(prev => ({ ...prev, isDragging: false, isResizing: false, elementId: null }));
        setSnapLines([]);
    }, []);

    return { dragState, snapLines, startDrag, startResize, onMouseMove, onMouseUp, setCanvasSize };
}
