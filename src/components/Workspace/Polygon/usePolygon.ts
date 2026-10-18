import { useState, useCallback, useRef } from 'react';
import type { Point, Shape } from '../../../types';
import type { PolygonSettings } from './types';
import { DEFAULT_POLYGON_SETTINGS } from './types';
import { createPolygonShape } from './polygonUtils';

export interface UsePolygonProps {
  currentColor?: string;
  toolSize?: number;
  onAddShape?: (shape: Shape) => void;
}

export const usePolygon = (props: UsePolygonProps = {}) => {
  const [polygonSettings, setPolygonSettings] = useState<PolygonSettings>(DEFAULT_POLYGON_SETTINGS);
  const [activePolygonPoints, setActivePolygonPoints] = useState<Point[]>([]);
  const activePolygonPointsRef = useRef<Point[]>([]);

  const addPolygonPoint = useCallback((pt: Point) => {
    setActivePolygonPoints((prev) => {
      const next = [...prev, pt];
      activePolygonPointsRef.current = next;
      return next;
    });
  }, []);

  const finishPolygon = useCallback(
    (
      color: string = props.currentColor || '#ffff00',
      strokeWidth: number = props.toolSize || 3,
      activeFFId?: string
    ): Shape | null => {
      const points = activePolygonPointsRef.current;
      if (points.length < 3) {
        setActivePolygonPoints([]);
        activePolygonPointsRef.current = [];
        return null;
      }

      const shape = createPolygonShape(
        [...points],
        color,
        strokeWidth,
        polygonSettings.fillStyle,
        activeFFId
      );

      if (props.onAddShape) {
        props.onAddShape(shape);
      }

      setActivePolygonPoints([]);
      activePolygonPointsRef.current = [];
      return shape;
    },
    [polygonSettings.fillStyle, props]
  );

  const cancelPolygon = useCallback(() => {
    setActivePolygonPoints([]);
    activePolygonPointsRef.current = [];
  }, []);

  return {
    polygonSettings,
    setPolygonSettings,
    activePolygonPoints,
    setActivePolygonPoints,
    activePolygonPointsRef,
    addPolygonPoint,
    finishPolygon,
    cancelPolygon,
    isDrawingPolygon: activePolygonPoints.length > 0,
  };
};
