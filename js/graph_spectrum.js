"use strict";

function FlightLogAnalyser(flightLog, graphConfig, canvas, craftCanvas, options) {

var canvasCtx = canvas.getContext("2d");

	  
var sampleRate = 8000;
var frameCount = sampleRate * 2;

var AudioContext = window.AudioContext || window.webkitAudioContext;
var audioCtx = new AudioContext();

/* The oscillator node is used as a trigger for the .onaudioprocess event, the actual 
   values the oscillator generates are discarded in the scriptProcessing node and replaced
   by values from the currently plotted curve */ 
var oscillator = audioCtx.createOscillator();
oscillator.type = 'sine';
oscillator.frequency.value = 2000; // value in hertz;

var spectrumAnalyser = audioCtx.createAnalyser();	  
	spectrumAnalyser.fftSize = 256;
    spectrumAnalyser.smoothingTimeConstant = 0.8;

var myScriptProcessor = audioCtx.createScriptProcessor(2048,1,1);
    
var bufferChunks, bufferStartFrameIndex, bufferFieldIndex, bufferCurve;
var initialised = false;

// Setup the audio path
oscillator.connect(myScriptProcessor);
myScriptProcessor.connect(spectrumAnalyser);

/* This event is triggered and re-loads the data from the current curve into the audiobuffer
   Definitely a place for some code optimisation... only update if the curve data changes perhaps? */   
myScriptProcessor.onaudioprocess = function(audioProcessingEvent) {
	var outputBuffer = audioProcessingEvent.outputBuffer;
	dataLoad(bufferChunks, bufferStartFrameIndex, bufferFieldIndex, bufferCurve, outputBuffer);
}

function dataLoad(chunks, startFrameIndex, fieldIndex, curve, buffer) {

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
                bufferData[i++] = (curve.lookup(fieldValue));

                if (i >= buffer.length)
                    break dataCollectionLoop;
            }
            frameIndex = 0;
        }
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
      
      var barWidth = (WIDTH / PLOTTED_BUFFER_LENGTH);// * 2.5;
      var barHeight;
      var x = 0;
      
      for(var i = 0; i < (PLOTTED_BUFFER_LENGTH); i++) {
        barHeight = (dataArray[i]/255 * HEIGHT);

        canvasCtx.fillStyle = 'rgba(0,255,0,0.3)'; /* green */
        canvasCtx.fillRect(x,HEIGHT-barHeight,barWidth,barHeight);

        x += barWidth;
      }
	  canvasCtx.restore();
	}

/* This function is called from the canvas drawing routines within grapher.js
   It is only used to record the current curve positions and draw the 
   analyser on screen; the actual data is collected within the
   scriptProcessing node */
   
this.plotSpectrum =	function (chunks, startFrameIndex, fieldIndex, curve) {
		// Store the data pointers
		bufferChunks = chunks;
		bufferStartFrameIndex = startFrameIndex;
		bufferFieldIndex = fieldIndex;
		bufferCurve = curve;
				
		// Get the audio context going.... Only once.....
		if (!initialised) {
			oscillator.start();
			initialised = true;
		}
		draw(); // draw the analyser on the canvas....
	}
}