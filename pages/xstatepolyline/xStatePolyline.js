import Konva from "konva";
import { setup, createActor } from "xstate";

const stage = new Konva.Stage({
    container: "container",
    width: 400,
    height: 400,
});

const layer = new Konva.Layer();
stage.add(layer);

const MAX_POINTS = 10;
let polyline; // La polyline en cours de construction

const polylineMachine = setup({
    actions: {
        createLine: () => {
            const pos = stage.getPointerPosition();
            polyline = new Konva.Line({
                points: [pos.x, pos.y, pos.x, pos.y],
                stroke: "red",
                strokeWidth: 2,
            });
            layer.add(polyline);
        },
        setLastPoint: () => {
            const pos = stage.getPointerPosition();
            const currentPoints = polyline.points();
            const size = currentPoints.length;
            const newPoints = currentPoints.slice(0, size - 2);
            polyline.points(newPoints.concat([pos.x, pos.y]));
            layer.batchDraw();
        },
        saveLine: () => {
            const currentPoints = polyline.points();
            const size = currentPoints.length;
            const newPoints = currentPoints.slice(0, size - 2);
            polyline.points(newPoints);
            layer.batchDraw();
        },
        addPoint: () => {
            const pos = stage.getPointerPosition();
            const currentPoints = polyline.points();
            const newPoints = [...currentPoints, pos.x, pos.y];
            polyline.points(newPoints);
            layer.batchDraw();
        },
        abandon: () => {
            // Supprimer la variable polyline :
            polyline.destroy();
            layer.batchDraw();
        },
        removeLastPoint: () => {
            const currentPoints = polyline.points();
            const size = currentPoints.length;
            const provisoire = currentPoints.slice(size - 2, size);
            const oldPoints = currentPoints.slice(0, size - 4);
            polyline.points(oldPoints.concat(provisoire));
            layer.batchDraw();
        },
    },
    guards: {
        pasPlein: () => {
            // Le dernier point est provisoire, il ne compte pas
            return polyline.points().length / 2 - 1 < MAX_POINTS;
        },
        plusDeDeuxPoints: () => {
            return polyline.points().length > 6;
        },
    },
}).createMachine({
    id: "polyLine",
    initial: "idle",
    states: {
        idle: {
            on: {
                MOUSECLICK: { target: "onePoint", actions: "createLine" },
            },
        },
        onePoint: {
            on: {
                MOUSEMOVE: { actions: "setLastPoint" },
                MOUSECLICK: { target: "manyPoints", actions: "addPoint" },
                Escape: { target: "idle", actions: "abandon" },
            },
        },
        manyPoints: {
            on: {
                MOUSEMOVE: { actions: "setLastPoint" },
                MOUSECLICK: [
                    { guard: "pasPlein", actions: "addPoint" },
                    { target: "idle", actions: "saveLine" },
                ],
                Backspace: [
                    { guard: "plusDeDeuxPoints", actions: "removeLastPoint" },
                    { target: "onePoint", actions: "removeLastPoint" },
                ],
                Enter: { target: "idle", actions: "saveLine" },
                Escape: { target: "idle", actions: "abandon" },
            },
        },
    },
});

const polylineActor = createActor(polylineMachine);
polylineActor.subscribe((snapshot) => {
    console.log("Current state:", snapshot.value);
});
polylineActor.start();

stage.on("click", () => {
    polylineActor.send({ type: "MOUSECLICK" });
});

stage.on("mousemove", () => {
    polylineActor.send({ type: "MOUSEMOVE" });
});

window.addEventListener("keydown", (event) => {
    console.log("Key pressed:", event.key);
    polylineActor.send({ type: event.key });
});