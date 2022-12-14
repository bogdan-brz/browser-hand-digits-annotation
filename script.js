import { MnistData } from "./data.js";
var canvas, ctx, saveButton, clearButton;
var pos = { x: 0, y: 0 };
var rawImage;
var model;

function getModel() {
    model = tf.sequential();

    model.add(
        tf.layers.conv2d({
            inputShape: [28, 28, 1],
            kernelSize: 3,
            filters: 8,
            activation: "relu",
        })
    );
    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
    model.add(
        tf.layers.conv2d({ filters: 16, kernelSize: 3, activation: "relu" })
    );
    model.add(tf.layers.maxPooling2d({ poolSize: [2, 2] }));
    model.add(tf.layers.flatten());
    model.add(tf.layers.dense({ units: 128, activation: "relu" }));
    model.add(tf.layers.dense({ units: 10, activation: "softmax" }));

    model.compile({
        optimizer: tf.train.adam(),
        loss: "categoricalCrossentropy",
        metrics: ["accuracy"],
    });

    return model;
}

async function train(model, data) {
    const metrics = ["loss", "val_loss", "accuracy", "val_accuracy"];
    const container = { name: "Model Training", styles: { height: "640px" } };
    const fitCallbacks = tfvis.show.fitCallbacks(container, metrics);
    const BATCH_SIZE = 512;
    const TRAIN_DATA_SIZE = 1000;
    const TEST_DATA_SIZE = 200;
    const [trainXs, trainYs] = tf.tidy(() => {
        const d = data.nextTrainBatch(TRAIN_DATA_SIZE);
        return [d.xs.reshape([TRAIN_DATA_SIZE, 28, 28, 1]), d.labels];
    });

    const [testXs, testYs] = tf.tidy(() => {
        const d = data.nextTestBatch(TEST_DATA_SIZE);
        return [d.xs.reshape([TEST_DATA_SIZE, 28, 28, 1]), d.labels];
    });

    return model.fit(trainXs, trainYs, {
        batchSize: BATCH_SIZE,
        validationData: [testXs, testYs],
        epochs: 20,
        shuffle: true,
        callbacks: fitCallbacks,
    });
}

function setPosition(e) {
    pos.x = e.clientX - 100; //sets pos (used for cursor canvas curor placement) to click position minnus 100, 100
    pos.y = e.clientY - 100;
}

function draw(e) {
    if (e.buttons != 1) return;
    ctx.beginPath(); // tells the context a new path will be drawn (doesn't actually start drawing anything)
    ctx.lineWidth = 24;
    ctx.lineCap = "round";
    ctx.strokeStyle = "white";
    ctx.moveTo(pos.x, pos.y); // places the context "cursor" on pos, so subsequent lineTo will draw something starting here
    setPosition(e); // changes pos from the last pos to current mouse pos (last pos can either be last mouse movement or triggered by mouseenter or mousedown)
    ctx.lineTo(pos.x, pos.y); // draws line to pos
    ctx.stroke(); // actually visualizes the path drawn onto the cavas
    rawImage.src = canvas.toDataURL("image/png"); // places the canvas data into an image that is identical and lays on top of the canvas.
    // purpose of this is that the tf.browser.fromPixels function needs an image not a canvas to work with.
    // also, you can't assign the src in save() because the DOM needs to update before you then pull the pixels out of the image, and it doesn't have time to do so inside one function call.
}

function erase() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 280, 280);
    // paints the canvas black, and therfore earases all paths. This erase() should also clear the rawImage.src but whatever
}

function save() {
    var raw = tf.browser.fromPixels(rawImage, 1); // gets pixels from image opy of canvas
    var resized = tf.image.resizeBilinear(raw, [28, 28]); // cuts down on pixels 10 fold (280 x 280 x 1 to 28 x 28 x 1)
    var tensor = resized.expandDims(0); // adds a dimension at the front to indicate the tensor only has one datapoint to predict (1 x 28 x 28 x 1)
    var prediction = model.predict(tensor);
    var pIndex = tf.argMax(prediction, 1).dataSync(); // converts the one-hot encoded label into a number (the dataSync thing just converts the tensor into regular data)

    alert(pIndex);
}

function init() {
    canvas = document.getElementById("canvas");
    rawImage = document.getElementById("canvasimg");
    ctx = canvas.getContext("2d");
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, 280, 280);
    canvas.addEventListener("mousemove", draw);
    canvas.addEventListener("mousedown", setPosition);
    canvas.addEventListener("mouseenter", setPosition);
    saveButton = document.getElementById("sb");
    saveButton.addEventListener("click", save);
    clearButton = document.getElementById("cb");
    clearButton.addEventListener("click", erase);
}

async function run() {
    const data = new MnistData();
    await data.load();
    const model = getModel();
    tfvis.show.modelSummary({ name: "Model Architecture" }, model);
    await train(model, data);
    init();
    alert("Training is done, try classifying your handwriting!");
}

document.addEventListener("DOMContentLoaded", run);
