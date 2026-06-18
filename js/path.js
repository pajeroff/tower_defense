// ================================================================
// js/path.js – Определение маршрута врагов (извилистый путь)
// ================================================================

// Координаты заданы в долях от ширины/высоты игрового поля (0..1)
// Это позволяет легко масштабировать путь под размер Canvas.
export const PATH_POINTS = [
    { x: 0.0,  y: 0.3 },   // точка входа (левая сторона)
    { x: 0.2,  y: 0.3 },
    { x: 0.2,  y: 0.7 },
    { x: 0.5,  y: 0.7 },
    { x: 0.5,  y: 0.3 },
    { x: 0.8,  y: 0.3 },
    { x: 0.8,  y: 0.7 },
    { x: 1.0,  y: 0.7 },   // точка выхода (правая сторона)
];

/**
 * Возвращает массив точек пути в пикселях для конкретного Canvas
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @returns {Array<{x: number, y: number}>}
 */
export function getPathPoints(canvasWidth, canvasHeight) {
    return PATH_POINTS.map(p => ({
        x: p.x * canvasWidth,
        y: p.y * canvasHeight
    }));
}

/**
 * Возвращает исходный путь в долях (для общего использования)
 */
export function getPath() {
    return PATH_POINTS;
}