"use strict";

function FlightLogAnalyser(flightLog, graphConfig, canvas, craftCanvas, options) {

var canvasCtx = canvas.getContext("2d");

var // inefficient; copied from grapher.js

        DEFAULT_FONT_FACE = "Verdana, Arial, sans-serif",
        
        drawingParams = {
            fontSizeFrameLabel: null
        };

var that = this;
	  
var AudioContext = window.AudioContext || window.webkitAudioContext;
try {
	var frameCount = 4096;
	var audioCtx = new AudioContext();
	var audioBuffer   	= audioCtx.createBuffer(1, frameCount, audioCtx.sampleRate);
	var source        	= audioCtx.createBufferSource();
		source.buffer 	= audioBuffer; 
		source.loop	  	= true;
		source.start();

	var spectrumAnalyser = audioCtx.createAnalyser();	  
		spectrumAnalyser.fftSize = 256;
		spectrumAnalyser.smoothingTimeConstant = 0.8;
		spectrumAnalyser.minDecibels = -120;
		spectrumAnalyser.maxDecibels = -20;    

	var bufferChunks, bufferStartFrameIndex, bufferFieldIndex, bufferCurve, bufferWindowEndTime;
	var initialised = false;
	var analyserFieldName; // Name of the field being analysed

	// Setup the audio path
	source.connect(spectrumAnalyser);

	var audioIterations = 0; // variable to monitor spectrum processing

	function dataLoad(chunks, startFrameIndex, fieldIndex, curve, buffer, windowEndTime) {

			var chunkIndex, frameIndex;
			var i = 0;            

			var bufferData = buffer.getChannelData(0); // link to the first channel

			//We may start partway through the first chunk:
			frameIndex = startFrameIndex;

			dataCollectionLoop:
			for (chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
				var chunk = chunks[chunkIndex];
				for (; frameIndex < chunk.frames.length; frameIndex++) {
					var fieldValue = chunk.frames[frameIndex][fieldIndex];
					var frameTime  = chunk.frames[frameIndex][FlightLogParser.prototype.FLIGHT_LOG_FIELD_INDEX_TIME]
					bufferData[i++] = (curve.lookupRaw(fieldValue));

					if (i >= buffer.length || frameTime >= windowEndTime) {
						// console.log("Samples : " + i);
						break dataCollectionLoop;
						}
				}
				frameIndex = 0;
			}
			audioIterations++;
	}

	/* Function to actually draw the spectrum analyser overlay
		again, need to look at optimisation.... 

		*/

	function draw() {

		  canvasCtx.save();

		  var bufferLength = spectrumAnalyser.frequencyBinCount;
		  var dataArray = new Uint8Array(bufferLength);

		  var HEIGHT = canvasCtx.canvas.height * 0.4; /* trial and error values to put box in right place */
		  var WIDTH  = canvasCtx.canvas.width  * 0.4;
		  var LEFT   = canvasCtx.canvas.width * 0.05;
		  var TOP    = canvasCtx.canvas.height * 0.55;

		  /* only plot the lower half of the FFT, as the top half
		  never seems to have any values in it - too high frequency perhaps. */
		  var PLOTTED_BUFFER_LENGTH = bufferLength / 2;

		  canvasCtx.translate(LEFT, TOP);

		  spectrumAnalyser.getByteFrequencyData(dataArray);

		  canvasCtx.fillStyle = 'rgba(255, 255, 255, .25)'; /* white */
		  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

		  var barWidth = (WIDTH / PLOTTED_BUFFER_LENGTH) - 1;// * 2.5;
		  var barHeight;
		  var x = 0;

		  for(var i = 0; i < (PLOTTED_BUFFER_LENGTH); i++) {
			barHeight = (dataArray[i]/255 * HEIGHT);

			canvasCtx.fillStyle = 'rgba(0,255,0,0.3)'; /* green */
			canvasCtx.fillRect(x,HEIGHT-barHeight,barWidth,barHeight);

			x += barWidth + 1;
		  }
		  drawGridLines(options.analyserSampleRate, LEFT, TOP, WIDTH, HEIGHT);
		  drawAxisLabel(analyserFieldName, WIDTH - 8, HEIGHT - 10, 'right');
		  canvasCtx.restore();
		}

	function drawGridLines(sampleRate, LEFT, TOP, WIDTH, HEIGHT) {

		var ticks = 5;
		var frequencyInterval = (sampleRate / ticks) / 4;
		var frequency = 0;

		for(var i=0; i<=ticks; i++) {
				canvasCtx.beginPath();
				canvasCtx.lineWidth = 1;
				canvasCtx.strokeStyle = "rgba(255,255,255,0.25)";

				canvasCtx.moveTo(i * (WIDTH / ticks), 0);
				canvasCtx.lineTo(i * (WIDTH / ticks), HEIGHT);

				canvasCtx.stroke();
				drawAxisLabel((frequency)+"Hz", i * (WIDTH / ticks), HEIGHT * 1.05, 'center');
				frequency += frequencyInterval;
		}	
	}

	function drawAxisLabel(axisLabel, X, Y, align) {
			canvasCtx.font = drawingParams.fontSizeFrameLabel + "pt " + DEFAULT_FONT_FACE;
			canvasCtx.fillStyle = "rgba(255,255,255,0.9)";
			if(align) {
				 canvasCtx.textAlign = align;
				 } else 
				 {
				 canvasCtx.textAlign = 'center';
				 }


			canvasCtx.fillText(axisLabel, X, Y);
		}

	/* This function is called from the canvas drawing routines within grapher.js
	   It is only used to record the current curve positions, collect the data and draw the 
	   analyser on screen*/

	this.plotSpectrum =	function (chunks, startFrameIndex, fieldIndex, curve, fieldName, windowEndTime) {
			// Store the data pointers
			bufferChunks = chunks;
			bufferStartFrameIndex = startFrameIndex;
			bufferFieldIndex = fieldIndex;
			bufferCurve = curve;
			bufferWindowEndTime = windowEndTime;

			analyserFieldName = fieldName;

			if (audioBuffer) {
				dataLoad(bufferChunks, bufferStartFrameIndex, bufferFieldIndex, bufferCurve, audioBuffer, bufferWindowEndTime);
			}
			draw(); // draw the analyser on the canvas....
	}
} catch (e) {
	console.log('Failed to create analyser');
};

}